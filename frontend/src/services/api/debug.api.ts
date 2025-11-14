import { AxiosError, AxiosHeaders } from 'axios';
import { api } from './client';

function headersToPlain(h: any): Record<string, string> {
  if (!h) return {};
  const out: Record<string, string> = {};
  // AxiosHeaders v1/v2
  if (typeof (h as AxiosHeaders).forEach === 'function') {
    (h as AxiosHeaders).forEach((v: any, k: string) => (out[k] = String(v)));
    return out;
  }
  // Plain object
  for (const k of Object.keys(h)) out[k] = String(h[k]);
  return out;
}

function safeJsonify(value: any) {
  try {
    if (typeof value === 'string') return value;
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export interface DebugHttpDump {
  durationMs: number;
  request: {
    method?: string;
    baseURL?: string;
    url?: string;
    fullUrl?: string;
    headers: Record<string, string>;
    data?: any;
    params?: any;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
  };
  error?: {
    message: string;
    code?: string;
    isAxiosError: boolean;
  };
}

/**
 * Делает GET /health и возвращает полный дамп запроса/ответа
 */
export async function testBackendDebug(): Promise<DebugHttpDump> {
  const started = Date.now();
  try {
    const res = await api.get('/health', {
      headers: { 'X-Debug': 'on' },
    });

    const durationMs = Date.now() - started;
    const cfg = res.config || {};
    const baseURL = (cfg as any).baseURL || '';
    const url = (cfg as any).url || '';
    const fullUrl = `${baseURL}${url}`;

    return {
      durationMs,
      request: {
        method: (cfg as any).method,
        baseURL,
        url,
        fullUrl,
        headers: headersToPlain((cfg as any).headers),
        data: safeJsonify((cfg as any).data),
        params: safeJsonify((cfg as any).params),
      },
      response: {
        status: res.status,
        statusText: res.statusText,
        headers: headersToPlain(res.headers),
        data: safeJsonify(res.data),
      },
    };
  } catch (e) {
    const err = e as AxiosError;
    const durationMs = Date.now() - started;
    const cfg = err.config || {};
    const baseURL = (cfg as any).baseURL || '';
    const url = (cfg as any).url || '';
    const fullUrl = `${baseURL}${url}`;

    const dump: DebugHttpDump = {
      durationMs,
      request: {
        method: (cfg as any).method,
        baseURL,
        url,
        fullUrl,
        headers: headersToPlain((cfg as any).headers),
        data: safeJsonify((cfg as any).data),
        params: safeJsonify((cfg as any).params),
      },
      error: {
        message: err.message,
        code: err.code,
        isAxiosError: !!(err as any).isAxiosError,
      },
    };

    if (err.response) {
      dump.response = {
        status: err.response.status,
        statusText: err.response.statusText || '',
        headers: headersToPlain(err.response.headers || {}),
        data: safeJsonify(err.response.data),
      };
    }

    return dump;
  }
}
