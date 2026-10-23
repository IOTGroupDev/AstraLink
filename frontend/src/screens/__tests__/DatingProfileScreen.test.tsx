import React from 'react';
import { Modal } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import DatingProfileScreen from '../DatingProfileScreen';
import { datingAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  datingAPI: { getProfile: jest.fn() },
  userAPI: {},
}));
jest.mock('../../services/presence', () => ({
  getOnlineIds: () => new Set(),
  subscribePresence: () => () => undefined,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: require('react-native').View,
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: require('react-native').View,
}));
jest.mock('../../components/shared', () => ({
  GradientBorderView: require('react-native').View,
  DatingGlassFill: () => null,
  DATING_GLASS_BORDER_COLORS: [],
  DATING_GLASS_BORDER_GRADIENT: {},
}));
jest.mock(
  '../../components/shared/LoadingIndicator',
  () => require('react-native').View
);

type Props = React.ComponentProps<typeof DatingProfileScreen>;
const props = {
  navigation: { navigate: jest.fn(), goBack: jest.fn() },
  route: {
    key: 'profile',
    name: 'DatingProfile',
    params: { userId: 'other', photoUrl: 'old-avatar' },
  },
} as unknown as Props;
const profile = {
  userId: 'other',
  name: 'Other',
  age: null,
  zodiacSign: null,
  bio: null,
  interests: [],
  city: null,
  lookingFor: null,
  lastActive: null,
  primaryPhotoUrl: 'photo-1',
  photos: ['photo-1', 'photo-2', 'photo-3'],
};
const api = jest.mocked(datingAPI);
const shownPhoto = () =>
  screen.getByTestId('dating-profile-photo').props.source.uri;
beforeEach(() => {
  jest.clearAllMocks();
  api.getProfile.mockResolvedValue(profile);
});
afterEach(() => jest.restoreAllMocks());

it('loads the full gallery when opened from chat with only an avatar, and browses both ways', async () => {
  render(<DatingProfileScreen {...props} />);
  await screen.findByLabelText('dating.card.nextPhoto');
  expect(shownPhoto()).toBe('photo-1');
  fireEvent.press(screen.getByLabelText('dating.card.nextPhoto'));
  expect(shownPhoto()).toBe('photo-2');
  fireEvent.press(screen.getByLabelText('dating.card.previousPhoto'));
  expect(shownPhoto()).toBe('photo-1');
  fireEvent.press(screen.getByLabelText('dating.card.previousPhoto'));
  expect(shownPhoto()).toBe('photo-3');
});

it('uses native horizontal paging and updates the selected photo after a swipe', async () => {
  render(<DatingProfileScreen {...props} />);
  await screen.findByLabelText('dating.card.nextPhoto');
  const gallery = screen.getByTestId('dating-profile-gallery');
  expect(gallery.props.horizontal).toBe(true);
  expect(gallery.props.pagingEnabled).toBe(true);
  fireEvent(gallery, 'layout', {
    nativeEvent: { layout: { width: 340, height: 325 } },
  });
  fireEvent(gallery, 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: 340, y: 0 } },
  });
  expect(shownPhoto()).toBe('photo-2');
  fireEvent.press(screen.getByLabelText('dating.card.nextPhoto'));
  expect(shownPhoto()).toBe('photo-3');
});

it('does not retain a deleted photo from chat navigation data', async () => {
  api.getProfile.mockResolvedValue({
    ...profile,
    primaryPhotoUrl: null,
    photos: [],
  });
  render(<DatingProfileScreen {...props} />);
  await waitFor(() =>
    expect(
      screen.queryByTestId('dating-profile-photo')?.props.source
    ).toBeUndefined()
  );
  expect(screen.queryByLabelText('dating.card.nextPhoto')).toBeNull();
});

it('preserves the gallery passed by the dating card if an older API omits photos', async () => {
  api.getProfile.mockResolvedValue({ ...profile, photos: null });
  render(
    <DatingProfileScreen
      {...props}
      route={{
        ...props.route,
        params: {
          ...props.route.params,
          photoUrl: 'photo-1',
          photos: ['photo-1', 'photo-2', 'photo-3'],
        },
      }}
    />
  );
  await waitFor(() => expect(api.getProfile).toHaveBeenCalled());
  fireEvent.press(screen.getByLabelText('dating.card.nextPhoto'));
  expect(shownPhoto()).toBe('photo-2');
  expect(screen.getByText('2 / 3')).toBeTruthy();
});

it('opens the selected full photo without cropping, browses, and closes the viewer', async () => {
  render(<DatingProfileScreen {...props} />);
  fireEvent.press(await screen.findByLabelText('dating.card.nextPhoto'));
  fireEvent.press(screen.getByLabelText('dating.card.openPhoto'));
  const viewer = within(screen.getByTestId('dating-profile-photo-viewer'));
  expect(viewer.getByTestId('dating-profile-full-photo').props.source.uri).toBe(
    'photo-2'
  );
  expect(viewer.getByTestId('dating-profile-full-photo').props.resizeMode).toBe(
    'contain'
  );
  fireEvent.press(viewer.getByLabelText('dating.card.nextPhoto'));
  expect(viewer.getByTestId('dating-profile-full-photo').props.source.uri).toBe(
    'photo-3'
  );
  fireEvent.press(viewer.getByLabelText('common.buttons.close'));
  expect(screen.queryByTestId('dating-profile-full-photo')).toBeNull();
  expect(shownPhoto()).toBe('photo-3');
});

it('opens a single photo and supports native back dismissal', async () => {
  api.getProfile.mockResolvedValue({ ...profile, photos: ['photo-1'] });
  render(<DatingProfileScreen {...props} />);
  await waitFor(() => expect(shownPhoto()).toBe('photo-1'));
  fireEvent.press(screen.getAllByLabelText('dating.card.openPhoto')[0]);
  expect(screen.getByTestId('dating-profile-full-photo').props.source.uri).toBe(
    'photo-1'
  );
  fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
  expect(screen.queryByTestId('dating-profile-full-photo')).toBeNull();
});

it('opens the current photo by long press while ordinary taps still switch photos', async () => {
  render(<DatingProfileScreen {...props} />);
  const next = await screen.findByLabelText('dating.card.nextPhoto');
  fireEvent(next, 'longPress');
  expect(screen.getByTestId('dating-profile-full-photo').props.source.uri).toBe(
    'photo-1'
  );
});

it('swipes full screen photos both ways and disables paging while zoomed', async () => {
  render(<DatingProfileScreen {...props} />);
  await screen.findByLabelText('dating.card.nextPhoto');
  fireEvent.press(screen.getByLabelText('dating.card.openPhoto'));
  const width = screen.getByTestId('dating-profile-full-photo').props.style
    .width;
  const gallery = screen.getByTestId('dating-profile-full-gallery');

  fireEvent(gallery, 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: width, y: 0 } },
  });
  expect(screen.getByTestId('dating-profile-full-photo').props.source.uri).toBe(
    'photo-2'
  );
  expect(shownPhoto()).toBe('photo-2');
  fireEvent(gallery, 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: 0, y: 0 } },
  });
  expect(screen.getByTestId('dating-profile-full-photo').props.source.uri).toBe(
    'photo-1'
  );

  fireEvent(screen.getByTestId('dating-profile-photo-zoom'), 'scroll', {
    nativeEvent: { zoomScale: 2 },
  });
  expect(
    screen.getByTestId('dating-profile-full-gallery').props.scrollEnabled
  ).toBe(false);
  fireEvent(screen.getByTestId('dating-profile-photo-zoom'), 'scroll', {
    nativeEvent: { zoomScale: 1 },
  });
  expect(
    screen.getByTestId('dating-profile-full-gallery').props.scrollEnabled
  ).toBe(true);
});
