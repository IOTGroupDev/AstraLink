# Large Files Refactoring Plan - Phase 3

**Created:** 2025-11-16
**Status:** Planning
**Priority:** Medium

## Overview

Analysis of files >500 lines that need refactoring for better maintainability.

---

## Backend Files (15 files >500 lines)

### 🔴 Critical Priority (Business Logic)

#### 1. interpretation.service.ts - 1,308 lines
**Location:** `backend/src/services/interpretation.service.ts`
**Purpose:** Chart interpretation generation
**Issues:**
- Single file handling multiple interpretation types
- Complex business logic mixed with data processing
- Hard to test individual components

**Refactoring Plan:**
```
interpretation.service.ts (orchestrator)
├── interpreters/
│   ├── planet-interpreter.ts
│   ├── house-interpreter.ts
│   ├── aspect-interpreter.ts
│   └── ascendant-interpreter.ts
└── utils/
    ├── interpretation-formatter.ts
    └── interpretation-cache.ts
```

#### 2. horoscope-generator.service.ts - 1,265 lines
**Location:** `backend/src/services/horoscope-generator.service.ts`
**Purpose:** Horoscope generation (day/week/month)
**Issues:**
- Multiple generation strategies in one file
- Complex AI prompt construction
- Difficult to maintain different time periods

**Refactoring Plan:**
```
horoscope-generator.service.ts (orchestrator)
├── generators/
│   ├── daily-horoscope.generator.ts
│   ├── weekly-horoscope.generator.ts
│   └── monthly-horoscope.generator.ts
└── prompts/
    ├── horoscope-prompt-builder.ts
    └── horoscope-templates.ts
```

#### 3. chat.service.ts - 1,076 lines
**Location:** `backend/src/chat/chat.service.ts`
**Purpose:** Chat message handling and AI responses
**Issues:**
- Message processing, storage, and AI logic mixed
- Multiple responsibilities (CRUD + AI + validation)

**Refactoring Plan:**
```
chat.service.ts (main service)
├── message-processor.ts
├── ai-response-generator.ts
├── message-validator.ts
└── message-repository.ts
```

#### 4. dating.service.ts - 998 lines
**Location:** `backend/src/dating/dating.service.ts`
**Purpose:** Dating matching and compatibility
**Issues:**
- Complex matching algorithm
- Photo processing mixed with business logic
- Hard to unit test individual components

**Refactoring Plan:**
```
dating.service.ts (orchestrator)
├── matchers/
│   ├── compatibility-calculator.ts
│   ├── candidate-filter.ts
│   └── match-scorer.ts
└── processors/
    ├── photo-processor.ts
    └── profile-enricher.ts
```

#### 5. advisor.service.ts - 811 lines
**Location:** `backend/src/advisor/advisor.service.ts`
**Purpose:** AI advisor for astrological questions
**Issues:**
- AI prompt construction and response parsing mixed
- Rate limiting logic embedded
- Multiple conversation contexts

**Refactoring Plan:**
```
advisor.service.ts (main service)
├── advisor-prompt-builder.ts
├── advisor-context-manager.ts
└── advisor-response-parser.ts
```

### 🟡 Medium Priority (Support Services)

#### 6. astro-calculations.ts - 1,029 lines
**Location:** `backend/src/shared/astro-calculations.ts`
**Purpose:** Core astrological calculations
**Issues:**
- Multiple calculation types in one file
- Pure functions mixed with helper utilities

**Refactoring Plan:**
```
astro-calculations/
├── planet-calculations.ts
├── house-calculations.ts
├── aspect-calculations.ts
└── utils/
    ├── angle-utils.ts
    └── zodiac-utils.ts
```

#### 7. personal-code.service.ts - 881 lines
**Location:** `backend/src/chart/services/personal-code.service.ts`
**Purpose:** Personal numerology code generation
**Issues:**
- Calculation and interpretation mixed
- Multiple algorithm variants

**Refactoring Plan:**
```
personal-code.service.ts (main)
├── calculators/
│   ├── pythagorean-calculator.ts
│   └── chaldean-calculator.ts
└── interpreters/
    └── code-interpreter.ts
```

#### 8. ai.service.ts - 713 lines
**Location:** `backend/src/services/ai.service.ts`
**Purpose:** AI provider abstraction (Anthropic, OpenAI)
**Issues:**
- Multiple providers in one file
- Provider-specific logic mixed with common logic

**Refactoring Plan:**
```
ai.service.ts (facade)
└── providers/
    ├── anthropic.provider.ts
    ├── openai.provider.ts
    └── base-ai.provider.ts (interface)
```

#### 9. ephemeris.service.ts - 648 lines
**Location:** `backend/src/services/ephemeris.service.ts`
**Purpose:** Swiss Ephemeris wrapper
**Issues:**
- Planet calculations mixed with house calculations
- Transit calculations embedded

**Refactoring Plan:**
```
ephemeris.service.ts (main)
├── planet-ephemeris.ts
├── house-ephemeris.ts
└── transit-ephemeris.ts
```

### 🟢 Low Priority (Data & Config)

#### 10-11. astro-text/ru/data.ts (1,654) & en/data.ts (1,047)
**Location:** `backend/src/modules/shared/astro-text/*/data.ts`
**Purpose:** Astrological interpretation text data
**Decision:** **NO REFACTORING NEEDED**
- These are pure data files
- Breaking them up would reduce readability
- Currently well-organized

#### 12. astro-text/index.ts - 928 lines
**Location:** `backend/src/modules/shared/astro-text/index.ts`
**Purpose:** Text data exports and mappings
**Decision:** **LOW PRIORITY**
- Mostly exports and maps
- Could split by language if needed

#### 13. supabase.service.ts - 521 lines
**Location:** `backend/src/supabase/supabase.service.ts`
**Purpose:** Supabase client wrapper
**Refactoring Plan:**
```
supabase.service.ts (main)
├── supabase-storage.service.ts
├── supabase-auth.service.ts (already exists)
└── supabase-database.service.ts
```

#### 14. lunar.service.ts - 509 lines
**Location:** `backend/src/services/lunar.service.ts`
**Purpose:** Lunar calculations (phase, day, calendar)
**Refactoring Plan:**
```
lunar.service.ts (main)
├── lunar-phase-calculator.ts
├── lunar-day-calculator.ts
└── lunar-calendar-generator.ts
```

---

## Frontend Files (25 files >500 lines)

### 🔴 Critical Priority (Large Screens)

#### 1. CosmicSimulatorScreen.tsx - 1,965 lines
**Location:** `frontend/src/screens/CosmicSimulatorScreen.tsx`
**Purpose:** Interactive cosmic event simulator
**Issues:**
- Massive component with complex state
- Animation logic mixed with business logic
- Multiple sub-features in one screen

**Refactoring Plan:**
```
CosmicSimulatorScreen.tsx (main)
└── components/
    ├── PlanetarySimulator.tsx
    ├── TransitAnimator.tsx
    ├── AspectVisualizer.tsx
    └── SimulatorControls.tsx
```

#### 2. NatalChartScreen.tsx - 1,628 lines
**Location:** `frontend/src/screens/NatalChartScreen.tsx`
**Purpose:** Display natal chart with interpretation
**Issues:**
- Chart display mixed with data loading
- Multiple visualization modes
- Complex state management

**Refactoring Plan:**
```
NatalChartScreen.tsx (container)
└── components/
    ├── ChartWheel.tsx
    ├── PlanetList.tsx
    ├── AspectTable.tsx
    └── InterpretationPanel.tsx
```

#### 3. DatingCard.tsx - 1,626 lines
**Location:** `frontend/src/components/dating/DatingCard.tsx`
**Purpose:** Tinder-style dating card with compatibility
**Issues:**
- Swipe logic mixed with UI
- Complex animation handling
- Profile data processing embedded

**Refactoring Plan:**
```
DatingCard.tsx (main card)
├── hooks/
│   ├── useSwipeGestures.ts
│   └── useCompatibilityAnimation.ts
└── components/
    ├── ProfilePhoto.tsx
    ├── CompatibilityMeter.tsx
    └── ProfileInfo.tsx
```

#### 4. MagicLinkWaitingScreen.tsx - 1,098 lines
**Location:** `frontend/src/screens/Auth/MagicLinkWaitingScreen.tsx`
**Purpose:** Waiting screen for magic link authentication
**Issues:**
- Polling logic mixed with UI
- Animation and timer logic embedded
- Error handling scattered

**Refactoring Plan:**
```
MagicLinkWaitingScreen.tsx (main)
├── hooks/
│   ├── useMagicLinkPolling.ts
│   └── useCountdownTimer.ts
└── components/
    ├── WaitingAnimation.tsx
    └── EmailInstructions.tsx
```

#### 5. ChatDialogScreen.tsx - 1,089 lines
**Location:** `frontend/src/screens/ChatDialogScreen.tsx`
**Purpose:** 1-on-1 chat with message history
**Issues:**
- Message rendering mixed with sending logic
- Scroll management embedded
- Keyboard handling complex

**Refactoring Plan:**
```
ChatDialogScreen.tsx (container)
├── hooks/
│   ├── useChatMessages.ts
│   ├── useKeyboardAvoidance.ts
│   └── useScrollToBottom.ts
└── components/
    ├── MessageList.tsx
    ├── MessageInput.tsx
    └── MessageBubble.tsx
```

### 🟡 Medium Priority

#### 6. DatingScreen.tsx - 989 lines
**Refactor:** Extract card stack logic, candidate loading, match handling

#### 7. EditProfileScreen.tsx - 928 lines
**Refactor:** Split form sections, validation logic, image picker

#### 8. PersonalCodeScreen.tsx - 833 lines
**Refactor:** Code generation UI, interpretation display, sharing logic

#### 9. ProfileScreen.tsx - 815 lines
**Refactor:** Profile sections, settings panel, statistics widgets

#### 10. AdvisorChatScreen.tsx - 719 lines
**Refactor:** Similar to ChatDialogScreen, extract common chat logic

#### 11. UserDataLoaderScreen.tsx - 718 lines
**Refactor:** Loading states, data fetching hooks, error boundaries

#### 12. OptCodeScreen.tsx - 717 lines
**Refactor:** OTP input component, verification logic, timer

### 🟢 Low Priority (Data & Examples)

#### 13. lessons-database.ts - 833 lines
**Decision:** **NO REFACTORING NEEDED** - Pure lesson data

#### 14. Premiumfeatureexamples.tsx - 692 lines
**Decision:** **LOW PRIORITY** - Example/demo code

---

## Refactoring Strategy

### Phase 3A - Backend Critical Services (Week 1)
**Priority:** Business logic services
**Files:** interpretation.service.ts, horoscope-generator.service.ts, chat.service.ts

**Approach:**
1. Create new folder structure
2. Extract pure functions first
3. Create interfaces for extracted modules
4. Write unit tests for extracted components
5. Update main service to use new modules
6. Remove old code gradually

### Phase 3B - Frontend Large Screens (Week 2)
**Priority:** Screens >1000 lines
**Files:** CosmicSimulatorScreen, NatalChartScreen, DatingCard

**Approach:**
1. Extract custom hooks (state logic)
2. Create sub-components (UI pieces)
3. Move calculations to utils
4. Add component tests
5. Ensure no regression

### Phase 3C - Remaining Services (Week 3)
**Priority:** Medium priority backend files
**Files:** dating.service.ts, advisor.service.ts, ai.service.ts

### Phase 3D - Remaining Screens (Week 4)
**Priority:** Medium priority frontend screens
**Files:** MagicLinkWaitingScreen, ChatDialogScreen, etc.

---

## Success Metrics

- ✅ No file >500 lines (except pure data files)
- ✅ All extracted modules have >80% test coverage
- ✅ No functionality regressions
- ✅ Improved build performance
- ✅ Easier code navigation

---

## Estimated Impact

**Before:**
- 15 backend files >500 lines (avg: 875 lines)
- 25 frontend files >500 lines (avg: 780 lines)
- Difficult to test individual features
- Long review times for PRs

**After:**
- 0-3 files >500 lines (only data files)
- 100+ smaller, focused modules
- Each module testable independently
- Faster PR reviews
- Better developer experience

---

## Next Steps

1. ✅ Create this refactoring plan
2. ⏳ Start with interpretation.service.ts (1,308 lines)
3. ⏳ Extract planet-interpreter, house-interpreter, aspect-interpreter
4. ⏳ Add unit tests for extracted modules
5. ⏳ Continue with next critical file

**Status:** Ready to begin Phase 3A
