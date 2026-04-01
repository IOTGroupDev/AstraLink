# Dating Roadmap

## Product Direction

AstraLink Dating should not become a generic swipe clone.
The product should reach modern dating-app baseline UX while keeping
astrological compatibility as the main ranking, storytelling, and retention layer.

## P0 Foundation

Goal: remove fake data and make the current dating flow trustworthy.

### Slice 1: Real Feed Contract

- Expand `/dating/candidates` to return real profile fields:
  `photos[]`, `lookingFor`, `lastActive`, `city`, `bio`, `interests`, `zodiacSign`.
- Stop generating synthetic profile fields on the frontend.
- Keep only safe null fallbacks such as generic user name.

### Slice 2: Honest Card UI

- Remove fake profession, height, and random distance from dating cards.
- Show only real profile fields.
- Support multiple photos in card/profile flow.
- Add proper empty/error/retry states.

### Slice 3: Safety Baseline

- Add `block` and `report` actions directly from dating UI.
- Hide blocked users from feed and chat entry points.
- Surface moderation outcomes cleanly in the UI.

### Slice 4: Feed Coherence

- Align `GET /dating/candidates` and legacy `GET /dating/matches`.
- Keep one main discovery contract and one main ranking path.
- Add telemetry for feed impressions, likes, passes, matches, chat opens.

## P1 Competitor Parity

Goal: match baseline expectations from Tinder, Bumble, and Hinge.

### Slice 5: Rich Profiles

- Add 3 profile prompts.
- Support prompt-level likes/comments.
- Add fuller profile view from the card.

### Slice 6: Discovery and Filters

- Build filter sheet: age, city, intention, active now, distance.
- Add saved filters.
- Add `Top Picks` / `Standouts` lane.

### Slice 7: Better Match Initiation

- Add pre-match astro compliment.
- Add first-message suggestions based on compatibility.
- Add undo / rewind and stronger signal mechanics.

### Slice 8: Presence and Media

- Show `active now` / `recently active`.
- Add voice intro or voice notes in dating flow.
- Reuse existing chat/presence infrastructure where possible.

## P2 Astrology Moat

Goal: make astrology visible, useful, and monetizable across the whole dating loop.

### Slice 9: Explainable Compatibility

- Turn `% compatibility` into explainable sections:
  passion, emotions, communication, long-term.
- Show `why this match` and `top strengths / growth points`.

### Slice 10: Cosmic Discovery

- Add astrological lanes:
  `Best long-term potential`, `Strong Venus-Mars`, `Moon-safe matches`.
- Add sign/element-based exploration and ranking explanations.

### Slice 11: Astrology in Conversation

- Generate astro-first icebreakers.
- Suggest best time to text/date using transits.
- Add AI-generated date ideas and mismatch warnings.

### Slice 12: Premium Layer

- Premium deep synastry report.
- `Cosmic Signal` as premium strong-intent action.
- Weekly curated cosmic picks and advanced compatibility insights.

## Execution Order

1. P0 Slice 1: Real Feed Contract
2. P0 Slice 2: Honest Card UI
3. P0 Slice 3: Safety Baseline
4. P0 Slice 4: Feed Coherence
5. P1 Slice 5: Rich Profiles
6. P1 Slice 6: Discovery and Filters
7. P1 Slice 7: Better Match Initiation
8. P1 Slice 8: Presence and Media
9. P2 Slice 9-12

## Current Status

- Completed: `P0 Slice 1`, `P0 Slice 2`, `P0 Slice 3`
- In progress: `P0 Slice 4`
