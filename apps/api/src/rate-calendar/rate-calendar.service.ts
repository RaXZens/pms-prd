import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomRate } from '@prisma/client';
import { addDays } from 'date-fns';

@Injectable()
export class RateCalendarService {
  constructor(private prisma: PrismaService) {}

  async getRates(roomTypeId: string, startDate: Date, endDate: Date): Promise<RoomRate[]> {
    return this.prisma.roomRate.findMany({
      where: {
        roomTypeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async setRates(
    roomTypeId: string,
    startDate: Date,
    endDate: Date,
    price: number,
  ): Promise<void> {
    let currentDate = startDate;
    const end = endDate;

    const upsertPromises = [];
    while (currentDate <= end) {
      upsertPromises.push(
        this.prisma.roomRate.upsert({
          where: {
            roomTypeId_date: {
              roomTypeId,
              date: currentDate,
            },
          },
          update: { price },
          create: {
            roomTypeId,
            date: currentDate,
            price,
          },
        }),
      );
      currentDate = addDays(currentDate, 1);
    }

    await Promise.all(upsertPromises);
  }
}
