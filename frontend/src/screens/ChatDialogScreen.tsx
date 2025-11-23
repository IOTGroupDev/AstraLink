import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  Keyboard,
  BackHandler,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { chatAPI, userPhotosAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../services/logger';

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
  mediaUrl?: string | null;
};

export default function ChatDialogScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = useMemo(() => {
    if (Platform.OS !== 'ios') return 0;
    return (insets?.top || 0) + 120;
  }, [insets?.top]);

  const otherUserId: string = route?.params?.otherUserId;
  const displayName: string | undefined =
    route?.params?.displayName ?? undefined;
  const primaryPhotoUrl: string | undefined =
    route?.params?.primaryPhotoUrl ?? undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const authAlertShown = useRef(false);

  // Кэш подписанных URL по mediaPath, чтобы не мигало
  const mediaUrlCacheRef = useRef<Record<string, string>>({});

  // Helpers to handle schema drift in realtime payloads
  const pickKey = useCallback((obj: any, keys: string[]) => {
    return keys.find(
      (k) => obj && Object.prototype.hasOwnProperty.call(obj, k)
    );
  }, []);
  const mediaKeys = useRef<string[]>([
    'attachment_path',
    'media_path',
    'media_url',
    'attachment_url',
    'attachment',
  ]).current;
  const contentKeys = useRef<string[]>([
    'content',
    'text',
    'body',
    'message',
  ]).current;
  const createdKeys = useRef<string[]>([
    'created_at',
    'createdAt',
    'createdAtUtc',
  ]).current;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (!authAlertShown.current) {
        authAlertShown.current = true;
        Alert.alert(
          'Требуется авторизация',
          'Для использования чата необходимо войти в систему',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } else {
      authAlertShown.current = false;
    }
  }, [user, authLoading, navigation]);

  const fetchMessages = useCallback(async () => {
    if (!otherUserId || !user) return;
    try {
      const items = await chatAPI.listMessages(otherUserId, 100);
      const sorted = [...items].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Маппим и подтягиваем mediaUrl из кэша, если сервер не прислал
      const mapped: Message[] = sorted.map((it: any) => {
        const mp = it.mediaPath ?? it.media_path ?? null;
        const mu =
          it.mediaUrl ??
          it.media_url ??
          (mp ? mediaUrlCacheRef.current[mp] : null);
        return {
          id: it.id,
          senderId: it.senderId,
          recipientId: it.recipientId,
          text: it.text ?? null,
          mediaPath: mp,
          createdAt: it.createdAt,
          mediaUrl: mu ?? null,
        };
      });

      // Обновляем кэш известными URL
      for (const m of mapped) {
        if (m.mediaPath && m.mediaUrl) {
          mediaUrlCacheRef.current[m.mediaPath] = m.mediaUrl;
        }
      }

      setMessages(mapped);
    } catch (e) {
      logger.error('Ошибка загрузки сообщений', e);
    } finally {
      setLoading(false);
    }
  }, [otherUserId, user]);

  useEffect(() => {
    if (user && otherUserId) fetchMessages();
  }, [user, otherUserId, fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      if (user && otherUserId) fetchMessages();
    }, [user, otherUserId, fetchMessages])
  );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('MainTabs', { screen: 'Messages' });
        return true;
      };
      const sub = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => {
        try {
          sub.remove();
        } catch {}
      };
    }, [navigation])
  );

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardWillShow', () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const s2 = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => {
      try {
        s1.remove();
        s2.remove();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!user || !otherUserId) return;
    const channel = supabase
      .channel(`messages-dialog-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          try {
            const evt =
              (payload as any).eventType ||
              (payload as any).event ||
              (payload as any).type;
            const recNew: any = (payload as any).new;
            const recOld: any = (payload as any).old;
            const relevant = (r: any) =>
              r &&
              ((r.sender_id === user.id && r.recipient_id === otherUserId) ||
                (r.sender_id === otherUserId && r.recipient_id === user.id));
            if (evt === 'INSERT' && recNew && relevant(recNew)) {
              setMessages((prev) => {
                if (prev.some((x) => x.id === recNew.id)) return prev;

                const mk = pickKey(recNew, mediaKeys) || 'media_path';
                const rawMedia = mk ? recNew[mk] : null;
                let mp: string | null = null;
                let mu: string | null = null;
                if (typeof rawMedia === 'string' && rawMedia.trim()) {
                  if (/^https?:\/\//i.test(rawMedia)) {
                    mu = rawMedia;
                  } else {
                    mp = rawMedia;
                  }
                }
                // Попробуем взять URL: из события или из кэша
                if (!mu && mp) {
                  mu = mediaUrlCacheRef.current[mp] ?? null;
                }

                // Пытаемся найти локальное оптимистичное сообщение и заменить его на серверное
                const localIdx = prev.findIndex(
                  (m) =>
                    m.id.startsWith('local-') &&
                    (!!mp ? m.mediaPath === mp : false) &&
                    m.senderId === user.id &&
                    !m.text
                );

                const next = [...prev];
                const newMessage: Message = {
                  id: recNew.id,
                  senderId: recNew.sender_id,
                  recipientId: recNew.recipient_id,
                  text:
                    (pickKey(recNew, contentKeys)
                      ? recNew[pickKey(recNew, contentKeys)!]
                      : recNew.content) ?? null,
                  mediaPath: mp,
                  createdAt:
                    (pickKey(recNew, createdKeys)
                      ? recNew[pickKey(recNew, createdKeys)!]
                      : recNew.created_at) ?? new Date().toISOString(),
                  mediaUrl: mu ?? null,
                };

                if (localIdx !== -1) {
                  // Сохраняем mediaUrl, если был выставлен локально
                  if (!newMessage.mediaUrl && next[localIdx].mediaUrl) {
                    newMessage.mediaUrl = next[localIdx].mediaUrl;
                  }
                  // Обновляем кэш
                  if (newMessage.mediaPath && newMessage.mediaUrl) {
                    mediaUrlCacheRef.current[newMessage.mediaPath] =
                      newMessage.mediaUrl;
                  }
                  next[localIdx] = newMessage;
                } else {
                  // Просто добавляем сообщение
                  if (newMessage.mediaPath && newMessage.mediaUrl) {
                    mediaUrlCacheRef.current[newMessage.mediaPath] =
                      newMessage.mediaUrl;
                  }
                  next.push(newMessage);
                }

                next.sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                );
                return next;
              });
              setTimeout(
                () => listRef.current?.scrollToEnd({ animated: true }),
                100
              );
              return;
            }
            if (evt === 'UPDATE' && recNew && relevant(recNew)) {
              setMessages((prev) => {
                const idx = prev.findIndex((x) => x.id === recNew.id);
                if (idx === -1) return prev;
                const copy = [...prev];
                const mkU = pickKey(recNew, mediaKeys) || 'media_path';
                const rawMediaU = mkU ? recNew[mkU] : null;
                let mpU: string | null = copy[idx].mediaPath ?? null;
                let muU: string | null = copy[idx].mediaUrl ?? null;
                if (typeof rawMediaU === 'string' && rawMediaU.trim()) {
                  if (/^https?:\/\//i.test(rawMediaU)) {
                    muU = rawMediaU;
                  } else {
                    mpU = rawMediaU;
                  }
                }
                if (!muU && mpU) {
                  muU = mediaUrlCacheRef.current[mpU] ?? null;
                }
                const createdKeyU = pickKey(recNew, createdKeys);
                const contentKeyU = pickKey(recNew, contentKeys);
                copy[idx] = {
                  ...copy[idx],
                  text:
                    contentKeyU !== undefined && contentKeyU
                      ? recNew[contentKeyU]
                      : recNew.content !== undefined
                        ? recNew.content
                        : copy[idx].text,
                  mediaPath: mpU,
                  mediaUrl: muU ?? null,
                  createdAt: createdKeyU
                    ? recNew[createdKeyU]
                    : recNew.created_at !== undefined
                      ? recNew.created_at
                      : copy[idx].createdAt,
                };
                if (copy[idx].mediaPath && copy[idx].mediaUrl) {
                  mediaUrlCacheRef.current[copy[idx].mediaPath!] =
                    copy[idx].mediaUrl!;
                }
                return copy;
              });
              return;
            }
            if (evt === 'DELETE' && recOld && relevant(recOld)) {
              setMessages((prev) => prev.filter((x) => x.id !== recOld.id));
              return;
            }
            if (!evt && recNew && relevant(recNew)) {
              setMessages((prev) => {
                if (prev.some((x) => x.id === recNew.id)) return prev;
                const mk0 = pickKey(recNew, mediaKeys) || 'media_path';
                const rawMedia0 = mk0 ? recNew[mk0] : null;
                let mp0: string | null = null;
                let mu0: string | null = null;
                if (typeof rawMedia0 === 'string' && rawMedia0.trim()) {
                  if (/^https?:\/\//i.test(rawMedia0)) {
                    mu0 = rawMedia0;
                  } else {
                    mp0 = rawMedia0;
                  }
                }
                if (!mu0 && mp0) {
                  mu0 = mediaUrlCacheRef.current[mp0] ?? null;
                }
                const createdKey0 = pickKey(recNew, createdKeys);
                const contentKey0 = pickKey(recNew, contentKeys);
                const next = [
                  ...prev,
                  {
                    id: recNew.id,
                    senderId: recNew.sender_id,
                    recipientId: recNew.recipient_id,
                    text: contentKey0
                      ? recNew[contentKey0]
                      : (recNew.content ?? null),
                    mediaPath: mp0,
                    createdAt: createdKey0
                      ? recNew[createdKey0]
                      : recNew.created_at,
                    mediaUrl: mu0 ?? null,
                  } as Message,
                ];
                next.sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                );
                return next;
              });
              setTimeout(
                () => listRef.current?.scrollToEnd({ animated: true }),
                100
              );
            }
          } catch (e) {
            logger.error('Ошибка обработки realtime сообщения', e);
          }
        }
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        logger.error('Ошибка отписки от канала', e);
      }
    };
  }, [user, otherUserId]);

  // Локальная подпись URL для медиа, если сервер не вернул mediaUrl
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Найдём сообщения с путём в Storage, но без готового URL
        const needs = messages.filter((m) => !!m.mediaPath && !m.mediaUrl);
        if (needs.length === 0) return;

        const updates: Record<string, string> = {};
        for (const m of needs) {
          const { data, error } = await supabase.storage
            .from('user-photos')
            .createSignedUrl(m.mediaPath as string, 900);
          if (!error && data?.signedUrl) {
            updates[m.id] = data.signedUrl;
            mediaUrlCacheRef.current[m.mediaPath!] = data.signedUrl;
          }
        }

        if (!cancelled && Object.keys(updates).length) {
          setMessages((prev) =>
            prev.map((m) =>
              updates[m.id] ? { ...m, mediaUrl: updates[m.id] } : m
            )
          );
        }
      } catch {
        // молча игнорируем — в UI останется плейсхолдер
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages]);

  const onSend = useCallback(async () => {
    const payload = text.trim();
    if (!payload || sending || !user || !otherUserId) return;
    try {
      setSending(true);
      const response = await chatAPI.sendMessage(otherUserId, payload, null);
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
        if (prev.some((x) => x.id === response.id)) return prev;
        return [...prev, optimisticMessage];
      });
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      setTimeout(() => {
        fetchMessages().catch(() => void 0);
      }, 500);
    } catch (error) {
      logger.error('Ошибка отправки сообщения', error);
      Alert.alert(
        'Ошибка',
        'Не удалось отправить сообщение. Попробуйте еще раз.'
      );
    } finally {
      setSending(false);
    }
  }, [text, sending, otherUserId, user, fetchMessages]);

  const onAttach = useCallback(async () => {
    if (uploading || sending) return;
    if (!user || !otherUserId) return;
    try {
      setUploading(true);
      const pick = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if ((pick as any)?.canceled) {
        setUploading(false);
        return;
      }
      const asset = (pick as any)?.assets?.[0];
      if (!asset?.uri) {
        setUploading(false);
        return;
      }
      const uri: string = asset.uri;
      const name: string = asset.name || uri;
      const lower = name.toLowerCase();
      const mime: 'image/jpeg' | 'image/png' | 'image/webp' = lower.endsWith(
        '.png'
      )
        ? 'image/png'
        : lower.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';
      const ext: 'jpg' | 'jpeg' | 'png' | 'webp' =
        mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpeg';

      const { path, signedUrl } = await userPhotosAPI.getUploadUrl({ ext });

      // Загружаем файл на подписанный URL
      await FileSystem.uploadAsync(signedUrl, uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': mime, 'x-upsert': 'true' },
      });

      // Сразу создадим подписанный URL для чтения и положим его в кэш и оптимистичное сообщение
      let localSignedUrl: string | null = null;
      try {
        const { data, error } = await supabase.storage
          .from('user-photos')
          .createSignedUrl(path, 900);
        if (!error && data?.signedUrl) {
          localSignedUrl = data.signedUrl;
          mediaUrlCacheRef.current[path] = data.signedUrl;
        }
      } catch {}

      const nowIso = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          senderId: user.id,
          recipientId: otherUserId,
          text: null,
          mediaPath: path,
          createdAt: nowIso,
          mediaUrl: localSignedUrl,
        },
      ]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

      await chatAPI.sendMessage(otherUserId, undefined, path);
      setTimeout(() => {
        fetchMessages().catch(() => void 0);
      }, 400);
    } catch (err) {
      logger.error('Ошибка загрузки вложения', err);
      Alert.alert('Ошибка', 'Не удалось отправить файл. Попробуйте ещё раз.');
    } finally {
      setUploading(false);
    }
  }, [uploading, sending, user, otherUserId, fetchMessages]);

  // Удаление сообщений
  const removeMessageLocal = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleDeleteForMe = useCallback(
    async (m: Message) => {
      try {
        if (m.id.startsWith('local-')) {
          removeMessageLocal(m.id);
          return;
        }
        await chatAPI.deleteMessage(m.id, 'for_me');
        removeMessageLocal(m.id);
      } catch (e) {
        logger.error('Удаление у себя не удалось', e);
        Alert.alert('Ошибка', 'Не удалось удалить сообщение у вас.');
      }
    },
    [removeMessageLocal]
  );

  const handleDeleteForAll = useCallback(
    async (m: Message) => {
      try {
        if (m.id.startsWith('local-')) {
          // локальное ещё не синкнутое сообщение — просто убрать
          removeMessageLocal(m.id);
          return;
        }
        await chatAPI.deleteMessage(m.id, 'for_all');
        removeMessageLocal(m.id);
      } catch (e) {
        logger.error('Удаление у всех не удалось', e);
        Alert.alert('Ошибка', 'Не удалось удалить сообщение для всех.');
      }
    },
    [removeMessageLocal]
  );

  const onLongPressMessage = useCallback(
    (m: Message) => {
      const isMine = !!user && m.senderId === user.id;
      const buttons: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
      }> = [];

      buttons.push({
        text: 'Удалить у меня',
        onPress: () => handleDeleteForMe(m),
        style: 'default',
      });

      if (isMine && !m.id.startsWith('local-')) {
        buttons.push({
          text: 'Удалить у всех',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Удалить для всех?', 'Это действие нельзя отменить.', [
              { text: 'Отмена', style: 'cancel' },
              {
                text: 'Удалить',
                style: 'destructive',
                onPress: () => handleDeleteForAll(m),
              },
            ]);
          },
        });
      }

      buttons.push({ text: 'Отмена', style: 'cancel' });

      Alert.alert('Удаление сообщения', 'Выберите действие', buttons);
    },
    [user, handleDeleteForMe, handleDeleteForAll]
  );

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
          <Pressable
            onLongPress={() => onLongPressMessage(item)}
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleOther,
            ]}
          >
            {item.text ? (
              <Text style={styles.msgText}>{item.text}</Text>
            ) : item.mediaUrl || item.mediaPath ? (
              item.mediaUrl ? (
                <Image
                  source={{ uri: item.mediaUrl }}
                  style={styles.mediaImage}
                />
              ) : (
                <View style={styles.mediaContainer}>
                  <Ionicons name="image" size={20} color="#fff" />
                  <Text style={styles.msgText}>📷 Медиа</Text>
                </View>
              )
            ) : (
              <Text style={styles.msgText}>—</Text>
            )}
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Pressable>
        </View>
      );
    },
    [user, onLongPressMessage]
  );

  if (!otherUserId) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.error}>Не указан собеседник</Text>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Messages' })
            }
          >
            <Text style={styles.backButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (authLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Проверка авторизации...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={48} color="#EF4444" />
          <Text style={styles.error}>Требуется авторизация</Text>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Messages' })
            }
          >
            <Text style={styles.backButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backHit}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Messages' })
            }
          >
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
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Pressable
              style={[
                styles.attachBtn,
                (uploading || sending) && styles.sendDisabled,
              ]}
              disabled={uploading || sending}
              onPress={onAttach}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="attach-outline" size={20} color="#fff" />
              )}
            </Pressable>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Напишите сообщение..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              maxLength={1000}
              editable={!sending}
              blurOnSubmit={false}
              returnKeyType="send"
              onFocus={() =>
                setTimeout(
                  () => listRef.current?.scrollToEnd({ animated: true }),
                  50
                )
              }
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
    paddingBottom: 16,
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
  mediaImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  time: {
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
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
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
