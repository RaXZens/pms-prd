import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HoldService } from '../hold/hold.service';
import { BookingStatus } from '@prisma/client';

const SCARCITY_THRESHOLD = 3;

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holdService: HoldService,
  ) {}

  async getAvailableUnits(
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<{ availableUnits: number; totalPrice: number; scarce: boolean }> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      throw new Error('RoomType not found');
    }

    const confirmedAgg = await this.prisma.booking.aggregate({
      where: {
        roomTypeId,
        status: BookingStatus.CONFIRMED,
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      _sum: { quantity: true },
    });

    const confirmedUnits = confirmedAgg._sum.quantity ?? 0;

    const activeHolds = await this.holdService.getActiveHoldsQuantity(
      roomTypeId,
      checkIn,
      checkOut,
    );

    const available = roomType.totalUnits - confirmedUnits - activeHolds;
    const availableUnits = available > 0 ? available : 0;
    const scarce = availableUnits > 0 && availableUnits <= SCARCITY_THRESHOLD;

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

    const nightCount = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    const missingNights = nightCount - rates.length;
    if (missingNights > 0) {
      totalPrice += missingNights * 1500;
    }

    totalPrice = Math.round(totalPrice * 100) / 100;

    return { availableUnits, totalPrice, scarce };
  }
}
