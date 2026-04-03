import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { useSubscription } from '../hooks/useSubscription';
import { advisorAPI } from '../services/api';
import type {
  AdvisorEvaluateResponse,
  AdvisorTopic,
} from '../services/api/advisor.api';
import AdvisorAspectsWidget from '../components/advisor/AdvisorAspectsWidget';
import AdvisorRecommendationsWidget from '../components/advisor/AdvisorRecommendationsWidget';
import AdvisorResultWidget from '../components/advisor/AdvisorResultWidget';
import BestWindowsWidget from '../components/advisor/BestWindowsWidget';
import DateWheelPicker from '../components/shared/DateWheelPicker';
import CompactScreenHeader from '../components/shared/CompactScreenHeader';
import { logger } from '../services/logger';
import {
  buildAdvisorEvaluatePayload,
  chooseAdvisorQuickDate,
  confirmAdvisorCustomDate,
  createInitialAdvisorChatState,
  createNextAdvisorChatState,
  openAdvisorCustomDate,
  selectAdvisorTopic,
  setAdvisorError,
  setAdvisorResult,
  submitAdvisorPrompt,
  updateAdvisorCustomDate,
  updateAdvisorPromptDraft,
  type AdvisorSession,
  type QuickDateKey,
} from './advisorChatState';

type TopicOption = {
  key: AdvisorTopic;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  description: string;
};

const TOPIC_CONFIG: Array<{
  key: AdvisorTopic;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
}> = [
  { key: 'contract', icon: 'document-text', gradient: ['#5EEAD4', '#0EA5E9'] },
  { key: 'meeting', icon: 'people', gradient: ['#FB7185', '#F97316'] },
  { key: 'negotiation', icon: 'chatbubbles', gradient: ['#F59E0B', '#EAB308'] },
  { key: 'date', icon: 'heart', gradient: ['#F472B6', '#EC4899'] },
  { key: 'travel', icon: 'airplane', gradient: ['#38BDF8', '#6366F1'] },
  { key: 'purchase', icon: 'cart', gradient: ['#34D399', '#10B981'] },
  { key: 'health', icon: 'fitness', gradient: ['#FB7185', '#EF4444'] },
  { key: 'custom', icon: 'sparkles', gradient: ['#A78BFA', '#6366F1'] },
];

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

type SessionRevealState = {
  topicAck: boolean;
  datePrompt: boolean;
  dateChoices: boolean;
  dateAck: boolean;
  promptRequest: boolean;
  promptInput: boolean;
};

const DEFAULT_REVEAL_STATE: SessionRevealState = {
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
  const navigation = useNavigation();
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
  const [reveals, setReveals] = useState<Record<string, SessionRevealState>>(
    {}
  );

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

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollToBottom(true);
    }, 80);

    return () => clearTimeout(timeout);
  }, [scrollToBottom, transcriptSignature]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollToBottom(true);
    }, 80);

    return () => clearTimeout(timeout);
  }, [revealSignature, scrollToBottom]);

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
    (sessionId: string): SessionRevealState =>
      reveals[sessionId] ?? DEFAULT_REVEAL_STATE,
    [reveals]
  );

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
      >
        <View style={styles.screen}>
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
            <CompactScreenHeader
              title="Astro advisor"
              description={advisorHeaderDescription}
              icon={<Ionicons name="sparkles" size={22} color="#FFFFFF" />}
            />

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
                    <AssistantBubble text={t('advisor.chat.intro')} />

                    {!session.topic && (
                      <AssistantCard>
                        <Text style={styles.widgetTitle}>
                          {t('advisor.selectTopic')}
                        </Text>
                        <Text style={styles.widgetSubtitle}>
                          {t('advisor.chat.topicHelp')}
                        </Text>
                        <View style={styles.chipsWrap}>
                          {topics.map((topic) => (
                            <GradientChip
                              key={topic.key}
                              label={topic.label}
                              icon={topic.icon}
                              colors={topic.gradient}
                              onPress={() => handleTopicSelect(topic.key)}
                            />
                          ))}
                        </View>
                      </AssistantCard>
                    )}

                    {session.topic && (
                      <>
                        <UserBubble
                          icon={
                            getTopicOption(session.topic)?.icon || 'sparkles'
                          }
                          title={t('advisor.chat.selectedTopic')}
                          text={
                            getTopicOption(session.topic)?.label ||
                            session.topic
                          }
                        />
                        {reveal.topicAck && (
                          <AssistantBubble
                            text={t(
                              `advisor.chat.topicAcknowledgements.${session.topic}`
                            )}
                          />
                        )}
                        {reveal.datePrompt && (
                          <AssistantBubble
                            text={t('advisor.chat.datePrompt')}
                          />
                        )}
                      </>
                    )}

                    {session.topic && !session.date && reveal.dateChoices && (
                      <AssistantCard>
                        <Text style={styles.widgetTitleWithSpacing}>
                          {t('advisor.dateAnalysis')}
                        </Text>
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
                      </AssistantCard>
                    )}

                    {session.date && (
                      <>
                        <UserBubble
                          icon="calendar"
                          title={t('advisor.chat.selectedDate')}
                          text={formatDisplayDate(session.date)}
                        />
                        {reveal.dateAck && (
                          <AssistantBubble
                            text={t('advisor.chat.dateAcknowledgement', {
                              date: formatDisplayDate(session.date),
                            })}
                          />
                        )}
                        {reveal.promptRequest && (
                          <AssistantBubble
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
                          title={t('advisor.chat.inputTitle')}
                          placeholder={t('advisor.chat.promptPlaceholder')}
                          value={session.promptDraft}
                          onChangeText={handlePromptDraftChange}
                          onFocus={handlePromptFocus}
                          onSend={handleSendPrompt}
                          buttonLabel={t('advisor.chat.send')}
                        />
                      )}

                    {session.prompt && (
                      <UserBubble
                        icon="send"
                        title={t('advisor.chat.yourMessage')}
                        text={session.prompt}
                        wide
                      />
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
    <Animated.View
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
    </Animated.View>
  );
}

function AssistantCard({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View
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
    </Animated.View>
  );
}

function AssistantLoadingBubble({ text }: { text: string }) {
  return (
    <Animated.View
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
    </Animated.View>
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
    <Animated.View entering={FadeInDown.duration(240)} style={styles.userRow}>
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
    </Animated.View>
  );
}

function InlinePromptCard({
  title,
  placeholder,
  value,
  onChangeText,
  onFocus,
  onSend,
  buttonLabel,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSend: () => void;
  buttonLabel: string;
}) {
  const disabled = !value.trim();

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.userRow}>
      <BlurView intensity={16} tint="dark" style={styles.promptCard}>
        <View style={styles.userMeta}>
          <Ionicons name="create-outline" size={14} color="#BFDBFE" />
          <Text style={styles.userTitle}>{title}</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor="rgba(191, 219, 254, 0.45)"
          multiline
          style={styles.promptInput}
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={disabled}
          style={[
            styles.inlineSendButton,
            disabled && styles.inlineSendButtonDisabled,
          ]}
        >
          <Ionicons name="send" size={16} color="#FFFFFF" />
          <Text style={styles.inlineSendText}>{buttonLabel}</Text>
        </TouchableOpacity>
      </BlurView>
    </Animated.View>
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
    <Animated.View entering={FadeInDown.duration(240)}>
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
    </Animated.View>
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
    <Animated.View
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
    </Animated.View>
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
    <TouchableOpacity
      onPress={onPress}
      style={[styles.outlineChip, active && styles.outlineChipActive]}
    >
      <Text
        style={[styles.outlineChipText, active && styles.outlineChipTextActive]}
      >
        {label}
      </Text>
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
  outlineChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  outlineChipActive: {
    borderColor: 'rgba(34, 211, 238, 0.55)',
    backgroundColor: 'rgba(8, 47, 73, 0.85)',
  },
  outlineChipText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
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
  promptCard: {
    width: '92%',
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
  },
  promptInput: {
    minHeight: 90,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  inlineSendButton: {
    marginTop: 14,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineSendButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
  },
  inlineSendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
