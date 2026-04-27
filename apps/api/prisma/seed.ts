import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@pms.local' },
    update: {},
    create: {
      email: 'admin@pms.local',
      name: 'Super Admin',
      passwordHash: adminPassword,
    },
  });
  console.log('Admin created:', admin.email);

  // 2. Create Room Types
  const standardRoom = await prisma.roomType.create({
    data: {
      name: 'Standard Room',
      description: 'A comfortable standard room with essential amenities.',
      maxOccupancy: 2,
      totalUnits: 10,
      imageUrls: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=800'],
    },
  });
  console.log('Created RoomType:', standardRoom.name);

  const deluxeRoom = await prisma.roomType.create({
    data: {
      name: 'Deluxe Suite',
      description: 'Spacious suite with a beautiful view and premium bedding.',
      maxOccupancy: 4,
      totalUnits: 5,
      imageUrls: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800'],
    },
  });
  console.log('Created RoomType:', deluxeRoom.name);

  // 3. Generate baseline room rates for the next 180 days
  console.log('Generating room rates for the next 180 days...');
  const ratesData: any[] = [];
  const today = new Date();
  
  for (let i = 0; i < 180; i++) {
    const rateDate = new Date(today);
    rateDate.setDate(today.getDate() + i);
    rateDate.setHours(0, 0, 0, 0);

    ratesData.push({
      roomTypeId: standardRoom.id,
      date: rateDate,
      price: 1500,
    });

    ratesData.push({
      roomTypeId: deluxeRoom.id,
      date: rateDate,
      price: 3500,
    });
  }

  await prisma.roomRate.createMany({
    data: ratesData,
    skipDuplicates: true,
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
