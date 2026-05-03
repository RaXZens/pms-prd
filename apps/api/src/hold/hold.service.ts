import { Injectable, ConflictException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, RoomHold } from '@prisma/client';

const HOLD_DURATION_MS = 10 * 60 * 1000;

@Injectable()
export class HoldService {
  constructor(private readonly prisma: PrismaService) {}

  async createHold(data: {
    roomTypeId: string;
    checkIn: Date;
    checkOut: Date;
    quantity: number;
    sessionToken: string;
  }): Promise<RoomHold> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const roomType = await tx.roomType.findUnique({
            where: { id: data.roomTypeId },
          });
          if (!roomType) {
            throw new ConflictException('Room type not found');
          }

          const confirmedCount = await tx.booking.count({
            where: {
              roomTypeId: data.roomTypeId,
              status: BookingStatus.CONFIRMED,
              checkIn: { lt: data.checkOut },
              checkOut: { gt: data.checkIn },
            },
          });

          const activeHoldsResult = await tx.roomHold.aggregate({
            where: {
              roomTypeId: data.roomTypeId,
              checkIn: { lt: data.checkOut },
              checkOut: { gt: data.checkIn },
              expiresAt: { gt: new Date() },
              sessionToken: { not: data.sessionToken },
            },
            _sum: { quantity: true },
          });

          const heldUnits = activeHoldsResult._sum.quantity ?? 0;
          const available = roomType.totalUnits - confirmedCount - heldUnits;

          if (available < data.quantity) {
            throw new ConflictException(
              'Not enough rooms available for the selected dates',
            );
          }

          const holdPayload = {
            roomTypeId: data.roomTypeId,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            quantity: data.quantity,
            expiresAt: new Date(Date.now() + HOLD_DURATION_MS),
          };
          return tx.roomHold.upsert({
            where: { sessionToken: data.sessionToken },
            create: { ...holdPayload, sessionToken: data.sessionToken },
            update: holdPayload,
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      // Prisma serialization failure (P2034) from concurrent transactions
      if (err?.code === 'P2034') {
        throw new ConflictException(
          'Not enough rooms available for the selected dates',
        );
      }
      throw err;
    }
  }

  async releaseHold(sessionToken: string): Promise<void> {
    await this.prisma.roomHold.deleteMany({ where: { sessionToken } });
  }

  async getActiveHoldsQuantity(
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<number> {
    const result = await this.prisma.roomHold.aggregate({
      where: {
        roomTypeId,
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        expiresAt: { gt: new Date() },
      },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  async cleanupExpiredHolds(): Promise<void> {
    await this.prisma.roomHold.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledCleanup(): Promise<void> {
    await this.cleanupExpiredHolds();
  }
}
