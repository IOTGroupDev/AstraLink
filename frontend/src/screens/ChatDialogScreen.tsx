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
import { useTranslation } from 'react-i18next';
import { chatAPI, datingAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../services/logger';

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string | null;
  mediaPath: string | null;
  createdAt: string;
  mediaUrl?: string | null;
};

const USER_PHOTOS_BUCKET = 'user-photos';
const CHAT_MEDIA_BUCKET = 'chat-media';
const CHAT_MEDIA_PREFIX = `${CHAT_MEDIA_BUCKET}:`;

const resolveMediaStorageTarget = (
  mediaPath: string
): { bucket: string; path: string } => {
  if (mediaPath.startsWith(CHAT_MEDIA_PREFIX)) {
    return {
      bucket: CHAT_MEDIA_BUCKET,
      path: mediaPath.slice(CHAT_MEDIA_PREFIX.length),
    };
  }

  return {
    bucket: USER_PHOTOS_BUCKET,
    path: mediaPath,
  };
};

export default function ChatDialogScreen() {
  const { t, i18n } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = useMemo(() => {
    if (Platform.OS !== 'ios') return 0;
    return (insets?.top || 0) + 120;
  }, [insets?.top]);
  const headerTopPadding = Math.max((insets?.top || 0) + 10, 20);
  const headerHeight = headerTopPadding + 63;
  const inputBottomPadding = Math.max((insets?.bottom || 0) + 8, 16);

  const otherUserId: string = route?.params?.otherUserId;
  const displayName: string | undefined =
    route?.params?.displayName ?? undefined;
  const primaryPhotoUrl: string | undefined =
    route?.params?.primaryPhotoUrl ?? undefined;

  const openOtherProfile = useCallback(() => {
    if (!otherUserId) return;
    navigation.navigate('DatingProfile', {
      userId: otherUserId,
      compatibility: null,
      name: displayName ?? otherUserId,
      photoUrl: primaryPhotoUrl ?? null,
    });
  }, [displayName, navigation, otherUserId, primaryPhotoUrl]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [text, setText] = useState('');
  const [otherProfile, setOtherProfile] = useState<{
    zodiacSign: string | null;
    lastActive: string | null;
    primaryPhotoUrl: string | null;
  } | null>(null);
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
          t('chat.errors.authRequired'),
          t('chat.errors.authRequiredMessage'),
          [{ text: t('common.buttons.ok'), onPress: () => navigation.goBack() }]
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

  useEffect(() => {
    if (!otherUserId) return;
    let mounted = true;
    void datingAPI
      .getProfile(otherUserId)
      .then((profile) => {
        if (mounted) {
          setOtherProfile({
            zodiacSign: profile.zodiacSign,
            lastActive: profile.lastActive ?? null,
            primaryPhotoUrl: profile.primaryPhotoUrl,
          });
        }
      })
      .catch(() => void 0);
    return () => {
      mounted = false;
    };
  }, [otherUserId]);

  useFocusEffect(
    useCallback(() => {
      if (user && otherUserId) fetchMessages();
    }, [user, otherUserId, fetchMessages])
  );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };
      const sub = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => {
        try {
          sub.remove();
        } catch (removeError) {
          logger.warn(
            'Не удалось удалить обработчик кнопки назад',
            removeError
          );
        }
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
      } catch (removeError) {
        logger.warn('Не удалось удалить keyboard listeners', removeError);
      }
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
                    (mp ? m.mediaPath === mp : false) &&
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

                if (mp && !newMessage.mediaUrl) {
                  setTimeout(() => {
                    fetchMessages().catch(() => void 0);
                  }, 300);
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
                } else if (copy[idx].mediaPath) {
                  setTimeout(() => {
                    fetchMessages().catch(() => void 0);
                  }, 300);
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
                if (mp0 && !mu0) {
                  setTimeout(() => {
                    fetchMessages().catch(() => void 0);
                  }, 300);
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
          const target = resolveMediaStorageTarget(m.mediaPath as string);
          const { data, error } = await supabase.storage
            .from(target.bucket)
            .createSignedUrl(target.path, 900);
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
      Alert.alert(t('common.errors.generic'), t('chat.errors.failedToSend'));
    } finally {
      setSending(false);
    }
  }, [text, sending, otherUserId, user, fetchMessages, t]);

  const onAttach = useCallback(async () => {
    if (uploading || sending) return;
    if (!user || !otherUserId) return;
    try {
      setUploading(true);
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('chat.errors.galleryPermissionTitle'),
          t('chat.errors.galleryPermissionMessage')
        );
        return;
      }

      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.9,
      });
      if (pick.canceled) return;

      const asset = pick.assets?.[0];
      if (!asset?.uri) {
        return;
      }
      const uri: string = asset.uri;
      const name: string = asset.fileName || uri;
      const lower = name.toLowerCase();
      const assetMime = asset.mimeType?.toLowerCase();
      const mime: 'image/jpeg' | 'image/png' | 'image/webp' =
        assetMime === 'image/png' || lower.endsWith('.png')
          ? 'image/png'
          : assetMime === 'image/webp' || lower.endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';
      const ext: 'jpg' | 'jpeg' | 'png' | 'webp' =
        mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpeg';

      const { path, signedUrl } = await chatAPI.getMediaUploadUrl({ ext });

      // Загружаем файл на подписанный URL
      await FileSystem.uploadAsync(signedUrl, uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': mime, 'x-upsert': 'true' },
      });

      // Сразу создадим подписанный URL для чтения и положим его в кэш и оптимистичное сообщение
      let localSignedUrl: string | null = null;
      try {
        const target = resolveMediaStorageTarget(path);
        const { data, error } = await supabase.storage
          .from(target.bucket)
          .createSignedUrl(target.path, 900);
        if (!error && data?.signedUrl) {
          localSignedUrl = data.signedUrl;
          mediaUrlCacheRef.current[path] = data.signedUrl;
        }
      } catch (signedUrlError) {
        logger.warn(
          'Не удалось создать signed URL для вложения',
          signedUrlError
        );
      }

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
      Alert.alert(
        t('common.errors.generic'),
        t('chat.errors.failedToSendFile')
      );
    } finally {
      setUploading(false);
    }
  }, [uploading, sending, user, otherUserId, fetchMessages, t]);

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
        Alert.alert(
          t('common.errors.generic'),
          t('chat.errors.failedToDelete')
        );
      }
    },
    [removeMessageLocal, t]
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
        Alert.alert(
          t('common.errors.generic'),
          t('chat.errors.failedToDeleteForAll')
        );
      }
    },
    [removeMessageLocal, t]
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
        text: t('chat.deleteMessage.deleteForMe'),
        onPress: () => handleDeleteForMe(m),
        style: 'default',
      });

      if (isMine && !m.id.startsWith('local-')) {
        buttons.push({
          text: t('chat.deleteMessage.deleteForAll'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('chat.deleteMessage.confirmTitle'),
              t('chat.deleteMessage.confirmMessage'),
              [
                { text: t('common.buttons.cancel'), style: 'cancel' },
                {
                  text: t('chat.deleteMessage.delete'),
                  style: 'destructive',
                  onPress: () => handleDeleteForAll(m),
                },
              ]
            );
          },
        });
      }

      buttons.push({ text: t('common.buttons.cancel'), style: 'cancel' });

      Alert.alert(
        t('chat.deleteMessage.title'),
        t('chat.deleteMessage.subtitle'),
        buttons
      );
    },
    [user, handleDeleteForMe, handleDeleteForAll, t]
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
                  <Text style={styles.msgText}>{t('chat.media.label')}</Text>
                </View>
              )
            ) : (
              <Text style={styles.msgText}>—</Text>
            )}
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleTimeString(
                i18n.language === 'ru'
                  ? 'ru-RU'
                  : i18n.language === 'es'
                    ? 'es-ES'
                    : 'en-US',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
            </Text>
          </Pressable>
        </View>
      );
    },
    [user, onLongPressMessage, t, i18n.language]
  );

  const resolvedPhotoUrl =
    primaryPhotoUrl ?? otherProfile?.primaryPhotoUrl ?? undefined;
  const isOtherOnline = (() => {
    if (!otherProfile?.lastActive) return false;
    const value = new Date(otherProfile.lastActive).getTime();
    return Number.isFinite(value) && Date.now() - value < 5 * 60 * 1000;
  })();
  const zodiacLabel = otherProfile?.zodiacSign
    ? t(`common.zodiacSigns.${otherProfile.zodiacSign.toLowerCase()}`, {
        defaultValue: otherProfile.zodiacSign,
      })
    : null;

  if (!otherUserId) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.error}>{t('chat.errors.noInterlocutor')}</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>
              {t('common.buttons.back')}
            </Text>
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
          <Text style={styles.loadingText}>
            {t('chat.loading.authorization')}
          </Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={48} color="#EF4444" />
          <Text style={styles.error}>{t('chat.errors.authRequired')}</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>
              {t('common.buttons.back')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#171338', '#080E1C', '#080E1C']}
        locations={[0, 0.36, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: headerTopPadding,
              minHeight: headerTopPadding + 64,
            },
          ]}
        >
          <Pressable style={styles.backHit} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={30} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.headerCenter}
            onPress={openOtherProfile}
            hitSlop={10}
          >
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{displayName || otherUserId}</Text>
              <Text style={styles.headerSubtitle}>
                {zodiacLabel ?? ''}
                {zodiacLabel ? ' · ' : ''}
                <Text style={isOtherOnline ? styles.online : styles.offline}>
                  {isOtherOnline
                    ? t('chat.header.online')
                    : t('chat.header.offline')}
                </Text>
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.avatarShell} onPress={openOtherProfile}>
            {resolvedPhotoUrl ? (
              <Image source={{ uri: resolvedPhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(displayName || otherUserId).slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(23,19,56,0.98)',
              'rgba(23,19,56,0.68)',
              'rgba(23,19,56,0)',
            ]}
            style={styles.headerFade}
          />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#8B5CF6" size="large" />
            <Text style={styles.loadingText}>{t('chat.loading.messages')}</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color="rgba(255,255,255,0.3)"
            />
            <Text style={styles.emptyText}>{t('chat.empty.noMessages')}</Text>
            <Text style={styles.emptyHint}>{t('chat.empty.startDialog')}</Text>
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
            contentContainerStyle={[
              styles.messagesList,
              { paddingTop: headerHeight + 24 },
            ]}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: inputBottomPadding,
            },
          ]}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('chat.input.placeholder')}
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
              style={styles.attachBtn}
              disabled={uploading || sending}
              onPress={onAttach}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#9290A1" />
              ) : (
                <Ionicons name="happy-outline" size={23} color="#9290A1" />
              )}
            </Pressable>
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
    backgroundColor: '#080E1C',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backHit: {
    width: 45,
    height: 45,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(124,124,157,0.42)',
    backgroundColor: 'rgba(45,45,78,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    minWidth: 137,
    maxWidth: 210,
    minHeight: 45,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52,51,86,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(129,126,163,0.48)',
  },
  avatarShell: {
    width: 47,
    height: 47,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#6D278F',
    padding: 2,
    backgroundColor: 'rgba(76,52,108,0.9)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  avatarPlaceholder: {
    flex: 1,
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
    maxWidth: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 20,
  },
  headerSubtitle: { color: '#C5BECE', fontSize: 11, lineHeight: 14 },
  online: { color: '#14D1AA' },
  offline: { color: '#8E899B' },
  headerFade: {
    position: 'absolute',
    top: 63,
    left: 0,
    right: 0,
    height: 46,
    zIndex: -1,
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
    paddingTop: 120,
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
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  msgRow: {
    marginBottom: 22,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(160,155,185,0.72)',
  },
  bubbleMine: {
    backgroundColor: 'rgba(100,85,123,0.76)',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: 'rgba(26,29,51,0.88)',
    borderBottomLeftRadius: 2,
  },
  msgText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
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
    marginTop: 4,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: 'rgba(8,14,28,0.98)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,24,54,0.96)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(100,94,134,0.6)',
    paddingLeft: 19,
    paddingRight: 9,
    paddingVertical: 7,
    minHeight: 64,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 4,
    paddingTop: 8,
    paddingBottom: 8,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },
  sendBtn: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#4C1774',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sendDisabled: {
    backgroundColor: 'rgba(76,23,116,0.55)',
    shadowOpacity: 0,
  },
});
