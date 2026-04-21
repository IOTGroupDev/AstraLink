import React, { type ComponentProps, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

type LinearGradientProps = ComponentProps<typeof LinearGradient>;

export type GradientBorderColors = LinearGradientProps['colors'];

type GradientBorderStyle = ViewStyle & {
  borderColor?: never;
  borderTopColor?: never;
  borderRightColor?: never;
  borderBottomColor?: never;
  borderLeftColor?: never;
};

export interface GradientBorderViewProps
  extends Omit<ViewProps, 'style' | 'children'> {
  children?: ReactNode;
  colors: GradientBorderColors;
  contentStyle?: StyleProp<ViewStyle>;
  gradientProps?: Omit<LinearGradientProps, 'colors' | 'style' | 'children'>;
  style?: StyleProp<GradientBorderStyle>;
}

type BorderMetrics = {
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
  borderBottomWidth: number;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderTopWidth: number;
  borderLeftWidth: number;
  borderRightWidth: number;
};

const getNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' ? value : fallback;

const buildBorderMetrics = (style: ViewStyle): BorderMetrics => {
  const borderWidth = getNumber(style.borderWidth, 1);
  const borderRadius = getNumber(style.borderRadius, 0);

  return {
    borderBottomLeftRadius: getNumber(
      style.borderBottomLeftRadius,
      borderRadius
    ),
    borderBottomRightRadius: getNumber(
      style.borderBottomRightRadius,
      borderRadius
    ),
    borderBottomWidth: getNumber(style.borderBottomWidth, borderWidth),
    borderLeftWidth: getNumber(style.borderLeftWidth, borderWidth),
    borderRightWidth: getNumber(style.borderRightWidth, borderWidth),
    borderTopLeftRadius: getNumber(style.borderTopLeftRadius, borderRadius),
    borderTopRightRadius: getNumber(style.borderTopRightRadius, borderRadius),
    borderTopWidth: getNumber(style.borderTopWidth, borderWidth),
  };
};

const removeNativeBorderStyles = (style: ViewStyle): ViewStyle => {
  const {
    borderBottomColor,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderBottomWidth,
    borderColor,
    borderLeftColor,
    borderLeftWidth,
    borderRadius,
    borderRightColor,
    borderRightWidth,
    borderStyle,
    borderTopColor,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderTopWidth,
    borderWidth,
    ...containerStyle
  } = style;

  return containerStyle;
};

const buildRadiusStyle = ({
  borderBottomLeftRadius,
  borderBottomRightRadius,
  borderTopLeftRadius,
  borderTopRightRadius,
}: BorderMetrics): ViewStyle => ({
  borderBottomLeftRadius,
  borderBottomRightRadius,
  borderTopLeftRadius,
  borderTopRightRadius,
});

const buildInnerRadiusStyle = ({
  borderBottomLeftRadius,
  borderBottomRightRadius,
  borderBottomWidth,
  borderLeftWidth,
  borderRightWidth,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderTopWidth,
}: BorderMetrics): ViewStyle => ({
  borderBottomLeftRadius: Math.max(
    0,
    borderBottomLeftRadius - Math.max(borderBottomWidth, borderLeftWidth)
  ),
  borderBottomRightRadius: Math.max(
    0,
    borderBottomRightRadius - Math.max(borderBottomWidth, borderRightWidth)
  ),
  borderTopLeftRadius: Math.max(
    0,
    borderTopLeftRadius - Math.max(borderTopWidth, borderLeftWidth)
  ),
  borderTopRightRadius: Math.max(
    0,
    borderTopRightRadius - Math.max(borderTopWidth, borderRightWidth)
  ),
});

const hasVisibleBorder = ({
  borderBottomWidth,
  borderLeftWidth,
  borderRightWidth,
  borderTopWidth,
}: BorderMetrics) =>
  borderTopWidth > 0 ||
  borderRightWidth > 0 ||
  borderBottomWidth > 0 ||
  borderLeftWidth > 0;

export function GradientBorderView({
  children,
  colors,
  contentStyle,
  gradientProps,
  pointerEvents,
  style,
  ...viewProps
}: GradientBorderViewProps) {
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const borderMetrics = buildBorderMetrics(flatStyle);
  const radiusStyle = buildRadiusStyle(borderMetrics);
  const innerRadiusStyle = buildInnerRadiusStyle(borderMetrics);
  const containerStyle = removeNativeBorderStyles(flatStyle);

  return (
    <View
      {...viewProps}
      pointerEvents={pointerEvents}
      style={[styles.container, radiusStyle, containerStyle]}
    >
      {hasVisibleBorder(borderMetrics) && (
        <MaskedView
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          maskElement={
            <View
              style={[
                styles.mask,
                radiusStyle,
                {
                  borderBottomWidth: borderMetrics.borderBottomWidth,
                  borderLeftWidth: borderMetrics.borderLeftWidth,
                  borderRightWidth: borderMetrics.borderRightWidth,
                  borderTopWidth: borderMetrics.borderTopWidth,
                },
              ]}
            />
          }
        >
          <LinearGradient
            {...gradientProps}
            colors={colors}
            start={gradientProps?.start ?? { x: 0, y: 0 }}
            end={gradientProps?.end ?? { x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
      )}

      <View
        style={[
          styles.contentInset,
          {
            paddingBottom: borderMetrics.borderBottomWidth,
            paddingLeft: borderMetrics.borderLeftWidth,
            paddingRight: borderMetrics.borderRightWidth,
            paddingTop: borderMetrics.borderTopWidth,
          },
        ]}
      >
        <View style={[styles.content, innerRadiusStyle, contentStyle]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    overflow: 'hidden',
  },
  contentInset: {},
  mask: {
    ...StyleSheet.absoluteFillObject,
    borderColor: '#000',
  },
});

export default GradientBorderView;
