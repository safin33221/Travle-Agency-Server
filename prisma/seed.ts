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

    // 3. Ensure Sample Verified Tour Packages for Local Development
    const pkgCount = await prisma.package.count();
    if (pkgCount === 0) {
      await prisma.package.createMany({
        data: [
          {
            title: "Cox's Bazar 3D/2N Beach Resort Escape",
            destination: "Cox's Bazar",
            durationDays: 3,
            durationNights: 2,
            description:
              "Enjoy a relaxing 3-day, 2-night seaside holiday in Cox's Bazar with beachfront accommodation, Inani & Himchari sightseeing, and Marine Drive tour.",
            inclusions: [
              '2 Nights AC Deluxe Hotel Stay',
              'Daily Buffet Breakfast',
              'Dhaka – Cox’s Bazar – Dhaka AC Bus',
              'Marine Drive & Inani sightseeing',
            ],
            exclusions: [
              'Personal shopping & tips',
              'Lunch & Dinner',
              'Parasailing or water sports fees',
            ],
            basePrice: 8500,
            currency: 'BDT',
            isArchived: false,
          },
          {
            title: 'Sylhet & Sreemangal 3D/2N Tea Valley Retreat',
            destination: 'Sylhet',
            durationDays: 3,
            durationNights: 2,
            description:
              'Explore Ratargul Swamp Forest, Bichnakandi, Jaflong, and the lush tea estates of Sreemangal with guided transport.',
            inclusions: [
              '2 Nights Resort Accommodation',
              'Daily Breakfast',
              'Local Reserve Chander Gari / Microbus',
              'Ratargul Boat Ride',
            ],
            exclusions: ['Lunch & Dinner', 'Personal expenses'],
            basePrice: 7800,
            currency: 'BDT',
            isArchived: false,
          },
          {
            title: 'Sundarbans 3D/2N Luxury Cruise Expedition',
            destination: 'Sundarbans',
            durationDays: 3,
            durationNights: 2,
            description:
              'Experience the world’s largest mangrove forest aboard an AC tourist vessel visiting Kotka, Jamtola Beach, Harbaria, and Karamjal.',
            inclusions: [
              '3 Days / 2 Nights Tourist Ship Cabin',
              'All Meals & Snacks Onboard',
              'Forest Department Permit & Armed Guard',
              'Guided Canal Cruising',
            ],
            exclusions: ['Dhaka – Khulna transport', 'Camera entry fees'],
            basePrice: 14500,
            currency: 'BDT',
            isArchived: false,
          },
        ],
      });
      console.log('Seeded 3 verified tour packages.');
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

