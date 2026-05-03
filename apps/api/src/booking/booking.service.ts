import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { HoldService } from '../hold/hold.service';
import { BookingStatus, PaymentStatus, Booking } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
    private notificationService: NotificationService,
    private holdService: HoldService,
  ) {}

  async createBooking(data: {
    roomTypeId: string;
    checkIn: Date;
    checkOut: Date;
    guestName: string;
    guestPhone: string;
    guestId?: string;
    quantity?: number;
    sessionToken?: string;
  }): Promise<Booking> {
    const quantity = data.quantity ?? 1;

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('quantity must be a positive integer');
    }

    if (data.checkIn >= data.checkOut) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    // Release the hold before checking availability so the guest's own hold
    // does not inflate the reserved count against them.
    if (data.sessionToken) {
      await this.holdService.releaseHold(data.sessionToken);
    }

    const { availableUnits } = await this.availabilityService.getAvailableUnits(
      data.roomTypeId,
      data.checkIn,
      data.checkOut,
    );

    if (availableUnits < quantity) {
      throw new BadRequestException(
        `Not enough rooms available for the selected dates (requested ${quantity}, available ${availableUnits})`,
      );
    }

    const rates = await this.prisma.roomRate.findMany({
      where: {
        roomTypeId: data.roomTypeId,
        date: { gte: data.checkIn, lt: data.checkOut },
      },
    });

    let pricePerStay = 0;
    for (const rate of rates) {
      pricePerStay += Number(rate.price);
    }

    const nightCount = Math.ceil(
      (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    const missingNights = nightCount - rates.length;
    if (missingNights > 0) {
      pricePerStay += missingNights * 1500;
    }

    const totalPrice = Math.round(pricePerStay * quantity * 100) / 100;

    return this.prisma.booking.create({
      data: {
        roomTypeId: data.roomTypeId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestId: data.guestId,
        quantity,
        totalPrice,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });
  }

  async cancelBooking(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  async confirmBooking(id: string, stripeSessionId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status === BookingStatus.CONFIRMED && booking.stripeSessionId === stripeSessionId) {
      return booking;
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        stripeSessionId,
      },
      include: { roomType: true },
    });

    try {
      const qty = (updatedBooking as any).quantity ?? 1;
      await this.notificationService.sendBookingConfirmationEmail({
        guestEmail: updatedBooking.guestName
          ? `${updatedBooking.guestName.toLowerCase().replace(/\s+/g, '')}@example.com`
          : 'guest@example.com',
        guestName: updatedBooking.guestName,
        bookingId: updatedBooking.id,
        roomTypeName: updatedBooking.roomType?.name || 'Standard Room',
        checkIn: updatedBooking.checkIn.toISOString().split('T')[0],
        checkOut: updatedBooking.checkOut.toISOString().split('T')[0],
        totalPrice: Number(updatedBooking.totalPrice),
        quantity: qty,
      });
    } catch (e) {
      console.error('Failed to send confirmation email:', e);
    }

    return updatedBooking;
  }

  async getBookingsByGuest(guestId: string): Promise<Booking[]> {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    await this.prisma.booking.updateMany({
      where: { status: BookingStatus.PENDING, createdAt: { lt: thirtyMinsAgo } },
      data: { status: BookingStatus.CANCELLED },
    });

    return this.prisma.booking.findMany({
      where: { guestId },
      include: { roomType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllBookings(): Promise<Booking[]> {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    await this.prisma.booking.updateMany({
      where: { status: BookingStatus.PENDING, createdAt: { lt: thirtyMinsAgo } },
      data: { status: BookingStatus.CANCELLED },
    });

    return this.prisma.booking.findMany({
      include: { roomType: true, guest: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBookingStatus(
    id: string,
    status: BookingStatus,
    paymentStatus: PaymentStatus,
  ): Promise<Booking> {
    return this.prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
      },
    });
  }

  async updateBookingDetails(
    id: string,
    data: {
      checkIn?: string;
      checkOut?: string;
      roomTypeId?: string;
      guestName?: string;
      guestPhone?: string;
    },
  ): Promise<Booking> {
    const updateData: any = {};
    if (data.checkIn) updateData.checkIn = new Date(data.checkIn);
    if (data.checkOut) updateData.checkOut = new Date(data.checkOut);
    if (data.roomTypeId) updateData.roomTypeId = data.roomTypeId;
    if (data.guestName) updateData.guestName = data.guestName;
    if (data.guestPhone) updateData.guestPhone = data.guestPhone;

    return this.prisma.booking.update({ where: { id }, data: updateData });
  }
}
