import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableUnits(roomTypeId: string, checkIn: Date, checkOut: Date): Promise<{ availableUnits: number; totalPrice: number }> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      throw new Error('RoomType not found');
    }

    const totalUnits = roomType.totalUnits;

    // Overlap logic
    const overlappingBookings = await this.prisma.booking.count({
      where: {
        roomTypeId,
        status: BookingStatus.CONFIRMED,
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });

    const available = totalUnits - overlappingBookings;
    const availableUnits = available > 0 ? available : 0;

    // Calculate dynamic price based on RoomRate table
    const rates = await this.prisma.roomRate.findMany({
      where: {
        roomTypeId,
        date: { gte: checkIn, lt: checkOut },
      },
    });

    let totalPrice = 0;
    for (const rate of rates) {
      totalPrice += Number(rate.price);
    }

    const nightCount = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    // If rates are missing for some dates, calculate with a default fallback (e.g., $150/night)
    const missingNights = nightCount - rates.length;
    if (missingNights > 0) {
      totalPrice += missingNights * 1500; // 1,500 THB default fallback rate
    }

    totalPrice = Math.round(totalPrice * 100) / 100;

    return {
      availableUnits,
      totalPrice,
    };
  }
}
