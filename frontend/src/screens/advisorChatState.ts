import type { DateParts } from '../components/shared/DateWheelPicker';
import type {
  AdvisorEvaluatePayload,
  AdvisorEvaluateResponse,
  AdvisorTopic,
} from '../services/api/advisor.api';

export type AdvisorSessionStatus =
  | 'choose_topic'
  | 'choose_date'
  | 'write_prompt'
  | 'loading'
  | 'completed'
  | 'error';

export interface AdvisorSession {
  id: string;
  topic?: AdvisorTopic;
  date?: string;
  prompt?: string;
  promptDraft: string;
  status: AdvisorSessionStatus;
  result: AdvisorEvaluateResponse | null;
  errorMessage: string | null;
  customDateOpen: boolean;
  customDateValue: DateParts;
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AdvisorChatState {
  sessions: AdvisorSession[];
  activeSessionId: string;
}

export type QuickDateKey = 'today' | 'tomorrow' | 'nextWeek';

function createSessionId(now: number) {
  return `advisor-session-${now}`;
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

export function dateToIsoString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export function dateToParts(date: Date): DateParts {
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function datePartsToIsoString(parts: DateParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function isoStringToDateParts(value?: string): DateParts {
  if (!value) {
    return dateToParts(new Date());
  }

  const [year, month, day] = value.split('-').map((part) => Number(part));

  if (!year || !month || !day) {
    return dateToParts(new Date());
  }

  return { year, month, day };
}

export function createAdvisorSession(
  nowDate: Date = new Date(),
  nowTs = Date.now()
): AdvisorSession {
  return {
    id: createSessionId(nowTs),
    promptDraft: '',
    status: 'choose_topic',
    result: null,
    errorMessage: null,
    customDateOpen: false,
    customDateValue: dateToParts(nowDate),
    collapsed: false,
    createdAt: nowTs,
    updatedAt: nowTs,
  };
}

export function createInitialAdvisorChatState(
  nowDate: Date = new Date(),
  nowTs = Date.now()
): AdvisorChatState {
  const session = createAdvisorSession(nowDate, nowTs);
  return {
    sessions: [session],
    activeSessionId: session.id,
  };
}

export function selectAdvisorTopic(
  session: AdvisorSession,
  topic: AdvisorTopic,
  nowTs = Date.now()
): AdvisorSession {
  return {
    ...session,
    topic,
    status: 'choose_date',
    errorMessage: null,
    updatedAt: nowTs,
  };
}

export function openAdvisorCustomDate(
  session: AdvisorSession,
  nowTs = Date.now()
): AdvisorSession {
  return {
    ...session,
    customDateOpen: true,
    updatedAt: nowTs,
  };
}

export function updateAdvisorCustomDate(
  session: AdvisorSession,
  value: DateParts,
  nowTs = Date.now()
): AdvisorSession {
  return {
    ...session,
    customDateValue: value,
    updatedAt: nowTs,
  };
}

export function confirmAdvisorCustomDate(
  session: AdvisorSession,
  nowTs = Date.now()
): AdvisorSession {
  return {
    ...session,
    date: datePartsToIsoString(session.customDateValue),
    status: 'write_prompt',
    customDateOpen: false,
    errorMessage: null,
    updatedAt: nowTs,
  };
}

export function chooseAdvisorQuickDate(
  session: AdvisorSession,
  quickDate: QuickDateKey,
  nowDate: Date = new Date(),
  nowTs = Date.now()
): AdvisorSession {
  const targetDate = new Date(nowDate);

  if (quickDate === 'tomorrow') {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (quickDate === 'nextWeek') {
    targetDate.setDate(targetDate.getDate() + 7);
  }

  return {
    ...session,
    date: dateToIsoString(targetDate),
    status: 'write_prompt',
    customDateOpen: false,
    customDateValue: dateToParts(targetDate),
    errorMessage: null,
    updatedAt: nowTs,
  };
}

export function updateAdvisorPromptDraft(
  session: AdvisorSession,
  promptDraft: string,
  nowTs = Date.now()
): AdvisorSession {
  return {
    ...session,
    promptDraft,
    updatedAt: nowTs,
  };
}

export function submitAdvisorPrompt(
  session: AdvisorSession,
  nowTs = Date.now()
): AdvisorSession {
  const prompt = session.promptDraft.trim();

  if (!session.topic || !session.date || !prompt) {
    return session;
  }

  return {
    ...session,
    prompt,
    promptDraft: prompt,
    status: 'loading',
    errorMessage: null,
    updatedAt: nowTs,
  };
}

export function setAdvisorResult(
  session: AdvisorSession,
  result: AdvisorEvaluateResponse,
  nowTs = Date.now()
): AdvisorSession {
  return {
    ...session,
    result,
    status: 'completed',
    errorMessage: null,
    updatedAt: nowTs,
  };
}

export function setAdvisorError(
  session: AdvisorSession,
  errorMessage: string,
  nowTs = Date.now()
): AdvisorSession {
  return {
    ...session,
    result: null,
    status: 'error',
    errorMessage,
    updatedAt: nowTs,
  };
}

export function buildAdvisorEvaluatePayload(
  session: AdvisorSession,
  timezone: string
): AdvisorEvaluatePayload {
  if (!session.topic || !session.date || !session.prompt) {
    throw new Error('Advisor session is not ready for submission.');
  }

  return {
    topic: session.topic,
    date: session.date,
    timezone,
    customNote: session.prompt,
  };
}

export function createNextAdvisorChatState(
  state: AdvisorChatState,
  nowDate: Date = new Date(),
  nowTs = Date.now()
): AdvisorChatState {
  const sessions = state.sessions.flatMap((session) => {
    if (session.id === state.activeSessionId) {
      if (session.status === 'completed') {
        return [{ ...session, collapsed: true, updatedAt: nowTs }];
      }
      return [];
    }

    if (session.status === 'completed') {
      return [{ ...session, collapsed: true }];
    }

    return [session];
  });

  const nextSession = createAdvisorSession(nowDate, nowTs);

  return {
    sessions: [...sessions, nextSession],
    activeSessionId: nextSession.id,
  };
}
