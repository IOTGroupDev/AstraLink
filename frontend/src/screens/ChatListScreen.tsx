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
import { useTranslation } from 'react-i18next';
import { chatAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { logger } from '../services/logger';

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
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authAlertShown = React.useRef(false);

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
      logger.error('Ошибка загрузки диалогов', e);
      setError(e?.message ?? t('chatList.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  // Debounced refetch to avoid API spam from burst realtime events
  const debouncedFetchRef = React.useRef<any>(null);
  const scheduleConversationsRefetch = React.useCallback(() => {
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }
    debouncedFetchRef.current = setTimeout(() => {
      fetchConversations().catch(() => void 0);
    }, 400);
  }, [fetchConversations]);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
    };
  }, []);

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
      logger.error('Ошибка обновления', e);
      setError(e?.message ?? t('chatList.errors.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  }, [user, t]);

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
    if (authLoading) return;
    if (!user) {
      if (!authAlertShown.current) {
        authAlertShown.current = true;
        Alert.alert(
          t('chatList.auth.required'),
          t('chatList.auth.alertMessage'),
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Profile'),
            },
          ]
        );
      }
    } else {
      authAlertShown.current = false;
    }
  }, [user, authLoading, navigation, t]);

  /**
   * Polling removed: relying on Realtime + onFocus refresh
   */

  /**
   * Realtime: подписка на новые/обновлённые сообщения пользователя
   * Обновляет список диалогов при любых изменениях в таблице messages.
   */
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          try {
            const row: any = (payload as any).new || (payload as any).old;
            if (!row) return;
            if (row.sender_id === user.id || row.recipient_id === user.id) {
              scheduleConversationsRefetch();
            }
          } catch {
            // ignore
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
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

      const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'es' ? 'es-ES' : 'en-US';

      if (days === 0) {
        // Сегодня - показываем время
        return date.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else if (days === 1) {
        return t('chatList.date.yesterday');
      } else if (days < 7) {
        return t('chatList.date.daysAgo', { count: days });
      } else {
        return date.toLocaleDateString(locale, {
          day: '2-digit',
          month: '2-digit',
        });
      }
    } catch {
      return '';
    }
  }, [t, i18n.language]);

  /**
   * Локально убрать переписку из списка
   */
  const deleteConversationLocal = useCallback((otherUserId: string) => {
    setItems((prev) => prev.filter((c) => c.otherUserId !== otherUserId));
  }, []);

  /**
   * Долгое нажатие по переписке — удалить у себя
   */
  const handleDeleteConversation = useCallback(
    (conv: ConversationItem) => {
      Alert.alert(
        t('chatList.deleteDialog.title'),
        t('chatList.deleteDialog.message'),
        [
          { text: t('chatList.deleteDialog.cancel'), style: 'cancel' },
          {
            text: t('chatList.deleteDialog.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await chatAPI.deleteConversation(conv.otherUserId);
                deleteConversationLocal(conv.otherUserId);
              } catch (e) {
                logger.error('Удаление переписки не удалось', e);
                Alert.alert(
                  t('common.errors.generic'),
                  t('chatList.errors.deleteFailed')
                );
              }
            },
          },
        ]
      );
    },
    [deleteConversationLocal, t]
  );

  /**
   * Рендер одного диалога
   */
  const renderItem = useCallback(
    ({ item }: { item: ConversationItem }) => {
      const isMedia = !!item.lastMessageMediaPath && !item.lastMessageText;
      const preview = isMedia ? t('chatList.media') : (item.lastMessageText ?? '—');
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
          onLongPress={() => handleDeleteConversation(item)}
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
    [formatDate, navigation, handleDeleteConversation, t]
  );

  /**
   * Пустой список
   */
  const listEmpty = useMemo<React.ReactElement | null>(() => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Ionicons
          name="chatbubbles-outline"
          size={64}
          color="rgba(255,255,255,0.3)"
        />
        <Text style={styles.emptyTitle}>{t('chatList.empty.title')}</Text>
        <Text style={styles.emptyHint}>
          {t('chatList.empty.hint')}
        </Text>
      </View>
    );
  }, [loading, t]);

  /**
   * Разделитель между элементами
   */
  type SeparatorProps = { highlighted: boolean; leadingItem: ConversationItem };
  const ItemSeparator: React.FC<SeparatorProps> = () => (
    <View style={styles.separator} />
  );

  // Пока идёт проверка авторизации — показываем спиннер
  if (authLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>{t('chatList.authCheck')}</Text>
        </View>
      </View>
    );
  }

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
          <Text style={styles.errorTitle}>{t('chatList.auth.required')}</Text>
          <Text style={styles.errorHint}>
            {t('chatList.auth.screenMessage')}
          </Text>
          <Pressable
            style={styles.authButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.authButtonText}>{t('chatList.auth.signInButton')}</Text>
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
        <Text style={styles.title}>{t('chatList.title')}</Text>
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
          <Text style={styles.loadingText}>{t('chatList.loading')}</Text>
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
            keyExtractor={(it, _i) => it.otherUserId}
            renderItem={renderItem}
            ItemSeparatorComponent={ItemSeparator}
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
