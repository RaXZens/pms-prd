import { NotificationService } from './src/notification/notification.service';

const service = new NotificationService();

async function testEmail() {
  console.log('🚀 Initiating SendGrid test email...');
  await service.sendBookingConfirmationEmail({
    guestEmail: 'leekung12341@gmail.com',
    guestName: 'Test Customer',
    bookingId: 'test-booking-id-999',
    roomTypeName: 'Luxury Ocean Suite (Test)',
    checkIn: '2026-05-01',
    checkOut: '2026-05-03',
    totalPrice: 8900,
  });
}

testEmail();
