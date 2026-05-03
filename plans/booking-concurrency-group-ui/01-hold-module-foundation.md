---
status: todo
mode: afk
---

# Phase 1: HoldModule Foundation

**User stories**: US 1 (room reserved on selection), US 6 (race conflict error), US 7 (abandoned holds auto-expire)

## What to build

A complete backend foundation for the room hold system, end-to-end from database to API. When a guest selects a room, the system creates a time-limited hold that blocks that inventory for all other guests. The availability engine is updated so every availability check accounts for active holds. A cron job keeps the holds table clean.

This phase has no frontend changes — it is verified entirely through the API.

**Database**: Add `RoomHold` model to Prisma schema and run migration.

**HoldModule**: New NestJS module exposing three operations:
- Create a hold for a given room type, date range, quantity, and session token. Throws a conflict error if `availableUnits < quantity` at the moment of creation. Hold expires 10 minutes from creation.
- Release a hold by session token (early release when guest proceeds to payment or navigates away).
- Count active hold quantity for a given room type and date range (used by AvailabilityModule).

**AvailabilityModule update**: The availability calculation changes from `totalUnits − confirmedBookings` to `totalUnits − confirmedBookings − activeHolds`. The API response gains two new fields: `availableUnits` (integer) and `scarce` (boolean, true when availableUnits ≤ 3).

**Cron cleanup**: A scheduled job runs every 60 seconds and deletes `RoomHold` records where `expiresAt < now`.

**API endpoints**:
- `POST /api/holds` — body: `{ roomTypeId, checkIn, checkOut, quantity, sessionToken }` — returns `{ holdId, expiresAt }` or 409 if unavailable
- `DELETE /api/holds/:sessionToken` — releases the hold; idempotent (no error if already gone)

**Tests**: HoldModule integration tests using a real test database — see Testing Decisions in the PRD.

## Acceptance criteria

- [ ] `RoomHold` table exists in the database after migration
- [ ] `POST /api/holds` creates a hold and returns `holdId` + `expiresAt` (now + 10 min)
- [ ] `POST /api/holds` returns 409 when `availableUnits < quantity` at time of request
- [ ] Two concurrent requests for the last available unit — only one succeeds, the other gets 409
- [ ] `DELETE /api/holds/:sessionToken` removes the hold; calling it twice does not error
- [ ] `GET /api/availability` returns `availableUnits` and `scarce: true` when ≤ 3 units remain after subtracting active holds
- [ ] An expired hold (past `expiresAt`) is not counted in availability
- [ ] Cron job deletes expired hold records from the database within 60 seconds of expiry
- [ ] All HoldModule integration tests pass against a real test database
