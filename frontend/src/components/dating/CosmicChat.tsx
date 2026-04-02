import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  type KeyboardEvent,
  ScrollView,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../../services/logger';

interface CosmicChatProps {
  visible: boolean;
  user: {
    id: string;
    name: string;
    zodiacSign?: string | null;
    compatibility: number;
  };
  onClose: () => void;
  onSendMessage: (text: string) => Promise<void>;
}

const CosmicChat: React.FC<CosmicChatProps> = ({
  visible,
  user,
  onClose,
  onSendMessage,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (event: KeyboardEvent) => {
      const nextHeight = Math.max(
        0,
        event.endCoordinates.height -
          (Platform.OS === 'ios' ? insets.bottom : 0)
      );
      setKeyboardHeight(nextHeight);
    };

    const handleHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const restingBottom = useMemo(
    () => Math.max(tabBarHeight, insets.bottom + 12),
    [insets.bottom, tabBarHeight]
  );

  const sheetBottom = keyboardHeight > 0 ? keyboardHeight + 12 : restingBottom;

  const astroSuggestions = [
    user.zodiacSign
      ? t('dating.cosmicChat.suggestions.greeting', {
          zodiacSign: user.zodiacSign,
          defaultValue: `Hi! I see you're ${user.zodiacSign} ✨`,
        })
      : t('dating.cosmicChat.suggestions.aboutMe', {
          name: user.name,
          defaultValue: `Tell me about yourself, ${user.name}`,
        }),
    t('dating.cosmicChat.suggestions.compatibility', {
      percent: user.compatibility,
      defaultValue: `Our compatibility is ${user.compatibility}% — the stars are on our side! 🌟`,
    }),
    t('dating.cosmicChat.suggestions.aboutMe', {
      name: user.name,
      defaultValue: `Tell me about yourself, ${user.name}`,
    }),
  ];

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      await onSendMessage(message.trim());
      setMessage('');
    } catch (error) {
      logger.error(t('dating.errors.failedToSendMessage'), error);
    } finally {
      setSending(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setMessage(text);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />

      <Animated.View
        entering={SlideInDown.duration(400).springify()}
        style={[styles.container, { bottom: sheetBottom }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={restingBottom}
          style={styles.keyboardView}
          enabled
        >
          <LinearGradient
            colors={['#0F172A', '#1E293B', '#334155']}
            style={[
              styles.content,
              {
                paddingBottom:
                  keyboardHeight > 0 ? 16 : Math.max(16, insets.bottom + 8),
              },
            ]}
          >
            {/* Header */}
            <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userZodiac}>
                  {user.zodiacSign ? `${user.zodiacSign} • ` : ''}
                  {t('dating.cosmicChat.compatibilityLabel', {
                    percent: user.compatibility,
                    defaultValue: `${user.compatibility}% compatibility`,
                  })}
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </Animated.View>

            {/* Suggestions */}
            <Animated.View
              entering={FadeIn.delay(300)}
              style={styles.suggestionsWrap}
            >
              <ScrollView
                style={styles.suggestionsScroll}
                contentContainerStyle={styles.suggestionsContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.suggestionsTitle}>
                  {t('dating.cosmicChat.suggestionsTitle', {
                    defaultValue: '💫 Start the conversation:',
                  })}
                </Text>
                {astroSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestion(suggestion)}
                  >
                    <Ionicons name="star" size={16} color="#8B5CF6" />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {/* Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t('dating.cosmicChat.inputPlaceholder', {
                    defaultValue: 'Write your first message...',
                  })}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  multiline
                  maxLength={500}
                  editable={!sending}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!message.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!message.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  closeButton: {
    padding: 4,
  },
  userInfo: {
    flex: 1,
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  userZodiac: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
    marginTop: 4,
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  suggestionsWrap: {
    flex: 1,
  },
  suggestionsScroll: {
    flex: 1,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  suggestionText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 10,
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.2)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    alignItems: 'center',
    alignSelf: 'center',
    fontSize: 16,
    color: '#fff',
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    shadowOpacity: 0.1,
  },
});

export default CosmicChat;
