import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { chatAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

type RouteParams = {
  otherUserId: string;
  displayName?: string | null;
  primaryPhotoUrl?: string | null;
};

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string | null;
  mediaPath: string | null;
  createdAt: string;
};

export default function ChatDialogScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Параметры из навигации
  const otherUserId: string = route?.params?.otherUserId;
  const displayName: string | undefined =
    route?.params?.displayName ?? undefined;
  const primaryPhotoUrl: string | undefined =
    route?.params?.primaryPhotoUrl ?? undefined;

  // Состояния
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  // Проверка авторизации
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Требуется авторизация',
        'Для использования чата необходимо войти в систему',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [user, navigation]);

  /**
   * Загрузка сообщений с сервера
   */
  const fetchMessages = useCallback(async () => {
    if (!otherUserId || !user) return;

    try {
      const items = await chatAPI.listMessages(otherUserId, 100);
      const sorted = [...items].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sorted as Message[]);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  }, [otherUserId, user]);

  /**
   * Начальная загрузка сообщений
   */
  useEffect(() => {
    if (user && otherUserId) {
      fetchMessages();
    }
  }, [fetchMessages, user, otherUserId]);

  /**
   * Polling: обновление сообщений каждые 5 секунд
   */
  useEffect(() => {
    if (!user || !otherUserId) return;

    const intervalId = setInterval(() => {
      fetchMessages().catch(() => void 0);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchMessages, user, otherUserId]);

  /**
   * Realtime подписка на новые сообщения через Supabase
   */
  useEffect(() => {
    if (!user || !otherUserId) return;

    const channel = supabase
      .channel(`messages-dialog-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          try {
            const m: any = (payload as any).new;

            // Проверяем, что сообщение относится к нашему диалогу
            if (
              (m.sender_id === user.id && m.recipient_id === otherUserId) ||
              (m.sender_id === otherUserId && m.recipient_id === user.id)
            ) {
              setMessages((prev) => {
                // Избегаем дубликатов
                if (prev.some((x) => x.id === m.id)) return prev;

                const newMessage: Message = {
                  id: m.id,
                  senderId: m.sender_id,
                  recipientId: m.recipient_id,
                  text: m.content ?? null,
                  mediaPath: m.media_path ?? null,
                  createdAt: m.created_at,
                };

                const next = [...prev, newMessage];
                // Сортируем по времени создания
                next.sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                );

                return next;
              });

              // Автоматически прокручиваем к последнему сообщению
              setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          } catch (error) {
            console.error('Ошибка обработки realtime сообщения:', error);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Ошибка отписки от канала:', error);
      }
    };
  }, [user, otherUserId]);

  /**
   * Отправка сообщения
   */
  const onSend = useCallback(async () => {
    const payload = text.trim();

    // Валидация
    if (!payload || sending || !user || !otherUserId) return;

    try {
      setSending(true);

      // Отправляем сообщение на сервер
      const response = await chatAPI.sendMessage(otherUserId, payload, null);

      // Оптимистичное обновление UI
      const now = new Date().toISOString();
      const optimisticMessage: Message = {
        id: response.id,
        senderId: user.id,
        recipientId: otherUserId,
        text: payload,
        mediaPath: null,
        createdAt: now,
      };

      setMessages((prev) => {
        // Избегаем дубликатов
        if (prev.some((x) => x.id === response.id)) return prev;
        return [...prev, optimisticMessage];
      });

      // Очищаем поле ввода
      setText('');

      // Прокручиваем к последнему сообщению
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);

      // Синхронизируем с сервером (на случай, если realtime не сработал)
      setTimeout(() => {
        fetchMessages().catch(() => void 0);
      }, 500);
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось отправить сообщение. Попробуйте еще раз.'
      );
    } finally {
      setSending(false);
    }
  }, [text, sending, otherUserId, user, fetchMessages]);

  /**
   * Рендер одного сообщения
   */
  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      if (!user) return null;

      const isMine = item.senderId === user.id;

      return (
        <View
          style={[
            styles.msgRow,
            isMine ? styles.msgRowMine : styles.msgRowOther,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleOther,
            ]}
          >
            {item.text ? (
              <Text style={styles.msgText}>{item.text}</Text>
            ) : item.mediaPath ? (
              <View style={styles.mediaContainer}>
                <Ionicons name="image" size={20} color="#fff" />
                <Text style={styles.msgText}>📷 Медиа</Text>
              </View>
            ) : (
              <Text style={styles.msgText}>—</Text>
            )}
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      );
    },
    [user]
  );

  /**
   * Если пользователь не указан
   */
  if (!otherUserId) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.error}>Не указан собеседник</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /**
   * Если пользователь не авторизован
   */
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={48} color="#EF4444" />
          <Text style={styles.error}>Требуется авторизация</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Фоновый градиент */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Хедер */}
        <View style={styles.header}>
          <Pressable style={styles.backHit} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <View style={styles.headerCenter}>
            {primaryPhotoUrl ? (
              <Image source={{ uri: primaryPhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(displayName || otherUserId).slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{displayName || otherUserId}</Text>
              <Text style={styles.subtitle}>В сети</Text>
            </View>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Список сообщений */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#8B5CF6" size="large" />
            <Text style={styles.loadingText}>Загрузка сообщений...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color="rgba(255,255,255,0.3)"
            />
            <Text style={styles.emptyText}>Нет сообщений</Text>
            <Text style={styles.emptyHint}>Начните диалог!</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Поле ввода */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Напишите сообщение..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <Pressable
              style={[
                styles.sendBtn,
                (!text.trim() || sending) && styles.sendDisabled,
              ]}
              disabled={!text.trim() || sending}
              onPress={onSend}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  backHit: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 120,
  },
  msgRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleMine: {
    backgroundColor: '#8B5CF6',
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 4,
  },
  msgText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.2)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sendDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    shadowOpacity: 0.1,
  },
});
