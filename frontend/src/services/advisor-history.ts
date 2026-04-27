import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  createInitialAdvisorChatState,
  pruneAdvisorChatState,
  type AdvisorChatState,
} from '../screens/advisorChatState';

export const ADVISOR_HISTORY_LIMIT = 50;

const ADVISOR_HISTORY_VERSION = 'v1';
const ADVISOR_HISTORY_PREFIX = `advisor-history:${ADVISOR_HISTORY_VERSION}:`;
const ADVISOR_HISTORY_HINT_PREFIX = `advisor-history-hint:${ADVISOR_HISTORY_VERSION}:`;
const ADVISOR_HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type AdvisorHistoryCachePayload = {
  cachedAt: string;
  state: AdvisorChatState;
};

const buildAdvisorHistoryKey = (userId: string) =>
  `${ADVISOR_HISTORY_PREFIX}${userId}`;

const buildAdvisorHistoryHintKey = (userId: string) =>
  `${ADVISOR_HISTORY_HINT_PREFIX}${userId}`;

const isAdvisorHistoryState = (value: unknown): value is AdvisorChatState => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as AdvisorChatState).sessions) &&
      typeof (value as AdvisorChatState).activeSessionId === 'string'
  );
};

const parseAdvisorHistoryPayload = (
  raw: string
): AdvisorHistoryCachePayload | null => {
  const parsed = JSON.parse(raw) as
    | AdvisorChatState
    | Partial<AdvisorHistoryCachePayload>;

  if (isAdvisorHistoryState(parsed)) {
    return {
      cachedAt: new Date(0).toISOString(),
      state: parsed,
    };
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    typeof parsed.cachedAt === 'string' &&
    isAdvisorHistoryState(parsed.state)
  ) {
    return {
      cachedAt: parsed.cachedAt,
      state: parsed.state,
    };
  }

  return null;
};

const isExpired = (cachedAt: string): boolean => {
  const cachedAtMs = Date.parse(cachedAt);
  return (
    !Number.isFinite(cachedAtMs) ||
    Date.now() - cachedAtMs > ADVISOR_HISTORY_TTL_MS
  );
};

export async function readAdvisorHistory(
  userId: string
): Promise<AdvisorChatState> {
  try {
    if (Platform.OS !== 'web') {
      await AsyncStorage.removeItem(buildAdvisorHistoryKey(userId));
      return createInitialAdvisorChatState();
    }

    const raw = await AsyncStorage.getItem(buildAdvisorHistoryKey(userId));
    if (!raw) return createInitialAdvisorChatState();

    const parsed = parseAdvisorHistoryPayload(raw);
    if (!parsed || isExpired(parsed.cachedAt)) {
      await AsyncStorage.removeItem(buildAdvisorHistoryKey(userId));
      return createInitialAdvisorChatState();
    }

    return pruneAdvisorChatState(parsed.state, ADVISOR_HISTORY_LIMIT);
  } catch {
    return createInitialAdvisorChatState();
  }
}

export async function writeAdvisorHistory(
  userId: string,
  state: AdvisorChatState
): Promise<void> {
  if (Platform.OS !== 'web') {
    await AsyncStorage.removeItem(buildAdvisorHistoryKey(userId));
    return;
  }

  const payload: AdvisorHistoryCachePayload = {
    cachedAt: new Date().toISOString(),
    state: pruneAdvisorChatState(state, ADVISOR_HISTORY_LIMIT),
  };
  await AsyncStorage.setItem(
    buildAdvisorHistoryKey(userId),
    JSON.stringify(payload)
  );
}

export async function shouldShowAdvisorHistoryHint(
  userId: string
): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(
      buildAdvisorHistoryHintKey(userId)
    );
    return value !== 'hidden';
  } catch {
    return true;
  }
}

export async function hideAdvisorHistoryHint(userId: string): Promise<void> {
  await AsyncStorage.setItem(buildAdvisorHistoryHintKey(userId), 'hidden');
}
