import { Module } from '@nestjs/common';
import { RateCalendarService } from './rate-calendar.service';
import { RateCalendarController } from './rate-calendar.controller';

@Module({
  controllers: [RateCalendarController],
  providers: [RateCalendarService],
  exports: [RateCalendarService],
})
export class RateCalendarModule {}
