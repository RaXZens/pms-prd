---
status: todo
mode: hitl
---

# Phase 4: Quantity Booking UI

**User stories**: US 9 (+/- stepper on room cards), US 10 (stepper capped at available units), US 11 (total price updates instantly), US 14 (confirmation page shows quantity)

**Blocked by**: Phase 2 (quantity field on Booking, pricing formula), Phase 3 (hold creation must include quantity)

## What to build

Guest-facing UI for selecting multiple rooms of the same type in a single checkout. A `+/-` stepper is added directly to each room card on Step 2. Selecting a quantity immediately updates the displayed total price. The quantity is passed through to the hold creation, booking creation, and confirmation page.

**Stepper on room cards**: Each room card in Step 2 shows a `+/-` stepper below the price. Default value: 1. Minimum: 1. Maximum: `availableUnits` returned by the availability API (after subtracting active holds). The `-` button is disabled at 1; the `+` button is disabled at the max.

**Real-time price update**: The summary panel total price recalculates instantly as the guest changes the stepper value: `price = ratePerNight × numberOfNights × quantity`. No API call needed for this — it is a pure frontend calculation using data already fetched.

**Hold creation update**: When the guest advances to Step 3, `POST /api/holds` is called with the selected `quantity` (not hardcoded to 1). The stepper max must be re-validated against the hold response — if the hold returns 409, the stepper max is refreshed and the error is shown.

**Booking creation update**: `POST /api/bookings` is called with the selected `quantity`. No other changes to the booking flow.

**Confirmation page (Step 4)**: The success screen shows quantity in the booking summary. When `quantity > 1`, display "2 x Deluxe Room". When `quantity = 1`, display "Deluxe Room" (unchanged).

## Acceptance criteria

- [ ] Each available room card on Step 2 shows a `+/-` stepper defaulting to 1
- [ ] The `-` button is disabled when quantity is 1
- [ ] The `+` button is disabled when quantity equals `availableUnits` for that room type
- [ ] Changing the stepper value updates the total price in the summary panel instantly
- [ ] Advancing to Step 3 with quantity 2 calls `POST /api/holds` with `quantity: 2`
- [ ] `POST /api/bookings` is called with the correct quantity
- [ ] Confirmation page shows "2 x Deluxe Room" when quantity is 2
- [ ] Confirmation page is unchanged (no quantity label) when quantity is 1
- [ ] Manually tested: selecting quantity 2 when only 2 units are available, then another tab takes one — the stepper correctly resets to max 1 on the 409 error
