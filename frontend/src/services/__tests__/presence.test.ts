import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../supabase';
import {
  acquirePresence,
  getOnlineIds,
  stopPresence,
  subscribePresence,
} from '../presence';

type Channel = {
  events: Record<string, () => void>;
  status: (status: string) => void;
  state: Record<string, { online_at: string }[]>;
  on: jest.Mock;
  subscribe: jest.Mock;
  presenceState: jest.Mock;
  track: jest.Mock;
  untrack: jest.Mock;
};
const mockChannels: Channel[] = [];
jest.mock('../supabase', () => ({
  supabase: {
    channel: jest.fn(() => {
      const channel: Channel = {
        events: {},
        status: () => undefined,
        state: {},
        on: jest.fn((_type, filter, callback) => {
          channel.events[filter.event] = callback;
          return channel;
        }),
        subscribe: jest.fn((callback) => {
          channel.status = callback;
          return channel;
        }),
        presenceState: jest.fn(() => channel.state),
        track: jest.fn().mockResolvedValue('ok'),
        untrack: jest.fn().mockResolvedValue('ok'),
      };
      mockChannels.push(channel);
      return channel;
    }),
    removeChannel: jest.fn().mockResolvedValue('ok'),
  },
}));
jest.mock('../logger', () => ({ logger: { warn: jest.fn() } }));
const flush = async () => {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
};
let onState: (state: AppStateStatus) => void;
const previousAppState = AppState.currentState;
const changeState = (state: AppStateStatus) => {
  AppState.currentState = state;
  onState(state);
};
beforeEach(() => {
  stopPresence();
  jest.clearAllMocks();
  mockChannels.length = 0;
  AppState.currentState = 'active';
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, callback) => {
      onState = callback;
      return { remove: jest.fn() };
    });
});
afterEach(() => {
  stopPresence();
  AppState.currentState = previousAppState;
  jest.restoreAllMocks();
});

it('keeps presence alive across screen changes while the app owns a lease', async () => {
  const releaseApp = acquirePresence('me');
  const releaseScreen = acquirePresence('me');
  expect(supabase.channel).toHaveBeenCalledTimes(1);
  const channel = mockChannels[0];
  channel.status('SUBSCRIBED');
  await flush();
  expect(channel.track).toHaveBeenCalledTimes(1);
  releaseScreen();
  expect(supabase.removeChannel).not.toHaveBeenCalled();
  channel.state = { other: [{ online_at: 'now' }] };
  channel.events.sync();
  expect(getOnlineIds().has('other')).toBe(true);
  releaseApp();
  expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  expect(getOnlineIds().size).toBe(0);
});

it('does not announce a background app online and tracks again on foreground', async () => {
  acquirePresence('me');
  const channel = mockChannels[0];
  changeState('background');
  channel.status('SUBSCRIBED');
  await flush();
  expect(channel.track).not.toHaveBeenCalled();
  expect(channel.untrack).toHaveBeenCalled();
  changeState('active');
  await flush();
  expect(channel.track).toHaveBeenCalledTimes(1);
  const backgroundCalls = channel.untrack.mock.calls.length;
  changeState('inactive');
  await flush();
  expect(channel.untrack).toHaveBeenCalledTimes(backgroundCalls + 1);
});

it('ignores old account callbacks and leases after switching accounts', async () => {
  const releaseOld = acquirePresence('first');
  const old = mockChannels[0];
  acquirePresence('second');
  const current = mockChannels[1];
  current.status('SUBSCRIBED');
  await flush();
  old.status('SUBSCRIBED');
  old.state = { stale: [{ online_at: 'now' }] };
  old.events.sync();
  releaseOld();
  await flush();
  expect(getOnlineIds().size).toBe(0);
  expect(old.track).not.toHaveBeenCalled();
  expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
  expect(current.track).toHaveBeenCalledTimes(1);
});

it('updates subscribers on joins and disconnects and restores tracking on reconnect', async () => {
  acquirePresence('me');
  const channel = mockChannels[0];
  const listener = jest.fn();
  const unsubscribe = subscribePresence(listener);
  channel.status('SUBSCRIBED');
  await flush();
  channel.state = { other: [{ online_at: 'now' }] };
  channel.events.join();
  expect(listener).toHaveBeenLastCalledWith(new Set(['other']));
  channel.status('CHANNEL_ERROR');
  expect(listener).toHaveBeenLastCalledWith(new Set());
  channel.status('SUBSCRIBED');
  await flush();
  expect(channel.track).toHaveBeenCalledTimes(2);
  unsubscribe();
});

it('untracks after an in-flight track completes when the app has moved to background', async () => {
  acquirePresence('me');
  const channel = mockChannels[0];
  let complete!: (result: string) => void;
  channel.track.mockReturnValueOnce(
    new Promise((resolve) => {
      complete = resolve;
    })
  );
  channel.status('SUBSCRIBED');
  await flush();
  changeState('background');
  complete('ok');
  await flush();
  expect(channel.untrack).toHaveBeenCalledTimes(1);
});
