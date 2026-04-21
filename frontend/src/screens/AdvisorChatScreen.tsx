import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { advisorAPI } from '../services/api';
import {
  ADVISOR_HISTORY_LIMIT,
  hideAdvisorHistoryHint,
  readAdvisorHistory,
  shouldShowAdvisorHistoryHint,
  writeAdvisorHistory,
} from '../services/advisor-history';
import type {
  AdvisorEvaluateResponse,
  AdvisorTopic,
} from '../services/api/advisor.api';
import AdvisorAspectsWidget from '../components/advisor/AdvisorAspectsWidget';
import AdvisorRecommendationsWidget from '../components/advisor/AdvisorRecommendationsWidget';
import AdvisorResultWidget from '../components/advisor/AdvisorResultWidget';
import BestWindowsWidget from '../components/advisor/BestWindowsWidget';
import DateWheelPicker from '../components/shared/DateWheelPicker';
import { GradientBorderView } from '../components/shared';
import { logger } from '../services/logger';
import {
  buildAdvisorEvaluatePayload,
  chooseAdvisorQuickDate,
  confirmAdvisorCustomDate,
  createInitialAdvisorChatState,
  createNextAdvisorChatState,
  deriveAdvisorSessionRevealState,
  openAdvisorCustomDate,
  pruneAdvisorChatState,
  selectAdvisorTopic,
  setAdvisorError,
  setAdvisorResult,
  submitAdvisorPrompt,
  updateAdvisorCustomDate,
  updateAdvisorPromptDraft,
  type AdvisorSession,
  type AdvisorSessionRevealState,
  type QuickDateKey,
} from './advisorChatState';

type TopicOption = {
  key: AdvisorTopic;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  borderGradient: readonly [string, string];
  borderHighlight: string;
  borderBase: string;
  accent: string;
  background: string;
  bubbleBackground: string;
  description: string;
};

const TOPIC_CONFIG: Array<{
  key: AdvisorTopic;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  borderGradient: readonly [string, string];
  borderHighlight: string;
  borderBase: string;
  accent: string;
  background: string;
  bubbleBackground: string;
}> = [
  {
    key: 'contract',
    icon: 'document',
    gradient: ['#5EEAD4', '#0EA5E9'],
    borderGradient: ['rgba(23, 175, 224, 0.7)', 'rgba(23, 175, 224, 0.05)'],
    borderHighlight: 'rgba(23, 175, 224, 0.5)',
    borderBase: 'rgba(23, 175, 224, 0.05)',
    accent: 'rgba(23, 175, 224, 0.7)',
    background: 'rgba(23, 175, 224, 0.05)',
    bubbleBackground: 'rgba(23, 175, 224, 0.1)',
  },
  {
    key: 'meeting',
    icon: 'people',
    gradient: ['#FB7185', '#F97316'],
    borderGradient: ['rgba(250, 114, 38, 0.7)', 'rgba(250, 114, 38, 0.05)'],
    borderHighlight: 'rgba(250, 114, 38, 0.5)',
    borderBase: 'rgba(250, 114, 38, 0.05)',
    accent: 'rgba(250, 114, 38, 0.7)',
    background: 'rgba(250, 114, 38, 0.1)',
    bubbleBackground: 'rgba(250, 114, 38, 0.1)',
  },
  {
    key: 'negotiation',
    icon: 'chatbubble',
    gradient: ['#F59E0B', '#EAB308'],
    borderGradient: ['rgba(250, 153, 21, 0.7)', 'rgba(250, 153, 21, 0.05)'],
    borderHighlight: 'rgba(250, 153, 21, 0.5)',
    borderBase: 'rgba(250, 153, 21, 0.05)',
    accent: 'rgba(250, 153, 21, 0.7)',
    background: 'rgba(250, 153, 21, 0.1)',
    bubbleBackground: 'rgba(250, 153, 21, 0.1)',
  },
  {
    key: 'date',
    icon: 'heart',
    gradient: ['#F472B6', '#EC4899'],
    borderGradient: ['rgba(239, 76, 157, 0.7)', 'rgba(239, 76, 157, 0.05)'],
    borderHighlight: 'rgba(239, 76, 157, 0.5)',
    borderBase: 'rgba(239, 76, 157, 0.05)',
    accent: 'rgba(239, 76, 157, 0.7)',
    background: 'rgba(239, 76, 157, 0.1)',
    bubbleBackground: 'rgba(239, 76, 157, 0.1)',
  },
  {
    key: 'travel',
    icon: 'airplane',
    gradient: ['#38BDF8', '#6366F1'],
    borderGradient: ['rgba(90, 113, 241, 0.7)', 'rgba(90, 113, 241, 0.05)'],
    borderHighlight: 'rgba(90, 113, 241, 0.5)',
    borderBase: 'rgba(90, 113, 241, 0.05)',
    accent: 'rgba(90, 113, 241, 0.7)',
    background: 'rgba(90, 113, 241, 0.05)',
    bubbleBackground: 'rgba(90, 113, 241, 0.1)',
  },
  {
    key: 'purchase',
    icon: 'cart',
    gradient: ['#34D399', '#10B981'],
    borderGradient: ['rgba(30, 183, 129, 0.7)', 'rgba(30, 183, 129, 0.05)'],
    borderHighlight: 'rgba(30, 183, 129, 0.5)',
    borderBase: 'rgba(30, 183, 129, 0.05)',
    accent: 'rgba(30, 183, 129, 0.7)',
    background: 'rgba(30, 183, 129, 0.05)',
    bubbleBackground: 'rgba(30, 183, 129, 0.1)',
  },
  {
    key: 'health',
    icon: 'medkit',
    gradient: ['#FB7185', '#EF4444'],
    borderGradient: ['rgba(248, 74, 73, 0.7)', 'rgba(248, 74, 73, 0.05)'],
    borderHighlight: 'rgba(248, 74, 73, 0.5)',
    borderBase: 'rgba(248, 74, 73, 0.05)',
    accent: 'rgba(248, 74, 73, 0.7)',
    background: 'rgba(248, 74, 73, 0.1)',
    bubbleBackground: 'rgba(248, 74, 73, 0.1)',
  },
  {
    key: 'custom',
    icon: 'sparkles',
    gradient: ['#A78BFA', '#6366F1'],
    borderGradient: ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.05)'],
    borderHighlight: 'rgba(255, 255, 255, 0.5)',
    borderBase: 'rgba(255, 255, 255, 0.05)',
    accent: 'rgba(255, 255, 255, 0.7)',
    background: 'rgba(255, 255, 255, 0.05)',
    bubbleBackground: 'rgba(255, 255, 255, 0.1)',
  },
];

const advisorBackground = require('../../assets/advisor-bg.png');

const LOCALE_BY_LANGUAGE: Record<string, string> = {
  ru: 'ru-RU',
  es: 'es-ES',
  en: 'en-US',
};

const WHEEL_LOCALE_BY_LANGUAGE: Record<string, 'ru' | 'en'> = {
  ru: 'ru',
  es: 'en',
  en: 'en',
};

const DEFAULT_REVEAL_STATE: AdvisorSessionRevealState = {
  topicAck: false,
  datePrompt: false,
  dateChoices: false,
  dateAck: false,
  promptRequest: false,
  promptInput: false,
};

const AdvisorScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const advisorHeaderDescription = React.useMemo(() => {
    const locale = String(i18n.language || 'en').toLowerCase();

    if (locale.startsWith('ru')) {
      return 'Астросовет на день';
    }

    if (locale.startsWith('es')) {
      return 'Consejo del dia';
    }

    return 'Advice for the day';
  }, [i18n.language]);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: screenHeight } = useWindowDimensions();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const premium = useMemo(() => isPremium(), [isPremium]);
  const scrollRef = useRef<ScrollView>(null);
  const revealTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>[]>
  >({});
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [{ sessions, activeSessionId }, setChatState] = useState(() =>
    createInitialAdvisorChatState()
  );
  const [reveals, setReveals] = useState<
    Record<string, AdvisorSessionRevealState>
  >({});
  const historyHydratedRef = useRef(false);
  const [showHistoryNotice, setShowHistoryNotice] = useState(false);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.9);
  const backgroundOpacityRef = useRef(0.9);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const localeTag = LOCALE_BY_LANGUAGE[i18n.language] || 'en-US';
  const wheelLocale = WHEEL_LOCALE_BY_LANGUAGE[i18n.language] || 'en';

  const topics: TopicOption[] = useMemo(
    () =>
      TOPIC_CONFIG.map((config) => ({
        ...config,
        label: t(`advisor.topics.${config.key}.label`),
        description: t(`advisor.topics.${config.key}.description`),
      })),
    [t]
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions]
  );

  const displayName = useMemo(() => {
    const name = user?.name?.trim();
    return name ? name.split(/\s+/)[0] : 'there';
  }, [user?.name]);

  const transcriptSignature = useMemo(
    () =>
      sessions
        .map((session) =>
          [
            session.id,
            session.status,
            session.collapsed,
            session.topic || '',
            session.date || '',
            session.prompt || '',
            session.customDateOpen,
            Boolean(session.result),
            session.errorMessage || '',
          ].join('|')
        )
        .join('||'),
    [sessions]
  );

  const revealSignature = useMemo(
    () =>
      Object.entries(reveals)
        .map(
          ([sessionId, reveal]) =>
            `${sessionId}:${Number(reveal.topicAck)}${Number(
              reveal.datePrompt
            )}${Number(reveal.dateChoices)}${Number(reveal.dateAck)}${Number(
              reveal.promptRequest
            )}${Number(reveal.promptInput)}`
        )
        .join('|'),
    [reveals]
  );

  const scrollToBottom = useCallback((animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = Math.max(0, event.nativeEvent.contentOffset.y);
      const fadeDistance = Math.max(1, screenHeight / 3);
      const progress = Math.min(1, scrollY / fadeDistance);
      const nextOpacity = Math.max(0.3, 0.9 - progress * 0.6);

      if (Math.abs(backgroundOpacityRef.current - nextOpacity) < 0.015) {
        return;
      }

      backgroundOpacityRef.current = nextOpacity;
      setBackgroundOpacity(nextOpacity);
    },
    [screenHeight]
  );

  useEffect(() => {
    if (activeSession && !activeSession.topic && sessions.length === 1) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      scrollToBottom(true);
    }, 80);

    return () => clearTimeout(timeout);
  }, [activeSession, scrollToBottom, sessions.length, transcriptSignature]);

  useEffect(() => {
    if (activeSession && !activeSession.topic && sessions.length === 1) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      scrollToBottom(true);
    }, 80);

    return () => clearTimeout(timeout);
  }, [activeSession, revealSignature, scrollToBottom, sessions.length]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(() => scrollToBottom(true), 80);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollToBottom]);

  const updateActiveSession = useCallback(
    (updater: (session: AdvisorSession) => AdvisorSession) => {
      setChatState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((session) =>
          session.id === prev.activeSessionId ? updater(session) : session
        ),
      }));
    },
    []
  );

  const getTopicOption = useCallback(
    (topic?: AdvisorTopic) => topics.find((item) => item.key === topic) ?? null,
    [topics]
  );

  const getSessionReveal = useCallback(
    (sessionId: string): AdvisorSessionRevealState =>
      reveals[sessionId] ?? DEFAULT_REVEAL_STATE,
    [reveals]
  );

  useEffect(() => {
    const userId = user?.id;
    let cancelled = false;

    historyHydratedRef.current = false;

    if (!userId) {
      setChatState(createInitialAdvisorChatState());
      setReveals({});
      setShowHistoryNotice(false);
      historyHydratedRef.current = true;
      return undefined;
    }

    void (async () => {
      const [storedState, shouldShowHint] = await Promise.all([
        readAdvisorHistory(userId),
        shouldShowAdvisorHistoryHint(userId),
      ]);

      if (cancelled) return;

      const prunedState = pruneAdvisorChatState(
        storedState,
        ADVISOR_HISTORY_LIMIT
      );

      setChatState(prunedState);
      setReveals(
        Object.fromEntries(
          prunedState.sessions.map((session) => [
            session.id,
            deriveAdvisorSessionRevealState(session),
          ])
        )
      );
      setShowHistoryNotice(shouldShowHint);
      historyHydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!historyHydratedRef.current || !user?.id) return;

    const state = pruneAdvisorChatState(
      { sessions, activeSessionId },
      ADVISOR_HISTORY_LIMIT
    );

    if (
      state.sessions.length !== sessions.length ||
      state.activeSessionId !== activeSessionId
    ) {
      setChatState(state);
      return;
    }

    void writeAdvisorHistory(user.id, state);
  }, [activeSessionId, sessions, user?.id]);

  const dismissHistoryNotice = useCallback(() => {
    const userId = user?.id;
    setShowHistoryNotice(false);
    if (!userId) return;
    void hideAdvisorHistoryHint(userId);
  }, [user?.id]);

  const formatDisplayDate = useCallback(
    (value?: string) => {
      if (!value) return '';
      const date = new Date(`${value}T12:00:00`);
      return date.toLocaleDateString(localeTag, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    },
    [localeTag]
  );

  const handleTopicSelect = useCallback(
    (topic: AdvisorTopic) => {
      if (!activeSession) return;

      const sessionId = activeSession.id;

      const currentTimeouts = revealTimeoutsRef.current[sessionId];
      if (currentTimeouts) {
        currentTimeouts.forEach(clearTimeout);
      }

      setReveals((prev) => ({
        ...prev,
        [sessionId]: DEFAULT_REVEAL_STATE,
      }));

      updateActiveSession((session) => selectAdvisorTopic(session, topic));

      revealTimeoutsRef.current[sessionId] = [
        setTimeout(() => {
          setReveals((prev) => ({
            ...prev,
            [sessionId]: {
              ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
              topicAck: true,
            },
          }));
        }, 220),
        setTimeout(() => {
          setReveals((prev) => ({
            ...prev,
            [sessionId]: {
              ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
              topicAck: true,
              datePrompt: true,
            },
          }));
        }, 620),
        setTimeout(() => {
          setReveals((prev) => ({
            ...prev,
            [sessionId]: {
              ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
              topicAck: true,
              datePrompt: true,
              dateChoices: true,
            },
          }));
        }, 980),
      ];
    },
    [activeSession, updateActiveSession]
  );

  const handleQuickDateSelect = useCallback(
    (quickDate: QuickDateKey) => {
      if (!activeSession) return;

      const sessionId = activeSession.id;
      const currentTimeouts = revealTimeoutsRef.current[sessionId];
      if (currentTimeouts) {
        currentTimeouts.forEach(clearTimeout);
      }

      updateActiveSession((session) =>
        chooseAdvisorQuickDate(session, quickDate)
      );

      setReveals((prev) => ({
        ...prev,
        [sessionId]: {
          ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
          topicAck: true,
          datePrompt: true,
          dateChoices: false,
          dateAck: false,
          promptRequest: false,
          promptInput: false,
        },
      }));

      revealTimeoutsRef.current[sessionId] = [
        setTimeout(() => {
          setReveals((prev) => ({
            ...prev,
            [sessionId]: {
              ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
              dateAck: true,
            },
          }));
        }, 220),
        setTimeout(() => {
          setReveals((prev) => ({
            ...prev,
            [sessionId]: {
              ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
              dateAck: true,
              promptRequest: true,
            },
          }));
        }, 620),
        setTimeout(() => {
          setReveals((prev) => ({
            ...prev,
            [sessionId]: {
              ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
              dateAck: true,
              promptRequest: true,
              promptInput: true,
            },
          }));
        }, 980),
      ];
    },
    [activeSession, updateActiveSession]
  );

  const handleCustomDateOpen = useCallback(() => {
    updateActiveSession((session) => openAdvisorCustomDate(session));
  }, [updateActiveSession]);

  const handleCustomDateChange = useCallback(
    (value: { day: number; month: number; year: number }) => {
      updateActiveSession((session) => updateAdvisorCustomDate(session, value));
    },
    [updateActiveSession]
  );

  const handleCustomDateConfirm = useCallback(() => {
    if (!activeSession) return;

    const sessionId = activeSession.id;
    const currentTimeouts = revealTimeoutsRef.current[sessionId];
    if (currentTimeouts) {
      currentTimeouts.forEach(clearTimeout);
    }

    updateActiveSession((session) => confirmAdvisorCustomDate(session));

    setReveals((prev) => ({
      ...prev,
      [sessionId]: {
        ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
        topicAck: true,
        datePrompt: true,
        dateChoices: false,
        dateAck: false,
        promptRequest: false,
        promptInput: false,
      },
    }));

    revealTimeoutsRef.current[sessionId] = [
      setTimeout(() => {
        setReveals((prev) => ({
          ...prev,
          [sessionId]: {
            ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
            dateAck: true,
          },
        }));
      }, 220),
      setTimeout(() => {
        setReveals((prev) => ({
          ...prev,
          [sessionId]: {
            ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
            dateAck: true,
            promptRequest: true,
          },
        }));
      }, 620),
      setTimeout(() => {
        setReveals((prev) => ({
          ...prev,
          [sessionId]: {
            ...(prev[sessionId] ?? DEFAULT_REVEAL_STATE),
            dateAck: true,
            promptRequest: true,
            promptInput: true,
          },
        }));
      }, 980),
    ];
  }, [activeSession, updateActiveSession]);

  const handlePromptDraftChange = useCallback(
    (value: string) => {
      updateActiveSession((session) =>
        updateAdvisorPromptDraft(session, value)
      );
    },
    [updateActiveSession]
  );

  const handlePromptFocus = useCallback(() => {
    setTimeout(() => scrollToBottom(true), 80);
  }, [scrollToBottom]);

  const handleStartNewSession = useCallback(() => {
    if (activeSessionId && revealTimeoutsRef.current[activeSessionId]) {
      revealTimeoutsRef.current[activeSessionId]?.forEach(clearTimeout);
      delete revealTimeoutsRef.current[activeSessionId];
    }
    setChatState((prev) => createNextAdvisorChatState(prev));
  }, [activeSessionId]);

  const handleSendPrompt = useCallback(async () => {
    if (!activeSession) return;

    const pendingSession = submitAdvisorPrompt(activeSession);

    if (pendingSession === activeSession) {
      return;
    }

    setChatState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === pendingSession.id ? pendingSession : session
      ),
    }));

    try {
      const data = await advisorAPI.evaluate(
        buildAdvisorEvaluatePayload(pendingSession, timezone)
      );

      setChatState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((session) =>
          session.id === pendingSession.id
            ? setAdvisorResult(session, data)
            : session
        ),
      }));
    } catch (error: any) {
      const message =
        error?.response?.data?.message || t('advisor.errors.requestFailed');

      setChatState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((session) =>
          session.id === pendingSession.id
            ? setAdvisorError(session, message)
            : session
        ),
      }));
    }
  }, [activeSession, t, timezone]);

  if (!premium) {
    return (
      <View style={styles.premiumGate}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.2)', 'rgba(99, 102, 241, 0.1)']}
          style={styles.premiumGradient}
        >
          <Ionicons name="lock-closed" size={72} color="#8B5CF6" />
          <Text style={styles.premiumTitle}>{t('advisor.premium.title')}</Text>
          <Text style={styles.premiumSubtitle}>
            {t('advisor.premium.subtitle')}
          </Text>
          <View style={styles.premiumFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>
                {t('advisor.premium.features.hourlyAnalysis')}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>
                {t('advisor.premium.features.aspectInterpretations')}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>
                {t('advisor.premium.features.recommendations')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              try {
                navigation.navigate('Subscription' as never);
              } catch (error: any) {
                logger.error('navigation failed', error?.message || error);
              }
            }}
            style={styles.premiumButton}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumButtonGradient}
            >
              <Text style={styles.premiumButtonText}>
                {t('advisor.premium.getPremium')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <TabScreenLayout
        scrollable={false}
        edges={['left', 'right']}
        contentContainerStyle={styles.layoutContent}
        showCosmicBackground={false}
      >
        <View style={styles.screen}>
          <Image
            source={advisorBackground}
            resizeMode="cover"
            style={[styles.advisorBackground, { opacity: backgroundOpacity }]}
          />
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 12,
                paddingBottom: isKeyboardVisible ? 16 : tabBarHeight + 36,
              },
            ]}
          >
            {showHistoryNotice && (
              <AssistantCard>
                <Text style={styles.widgetTitle}>
                  {t('advisor.history.title')}
                </Text>
                <Text style={styles.widgetSubtitle}>
                  {t('advisor.history.message', {
                    count: ADVISOR_HISTORY_LIMIT,
                  })}
                </Text>
                <TouchableOpacity
                  onPress={dismissHistoryNotice}
                  style={styles.historyNoticeButton}
                >
                  <Text style={styles.historyNoticeButtonText}>
                    {t('advisor.history.confirm')}
                  </Text>
                </TouchableOpacity>
              </AssistantCard>
            )}

            <View style={styles.transcript}>
              {sessions.map((session) => {
                const reveal = getSessionReveal(session.id);

                return session.collapsed ? (
                  <SessionSummaryCard
                    key={session.id}
                    session={session}
                    topicOption={getTopicOption(session.topic)}
                    formatDisplayDate={formatDisplayDate}
                    t={t}
                  />
                ) : (
                  <View key={session.id} style={styles.sessionBlock}>
                    {session.id === activeSessionId && (
                      <InitialAdvisorState
                        displayName={displayName}
                        height={
                          session.topic
                            ? Math.max(360, Math.min(430, screenHeight * 0.48))
                            : Math.max(
                                520,
                                screenHeight - insets.top - tabBarHeight - 40
                              )
                        }
                        topics={topics}
                        selectedTopic={session.topic}
                        onTopicSelect={handleTopicSelect}
                      />
                    )}

                    {session.topic && (
                      <>
                        <TopicSelectionBubble
                          topicOption={getTopicOption(session.topic)}
                          fallbackLabel={session.topic}
                        />
                        {reveal.topicAck && (
                          <AssistantPlainText
                            text={t(
                              `advisor.chat.topicAcknowledgements.${session.topic}`
                            )}
                          />
                        )}
                        {reveal.datePrompt && (
                          <AssistantPlainText
                            muted
                            text={t('advisor.chat.datePrompt')}
                          />
                        )}
                      </>
                    )}

                    {session.topic && !session.date && reveal.dateChoices && (
                      <View style={styles.dateChoicesBlock}>
                        <View style={styles.chipsWrap}>
                          <OutlineChip
                            label={t('advisor.quickDates.today')}
                            onPress={() => handleQuickDateSelect('today')}
                          />
                          <OutlineChip
                            label={t('advisor.quickDates.tomorrow')}
                            onPress={() => handleQuickDateSelect('tomorrow')}
                          />
                          <OutlineChip
                            label={t('advisor.quickDates.nextWeek')}
                            onPress={() => handleQuickDateSelect('nextWeek')}
                          />
                          <OutlineChip
                            label={t('advisor.chat.customDate')}
                            onPress={handleCustomDateOpen}
                            active={session.customDateOpen}
                          />
                        </View>

                        {session.customDateOpen && (
                          <View style={styles.customDateCard}>
                            <DateWheelPicker
                              value={session.customDateValue}
                              locale={wheelLocale}
                              minYear={new Date().getFullYear() - 1}
                              maxYear={new Date().getFullYear() + 5}
                              onChange={handleCustomDateChange}
                              itemHeight={40}
                              visibleRows={5}
                              selectionBackgroundColor="rgba(148, 163, 184, 0.18)"
                            />
                            <TouchableOpacity
                              style={styles.confirmDateButton}
                              onPress={handleCustomDateConfirm}
                            >
                              <LinearGradient
                                colors={['#22D3EE', '#6366F1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.confirmDateGradient}
                              >
                                <Text style={styles.confirmDateText}>
                                  {t('advisor.chat.confirmDate')}
                                </Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    {session.date && (
                      <>
                        <DateSelectionBubble
                          label={formatDisplayDate(session.date)}
                        />
                        {reveal.dateAck && (
                          <AssistantPlainText
                            text={t('advisor.chat.dateAcknowledgement', {
                              date: formatDisplayDate(session.date),
                            })}
                          />
                        )}
                        {reveal.promptRequest && (
                          <AssistantPlainText
                            muted
                            text={t('advisor.chat.promptRequest')}
                          />
                        )}
                      </>
                    )}

                    {session.date &&
                      !session.prompt &&
                      session.status === 'write_prompt' &&
                      reveal.promptInput && (
                        <InlinePromptCard
                          placeholder={t('advisor.chat.promptPlaceholder')}
                          value={session.promptDraft}
                          onChangeText={handlePromptDraftChange}
                          onFocus={handlePromptFocus}
                          onSend={handleSendPrompt}
                          buttonLabel={t('advisor.chat.send')}
                        />
                      )}

                    {session.prompt && (
                      <PromptSelectionBubble text={session.prompt} />
                    )}

                    {session.status === 'loading' && (
                      <AssistantLoadingBubble
                        text={t('advisor.chat.loading')}
                      />
                    )}

                    {session.status === 'error' && session.errorMessage && (
                      <AssistantBubble
                        text={session.errorMessage}
                        tone="error"
                      />
                    )}

                    {session.status === 'completed' && session.result && (
                      <AdvisorResultMessage
                        result={session.result}
                        topicOption={getTopicOption(session.topic)}
                      />
                    )}

                    <View style={styles.actionsRow}>
                      {session.status === 'completed' ? (
                        <FooterAction
                          icon="add-circle-outline"
                          label={t('advisor.chat.newRequest')}
                          onPress={handleStartNewSession}
                        />
                      ) : session.status !== 'loading' && session.topic ? (
                        <FooterAction
                          icon="refresh"
                          label={t('advisor.chat.startOver')}
                          onPress={handleStartNewSession}
                          subtle
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </TabScreenLayout>
    </>
  );
};

function InitialAdvisorState({
  displayName,
  height,
  topics,
  selectedTopic,
  onTopicSelect,
}: {
  displayName: string;
  height: number;
  topics: TopicOption[];
  selectedTopic?: AdvisorTopic;
  onTopicSelect: (topic: AdvisorTopic) => void;
}) {
  return (
    <View
      style={[
        styles.initialHero,
        selectedTopic && styles.initialHeroCompact,
        { minHeight: height },
      ]}
    >
      <GradientBorderView
        colors={[
          'rgba(255, 255, 255, 0.08)',
          'rgba(255, 255, 255, 0.55)',
          'rgba(255, 255, 255, 0.1)',
        ]}
        gradientProps={{
          locations: [0, 0.32, 1],
          start: { x: 1, y: 0 },
          end: { x: 0, y: 1 },
        }}
        style={styles.initialBadgeBorder}
        contentStyle={styles.initialBadgeContent}
      >
        <BlurView
          intensity={24}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.initialBadgeBlur}
        >
          <Text style={styles.initialBadgeText}>Advisor Ai</Text>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </BlurView>
      </GradientBorderView>

      <Text style={styles.initialTitle}>Hey {displayName}!</Text>
      <Text style={styles.initialSubtitle}>
        Choose a topic and I will guide{'\n'}you through the reading.
      </Text>

      {!selectedTopic && (
        <View style={styles.initialChipsWrap}>
          {topics.map((topic) => (
            <InitialTopicChip
              key={topic.key}
              topic={topic}
              onPress={() => onTopicSelect(topic.key)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function InitialTopicChip({
  topic,
  onPress,
}: {
  topic: TopicOption;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={styles.initialTopicTouchable}
    >
      <GradientBorderView
        colors={topic.borderGradient}
        gradientProps={{
          locations: [0.29, 1],
          start: { x: 0.49, y: 0 },
          end: { x: 0.51, y: 1 },
        }}
        style={styles.initialTopicChipBorder}
        contentStyle={[
          styles.initialTopicChipContent,
          { backgroundColor: topic.background },
        ]}
      >
        <Ionicons name={topic.icon} size={16} color="#FFFFFF" />
        <Text style={styles.initialTopicText}>{topic.label}</Text>
      </GradientBorderView>
    </TouchableOpacity>
  );
}

function TopicSelectionBubble({
  topicOption,
  fallbackLabel,
}: {
  topicOption: TopicOption | null;
  fallbackLabel: string;
}) {
  const label = topicOption?.label || fallbackLabel;
  const icon = topicOption?.icon || 'sparkles';
  const borderColors: readonly [string, string, string] = topicOption
    ? [
        topicOption.borderGradient[0],
        topicOption.borderHighlight,
        topicOption.borderGradient[1],
      ]
    : [
        'rgba(255, 255, 255, 0.7)',
        'rgba(255, 255, 255, 0.5)',
        'rgba(255, 255, 255, 0.05)',
      ];
  const baseBorderColor =
    topicOption?.borderBase || 'rgba(255, 255, 255, 0.05)';

  return (
    <Reanimated.View
      entering={FadeInDown.duration(240)}
      style={styles.topicBubbleRow}
    >
      <View
        style={[styles.topicBubbleBaseBorder, { borderColor: baseBorderColor }]}
      >
        <GradientBorderView
          colors={borderColors}
          gradientProps={{
            locations: [0, 0.5, 1],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 1 },
          }}
          style={styles.topicBubbleBorder}
          contentStyle={[
            styles.topicBubbleInner,
            {
              backgroundColor:
                topicOption?.bubbleBackground || 'rgba(255, 255, 255, 0.1)',
            },
          ]}
        >
          <Text style={styles.topicBubbleLabel}>Topic</Text>
          <View style={styles.topicBubbleContent}>
            <Ionicons name={icon} size={14} color="#FFFFFF" />
            <Text style={styles.topicBubbleText}>{label}</Text>
          </View>
        </GradientBorderView>
      </View>
    </Reanimated.View>
  );
}

function DateSelectionBubble({ label }: { label: string }) {
  return (
    <Reanimated.View
      entering={FadeInDown.duration(240)}
      style={styles.topicBubbleRow}
    >
      <View
        style={[
          styles.topicBubbleBaseBorder,
          { borderColor: 'rgba(255, 255, 255, 0.05)' },
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
          style={styles.topicBubbleBorder}
          contentStyle={[
            styles.topicBubbleInner,
            { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
          ]}
        >
          <Text style={styles.topicBubbleLabel}>Date</Text>
          <View style={styles.topicBubbleContent}>
            <Text style={styles.topicBubbleText}>{label}</Text>
          </View>
        </GradientBorderView>
      </View>
    </Reanimated.View>
  );
}

function PromptSelectionBubble({ text }: { text: string }) {
  return (
    <Reanimated.View
      entering={FadeInDown.duration(240)}
      style={styles.topicBubbleRow}
    >
      <View
        style={[
          styles.topicBubbleBaseBorder,
          styles.promptBubbleBaseBorder,
          { borderColor: 'rgba(255, 255, 255, 0.05)' },
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
          style={styles.topicBubbleBorder}
          contentStyle={[
            styles.topicBubbleInner,
            styles.promptBubbleInner,
            { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
          ]}
        >
          <Text style={[styles.topicBubbleText, styles.promptBubbleText]}>
            {text}
          </Text>
        </GradientBorderView>
      </View>
    </Reanimated.View>
  );
}

function AssistantPlainText({
  text,
  muted = false,
}: {
  text: string;
  muted?: boolean;
}) {
  return (
    <Reanimated.View
      entering={FadeInDown.duration(260)}
      style={styles.assistantPlainRow}
    >
      <Text
        style={[
          styles.assistantPlainText,
          muted && styles.assistantPlainTextMuted,
        ]}
      >
        {text}
      </Text>
    </Reanimated.View>
  );
}

function AssistantBubble({
  text,
  tone = 'default',
}: {
  text: string;
  tone?: 'default' | 'error';
}) {
  const borderColor =
    tone === 'error' ? 'rgba(248, 113, 113, 0.45)' : 'rgba(255,255,255,0.08)';
  const backgroundColor =
    tone === 'error' ? 'rgba(127, 29, 29, 0.55)' : 'rgba(15, 23, 42, 0.9)';

  return (
    <Reanimated.View
      entering={FadeInDown.duration(260)}
      style={styles.assistantRow}
    >
      <View style={styles.avatar}>
        <LinearGradient
          colors={
            tone === 'error' ? ['#F97316', '#EF4444'] : ['#22D3EE', '#6366F1']
          }
          style={styles.avatarGradient}
        >
          <Ionicons
            name={tone === 'error' ? 'alert-circle' : 'sparkles'}
            size={16}
            color="#FFFFFF"
          />
        </LinearGradient>
      </View>
      <View style={[styles.assistantBubble, { borderColor, backgroundColor }]}>
        <Text style={styles.assistantText}>{text}</Text>
      </View>
    </Reanimated.View>
  );
}

function AssistantCard({ children }: { children: React.ReactNode }) {
  return (
    <Reanimated.View
      entering={FadeInDown.duration(280)}
      style={styles.assistantRow}
    >
      <View style={styles.avatar}>
        <LinearGradient
          colors={['#22D3EE', '#6366F1']}
          style={styles.avatarGradient}
        >
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <BlurView intensity={18} tint="dark" style={styles.assistantCard}>
        {children}
      </BlurView>
    </Reanimated.View>
  );
}

function AssistantLoadingBubble({ text }: { text: string }) {
  return (
    <Reanimated.View
      entering={FadeInDown.duration(260)}
      style={styles.assistantRow}
    >
      <View style={styles.avatar}>
        <LinearGradient
          colors={['#22D3EE', '#6366F1']}
          style={styles.avatarGradient}
        >
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <View style={styles.loadingBubble}>
        <ActivityIndicator color="#E2E8F0" size="small" />
        <Text style={styles.loadingText}>{text}</Text>
      </View>
    </Reanimated.View>
  );
}

function UserBubble({
  icon,
  title,
  text,
  wide = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  wide?: boolean;
}) {
  return (
    <Reanimated.View entering={FadeInDown.duration(240)} style={styles.userRow}>
      <LinearGradient
        colors={['#1D4ED8', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.userBubble, wide && styles.userBubbleWide]}
      >
        <View style={styles.userMeta}>
          <Ionicons name={icon} size={14} color="#BFDBFE" />
          <Text style={styles.userTitle}>{title}</Text>
        </View>
        <Text style={styles.userText}>{text}</Text>
      </LinearGradient>
    </Reanimated.View>
  );
}

function InlinePromptCard({
  placeholder,
  value,
  onChangeText,
  onFocus,
  onSend,
  buttonLabel,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSend: () => void;
  buttonLabel: string;
}) {
  const disabled = !value.trim();

  return (
    <Reanimated.View
      entering={FadeInDown.duration(280)}
      style={styles.promptRow}
    >
      <View style={styles.promptBaseBorder}>
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
          style={styles.promptCardBorder}
          contentStyle={styles.promptCardContent}
        >
          <Text style={styles.promptLabel}>Input</Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            multiline
            style={styles.promptInput}
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={disabled}
            style={styles.inlineSendTouchable}
          >
            <GradientBorderView
              colors={['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.05)']}
              gradientProps={{
                start: { x: 0, y: 0 },
                end: { x: 1, y: 1 },
              }}
              style={styles.inlineSendBorder}
              contentStyle={[
                styles.inlineSendContent,
                disabled && styles.inlineSendContentDisabled,
              ]}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.inlineSendText}>{buttonLabel}</Text>
            </GradientBorderView>
          </TouchableOpacity>
        </GradientBorderView>
      </View>
    </Reanimated.View>
  );
}

function SessionSummaryCard({
  session,
  topicOption,
  formatDisplayDate,
  t,
}: {
  session: AdvisorSession;
  topicOption: TopicOption | null;
  formatDisplayDate: (value?: string) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (!session.result || !topicOption) {
    return null;
  }

  return (
    <Reanimated.View entering={FadeInDown.duration(240)}>
      <BlurView intensity={14} tint="dark" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTitleRow}>
            <Ionicons name={topicOption.icon} size={18} color="#67E8F9" />
            <Text style={styles.summaryTitle}>
              {t('advisor.chat.summary.label')}
            </Text>
          </View>
          <View
            style={[
              styles.summaryScoreBadge,
              { backgroundColor: `${session.result.color}22` },
            ]}
          >
            <Text
              style={[styles.summaryScoreText, { color: session.result.color }]}
            >
              {session.result.score}
            </Text>
          </View>
        </View>
        <Text style={styles.summaryLine}>
          {topicOption.label} • {formatDisplayDate(session.date)}
        </Text>
        <Text style={styles.summaryVerdict}>
          {t(`advisor.chat.summary.verdicts.${session.result.verdict}`)}
        </Text>
      </BlurView>
    </Reanimated.View>
  );
}

function AdvisorResultMessage({
  result,
  topicOption,
}: {
  result: AdvisorEvaluateResponse;
  topicOption: TopicOption | null;
}) {
  if (!topicOption) {
    return null;
  }

  return (
    <Reanimated.View
      entering={FadeInDown.duration(300)}
      style={styles.assistantRow}
    >
      <View style={styles.avatar}>
        <LinearGradient
          colors={['#22D3EE', '#6366F1']}
          style={styles.avatarGradient}
        >
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <View style={styles.resultStack}>
        <AdvisorResultWidget
          verdict={result.verdict}
          score={result.score}
          color={result.color}
          directAnswer={result.directAnswer}
          explanation={result.explanation}
          risks={result.risks}
          clarifyingQuestion={result.clarifyingQuestion}
          alternativeDate={result.alternativeDate}
          topic={topicOption.label}
          topicIcon={topicOption.icon}
        />
        {result.recommendations && result.recommendations.length > 0 && (
          <AdvisorRecommendationsWidget
            recommendations={result.recommendations}
            verdict={result.verdict}
          />
        )}
        {result.bestWindows?.length > 0 && (
          <BestWindowsWidget
            windows={result.bestWindows}
            verdict={result.verdict}
          />
        )}
        {result.aspects?.length > 0 && (
          <AdvisorAspectsWidget
            aspects={result.aspects}
            factors={result.factors}
          />
        )}
      </View>
    </Reanimated.View>
  );
}

function GradientChip({
  label,
  icon,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.chipTouchable}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientChip}
      >
        <Ionicons name={icon} size={14} color="#FFFFFF" />
        <Text style={styles.gradientChipText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function OutlineChip({
  label,
  onPress,
  active = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.outlineChipTouchable}>
      <GradientBorderView
        colors={
          active
            ? ['rgba(34, 211, 238, 0.7)', 'rgba(34, 211, 238, 0.05)']
            : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.05)']
        }
        gradientProps={{
          locations: [0.29, 1],
          start: { x: 0.49, y: 0 },
          end: { x: 0.51, y: 1 },
        }}
        style={styles.outlineChipBorder}
        contentStyle={[
          styles.outlineChipContent,
          active && styles.outlineChipContentActive,
        ]}
      >
        <Text
          style={[
            styles.outlineChipText,
            active && styles.outlineChipTextActive,
          ]}
        >
          {label}
        </Text>
      </GradientBorderView>
    </TouchableOpacity>
  );
}

function FooterAction({
  icon,
  label,
  onPress,
  subtle = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  subtle?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.footerAction, subtle && styles.footerActionSubtle]}
    >
      <Ionicons name={icon} size={16} color={subtle ? '#CBD5E1' : '#FFFFFF'} />
      <Text
        style={[
          styles.footerActionText,
          subtle && styles.footerActionTextSubtle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  layoutContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  screen: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  advisorBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 18,
  },
  transcript: {
    gap: 14,
  },
  sessionBlock: {
    gap: 14,
  },
  initialHero: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 24,
    paddingBottom: 40,
  },
  initialHeroCompact: {
    paddingBottom: 8,
  },
  initialBadgeBorder: {
    borderRadius: 44,
    borderWidth: 1,
  },
  initialBadgeContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  initialBadgeBlur: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 44,
    overflow: 'hidden',
  },
  initialBadgeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0,
  },
  initialTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '500',
    lineHeight: 40,
    letterSpacing: 0,
    marginTop: 16,
  },
  initialSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0,
    marginTop: 14,
  },
  initialChipsWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 24,
  },
  initialTopicTouchable: {
    maxWidth: '100%',
  },
  initialTopicChipBorder: {
    height: 36,
    borderRadius: 24,
    borderWidth: 1,
  },
  initialTopicChipContent: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  initialTopicText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0,
  },
  topicBubbleRow: {
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  topicBubbleBaseBorder: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  promptBubbleBaseBorder: {
    maxWidth: '92%',
  },
  topicBubbleBorder: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 2,
    borderWidth: 1,
    margin: -1,
  },
  topicBubbleInner: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 2,
  },
  promptBubbleInner: {
    paddingVertical: 10,
  },
  topicBubbleLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    height: 16,
  },
  topicBubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  topicBubbleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  promptBubbleText: {
    maxWidth: '100%',
  },
  assistantPlainRow: {
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  assistantPlainText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  assistantPlainTextMuted: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dateChoicesBlock: {
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatar: {
    width: 32,
    paddingTop: 2,
  },
  avatarGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantBubble: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  assistantText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
  },
  assistantCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  widgetTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  widgetTitleWithSpacing: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  widgetSubtitle: {
    color: 'rgba(203, 213, 225, 0.7)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 14,
  },
  historyNoticeButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  historyNoticeButtonText: {
    color: '#CFFAFE',
    fontSize: 13,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipTouchable: {
    maxWidth: '100%',
  },
  gradientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  gradientChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  outlineChipTouchable: {
    maxWidth: '100%',
  },
  outlineChipBorder: {
    borderRadius: 999,
    borderWidth: 1,
  },
  outlineChipContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  outlineChipContentActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  outlineChipText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 18,
  },
  outlineChipTextActive: {
    color: '#CFFAFE',
  },
  customDateCard: {
    marginTop: 14,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.14)',
  },
  confirmDateButton: {
    alignSelf: 'flex-start',
  },
  confirmDateGradient: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  confirmDateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    width: '86%',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userBubbleWide: {
    width: '92%',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  userTitle: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  promptRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  promptBaseBorder: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  promptCardBorder: {
    width: '100%',
    minHeight: 128,
    margin: -1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 2,
    borderWidth: 1,
  },
  promptCardContent: {
    minHeight: 126,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  promptLabel: {
    width: 40,
    height: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
  },
  promptInput: {
    minHeight: 64,
    marginTop: 4,
    padding: 0,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  inlineSendTouchable: {
    position: 'absolute',
    right: 16,
    bottom: 8,
    borderRadius: 24,
  },
  inlineSendBorder: {
    borderRadius: 24,
    borderWidth: 1,
  },
  inlineSendContent: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inlineSendContentDisabled: {
    opacity: 0.45,
  },
  inlineSendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  loadingBubble: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  loadingText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  resultStack: {
    flex: 1,
    gap: 12,
  },
  actionsRow: {
    alignItems: 'flex-end',
    minHeight: 16,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
  },
  footerActionSubtle: {
    backgroundColor: 'rgba(30, 41, 59, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  footerActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerActionTextSubtle: {
    color: '#CBD5E1',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryScoreBadge: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
  },
  summaryScoreText: {
    fontSize: 13,
    fontWeight: '800',
  },
  summaryLine: {
    color: 'rgba(226, 232, 240, 0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryVerdict: {
    color: '#67E8F9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  premiumGate: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  premiumGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  premiumTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  premiumSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  premiumFeatures: {
    marginTop: 32,
    gap: 16,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    flex: 1,
  },
  premiumButton: {
    width: '100%',
    marginTop: 32,
  },
  premiumButtonGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  premiumButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AdvisorScreen;
