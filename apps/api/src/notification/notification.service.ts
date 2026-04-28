import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  async sendBookingConfirmationEmail(data: {
    guestEmail: string;
    guestName: string;
    bookingId: string;
    roomTypeName: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
  }) {
    const adminEmail = process.env.SENDGRID_SENDER_EMAIL;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const senderEmail = process.env.SENDGRID_SENDER_EMAIL ;

    console.log(`\n📧 [SIMULATION - EMAIL SENT TO GUEST: ${data.guestEmail}]
      Subject: Booking Confirmed - Royal Amethyst
      Hello ${data.guestName},
      Your reservation #${data.bookingId.slice(0, 8).toUpperCase()} has been confirmed.
    `);

    console.log(`\n📧 [SIMULATION - EMAIL SENT TO ADMIN: ${adminEmail}]
      Subject: New Booking Confirmed - #${data.bookingId.slice(0, 8).toUpperCase()}
      A new booking has been confirmed!
      Guest: ${data.guestName}
      Stay: ${data.checkIn} to ${data.checkOut}
      Room: ${data.roomTypeName}
    `);

    // If SendGrid key is provided, execute actual email dispatch
    if (sendgridApiKey && !sendgridApiKey.startsWith('SG....')) {
      try {
        // Send to Guest
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sendgridApiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: data.guestEmail }], subject: `Booking Confirmed #${data.bookingId.slice(0, 8).toUpperCase()} - Royal Amethyst` }],
            from: { email: senderEmail, name: 'Royal Amethyst' },
            content: [{ type: 'text/html', value: `<h2>Hello ${data.guestName},</h2><p>Your reservation <strong>#${data.bookingId.slice(0, 8).toUpperCase()}</strong> has been confirmed.</p><h3>Details:</h3><ul><li><strong>Room:</strong> ${data.roomTypeName}</li><li><strong>Stay:</strong> ${data.checkIn} to ${data.checkOut}</li><li><strong>Total Paid:</strong> ฿${data.totalPrice.toLocaleString()}</li></ul><p>We look forward to welcoming you!</p>` }],
          }),
        });

        // Send to Admin
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sendgridApiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: adminEmail }], subject: `Admin Alert: New Booking #${data.bookingId.slice(0, 8).toUpperCase()}` }],
            from: { email: senderEmail, name: 'Royal Amethyst' },
            content: [{ type: 'text/html', value: `<h2>New Booking Received!</h2><p>Reservation <strong>#${data.bookingId.slice(0, 8).toUpperCase()}</strong> has been confirmed.</p><h3>Guest Info:</h3><ul><li><strong>Name:</strong> ${data.guestName}</li><li><strong>Room:</strong> ${data.roomTypeName}</li><li><strong>Stay:</strong> ${data.checkIn} to ${data.checkOut}</li><li><strong>Total:</strong> ฿${data.totalPrice.toLocaleString()}</li></ul>` }],
          }),
        });
      } catch (e: any) {
        console.error('SendGrid: Failed to dispatch emails:', e.message);
      }
    }
  }
}
