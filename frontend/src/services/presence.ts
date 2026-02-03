import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from './supabase';

type PresenceListener = (onlineIds: ReadonlySet<string>) => void;

let channel: ReturnType<typeof supabase.channel> | null = null;
let currentUserId: string | null = null;
let onlineIds: Set<string> = new Set();
let listeners: Set<PresenceListener> = new Set();
let appStateSub: { remove: () => void } | null = null;

/**
 * Presence should be enabled only when needed (e.g. Messages screens),
 * to avoid side-effects on navigation animations and overall app performance.
 */
let leaseCount = 0;

function notify() {
  const snapshot = new Set(onlineIds);
  for (const l of listeners) {
    try {
      l(snapshot);
    } catch {
      // ignore listener errors to avoid breaking presence pipeline
    }
  }
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

function syncFromChannel() {
  if (!channel) return;

  let next: Set<string>;
  try {
    const state = channel.presenceState() as Record<string, unknown>;
    next = new Set(Object.keys(state || {}));
  } catch {
    next = new Set();
  }

  if (setsEqual(onlineIds, next)) return;

  onlineIds = next;
  notify();
}

async function safeTrack() {
  if (!channel) return;
  try {
    await channel.track({ online_at: new Date().toISOString() });
  } catch {
    // ignore
  }
}

async function safeUntrack() {
  if (!channel) return;
  const anyCh: any = channel as any;
  try {
    if (typeof anyCh.untrack === 'function') {
      await anyCh.untrack();
    }
  } catch {
    // ignore
  }
}

function attachAppStateListener() {
  if (appStateSub) return;

  try {
    appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (!channel) return;

        if (nextState === 'active') {
          void safeTrack();
        } else if (nextState === 'background' || nextState === 'inactive') {
          void safeUntrack();
        }
      }
    );
  } catch {
    // ignore (older RN versions / web)
  }
}

/**
 * Start (or reuse) global presence channel.
 * Uses `userId` as presence key, so all connected clients can infer who is "online"
 * by checking presence keys in `presenceState()`.
 */
export function startPresence(userId: string) {
  if (!userId) return;

  // Already running for this user
  if (channel && currentUserId === userId) return;

  // Re-init for another user (logout/login)
  stopPresence();

  currentUserId = userId;

  channel = supabase.channel('presence:global', {
    config: {
      presence: { key: userId },
    },
  });

  channel.on('presence', { event: 'sync' }, () => syncFromChannel());
  channel.on('presence', { event: 'join' }, () => syncFromChannel());
  channel.on('presence', { event: 'leave' }, () => syncFromChannel());

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void safeTrack();
    }
  });

  attachAppStateListener();

  // Initial state (before first sync)
  syncFromChannel();
}

/**
 * Acquire a presence "lease" for a given userId.
 * Presence will be started on first lease and stopped when the last lease is released.
 */
export function acquirePresence(userId: string): () => void {
  if (!userId) return () => void 0;

  leaseCount += 1;
  startPresence(userId);

  let released = false;
  return () => {
    if (released) return;
    released = true;

    leaseCount = Math.max(0, leaseCount - 1);
    if (leaseCount === 0) {
      stopPresence();
    }
  };
}

export function stopPresence() {
  if (appStateSub) {
    try {
      appStateSub.remove();
    } catch {
      // ignore
    }
    appStateSub = null;
  }

  if (channel) {
    try {
      supabase.removeChannel(channel);
    } catch {
      // ignore
    }
  }

  channel = null;
  currentUserId = null;

  // notify only if something actually changed
  if (onlineIds.size > 0) {
    onlineIds = new Set();
    notify();
  }
}

export function subscribePresence(listener: PresenceListener) {
  listeners.add(listener);

  // immediate emit
  try {
    listener(new Set(onlineIds));
  } catch {
    // ignore
  }

  return () => {
    listeners.delete(listener);
  };
}

export function getOnlineIds(): Set<string> {
  return new Set(onlineIds);
}

export function isUserOnline(userId: string): boolean {
  return onlineIds.has(userId);
}
