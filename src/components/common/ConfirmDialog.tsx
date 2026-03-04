import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Modal from './Modal';
import Button from './Button';
import { COLORS, SPACING } from '../../constants';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} onClose={onCancel} title={title} size="sm">
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <Button
          title={cancelLabel}
          onPress={onCancel}
          variant="outline"
          size="md"
          style={styles.btn}
          disabled={loading}
        />
        <Button
          title={confirmLabel}
          onPress={onConfirm}
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="md"
          loading={loading}
          style={styles.btn}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
  },
});
