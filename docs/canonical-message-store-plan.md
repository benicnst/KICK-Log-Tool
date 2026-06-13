# Canonical Message Store Refactor Plan

## Goal

Unify comment ingestion, display, detection, and persistence around a single canonical message store so that:

- WS / DOM / API messages are treated as the same logical records.
- detection cards always point to the actual detected comment.
- popup history, Active counts, and detection list all read from the same source of truth.
- localStorage restore behaves consistently after reload or browser restart.

This plan is intentionally staged. The current code has several overlapping stores, and replacing them in one pass would create avoidable regressions.

## Current Data Flow

### Input path

All three sources eventually call `rememberMessage(...)` in `/Users/elefant/Desktop/APP/KICK_Chat_history/content.js`.

- WS: `rememberRealtimeWsMessage(...) -> rememberMessage(...)`
- DOM: row scanners / profile fallback -> `rememberMessage(...)`
- API: `rememberApiMessage(...) -> rememberMessage(...)`

This is already the best existing convergence point.

### Current stores

#### 1. `userHistory`

Role:
- Primary per-user history.
- Main input normalization target.
- Main source for detection logic.

Shape:
- `Map<userKey, { displayName, messages[] }>`
- `messages[]` contains:
  - `id`
  - `text`
  - `timestamp`
  - `postedAt`
  - `receivedAt`
  - `timestampConfidence`
  - `latencyMs`
  - `isDelayed`
  - `source`
  - `timestampKind`

Problems:
- Message identity is nested under user arrays, so direct message lookups are awkward.
- Detection and UI have to rediscover the same message later.

#### 2. `streamMessageCacheByUser`

Role:
- Fast display cache.
- Active/user count source.
- Recent message retrieval for popups.

Shape:
- `Map<userKey, { displayName, items: Map<cacheKey, entry> }>`
- entry contains:
  - `cacheKey`
  - `messageId`
  - `idKind`
  - `realId`
  - `text`
  - `timestamp`
  - `postedAt`
  - `receivedAt`
  - `timestampConfidence`
  - `latencyMs`
  - `isDelayed`
  - `source`
  - `timestampKind`

Problems:
- Holds largely the same facts as `userHistory`.
- Creates a second truth for UI and statistics.
- Requires custom merge logic when rendering display history.

#### 3. `suspiciousUsers`

Role:
- Detection summary store for popup/background UI.

Shape:
- `Map<userKey, { username, profileUrl, avatarUrl, detectionCategory, reasons, riskScore, riskRuleCount, riskCritical, evidenceTexts, firstDetectedAt, lastDetectedAt, detectedMessageAt, detectedMessageText, lastCommentAt, messageCount, lastMessage }>`

Problems:
- Stores `detectedMessageText` as a copied string instead of a message reference.
- Stores `lastMessage` as copied text as well.
- This is the main reason detection list text/time can drift from actual popup history.

#### 4. localStorage

Role:
- Persistence across reload and browser restart.

Current split:
- `storageKey`
  - `__meta`
  - `__streamCache`
  - user history payload
- `storageKey + ":suspicious"`
  - suspicious user summaries

Problems:
- History and detection are persisted separately.
- The stored format encodes the current duplication.

#### 5. `background.js` report cache

Role:
- Tab-scoped transient UI handoff.
- Badge updates.

This is not a canonical store. It should remain a transport cache only.

## Proposed Target Architecture

### A. `messageStore`

Single source of truth for all messages.

Suggested shape:

- `Map<messageKey, MessageRecord>`

`MessageRecord`:
- `channelKey`
- `streamKey`
- `userKey`
- `displayName`
- `avatarUrl`
- `messageId`
- `messageKey`
- `idKind`
- `text`
- `postedAt`
- `receivedAt`
- `source`
- `timestampKind`
- `timestampConfidence`
- `latencyMs`
- `isDelayed`

Notes:
- `messageKey` should be canonical.
- Preferred key order:
  1. strong real ID
  2. synthetic stable fallback from source + user + normalized text + postedAt

### B. `userIndex`

User lookup index derived from `messageStore`.

Suggested shape:

- `Map<userKey, { displayName, avatarUrl, messageKeys: Set<string> }>`

Role:
- Efficient popup history rendering.
- Active user counting.
- Per-user detection evaluation.

This should be derived and repairable from `messageStore`.

### C. `detectionStore`

Detection summary keyed by user, but message-linked.

Suggested shape:

- `Map<userKey, DetectionRecord>`

`DetectionRecord`:
- `username`
- `profileUrl`
- `avatarUrl`
- `detectionCategory`
- `reasons`
- `riskScore`
- `riskRuleCount`
- `riskCritical`
- `evidenceTexts`
- `firstDetectedAt`
- `lastDetectedAt`
- `detectedMessageId`
- `detectedMessageKey`

Important:
- `detectedMessageText` should become derived UI data.
- `detectedMessageAt` should become derived from the referenced message.
- `lastMessage` should become derived from `messageStore`.

### D. Persistence format

Versioned storage should move to a single payload.

Suggested top-level shape:

```json
{
  "__meta": {
    "version": 3,
    "channelSlug": "",
    "streamKey": "",
    "updatedAt": 0,
    "startedAt": 0,
    "startedAtIso": "",
    "isLive": true,
    "isLiveKnown": true
  },
  "__messageStore": {
    "messages": {}
  },
  "__userIndex": {
    "users": {}
  },
  "__detectionStore": {
    "users": {}
  }
}
```

The index sections may be persisted or rebuilt at load time. Rebuilding is safer. Persist only if load cost becomes a real problem.

## What Must Stay Stable During Migration

These behaviors must not change while the internals are being replaced:

1. WS remains the preferred realtime source.
2. DOM remains fallback/complementary.
3. API remains limited supplemental history fetch.
4. Detection list survives reload.
5. Active count still means unique commenting users within 10 minutes.
6. Channel separation remains strict.
7. Existing popup pinning / dragging UX stays unchanged.

## Risks and Side Effects

### Risk 1: Duplicate handling regression

Why it matters:
- Dedup currently exists in multiple places:
  - `findDuplicateMessage(...)`
  - `findDuplicateDisplayMessageKey(...)`
  - stream cache entry identity

Failure mode:
- same message appears twice
- same message disappears
- WS and DOM merge badly

Mitigation:
- Keep current duplicate heuristics during phase 1.
- Only move storage first, not duplicate policy.

### Risk 2: Detection text/time regression

Why it matters:
- Current UI sometimes shows the wrong text because summaries store copied text.

Failure mode:
- detection list text disappears
- relative time disappears
- highlighted popup row no longer matches card text

Mitigation:
- Introduce `detectedMessageKey` before deleting `detectedMessageText`.
- Keep `detectedMessageText` as compatibility output until popup/background are fully switched.

### Risk 3: Active count drift

Why it matters:
- Active currently reads from `streamMessageCacheByUser`.

Failure mode:
- count drops unexpectedly
- API backfill no longer affects Active

Mitigation:
- Do not change the 10-minute definition.
- Switch Active to canonical-store-derived messages only after ingestion writes are proven.

### Risk 4: localStorage migration break

Why it matters:
- Existing users already have stored histories and detections.

Failure mode:
- everything looks empty after upgrade
- stream-specific cache lost

Mitigation:
- Support reading version 2 and writing version 3.
- Migrate in memory on load, then save in new format.

### Risk 5: background/popup mismatch

Why it matters:
- popup merges content report and background report.

Failure mode:
- counts remain but list cards disappear
- report merges revive stale text

Mitigation:
- background should carry only normalized detection summaries.
- popup should derive preview text from `detectedMessageKey` if available.

## Migration Strategy

### Phase 0: Document and freeze behavior

Do before edits:
- capture current meanings of Active, popup order, detection tab grouping, and persistence boundaries

Status:
- this document

### Phase 1: Add canonical store without switching readers

Tasks:
- add `messageStore`
- add `userIndex`
- write every accepted message into canonical store from `rememberMessage(...)`
- derive `userIndex` writes from the same acceptance path

Rules:
- keep `userHistory`
- keep `streamMessageCacheByUser`
- keep `suspiciousUsers`

Goal:
- no visible behavior change
- new store fills silently

### Phase 2: Load/save migration layer

Tasks:
- introduce storage version 3
- support loading version 2 payloads
- build canonical store from old `userHistory` and `__streamCache`
- rebuild indices on load

Rules:
- write both old and new structures temporarily if needed
- do not delete old reads until validation passes

### Phase 3: Switch read paths

Order:
1. popup display messages
2. Active calculation
3. detection evaluation
4. evidence selection and popup line highlighting

Rules:
- each switch should be isolated and verifiable
- if one area regresses, roll back that reader only

### Phase 4: Detection record normalization

Tasks:
- add `detectedMessageKey`
- update `rememberDetectedUser(...)` to store keys instead of copied text as the primary reference
- make `detectedMessageText`, `detectedMessageAt`, `lastMessage`, `lastCommentAt` derived compatibility fields

Goal:
- eliminate text/time drift

### Phase 5: Shrink or remove redundant stores

Candidates:
- reduce `streamMessageCacheByUser` to a true derived view cache
- reduce `userHistory` to either:
  - compatibility wrapper over `messageStore`
  - or remove it fully

Decision rule:
- remove only after all readers use canonical data and diagnostics confirm parity

## Validation Checklist

### Ingestion

- WS message appears once
- DOM fallback does not create duplicate message rows
- API backfill inserts messages into canonical store
- numeric IDs from trusted sources still pass validation

### Popup history

- same user shows expected chronological list
- no duplicate lines from WS/DOM/API overlap
- emote rendering still works
- evidence line highlight still marks the right row

### Detection list

- detected card text matches actual detected popup row
- relative time is based on detected message, not arbitrary latest comment
- detected user remains listed until clear
- tab grouping still works when multiple categories apply

### Active and dashboard

- Active count equals unique commenters within 10 minutes
- API backfill within window affects Active
- messageCount remains consistent
- status bar still updates without lag spikes

### Persistence

- reload restores popup history
- reload restores detection list
- ended streams still clean up correctly
- per-channel separation remains intact

### Channel changes

- route change saves old stream state
- next channel does not inherit old messages
- auto-pinned users do not leak across channels

## Implementation Guardrails

1. Do not redesign UI during this refactor.
2. Do not change detection thresholds during this refactor.
3. Do not change API fetch policy during this refactor.
4. Prefer additive changes first, destructive cleanup later.
5. Keep diagnostics available until parity is proven.

## Recommended First Implementation Unit

The safest first code change is:

1. add canonical `messageStore`
2. add canonical `userIndex`
3. write to them from `rememberMessage(...)`
4. expose diagnostics for parity checks

This gives observability without changing behavior yet.
