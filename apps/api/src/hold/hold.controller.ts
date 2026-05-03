import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import { HoldService } from './hold.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('api/holds')
export class HoldController {
  constructor(private readonly holdService: HoldService) {}

  @Post()
  async createHold(@Body() body: any) {
    const { roomTypeId, checkIn, checkOut, quantity = 1, sessionToken } = body;

    if (!roomTypeId || !checkIn || !checkOut || !sessionToken) {
      throw new BadRequestException(
        'roomTypeId, checkIn, checkOut, and sessionToken are required',
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (checkInDate >= checkOutDate) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('quantity must be a positive integer');
    }

    const hold = await this.holdService.createHold({
      roomTypeId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      quantity,
      sessionToken,
    });

    return { holdId: hold.id, expiresAt: hold.expiresAt };
  }

  @Delete(':sessionToken')
  @HttpCode(HttpStatus.NO_CONTENT)
  async releaseHold(@Param('sessionToken') sessionToken: string) {
    await this.holdService.releaseHold(sessionToken);
  }

  @UseGuards(AdminGuard)
  @Get('admin/active')
  async getActiveHolds() {
    const holds = await this.holdService['prisma'].roomHold.groupBy({
      by: ['roomTypeId'],
      where: { expiresAt: { gt: new Date() } },
      _sum: { quantity: true },
      _count: { id: true },
    });

    const roomTypeIds = holds.map((h: any) => h.roomTypeId);
    const roomTypes = await this.holdService['prisma'].roomType.findMany({
      where: { id: { in: roomTypeIds } },
      select: { id: true, name: true },
    });

    const nameMap = Object.fromEntries(roomTypes.map((rt: any) => [rt.id, rt.name]));
    const totalCount = holds.reduce((sum: number, h: any) => sum + (h._sum.quantity ?? 0), 0);

    return {
      count: totalCount,
      byRoomType: holds.map((h: any) => ({
        roomTypeId: h.roomTypeId,
        roomTypeName: nameMap[h.roomTypeId] ?? 'Unknown',
        count: h._sum.quantity ?? 0,
      })),
    };
  }
}
