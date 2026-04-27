import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { BookingService } from '../booking/booking.service';
import { RateCalendarService } from '../rate-calendar/rate-calendar.service';
import { AdminGuard } from '../auth/admin.guard';

@UseGuards(AdminGuard)
@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly rateCalendarService: RateCalendarService,
  ) {}

  @Get('bookings')
  async getAllBookings() {
    return this.bookingService.getAllBookings();
  }

  @Post('bookings')
  async createManualBooking(@Body() body: any) {
    const { roomTypeId, checkIn, checkOut, guestName, guestPhone } = body;
    return this.bookingService.createBooking({
      roomTypeId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guestName,
      guestPhone,
    });
  }

  @Put('room-types/:id/rates')
  async setBulkRates(
    @Param('id') roomTypeId: string,
    @Body() body: { startDate: string; endDate: string; price: number },
  ) {
    const { startDate, endDate, price } = body;
    await this.rateCalendarService.setRates(
      roomTypeId,
      new Date(startDate),
      new Date(endDate),
      price,
    );
    return { success: true };
  }
}
