import { api } from './client';
import type {
  CompatibilityQuotaStatus,
  CompatibilityResult,
  CompatibilityReport,
  CreateCompatibilityReportRequest,
} from '../../types/compatibility';

type RawCompatibilityReport = Omit<CompatibilityReport, 'result'> & {
  result: unknown;
};

const formatJsonTextValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(formatJsonTextValue).filter(Boolean).join('\n\n');
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => {
      const body = formatJsonTextValue(item);
      if (!body) {
        return '';
      }

      const title = key
        .replace(/_/g, ' ')
        .replace(/([a-zа-яё])([A-ZА-ЯЁ])/g, '$1 $2')
        .replace(/^./, (char) => char.toUpperCase());

      return `${title}\n${body}`;
    })
    .filter(Boolean)
    .join('\n\n');
};

const normalizeNarrative = (value?: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return formatJsonTextValue(value) || undefined;
  }

  const text = value.trim();
  const fencedJson = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fencedJson?.trim() || text;

  if (!candidate.startsWith('{') && !candidate.startsWith('[')) {
    return text;
  }

  try {
    return formatJsonTextValue(JSON.parse(candidate)) || text;
  } catch {
    return text;
  }
};

const parseJsonIfNeeded = (value: unknown): unknown => {
  let current = value;

  for (let index = 0; index < 3; index += 1) {
    if (typeof current !== 'string') {
      return current;
    }

    try {
      current = JSON.parse(current);
    } catch {
      return current;
    }
  }

  return current;
};

const isCompatibilityResult = (value: unknown): value is CompatibilityResult =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as CompatibilityResult).summary === 'string' &&
  !!(value as CompatibilityResult).categories;

const emptyCategory = (title: string) => ({
  score: 0,
  title,
  description: '',
});

const fallbackResult = (
  report: RawCompatibilityReport,
  parsedResult: unknown
): CompatibilityResult => ({
  score: report.score,
  summary:
    typeof parsedResult === 'string'
      ? parsedResult
      : formatJsonTextValue(parsedResult) || 'Отчет рассчитан.',
  categories: {
    emotional: emptyCategory('Эмоциональная совместимость'),
    attraction: emptyCategory('Притяжение и романтика'),
    communication: emptyCategory('Общение'),
    stability: emptyCategory('Долгосрочный потенциал'),
  },
  keyAspects: [],
  aiNarrative:
    typeof parsedResult === 'string'
      ? undefined
      : normalizeNarrative(parsedResult),
  aiStatus: 'skipped',
});

const normalizeResult = (
  report: RawCompatibilityReport
): CompatibilityResult => {
  const parsedResult = parseJsonIfNeeded(report.result);
  const nestedResult =
    parsedResult && typeof parsedResult === 'object' && 'result' in parsedResult
      ? parseJsonIfNeeded((parsedResult as { result: unknown }).result)
      : parsedResult;

  const result = isCompatibilityResult(nestedResult)
    ? nestedResult
    : fallbackResult(report, nestedResult);

  return {
    ...result,
    aiNarrative: normalizeNarrative(result.aiNarrative),
  };
};

const normalizeReport = (
  report: RawCompatibilityReport
): CompatibilityReport => {
  return {
    ...report,
    result: normalizeResult(report),
  };
};

const safeNormalizeReport = (
  report: RawCompatibilityReport
): CompatibilityReport => {
  try {
    return normalizeReport(report);
  } catch {
    return {
      ...report,
      result: fallbackResult(report, report.result),
    };
  }
};

export const compatibilityAPI = {
  getQuota: async (): Promise<CompatibilityQuotaStatus> => {
    const response = await api.get<CompatibilityQuotaStatus>(
      '/compatibility/quota'
    );
    return response.data;
  },

  createReport: async (
    payload: CreateCompatibilityReportRequest
  ): Promise<CompatibilityReport> => {
    const response = await api.post<RawCompatibilityReport>(
      '/compatibility/reports',
      payload
    );
    return safeNormalizeReport(response.data);
  },

  getReports: async (): Promise<CompatibilityReport[]> => {
    const response = await api.get<RawCompatibilityReport[]>(
      '/compatibility/reports'
    );
    return response.data.map(safeNormalizeReport);
  },

  getReport: async (id: string): Promise<CompatibilityReport> => {
    const response = await api.get<RawCompatibilityReport>(
      `/compatibility/reports/${id}`
    );
    return safeNormalizeReport(response.data);
  },

  deleteReport: async (id: string): Promise<void> => {
    await api.delete(`/compatibility/reports/${id}`);
  },
};
