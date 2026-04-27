import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AvailabilityModule, NotificationModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
