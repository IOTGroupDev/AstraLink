import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DatingCard from '../DatingCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
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
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  useSharedValue: (value: unknown) => ({ value }),
  useAnimatedStyle: () => ({}),
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: () => {
      const gesture = {
        enabled: () => gesture,
        minDistance: () => gesture,
        onUpdate: () => gesture,
        onEnd: () => gesture,
      };
      return gesture;
    },
  },
}));

const user = {
  id: 'first',
  name: 'First',
  photos: ['photo-1', 'photo-2', 'photo-3'],
};
const onSwipe = jest.fn();
const onOpenProfile = jest.fn();
const props = {
  user,
  onSwipe,
  onOpenProfile,
  onChat: jest.fn(),
  onOpenActions: jest.fn(),
  isTop: true,
};
const shownPhoto = () =>
  screen.getByTestId('dating-card-photo').props.source.uri;
const tap = (label: string) =>
  fireEvent.press(screen.getByLabelText(label), { stopPropagation: jest.fn() });

beforeEach(() => jest.clearAllMocks());

it('browses all photos in both directions without opening the profile or liking', () => {
  render(<DatingCard {...props} />);
  expect(shownPhoto()).toBe('photo-1');
  tap('dating.card.nextPhoto');
  expect(shownPhoto()).toBe('photo-2');
  tap('dating.card.nextPhoto');
  expect(shownPhoto()).toBe('photo-3');
  tap('dating.card.nextPhoto');
  expect(shownPhoto()).toBe('photo-1');
  tap('dating.card.previousPhoto');
  expect(shownPhoto()).toBe('photo-3');
  expect(onOpenProfile).not.toHaveBeenCalled();
  expect(onSwipe).not.toHaveBeenCalled();
});

it('resets the photo when the next candidate appears and handles a shorter gallery', () => {
  const view = render(<DatingCard {...props} />);
  tap('dating.card.previousPhoto');
  view.rerender(
    <DatingCard {...props} user={{ ...user, photos: ['photo-1'] }} />
  );
  expect(shownPhoto()).toBe('photo-1');
  expect(screen.queryByLabelText('dating.card.nextPhoto')).toBeNull();
  view.rerender(
    <DatingCard
      {...props}
      user={{ ...user, id: 'second', photos: ['other-1', 'other-2'] }}
    />
  );
  expect(shownPhoto()).toBe('other-1');
});
