import { Controller, Get, Put, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { RateCalendarService } from './rate-calendar.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('api/rate-calendar')
export class RateCalendarController {
  constructor(private readonly rateCalendarService: RateCalendarService) {}

  @Get()
  async getRates(
    @Query('roomTypeId') roomTypeId: string,
    @Query('startDate') startDateString: string,
    @Query('endDate') endDateString: string,
  ) {
    if (!roomTypeId || !startDateString || !endDateString) {
      throw new BadRequestException('Missing required query parameters');
    }
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    return this.rateCalendarService.getRates(roomTypeId, startDate, endDate);
  }

  @UseGuards(AdminGuard)
  @Put('bulk')
  async setBulkRates(
    @Body() body: { roomTypeId: string; startDate: string; endDate: string; price: number },
  ) {
    const { roomTypeId, startDate, endDate, price } = body;
    if (!roomTypeId || !startDate || !endDate || price === undefined) {
      throw new BadRequestException('Missing required body parameters');
    }
    await this.rateCalendarService.setRates(
      roomTypeId,
      new Date(startDate),
      new Date(endDate),
      price,
    );
    return { success: true };
  }
}
