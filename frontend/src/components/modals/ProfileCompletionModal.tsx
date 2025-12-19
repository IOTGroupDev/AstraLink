import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface ProfileCompletionModalProps {
  visible: boolean;
  completionPercent: number;
  dontShowAgain: boolean;
  onToggleDontShowAgain: () => void;
  onClose: () => void;
  onEditProfile: () => void;
}

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  visible,
  completionPercent,
  dontShowAgain,
  onToggleDontShowAgain,
  onClose,
  onEditProfile,
}) => {
  const { t } = useTranslation();

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => null}>
          <Text style={styles.title}>{t('profile.completionModal.title')}</Text>
          <Text style={styles.message}>
            {t('profile.completionModal.message', {
              percent: completionPercent,
            })}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onEditProfile}
          >
            <Text style={styles.primaryButtonText}>
              {t('profile.completionModal.editProfile')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>
              {t('profile.completionModal.later')}
            </Text>
          </TouchableOpacity>

          <Pressable style={styles.checkboxRow} onPress={onToggleDontShowAgain}>
            <Ionicons
              name={dontShowAgain ? 'checkbox' : 'square-outline'}
              size={20}
              color={dontShowAgain ? '#8B5CF6' : '#9CA3AF'}
            />
            <Text style={styles.checkboxText}>
              {t('profile.completionModal.dontShow')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E1B2E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#C4B5FD',
    fontSize: 15,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxText: {
    color: '#E5E7EB',
    fontSize: 14,
  },
});

export default ProfileCompletionModal;
