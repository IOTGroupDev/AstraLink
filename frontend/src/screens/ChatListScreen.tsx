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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { chatAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
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

  const fetchConversations = useCallback(async () => {
    setError(null);
    try {
      const data = await chatAPI.listConversations(50);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось загрузить диалоги');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await chatAPI.listConversations(50);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось обновить');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Пуллинг обновлений списка бесед (каждые 10 сек)
  useEffect(() => {
    const id = setInterval(() => {
      fetchConversations().catch(() => void 0);
    }, 10000);
    return () => clearInterval(id);
  }, [fetchConversations]);

  // Realtime: обновление списка при новых INSERT в messages пользователя
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
            if (m.sender_id === user.id || m.recipient_id === user.id) {
              fetchConversations().catch(() => void 0);
            }
          } catch {}
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [user?.id, fetchConversations]);

  const renderItem = useCallback(({ item }: { item: ConversationItem }) => {
    const isMedia = !!item.lastMessageMediaPath && !item.lastMessageText;
    const preview = isMedia ? '📎 Медиа' : (item.lastMessageText ?? '—');
    const dateLabel = useMemo(() => {
      try {
        const d = new Date(item.lastMessageAt);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString();
      } catch {
        return '';
      }
    }, [item.lastMessageAt]);

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
            <Text style={styles.avatarText}>
              {(item.displayName ?? item.otherUserId)
                ?.slice(0, 2)
                .toUpperCase()}
            </Text>
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
  }, []);

  const listEmpty = !loading && (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Пока нет диалогов</Text>
      <Text style={styles.emptyHint}>
        Начните общение — отправьте сообщение из карточки кандидата.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Сообщения</Text>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <FlatList
            data={items}
            keyExtractor={(it) => it.otherUserId}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListEmptyComponent={listEmpty}
            refreshControl={
              <RefreshControl
                tintColor="#ffffff"
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            contentContainerStyle={
              items.length === 0 ? { flexGrow: 1 } : undefined
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
    paddingTop: 64,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  rowCenter: {
    flex: 1,
    minWidth: 0,
  },
  userId: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  preview: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    marginTop: 4,
  },
  rowRight: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  time: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  sep: {
    height: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyHint: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  error: {
    marginBottom: 12,
    color: '#ff8080',
    textAlign: 'center',
  },
});
