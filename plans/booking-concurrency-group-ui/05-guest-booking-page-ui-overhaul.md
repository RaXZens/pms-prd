---
status: todo
mode: hitl
---

# Phase 5: Guest Booking Page UI Overhaul

**User stories**: US 15 (room cards with clear visual hierarchy), US 16 (labeled step progress indicator), US 17 (completed steps marked), US 18 (scarcity label), US 19 (mobile responsive), US 20 (checkout summary panel completeness)

**Blocked by**: Phase 4 (room cards already have stepper; this phase redesigns the card shell around it)

## What to build

A visual and UX polish pass on the entire guest booking page (`/book`). Every component the guest interacts with gets improved hierarchy, clearer state communication, and full mobile usability. No new API calls — this phase only changes how existing data is presented.

**Step progress indicator**: A persistent labeled indicator across the top of the booking page showing all 4 steps: "Dates", "Room", "Details", "Confirm". The current step is highlighted. Completed steps are marked with a checkmark. Inactive future steps are visually muted. Works correctly at 375px mobile width.

**Redesigned room cards**: Each card shows:
- A large room image (top, full card width)
- Room name in a clear heading
- Max occupancy badge (e.g., "Up to 4 guests")
- Price per night in a prominent size
- Scarcity label: "Only X rooms left!" shown in amber/warning color when `availableUnits ≤ 3` (uses the `scarce` flag and `availableUnits` already returned by the availability API from Phase 1)
- The `+/-` stepper (from Phase 4) sits naturally below the price
- A "Select" button that triggers hold creation and advances to Step 3

**Checkout summary panel**: The right-hand summary (Step 3) clearly shows:
- Room name (with quantity prefix if > 1, e.g., "2 x Deluxe Room")
- Check-in and check-out dates
- Number of nights
- Price per night × quantity
- Total price
- Cancellation policy notice
- The HoldTimer countdown (from Phase 3) sits at the bottom of this panel

**Mobile layout**: The booking page must be fully usable at 375px viewport width:
- Step indicator wraps or abbreviates gracefully
- Room cards stack vertically, images scale correctly
- Summary panel moves below the form on mobile (not side-by-side)
- Sticky hold timer banner (from Phase 3) does not overlap content awkwardly on small screens

## Acceptance criteria

- [ ] Step progress indicator is visible on all 4 steps, showing correct active/completed/inactive states
- [ ] Completed steps show a checkmark; the active step is highlighted; future steps are muted
- [ ] Room cards show: image, room name, occupancy badge, price per night, scarcity label (when applicable), stepper, Select button
- [ ] Scarcity label "Only X rooms left!" appears when `availableUnits ≤ 3` and is hidden otherwise
- [ ] Checkout summary panel shows: room name with quantity, dates, nights, price breakdown, total, policy notice, hold timer
- [ ] Full booking flow is usable at 375px width with no horizontal scroll or obscured elements
- [ ] Sticky hold timer banner does not overlap form inputs on mobile
- [ ] Verified manually end-to-end: date selection → room selection (scarcity visible) → details + timer → payment → confirmation with quantity
