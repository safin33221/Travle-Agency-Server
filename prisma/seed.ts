import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  ServiceCategory,
  StaffRole,
  StaffStatus,
} from '../src/generated/prisma/client.js';
import {
  DEFAULT_SECTOR_DOCUMENTS,
  buildDefaultDocumentChecklist,
  buildDefaultMilestoneChecklist,
} from '../src/common/utils/sector-templates.util.js';

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

    // 4. Ensure Multi-Sector Packages (Hajj & Umrah, Work Permit, Student Visa)
    const multiSectorCount = await prisma.package.count({
      where: {
        category: {
          in: [
            ServiceCategory.HAJJ_UMRAH,
            ServiceCategory.WORK_PERMIT,
            ServiceCategory.STUDENT_VISA,
          ],
        },
      },
    });

    if (multiSectorCount === 0) {
      await prisma.package.createMany({
        data: [
          {
            category: ServiceCategory.HAJJ_UMRAH,
            title: '14-Day Economy Umrah Package (Walking Distance to Haram)',
            destination: 'Makkah & Madinah, Saudi Arabia',
            durationDays: 14,
            durationNights: 13,
            description:
              'Complete 14-day Umrah package including Saudi Umrah visa with insurance, direct return flights, 350m walking distance hotel in Makkah, 250m hotel in Madinah, Ziyarah tour, and experienced Moallem guidance.',
            inclusions: [
              'Umrah Visa & Health Insurance',
              'Return Air Ticket (Dhaka - Jeddah / Madinah)',
              '8 Nights Makkah Hotel (350m from Haram)',
              '5 Nights Madinah Hotel (250m from Masjid an-Nabawi)',
              'AC Bus Transport & Guided Ziyarah',
            ],
            exclusions: [
              'Personal expenses & food unless specified',
              'Saudi Biometric fee',
            ],
            requiredDocuments: DEFAULT_SECTOR_DOCUMENTS.HAJJ_UMRAH,
            structuredSpecs: {
              makkahHotel: 'Al Kiswah Towers / Similar (350m)',
              distanceFromHaramMeters: 350,
              madinahHotel: 'Markazia Central Hotel (250m)',
              packageSubType: 'NON_SHIFTING',
              qurbaniIncluded: false,
              flights: 'Direct Biman / Saudia',
            },
            basePrice: 145000,
            currency: 'BDT',
            isArchived: false,
          },
          {
            category: ServiceCategory.HAJJ_UMRAH,
            title: '35-Day Shifting Hajj Package (Nusuk Verified)',
            destination: 'Makkah, Madinah & Mina/Arafat',
            durationDays: 35,
            durationNights: 34,
            description:
              'Government-approved Shifting Hajj package with Maktab C tent in Mina/Arafat, 3 meals daily, pre-registration support, and dedicated religious scholar accompaniment.',
            inclusions: [
              'Hajj Visa, Nusuk Processing & Maktab Tent',
              'Return Air Ticket',
              '3 Times Bangladeshi Buffet Meals',
              'Makkah & Madinah Accommodation + Azizia Apartment',
            ],
            exclusions: ['Qurbani (Damm) cost (~25,000 BDT)', 'Personal shopping'],
            requiredDocuments: DEFAULT_SECTOR_DOCUMENTS.HAJJ_UMRAH,
            structuredSpecs: {
              makkahHotel: 'Azizia + Haram Shuttle / 600m Post-Hajj',
              distanceFromHaramMeters: 600,
              packageSubType: 'SHIFTING',
              qurbaniIncluded: false,
              flights: 'Direct Hajj Charter',
            },
            basePrice: 585000,
            currency: 'BDT',
            isArchived: false,
          },
          {
            category: ServiceCategory.WORK_PERMIT,
            title: 'Romania General & Warehouse Work Permit (2-Year Renewable)',
            destination: 'Bucharest & Cluj, Romania',
            durationDays: 730,
            durationNights: 729,
            description:
              'Official employer-sponsored work permit processing for Romania (Warehouse, Packaging, Construction, and Hospitality). Includes work permit invitation, embassy submission file preparation, and BMET manpower clearance.',
            inclusions: [
              'Official Romanian Work Permit Issuance',
              'Embassy Appointment & File Processing',
              'BMET / Manpower Clearance Support',
              '2-Year Renewable Employment Contract',
            ],
            exclusions: [
              'Police Clearance & GAMCA/Medical fees',
              'Embassy Visa Fee',
              'One-way Air Ticket (unless added in quote)',
            ],
            requiredDocuments: DEFAULT_SECTOR_DOCUMENTS.WORK_PERMIT,
            structuredSpecs: {
              country: 'Romania',
              jobRole: 'Warehouse / Packaging / General Worker',
              monthlySalaryRange: '650 - 800 EUR Net + Overtime',
              dutyHours: '8 Hours/Day (5 Days/Week)',
              accommodationProvided: true,
              foodProvided: true,
              processingTimeDays: 120,
              ageLimit: '21 - 45 Years',
            },
            basePrice: 680000,
            currency: 'BDT',
            isArchived: false,
          },
          {
            category: ServiceCategory.WORK_PERMIT,
            title: 'Saudi Arabia Company Work Visa (Hospitality & Maintenance)',
            destination: 'Riyadh & Jeddah, Saudi Arabia',
            durationDays: 730,
            durationNights: 729,
            description:
              'Direct company work visa for Saudi Arabia with Iqama, medical insurance, free accommodation, and 90-day fast-track Mofa & embassy visa stamping.',
            inclusions: [
              'Company Wakala & MOFA Number',
              'Embassy Visa Stamping',
              'BMET Training & Manpower Smart Card',
              'One-Way Air Ticket',
            ],
            exclusions: ['GAMCA Wafid Medical Fee', 'Passport / PCC Fee'],
            requiredDocuments: DEFAULT_SECTOR_DOCUMENTS.WORK_PERMIT,
            structuredSpecs: {
              country: 'Saudi Arabia',
              jobRole: 'Hospitality / Facility Maintenance',
              monthlySalaryRange: '1,400 - 1,800 SAR + Overtime',
              dutyHours: '8 Hours + OT',
              accommodationProvided: true,
              foodProvided: false,
              processingTimeDays: 60,
              ageLimit: '21 - 42 Years',
            },
            basePrice: 440000,
            currency: 'BDT',
            isArchived: false,
          },
          {
            category: ServiceCategory.STUDENT_VISA,
            title: "UK Bachelor's & Master's Student Visa Package (IELTS / MOI)",
            destination: 'London, Birmingham & Manchester, UK',
            durationDays: 365,
            durationNights: 364,
            description:
              'End-to-end UK university admission, SOP writing support, CAS letter processing, 28-day bank statement maturity guidance, and UKVI student visa application.',
            inclusions: [
              'University Shortlisting & Offer Letter Processing',
              'SOP & Credibility Interview Preparation',
              'CAS Issuance & Financial Document Review',
              'UKVI Visa Filing & Biometric Appointment',
            ],
            exclusions: [
              'University Tuition Fee Deposit',
              'IHS Health Surcharge & UKVI Embassy Fee',
              'Air Ticket',
            ],
            requiredDocuments: DEFAULT_SECTOR_DOCUMENTS.STUDENT_VISA,
            structuredSpecs: {
              country: 'United Kingdom',
              universityOrInstitute: 'Partner UK Public Universities',
              programLevel: 'BACHELOR / MASTER',
              intakeMonths: 'September, January, May',
              minGpaRequired: '2.75 / 4.00 (or 60%)',
              minIeltsRequired: '6.0 (or MOI Accepted Universities)',
              maxStudyGapYears: 5,
              estimatedTuitionPerYear: '£12,500 - £16,000',
              bankSolvencyRequired: '35 - 45 Lakh BDT (28 Days Maturity)',
            },
            basePrice: 35000,
            currency: 'BDT',
            isArchived: false,
          },
          {
            category: ServiceCategory.STUDENT_VISA,
            title: 'Malaysia Student Visa & EMGS Processing (No IELTS Option)',
            destination: 'Kuala Lumpur, Malaysia',
            durationDays: 365,
            durationNights: 364,
            description:
              'Complete admission and EMGS VAL approval processing for top Malaysian universities with affordable tuition and fast-track eVAL student visa.',
            inclusions: [
              'University Offer Letter within 7 Working Days',
              'EMGS Approval & eVAL Processing',
              'Single Entry Student Visa Assistance',
              'Airport Pickup Coordination in KL',
            ],
            exclusions: ['EMGS Fee & University Tuition Fee', 'Air Ticket'],
            requiredDocuments: DEFAULT_SECTOR_DOCUMENTS.STUDENT_VISA,
            structuredSpecs: {
              country: 'Malaysia',
              universityOrInstitute: 'SEGi / Taylor’s / APU / City University',
              programLevel: 'DIPLOMA / BACHELOR / MASTER',
              intakeMonths: 'March, July, October',
              minGpaRequired: '2.50 / 5.00',
              minIeltsRequired: 'MOI / Internal English Test Accepted',
              maxStudyGapYears: 4,
              estimatedTuitionPerYear: '3.5 - 5.5 Lakh BDT / Year',
              bankSolvencyRequired: 'Not Mandatory for EMGS',
            },
            basePrice: 20000,
            currency: 'BDT',
            isArchived: false,
          },
        ],
      });
      console.log('Seeded 6 verified Hajj/Umrah, Work Permit & Student Visa packages.');
    }

    // 5. Ensure Sample Demo Leads with Public Tracking Codes
    const existingTrackedLead = await prisma.lead.findFirst({
      where: { trackingCode: 'WP-102938' },
    });
    if (!existingTrackedLead) {
      await prisma.lead.create({
        data: {
          trackingCode: 'WP-102938',
          category: ServiceCategory.WORK_PERMIT,
          customerName: 'Md. Rakibul Islam',
          customerPhone: '+8801711223344',
          customerEmail: 'rakib.work@example.com',
          source: 'WEBSITE',
          destination: 'Romania',
          budget: 680000,
          stage: 'QUALIFIED',
          eligibilityStatus: 'HIGH_MATCH',
          requirements: '28 years old, 2 years warehouse experience, passport valid until 2030.',
          documentChecklist: buildDefaultDocumentChecklist('WORK_PERMIT') as any,
          milestoneChecklist: buildDefaultMilestoneChecklist('WORK_PERMIT') as any,
          metadata: {
            age: 28,
            passportValidityMonths: 48,
            jobRole: 'Warehouse Worker',
            eligibilitySummary: 'Strong candidate profile for immediate processing.',
          },
        },
      });
      console.log('Created sample Work Permit lead with trackingCode: WP-102938');
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

