import React from 'react';
import { Alert } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react-native';
import DatingScreen from '../DatingScreen';
import { datingAPI } from '../../services/api';
import type { DatingCandidate } from '../../types/dating';

const mockFocusListeners = new Set<() => void>();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (callback: () => (() => void) | void) => {
    const React = require('react');
    React.useEffect(() => {
      let cleanup = callback();
      const focus = () => {
        cleanup?.();
        cleanup = callback();
      };
      mockFocusListeners.add(focus);
      return () => {
        mockFocusListeners.delete(focus);
        cleanup?.();
      };
    }, [callback]);
  },
}));

jest.mock('../../hooks/useAuth', () => {
  const user = { id: 'me', email: 'me@example.com' };
  return { useAuth: () => ({ user, isLoading: false }) };
});
jest.mock('../../hooks/useOptionalBottomTabBarHeight', () => ({
  useOptionalBottomTabBarHeight: () => 0,
}));
jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../services/api', () => ({
  datingAPI: {
    getCandidates: jest.fn(),
    getMutualMatches: jest.fn(),
    like: jest.fn(),
  },
  userAPI: {},
}));
jest.mock('../../components/dating/DatingCard', () => {
  const React = require('react');
  const { Text, Pressable } = require('react-native');
  return function Card({
    user,
    onSwipe,
  }: {
    user: { name: string };
    onSwipe: (direction: string) => void;
  }) {
    return React.createElement(
      Pressable,
      { testID: 'card-swipe', onPress: () => onSwipe('right') },
      React.createElement(Text, null, user.name)
    );
  };
});
jest.mock('../../components/dating/DatingTabBar', () => ({
  DatingTabBar: () => null,
}));
jest.mock('../ChatListScreen', () => () => null);
jest.mock('../../components/shared', () => ({
  GradientBorderView: require('react-native').View,
}));
jest.mock('../../components/shared/BlurView', () => ({
  BlurView: require('react-native').View,
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
jest.mock(
  '@react-native-masked-view/masked-view',
  () => require('react-native').View
);
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: require('react-native').View,
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
}));

const api = jest.mocked(datingAPI);
const candidates = [
  { userId: 'alice', name: 'Alice', badge: 'low' },
  { userId: 'bob', name: 'Bob', badge: 'low' },
] as DatingCandidate[];
const saved = { success: true, matchId: null, message: 'Action recorded' };

describe('Dating Like button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getCandidates.mockResolvedValue(candidates);
    api.like.mockResolvedValue(saved);
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('records Like for the displayed profile and advances only after success', async () => {
    render(<DatingScreen />);
    await screen.findByText('Alice');

    fireEvent.press(screen.getByLabelText('dating.actions.like'));

    await screen.findByText('Bob');
    expect(api.like).toHaveBeenCalledWith('alice', 'like');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('restarts from the first profile after liking the entire batch and refreshing', async () => {
    render(<DatingScreen />);
    await screen.findByText('Alice');
    expect(api.getCandidates).toHaveBeenLastCalledWith(20, false);

    fireEvent.press(screen.getByLabelText('dating.actions.like'));
    await screen.findByText('Bob');
    fireEvent.press(screen.getByLabelText('dating.actions.like'));
    await screen.findByText('dating.empty.title');

    fireEvent.press(screen.getByLabelText('dating.empty.refresh'));

    await screen.findByText('Alice');
    expect(api.getCandidates).toHaveBeenLastCalledWith(20, true);
    expect(api.like).toHaveBeenCalledTimes(2);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('lets the user retry a failed replay request', async () => {
    api.getCandidates.mockResolvedValueOnce([]);
    render(<DatingScreen />);
    await screen.findByText('dating.empty.title');
    api.getCandidates.mockRejectedValueOnce(new Error('Refresh unavailable'));

    fireEvent.press(screen.getByLabelText('dating.empty.refresh'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(screen.getByLabelText('dating.empty.refresh')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('dating.empty.refresh'));
    await screen.findByText('Alice');
    expect(api.getCandidates).toHaveBeenLastCalledWith(20, true);
  });

  it('keeps the profile on failure and lets the user retry', async () => {
    api.like.mockRejectedValueOnce(new Error('RPC unavailable'));
    render(<DatingScreen />);
    await screen.findByText('Alice');

    fireEvent.press(screen.getByLabelText('dating.actions.like'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'common.errors.generic',
        'dating.errors.failedToSaveAction'
      )
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();
    fireEvent.press(screen.getByLabelText('dating.actions.like'));
    await screen.findByText('Bob');
  });

  it('does not submit twice or skip profiles while a request is pending', async () => {
    let finish!: (value: typeof saved) => void;
    api.like.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    render(<DatingScreen />);
    await screen.findByText('Alice');

    fireEvent.press(screen.getByLabelText('dating.actions.like'));
    fireEvent.press(screen.getByTestId('card-swipe'));
    expect(api.like).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Alice')).toBeTruthy();
    finish(saved);
    await screen.findByText('Bob');
  });

  it('reloads recommendations when returning after a preference change', async () => {
    render(<DatingScreen />);
    await screen.findByText('Alice');
    api.getCandidates.mockResolvedValueOnce([
      { userId: 'new-person', name: 'New preference result', badge: 'low' },
    ] as DatingCandidate[]);

    act(() => {
      for (const focus of mockFocusListeners) focus();
    });

    await screen.findByText('New preference result');
    expect(screen.queryByText('Alice')).toBeNull();
    expect(api.getCandidates).toHaveBeenCalledTimes(2);
  });

  it('does not restore stale recommendations after the refreshed request finishes', async () => {
    let finishOld!: (value: DatingCandidate[]) => void;
    api.getCandidates.mockReturnValueOnce(
      new Promise((resolve) => {
        finishOld = resolve;
      })
    );
    render(<DatingScreen />);
    await waitFor(() => expect(api.getCandidates).toHaveBeenCalledTimes(1));
    api.getCandidates.mockResolvedValueOnce([
      { userId: 'new-person', name: 'New preference result', badge: 'low' },
    ] as DatingCandidate[]);
    act(() => {
      for (const focus of mockFocusListeners) focus();
    });
    await screen.findByText('New preference result');

    await act(async () => {
      finishOld(candidates);
    });

    expect(screen.getByText('New preference result')).toBeTruthy();
    expect(screen.queryByText('Alice')).toBeNull();
  });

  it('does not keep an old recommendation batch if refreshing preferences fails', async () => {
    render(<DatingScreen />);
    await screen.findByText('Alice');
    api.getCandidates.mockRejectedValueOnce(new Error('Refresh failed'));

    act(() => {
      for (const focus of mockFocusListeners) focus();
    });

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'common.errors.generic',
        'dating.errors.failedToLoad'
      )
    );
    expect(screen.queryByText('Alice')).toBeNull();
  });
});
