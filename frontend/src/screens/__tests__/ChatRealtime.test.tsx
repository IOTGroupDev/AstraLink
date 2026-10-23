import React from 'react';
import { AppState, FlatList, Modal, type AppStateStatus } from 'react-native';
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import ChatDialogScreen from '../ChatDialogScreen';
import ChatListScreen from '../ChatListScreen';
import { chatAPI } from '../../services/api';
import { supabase } from '../../services/supabase';
import * as Notifications from 'expo-notifications';

let mockNotificationReceived: (
  notification: Notifications.Notification
) => void;
const mockRemoveNotification = jest.fn();
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn((callback) => {
    mockNotificationReceived = callback;
    return { remove: mockRemoveNotification };
  }),
}));

type Payload = {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};
let mockMessageEvent: (payload: Payload) => void;
let mockSubscriptionStatus: (status: string) => void;
const mockChannel = {
  on: jest.fn((_type, _filter, callback) => {
    mockMessageEvent = callback;
    return mockChannel;
  }),
  subscribe: jest.fn((callback) => {
    mockSubscriptionStatus = callback;
    return mockChannel;
  }),
};

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return {
    useNavigation: () => navigation,
    useRoute: () => ({
      params: { otherUserId: 'other', displayName: 'Other' },
    }),
    useFocusEffect: (callback: () => (() => void) | void) =>
      React.useEffect(callback, [callback]),
  };
});
jest.mock('../../hooks/useAuth', () => {
  const user = { id: 'me' };
  return { useAuth: () => ({ user, isLoading: false }) };
});
jest.mock('../../hooks/useOptionalBottomTabBarHeight', () => ({
  useOptionalBottomTabBarHeight: () => 0,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
});
jest.mock('../../services/api', () => ({
  chatAPI: { listMessages: jest.fn(), listConversations: jest.fn() },
  datingAPI: { getProfile: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../services/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn().mockResolvedValue('ok'),
  },
}));
let mockPresenceChanged: (ids: ReadonlySet<string>) => void;
jest.mock('../../services/presence', () => ({
  getOnlineIds: () => new Set(),
  acquirePresence: () => () => undefined,
  subscribePresence: (callback: (ids: ReadonlySet<string>) => void) => {
    mockPresenceChanged = callback;
    return () => undefined;
  },
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('../../components/shared', () => ({
  GradientBorderView: require('react-native').View,
  DatingGlassFill: require('react-native').View,
  DATING_GLASS_BORDER_COLORS: ['transparent', 'transparent'],
  DATING_GLASS_BORDER_GRADIENT: {},
}));
jest.mock('../../components/shared/BottomTabFade', () => ({
  BottomTabFade: () => null,
}));
jest.mock(
  '../../components/shared/LoadingIndicator',
  () => require('react-native').View
);
jest.mock('@expo/vector-icons', () => ({
  Ionicons: require('react-native').View,
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: require('react-native').View,
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: require('react-native').View,
    Image: require('react-native').Image,
  },
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: () => ({}),
  withTiming: (value: number) => value,
  Easing: { inOut: () => undefined, cubic: () => undefined },
  FadeIn: { duration: () => undefined },
  FadeOut: { duration: () => undefined },
}));

const api = jest.mocked(chatAPI);
const incoming = {
  id: 'message-id',
  senderId: 'other',
  recipientId: 'me',
  text: 'A new message',
  mediaPath: null,
  createdAt: '2026-10-22T10:00:00.000Z',
};
const payload: Payload = {
  eventType: 'INSERT',
  new: {
    id: incoming.id,
    sender_id: incoming.senderId,
    recipient_id: incoming.recipientId,
    content: incoming.text,
    created_at: incoming.createdAt,
  },
  old: {},
};
const conversation = {
  otherUserId: 'other',
  displayName: 'Other',
  lastSenderId: 'other',
  lastMessageText: incoming.text,
  lastMessageMediaPath: null,
  lastMessageAt: incoming.createdAt,
};

describe('Dating chat realtime', () => {
  const initialAppState = AppState.currentState;
  let onAppState: (state: AppStateStatus) => void;
  const removeAppState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    api.listMessages.mockResolvedValue([]);
    api.listConversations.mockResolvedValue([]);
    AppState.currentState = 'active';
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, callback) => {
        onAppState = callback;
        return { remove: removeAppState };
      });
  });
  afterEach(() => {
    AppState.currentState = initialAppState;
    jest.restoreAllMocks();
  });

  it('renders a live incoming message without reopening the dialog and deduplicates it', async () => {
    render(<ChatDialogScreen />);
    await waitFor(() => expect(api.listMessages).toHaveBeenCalled());

    act(() => {
      mockMessageEvent(payload);
      mockMessageEvent(payload);
    });

    await screen.findByText(incoming.text);
    expect(screen.getAllByText(incoming.text)).toHaveLength(1);
    act(() =>
      mockMessageEvent({
        ...payload,
        new: { ...payload.new, id: 'unrelated', sender_id: 'stranger' },
      })
    );
    expect(screen.getAllByText(incoming.text)).toHaveLength(1);
  });

  it('updates the dialog online status from global presence without reopening', async () => {
    render(<ChatDialogScreen />);
    await waitFor(() => expect(api.listMessages).toHaveBeenCalled());
    expect(screen.getByText('chat.header.offline')).toBeTruthy();
    act(() => mockPresenceChanged(new Set(['other'])));
    expect(screen.getByText('chat.header.online')).toBeTruthy();
    act(() => mockPresenceChanged(new Set()));
    expect(screen.getByText('chat.header.offline')).toBeTruthy();
  });

  it('reloads messages missed before joining or reconnecting', async () => {
    render(<ChatDialogScreen />);
    await waitFor(() => expect(api.listMessages).toHaveBeenCalled());
    const initialRequests = api.listMessages.mock.calls.length;
    api.listMessages.mockResolvedValue([incoming]);

    act(() => mockSubscriptionStatus('SUBSCRIBED'));

    await screen.findByText(incoming.text);
    expect(api.listMessages.mock.calls.length).toBe(initialRequests + 1);
  });

  const receiveDialogPush = (senderId = 'other') =>
    mockNotificationReceived({
      request: {
        content: {
          data: { type: 'chat-message', recipientId: 'me', senderId },
        },
      },
    } as Notifications.Notification);

  it('updates an open dialog on push even when no websocket event arrives', async () => {
    const view = render(<ChatDialogScreen />);
    await waitFor(() => expect(api.listMessages).toHaveBeenCalled());
    const requests = api.listMessages.mock.calls.length;
    act(() => receiveDialogPush('unrelated'));
    expect(api.listMessages).toHaveBeenCalledTimes(requests);
    api.listMessages.mockResolvedValue([incoming]);
    act(() => receiveDialogPush());
    await screen.findByText(incoming.text);
    view.unmount();
    expect(mockRemoveNotification).toHaveBeenCalled();
    const completed = api.listMessages.mock.calls.length;
    act(() => receiveDialogPush());
    expect(api.listMessages).toHaveBeenCalledTimes(completed);
  });

  it('does not let an older dialog refresh erase a message fetched after push', async () => {
    render(<ChatDialogScreen />);
    await waitFor(() => expect(api.listMessages).toHaveBeenCalled());
    let finishOld!: (messages: (typeof incoming)[]) => void;
    api.listMessages.mockReturnValueOnce(
      new Promise((resolve) => {
        finishOld = resolve;
      })
    );
    act(() => receiveDialogPush());
    api.listMessages.mockResolvedValue([incoming]);
    act(() => receiveDialogPush());
    await screen.findByText(incoming.text);
    await act(async () => {
      finishOld([]);
    });
    expect(screen.getByText(incoming.text)).toBeTruthy();
  });

  it('reconciles the focused dialog when both websocket events and pushes are missing', async () => {
    jest.useFakeTimers();
    try {
      const view = render(<ChatDialogScreen />);
      await act(async () => {});
      api.listMessages.mockResolvedValue([incoming]);
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(screen.getByText(incoming.text)).toBeTruthy();
      const requests = api.listMessages.mock.calls.length;
      AppState.currentState = 'background';
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      expect(api.listMessages).toHaveBeenCalledTimes(requests);
      view.unmount();
      AppState.currentState = 'active';
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      expect(api.listMessages).toHaveBeenCalledTimes(requests);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(['me', 'other'])(
    'opens a photo sent by %s full screen and closes it',
    async (senderId) => {
      const mediaUrl = 'https://example.com/private-signed-photo.jpg';
      api.listMessages.mockResolvedValue([
        {
          ...incoming,
          senderId,
          recipientId: senderId === 'me' ? 'other' : 'me',
          text: null,
          mediaPath: 'chat-media:other/photo.jpg',
          mediaUrl,
        },
      ]);
      render(<ChatDialogScreen />);
      fireEvent.press(await screen.findByLabelText('chat.media.openPhoto'));
      expect(
        screen.getByTestId('chat-photo-viewer-image').props.source.uri
      ).toBe(mediaUrl);

      fireEvent.press(screen.getByLabelText('common.buttons.close'));
      expect(screen.queryByTestId('chat-photo-viewer-image')).toBeNull();

      fireEvent.press(screen.getByLabelText('chat.media.openPhoto'));
      fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
      expect(screen.queryByTestId('chat-photo-viewer-image')).toBeNull();
    }
  );

  it('shows an error if the full photo cannot be loaded and still allows closing', async () => {
    api.listMessages.mockResolvedValue([
      {
        ...incoming,
        text: null,
        mediaUrl: 'https://example.com/unavailable.jpg',
      },
    ]);
    render(<ChatDialogScreen />);
    fireEvent.press(await screen.findByLabelText('chat.media.openPhoto'));
    fireEvent(screen.getByTestId('chat-photo-viewer-image'), 'error');
    expect(screen.getByText('chat.media.failedToLoadPhoto')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('common.buttons.close'));
    expect(screen.queryByTestId('chat-photo-viewer-image')).toBeNull();
  });

  it('loads earlier messages without reopening the dialog', async () => {
    const page = Array.from({ length: 100 }, (_, index) => ({
      ...incoming,
      id: `message-${index}`,
      text: `Message ${index}`,
    }));
    api.listMessages.mockResolvedValue(page);
    render(<ChatDialogScreen />);
    await screen.findByText('Message 0');
    api.listMessages.mockResolvedValueOnce([
      {
        ...incoming,
        id: 'earlier',
        text: 'Earlier message',
        createdAt: '2026-10-21T10:00:00.000Z',
      },
    ]);

    fireEvent.press(screen.getByLabelText('chat.loading.older'));

    await screen.findByText('Earlier message');
    expect(api.listMessages).toHaveBeenLastCalledWith(
      'other',
      100,
      `${page[0].createdAt}~${page[0].id}`
    );
    expect(screen.queryByLabelText('chat.loading.older')).toBeNull();
  });

  it('waits for message measurements before scrolling a newly opened dialog to the end', async () => {
    const scroll = jest.spyOn(FlatList.prototype, 'scrollToEnd');
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 0;
      });
    api.listMessages.mockResolvedValue([incoming]);
    render(<ChatDialogScreen />);
    const list = await screen.findByTestId('chat-message-list');

    fireEvent(list, 'layout', {
      nativeEvent: { layout: { height: 600, width: 390, x: 0, y: 0 } },
    });
    expect(scroll).not.toHaveBeenCalled();
    fireEvent(list, 'contentSizeChange', 390, 2400);
    expect(scroll).toHaveBeenCalledWith({ animated: false });

    scroll.mockClear();
    fireEvent(list, 'scroll', {
      nativeEvent: {
        contentOffset: { y: 100 },
        contentSize: { height: 2400 },
        layoutMeasurement: { height: 600 },
      },
    });
    fireEvent(list, 'contentSizeChange', 390, 3000);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('catches up when the app returns to the foreground', async () => {
    render(<ChatDialogScreen />);
    await waitFor(() => expect(api.listMessages).toHaveBeenCalled());
    api.listMessages.mockResolvedValue([incoming]);

    act(() => onAppState('active'));

    await screen.findByText(incoming.text);
  });

  it('removes the dialog subscription and ignores late reconnect callbacks', async () => {
    const view = render(<ChatDialogScreen />);
    await waitFor(() => expect(api.listMessages).toHaveBeenCalled());
    view.unmount();
    const requests = api.listMessages.mock.calls.length;

    act(() => mockSubscriptionStatus('SUBSCRIBED'));

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    expect(removeAppState).toHaveBeenCalled();
    expect(api.listMessages).toHaveBeenCalledTimes(requests);
  });

  it.each(['event', 'reconnect', 'foreground'])(
    'updates the conversation list after %s without reopening it',
    async (trigger) => {
      render(<ChatListScreen />);
      await waitFor(() => expect(api.listConversations).toHaveBeenCalled());
      api.listConversations.mockResolvedValue([conversation]);

      act(() => {
        if (trigger === 'event') mockMessageEvent(payload);
        else if (trigger === 'reconnect') mockSubscriptionStatus('SUBSCRIBED');
        else onAppState('active');
      });

      await screen.findByText(incoming.text);
    }
  );

  it('updates the open list when a chat push arrives without a realtime event', async () => {
    const view = render(<ChatListScreen />);
    await waitFor(() => expect(api.listConversations).toHaveBeenCalled());
    api.listConversations.mockResolvedValue([conversation]);

    act(() =>
      mockNotificationReceived({
        request: {
          content: { data: { type: 'chat-message', recipientId: 'me' } },
        },
      } as Notifications.Notification)
    );

    await screen.findByText(incoming.text);
    view.unmount();
    expect(mockRemoveNotification).toHaveBeenCalled();
  });

  it('reconciles a silent websocket in the foreground and stops after unmount', async () => {
    jest.useFakeTimers();
    try {
      const view = render(<ChatListScreen />);
      await act(async () => {});
      api.listConversations.mockResolvedValue([conversation]);

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      expect(screen.getByText(incoming.text)).toBeTruthy();
      const requests = api.listConversations.mock.calls.length;
      AppState.currentState = 'background';
      await act(async () => {
        jest.advanceTimersByTime(20000);
      });
      expect(api.listConversations).toHaveBeenCalledTimes(requests);
      view.unmount();
      AppState.currentState = 'active';
      await act(async () => {
        jest.advanceTimersByTime(20000);
      });
      expect(api.listConversations).toHaveBeenCalledTimes(requests);
    } finally {
      jest.useRealTimers();
    }
  });

  it('replaces a changed primary photo and clears a removed photo without a new message', async () => {
    jest.useFakeTimers();
    try {
      api.listConversations.mockResolvedValue([
        { ...conversation, primaryPhotoUrl: 'https://example.com/old.jpg' },
      ]);
      const view = render(<ChatListScreen />);
      await act(async () => {});
      expect(
        screen.getByTestId('conversation-avatar-other').props.source.uri
      ).toBe('https://example.com/old.jpg');

      api.listConversations.mockResolvedValue([
        { ...conversation, primaryPhotoUrl: 'https://example.com/new.jpg' },
      ]);
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      expect(
        screen.getByTestId('conversation-avatar-other').props.source.uri
      ).toBe('https://example.com/new.jpg');

      api.listConversations.mockResolvedValue([
        { ...conversation, primaryPhotoUrl: null },
      ]);
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      expect(screen.queryByTestId('conversation-avatar-other')).toBeNull();
      view.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not overwrite a fresh list with a late older response', async () => {
    let resolveOld!: (value: (typeof conversation)[]) => void;
    api.listConversations.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    );
    render(<ChatListScreen />);
    api.listConversations.mockResolvedValue([conversation]);
    act(() => mockMessageEvent(payload));
    await screen.findByText(incoming.text);

    await act(async () => {
      resolveOld([]);
    });
    expect(screen.getByText(incoming.text)).toBeTruthy();
  });
});
