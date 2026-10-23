import React from 'react';
import { Platform } from 'react-native';
import type { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { BlurRootView, BlurView } from '../BlurView';

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurTargetView: React.forwardRef((props: object, ref: React.Ref<View>) =>
      React.createElement(View, { ...props, ref })
    ),
    BlurView: jest.fn((props: { testID?: string }) =>
      React.createElement(View, { testID: props.testID })
    ),
  };
});

const expoBlurMock = ExpoBlurView as unknown as jest.Mock;
const originalPlatform = Platform.OS;

function latestProps(testID: string) {
  const calls = expoBlurMock.mock.calls.filter(
    ([props]) => props.testID === testID
  );
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
});

afterEach(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: originalPlatform,
  });
});

it('attaches the Android target after the native parent has mounted', () => {
  render(
    <BlurRootView>
      <BlurView testID="card" blurMethod="dimezisBlurView" intensity={56} />
    </BlurRootView>
  );

  expect(latestProps('card').blurTarget.current).toBeTruthy();
  expect(latestProps('card').blurMethod).toBe('dimezisBlurView');
  expect(latestProps('card').intensity).toBe(56);
});

it('uses the nearest root for modal content instead of the screen target', () => {
  render(
    <BlurRootView>
      <BlurView testID="screen" />
      <BlurRootView>
        <BlurView testID="modal" />
      </BlurRootView>
    </BlurRootView>
  );

  const screen = latestProps('screen').blurTarget.current;
  const modal = latestProps('modal').blurTarget.current;
  expect(screen).toBeTruthy();
  expect(modal).toBeTruthy();
  expect(modal).not.toBe(screen);
});

it('preserves an explicit target supplied by a caller', () => {
  const target = React.createRef<View>();
  render(
    <BlurRootView>
      <BlurView testID="custom" blurTarget={target} />
    </BlurRootView>
  );

  expect(latestProps('custom').blurTarget).toBe(target);
});

it('keeps the native iOS blur behavior without an Android target', () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  render(
    <BlurRootView>
      <BlurView testID="ios" tint="dark" />
    </BlurRootView>
  );

  expect(latestProps('ios').blurTarget).toBeUndefined();
  expect(latestProps('ios').tint).toBe('dark');
});
