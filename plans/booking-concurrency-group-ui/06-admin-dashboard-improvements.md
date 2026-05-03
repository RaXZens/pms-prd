---
status: todo
mode: hitl
---

# Phase 6: Admin Dashboard Improvements

**User stories**: US 21 (today's snapshot header), US 22 (color-coded rows by urgency), US 23 (active holds count in header), US 24 (today's arrivals visually distinct)

**Blocked by**: Phase 1 (requires `GET /api/admin/holds/active` endpoint for hold count in header)

## What to build

An operational upgrade to the admin bookings dashboard. The flat booking table gains a snapshot header for instant situational awareness and color-coded rows so urgent items surface without filtering.

**Today's snapshot header**: A summary bar at the top of the dashboard (above the filter controls) showing four stats, all calculated for the current calendar day (Asia/Bangkok timezone):
- **Arrivals today** — count of CONFIRMED bookings with `checkIn = today`
- **Departures today** — count of CONFIRMED bookings with `checkOut = today`
- **Pending unpaid** — count of bookings with `status = PENDING` and `paymentStatus = UNPAID`
- **Active holds** — total count of non-expired `RoomHold` records (from `GET /api/admin/holds/active`)

The header is server-rendered on page load and does not auto-refresh (a manual page reload is sufficient for v1).

**`GET /api/admin/holds/active` endpoint**: Returns `{ count: number, byRoomType: { roomTypeId, roomTypeName, count }[] }`. Protected by AdminGuard.

**Color-coded booking rows**: Each row in the booking table gets a background tint based on urgency:
- **Amber** — `status === PENDING && paymentStatus === UNPAID` (needs follow-up)
- **Green** — `status === CONFIRMED && checkIn === today` (arriving today)
- **Default** — all other rows (no tint)

Rules are mutually exclusive and applied in priority order (amber takes precedence if somehow both conditions match). The color is subtle enough not to clash with the existing status badge colors.

## Acceptance criteria

- [ ] Snapshot header appears at the top of `/dashboard/bookings` showing all four stats
- [ ] "Arrivals today" count matches CONFIRMED bookings with today's check-in date
- [ ] "Departures today" count matches CONFIRMED bookings with today's check-out date
- [ ] "Pending unpaid" count matches PENDING + UNPAID bookings
- [ ] "Active holds" count matches non-expired RoomHold records from the API
- [ ] `GET /api/admin/holds/active` is protected — returns 401/403 without admin credentials
- [ ] PENDING + UNPAID rows are tinted amber in the booking table
- [ ] CONFIRMED rows with today's check-in are tinted green
- [ ] All other rows have the default background
- [ ] Verified manually: create a test hold and confirm the active holds count increments in the header
