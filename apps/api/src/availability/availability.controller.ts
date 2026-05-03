import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('api/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  async checkAvailability(
    @Query('roomTypeId') roomTypeId: string,
    @Query('checkIn') checkInString: string,
    @Query('checkOut') checkOutString: string,
  ) {
    if (!roomTypeId || !checkInString || !checkOutString) {
      throw new BadRequestException('Missing required query parameters');
    }

    const checkIn = new Date(checkInString);
    const checkOut = new Date(checkOutString);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (checkIn >= checkOut) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    const { availableUnits, totalPrice, scarce } =
      await this.availabilityService.getAvailableUnits(roomTypeId, checkIn, checkOut);

    return {
      roomTypeId,
      checkIn,
      checkOut,
      availableUnits,
      scarce,
      isAvailable: availableUnits >= 1 && totalPrice > 0,
      totalPrice,
    };
  }
}
