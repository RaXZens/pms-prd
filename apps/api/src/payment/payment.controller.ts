import { Controller, Post, Body, BadRequestException, Get, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('api/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  async createCheckout(@Body() body: { bookingId: string }) {
    if (!body.bookingId) throw new BadRequestException('Booking ID required');
    return this.paymentService.createCheckoutSession(body.bookingId);
  }

  @Get('simulate')
  async simulate(@Query('bookingId') bookingId: string) {
    await this.paymentService.simulateWebhook(bookingId);
    return { success: true };
  }
}
