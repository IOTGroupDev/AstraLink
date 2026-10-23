import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ComponentPropsWithRef, RefObject } from 'react';
import { Platform, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { BlurTargetView, BlurView as ExpoBlurView } from 'expo-blur';

const BlurTargetContext = createContext<RefObject<View | null> | undefined>(
  undefined
);

/** Supplies SDK 57's explicit Android blur target for a screen or modal root. */
export function BlurRootView({ children, ...props }: ViewProps) {
  const nativeTarget = useRef<View | null>(null);
  const [target, setTarget] = useState<View | null>(null);
  // A new ref object after attachment lets mounted BlurViews resolve the native ID.
  const targetRef = useMemo(() => ({ current: target }), [target]);

  useLayoutEffect(() => {
    if (Platform.OS === 'android') setTarget(nativeTarget.current);
  }, []);

  if (Platform.OS !== 'android') {
    return <View {...props}>{children}</View>;
  }

  return (
    <BlurTargetContext.Provider value={targetRef}>
      <BlurTargetView {...props} ref={nativeTarget}>
        {children}
      </BlurTargetView>
    </BlurTargetContext.Provider>
  );
}

export function BlurView({
  blurTarget,
  ...props
}: ComponentPropsWithRef<typeof ExpoBlurView>) {
  const inheritedTarget = useContext(BlurTargetContext);
  return <ExpoBlurView {...props} blurTarget={blurTarget ?? inheritedTarget} />;
}
