import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { setStoredLanguage } from '../../i18n';
import { storageLogger } from '../../services/logger';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
];

interface LanguageSelectorProps {
  onLanguageChange?: (language: string) => void;
  compact?: boolean;
  label?: string;
}

export default function LanguageSelector({
  onLanguageChange,
  compact = false,
  label,
}: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const hiddenSheetOffset = Math.max(windowHeight, 360);
  const [modalVisible, setModalVisible] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(hiddenSheetOffset)).current;

  const currentLanguage =
    LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    if (!modalVisible) return;

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, modalVisible, sheetTranslateY]);

  useEffect(() => {
    if (!modalVisible) {
      sheetTranslateY.setValue(hiddenSheetOffset);
    }
  }, [hiddenSheetOffset, modalVisible, sheetTranslateY]);

  const openModal = () => {
    backdropOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(hiddenSheetOffset);
    setModalVisible(true);
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: hiddenSheetOffset,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setModalVisible(false);
    });
  };

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      await setStoredLanguage(languageCode);
      closeModal();
      onLanguageChange?.(languageCode);
    } catch (error) {
      storageLogger.error('Failed to change language:', error);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorButton, compact && styles.compactSelectorButton]}
        onPress={openModal}
      >
        <View style={styles.languageInfo}>
          {!compact && <Text style={styles.flag}>{currentLanguage.flag}</Text>}
          <Text style={styles.languageName}>
            {compact
              ? label || currentLanguage.nativeName
              : currentLanguage.nativeName}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={compact ? 22 : 24}
          color="#fff"
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <Animated.View
            pointerEvents="none"
            style={[styles.modalBackdrop, { opacity: backdropOpacity }]}
          />
          <Pressable style={styles.modalDismissArea} onPress={closeModal} />
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('profile.settings.language')}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    item.code === i18n.language && styles.languageItemSelected,
                  ]}
                  onPress={() => handleLanguageSelect(item.code)}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={styles.languageTextContainer}>
                    <Text style={styles.languageItemName}>
                      {item.nativeName}
                    </Text>
                    <Text style={styles.languageItemEnglish}>{item.name}</Text>
                  </View>
                  {item.code === i18n.language && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#8B5CF6"
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  compactSelectorButton: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderBottomWidth: 0,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  flag: {
    fontSize: 24,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  languageItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  languageTextContainer: {
    flex: 1,
  },
  languageItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  languageItemEnglish: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
});
