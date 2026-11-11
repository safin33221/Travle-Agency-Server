import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, StaffRole, StaffStatus } from '../src/generated/prisma/client.js';

async function seed() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/travelpilot?schema=public';
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Seeding initial agency settings and owner admin...');

  try {
    // 1. Ensure Agency Settings
    const existingSettings = await prisma.agencySettings.findFirst();
    if (!existingSettings) {
      await prisma.agencySettings.create({
        data: {
          agencyName: 'TravelPilot Agency',
          legalName: 'TravelPilot Tours & Travels Ltd.',
          email: 'operations@travelpilot.internal',
          phone: '+8801700000000',
          defaultCurrency: 'BDT',
          taxRate: 0.00,
          quotationTerms:
            '1. This quotation is valid for 7 days from the date of issue.\n' +
            '2. Prices are subject to availability at the time of final booking confirmation.\n' +
            '3. Standard agency cancellation and refund policies apply.\n' +
            '4. A 50% advance deposit is required upon formal booking confirmation.',
          quotationValidityDays: 7,
        },
      });
      console.log('Created default agency settings.');
    } else {
      console.log('Agency settings already present.');
    }

    // 2. Ensure Initial OWNER_ADMIN
    const defaultAdminEmail = 'admin@travelpilot.internal';
    const existingAdmin = await prisma.staffUser.findUnique({
      where: { email: defaultAdminEmail },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('Admin@TravelPilot2026!', 10);
      await prisma.staffUser.create({
        data: {
          email: defaultAdminEmail,
          name: 'Agency Admin',
          passwordHash,
          role: StaffRole.OWNER_ADMIN,
          status: StaffStatus.ACTIVE,
        },
      });
      console.log(`Created default OWNER_ADMIN: ${defaultAdminEmail}`);
    } else {
      console.log(`OWNER_ADMIN ${defaultAdminEmail} already present.`);
    }

    console.log('Seeding complete.');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seed();

