import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from './supabase';
import { logger } from './logger';

type PresenceListener = (onlineIds: ReadonlySet<string>) => void;

let channel: ReturnType<typeof supabase.channel> | null = null;
let currentUserId: string | null = null;
let onlineIds: Set<string> = new Set();
const listeners: Set<PresenceListener> = new Set();
let appStateSub: { remove: () => void } | null = null;

// App owns a lease throughout the authenticated session. Screens can share it.
const leases = new Set<symbol>();
let subscribed = false;
let trackingQueue: Promise<void> = Promise.resolve();

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

function syncFromChannel(source: NonNullable<typeof channel>) {
  if (channel !== source || !subscribed) return;

  let next: Set<string>;
  try {
    const state = source.presenceState();
    next = new Set(
      Object.entries(state)
        .filter(([, sessions]) => sessions.length > 0)
        .map(([id]) => id)
    );
  } catch {
    next = new Set();
  }

  if (setsEqual(onlineIds, next)) return;

  onlineIds = next;
  notify();
}

function reconcileTracking() {
  const source = channel;
  if (!source) return;
  // Serialize a pending track and subsequent untrack during rapid AppState
  // changes so a completed track cannot leave a background app online.
  trackingQueue = trackingQueue
    .then(async () => {
      if (channel !== source || !subscribed) return;
      const result =
        AppState.currentState === 'active'
          ? await source.track({ online_at: new Date().toISOString() })
          : await source.untrack();
      if (result !== 'ok')
        logger.warn('[Presence] Tracking unavailable', result);
    })
    .catch((error) => logger.warn('[Presence] Tracking failed', error));
}

function attachAppStateListener() {
  if (appStateSub) return;

  try {
    appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (!channel) return;

        if (nextState === 'active') {
          reconcileTracking();
        } else if (nextState === 'background' || nextState === 'inactive') {
          reconcileTracking();
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

  const source = supabase.channel('presence:global', {
    config: {
      presence: { key: userId },
    },
  });
  channel = source;

  source.on('presence', { event: 'sync' }, () => syncFromChannel(source));
  source.on('presence', { event: 'join' }, () => syncFromChannel(source));
  source.on('presence', { event: 'leave' }, () => syncFromChannel(source));

  source.subscribe((status) => {
    if (channel !== source) return;
    subscribed = status === 'SUBSCRIBED';
    if (status === 'SUBSCRIBED') {
      reconcileTracking();
    } else {
      if (onlineIds.size > 0) {
        onlineIds = new Set();
        notify();
      }
      logger.warn('[Presence] Subscription unavailable', status);
    }
  });

  attachAppStateListener();

  // Initial state (before first sync)
  syncFromChannel(source);
}

/**
 * Acquire a presence "lease" for a given userId.
 * Presence will be started on first lease and stopped when the last lease is released.
 */
export function acquirePresence(userId: string): () => void {
  if (!userId) return () => void 0;

  startPresence(userId);
  const lease = Symbol(userId);
  leases.add(lease);

  let released = false;
  return () => {
    if (released) return;
    released = true;

    if (!leases.delete(lease)) return;
    if (leases.size === 0) {
      stopPresence();
    }
  };
}

export function stopPresence() {
  leases.clear();
  subscribed = false;
  trackingQueue = Promise.resolve();
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
      void supabase.removeChannel(channel).catch((error) => {
        logger.warn('[Presence] Cleanup failed', error);
      });
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
