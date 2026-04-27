import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BookingModule } from '../booking/booking.module';
import { RateCalendarModule } from '../rate-calendar/rate-calendar.module';

@Module({
  imports: [BookingModule, RateCalendarModule],
  controllers: [AdminController],
})
export class AdminModule {}
