import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomType } from '@prisma/client';

@Injectable()
export class RoomTypeService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<RoomType[]> {
    return this.prisma.roomType.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<RoomType> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
    });
    if (!roomType) {
      throw new NotFoundException(`RoomType with ID ${id} not found`);
    }
    return roomType;
  }

  async create(data: any): Promise<RoomType> {
    return this.prisma.roomType.create({
      data,
    });
  }

  async update(id: string, data: any): Promise<RoomType> {
    return this.prisma.roomType.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<RoomType> {
    return this.prisma.$transaction(async (tx) => {
      // Delete associated room rates
      await tx.roomRate.deleteMany({
        where: { roomTypeId: id },
      });
      // Delete associated bookings
      await tx.booking.deleteMany({
        where: { roomTypeId: id },
      });
      // Finally delete the room type
      return tx.roomType.delete({
        where: { id },
      });
    });
  }
}
