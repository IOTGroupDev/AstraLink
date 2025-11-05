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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { chatAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
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
  const otherUserId: string = route?.params?.otherUserId;
  const displayName: string | undefined =
    route?.params?.displayName ?? undefined;
  const primaryPhotoUrl: string | undefined =
    route?.params?.primaryPhotoUrl ?? undefined;
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const items = await chatAPI.listMessages(otherUserId, 100);
      const sorted = [...items].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sorted as Message[]);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Лёгкий пуллинг обновлений (каждые 5 сек)
  useEffect(() => {
    const id = setInterval(() => {
      fetchMessages().catch(() => void 0);
    }, 5000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Realtime подписка на новые сообщения в диалоге
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-dialog-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          try {
            const m: any = (payload as any).new;
            if (
              (m.sender_id === user.id && m.recipient_id === otherUserId) ||
              (m.sender_id === otherUserId && m.recipient_id === user.id)
            ) {
              setMessages((prev) => {
                if (prev.some((x) => x.id === m.id)) return prev;
                const next = [
                  ...prev,
                  {
                    id: m.id,
                    senderId: m.sender_id,
                    recipientId: m.recipient_id,
                    text: m.content ?? null,
                    mediaPath: m.media_path ?? null,
                    createdAt: m.created_at,
                  } as Message,
                ];
                next.sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                );
                return next;
              });
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
  }, [user, otherUserId]);

  const onSend = useCallback(async () => {
    const payload = text.trim();
    if (!payload || sending) return;
    try {
      setSending(true);
      const res = await chatAPI.sendMessage(otherUserId, payload, null);
      // Оптимистично добавим сообщение к списку
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: res.id,
          senderId: user?.id ?? 'me',
          recipientId: otherUserId,
          text: payload,
          mediaPath: null,
          createdAt: now,
        } as any,
      ]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      // Подтянуть серверное состояние сразу после отправки
      fetchMessages().catch(() => void 0);
    } catch {
      // опустим обработку — UI не ломаем
    } finally {
      setSending(false);
    }
  }, [text, sending, otherUserId, fetchMessages]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      // Если знаем свой id — сравниваем с ним, иначе эвристика
      const isMine = user
        ? item.senderId === user.id
        : item.senderId !== otherUserId;
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
            ) : (
              <Text style={styles.msgText}>📎 Медиа</Text>
            )}
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      );
    },
    [otherUserId, user?.id]
  );

  if (!otherUserId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Не указан собеседник</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={86}
      >
        <View style={styles.header}>
          <Pressable style={styles.backHit} onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {primaryPhotoUrl ? (
              <Image
                source={{ uri: primaryPhotoUrl }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  marginRight: 6,
                }}
              />
            ) : null}
            <Text style={styles.title}>
              {displayName ?? otherUserId ?? 'Диалог'}
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#ffffff" size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Сообщение"
            placeholderTextColor="rgba(255,255,255,0.6)"
            multiline
          />
          <Pressable
            style={[
              styles.sendBtn,
              !text.trim() || sending ? styles.sendDisabled : null,
            ]}
            disabled={!text.trim() || sending}
            onPress={onSend}
          >
            <Text style={styles.sendText}>{sending ? '...' : '➤'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backHit: { padding: 4 },
  back: { color: '#fff', fontSize: 28, lineHeight: 28 },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ff8080' },

  inputRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    padding: 0,
    marginRight: 8,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6F1F86',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  sendDisabled: { opacity: 0.6 },

  msgRow: { marginBottom: 10, flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleMine: { backgroundColor: '#6F1F86', borderTopRightRadius: 4 },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderTopLeftRadius: 4,
  },
  msgText: { color: '#fff', fontSize: 16 },
  time: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    alignSelf: 'flex-end',
  },
});
