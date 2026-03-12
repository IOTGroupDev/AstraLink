# AstraLink Backend Architecture Audit Report

## Executive Summary

The backend demonstrates a NestJS-based REST API with reasonable module organization, but has several critical architectural issues including inconsistent error handling, code duplication, missing validation, and improper exception handling patterns.

---

## CRITICAL ISSUES

### 1. Inconsistent Exception Handling Pattern

**Issue**: Services throw different exception types inconsistently.

**Examples**:

- **File**: `/home/user/AstraLink/backend/src/user/user.service.ts` (Line 25)

  ```typescript
  throw new Error(`User with id ${userId} not found`);
  ```

  **Problem**: Throws generic `Error` instead of NestJS `NotFoundException`
  **Impact**: Inconsistent HTTP response codes and error format

- **File**: `/home/user/AstraLink/backend/src/chart/chart.service.ts` (Lines 46, 52)

  ```typescript
  throw new NotFoundException(
    'Некорректный формат времени рождения. Ожидается HH:MM'
  );
  throw new NotFoundException(
    'Некорректный формат даты рождения. Ожидается YYYY-MM-DD'
  );
  ```

  **Problem**: Uses `NotFoundException` for validation errors (should be `BadRequestException`)
  **Impact**: Wrong HTTP status codes (404 for validation errors instead of 400)

- **File**: `/home/user/AstraLink/backend/src/services/ephemeris.service.ts` (Lines 62, 94, 138, 176)
  ```typescript
  throw new Error('Не удалось рассчитать натальную карту');
  ```
  **Problem**: Throws generic `Error` instead of NestJS exceptions
  **Impact**: No proper error response formatting

---

### 2. Code Duplication - Location Lookup

**Issue**: Identical location coordinate lookup code exists in multiple services.

- **File 1**: `/home/user/AstraLink/backend/src/chart/chart.service.ts` (Lines 107-118)

  ```typescript
  private getLocationCoordinates(birthPlace: string): { latitude: number; longitude: number; timezone: number } {
    const locations: { [key: string]: { latitude: number; longitude: number; timezone: number } } = {
      'Москва': { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      'Екатеринбург': { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
      'Новосибирск': { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      'default': { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
    };
    return locations[birthPlace] || locations['default'];
  }
  ```

- **File 2**: `/home/user/AstraLink/backend/src/connections/connections.service.ts` (Lines 120-130)
  Same code repeated exactly

**Impact**: Maintenance burden, increased bug surface area, inconsistent updates

---

### 3. Improper Dependency Injection & Module Coupling

**Issue**: Services not properly exported causing circular dependencies risk

- **File**: `/home/user/AstraLink/backend/src/auth/auth.module.ts` (Line 26)
  ```typescript
  exports: [AuthService, JwtModule, AuthMiddleware],
  ```
  **Problem**: `AuthMiddleware` should not be exported as it's a middleware, and exporting it causes tight coupling

**Issue**: EphemerisService initialization without proper error recovery

- **File**: `/home/user/AstraLink/backend/src/services/ephemeris.service.ts` (Lines 10-16)
  ```typescript
  constructor() {
    try {
      swisseph.swe_set_ephe_path('./ephe');
      this.logger.log('Swiss Ephemeris инициализирован');
    } catch (error) {
      this.logger.warn('Swiss Ephemeris файлы не найдены...');
    }
  }
  ```
  **Problem**: Constructor should never throw; initialization errors swallowed without fallback strategy

---

### 4. Missing Input Validation in Controllers

**Issue**: Zod schemas defined but never used for validation

- **File**: `/home/user/AstraLink/backend/src/chart/chart.controller.ts` (Lines 48-50)

  ```typescript
  async getTransits(@Request() req, @Query() query: TransitRequest) {
    return this.chartService.getTransits(req.user.userId, query.from, query.to);
  }
  ```

  **Problem**: No validation that `from < to` or proper date format validation
  **Missing**: Validation decorators or pipe implementation

- **File**: `/home/user/AstraLink/backend/src/user/user.controller.ts` (Line 22)
  ```typescript
  async updateProfile(@Request() req, @Body() updateData: UpdateProfileRequest) {
    return this.userService.updateProfile(req.user.userId, updateData);
  }
  **Problem**: No validation that birthDate is not in future or valid format
  ```

---

### 5. Service Layer Complexity & Duplication

**Issue**: Overly complex prediction generation with duplicated logic

- **File**: `/home/user/AstraLink/backend/src/chart/chart.service.ts` (Lines 146-270)
  - `generatePredictions()` is 82 lines with deeply nested conditions
  - Lines 155-160: redundant `getNatalChart()` call inside already called method
  - Logic for aspect calculation duplicated from `EphemerisService`

**Example**:

```typescript
// Line 156 - redundant call
const natalChart = await this.getNatalChart(userId);
```

When `getNatalChart` is already called at line 82 in `getTransits`

---

### 6. Missing Error Handling in Controllers

**Issue**: No try-catch blocks or error handling in controller methods

- **File**: `/home/user/AstraLink/backend/src/auth/auth.controller.ts` (Lines 18-20, 27-29)

  ```typescript
  async login(@Body() loginDto: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(loginDto);  // No try-catch
  }
  ```

  **Problem**: If service throws, error propagates without proper handling

- **File**: `/home/user/AstraLink/backend/src/connections/connections.controller.ts` (Lines 33-35)
  ```typescript
  async getSynastry(@Request() req, @Param('id') connectionId: string): Promise<SynastryResponse> {
    return this.connectionsService.getSynastry(req.user.userId, parseInt(connectionId));
  }
  ```
  **Problem**: `parseInt()` can fail silently or produce NaN, no validation

---

### 7. Mock Data Instead of Database Implementation

**Issue**: Dating service returns hardcoded mock data

- **File**: `/home/user/AstraLink/backend/src/dating/dating.service.ts` (Lines 9-66)

  ```typescript
  async getMatches(userId: number): Promise<DatingMatchResponse[]> {
    const mockCandidates = [
      {
        id: 'match-1',
        partnerId: 'partner-1',
        partnerName: 'Анна',
        compatibility: Math.floor(Math.random() * 30) + 70,
        // ... hardcoded data
      },
      // ... more hardcoded matches
    ];
    return mockCandidates;
  }
  ```

- **Lines 69-85**: `likeMatch()` and `rejectMatch()` also return mock success responses
  **Problem**: These operations don't actually modify any data or create database records

---

### 8. Security Issues

**Issue 1**: Hardcoded JWT secret fallback

- **File**: `/home/user/AstraLink/backend/src/auth/strategies/jwt.strategy.ts` (Line 12)
  ```typescript
  secretOrKey: configService.get<string>('JWT_SECRET') || 'supersecret',
  ```
  **Problem**: Insecure hardcoded fallback if environment variable missing

**Issue 2**: Overly permissive CORS

- **File**: `/home/user/AstraLink/backend/src/main.ts` (Line 30)
  ```typescript
  origin: [
    // ... specific origins ...
    '*', // Временно разрешаем все origins для отладки
  ],
  ```
  **Problem**: Allows any origin; should be removed in production

**Issue 3**: Weak password validation

- **File**: `/home/user/AstraLink/backend/src/types/user.ts` (Line 18)
  ```typescript
  password: z.string().min(6),
  ```
  **Problem**: Only 6 character minimum; no complexity requirements

---

### 9. Inconsistent Subscription Level Validation

**Issue**: Different validation in type and service

- **File**: `/home/user/AstraLink/backend/src/types/subscription.ts` (Lines 6, 15)

  ```typescript
  level: z.enum(['Free', 'AstraPlus', 'DatingPremium', 'MAX']),
  // vs
  level: z.enum(['AstraPlus', 'DatingPremium', 'MAX']),  // Line 15
  ```

- **File**: `/home/user/AstraLink/backend/src/subscription/subscription.service.ts` (Line 29)
  ```typescript
  const validLevels = ['AstraPlus', 'DatingPremium', 'MAX'];
  ```
  **Problem**: 'Free' is different in schema vs validation logic - inconsistent

---

### 10. Missing Transaction Management

**Issue**: Multi-step operations not wrapped in transactions

- **File**: `/home/user/AstraLink/backend/src/chart/chart.service.ts` (Lines 65-77)

  ```typescript
  // Delete old chart
  await this.prisma.chart.deleteMany({ where: { userId } });

  // Then create new one
  return this.prisma.chart.create({
    data: { userId, data: natalChartData },
  });
  ```

  **Problem**: If second operation fails after delete, data loss occurs

---

## HIGH-PRIORITY ISSUES

### 11. Validation Using Wrong Exception Types

- **File**: `/home/user/AstraLink/backend/src/chart/chart.service.ts` (Lines 44-46)
  ```typescript
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(birthTime)) {
    throw new NotFoundException(
      'Некорректный формат времени рождения. Ожидается HH:MM'
    );
  }
  ```
  **Should be**: `BadRequestException` not `NotFoundException`

---

### 12. No Global Error Handler

**Issue**: No global exception filter to standardize error responses

- **File**: `/home/user/AstraLink/backend/src/main.ts` (Lines 1-50)
  **Missing**: `APP_FILTER` provider or `useGlobalFilters()`

**Current inconsistency**:

- Auth middleware returns custom JSON format (line 69-79 in auth.middleware.ts)
- Services throw various NestJS exceptions
- Controllers don't catch errors
- Result: Inconsistent error responses to clients

---

### 13. Type Safety Issues

**Issue**: Type assertions without validation

- **File**: `/home/user/AstraLink/backend/src/connections/connections.service.ts` (Line 53)

  ```typescript
  const targetData = connection.targetData as any;
  ```

  **Problem**: `as any` defeats type safety; no validation of structure

- **File**: `/home/user/AstraLink/backend/src/services/ephemeris.service.ts` (Lines 104-113)
  ```typescript
  const planetsA = chartA.planets;
  const planetsB = chartB.planets;
  // Loop without checking if planetsA/B exist or have expected structure
  for (const [planetA, dataA] of Object.entries(planetsA)) {
    for (const [planetB, dataB] of Object.entries(planetsB)) {
  ```
  **Problem**: No null/undefined checks before accessing

---

### 14. Logging Issues

**Issue**: Excessive logging in production code path

- **File**: `/home/user/AstraLink/backend/src/services/ephemeris.service.ts` (Lines 212-231)
  ```typescript
  for (const [planetId, planetName] of Object.entries(planetNames)) {
    try {
      this.logger.log(`Расчёт ${planetName} (ID: ${planetId})`);
      let result = swisseph.swe_calc_ut(...);
      this.logger.log(`Результат для ${planetName}:`, result);
      // ... more logging
  ```
  **Problem**: Info logs for every planet calculation creates performance drag

---

### 15. Missing Input Parameter Validation

**Issue**: Type parameter conversions without validation

- **File**: `/home/user/AstraLink/backend/src/connections/connections.controller.ts` (Line 34)

  ```typescript
  parseInt(connectionId);
  ```

  **Problem**: No validation that connectionId is numeric string; `parseInt('abc')` returns `NaN`

- **File**: `/home/user/AstraLink/backend/src/dating/dating.controller.ts` (Lines 27, 36)
  ```typescript
  parseInt(matchId);
  ```
  Same issue repeated

---

## MEDIUM-PRIORITY ISSUES

### 16. Missing Null/Undefined Checks

- **File**: `/home/user/AstraLink/backend/src/chart/chart.service.ts` (Lines 196-198)
  ```typescript
  private generatePredictions(natalChart: any, currentPlanets: any, period: string) {
    const predictions = { /*...*/ };
    const natalPlanets = natalChart.data?.planets || natalChart.planets || {};
    const current = currentPlanets.planets || {};
  ```
  **Problem**: Accessing properties without checking if objects exist

---

### 17. Controller Parameter Validation

**Issue**: No validation of Request object user property

- **File**: `/home/user/AstraLink/backend/src/auth/auth.controller.ts` (Line 36)
  ```typescript
  async getProfile(@Request() req) {
    return req.user;
  }
  ```
  **Problem**:
  - No type annotation for `req`
  - No validation that `req.user` exists
  - If JwtAuthGuard fails, could return undefined

---

### 18. Aspect Calculation Logic Duplication

**Issue**: Aspect calculation exists in multiple places

- **File 1**: `/home/user/AstraLink/backend/src/chart/chart.service.ts` (Lines 275-285)
- **File 2**: `/home/user/AstraLink/backend/src/services/ephemeris.service.ts` (Lines 337-361)

Both calculate aspects identically but separately

---

### 19. Hardcoded Configuration Values

- **File**: `/home/user/AstraLink/backend/src/auth/auth.service.ts` (Line 19)

  ```typescript
  const token = this.jwtService.sign(payload); // Uses 24h from module config
  ```

  - 24 hour expiry is hardcoded in auth.module.ts line 19

- **File**: `/home/user/AstraLink/backend/src/subscription/subscription.service.ts` (Line 35)
  ```typescript
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month hardcoded
  ```

---

### 20. No Request/Response Logging

**Issue**: No middleware for request/response logging despite complex business logic

- **Missing**: Request logging middleware for debugging
- **Missing**: Response time tracking

---

## LOW-PRIORITY ISSUES

### 21. Inconsistent File Organization

- Type definitions in `/types` directory but not referenced in DTOs
- No clear separation between data layer and business logic
- No repository pattern despite multiple services accessing same entities

---

### 22. Missing Prisma Features

- **File**: `/home/user/AstraLink/backend/prisma/schema.prisma` (Lines 28-35)
  ```prisma
  model Chart {
    id        Int      @id @default(autoincrement())
    userId    Int
    user      User     @relation(fields: [userId], references: [id])
    data      Json
  ```
  **Issue**: No `onDelete: Cascade` for foreign keys - orphaned records possible

---

### 23. Swagger Documentation Issues

- **File**: `/home/user/AstraLink/backend/src/main.ts` (Lines 36-43)
  - Uses generic descriptions
  - No request/response examples
  - No error response documentation

---

### 24. Date/Time Handling Inconsistencies

- **File**: `/home/user/AstraLink/backend/src/auth/auth.service.ts` (Line 40, 111)
  ```typescript
  birthDate: user.birthDate?.toISOString().split('T')[0] || undefined,
  ```
  **Problem**: Manual date parsing instead of using Prisma field transformer

---

### 25. No Validation Interceptor

**Issue**: Zod schemas imported but not used via ValidationPipe

```typescript
// In types, but never validated:
LoginRequestSchema, SignupRequestSchema, UpdateProfileRequestSchema, etc.
```

---

## RECOMMENDATIONS

### Critical Fixes (Priority 1)

1. [ ] Create global exception filter to standardize error responses
2. [ ] Fix exception types (use BadRequestException for validation, NotFoundException for resources)
3. [ ] Extract location lookup to shared utility/service
4. [ ] Remove mock data from DatingService; implement database queries
5. [ ] Remove hardcoded JWT secret fallback
6. [ ] Add transaction management for multi-step operations

### High Priority (Priority 2)

1. [ ] Add try-catch blocks or implement global error handling in controllers
2. [ ] Validate all URL parameters (parseInt validation)
3. [ ] Implement consistent Zod validation with ValidationPipe
4. [ ] Remove or restrict CORS wildcard
5. [ ] Add proper type annotations and remove `as any` casts

### Medium Priority (Priority 3)

1. [ ] Reduce logging verbosity in production paths
2. [ ] Add null/undefined checks throughout
3. [ ] Consolidate duplicate aspect calculation logic
4. [ ] Add request/response logging middleware
5. [ ] Implement proper Prisma cascade delete
6. [ ] Add validation that from < to for transit queries

### Code Quality (Priority 4)

1. [ ] Add comprehensive test coverage
2. [ ] Implement repository pattern for data access
3. [ ] Add request/response examples to Swagger
4. [ ] Create shared utilities for common operations
5. [ ] Document error response formats

---

## Files Affected Summary

**Controllers**: 6 files

- auth.controller.ts
- user.controller.ts
- chart.controller.ts
- connections.controller.ts
- dating.controller.ts
- subscription.controller.ts

**Services**: 6 files

- auth.service.ts (password validation, exception types)
- user.service.ts (generic Error usage)
- chart.service.ts (complex logic, duplicates, validation)
- connections.service.ts (code duplication)
- dating.service.ts (mock data)
- subscription.service.ts (validation inconsistency)

**Infrastructure**: 7 files

- main.ts (CORS, error handling)
- auth.middleware.ts (auth logic, custom responses)
- jwt.strategy.ts (hardcoded secret)
- auth.module.ts (improper exports)
- ephemeris.service.ts (error handling, logging)
- prisma.schema (missing constraints)

**Types/Validation**: 6 files

- All type definition files in `/types` (validation not enforced)
