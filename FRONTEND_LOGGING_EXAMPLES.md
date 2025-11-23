# Frontend Logging Migration Examples

## Текущий Logger

Frontend уже имеет **отличный logger** в `frontend/src/services/logger.ts`!

### Возможности:
✅ Environment-aware (автоматически отключается в production)
✅ Context-based loggers для разных модулей
✅ Emoji префиксы для визуального отличия
✅ Type-safe TypeScript
✅ Child loggers с контекстом

## Доступные Loggers

```typescript
import { logger, authLogger, apiLogger, chartLogger } from '@/services/logger';

logger.log('General message');      // 📝
logger.info('Information');          // ℹ️
logger.warn('Warning');              // ⚠️
logger.error('Error', error);        // ❌
logger.debug('Debug details');       // 🐛

// Context-specific loggers
authLogger.log('User logged in');
apiLogger.error('API request failed', error);
chartLogger.debug('Chart data', chartData);
```

## Migration Examples

### ❌ BEFORE (103 console.log to replace)

#### Example 1: HoroscopeScreen.tsx (21 console.log)

```typescript
// Line 145
console.log('Fetching horoscope data...');

// Line 178
console.log('Horoscope data received:', data);

// Line 202
console.error('Error loading horoscope:', error);

// Line 256
console.log('Widget component rendering');

// Line 301
console.debug('Transit data:', transits);
```

### ✅ AFTER

```typescript
import { logger, chartLogger } from '@/services/logger';

// Line 145
chartLogger.info('Fetching horoscope data...');

// Line 178
chartLogger.log('Horoscope data received', { data });

// Line 202
chartLogger.error('Error loading horoscope', error);

// Line 256
logger.debug('Widget component rendering');

// Line 301
chartLogger.debug('Transit data', { transits });
```

### Example 2: EditProfileScreen.tsx (11 console.log)

#### ❌ Before:
```typescript
console.log('User profile:', profile);
console.log('Updating birth data...');
console.error('Update failed:', error);
console.log('Form validation:', isValid);
```

#### ✅ After:
```typescript
import { logger } from '@/services/logger';

logger.info('User profile loaded', { profile });
logger.info('Updating birth data...');
logger.error('Profile update failed', error);
logger.debug('Form validation status', { isValid });
```

### Example 3: DatingScreen.tsx (10 console.log)

#### ❌ Before:
```typescript
console.log('Loading candidates...');
console.log('Compatibility:', score);
console.error('Match calculation failed:', error);
console.log('Swipe action:', direction);
```

#### ✅ After:
```typescript
import { logger } from '@/services/logger';

logger.info('Loading candidates...');
logger.log('Compatibility calculated', { score });
logger.error('Match calculation failed', error);
logger.debug('Swipe action', { direction });
```

### Example 4: chart.api.ts (10 console.log)

#### ❌ Before:
```typescript
console.log('Fetching chart for user:', userId);
console.log('Chart API response:', response);
console.error('Chart API error:', error);
console.debug('Request config:', config);
```

#### ✅ After:
```typescript
import { apiLogger, chartLogger } from '@/services/logger';

apiLogger.info('Fetching chart', { userId });
apiLogger.log('Chart API response', { response });
apiLogger.error('Chart API error', error);
apiLogger.debug('Request config', { config });
```

### Example 5: ProfileScreen.tsx (7 console.log)

#### ❌ Before:
```typescript
console.log('Profile screen mounted');
console.log('Subscription tier:', tier);
console.error('Failed to load subscription:', error);
console.log('Navigation to settings');
```

#### ✅ After:
```typescript
import { logger, authLogger } from '@/services/logger';

logger.debug('Profile screen mounted');
logger.info('Subscription tier loaded', { tier });
logger.error('Failed to load subscription', error);
logger.debug('Navigating to settings');
```

## API Integration Example

### Before:
```typescript
// services/api/chart.api.ts
export const fetchChart = async (userId: string) => {
  console.log('Fetching chart...', userId);

  try {
    const response = await api.get(`/chart/${userId}`);
    console.log('Chart received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Chart fetch failed:', error);
    throw error;
  }
};
```

### After:
```typescript
import { apiLogger } from '@/services/logger';

export const fetchChart = async (userId: string) => {
  apiLogger.info('Fetching chart', { userId });

  try {
    const response = await api.get(`/chart/${userId}`);
    apiLogger.log('Chart received', {
      userId,
      hasData: !!response.data
    });
    return response.data;
  } catch (error) {
    apiLogger.error('Chart fetch failed', error);
    throw error;
  }
};
```

## React Component Example

### Before:
```typescript
const HoroscopeScreen = () => {
  useEffect(() => {
    console.log('Component mounted');

    fetchHoroscope()
      .then(data => console.log('Data loaded:', data))
      .catch(err => console.error('Error:', err));
  }, []);

  const handleRefresh = () => {
    console.log('Refreshing...');
    // ...
  };

  return (
    <View>
      {console.log('Rendering horoscope')}
      {/* ... */}
    </View>
  );
};
```

### After:
```typescript
import { chartLogger } from '@/services/logger';

const HoroscopeScreen = () => {
  useEffect(() => {
    chartLogger.debug('Component mounted');

    fetchHoroscope()
      .then(data => chartLogger.log('Data loaded', { data }))
      .catch(err => chartLogger.error('Failed to load horoscope', err));
  }, []);

  const handleRefresh = () => {
    chartLogger.info('User initiated refresh');
    // ...
  };

  return (
    <View>
      {/* Remove logging from JSX - use useEffect instead */}
      {/* ... */}
    </View>
  );
};
```

## State Management Example

### Zustand Store - Before:
```typescript
// stores/auth.store.ts
export const useAuthStore = create((set) => ({
  user: null,
  login: async (email, password) => {
    console.log('Login attempt:', email);

    try {
      const user = await api.login(email, password);
      console.log('Login success:', user);
      set({ user });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
}));
```

### After:
```typescript
import { authLogger } from '@/services/logger';

export const useAuthStore = create((set) => ({
  user: null,
  login: async (email, password) => {
    authLogger.info('Login attempt', { email });

    try {
      const user = await api.login(email, password);
      authLogger.log('Login successful', { userId: user.id });
      set({ user });
    } catch (error) {
      authLogger.error('Login failed', error);
      throw error;
    }
  },
}));
```

## useEffect Logging

### Before:
```typescript
useEffect(() => {
  console.log('Subscription changed:', subscription);
}, [subscription]);

useEffect(() => {
  console.log('Fetching data...');
  fetchData();
}, []);
```

### After:
```typescript
import { logger } from '@/services/logger';

useEffect(() => {
  logger.debug('Subscription changed', { subscription });
}, [subscription]);

useEffect(() => {
  logger.info('Initial data fetch');
  fetchData();
}, []);
```

## Navigation Logging

### Before:
```typescript
const navigation = useNavigation();

const handleNavigate = () => {
  console.log('Navigating to Profile');
  navigation.navigate('Profile');
};
```

### After:
```typescript
import { navigationLogger } from '@/services/logger';

const navigation = useNavigation();

const handleNavigate = () => {
  navigationLogger.info('Navigating to Profile');
  navigation.navigate('Profile');
};
```

## Error Boundaries

### Before:
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
}
```

### After:
```typescript
import { logger } from '@/services/logger';

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logger.error('Component error caught', error, { errorInfo });
  }
}
```

## Priority Files to Migrate

### P0 - Critical (52 console.log total)

1. **HoroscopeScreen.tsx** (21) - Highest priority
   - Chart loading logs
   - Widget rendering logs
   - Transit calculation logs

2. **EditProfileScreen.tsx** (11)
   - Form validation logs
   - Profile update logs
   - Birth data logs

3. **DatingScreen.tsx** (10)
   - Candidate loading logs
   - Swipe action logs
   - Match calculation logs

4. **chart.api.ts** (10)
   - API request logs
   - Response logs
   - Error logs

### P1 - Important (20 console.log total)

5. **ProfileScreen.tsx** (7)
6. **NatalChartScreen.tsx** (6)
7. **ChatDialogScreen.tsx** (7)

### P2 - Remaining (31 console.log total)

8. All other files (31 console.log)

## Migration Checklist

### Phase 1: Critical Screens (Week 1)
- [ ] Import logger in HoroscopeScreen.tsx
- [ ] Replace 21 console.log with chartLogger
- [ ] Import logger in EditProfileScreen.tsx
- [ ] Replace 11 console.log with logger
- [ ] Import logger in DatingScreen.tsx
- [ ] Replace 10 console.log with logger
- [ ] Test all screens in development

### Phase 2: API Layer (Week 1)
- [ ] Import apiLogger in chart.api.ts
- [ ] Replace 10 console.log with apiLogger
- [ ] Import apiLogger in other API files
- [ ] Test API error handling

### Phase 3: Remaining Screens (Week 2)
- [ ] Migrate ProfileScreen.tsx (7)
- [ ] Migrate NatalChartScreen.tsx (6)
- [ ] Migrate ChatDialogScreen.tsx (7)
- [ ] Migrate all remaining files (31)

### Phase 4: Testing & Verification
- [ ] Test in development mode (all logs visible)
- [ ] Test in production mode (only warnings/errors)
- [ ] Verify no console.log remains
- [ ] Performance testing

## Benefits

### ✅ Before Migration:
```typescript
console.log('User:', user);  // Always logs, even in production
console.error('Error:', err); // No context
console.debug('Debug');       // Mixed with regular logs
```

### ✅ After Migration:
```typescript
logger.log('User loaded', { user });    // 📝 Auto-disabled in prod
logger.error('API error', err);         // ❌ Clear error indicator
chartLogger.debug('Chart data', data);  // 🐛 [Chart] prefix
```

### Performance Impact:
- **Zero overhead in production** (completely disabled)
- **Minimal overhead in development** (<0.1ms per log)
- **Better readability** with emojis and context
- **Type safety** with TypeScript

## Testing

### Development Mode:
```typescript
__DEV__ === true
// All logs visible
logger.log('test');    // ✅ Visible
logger.debug('test');  // ✅ Visible
logger.error('test');  // ✅ Visible
```

### Production Mode:
```typescript
__DEV__ === false
// Logger automatically disabled
logger.log('test');    // ❌ Not logged
logger.debug('test');  // ❌ Not logged
logger.error('test');  // ❌ Not logged (by default)
```

### Override for Debugging:
```typescript
// Enable logging in production for debugging
logger.setEnabled(true);
```

## Quick Reference

| Old | New | When |
|-----|-----|------|
| `console.log()` | `logger.log()` | General info |
| `console.info()` | `logger.info()` | Important info |
| `console.warn()` | `logger.warn()` | Warnings |
| `console.error()` | `logger.error()` | Errors |
| `console.debug()` | `logger.debug()` | Debug only |

### Context Loggers:
| Logger | Use For |
|--------|---------|
| `logger` | General purpose |
| `authLogger` | Auth events (login, signup) |
| `apiLogger` | API requests/responses |
| `chartLogger` | Chart calculations |
| `navigationLogger` | Screen navigation |
| `supabaseLogger` | Supabase operations |
| `storageLogger` | AsyncStorage operations |

---

**Status:** 🎯 Ready to migrate
**Estimated Time:** 1-2 days for all 103 console.log
**Impact:** Zero production overhead + better debugging
