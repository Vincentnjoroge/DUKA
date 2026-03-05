import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS } from '../../constants';

interface WebContainerProps {
  children: React.ReactNode;
  fullHeight?: boolean;
}

export default function WebContainer({ children, fullHeight = true }: WebContainerProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const { width } = useWindowDimensions();
  const isWide = width > 600;

  return (
    <View style={[styles.webOuter, fullHeight && styles.fullHeight]}>
      <View style={[
        styles.webInner,
        fullHeight && styles.fullHeight,
        isWide && styles.webInnerWide,
      ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
  },
  fullHeight: {
    flex: 1,
  },
  webInner: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.background,
    overflow: 'hidden' as any,
  },
  webInnerWide: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
});
