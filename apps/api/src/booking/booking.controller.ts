import { Controller, Post, Body, Get, Param, Put, Query, UseGuards, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async create(@Body() body: any) {
    const { roomTypeId, checkIn, checkOut, guestName, guestPhone, guestId, quantity, sessionToken } = body;
    return this.bookingService.createBooking({
      roomTypeId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guestName,
      guestPhone,
      guestId,
      quantity,
      sessionToken,
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.bookingService.cancelBooking(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyBookings(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) return [];
    return this.bookingService.getBookingsByGuest(userId);
  }

  @Get()
  async getAll(@Query('guestId') guestId: string) {
    if (guestId) {
      return this.bookingService.getBookingsByGuest(guestId);
    }
    return this.bookingService.getAllBookings(); // We will protect the admin list in a specific admin endpoint or handle in interceptor
  }

  @UseGuards(AdminGuard)
  @Get('admin/all')
  async getAdminAll() {
    return this.bookingService.getAllBookings();
  }

  @UseGuards(AdminGuard)
  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.bookingService.updateBookingStatus(id, body.status, body.paymentStatus);
  }

  @UseGuards(AdminGuard)
  @Put(':id/details')
  async updateDetails(@Param('id') id: string, @Body() body: any) {
    return this.bookingService.updateBookingDetails(id, body);
  }
}
