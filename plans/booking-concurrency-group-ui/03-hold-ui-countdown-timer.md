---
status: todo
mode: hitl
---

# Phase 3: Hold UI + Countdown Timer

**User stories**: US 2 (countdown timer visible), US 3 (banner escalation at < 3 min), US 4 (expired modal), US 5 (one-click back to room selection), US 6 (race conflict message)

**Blocked by**: Phase 1 (requires `POST /api/holds` and `DELETE /api/holds/:sessionToken` endpoints)

## What to build

Frontend integration of the hold system into the guest booking flow, plus a live countdown timer with escalating urgency. When a guest selects a room, the frontend calls `POST /api/holds` to lock the inventory. A timer counts down the 10-minute hold. The UI escalates from subtle (summary panel) to urgent (sticky banner) and finally shows a modal when the hold expires.

**Session token**: At the start of the booking flow, generate a random UUID and store it in `sessionStorage`. Reuse the same token throughout the session.

**Hold creation**: When the guest selects a room and proceeds to Step 3 (details), call `POST /api/holds`. On 409 response, show an inline error on the room card: "This room just became unavailable, please select again" and prevent navigation to Step 3.

**HoldTimer component**: Reads `expiresAt` from the hold response. Counts down in real time (MM:SS format).
- Default state: rendered inside the checkout summary panel below the price breakdown
- Escalated state (< 3 minutes remaining): a sticky banner appears at the top of the page showing the countdown and "Complete your booking before your hold expires"
- Expired state (reaches 0:00): hides the timer and shows the HoldExpiredModal

**HoldExpiredModal**: A modal dialog that appears when the countdown hits zero.
- Message: "Your hold has expired. This room may no longer be available."
- Single action button: "Choose a different room" — resets the flow back to Step 2 (room selection), preserving the guest's selected check-in and check-out dates
- Calls `DELETE /api/holds/:sessionToken` on mount to ensure cleanup

**Hold release on navigation**: Call `DELETE /api/holds/:sessionToken` when the guest navigates back to Step 2 voluntarily (e.g., clicks "Back"), so inventory is freed immediately rather than waiting for expiry.

## Acceptance criteria

- [ ] Selecting a room and advancing to Step 3 triggers `POST /api/holds` with correct roomTypeId, dates, quantity, and sessionToken
- [ ] If `POST /api/holds` returns 409, the guest sees "This room just became unavailable, please select again" and stays on Step 2
- [ ] A countdown timer (MM:SS) is visible in the checkout summary panel after a hold is created
- [ ] When the timer drops below 3 minutes, a sticky banner appears at the top of the page with the countdown
- [ ] When the timer reaches 0:00, the HoldExpiredModal is shown
- [ ] Clicking "Choose a different room" in the modal returns the guest to Step 2 with dates preserved
- [ ] `DELETE /api/holds/:sessionToken` is called when the modal opens (or when the guest navigates back manually)
- [ ] Going back to Step 2 voluntarily also calls `DELETE /api/holds/:sessionToken`
- [ ] Verified manually: two browser tabs racing for the last room — the second tab sees the 409 error message
