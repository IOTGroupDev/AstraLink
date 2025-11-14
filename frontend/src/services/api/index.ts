/**
 * Modular API structure
 * Export individual API modules
 */

export { api, API_BASE_URL } from './client';
export { authAPI } from './auth.api';
export { userAPI } from './user.api';
export { chartAPI } from './chart.api';
export { connectionsAPI } from './connections.api';
export { datingAPI } from './dating.api';
export { advisorAPI } from './advisor.api';
export { subscriptionAPI } from './subscription.api';
export { chatAPI } from './chat.api';
export { userPhotosAPI, type UserPhotoItem } from './user-photos.api';
export { userExtendedProfileAPI } from './user-extended-profile.api';
export { testBackendDebug, type DebugHttpDump } from './debug.api';

// Re-export for backward compatibility
export * from './client';
