export interface RoomType {
  id: string;
  name: string;
  description: string | null;
  maxOccupancy: number;
  totalUnits: number;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomRate {
  id: string;
  roomTypeId: string;
  date: Date;
  price: number;
  createdAt: Date;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID'
}

export interface Booking {
  id: string;
  roomTypeId: string;
  guestId: string | null;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  stripeSessionId: string | null;
  guestName: string;
  guestPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum Provider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE'
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  provider: Provider;
  createdAt: Date;
}

export interface Admin {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}
