import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { chatAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useOptionalBottomTabBarHeight } from '../hooks/useOptionalBottomTabBarHeight';
import { acquirePresence, subscribePresence } from '../services/presence';
import { supabase } from '../services/supabase';
import { logger } from '../services/logger';
import { BottomTabFade } from '../components/shared/BottomTabFade';
import LoadingIndicator from '../components/shared/LoadingIndicator';
import type { RootStackParamList } from '../types/navigation';
import advisorBackground from '../../assets/advisor-bg.png';

type ConversationItem = Awaited<
  ReturnType<typeof chatAPI.listConversations>
>[number];

type Props = {
  embedded?: boolean;
  topInset?: number;
};

export default function ChatListScreen({ embedded = false, topInset }: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomTabHeight = useOptionalBottomTabBarHeight();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const load = useCallback(
    async (refresh = false) => {
      if (!user || authLoading) return;
      refresh ? setRefreshing(true) : setLoading(true);
      try {
        setItems(await chatAPI.listConversations(50));
      } catch (error) {
        logger.error('[Messages] Failed to load conversations', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authLoading, user]
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void load();
      const release = acquirePresence(user.id);
      return release;
    }, [load, user?.id])
  );

  useEffect(() => subscribePresence(setOnlineIds), []);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`dating-conversations-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => void load(true)
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, user?.id]);

  const openConversation = useCallback(
    (item: ConversationItem) => {
      navigation.navigate('ChatDialog', {
        otherUserId: item.otherUserId,
        displayName: item.displayName,
        primaryPhotoUrl: item.primaryPhotoUrl,
      });
    },
    [navigation]
  );

  const deleteConversation = useCallback(
    (item: ConversationItem) => {
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
                await chatAPI.deleteConversation(item.otherUserId);
                setItems((current) =>
                  current.filter((row) => row.otherUserId !== item.otherUserId)
                );
              } catch (error) {
                logger.error('[Messages] Failed to delete conversation', error);
              }
            },
          },
        ]
      );
    },
    [t]
  );

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const renderItem = ({ item }: { item: ConversationItem }) => {
    const name = item.displayName?.trim() || t('dating.defaults.userName');
    const preview = item.lastMessageText?.trim()
      ? item.lastMessageText
      : item.lastMessageMediaPath
        ? t('chatList.media')
        : '';
    const mine = item.lastSenderId === user?.id;
    const unread = Math.max(0, item.unreadCount ?? 0);

    return (
      <Pressable
        onPress={() => openConversation(item)}
        onLongPress={() => deleteConversation(item)}
        style={styles.conversation}
      >
        <View>
          {item.primaryPhotoUrl ? (
            <Image
              source={{ uri: item.primaryPhotoUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          {onlineIds.has(item.otherUserId) ? (
            <View style={styles.onlineDot} />
          ) : null}
        </View>

        <View style={styles.conversationBody}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text numberOfLines={1} style={styles.preview}>
            {mine && preview
              ? `${t('chatList.you', { defaultValue: 'you' })}: `
              : ''}
            {preview}
          </Text>
        </View>

        <View style={styles.trailing}>
          <Text numberOfLines={1} ellipsizeMode="clip" style={styles.time}>
            {formatTime(item.lastMessageAt)}
          </Text>
          {unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unread > 99 ? '99+' : unread}
              </Text>
            </View>
          ) : mine ? (
            <Ionicons name="checkmark-done" size={17} color="#A93BE2" />
          ) : null}
        </View>
      </Pressable>
    );
  };

  const resolvedTopInset = topInset ?? insets.top + (embedded ? 12 : 44);

  if (authLoading || (loading && items.length === 0)) {
    return (
      <View style={styles.screen}>
        <LoadingIndicator style={styles.loader} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {!embedded ? (
        <Image
          source={advisorBackground}
          resizeMode="cover"
          style={styles.backgroundImage}
        />
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.otherUserId}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: resolvedTopInset,
            paddingBottom: bottomTabHeight + 42,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#A93BE2"
          />
        }
        ListHeaderComponent={
          embedded ? null : (
            <Text style={styles.standaloneTitle}>{t('chatList.title')}</Text>
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color="#77728A" />
            <Text style={styles.emptyTitle}>{t('chatList.empty.title')}</Text>
            <Text style={styles.emptyHint}>{t('chatList.empty.hint')}</Text>
          </View>
        }
      />
      <BottomTabFade />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  loader: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  standaloneTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 24,
  },
  conversation: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2D2942',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#49425E',
  },
  avatarInitial: { color: '#FFFFFF', fontSize: 17, fontWeight: '500' },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#18C99A',
    borderWidth: 2,
    borderColor: '#151231',
  },
  conversationBody: { flex: 1, minWidth: 0 },
  name: { color: '#F1F0F3', fontSize: 17, lineHeight: 21, fontWeight: '500' },
  preview: { color: '#8E899B', fontSize: 15, lineHeight: 19, marginTop: 1 },
  trailing: {
    width: 66,
    flexShrink: 0,
    minHeight: 48,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  time: {
    width: '100%',
    color: '#9690A1',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'right',
  },
  unreadBadge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#A93BE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  empty: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyHint: {
    color: '#8E899B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
});
