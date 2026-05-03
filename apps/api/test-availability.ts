import { PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';
import { AvailabilityService } from './src/availability/availability.service';
import { PrismaService } from './src/prisma/prisma.service';

const prisma = new PrismaClient();
const noopHoldService = { getActiveHoldsQuantity: async () => 0 } as any;
const availabilityService = new AvailabilityService(prisma as any, noopHoldService);

async function runTests() {
  console.log('🚀 Starting AvailabilityModule Tests...\n');
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

  try {
    // 0. Setup Test Data
    const testRoomType = await prisma.roomType.create({
      data: {
        name: 'Test Suite',
        description: 'Suite for integration testing',
        maxOccupancy: 4,
        totalUnits: 5,
        imageUrls: [],
      }
    });

    // Seed room rates
    const checkInDate = new Date('2026-06-01');
    const checkOutDate = new Date('2026-06-10');
    
    for (let d = new Date(checkInDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
      await prisma.roomRate.create({
        data: {
          roomTypeId: testRoomType.id,
          date: new Date(d),
          price: 150,
        }
      });
    }

    // --- TEST 1: ห้องว่างทั้งหมด → คืนค่า totalUnits ---
    const res1 = await availabilityService.getAvailableUnits(testRoomType.id, new Date('2026-06-01'), new Date('2026-06-03'));
    expectEqual(res1.availableUnits, 5, 'ห้องว่างทั้งหมด → คืนค่า totalUnits (5)');

    // --- TEST 2: ห้องที่จองแล้ว 1 ห้อง → คืนค่า totalUnits - 1 ---
    const booking1 = await prisma.booking.create({
      data: {
        roomTypeId: testRoomType.id,
        checkIn: new Date('2026-06-01'),
        checkOut: new Date('2026-06-03'),
        totalPrice: 300,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        guestName: 'Guest 1',
        guestPhone: '000000000',
      }
    });
    const res2 = await availabilityService.getAvailableUnits(testRoomType.id, new Date('2026-06-01'), new Date('2026-06-03'));
    expectEqual(res2.availableUnits, 4, 'ห้องที่จองแล้ว 1 ห้อง → คืนค่า totalUnits - 1 (4)');

    // --- TEST 3: ห้องที่เต็ม → คืนค่า 0 ---
    // Create 4 more bookings for the same dates
    for (let i = 2; i <= 5; i++) {
      await prisma.booking.create({
        data: {
          roomTypeId: testRoomType.id,
          checkIn: new Date('2026-06-01'),
          checkOut: new Date('2026-06-03'),
          totalPrice: 300,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          guestName: `Guest ${i}`,
          guestPhone: '000000000',
        }
      });
    }
    const res3 = await availabilityService.getAvailableUnits(testRoomType.id, new Date('2026-06-01'), new Date('2026-06-03'));
    expectEqual(res3.availableUnits, 0, 'ห้องที่เต็ม → คืนค่า 0');

    // --- TEST 4: Booking ที่ overlap บางส่วน (check-in ก่อน, check-out ทับ) ---
    // Let's create a booking overlapping from June 3 to June 6
    const overlapBooking = await prisma.booking.create({
      data: {
        roomTypeId: testRoomType.id,
        checkIn: new Date('2026-06-03'),
        checkOut: new Date('2026-06-06'),
        totalPrice: 450,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        guestName: 'Overlapping Guest',
        guestPhone: '000000000',
      }
    });
    // Check June 4 to June 5 (should be 4 units available, since overlapBooking takes 1)
    const res4 = await availabilityService.getAvailableUnits(testRoomType.id, new Date('2026-06-04'), new Date('2026-06-05'));
    expectEqual(res4.availableUnits, 4, 'Booking ที่ overlap บางส่วน → คืนค่า available (4)');

    // --- TEST 5: Booking ที่ติดกัน (check-out วันนี้ / check-in วันนี้) → ต้องไม่นับเป็น overlap ---
    // We check availability on June 6 to June 8.
    // The previous booking ends on June 6. This should not reduce inventory for June 6 onwards.
    const res5 = await availabilityService.getAvailableUnits(testRoomType.id, new Date('2026-06-06'), new Date('2026-06-08'));
    expectEqual(res5.availableUnits, 5, 'Booking ที่ติดกัน (checkout วันนี้ / checkin วันนี้) → ไม่นับเป็น overlap (5)');

    // --- TEST 6: Booking ที่ถูก cancel → ต้องไม่นับใน availability ---
    const cancelledBooking = await prisma.booking.create({
      data: {
        roomTypeId: testRoomType.id,
        checkIn: new Date('2026-06-06'),
        checkOut: new Date('2026-06-08'),
        totalPrice: 300,
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.UNPAID,
        guestName: 'Cancelled Guest',
        guestPhone: '000000000',
      }
    });
    const res6 = await availabilityService.getAvailableUnits(testRoomType.id, new Date('2026-06-06'), new Date('2026-06-08'));
    expectEqual(res6.availableUnits, 5, 'Booking ที่ถูก cancel → ไม่นับรวมใน availability (5)');

    // Cleanup Test Data
    await prisma.booking.deleteMany({ where: { roomTypeId: testRoomType.id } });
    await prisma.roomRate.deleteMany({ where: { roomTypeId: testRoomType.id } });
    await prisma.roomType.delete({ where: { id: testRoomType.id } });

  } catch (error) {
    console.error('💥 Test Execution Error:', error);
    failedCount++;
  } finally {
    await prisma.$disconnect();
    console.log(`\n📊 Test Summary: Passed ${passedCount}, Failed ${failedCount}`);
    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runTests();
