# Circular Dependencies Refactoring Plan

**Date:** 2025-11-15
**Phase:** Phase 3 - Architecture Improvements
**Status:** Analysis Complete, Ready for Implementation

---

## 🔍 Discovered Circular Dependencies

### 1. **AuthModule ↔ ChartModule** (Bidirectional - CRITICAL)

**Direction 1: AuthModule → ChartModule**
- **Location:** `backend/src/auth/supabase-auth.service.ts:885`
- **Problem:** `SupabaseAuthService` directly injects `ChartService`
- **Usage:** Creating natal chart during `completeSignup()` flow
```typescript
constructor(
  private supabaseService: SupabaseService,
  private chartService: ChartService,  // ❌ Creates circular dependency
  private ephemerisService: EphemerisService,
) {}
```

**Direction 2: ChartModule → AuthModule**
- **Location:** `backend/src/chart/chart.controller.ts:27`
- **Problem:** Controllers use `@UseGuards(SupabaseAuthGuard)` and `@Public` decorator
- **Files Affected:**
  - `chart.controller.ts` - Uses guard + decorator
  - `personal-code.controller.ts` - Uses guard + decorator

### 2. **AdvisorModule → ChartModule** (Unidirectional - OK)
- **Location:** `backend/src/advisor/advisor.module.ts:22`
- **Status:** ✅ This is acceptable - one-way dependency doesn't create cycle
- **Note:** Keep as-is, but monitor for future issues

### 3. **AdvisorModule → AuthModule** (Unidirectional - FIXABLE)
- **Location:** `backend/src/advisor/advisor.module.ts:23`
- **Problem:** Uses `forwardRef(() => AuthModule)` unnecessarily
- **Reason:** Guards are already global (APP_GUARD in app.module.ts)

---

## 🎯 Refactoring Strategy

### **Fix #1: Remove ChartModule → AuthModule dependency**

**Root Cause:** ChartModule imports AuthModule for guards and decorators

**Solution:** Guards and decorators should be globally available

**Implementation Steps:**
1. ✅ **Verify global guard is configured**
   - Check `app.module.ts` has `APP_GUARD` with `SupabaseAuthGuard`
   - Already configured: Yes (line 92)

2. **Remove AuthModule import from ChartModule**
   - Remove `forwardRef(() => AuthModule)` from `chart.module.ts:27`
   - Guards work globally, no need to import module

3. **Move @Public decorator to CommonModule**
   - Decorators should be in shared infrastructure, not auth-specific module
   - Move `backend/src/auth/decorators/public.decorator.ts` → `backend/src/common/decorators/`
   - Update imports in all controllers

**Impact:**
- ✅ Eliminates half of bidirectional cycle
- ✅ Better separation of concerns
- ✅ Guards become truly global

---

### **Fix #2: Remove AuthModule → ChartModule dependency**

**Root Cause:** SupabaseAuthService directly injects ChartService

**Solution:** Event-driven architecture (already available!)

**Implementation Steps:**
1. **Create UserSignupCompletedEvent**
   ```typescript
   // backend/src/auth/events/user-signup-completed.event.ts
   export class UserSignupCompletedEvent {
     constructor(
       public readonly userId: string,
       public readonly birthData: BirthData,
     ) {}
   }
   ```

2. **Emit event in SupabaseAuthService.completeSignup()**
   ```typescript
   // Instead of:
   await this.chartService.createNatalChart(userId, birthData);

   // Do:
   this.eventEmitter.emit(
     'user.signup.completed',
     new UserSignupCompletedEvent(userId, birthData)
   );
   ```

3. **Listen to event in ChartModule**
   ```typescript
   // backend/src/chart/listeners/user-signup.listener.ts
   @OnEvent('user.signup.completed')
   async handleUserSignupCompleted(event: UserSignupCompletedEvent) {
     await this.chartService.createNatalChart(
       event.userId,
       event.birthData
     );
   }
   ```

4. **Remove ChartModule import from AuthModule**
   - Remove `forwardRef(() => ChartModule)` from `auth.module.ts:21`
   - Remove `ChartService` injection from `SupabaseAuthService`

**Benefits:**
- ✅ Eliminates second half of bidirectional cycle
- ✅ Loose coupling through events
- ✅ Better testability (can test auth without chart logic)
- ✅ Follows CQRS/Event-Driven patterns
- ✅ EventEmitterModule already configured in app.module.ts!

---

### **Fix #3: Remove unnecessary AdvisorModule → AuthModule forwardRef**

**Root Cause:** Mistaken belief that AuthModule must be imported for guards

**Solution:** Remove forwardRef since guards are global

**Implementation Steps:**
1. **Remove forwardRef from AdvisorModule**
   - Change `forwardRef(() => AuthModule)` to just remove the import
   - Guards work globally via APP_GUARD

**Impact:**
- ✅ Simpler module dependency graph
- ✅ No performance overhead from forwardRef
- ✅ Clearer module boundaries

---

## 📊 Before vs After Dependency Graph

### Before (Current State):
```
┌─────────────┐         ┌─────────────┐
│ AuthModule  │←───────→│ ChartModule │
└─────────────┘         └─────────────┘
      ↑                        ↑
      │                        │
      └────────┬───────────────┘
               │
        ┌──────────────┐
        │AdvisorModule │
        └──────────────┘

Issues:
❌ Bidirectional dependency (Auth ↔ Chart)
❌ Unnecessary forwardRefs
❌ Tight coupling
```

### After (Refactored):
```
┌─────────────┐                    ┌─────────────┐
│ AuthModule  │──event──────────→│ ChartModule │
└─────────────┘                    └─────────────┘
                                         ↑
                ┌────────────────────────┘
                │
        ┌──────────────┐
        │AdvisorModule │
        └──────────────┘

        ┌──────────────┐
        │ CommonModule │ (Decorators, Guards shared)
        └──────────────┘

Benefits:
✅ No circular dependencies
✅ Event-driven communication
✅ Loose coupling
✅ Better testability
✅ Clear separation of concerns
```

---

## 🚀 Implementation Order

### **Phase 1: Low-Risk Changes (30 min)**
1. Move @Public decorator to CommonModule
2. Remove AuthModule import from ChartModule
3. Remove AuthModule forwardRef from AdvisorModule
4. Test: Ensure guards still work

### **Phase 2: Event-Driven Refactoring (1-2 hours)**
1. Create UserSignupCompletedEvent
2. Create UserSignupListener in ChartModule
3. Modify SupabaseAuthService to emit event
4. Remove ChartModule import from AuthModule
5. Remove ChartService injection from SupabaseAuthService
6. Test: Complete signup flow end-to-end

### **Phase 3: Verification (30 min)**
1. Build project: `npm run build`
2. Run tests: `npm test`
3. Verify no forwardRef() remains
4. Check module import graph (no cycles)
5. Integration test all affected flows

---

## 🧪 Testing Strategy

### **Unit Tests:**
- `SupabaseAuthService.completeSignup()` - verify event emission
- `UserSignupListener` - verify chart creation from event
- Controllers - verify guards still protect endpoints

### **Integration Tests:**
- Complete signup flow (email → chart creation)
- Protected endpoints still require auth
- @Public endpoints bypass auth

### **Regression Tests:**
- Existing auth flows unaffected
- Chart creation still works
- Advisor endpoints still protected

---

## 📈 Expected Outcomes

### **Code Quality:**
- ✅ Zero circular dependencies
- ✅ SOLID principles (Single Responsibility)
- ✅ Event-driven architecture
- ✅ Better testability

### **Performance:**
- ✅ Faster NestJS module initialization
- ✅ No forwardRef overhead
- ✅ Cleaner dependency graph

### **Maintainability:**
- ✅ Easier to reason about module relationships
- ✅ Can test modules in isolation
- ✅ Can swap implementations easily
- ✅ Future-proof architecture

---

## 🎓 Key Learnings

1. **Guards Should Be Global**
   - Use `APP_GUARD` provider in app.module.ts
   - Don't import AuthModule in every module

2. **Decorators in CommonModule**
   - Infrastructure decorators (@Public) don't belong in feature modules
   - Keep them in shared/common modules

3. **Prefer Events Over Direct Injection**
   - Breaks tight coupling
   - Enables async processing
   - Better separation of concerns
   - Already have EventEmitterModule!

4. **forwardRef Is a Code Smell**
   - Usually indicates architectural problem
   - Should be eliminated, not worked around

---

**Ready for Implementation:** Yes ✅
**Risk Level:** Low (event system already in place)
**Estimated Time:** 2-3 hours
**Breaking Changes:** None (internal refactoring only)
