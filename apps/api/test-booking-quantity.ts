import { PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';
import { BookingService } from './src/booking/booking.service';
import { AvailabilityService } from './src/availability/availability.service';
import { HoldService } from './src/hold/hold.service';
import { NotificationService } from './src/notification/notification.service';

const prisma = new PrismaClient();
const holdService = new HoldService(prisma as any);
const availabilityService = new AvailabilityService(prisma as any, holdService);
const notificationService = new NotificationService();
const bookingService = new BookingService(prisma as any, availabilityService, notificationService, holdService);

// Capture email calls for assertions
const emailLog: any[] = [];
const originalSend = notificationService.sendBookingConfirmationEmail.bind(notificationService);
notificationService.sendBookingConfirmationEmail = async (data: any) => {
  emailLog.push(data);
  await originalSend(data);
};

async function runTests() {
  console.log('🚀 Starting Booking Quantity Tests...\n');
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

  function expectTrue(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failedCount++;
    }
  }

  async function expectThrows(fn: () => Promise<any>, keyword: string, testName: string) {
    try {
      await fn();
      console.error(`❌ FAIL: ${testName}\n   Expected error containing "${keyword}" but no error was thrown`);
      failedCount++;
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes(keyword.toLowerCase()) || err?.status === 400) {
        console.log(`✅ PASS: ${testName}`);
        passedCount++;
      } else {
        console.error(`❌ FAIL: ${testName}\n   Expected error with "${keyword}", got: ${err?.constructor?.name} - ${msg}`);
        failedCount++;
      }
    }
  }

  let testRoomType: any;

  try {
    // Setup: room type with 3 units, rates at 1000 THB/night
    testRoomType = await prisma.roomType.create({
      data: {
        name: 'Quantity Test Suite',
        description: 'Room type for quantity booking tests',
        maxOccupancy: 2,
        totalUnits: 3,
        imageUrls: [],
      },
    });

    const checkIn = new Date('2026-09-01');
    const checkOut = new Date('2026-09-03'); // 2 nights

    // Seed rates: 1000 THB/night for Sep 1-2
    await prisma.roomRate.createMany({
      data: [
        { roomTypeId: testRoomType.id, date: new Date('2026-09-01'), price: 1000 },
        { roomTypeId: testRoomType.id, date: new Date('2026-09-02'), price: 1000 },
      ],
    });

    console.log(`📦 Created test room type: ${testRoomType.id} (3 units, 1000 THB/night)\n`);

    // -------------------------------------------------------------------------
    // Test 1: POST /api/bookings without quantity defaults to 1 (backwards compat)
    // -------------------------------------------------------------------------
    const booking1 = await bookingService.createBooking({
      roomTypeId: testRoomType.id,
      checkIn,
      checkOut,
      guestName: 'Solo Guest',
      guestPhone: '0812345678',
    });
    expectEqual(booking1.quantity, 1, 'No quantity param → defaults to 1');
    expectEqual(Number(booking1.totalPrice), 2000, 'No quantity → totalPrice = rate × nights × 1 = 2000');
    await prisma.booking.delete({ where: { id: booking1.id } });

    // -------------------------------------------------------------------------
    // Test 2: quantity = 2 → booking created with quantity = 2
    // -------------------------------------------------------------------------
    const booking2 = await bookingService.createBooking({
      roomTypeId: testRoomType.id,
      checkIn,
      checkOut,
      guestName: 'Group Leader',
      guestPhone: '0812345678',
      quantity: 2,
    });
    expectEqual(booking2.quantity, 2, 'quantity = 2 stored on booking');
    expectEqual(Number(booking2.totalPrice), 4000, 'totalPrice = 1000 × 2 nights × 2 = 4000');
    await prisma.booking.delete({ where: { id: booking2.id } });

    // -------------------------------------------------------------------------
    // Test 3: quantity exceeding availableUnits throws BadRequestException
    // -------------------------------------------------------------------------
    await expectThrows(
      () =>
        bookingService.createBooking({
          roomTypeId: testRoomType.id,
          checkIn,
          checkOut,
          guestName: 'Greedy Guest',
          guestPhone: '0812345678',
          quantity: 4, // only 3 units total
        }),
      'available',
      'quantity > availableUnits → throws error',
    );

    // -------------------------------------------------------------------------
    // Test 4: quantity = 0 throws validation error
    // -------------------------------------------------------------------------
    await expectThrows(
      () =>
        bookingService.createBooking({
          roomTypeId: testRoomType.id,
          checkIn,
          checkOut,
          guestName: 'Zero Guest',
          guestPhone: '0812345678',
          quantity: 0,
        }),
      'quantity',
      'quantity = 0 → throws validation error',
    );

    // -------------------------------------------------------------------------
    // Test 5: Hold is released when sessionToken is provided at booking creation
    // -------------------------------------------------------------------------
    const hold = await holdService.createHold({
      roomTypeId: testRoomType.id,
      checkIn,
      checkOut,
      quantity: 2,
      sessionToken: 'booking-session-001',
    });
    expectTrue(!!hold.id, 'Hold created before booking');

    const holdQtyBefore = await holdService.getActiveHoldsQuantity(testRoomType.id, checkIn, checkOut);
    expectEqual(holdQtyBefore, 2, 'Active hold quantity = 2 before booking');

    const booking3 = await bookingService.createBooking({
      roomTypeId: testRoomType.id,
      checkIn,
      checkOut,
      guestName: 'Hold Guest',
      guestPhone: '0812345678',
      quantity: 2,
      sessionToken: 'booking-session-001',
    });
    expectEqual(booking3.quantity, 2, 'Booking created successfully with hold released');

    const holdQtyAfter = await holdService.getActiveHoldsQuantity(testRoomType.id, checkIn, checkOut);
    expectEqual(holdQtyAfter, 0, 'Hold released after booking created');
    await prisma.booking.delete({ where: { id: booking3.id } });

    // -------------------------------------------------------------------------
    // Test 6: Booking quantity reduces availability
    // -------------------------------------------------------------------------
    const confirmedBooking = await prisma.booking.create({
      data: {
        roomTypeId: testRoomType.id,
        checkIn,
        checkOut,
        quantity: 2,
        guestName: 'Confirmed Group',
        guestPhone: '0812345678',
        totalPrice: 4000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    const avail = await availabilityService.getAvailableUnits(testRoomType.id, checkIn, checkOut);
    // totalUnits=3, confirmed booking quantity=2 → availableUnits should be 1
    expectEqual(avail.availableUnits, 1, 'Confirmed booking with quantity=2 reduces availability by 2');
    await prisma.booking.delete({ where: { id: confirmedBooking.id } });

    // -------------------------------------------------------------------------
    // Test 7: confirmBooking sends email with correct data (quantity captured)
    // -------------------------------------------------------------------------
    const pendingBooking = await prisma.booking.create({
      data: {
        roomTypeId: testRoomType.id,
        checkIn,
        checkOut,
        quantity: 2,
        guestName: 'Email Test Guest',
        guestPhone: '0812345678',
        totalPrice: 4000,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });

    emailLog.length = 0;
    await bookingService.confirmBooking(pendingBooking.id, 'sess_test_123');
    expectTrue(emailLog.length > 0, 'Confirmation email triggered on confirmBooking');
    if (emailLog.length > 0) {
      expectTrue(
        emailLog[0].roomTypeName.includes('Quantity Test Suite'),
        'Email contains room type name',
      );
      expectTrue(
        emailLog[0].quantity === 2,
        'Email data includes quantity = 2',
      );
    }
    await prisma.booking.delete({ where: { id: pendingBooking.id } });

  } catch (error: any) {
    console.error('💥 Test Execution Error:', error?.message || error);
    failedCount++;
  } finally {
    if (testRoomType) {
      await prisma.roomHold.deleteMany({ where: { roomTypeId: testRoomType.id } });
      await prisma.booking.deleteMany({ where: { roomTypeId: testRoomType.id } });
      await prisma.roomRate.deleteMany({ where: { roomTypeId: testRoomType.id } });
      await prisma.roomType.delete({ where: { id: testRoomType.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log(`\n📊 Test Summary: Passed ${passedCount}, Failed ${failedCount}`);
    if (failedCount > 0) process.exit(1);
  }
}

runTests();
