import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  position?: 'center' | 'bottom';
}

const SIZE_WIDTHS = { sm: 280, md: 320, lg: '90%' as const };

export default function Modal({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  position = 'center',
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType={position === 'bottom' ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[
            styles.overlay,
            position === 'bottom' && styles.overlayBottom,
          ]}
          onPress={onClose}
        >
          <Pressable
            style={[
              styles.content,
              position === 'bottom' && styles.contentBottom,
              { width: SIZE_WIDTHS[size] },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {title && <Text style={styles.title}>{title}</Text>}
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBottom: {
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xxl,
    maxHeight: '80%',
  },
  contentBottom: {
    width: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
});
