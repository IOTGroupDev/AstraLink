# Backend Architecture Audit - Quick Reference Guide

## Most Critical Issues to Fix (Do These First)

### 1. **Exception Handling is Inconsistent** ⛔
Files affected: user.service.ts, chart.service.ts, ephemeris.service.ts

**Current Problem:**
```typescript
// user.service.ts:25 - WRONG
throw new Error(`User with id ${userId} not found`);

// chart.service.ts:46 - WRONG (404 for validation error)
throw new NotFoundException('Некорректный формат времени');

// ephemeris.service.ts:62 - WRONG
throw new Error('Не удалось рассчитать натальную карту');
```

**What it should be:**
```typescript
// For missing resources:
throw new NotFoundException('User not found');

// For invalid input:
throw new BadRequestException('Invalid time format. Expected HH:MM');

// Always use NestJS exceptions, never generic Error
```

**Impact:** Client gets wrong HTTP status codes (200/500 instead of 400/404)

---

### 2. **Duplicate Code - Location Lookup** ⛔
Appears in: chart.service.ts (lines 107-118) AND connections.service.ts (lines 120-130)

**Solution:** Create a shared service
```typescript
// Create: src/common/services/location.service.ts
@Injectable()
export class LocationService {
  getCoordinates(birthPlace: string) {
    const locations = { ... };
    return locations[birthPlace] || locations['default'];
  }
}

// Then inject in both chart and connections services
```

---

### 3. **Zod Schemas Defined But Never Validated** ⛔
All controllers accept unvalidated input despite schemas existing

**Current:**
```typescript
// Types defined but ignored
LoginRequestSchema, SignupRequestSchema, UpdateProfileRequestSchema...

// Controllers don't validate
async login(@Body() loginDto: LoginRequest) { ... }
```

**Fix:** Use ValidationPipe with Zod
```typescript
// In each controller
async login(@Body() loginDto: LoginRequest): Promise<AuthResponse> {
  // Validate manually or use pipe
  try {
    const validated = LoginRequestSchema.parse(loginDto);
    return this.authService.login(validated);
  } catch (error) {
    throw new BadRequestException(error.message);
  }
}
```

---

### 4. **No Global Error Handler** ⛔
Errors handled inconsistently across the app

**Current Problems:**
- AuthMiddleware returns custom format (line 69-79)
- Services throw different exception types
- Controllers don't catch errors
- Result: Inconsistent responses to clients

**Fix:** Create global exception filter
```typescript
// Create: src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
    });
  }
}

// Register in main.ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

---

### 5. **Dating Service is Just Mock Data** ⛔
Doesn't actually use database (dating.service.ts lines 11-66)

**Current:**
```typescript
async getMatches(userId: number): Promise<DatingMatchResponse[]> {
  const mockCandidates = [
    { id: 'match-1', partnerId: 'partner-1', ... }, // HARDCODED
    // ... more hardcoded data
  ];
  return mockCandidates;
}
```

**Fix:** Implement real database queries
```typescript
async getMatches(userId: number): Promise<DatingMatchResponse[]> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  const matches = await this.prisma.datingMatch.findMany({
    where: { userId },
    include: { user: true }, // relationship to other user
  });

  return matches.map(m => this.formatMatch(m));
}

async likeMatch(userId: number, matchId: number) {
  return this.prisma.datingMatch.update({
    where: { id: matchId },
    data: { liked: true },
  });
}
```

---

### 6. **Security Issues** ⛔

#### Issue 1: Hardcoded JWT Secret
**File:** jwt.strategy.ts line 12
```typescript
secretOrKey: configService.get<string>('JWT_SECRET') || 'supersecret', // BAD!
```

**Fix:**
```typescript
secretOrKey: configService.get<string>('JWT_SECRET'),
// Throw error if not set:
if (!secretOrKey) {
  throw new Error('JWT_SECRET environment variable must be set');
}
```

#### Issue 2: Wildcard CORS
**File:** main.ts line 30
```typescript
origin: [
  // ... specific origins ...
  '*', // Remove this in production!
],
```

**Fix:**
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:8081',
];

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
});
```

---

## Quick Fix Checklist

### Priority 1 - Fix This Week
- [ ] Create GlobalExceptionFilter
- [ ] Fix all exception types (Error → BadRequestException/NotFoundException)
- [ ] Extract location lookup to LocationService
- [ ] Implement real database queries in DatingService
- [ ] Remove hardcoded JWT secret

### Priority 2 - Fix This Sprint
- [ ] Add try-catch to all controllers (or rely on global filter)
- [ ] Validate URL parameters (add ParseIntPipe)
- [ ] Implement Zod validation in controllers
- [ ] Remove wildcard CORS origin
- [ ] Add null checks in services

### Priority 3 - Refactor
- [ ] Reduce logging verbosity
- [ ] Consolidate duplicate aspect calculation
- [ ] Add transaction management for multi-step operations
- [ ] Create repository pattern for data access

---

## File-by-File Fixes

### Controllers (all 6 files)
**Issue:** No error handling
```typescript
// BEFORE (bad)
async login(@Body() loginDto: LoginRequest) {
  return this.authService.login(loginDto); // Can crash here
}

// AFTER (good)
async login(@Body() loginDto: LoginRequest) {
  try {
    return this.authService.login(loginDto);
  } catch (error) {
    // Let global filter handle it
    throw error;
  }
}
// OR just let it propagate - global filter catches it
```

### Services (all 6 files)
**Issue:** Wrong exception types
```typescript
// BEFORE (bad)
throw new Error('Not found');
throw new NotFoundException('Invalid format');

// AFTER (good)
throw new NotFoundException('Resource not found');
throw new BadRequestException('Invalid format');
```

### Auth Security
```typescript
// BEFORE (jwt.strategy.ts)
secretOrKey: configService.get<string>('JWT_SECRET') || 'supersecret'

// AFTER
const secret = configService.get<string>('JWT_SECRET');
if (!secret) throw new Error('JWT_SECRET not configured');
secretOrKey: secret
```

---

## Testing Recommendations

Add tests for:
1. Authentication (valid/invalid credentials, expired tokens)
2. Validation (invalid dates, formats, ranges)
3. Exception handling (verify correct status codes)
4. Authorization (user can only access own data)
5. Database constraints (cascade delete, foreign keys)

```typescript
// Example test
describe('AuthService', () => {
  it('should throw BadRequestException for invalid date', async () => {
    expect(() => service.signup({
      email: 'test@example.com',
      password: 'password',
      birthDate: '2050-01-01', // Future date
      name: 'Test',
    })).toThrow(BadRequestException);
  });
});
```

---

## Most Important Rules Going Forward

1. **Always use NestJS exceptions, never generic Error**
   - BadRequestException (400) for validation
   - NotFoundException (404) for missing resources
   - UnauthorizedException (401) for auth
   - ForbiddenException (403) for permissions

2. **Always validate input** - Don't trust @Body() or @Query()
   - Use ValidationPipe with Zod or class-validator
   - Check required fields exist
   - Validate ranges and formats

3. **No code duplication** - Extract to shared utilities
   - Location lookup → LocationService
   - Aspect calculation → AspectCalculationService
   - Validation logic → Validators

4. **Always use transactions** for multi-step database operations
   - Delete chart + Create new chart should be one transaction

5. **No mock data in production code** - Either stub for tests or implement real DB queries

---

## Files to Read for Full Details

1. `/home/user/AstraLink/BACKEND_ARCHITECTURE_AUDIT.md` - Complete analysis with 25 issues
2. `/home/user/AstraLink/BACKEND_AUDIT_SUMMARY.txt` - Quick stats and overview

