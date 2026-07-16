import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Dimensions,
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
  type KeyboardEvent,
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
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { logger } from '../services/logger';
import advisorBackground from '../../assets/advisor-bg.png';
import LoadingIndicator from '../components/shared/LoadingIndicator';
import {
  DATING_GLASS_BORDER_COLORS,
  DATING_GLASS_BORDER_GRADIENT,
  DatingGlassFill,
  GradientBorderView,
} from '../components/shared';

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string | null;
  mediaPath: string | null;
  createdAt: string;
  mediaUrl?: string | null;
  deliveryStatus?: 'pending' | 'failed';
  readAt?: string | null;
};

type MessageVisualStatus = 'pending' | 'failed' | 'sent' | 'read' | 'received';

const MESSAGE_STATUS_ICON: Record<
  MessageVisualStatus,
  { name: keyof typeof Ionicons.glyphMap; color: string }
> = {
  pending: { name: 'time-outline', color: 'rgba(255,255,255,0.72)' },
  failed: { name: 'alert-circle-outline', color: '#FF8C9A' },
  sent: { name: 'checkmark', color: 'rgba(255,255,255,0.72)' },
  read: { name: 'checkmark-done', color: '#B98AE0' },
  received: {
    name: 'checkmark-circle-outline',
    color: 'rgba(255,255,255,0.72)',
  },
};

const USER_PHOTOS_BUCKET = 'user-photos';
const CHAT_MEDIA_BUCKET = 'chat-media';
const CHAT_MEDIA_PREFIX = `${CHAT_MEDIA_BUCKET}:`;
const CHAT_EMOJIS = [
  '😀',
  '😂',
  '🥰',
  '😍',
  '😊',
  '😉',
  '😌',
  '😘',
  '🤗',
  '🤔',
  '😅',
  '🥹',
  '😇',
  '🙈',
  '🔥',
  '✨',
  '❤️',
  '💜',
  '👍',
  '🙏',
] as const;

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

function MessageMetadata({
  time,
  status,
  overlay = false,
}: {
  time: string;
  status: MessageVisualStatus;
  overlay?: boolean;
}) {
  const icon = MESSAGE_STATUS_ICON[status];

  return (
    <View style={[styles.messageMetadata, overlay && styles.mediaMetadata]}>
      <Text numberOfLines={1} style={styles.time}>
        {time}
      </Text>
      <View style={styles.messageStatusSlot}>
        <Animated.View
          key={status}
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(140)}
          style={styles.messageStatusIcon}
        >
          <Ionicons name={icon.name} size={13} color={icon.color} />
        </Animated.View>
      </View>
    </View>
  );
}

export default function ChatDialogScreen() {
  const backgroundOpacity = useSharedValue(0.9);
  const keyboardInset = useSharedValue(0);

  useEffect(() => {
    backgroundOpacity.value = withTiming(0.45, {
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [backgroundOpacity]);

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));
  const animatedComposerStyle = useAnimatedStyle(() => ({
    bottom: keyboardInset.value,
  }));
  const { t, i18n } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const headerTopPadding = (insets?.top || 0) + 10;
  const headerHeight = headerTopPadding + 48;
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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [composerSelection, setComposerSelection] = useState({
    start: 0,
    end: 0,
  });
  const [multilineComposer, setMultilineComposer] = useState(false);
  const [composerHeight, setComposerHeight] = useState(44);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardContentInset, setKeyboardContentInset] = useState(0);
  const [otherProfile, setOtherProfile] = useState<{
    zodiacSign: string | null;
    lastActive: string | null;
    primaryPhotoUrl: string | null;
  } | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const authAlertShown = useRef(false);
  const initialScrollPendingRef = useRef(true);
  const keepAtBottomPendingRef = useRef(false);
  const pendingScrollDeltaRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const scrollOffsetRef = useRef(0);
  const composerBottomPadding = keyboardVisible ? 8 : inputBottomPadding;
  const keyboardOverlayInset = Platform.OS === 'ios' ? keyboardContentInset : 0;
  const messagesFooterHeight =
    keyboardOverlayInset + composerBottomPadding + 8 + composerHeight + 16;
  const previousFooterHeightRef = useRef(messagesFooterHeight);
  const previousKeyboardInsetRef = useRef(keyboardContentInset);

  const scrollToLatestMessage = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    });
  }, []);

  const settleAtLatestMessage = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
    });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
  }, []);

  useEffect(() => {
    initialScrollPendingRef.current = true;
    isNearBottomRef.current = true;
    scrollOffsetRef.current = 0;
  }, [otherUserId]);

  useEffect(() => {
    if (loading || messages.length === 0 || !initialScrollPendingRef.current) {
      return;
    }
    settleAtLatestMessage();
  }, [loading, messages.length, settleAtLatestMessage]);

  const queueViewportAdjustment = useCallback((delta: number) => {
    if (!delta || initialScrollPendingRef.current) return;
    if (isNearBottomRef.current) {
      keepAtBottomPendingRef.current = true;
    } else {
      pendingScrollDeltaRef.current += delta;
    }
  }, []);

  useEffect(() => {
    const previousHeight = previousFooterHeightRef.current;
    previousFooterHeightRef.current = messagesFooterHeight;
    queueViewportAdjustment(messagesFooterHeight - previousHeight);
  }, [messagesFooterHeight, queueViewportAdjustment]);

  useEffect(() => {
    const previousInset = previousKeyboardInsetRef.current;
    previousKeyboardInsetRef.current = keyboardContentInset;
    if (Platform.OS === 'android') {
      queueViewportAdjustment(keyboardContentInset - previousInset);
    }
  }, [keyboardContentInset, queueViewportAdjustment]);

  const handleMessagesLayoutReady = useCallback(() => {
    if (
      !initialScrollPendingRef.current &&
      !keepAtBottomPendingRef.current &&
      pendingScrollDeltaRef.current === 0
    ) {
      return;
    }

    if (initialScrollPendingRef.current || keepAtBottomPendingRef.current) {
      settleAtLatestMessage();
    } else if (pendingScrollDeltaRef.current !== 0) {
      const nextOffset = Math.max(
        0,
        scrollOffsetRef.current + pendingScrollDeltaRef.current
      );
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: nextOffset,
          animated: false,
        });
      });
      scrollOffsetRef.current = nextOffset;
    }
    initialScrollPendingRef.current = false;
    keepAtBottomPendingRef.current = false;
    pendingScrollDeltaRef.current = 0;
  }, [settleAtLatestMessage]);

  const handleMessagesScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      scrollOffsetRef.current = contentOffset.y;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      isNearBottomRef.current = distanceFromBottom <= 80;
    },
    []
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      const start = Math.min(composerSelection.start, text.length);
      const end = Math.min(Math.max(composerSelection.end, start), text.length);
      if (text.length - (end - start) + emoji.length > 1000) return;

      const nextText = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
      const nextCursor = start + emoji.length;
      const nextSelection = { start: nextCursor, end: nextCursor };

      setText(nextText);
      setComposerSelection(nextSelection);
      setEmojiPickerOpen(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setNativeProps({ selection: nextSelection });
      });
    },
    [composerSelection.end, composerSelection.start, text]
  );

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
          readAt: it.readAt ?? null,
        };
      });

      // Обновляем кэш известными URL
      for (const m of mapped) {
        if (m.mediaPath && m.mediaUrl) {
          mediaUrlCacheRef.current[m.mediaPath] = m.mediaUrl;
        }
      }

      setMessages((current) => {
        const localMessages = current.filter(
          (message) =>
            message.deliveryStatus &&
            !mapped.some((serverMessage) => serverMessage.id === message.id)
        );
        return [...mapped, ...localMessages].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
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
    const showKeyboard = (event: KeyboardEvent) => {
      setKeyboardVisible(true);
      const inset = Math.max(
        0,
        Dimensions.get('window').height - event.endCoordinates.screenY
      );
      setKeyboardContentInset(inset);
      if (Platform.OS === 'ios') {
        keyboardInset.value = withTiming(inset, {
          duration: event.duration || 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    };
    const hideKeyboard = (event: KeyboardEvent) => {
      setKeyboardVisible(false);
      setKeyboardContentInset(0);
      keyboardInset.value = withTiming(0, {
        duration: event.duration || 250,
        easing: Easing.out(Easing.cubic),
      });
    };
    const s1 = Keyboard.addListener('keyboardWillShow', showKeyboard);
    const s2 = Keyboard.addListener('keyboardDidShow', showKeyboard);
    const s3 = Keyboard.addListener('keyboardWillHide', hideKeyboard);
    const s4 = Keyboard.addListener('keyboardDidHide', hideKeyboard);
    return () => {
      try {
        s1.remove();
        s2.remove();
        s3.remove();
        s4.remove();
      } catch (removeError) {
        logger.warn('Не удалось удалить keyboard listeners', removeError);
      }
    };
  }, [keyboardInset]);

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
                  readAt: recNew.read_at ?? null,
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
                  readAt:
                    recNew.read_at !== undefined
                      ? recNew.read_at
                      : copy[idx].readAt,
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
                    readAt: recNew.read_at ?? null,
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
    const localId = `local-text-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        senderId: user.id,
        recipientId: otherUserId,
        text: payload,
        mediaPath: null,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'pending',
      },
    ]);
    setText('');
    setComposerSelection({ start: 0, end: 0 });
    requestAnimationFrame(() => inputRef.current?.focus());
    scrollToLatestMessage();
    try {
      setSending(true);
      const response = await chatAPI.sendMessage(otherUserId, payload, null);
      setMessages((prev) => {
        const alreadyReceived = prev.some(
          (message) => message.id === response.id
        );
        if (alreadyReceived) {
          return prev.filter((message) => message.id !== localId);
        }
        return prev.map((message) =>
          message.id === localId
            ? { ...message, id: response.id, deliveryStatus: undefined }
            : message
        );
      });
      scrollToLatestMessage();
      setTimeout(() => {
        fetchMessages().catch(() => void 0);
      }, 500);
    } catch (error) {
      logger.error('Ошибка отправки сообщения', error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === localId
            ? { ...message, deliveryStatus: 'failed' }
            : message
        )
      );
    } finally {
      setSending(false);
    }
  }, [text, sending, user, otherUserId, scrollToLatestMessage, fetchMessages]);

  const onAttach = useCallback(async () => {
    if (uploading || sending) return;
    if (!user || !otherUserId) return;
    let localId: string | null = null;
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
      localId = `local-media-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: localId as string,
          senderId: user.id,
          recipientId: otherUserId,
          text: null,
          mediaPath: null,
          createdAt: new Date().toISOString(),
          mediaUrl: uri,
          deliveryStatus: 'pending',
        },
      ]);
      scrollToLatestMessage();
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

      const pendingId = localId;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                mediaPath: path,
                mediaUrl: localSignedUrl ?? message.mediaUrl,
              }
            : message
        )
      );

      const response = await chatAPI.sendMessage(otherUserId, undefined, path);
      setMessages((prev) => {
        const alreadyReceived = prev.some(
          (message) => message.id === response.id
        );
        if (alreadyReceived) {
          return prev.filter((message) => message.id !== pendingId);
        }
        return prev.map((message) =>
          message.id === pendingId
            ? { ...message, id: response.id, deliveryStatus: undefined }
            : message
        );
      });
      scrollToLatestMessage();
      setTimeout(() => {
        fetchMessages().catch(() => void 0);
      }, 400);
    } catch (err) {
      logger.error('Ошибка загрузки вложения', err);
      if (localId) {
        const failedId = localId;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === failedId
              ? { ...message, deliveryStatus: 'failed' }
              : message
          )
        );
      }
    } finally {
      setUploading(false);
    }
  }, [
    uploading,
    sending,
    user,
    otherUserId,
    scrollToLatestMessage,
    fetchMessages,
    t,
  ]);

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
      const hasImage = Boolean(item.mediaUrl);
      const visualStatus: MessageVisualStatus = item.deliveryStatus
        ? item.deliveryStatus
        : isMine
          ? item.readAt
            ? 'read'
            : 'sent'
          : 'received';
      const formattedTime = new Date(item.createdAt).toLocaleTimeString(
        i18n.language === 'ru'
          ? 'ru-RU'
          : i18n.language === 'es'
            ? 'es-ES'
            : 'en-US',
        { hour: '2-digit', minute: '2-digit' }
      );
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
              styles.bubbleBase,
              isMine ? styles.bubbleBaseMine : styles.bubbleBaseOther,
            ]}
          >
            <GradientBorderView
              colors={[
                'rgba(255, 255, 255, 0.7)',
                'rgba(255, 255, 255, 0.5)',
                'rgba(255, 255, 255, 0.05)',
              ]}
              gradientProps={{
                locations: [0, 0.5, 1],
                start: { x: 0, y: 0 },
                end: { x: 1, y: 1 },
              }}
              style={[
                styles.bubbleBorder,
                isMine ? styles.bubbleBorderMine : styles.bubbleBorderOther,
              ]}
              contentStyle={[
                styles.bubble,
                isMine ? styles.bubbleMine : styles.bubbleOther,
                hasImage && styles.imageBubble,
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
              <MessageMetadata
                time={formattedTime}
                status={visualStatus}
                overlay={hasImage}
              />
            </GradientBorderView>
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
        <Animated.Image
          source={advisorBackground}
          resizeMode="cover"
          style={[styles.backgroundImage, animatedBackgroundStyle]}
        />
        <View style={styles.loader}>
          <LoadingIndicator size="large" />
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
      <Animated.Image
        source={advisorBackground}
        resizeMode="cover"
        style={[styles.backgroundImage, animatedBackgroundStyle]}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'android' ? 'height' : undefined}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'android'}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(23,19,56,0.78)',
            'rgba(23,19,56,0.4)',
            'rgba(23,19,56,0)',
          ]}
          locations={[0, 0.62, 1]}
          style={[styles.headerFade, { height: headerHeight + 44 }]}
        />
        <View
          style={[
            styles.header,
            {
              paddingTop: headerTopPadding,
              height: headerHeight,
            },
          ]}
        >
          <Pressable
            style={styles.headerCirclePressable}
            onPress={() => navigation.goBack()}
          >
            <GradientBorderView
              colors={DATING_GLASS_BORDER_COLORS}
              gradientProps={DATING_GLASS_BORDER_GRADIENT}
              style={styles.headerCircleBorder}
              contentStyle={[styles.datingGlassContent, styles.backHit]}
            >
              <DatingGlassFill />
              <Ionicons name="chevron-back" size={30} color="#fff" />
            </GradientBorderView>
          </Pressable>
          <Pressable
            style={styles.headerCenterPressable}
            onPress={openOtherProfile}
            hitSlop={10}
          >
            <GradientBorderView
              colors={DATING_GLASS_BORDER_COLORS}
              gradientProps={DATING_GLASS_BORDER_GRADIENT}
              style={styles.headerCenterBorder}
              contentStyle={[styles.datingGlassContent, styles.headerCenter]}
            >
              <DatingGlassFill />
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
            </GradientBorderView>
          </Pressable>
          <Pressable
            style={styles.headerCirclePressable}
            onPress={openOtherProfile}
          >
            <GradientBorderView
              colors={DATING_GLASS_BORDER_COLORS}
              gradientProps={DATING_GLASS_BORDER_GRADIENT}
              style={styles.headerCircleBorder}
              contentStyle={[styles.datingGlassContent, styles.avatarShell]}
            >
              <DatingGlassFill />
              {resolvedPhotoUrl ? (
                <Image
                  source={{ uri: resolvedPhotoUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(displayName || otherUserId).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </GradientBorderView>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <LoadingIndicator size="large" />
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
              {
                paddingTop: headerHeight + 24,
              },
            ]}
            ListFooterComponent={
              <View
                pointerEvents="none"
                style={{ height: messagesFooterHeight }}
              />
            }
            onContentSizeChange={handleMessagesLayoutReady}
            onLayout={handleMessagesLayoutReady}
            onScroll={handleMessagesScroll}
            scrollEventThrottle={16}
          />
        )}

        {emojiPickerOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close emoji picker"
            onPress={() => setEmojiPickerOpen(false)}
            style={styles.emojiBackdrop}
          />
        ) : null}

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.inputContainer,
            animatedComposerStyle,
            {
              paddingBottom: composerBottomPadding,
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(23,19,56,0)',
              'rgba(23,19,56,0.4)',
              'rgba(23,19,56,0.78)',
            ]}
            locations={[0, 0.48, 1]}
            style={styles.composerFade}
          />
          <View
            style={styles.composerRow}
            onLayout={(event) => {
              const nextHeight = Math.ceil(event.nativeEvent.layout.height);
              setComposerHeight((current) => {
                if (current === nextHeight) return current;
                return nextHeight;
              });
            }}
          >
            <Pressable
              style={[
                styles.composerCirclePressable,
                multilineComposer && styles.composerButtonTop,
              ]}
              disabled={uploading || sending}
              onPress={onAttach}
            >
              <GradientBorderView
                colors={DATING_GLASS_BORDER_COLORS}
                gradientProps={DATING_GLASS_BORDER_GRADIENT}
                style={styles.composerCircleBorder}
                contentStyle={[
                  styles.datingGlassContent,
                  styles.attachmentButton,
                ]}
              >
                <DatingGlassFill />
                <Ionicons name="attach-outline" size={29} color="#FFFFFF" />
              </GradientBorderView>
            </Pressable>

            <View style={styles.inputColumn}>
              {emojiPickerOpen ? (
                <GradientBorderView
                  colors={DATING_GLASS_BORDER_COLORS}
                  gradientProps={DATING_GLASS_BORDER_GRADIENT}
                  style={styles.emojiPopoverBorder}
                  contentStyle={[
                    styles.datingGlassContent,
                    styles.emojiPopover,
                  ]}
                >
                  <DatingGlassFill />
                  <View style={styles.emojiGrid}>
                    {CHAT_EMOJIS.map((emoji) => (
                      <Pressable
                        key={emoji}
                        accessibilityRole="button"
                        accessibilityLabel={`Insert ${emoji}`}
                        onPress={() => insertEmoji(emoji)}
                        style={styles.emojiButton}
                      >
                        <Text style={styles.emoji}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                </GradientBorderView>
              ) : null}

              <GradientBorderView
                colors={DATING_GLASS_BORDER_COLORS}
                gradientProps={DATING_GLASS_BORDER_GRADIENT}
                style={styles.inputBorder}
                contentStyle={[styles.datingGlassContent, styles.inputRow]}
              >
                <DatingGlassFill />
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={text}
                  onChangeText={setText}
                  onSelectionChange={(event) =>
                    setComposerSelection(event.nativeEvent.selection)
                  }
                  onContentSizeChange={(event) =>
                    setMultilineComposer(
                      event.nativeEvent.contentSize.height > 44
                    )
                  }
                  placeholder={t('chat.input.placeholder')}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  multiline
                  maxLength={1000}
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
                  style={styles.emojiToggle}
                  disabled={sending}
                  onPress={() => {
                    setEmojiPickerOpen((current) => !current);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  <Ionicons
                    name="happy-outline"
                    size={27}
                    color={emojiPickerOpen ? '#FFFFFF' : '#9290A1'}
                  />
                </Pressable>
              </GradientBorderView>
            </View>

            <Pressable
              style={[
                styles.sendButtonPressable,
                multilineComposer && styles.composerButtonTop,
                (!text.trim() || sending) && styles.sendButtonDisabled,
              ]}
              disabled={!text.trim() || sending}
              onPress={onSend}
            >
              <GradientBorderView
                colors={[
                  'rgba(126,108,160,0.78)',
                  'rgba(96,67,142,0.82)',
                  'rgba(62,32,104,0.9)',
                ]}
                gradientProps={{
                  locations: [0, 0.52, 1],
                  start: { x: 0.2, y: 0 },
                  end: { x: 0.8, y: 1 },
                }}
                style={styles.sendButtonBorder}
                contentStyle={styles.sendBtn}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </GradientBorderView>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
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
  headerCirclePressable: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerCircleBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.1,
  },
  datingGlassContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backHit: {
    width: 45.8,
    height: 45.8,
    borderRadius: 22.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterPressable: {
    minWidth: 137,
    maxWidth: 210,
    height: 48,
    borderRadius: 24,
  },
  headerCenterBorder: {
    minWidth: 137,
    maxWidth: 210,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.1,
  },
  headerCenter: {
    height: 45.8,
    borderRadius: 22.9,
    paddingHorizontal: 18,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarShell: {
    width: 45.8,
    height: 45.8,
    borderRadius: 22.9,
    padding: 2,
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 19,
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
  bubbleBase: {
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  bubbleBaseMine: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 2,
  },
  bubbleBaseOther: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 12,
  },
  bubbleBorder: {
    borderWidth: 1,
    margin: -1,
  },
  bubbleBorderMine: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 2,
  },
  bubbleBorderOther: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 12,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  imageBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    position: 'relative',
  },
  bubbleMine: {
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 11,
  },
  msgText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 20,
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaImage: {
    width: 220,
    height: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  messageMetadata: {
    height: 18,
    marginTop: 4,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  mediaMetadata: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    height: 22,
    marginTop: 0,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: 'rgba(8,14,28,0.68)',
  },
  time: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    lineHeight: 12,
  },
  messageStatusSlot: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  messageStatusIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 31,
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  composerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 123,
    zIndex: 0,
  },
  emojiBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  emojiPopoverBorder: {
    width: 224,
    position: 'absolute',
    right: 0,
    bottom: '100%',
    marginBottom: 10,
    zIndex: 2,
    borderRadius: 22,
    borderWidth: 1.1,
  },
  emojiPopover: {
    padding: 10,
    borderRadius: 20.9,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  emoji: { fontSize: 29, lineHeight: 35 },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  composerCirclePressable: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
  },
  composerCircleBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.1,
  },
  attachmentButton: {
    width: 41.8,
    height: 41.8,
    borderRadius: 20.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputColumn: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  inputBorder: {
    width: '100%',
    borderRadius: 23,
    borderWidth: 1.1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 21.9,
    paddingLeft: 16,
    paddingRight: 11,
    paddingVertical: 2,
    minHeight: 44,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    lineHeight: 19,
    maxHeight: 100,
    marginRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  emojiToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerButtonTop: {
    alignSelf: 'flex-end',
    marginBottom: 0,
  },
  sendButtonPressable: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignSelf: 'center',
    flexShrink: 0,
  },
  sendButtonBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.4,
  },
  sendBtn: {
    width: 41.2,
    height: 41.2,
    borderRadius: 20.6,
    backgroundColor: '#35185C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
});
