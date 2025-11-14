/**
 * Legacy API file - now re-exports from modular structure
 *
 * This file maintains backward compatibility with existing imports.
 * All API modules have been split into separate files in /api/ directory.
 *
 * Original file backed up as api.legacy.ts
 */

// Re-export everything from the modular API structure
export * from './api';

// Explicit named exports for backward compatibility
export { api, API_BASE_URL } from './api/client';
export { authAPI } from './api/auth.api';
export { userAPI } from './api/user.api';
export { chartAPI } from './api/chart.api';
export { connectionsAPI } from './api/connections.api';
export { datingAPI } from './api/dating.api';
export { advisorAPI } from './api/advisor.api';
export { subscriptionAPI } from './api/subscription.api';
export { chatAPI } from './api/chat.api';
export { userPhotosAPI, type UserPhotoItem } from './api/user-photos.api';
export { userExtendedProfileAPI } from './api/user-extended-profile.api';
export { testBackendDebug, type DebugHttpDump } from './api/debug.api';

// Legacy named function exports
import { chatAPI } from './api/chat.api';
export const startConversation = chatAPI.startConversation;
