---
status: todo
mode: afk
---

# Phase 2: Quantity Booking Backend

**User stories**: US 8 (book multiple rooms in one session), US 10 (quantity capped at availability), US 11 (total price updates with quantity), US 12 (single Stripe transaction), US 13 (confirmation email shows quantity)

**Blocked by**: Phase 1 (requires updated availability engine and HoldModule)

## What to build

Backend support for booking more than one room of the same type in a single transaction. A guest can now book 2 or 3 rooms in one checkout — one Stripe session, one booking record, one confirmation email that clearly states the quantity.

**Schema**: Add `quantity Int @default(1)` to the `Booking` model and run migration. All existing bookings get `quantity = 1` automatically.

**BookingModule update**: `POST /api/bookings` accepts an optional `quantity` field (defaults to 1). When creating the booking:
- Validates `quantity ≥ 1`
- Validates `quantity ≤ availableUnits` at time of booking creation
- Calculates `totalPrice = pricePerNight × numberOfNights × quantity`
- Releases the session's hold (if one exists) before creating the PENDING booking
- Stores `quantity` on the Booking record

**PaymentModule update**: Stripe checkout session line item amount reflects `quantity × nights × ratePerNight` (converted to satang). The `quantity` is passed through to the Stripe metadata for reference.

**NotificationModule update**: Confirmation email template updated to show quantity. When `quantity > 1`, the room line reads "2 x Deluxe Room". When `quantity = 1`, it reads "Deluxe Room" (unchanged from current).

**Tests**: BookingModule and PaymentModule integration tests covering quantity scenarios — see Testing Decisions in the PRD.

## Acceptance criteria

- [ ] `Booking` table has `quantity` column after migration; all existing rows have `quantity = 1`
- [ ] `POST /api/bookings` with `quantity: 2` creates a booking with `quantity = 2`
- [ ] `totalPrice` on the created booking equals `rate × nights × 2`
- [ ] `POST /api/bookings` with `quantity` exceeding `availableUnits` returns a validation error
- [ ] Stripe checkout session amount equals `quantity × nights × ratePerNight` in satang
- [ ] Confirmation email for a quantity-2 booking shows "2 x Deluxe Room — Total: X THB"
- [ ] Confirmation email for a quantity-1 booking is unchanged from current format
- [ ] Hold is released when `POST /api/bookings` is called with a matching `sessionToken`
- [ ] `POST /api/bookings` without `quantity` field defaults to `quantity = 1` (backwards compatible)
- [ ] All new BookingModule and PaymentModule tests pass
