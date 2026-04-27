import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RoomTypeModule } from './room-type/room-type.module';
import { RateCalendarModule } from './rate-calendar/rate-calendar.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RoomTypeModule,
    RateCalendarModule,
    AvailabilityModule,
    BookingModule,
    PaymentModule,
    NotificationModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
