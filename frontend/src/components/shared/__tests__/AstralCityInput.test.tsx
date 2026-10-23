import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AstralCityInput from '../AstralCityInput';
import { geoApi, type CityOption } from '../../../services/api/geo.api';

jest.mock('../../../services/api/geo.api', () => ({
  geoApi: { suggestCities: jest.fn() },
}));
jest.mock('../LoadingIndicator', () => require('react-native').View);
jest.mock('@expo/vector-icons', () => ({
  Ionicons: require('react-native').View,
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  FadeInDown: { duration: () => ({ delay: () => undefined }) },
}));
const moscow: CityOption = {
  id: 'moscow',
  display: 'Москва, Россия',
  city: 'Москва',
  country: 'Россия',
  lat: 55.75,
  lon: 37.62,
  tzid: 'Europe/Moscow',
};
const petersburg: CityOption = {
  ...moscow,
  id: 'spb',
  display: 'Санкт-Петербург, Россия',
  city: 'Санкт-Петербург',
};
const onSelect = jest.fn();
function Form() {
  const [value, setValue] = useState('Мос');
  return (
    <AstralCityInput
      placeholder="City"
      value={value}
      onChangeText={setValue}
      onCitySelect={onSelect}
    />
  );
}
const search = async () => {
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
};
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(geoApi.suggestCities).mockResolvedValue([moscow]);
});
afterEach(() => jest.useRealTimers());

it('saves the full city and coordinates when iOS blurs before the suggestion press', async () => {
  render(<Form />);
  const input = screen.getByPlaceholderText('City');
  fireEvent(input, 'focus');
  await search();
  fireEvent(input, 'blur');
  fireEvent.press(screen.getByText(moscow.display));
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(input.props.value).toBe(moscow.display);
  expect(onSelect).toHaveBeenCalledWith(moscow);
  expect(screen.queryByText(moscow.display)).toBeNull();
});

it('ignores an old city search that finishes after a newer search', async () => {
  let finishOld!: (cities: CityOption[]) => void;
  jest.mocked(geoApi.suggestCities).mockReturnValueOnce(
    new Promise((resolve) => {
      finishOld = resolve;
    })
  );
  render(<Form />);
  const input = screen.getByPlaceholderText('City');
  fireEvent(input, 'focus');
  await search();
  jest.mocked(geoApi.suggestCities).mockResolvedValue([petersburg]);
  fireEvent.changeText(input, 'Сан');
  await search();
  await act(async () => {
    finishOld([moscow]);
  });
  expect(screen.getByText(petersburg.display)).toBeTruthy();
  expect(screen.queryByText(moscow.display)).toBeNull();
});

it('does not reopen suggestions after a city was selected during a pending search', async () => {
  render(<Form />);
  const input = screen.getByPlaceholderText('City');
  fireEvent(input, 'focus');
  await search();
  let finish!: (cities: CityOption[]) => void;
  jest.mocked(geoApi.suggestCities).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  fireEvent.changeText(input, 'Моск');
  await search();
  fireEvent.press(screen.getByText(moscow.display));
  await act(async () => {
    finish([petersburg]);
  });
  expect(input.props.value).toBe(moscow.display);
  expect(screen.queryByText(petersburg.display)).toBeNull();
});
