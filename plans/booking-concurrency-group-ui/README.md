---
status: active
---

# Plan: Booking Concurrency Protection, Group Booking & UI Overhaul

> Source PRD: `prds/2026-05-04-booking-concurrency-group-ui.md`

## Architectural Decisions

Durable decisions that apply across all phases:

- **Routes**: No new frontend routes. All changes are within `/book`, `/my-bookings`, and `/dashboard/bookings`. New API routes: `POST /api/holds`, `DELETE /api/holds/:sessionToken`, `GET /api/admin/holds/active`.
- **Schema**: Two changes to Prisma schema — new `RoomHold` model; `quantity Int @default(1)` field added to `Booking`.
- **Key models**: `RoomHold` (id, roomTypeId, checkIn, checkOut, quantity, sessionToken, expiresAt, createdAt); `Booking.quantity` (Int, default 1).
- **Availability formula**: `availableUnits = totalUnits − confirmedBookingsOverlap − activeHoldsOverlap`. Overlap condition: `record.checkIn < checkOut AND record.checkOut > checkIn`. Response includes `scarce: true` when `availableUnits ≤ 3`.
- **Hold lifecycle**: 10-minute TTL from creation. Availability query filters `expiresAt > now` — expired holds are invisible to availability without deletion. Cron cleanup runs every 60 seconds for table hygiene only.
- **Session token**: Cryptographically random UUID generated on the frontend at booking flow start, stored in `sessionStorage`. Not tied to auth.
- **Pricing**: `totalPrice = pricePerNight × numberOfNights × quantity`. Stripe amount in satang (THB smallest unit).
- **Authentication**: Hold creation is unauthenticated (session token sufficient). All existing guards unchanged.
- **Backwards compatibility**: Existing bookings implicitly have `quantity = 1` via Prisma migration default.

## Phases

1. [01-hold-module-foundation.md](./01-hold-module-foundation.md) — HoldModule Foundation
2. [02-quantity-booking-backend.md](./02-quantity-booking-backend.md) — Quantity Booking Backend
3. [03-hold-ui-countdown-timer.md](./03-hold-ui-countdown-timer.md) — Hold UI + Countdown Timer
4. [04-quantity-booking-ui.md](./04-quantity-booking-ui.md) — Quantity Booking UI
5. [05-guest-booking-page-ui-overhaul.md](./05-guest-booking-page-ui-overhaul.md) — Guest Booking Page UI Overhaul
6. [06-admin-dashboard-improvements.md](./06-admin-dashboard-improvements.md) — Admin Dashboard Improvements
