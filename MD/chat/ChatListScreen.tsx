import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { chatAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

type ConversationItem = {
  otherUserId: string;
  lastSenderId: string;
  lastMessageText: string | null;
  lastMessageMediaPath: string | null;
  lastMessageAt: string;
  primaryPhotoUrl?: string | null;
  displayName?: string | null;
};

export default function ChatListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Загрузка списка диалогов
   */
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const data = await chatAPI.listConversations(50);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Ошибка загрузки диалогов:', e);
      setError(e?.message ?? 'Не удалось загрузить диалоги');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Обновление списка (pull to refresh)
   */
  const onRefresh = useCallback(async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      const data = await chatAPI.listConversations(50);
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      console.error('Ошибка обновления:', e);
      setError(e?.message ?? 'Не удалось обновить');
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  /**
   * Начальная загрузка при монтировании
   */
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [fetchConversations, user]);

  /**
   * Перезагрузка при возврате на экран
   */
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchConversations();
      }
    }, [fetchConversations, user])
  );

  /**
   * Проверка авторизации
   */
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Требуется авторизация',
        'Для просмотра сообщений необходимо войти в систему',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Profile'),
          },
        ]
      );
    }
  }, [user, navigation]);

  /**
   * Polling: обновление списка каждые 10 секунд
   */
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      fetchConversations().catch(() => void 0);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fetchConversations, user]);

  /**
   * Realtime: подписка на новые сообщения
   */
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages-conversations-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          try {
            const m: any = (payload as any).new;
            // Если сообщение относится к текущему пользователю
            if (m.sender_id === user.id || m.recipient_id === user.id) {
              // Обновляем список диалогов
              fetchConversations().catch(() => void 0);
            }
          } catch (error) {
            console.error('Ошибка обработки realtime:', error);
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
  }, [user?.id, fetchConversations]);

  /**
   * Форматирование даты
   */
  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        // Сегодня - показываем время
        return date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else if (days === 1) {
        return 'Вчера';
      } else if (days < 7) {
        return `${days} дн. назад`;
      } else {
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
        });
      }
    } catch {
      return '';
    }
  }, []);

  /**
   * Рендер одного диалога
   */
  const renderItem = useCallback(
    ({ item }: { item: ConversationItem }) => {
      const isMedia = !!item.lastMessageMediaPath && !item.lastMessageText;
      const preview = isMedia ? '📷 Медиа' : (item.lastMessageText ?? '—');
      const dateLabel = formatDate(item.lastMessageAt);

      return (
        <Pressable
          onPress={() => {
            navigation.navigate('ChatDialog', {
              otherUserId: item.otherUserId,
              displayName: item.displayName ?? undefined,
              primaryPhotoUrl: item.primaryPhotoUrl ?? undefined,
            });
          }}
          style={({ pressed }) => [
            styles.row,
            pressed ? styles.rowPressed : null,
          ]}
        >
          <View style={styles.avatar}>
            {item.primaryPhotoUrl ? (
              <Image
                source={{ uri: item.primaryPhotoUrl }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(item.displayName ?? item.otherUserId)
                    ?.slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.rowCenter}>
            <Text numberOfLines={1} style={styles.userId}>
              {item.displayName ?? item.otherUserId}
            </Text>
            <Text numberOfLines={1} style={styles.preview}>
              {preview}
            </Text>
          </View>

          <View style={styles.rowRight}>
            <Text numberOfLines={1} style={styles.time}>
              {dateLabel}
            </Text>
          </View>
        </Pressable>
      );
    },
    [formatDate, navigation]
  );

  /**
   * Пустой список
   */
  const listEmpty = useMemo(
    () =>
      !loading && (
        <View style={styles.empty}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color="rgba(255,255,255,0.3)"
          />
          <Text style={styles.emptyTitle}>Пока нет диалогов</Text>
          <Text style={styles.emptyHint}>
            Начните общение — отправьте сообщение из карточки кандидата
          </Text>
        </View>
      ),
    [loading]
  );

  /**
   * Разделитель между элементами
   */
  const itemSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

  // Если не авторизован
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Требуется авторизация</Text>
          <Text style={styles.errorHint}>
            Войдите в систему, чтобы просматривать сообщения
          </Text>
          <Pressable
            style={styles.authButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.authButtonText}>Войти</Text>
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

      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Сообщения</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Ionicons name="refresh" size={24} color="#8B5CF6" />
          )}
        </Pressable>
      </View>

      {/* Индикатор загрузки */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Загрузка диалогов...</Text>
        </View>
      ) : (
        <>
          {/* Ошибка */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Список диалогов */}
          <FlatList
            data={items}
            keyExtractor={(it) => it.otherUserId}
            renderItem={renderItem}
            ItemSeparatorComponent={itemSeparator}
            ListEmptyComponent={listEmpty}
            refreshControl={
              <RefreshControl
                tintColor="#8B5CF6"
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            contentContainerStyle={
              items.length === 0
                ? styles.emptyContentContainer
                : styles.contentContainer
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  refreshButton: {
    padding: 8,
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
  errorTitle: {
    color: '#EF4444',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  errorHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  authButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 14,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  rowCenter: {
    flex: 1,
    minWidth: 0,
  },
  userId: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  preview: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
  },
  rowRight: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  time: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  separator: {
    height: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyHint: {
    marginTop: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
