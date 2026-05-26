import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { advisorAPI } from '../services/api';
import { SubscriptionTier } from '../types/subscription';
import {
  ADVISOR_HISTORY_LIMIT,
  readAdvisorHistory,
  writeAdvisorHistory,
} from '../services/advisor-history';
import type {
  AdvisorEvaluateResponse,
  AdvisorTopic,
} from '../services/api/advisor.api';
import DateWheelPicker from '../components/shared/DateWheelPicker';
import { GradientBorderView } from '../components/shared';
import SubscriptionRequiredModal from '../components/modals/SubscriptionRequiredModal';
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

const TIME_CHART_LEFT = 18;
const TIME_CHART_RIGHT = 364;
const TIME_CHART_TOP = 18;
const TIME_CHART_BOTTOM = 112;
const MINUTES_PER_DAY = 24 * 60;

type AdvisorTimeWindow = AdvisorEvaluateResponse['bestWindows'][number];

interface AdvisorTimeChart {
  linePath: string;
  areaPath: string;
  peakX: number;
  peakY: number;
  highlightX: number;
  highlightWidth: number;
  highlightY: number;
  highlightHeight: number;
}

const getWindowMinutes = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.getHours() * 60 + date.getMinutes();
};

const getChartX = (minutes: number) =>
  TIME_CHART_LEFT +
  (Math.max(0, Math.min(MINUTES_PER_DAY, minutes)) / MINUTES_PER_DAY) *
    (TIME_CHART_RIGHT - TIME_CHART_LEFT);

const getChartY = (score: number) =>
  TIME_CHART_BOTTOM -
  (Math.max(0, Math.min(100, score)) / 100) *
    (TIME_CHART_BOTTOM - TIME_CHART_TOP);

const buildSmoothChartPath = (points: Array<{ x: number; y: number }>) =>
  points.reduce((path, point, index) => {
    if (index === 0) {
      return `M${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }

    const previous = points[index - 1];
    const middleX = (previous.x + point.x) / 2;

    return `${path} C${middleX.toFixed(1)} ${previous.y.toFixed(1)} ${middleX.toFixed(1)} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, '');

const buildAdvisorTimeChart = (
  windows: AdvisorTimeWindow[]
): AdvisorTimeChart | null => {
  const positionedWindows = windows
    .map((window) => {
      const startMinutes = getWindowMinutes(window.startISO);
      const rawEndMinutes = getWindowMinutes(window.endISO);

      if (startMinutes === null || rawEndMinutes === null) {
        return null;
      }

      const endMinutes =
        rawEndMinutes <= startMinutes
          ? Math.min(MINUTES_PER_DAY, rawEndMinutes + MINUTES_PER_DAY)
          : rawEndMinutes;

      return {
        ...window,
        startMinutes,
        endMinutes,
        startX: getChartX(startMinutes),
        endX: getChartX(endMinutes),
        y: getChartY(window.score),
      };
    })
    .filter(
      (
        window
      ): window is AdvisorTimeWindow & {
        startMinutes: number;
        endMinutes: number;
        startX: number;
        endX: number;
        y: number;
      } => window !== null
    );

  if (positionedWindows.length === 0) {
    return null;
  }

  const orderedWindows = [...positionedWindows].sort(
    (a, b) => a.startMinutes - b.startMinutes
  );
  const peakWindow = [...positionedWindows].sort(
    (a, b) => b.score - a.score
  )[0];
  const points = [
    { x: TIME_CHART_LEFT, y: TIME_CHART_BOTTOM },
    ...orderedWindows.flatMap((window) => [
      { x: window.startX, y: window.y },
      { x: window.endX, y: window.y },
    ]),
    { x: TIME_CHART_RIGHT, y: TIME_CHART_BOTTOM },
  ];
  const linePath = buildSmoothChartPath(points);
  const peakX = (peakWindow.startX + peakWindow.endX) / 2;
  const peakY = peakWindow.y;
  const highlightWidth = Math.max(22, peakWindow.endX - peakWindow.startX);
  const highlightX = Math.max(
    TIME_CHART_LEFT,
    Math.min(TIME_CHART_RIGHT - highlightWidth, peakX - highlightWidth / 2)
  );

  return {
    linePath,
    areaPath: `${linePath} L${TIME_CHART_RIGHT} 126 L${TIME_CHART_LEFT} 126 Z`,
    peakX,
    peakY,
    highlightX,
    highlightWidth,
    highlightY: peakY,
    highlightHeight: 126 - peakY,
  };
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
  const { user } = useAuth();
  const { isPremium, isUpgrading, refetch, upgrade } = useSubscription();
  const premium = useMemo(() => isPremium(), [isPremium]);
  const scrollRef = useRef<ScrollView>(null);
  const pendingSubmissionRef = useRef<AdvisorSession | null>(null);
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
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.9);
  const backgroundOpacityRef = useRef(0.9);
  const [subscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);

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
      historyHydratedRef.current = true;
      return undefined;
    }

    void (async () => {
      const storedState = await readAdvisorHistory(userId);

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

  const executeAdvisorRequest = useCallback(
    async (pendingSession: AdvisorSession) => {
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
    },
    [t, timezone]
  );

  const handleSendPrompt = useCallback(() => {
    if (!activeSession) return;

    const pendingSession = submitAdvisorPrompt(activeSession);

    if (pendingSession === activeSession) {
      return;
    }

    if (!premium) {
      pendingSubmissionRef.current = pendingSession;
      Keyboard.dismiss();
      setSubscriptionModalVisible(true);
      return;
    }

    void executeAdvisorRequest(pendingSession);
  }, [activeSession, executeAdvisorRequest, premium]);

  const handleSubscriptionModalClose = useCallback(() => {
    if (isUpgrading) return;

    pendingSubmissionRef.current = null;
    setSubscriptionModalVisible(false);
  }, [isUpgrading]);

  const handleSubscriptionContinue = useCallback(() => {
    Alert.alert(
      t('subscription.confirmTitle', 'Confirm Subscription'),
      t('subscription.confirmMessage', {
        planName: t('subscription.tiers.premium.name', 'Premium'),
      }),
      [
        {
          text: t('common.buttons.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: t('common.buttons.confirm', 'Confirm'),
          onPress: async () => {
            const result = await upgrade(SubscriptionTier.PREMIUM);

            if (!result.success) {
              Alert.alert(
                t('common.errors.generic', 'Error'),
                t(
                  'subscription.errorMessage',
                  'Failed to upgrade subscription. Please try again.'
                )
              );
              return;
            }

            await refetch();
          },
        },
      ]
    );
  }, [refetch, t, upgrade]);

  useEffect(() => {
    if (!subscriptionModalVisible || !premium) return;

    const pendingSession = pendingSubmissionRef.current;
    pendingSubmissionRef.current = null;
    setSubscriptionModalVisible(false);

    if (pendingSession) {
      void executeAdvisorRequest(pendingSession);
    }
  }, [executeAdvisorRequest, premium, subscriptionModalVisible]);

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
            <View style={styles.transcript}>
              {sessions.map((session) => {
                const reveal = getSessionReveal(session.id);

                if (session.collapsed) {
                  return null;
                }

                return (
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
      <SubscriptionRequiredModal
        visible={subscriptionModalVisible}
        description={t('advisor.premium.gateDescription')}
        processing={isUpgrading}
        onClose={handleSubscriptionModalClose}
        onContinue={handleSubscriptionContinue}
      />
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
  const [dotCount, setDotCount] = useState(1);
  const baseText = useMemo(() => text.trim().replace(/[.]+$/, ''), [text]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((current) => (current % 3) + 1);
    }, 420);

    return () => clearInterval(interval);
  }, []);

  return (
    <Reanimated.View
      entering={FadeInDown.duration(260)}
      style={styles.assistantPlainRow}
    >
      <Text style={[styles.assistantPlainText, styles.assistantPlainTextMuted]}>
        {baseText}
        <Text style={styles.loadingDots}>{'.'.repeat(dotCount)}</Text>
      </Text>
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
  const { t, i18n } = useTranslation();

  if (!topicOption) {
    return null;
  }

  const verdictLabel = t(`advisor.resultWidget.verdict.${result.verdict}`);
  const visibleRisks =
    result.risks?.filter(Boolean).slice(0, 4) ??
    result.recommendations
      ?.filter((item) => item.category !== 'action')
      .map((item) => item.text)
      .slice(0, 4) ??
    [];
  const topWindows = [...(result.bestWindows ?? [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const timeChart = buildAdvisorTimeChart(result.bestWindows ?? []);
  const topFactors = [...(result.factors ?? [])]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 2);
  const scoreWidth: `${number}%` = `${Math.max(
    0,
    Math.min(100, result.score)
  )}%`;
  const locale =
    i18n.language === 'ru'
      ? 'ru-RU'
      : i18n.language === 'es'
        ? 'es-ES'
        : 'en-US';

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';

    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const primaryInfluence = topFactors[0];
  const signedContribution = (value: number) =>
    value > 0 ? `+${value}` : String(value);

  return (
    <Reanimated.View
      entering={FadeInDown.duration(300)}
      style={styles.finalResult}
    >
      <View style={styles.finalHeader}>
        <Text style={styles.finalScoreTitle}>
          {result.score}% • {verdictLabel}
        </Text>
      </View>

      {result.topicDescription ? (
        <Text style={styles.finalText}>
          {t('advisor.analysisFor')} "{result.topicDescription}".
        </Text>
      ) : (
        <Text style={styles.finalText}>
          {t('advisor.analysisFor')} "{topicOption.label}".
        </Text>
      )}

      {result.directAnswer ? (
        <Text style={styles.finalText}>{result.directAnswer}</Text>
      ) : null}

      <Text style={styles.finalText}>{result.explanation}</Text>

      {primaryInfluence ? (
        <Text style={styles.finalText}>
          Key influences: {primaryInfluence.label}{' '}
          {signedContribution(primaryInfluence.contribution)}.{' '}
          {primaryInfluence.description}
        </Text>
      ) : null}

      <Text style={styles.finalText}>Overall score: {result.score}/100</Text>

      <View style={styles.energyBlock}>
        <Text style={styles.energyLevelLabel}>
          {t('advisor.resultWidget.energyLabel')}
        </Text>
        <View style={styles.figmaEnergyTrack}>
          <LinearGradient
            colors={['#5F2999', '#9F45FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.figmaEnergyFill, { width: scoreWidth }]}
          />
        </View>
        <View style={styles.figmaEnergyScale}>
          {[0, 25, 50, 75, 100].map((marker) => (
            <Text key={marker} style={styles.figmaEnergyMarker}>
              {marker}
            </Text>
          ))}
        </View>
      </View>

      {visibleRisks.length > 0 ? (
        <View style={styles.finalSection}>
          <View style={styles.finalSectionHeader}>
            <Ionicons name="warning-outline" size={24} color="#FFFFFF" />
            <Text style={styles.finalSectionTitle}>
              {t('advisor.recommendationsWidget.title.neutral')}
            </Text>
          </View>
          {visibleRisks.map((risk, index) => (
            <View key={`${risk}-${index}`} style={styles.finalBulletRow}>
              <Text style={styles.finalBullet}>•</Text>
              <Text
                style={[
                  styles.finalBulletText,
                  index > 0 && styles.finalBulletTextMuted,
                ]}
              >
                {risk}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {topWindows.length > 0 && timeChart ? (
        <View style={styles.finalSection}>
          <View style={styles.finalSectionHeader}>
            <Ionicons name="time-outline" size={24} color="#FFFFFF" />
            <Text style={styles.finalSectionTitle}>
              {t('advisor.bestWindowsWidget.title')}
            </Text>
          </View>
          <View style={styles.timeChart}>
            <Svg width="100%" height="144" viewBox="0 0 382 144">
              <Defs>
                <SvgLinearGradient
                  id="advisorChartLine"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor="#C77DFF" stopOpacity="0.9" />
                  <Stop offset="1" stopColor="#9F45FF" stopOpacity="0.1" />
                </SvgLinearGradient>
                <SvgLinearGradient
                  id="advisorChartStroke"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <Stop offset="0" stopColor="#7B3FE4" stopOpacity="0.95" />
                  <Stop offset="0.24" stopColor="#9F45FF" stopOpacity="1" />
                  <Stop offset="0.33" stopColor="#F1C5FF" stopOpacity="1" />
                  <Stop offset="0.4" stopColor="#C77DFF" stopOpacity="1" />
                  <Stop offset="0.56" stopColor="#9F45FF" stopOpacity="0.95" />
                  <Stop offset="1" stopColor="#8B4DDB" stopOpacity="0.8" />
                </SvgLinearGradient>
                <SvgLinearGradient
                  id="advisorWindowGlow"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor="#9F45FF" stopOpacity="0" />
                  <Stop offset="1" stopColor="#9F45FF" stopOpacity="0.7" />
                </SvgLinearGradient>
                <RadialGradient id="advisorPeakGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <Stop offset="0.38" stopColor="#F1C5FF" stopOpacity="0.85" />
                  <Stop offset="1" stopColor="#F1C5FF" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Path
                d={timeChart.linePath}
                fill="none"
                stroke="url(#advisorChartStroke)"
                strokeWidth="2"
              />
              <Path
                d={timeChart.areaPath}
                fill="url(#advisorChartLine)"
                opacity="0.35"
              />
              <Rect
                x={timeChart.highlightX}
                y={timeChart.highlightY}
                width={timeChart.highlightWidth}
                height={timeChart.highlightHeight}
                rx="6"
                fill="url(#advisorWindowGlow)"
              />
              <Circle
                cx={timeChart.peakX}
                cy={timeChart.peakY}
                r="15"
                fill="url(#advisorPeakGlow)"
              />
              <Circle
                cx={timeChart.peakX}
                cy={timeChart.peakY}
                r="3"
                fill="#FFFFFF"
                opacity="0.9"
              />
            </Svg>
            <View style={styles.timeChartLabels}>
              {['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map(
                (label, index) => (
                  <Text key={`${label}-${index}`} style={styles.timeChartLabel}>
                    {label}
                  </Text>
                )
              )}
            </View>
          </View>
          <View style={styles.finalWindowsList}>
            {topWindows.map((window, index) => (
              <LinearGradient
                key={`${window.startISO}-${window.endISO}`}
                colors={[
                  index === 0
                    ? 'rgba(159, 69, 255, 0.9)'
                    : 'rgba(159, 69, 255, 0.3)',
                  'rgba(8, 13, 27, 0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.finalWindowRow}
              >
                <Text style={styles.finalWindowRank}>{index + 1}</Text>
                <Text style={styles.finalWindowTime}>
                  {formatTime(window.startISO)} – {formatTime(window.endISO)}
                </Text>
                <View style={styles.finalWindowScore}>
                  <Text style={styles.finalWindowScoreText}>
                    {window.score}
                  </Text>
                </View>
              </LinearGradient>
            ))}
          </View>
        </View>
      ) : null}

      {topFactors.length > 0 ? (
        <View style={styles.finalSection}>
          <View style={styles.finalSectionHeader}>
            <Ionicons name="analytics-outline" size={24} color="#FFFFFF" />
            <Text style={styles.finalSectionTitle}>
              {t('advisor.aspectsWidget.title')}
            </Text>
          </View>
          <Text style={styles.finalSubhead}>
            {t('advisor.aspectsWidget.sections.factors')}
          </Text>
          <View style={styles.factorList}>
            {topFactors.map((factor, index) => (
              <View key={`${factor.label}-${index}`} style={styles.factorRow}>
                <Text style={styles.factorTitle}>
                  {factor.label}{' '}
                  <Text
                    style={[
                      styles.factorScore,
                      factor.contribution < 0 && styles.factorScoreNegative,
                    ]}
                  >
                    {signedContribution(factor.contribution)}
                  </Text>
                </Text>
                {factor.description ? (
                  <Text style={styles.factorDescription}>
                    {factor.description}{' '}
                    {signedContribution(factor.contribution)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
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
    <TouchableOpacity onPress={onPress} style={styles.footerActionTouchable}>
      <GradientBorderView
        colors={
          subtle
            ? ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.05)']
            : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.1)']
        }
        gradientProps={{
          locations: [0.29, 1],
          start: { x: 0.49, y: 0 },
          end: { x: 0.51, y: 1 },
        }}
        style={styles.footerActionBorder}
        contentStyle={styles.footerAction}
      >
        <Ionicons name={icon} size={16} color="rgba(255, 255, 255, 0.9)" />
        <Text style={styles.footerActionText}>{label}</Text>
      </GradientBorderView>
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
  loadingDots: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  finalResult: {
    width: '100%',
    alignItems: 'stretch',
    gap: 10,
    paddingHorizontal: 4,
  },
  finalHeader: {
    width: '100%',
    overflow: 'hidden',
  },
  finalScoreTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 30,
  },
  finalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  energyBlock: {
    gap: 8,
    marginTop: 2,
  },
  energyLevelLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  figmaEnergyTrack: {
    height: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  figmaEnergyFill: {
    height: 8,
    borderRadius: 10,
    opacity: 0.7,
  },
  figmaEnergyScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  figmaEnergyMarker: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '400',
  },
  finalSection: {
    gap: 6,
    paddingTop: 14,
  },
  finalSectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  finalSectionTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 24,
  },
  finalBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  finalBullet: {
    width: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  finalBulletText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  finalBulletTextMuted: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeChart: {
    height: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  timeChartLabels: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  timeChartLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '400',
  },
  finalWindowsList: {
    gap: 8,
    marginTop: 2,
  },
  finalWindowRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    padding: 4,
  },
  finalWindowRank: {
    width: 20,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  finalWindowTime: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  finalWindowScore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalWindowScoreText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  finalSubhead: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  factorList: {
    gap: 6,
  },
  factorRow: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255, 255, 255, 0.7)',
    paddingLeft: 10,
  },
  factorTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  factorScore: {
    color: '#1AB58E',
  },
  factorScoreNegative: {
    color: '#EC484C',
  },
  factorDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    lineHeight: 20,
  },
  actionsRow: {
    alignItems: 'flex-end',
    minHeight: 16,
  },
  footerActionTouchable: {
    maxWidth: '100%',
  },
  footerActionBorder: {
    borderRadius: 24,
    borderWidth: 1,
  },
  footerAction: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerActionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 18,
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
});

export default AdvisorScreen;
