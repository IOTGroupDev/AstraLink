import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createInitialAdvisorChatState,
  pruneAdvisorChatState,
  type AdvisorChatState,
} from '../screens/advisorChatState';

export const ADVISOR_HISTORY_LIMIT = 50;

const ADVISOR_HISTORY_VERSION = 'v1';
const ADVISOR_HISTORY_PREFIX = `advisor-history:${ADVISOR_HISTORY_VERSION}:`;
const ADVISOR_HISTORY_HINT_PREFIX = `advisor-history-hint:${ADVISOR_HISTORY_VERSION}:`;

const buildAdvisorHistoryKey = (userId: string) =>
  `${ADVISOR_HISTORY_PREFIX}${userId}`;

const buildAdvisorHistoryHintKey = (userId: string) =>
  `${ADVISOR_HISTORY_HINT_PREFIX}${userId}`;

export async function readAdvisorHistory(
  userId: string
): Promise<AdvisorChatState> {
  try {
    const raw = await AsyncStorage.getItem(buildAdvisorHistoryKey(userId));
    if (!raw) return createInitialAdvisorChatState();

    const parsed = JSON.parse(raw) as AdvisorChatState;

    if (
      !parsed ||
      !Array.isArray(parsed.sessions) ||
      typeof parsed.activeSessionId !== 'string'
    ) {
      return createInitialAdvisorChatState();
    }

    return pruneAdvisorChatState(parsed, ADVISOR_HISTORY_LIMIT);
  } catch {
    return createInitialAdvisorChatState();
  }
}

export async function writeAdvisorHistory(
  userId: string,
  state: AdvisorChatState
): Promise<void> {
  const payload = pruneAdvisorChatState(state, ADVISOR_HISTORY_LIMIT);
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
