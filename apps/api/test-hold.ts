import { PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';
import { HoldService } from './src/hold/hold.service';
import { PrismaService } from './src/prisma/prisma.service';

const prisma = new PrismaClient();
const holdService = new HoldService(prisma as any);

async function runTests() {
  console.log('🚀 Starting HoldModule Tests...\n');
  let passedCount = 0;
  let failedCount = 0;

  function expectEqual(actual: any, expected: any, testName: string) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      console.log(`✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName}\n   Expected: ${JSON.stringify(expected)}\n   Received: ${JSON.stringify(actual)}`);
      failedCount++;
    }
  }

  function expectTruthy(actual: any, testName: string) {
    if (actual) {
      console.log(`✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName}\n   Expected truthy, received: ${JSON.stringify(actual)}`);
      failedCount++;
    }
  }

  async function expectThrows(fn: () => Promise<any>, expectedCode: string, testName: string) {
    try {
      await fn();
      console.error(`❌ FAIL: ${testName}\n   Expected error ${expectedCode} but no error was thrown`);
      failedCount++;
    } catch (err: any) {
      const code = err?.status || err?.response?.statusCode || err?.constructor?.name;
      if (err.message?.includes('Not enough') || err?.status === 409 || code === 'ConflictException') {
        console.log(`✅ PASS: ${testName}`);
        passedCount++;
      } else {
        console.error(`❌ FAIL: ${testName}\n   Expected ConflictException, got: ${err?.constructor?.name} - ${err?.message}`);
        failedCount++;
      }
    }
  }

  let testRoomType: any;

  try {
    // Setup: create a room type with 2 units
    testRoomType = await prisma.roomType.create({
      data: {
        name: 'Hold Test Suite',
        description: 'Room type for hold integration testing',
        maxOccupancy: 2,
        totalUnits: 2,
        imageUrls: [],
      },
    });
    console.log(`📦 Created test room type: ${testRoomType.id}\n`);

    const checkIn = new Date('2026-07-01');
    const checkOut = new Date('2026-07-03');

    // -------------------------------------------------------------------------
    // Test 1: createHold creates a hold and returns holdId + expiresAt
    // -------------------------------------------------------------------------
    const hold1 = await holdService.createHold({
      roomTypeId: testRoomType.id,
      checkIn,
      checkOut,
      quantity: 1,
      sessionToken: 'session-test-1',
    });
    expectTruthy(hold1.id, 'createHold returns a hold with an id');
    expectTruthy(hold1.expiresAt, 'createHold returns expiresAt');
    const tenMinsFromNow = new Date(Date.now() + 10 * 60 * 1000);
    const nineMinutesFromNow = new Date(Date.now() + 9 * 60 * 1000);
    expectTruthy(
      hold1.expiresAt > nineMinutesFromNow && hold1.expiresAt <= tenMinsFromNow,
      'expiresAt is ~10 minutes from now',
    );

    // -------------------------------------------------------------------------
    // Test 2: getActiveHoldsQuantity counts active holds for the date range
    // -------------------------------------------------------------------------
    const qty1 = await holdService.getActiveHoldsQuantity(testRoomType.id, checkIn, checkOut);
    expectEqual(qty1, 1, 'getActiveHoldsQuantity returns 1 after one hold created');

    // -------------------------------------------------------------------------
    // Test 3: Second hold for the second unit succeeds (still 1 unit left)
    // -------------------------------------------------------------------------
    const hold2 = await holdService.createHold({
      roomTypeId: testRoomType.id,
      checkIn,
      checkOut,
      quantity: 1,
      sessionToken: 'session-test-2',
    });
    expectTruthy(hold2.id, 'Second hold succeeds when 1 unit still available');

    // -------------------------------------------------------------------------
    // Test 4: Third hold fails — no units left (409 conflict)
    // -------------------------------------------------------------------------
    await expectThrows(
      () =>
        holdService.createHold({
          roomTypeId: testRoomType.id,
          checkIn,
          checkOut,
          quantity: 1,
          sessionToken: 'session-test-3',
        }),
      'ConflictException',
      'Third hold throws ConflictException when 0 units remain',
    );

    // -------------------------------------------------------------------------
    // Test 5: releaseHold removes the hold
    // -------------------------------------------------------------------------
    await holdService.releaseHold('session-test-1');
    const qtyAfterRelease = await holdService.getActiveHoldsQuantity(testRoomType.id, checkIn, checkOut);
    expectEqual(qtyAfterRelease, 1, 'getActiveHoldsQuantity returns 1 after one hold released');

    // -------------------------------------------------------------------------
    // Test 6: releaseHold is idempotent — calling twice does not error
    // -------------------------------------------------------------------------
    await holdService.releaseHold('session-test-1');
    console.log('✅ PASS: releaseHold is idempotent (no error on double-release)');
    passedCount++;

    // -------------------------------------------------------------------------
    // Test 7: Expired holds are NOT counted in getActiveHoldsQuantity
    // -------------------------------------------------------------------------
    // Insert an expired hold directly
    await prisma.roomHold.create({
      data: {
        roomTypeId: testRoomType.id,
        checkIn,
        checkOut,
        quantity: 1,
        sessionToken: 'session-expired',
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });
    const qtyWithExpired = await holdService.getActiveHoldsQuantity(testRoomType.id, checkIn, checkOut);
    expectEqual(qtyWithExpired, 1, 'Expired hold is NOT counted in getActiveHoldsQuantity');

    // -------------------------------------------------------------------------
    // Test 8: cleanupExpiredHolds deletes expired records
    // -------------------------------------------------------------------------
    await holdService.cleanupExpiredHolds();
    const expiredRecord = await prisma.roomHold.findUnique({ where: { sessionToken: 'session-expired' } });
    expectEqual(expiredRecord, null, 'cleanupExpiredHolds deletes expired hold from DB');

    // -------------------------------------------------------------------------
    // Test 9: Holds for non-overlapping date ranges don't affect each other
    // -------------------------------------------------------------------------
    const differentCheckIn = new Date('2026-08-01');
    const differentCheckOut = new Date('2026-08-03');
    const holdDifferentDates = await holdService.createHold({
      roomTypeId: testRoomType.id,
      checkIn: differentCheckIn,
      checkOut: differentCheckOut,
      quantity: 1,
      sessionToken: 'session-different-dates',
    });
    expectTruthy(holdDifferentDates.id, 'Hold for non-overlapping dates succeeds even when original dates are full');

    // Cleanup different-dates hold
    await holdService.releaseHold('session-different-dates');

    // -------------------------------------------------------------------------
    // Test 10: CONFIRMED bookings reduce available units for holds
    // -------------------------------------------------------------------------
    // Release hold2 first
    await holdService.releaseHold('session-test-2');

    // Create a CONFIRMED booking occupying 1 unit
    const confirmedBooking = await prisma.booking.create({
      data: {
        roomTypeId: testRoomType.id,
        checkIn,
        checkOut,
        guestName: 'Test Guest',
        guestPhone: '0812345678',
        totalPrice: 3000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    // Now only 1 unit available (2 total - 1 confirmed)
    const holdWithBooking = await holdService.createHold({
      roomTypeId: testRoomType.id,
      checkIn,
      checkOut,
      quantity: 1,
      sessionToken: 'session-with-booking',
    });
    expectTruthy(holdWithBooking.id, 'Hold succeeds when 1 unit available (other confirmed by booking)');

    await expectThrows(
      () =>
        holdService.createHold({
          roomTypeId: testRoomType.id,
          checkIn,
          checkOut,
          quantity: 1,
          sessionToken: 'session-overflow',
        }),
      'ConflictException',
      'Hold fails when confirmed booking + active hold consume all units',
    );

    // Cleanup
    await holdService.releaseHold('session-with-booking');
    await prisma.booking.delete({ where: { id: confirmedBooking.id } });
  } catch (error: any) {
    console.error('💥 Test Execution Error:', error?.message || error);
    failedCount++;
  } finally {
    // Cleanup all test data
    if (testRoomType) {
      await prisma.roomHold.deleteMany({ where: { roomTypeId: testRoomType.id } });
      await prisma.booking.deleteMany({ where: { roomTypeId: testRoomType.id } });
      await prisma.roomRate.deleteMany({ where: { roomTypeId: testRoomType.id } });
      await prisma.roomType.delete({ where: { id: testRoomType.id } });
    }
    await prisma.$disconnect();

    console.log(`\n📊 Test Summary: Passed ${passedCount}, Failed ${failedCount}`);
    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runTests();
