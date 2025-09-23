import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface CosmicChatProps {
  visible: boolean;
  user: {
    name: string;
    zodiacSign: string;
    compatibility: number;
  };
  onClose: () => void;
}

const CosmicChat: React.FC<CosmicChatProps> = ({ visible, user, onClose }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Привет! Звёзды свели нас вместе ✨', isMe: false, timestamp: '12:30' },
    { id: 2, text: 'Привет! Да, наша совместимость 85%! 🌟', isMe: true, timestamp: '12:32' },
    { id: 3, text: 'Мне нравится твой знак зодиака', isMe: false, timestamp: '12:35' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showAstroHelper, setShowAstroHelper] = useState(false);

  const astroHelperMessages = [
    'Спроси о её любимом времени года',
    'Обсудите планы на выходные',
    'Поделитесь астрологическими наблюдениями',
  ];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        text: newMessage.trim(),
        isMe: true,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const handleAstroHelper = () => {
    setShowAstroHelper(!showAstroHelper);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userZodiac}>{user.zodiacSign} • {user.compatibility}% совместимость</Text>
          </View>
          <TouchableOpacity onPress={handleAstroHelper} style={styles.astroButton}>
            <Ionicons name="sparkles" size={24} color="#8B5CF6" />
          </TouchableOpacity>
        </Animated.View>

        {/* Messages */}
        <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
          {messages.map((message) => (
            <Animated.View
              key={message.id}
              entering={SlideInUp.delay(100)}
              style={[
                styles.messageContainer,
                message.isMe ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <LinearGradient
                colors={message.isMe ? ['#8B5CF6', '#3B82F6'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.messageBubble}
              >
                <Text style={styles.messageText}>{message.text}</Text>
                <Text style={styles.messageTime}>{message.timestamp}</Text>
              </LinearGradient>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Astro Helper */}
        {showAstroHelper && (
          <Animated.View entering={SlideInUp.delay(200)} style={styles.astroHelper}>
            <Text style={styles.astroHelperTitle}>Астропомощник</Text>
            <Text style={styles.astroHelperSubtitle}>Предложения для начала разговора:</Text>
            {astroHelperMessages.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => {
                  setNewMessage(suggestion);
                  setShowAstroHelper(false);
                }}
              >
                <Ionicons name="star" size={16} color="#8B5CF6" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Input */}
        <Animated.View entering={SlideInUp.delay(400)} style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Напишите сообщение..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  closeButton: {
    padding: 10,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
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
    marginTop: 2,
  },
  astroButton: {
    padding: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  messageContainer: {
    marginBottom: 15,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.6,
    marginTop: 5,
    textAlign: 'right',
  },
  astroHelper: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  astroHelperTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 5,
  },
  astroHelperSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 10,
    marginBottom: 5,
  },
  suggestionText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    padding: 10,
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
