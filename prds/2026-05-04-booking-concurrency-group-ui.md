# PRD: Booking Concurrency Protection, Group Booking & UI Overhaul

*Date: 2026-05-04*

---

## Problem Statement

The current PMS booking system has three compounding problems that hurt both guests and hotel operations:

1. **Race conditions under high demand** — When multiple guests try to book the last available room simultaneously, the system has no hold mechanism. Two guests can both see "1 room available," both proceed through checkout, and the second one only discovers the conflict at payment time with a confusing error. This causes lost bookings and poor guest experience during peak periods.

2. **No group booking support** — A guest who needs multiple rooms (family, small group, tour operator) must complete the entire booking flow repeatedly, once per room. Each separate checkout risks availability changing between sessions, and there is no way to pay for all rooms in a single Stripe transaction.

3. **Booking UI lacks clarity and conversion signals** — Room cards show minimal information, the 4-step progress flow does not clearly communicate where the guest is, there are no scarcity signals when rooms are running low, and the admin dashboard is a flat table with no operational at-a-glance summary.

---

## Solution

Three coordinated improvements to the PMS:

1. **Room Hold System** — When a guest selects a room, the system creates a 10-minute hold that reserves inventory against other guests. The availability engine is updated to subtract active holds from available units. A countdown timer is shown to the guest, escalating to a sticky banner when time is nearly up. If the hold expires, a modal prompts the guest to re-select.

2. **Quantity / Group Booking** — A `+/-` stepper on each room card lets a guest select multiple rooms of the same type in a single checkout session. One Stripe transaction covers all rooms. One booking record with a `quantity` field is created. The confirmation email clearly states quantity.

3. **UI Overhaul** — The guest booking page gets redesigned room cards, a clear labeled step progress indicator, scarcity labels when availability is low, and a hold countdown timer. The admin dashboard gets a today's-snapshot header (arrivals, departures, unpaid, active holds) and color-coded rows for urgency.

---

## User Stories

### Guest — Concurrency & Hold

1. As a guest, I want the room I selected to be temporarily reserved for me, so that another guest cannot take it while I am filling in my details and proceeding to payment.
2. As a guest, I want to see a countdown timer showing how long my room hold is valid, so that I know how much time I have to complete the booking.
3. As a guest, I want the countdown timer to escalate to a prominent banner when less than 3 minutes remain on my hold, so that I am clearly warned before it expires.
4. As a guest, I want to see a modal notification when my hold expires, so that I understand why the room is no longer available and can easily start over.
5. As a guest, I want to be taken back to room selection from the expired hold modal with one click, so that I can try to book another available room without losing my date selection.
6. As a guest, when I try to select a room that was just taken by another guest in the same instant, I want to see a clear message "This room just became unavailable, please select again," so that I am not confused by a generic error.
7. As a guest, I want holds from guests who abandoned checkout to automatically expire, so that rooms do not stay blocked unnecessarily.

### Guest — Group / Quantity Booking

8. As a guest, I want to select more than one room of the same type in a single booking session, so that I can book for a group without going through checkout multiple times.
9. As a guest, I want to see a `+/-` stepper on each room card to select quantity, so that adjusting the number of rooms is intuitive and immediate.
10. As a guest, I want the quantity stepper to be capped at the number of rooms currently available (minus active holds), so that I cannot accidentally select more rooms than exist.
11. As a guest, I want the total price to update instantly as I change the quantity, so that I always know the correct amount before proceeding.
12. As a guest, I want to pay for all selected rooms in a single Stripe checkout, so that I only need to enter my payment details once.
13. As a guest, I want my confirmation email to clearly state the quantity booked (e.g., "2 x Deluxe Room — Total: 6,000 THB"), so that I have an accurate record of what I paid for.
14. As a guest, I want the booking confirmation page to show the quantity of rooms booked, so that I can verify my group booking is correct.

### Guest — UI / Booking Page

15. As a guest, I want room cards to display a large room image, the room name, maximum occupancy, and price per night in a clear visual hierarchy, so that I can compare rooms at a glance.
16. As a guest, I want to see a labeled step progress indicator (e.g., "1. Dates → 2. Room → 3. Details → 4. Confirm") at all times during checkout, so that I always know where I am in the process.
17. As a guest, I want completed steps to be visually marked as done and the current step highlighted, so that I can orient myself quickly.
18. As a guest, I want to see "Only X rooms left!" on a room card when availability drops to 3 or fewer units, so that I feel appropriate urgency to complete my booking.
19. As a guest, I want the booking flow to be fully usable on a mobile device, so that I can complete a reservation comfortably from my phone.
20. As a guest, I want the checkout summary panel to show room name, dates, number of nights, quantity, and total price clearly, so that I can verify everything before paying.

### Admin — Dashboard

21. As an admin, I want a snapshot header at the top of the bookings dashboard showing arrivals today, departures today, pending unpaid bookings, and currently active holds, so that I can assess operational status the moment I open the page.
22. As an admin, I want booking table rows to be color-coded by urgency (e.g., PENDING + unpaid highlighted in amber, overdue holds in red), so that I can identify items that need attention without reading every status badge.
23. As an admin, I want to see the count of active room holds in the dashboard header, so that I understand how much inventory is temporarily locked and by how many guests.
24. As an admin, I want CONFIRMED bookings checking in today to be visually distinct in the table, so that I can prepare for arrivals efficiently.

---

## Implementation Decisions

### New Module: HoldModule (NestJS)

A dedicated `HoldModule` encapsulates all hold logic behind a simple interface:

- `createHold(roomTypeId, quantity, sessionToken)` → creates a `RoomHold` record with `expiresAt = now + 10 minutes`; throws `ConflictException` if insufficient units are available after accounting for existing confirmed bookings and active holds
- `releaseHold(sessionToken)` → deletes the hold record for that session
- `getActiveHoldsCount(roomTypeId, checkIn, checkOut)` → returns total quantity held for a given room type and date range (only non-expired records)
- A scheduled cleanup job (cron) deletes expired holds periodically (every 1–2 minutes) to keep the table lean

This module is intentionally deep: the rest of the system (AvailabilityModule, BookingModule) calls it through this interface and never touches the `RoomHold` table directly.

### Schema Changes

**New model: `RoomHold`**
- `id` — UUID primary key
- `roomTypeId` — FK to RoomType
- `checkIn` — Date
- `checkOut` — Date
- `quantity` — Int (default 1)
- `sessionToken` — String (unique per guest session, generated client-side or server-side)
- `expiresAt` — DateTime (now + 10 minutes)
- `createdAt` — DateTime

**Modified model: `Booking`**
- Add `quantity` Int field (default 1, min 1)

### Availability Engine Update

Updated formula:

```
availableUnits(roomTypeId, checkIn, checkOut) =
  totalUnits(roomTypeId)
  - confirmedBookingsOverlap(roomTypeId, checkIn, checkOut)   // existing logic, counts quantity
  - activeHoldsOverlap(roomTypeId, checkIn, checkOut)         // new: sums quantity of non-expired RoomHold records
```

Both overlap conditions use: `record.checkIn < checkOut AND record.checkOut > checkIn`

Scarcity threshold: when `availableUnits ≤ 3`, the API response includes a `scarce: true` flag and `availableUnits` count.

### Booking Flow Changes

1. Guest selects room + quantity → frontend calls `POST /api/holds` with `{ roomTypeId, checkIn, checkOut, quantity, sessionToken }`
2. Backend creates hold; returns `{ holdId, expiresAt }` or `409 Conflict` if unavailable
3. Guest fills in details → calls `POST /api/bookings` (unchanged structure, now includes `quantity`)
4. Backend: releases hold, creates PENDING booking, creates Stripe session
5. Stripe webhook confirms → CONFIRMED + PAID, send email with quantity in template
6. If guest abandons: hold expires after 10 minutes automatically; cron cleans up expired records

### API Contract Additions

```
POST /api/holds                          — create a room hold (guest)
DELETE /api/holds/:sessionToken          — release a hold early (guest)
GET  /api/admin/holds/active             — count of active holds by room type (admin)
```

Existing endpoints remain unchanged; `POST /api/bookings` gains optional `quantity` field (defaults to 1 for backwards compatibility).

### Pricing Calculation Update

`totalPrice = pricePerNight × numberOfNights × quantity`

Stripe line item amount updated accordingly. Confirmation email template updated to show quantity.

### UI Components

**Guest Booking Page (`/book`)**
- `StepIndicator` component — labeled steps, active/completed states
- `RoomCard` component — redesigned with image, occupancy badge, price, stepper, scarcity label
- `HoldTimer` component — reads `expiresAt` from hold response, renders countdown; switches to sticky banner mode at < 3 minutes; triggers expired modal at 0
- `HoldExpiredModal` component — shown on timer expiry; button resets to room selection step, preserves selected dates

**Admin Dashboard**
- `DashboardSnapshot` component — server-rendered header with today's stats (arrivals, departures, unpaid count, active holds count)
- `BookingRow` — applies Tailwind color variants based on urgency rules:
  - Amber: `status === PENDING && paymentStatus === UNPAID`
  - Green: check-in date is today and status is CONFIRMED
  - Default: all others

### Authentication & Authorization

No changes. Hold creation is unauthenticated (session token is sufficient); booking creation retains existing JWT guard behavior.

---

## Testing Decisions

### What makes a good test

- Test **external behavior** through the public interface of each module, not internal implementation details
- Use a real test database (PostgreSQL), never mock the DB layer
- Each test must be isolated — use transaction rollback or truncate between tests
- Time-sensitive tests (hold expiry) should use injectable clock or explicit `expiresAt` override

### Modules to test

| Module | Test Type | Key Scenarios |
|---|---|---|
| `HoldModule` | Unit + Integration | Hold created successfully; hold blocked when insufficient units; two concurrent hold requests for last unit — only one succeeds; expired hold not counted in availability; `getActiveHoldsCount` returns correct sum of quantities |
| `AvailabilityModule` | Integration | Available units = totalUnits − confirmedBookings − activeHolds; scarce flag set when ≤ 3 units; holds for different date ranges do not affect availability; expired holds ignored |
| `BookingModule` | Integration | Booking created with quantity > 1; totalPrice = rate × nights × quantity; hold released on booking creation; booking with quantity reduces availability by quantity |
| `PaymentModule` | Integration (Stripe mock) | Stripe line item amount reflects quantity × nights × rate; webhook confirm idempotent with stripeSessionId check |
| `NotificationModule` | Unit (email mock) | Confirmation email contains quantity label "2 x Deluxe Room"; email triggered on CONFIRMED status |

---

## Out of Scope

- Booking multiple **different** room types in a single checkout (mixed-cart)
- Waitlist for fully booked room types
- Redis-based hold storage (PostgreSQL holds are sufficient for this scale)
- Hold transfer between sessions (if user opens a new browser tab)
- Coupon / discount codes
- Refund logic (all sales final policy unchanged)
- Channel manager sync (Airbnb, Booking.com)
- SMS notifications
- Revenue dashboard and reporting
- Multi-property or multi-currency support

---

## Further Notes

- **Session token generation:** The `sessionToken` for holds should be a cryptographically random UUID generated on the frontend at the start of the booking flow and stored in `sessionStorage`. It is not tied to auth — unauthenticated guests can hold rooms.
- **Hold cleanup cron:** A NestJS `@Cron` job running every 60 seconds is sufficient to delete expired holds. The availability query itself filters by `expiresAt > now`, so stale records do not affect correctness — the cron is purely for table hygiene.
- **Quantity cap enforcement:** Both frontend (stepper max) and backend (`createHold` validation) must enforce the quantity cap. Never trust the frontend alone.
- **Backwards compatibility:** All existing bookings have `quantity = 1` by default via Prisma migration default. No data migration required.
- **Stripe amount:** Stripe accepts amounts in the smallest currency unit (satang for THB). Ensure `quantity × nights × ratePerNight` is correctly converted before passing to Stripe.
- **Mobile layout:** The stepper, timer banner, and room cards must be tested at 375px viewport width minimum.
