# Quick Security Fixes - Frontend

## Critical Fixes (Do These First!)

### 1. Fix Token Storage (CRITICAL)
**File:** `frontend/src/services/api.ts`

```typescript
// REPLACE THIS:
import { LoginRequest, SignupRequest, AuthResponse, User, Chart, TransitsResponse, UserProfile, UpdateProfileRequest, Subscription, UpgradeSubscriptionRequest } from '../types';

const API_BASE_URL = 'http://192.168.1.14:3000/api';  // BAD!

let authToken: string | null = null;

export const setStoredToken = (token: string) => {
  console.log('💾 Сохраняем токен:', token.substring(0, 20) + '...');  // BAD!
  authToken = token;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('auth_token', token);  // BAD!
    }
  } catch (error) {
    console.log('❌ Ошибка сохранения в localStorage:', error);
  }
};

// WITH THIS:
import * as SecureStore from 'expo-secure-store';
import { LoginRequest, SignupRequest, AuthResponse, User, Chart, TransitsResponse, UserProfile, UpdateProfileRequest, Subscription, UpgradeSubscriptionRequest } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.astralink.com';

const TOKEN_KEY = 'auth_token';

export const setStoredToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
};

export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

export const removeStoredToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};
```

### 2. Remove Token Logging (CRITICAL)
**Files:** Multiple

```typescript
// REMOVE ALL OF:
console.log('🔐 Добавлен токен к запросу:', config.url, token.substring(0, 20) + '...');
console.log('✅ Успешный вход, получен токен:', response.access_token.substring(0, 20) + '...');
console.log('🔍 Токен найден в памяти:', authToken.substring(0, 20) + '...');

// REPLACE WITH:
console.log('Token attached to request');  // or nothing
```

### 3. Use Environment Variables (CRITICAL)
**File:** Create `.env` file in frontend root

```bash
REACT_APP_API_URL=https://api.staging.astralink.com
REACT_APP_API_TIMEOUT=30000
REACT_APP_LOG_LEVEL=error
REACT_APP_ENABLE_DEBUG=false
```

### 4. Fix app.json - Disable Cleartext (HIGH)
**File:** `frontend/app.json`

```json
{
  "expo": {
    "name": "frontend",
    "slug": "frontend",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": false
          }
        }
      ]
    ],
    "scheme": ["astralink"],
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": {
            "scheme": "https",
            "host": "*.astralink.app",
            "pathPrefix": "/"
          },
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "ios": {
      "supportsTablet": true,
      "associatedDomains": ["applinks:astralink.app"]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### 5. Fix Password Validation (HIGH)
**File:** `frontend/src/screens/LoginScreen.tsx` and `frontend/src/screens/SignupScreen.tsx`

```typescript
// REPLACE:
const validatePassword = (password: string): boolean => {
  return password.length >= 6;  // WEAK!
};

// WITH:
const validatePassword = (password: string): boolean => {
  if (password.length < 12) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};
```

### 6. Add Dependencies (HIGH)
**File:** `frontend/package.json`

```bash
npm install expo-secure-store@12.0.0
npm install expo-local-authentication@14.0.0
npm install axios-retry@2.8.0
npm install zod@3.22.0
npm install xss@1.0.14
```

### 7. Remove Sensitive Logging (HIGH)
Search and remove all console.log with user data:
- `frontend/src/screens/MyChartScreen.tsx` - lines 75-85
- `frontend/src/services/api.ts` - all token logging
- `frontend/src/screens/LoginScreen.tsx` - line 124

```typescript
// REMOVE OR REPLACE:
console.log('✅ Получены реальные данные карты:', chartData);
console.log('🔮 Устанавливаю прогнозы:', newPredictions);

// WITH:
if (process.env.REACT_APP_LOG_LEVEL === 'debug') {
  console.log('Chart data loaded');
}
```

### 8. Implement Session Timeout (MEDIUM)
Create `frontend/src/services/sessionManager.ts`:

```typescript
import { removeStoredToken } from './api';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
let sessionTimer: NodeJS.Timeout | null = null;

export const startSessionTimer = () => {
  if (sessionTimer) clearTimeout(sessionTimer);
  
  sessionTimer = setTimeout(async () => {
    await removeStoredToken();
    // Navigate to login
  }, SESSION_TIMEOUT);
};

export const resetSessionTimer = () => {
  startSessionTimer();
};

export const clearSessionTimer = () => {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
};
```

### 9. Sanitize User Input (MEDIUM)
Create `frontend/src/utils/sanitize.ts`:

```typescript
import xss from 'xss';

export const sanitizeUserInput = (input: string): string => {
  if (!input) return '';
  
  return xss(input, {
    whiteList: {},
    stripIgnoredTag: true,
  });
};

export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  // Remove control characters
  return text.replace(/[\x00-\x1F\x7F]/g, '');
};
```

### 10. Add Input Validation Schema (MEDIUM)
Create `frontend/src/validation/schemas.ts`:

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  birthDate: z.string().date('Invalid date format'),
  birthTime: z.string().optional(),
  birthPlace: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
```

## Priority Order

1. ✅ Fix token storage (SecureStore) - 1 hour
2. ✅ Remove all token logging - 30 min
3. ✅ Add environment variables - 1 hour
4. ✅ Fix app.json configuration - 30 min
5. ✅ Strengthen password validation - 1 hour
6. ✅ Add security dependencies - 30 min
7. ✅ Remove sensitive logging - 1 hour
8. ✅ Implement session timeout - 1.5 hours
9. ✅ Add input sanitization - 2 hours
10. ✅ Add validation schemas - 1.5 hours

**Total Estimated Time:** 10 hours for critical fixes

