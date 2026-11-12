import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AgencyServiceStatus,
  CountryCoverageStatus,
  FollowUpStatus,
  LeadSource,
  LeadStage,
  PrismaClient,
  ServiceCategory,
  StaffRole,
  StaffStatus,
  VisaCategory,
  VisaPublicationStatus,
} from '../src/generated/prisma/client.js';
import {
  DEFAULT_SECTOR_DOCUMENTS,
  buildDefaultDocumentChecklist,
  buildDefaultMilestoneChecklist,
} from '../src/common/utils/sector-templates.util.js';

const STANDARD_DISCLAIMER =
  'Visa issuance, processing timelines, and work/study permit decisions are determined solely by the respective embassy, high commission, or immigration authority. Our agency provides consultancy, documentation review, and application assistance only and never guarantees visa approval.';

async function resetDatabase(prisma: PrismaClient) {
  console.log('Resetting all development tables in dependency order...');
  await prisma.visaInquiry.deleteMany();
  await prisma.visaServiceRequirement.deleteMany();
  await prisma.visaService.deleteMany();
  await prisma.country.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.aiDraft.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.package.deleteMany();
  await prisma.agencySettings.deleteMany();
  await prisma.staffUser.deleteMany();
  console.log('All tables cleared.');
}

async function seed() {
  const shouldReset = process.argv.includes('--reset');
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/travelpilot?schema=public';
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    if (shouldReset) {
      await resetDatabase(prisma);
    }

    console.log('Seeding agency settings and staff accounts...');

    // 1. Agency Settings
    const existingSettings = await prisma.agencySettings.findFirst();
    if (!existingSettings) {
      await prisma.agencySettings.create({
        data: {
          agencyName: 'TravelPilot Agency',
          legalName: 'TravelPilot Tours & Travels Ltd.',
          email: 'operations@travelpilot.internal',
          phone: '+8801700000000',
          address: 'Banani, Dhaka-1213, Bangladesh',
          defaultCurrency: 'BDT',
          taxRate: 0.0,
          quotationTerms:
            '1. This quotation is valid for 7 days from the date of issue.\n' +
            '2. Prices are subject to airline/hotel availability at the time of final booking confirmation.\n' +
            '3. Embassy visa fees and biometrics are subject to official authority tariffs.\n' +
            '4. A 50% advance deposit is required upon formal booking confirmation.',
          quotationValidityDays: 7,
        },
      });
      console.log('Created agency settings.');
    }

    // 2. Staff Users (OWNER_ADMIN + SALES_AGENT)
    const defaultAdminEmail = 'admin@travelpilot.internal';
    let adminUser = await prisma.staffUser.findUnique({
      where: { email: defaultAdminEmail },
    });
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('Admin@TravelPilot2026!', 10);
      adminUser = await prisma.staffUser.create({
        data: {
          email: defaultAdminEmail,
          name: 'Agency Admin',
          passwordHash,
          role: StaffRole.OWNER_ADMIN,
          status: StaffStatus.ACTIVE,
        },
      });
      console.log(`Created OWNER_ADMIN: ${defaultAdminEmail}`);
    }

    const defaultAgentEmail = 'agent@travelpilot.internal';
    let agentUser = await prisma.staffUser.findUnique({
      where: { email: defaultAgentEmail },
    });
    if (!agentUser) {
      const agentHash = await bcrypt.hash('Agent@TravelPilot2026!', 10);
      agentUser = await prisma.staffUser.create({
        data: {
          email: defaultAgentEmail,
          name: 'Tariqul Hasan',
          passwordHash: agentHash,
          role: StaffRole.SALES_AGENT,
          status: StaffStatus.ACTIVE,
        },
      });
      console.log(`Created SALES_AGENT: ${defaultAgentEmail}`);
    }

    // 3. Verified Packages (Tour, Hajj & Umrah, Work Permit, Student Visa)
    const pkgCount = await prisma.package.count();
    if (pkgCount === 0) {
      await prisma.package.createMany({
        data: [
          {
            category: ServiceCategory.TOUR,
            title: "Cox's Bazar 3D/2N Beach Resort Escape",
            destination: "Cox's Bazar, Bangladesh",
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
            category: ServiceCategory.TOUR,
            title: 'Sylhet & Sreemangal 3D/2N Tea Valley Retreat',
            destination: 'Sylhet & Sreemangal, Bangladesh',
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
            category: ServiceCategory.TOUR,
            title: 'Dubai 5D/4N City, Desert Safari & Marina Cruise',
            destination: 'Dubai, UAE',
            durationDays: 5,
            durationNights: 4,
            description:
              'Complete Dubai holiday package with 4-star Deira/Bur Dubai hotel, half-day city tour, BBQ Desert Safari, Dhow Marina Cruise, and airport transfers.',
            inclusions: [
              '4 Nights 4-Star Hotel with Breakfast',
              'UAE 30-Day Tourist Visa',
              'Desert Safari with BBQ Dinner',
              'Dubai Marina Dhow Cruise',
              'Return Airport Transfers',
            ],
            exclusions: ['Return Airfare', 'Tourism Dirham Fee', 'Burj Khalifa Top Ticket'],
            basePrice: 54000,
            currency: 'BDT',
            isArchived: false,
          },
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
              'Direct company work visa for Saudi Arabia with Iqama, medical insurance, free accommodation, and 90-day fast-track MOFA & embassy visa stamping.',
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
      console.log('Seeded 9 verified packages across Tour, Hajj/Umrah, Work Permit & Student Visa.');
    }

    // 4. Real Destination Countries & Visa Services
    let ukStudentServiceId = '';
    let ukCountryId = '';
    let romaniaWorkServiceId = '';
    let romaniaCountryId = '';

    const countryCount = await prisma.country.count();
    if (countryCount === 0) {
      // 4.1 United Kingdom
      const uk = await prisma.country.create({
        data: {
          name: 'United Kingdom',
          isoCode: 'GBR',
          slug: 'united-kingdom',
          flagEmoji: '🇬🇧',
          shortIntro:
            'Comprehensive UKVI Student Route and Standard Visitor visa consultancy, CAS financial verification, and VFS biometric appointment support.',
          detailedDescription:
            'Our UK desk assists students and visitors with compliant UKVI application preparation, 28-day bank maturity verification, Tuberculosis (TB) test guidance, and VFS Global appointment scheduling in Dhaka, Sylhet, and Chattogram.',
          coverageStatus: CountryCoverageStatus.ACTIVE,
          isFeatured: true,
          displayOrder: 1,
          seoTitle: 'UK Visa & Student Consultancy Services | TravelPilot',
          seoDescription:
            'UK Student Visa and Standard Visitor Visa documentation checklist, eligibility guidance, and consultation.',
        },
      });
      ukCountryId = uk.id;

      const ukStudent = await prisma.visaService.create({
        data: {
          countryId: uk.id,
          category: VisaCategory.STUDENT_VISA,
          title: 'UK Student Visa (Student Route) Assistance',
          slug: 'uk-student-visa-assistance',
          shortDescription:
            'Admission, CAS verification, 28-day financial maturity check, and UKVI Student Visa filing guidance.',
          fullDescription:
            'We guide Bangladeshi applicants through UK university shortlisting, Statement of Purpose (SOP) review, credibility interview preparation, CAS financial compliance, and UKVI online visa submission.',
          eligibilityInfo:
            'Applicants typically need an unconditional offer & CAS from a UKVI-licensed university, IELTS 6.0+ (or accepted MOI/internal test), and 28-day matured bank funds covering tuition balance + UKVI living maintenance.',
          applicationProcessSteps: [
            'Academic profile & study-gap assessment',
            'University offer letter & CAS processing',
            '28-day bank statement & TB test verification',
            'UKVI online form & IHS surcharge submission',
            'VFS Global biometric appointment & passport tracking',
          ],
          estimatedProcessingTime: '3 to 4 Weeks (Standard UKVI Processing)',
          agencyServiceFee: 25000,
          governmentFeeInfo:
            'UKVI Visa Fee (£490) + Immigration Health Surcharge (£776/year) paid directly to UKVI.',
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          informationSourceUrl: 'https://www.gov.uk/student-visa',
          lastVerifiedAt: new Date(),
          displayOrder: 1,
          isFeatured: true,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
          requirements: {
            create: [
              {
                title: 'Valid Passport (minimum 6 months validity)',
                description: 'Must have at least one blank page for visa vignette.',
                isMandatory: true,
                displayOrder: 1,
              },
              {
                title: 'CAS (Confirmation of Acceptance for Studies) Letter',
                description: 'Issued by the UK sponsor university after deposit payment.',
                isMandatory: true,
                displayOrder: 2,
              },
              {
                title: '28-Day Matured Bank Statement & Solvency Certificate',
                description: 'Held in applicant or parents’ account in a UKVI-approved bank.',
                isMandatory: true,
                displayOrder: 3,
              },
              {
                title: 'IOM Approved TB Test Certificate',
                description: 'Mandatory medical screening from an approved clinic in Bangladesh.',
                isMandatory: true,
                displayOrder: 4,
              },
              {
                title: 'IELTS / English Proficiency & Academic Transcripts',
                description: 'SSC, HSC, Bachelor/Master certificates and transcripts.',
                isMandatory: true,
                displayOrder: 5,
              },
            ],
          },
        },
      });
      ukStudentServiceId = ukStudent.id;

      await prisma.visaService.create({
        data: {
          countryId: uk.id,
          category: VisaCategory.TOURIST_VISA,
          title: 'UK Standard Visitor / Tourist Visa Assistance',
          slug: 'uk-tourist-visa-assistance',
          shortDescription:
            'Documentation review, cover letter drafting, travel itinerary, and VFS filing for UK tourism or family visits.',
          fullDescription:
            'Structured support for business owners, salaried professionals, and families applying for a 6-month or 2-year UK Standard Visitor Visa.',
          eligibilityInfo:
            'Strong home ties, verifiable income/tax returns, and consistent 6-month bank transactions matching travel budget.',
          applicationProcessSteps: [
            'Profile & financial tie assessment',
            'Document checklist & employer/business NOC verification',
            'UKVI online application & cover letter preparation',
            'VFS Global document upload & biometric booking',
          ],
          estimatedProcessingTime: '3 to 5 Weeks (Standard UKVI)',
          agencyServiceFee: 12000,
          governmentFeeInfo: 'UKVI Standard Visitor Fee (£115 for 6 months) paid online.',
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          informationSourceUrl: 'https://www.gov.uk/standard-visitor',
          lastVerifiedAt: new Date(),
          displayOrder: 2,
          isFeatured: false,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
          requirements: {
            create: [
              {
                title: 'Valid Passport & Previous Travel History',
                isMandatory: true,
                displayOrder: 1,
              },
              {
                title: '6-Month Personal Bank Statement & Solvency',
                isMandatory: true,
                displayOrder: 2,
              },
              {
                title: 'TIN Certificate & Income Tax Return (ITR)',
                isMandatory: true,
                displayOrder: 3,
              },
              {
                title: 'NOC from Employer / Trade License (if Business)',
                isMandatory: true,
                displayOrder: 4,
              },
            ],
          },
        },
      });

      // 4.2 Canada
      const canada = await prisma.country.create({
        data: {
          name: 'Canada',
          isoCode: 'CAN',
          slug: 'canada',
          flagEmoji: '🇨🇦',
          shortIntro:
            'IRCC Study Permit and Temporary Resident Visa (TRV) documentation consultancy and PAL/LOA file review.',
          detailedDescription:
            'We assist students and visitors preparing IRCC-compliant visa files, GIC/financial proofs, Study Plans (SOP), and VFS Canada VAC biometric scheduling.',
          coverageStatus: CountryCoverageStatus.ACTIVE,
          isFeatured: true,
          displayOrder: 2,
          seoTitle: 'Canada Study Permit & Visitor Visa Assistance | TravelPilot',
        },
      });

      await prisma.visaService.create({
        data: {
          countryId: canada.id,
          category: VisaCategory.STUDENT_VISA,
          title: 'Canada Study Permit Assistance',
          slug: 'canada-study-permit-assistance',
          shortDescription:
            'DLI college/university admission, PAL guidance, Study Plan review, and IRCC portal application support.',
          fullDescription:
            'End-to-end guidance for Canadian DLI admissions, Provincial Attestation Letter (PAL) requirements, GIC/financial proof compilation, and IRCC GCKey submission.',
          eligibilityInfo:
            'Valid Letter of Acceptance (LOA) from a Designated Learning Institution (DLI), PAL (where applicable), IELTS 6.0+, and sufficient tuition + living funds.',
          applicationProcessSteps: [
            'DLI Program & Eligibility Assessment',
            'Admission & Provincial Attestation Letter (PAL)',
            'Financial proof / GIC & Study Plan preparation',
            'IRCC submission & VFS Biometrics',
          ],
          estimatedProcessingTime: '6 to 10 Weeks (IRCC Indicative)',
          agencyServiceFee: 35000,
          governmentFeeInfo: 'IRCC Study Permit Fee (CAD 150) + Biometrics (CAD 85) paid to IRCC.',
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          informationSourceUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html',
          lastVerifiedAt: new Date(),
          displayOrder: 1,
          isFeatured: true,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
          requirements: {
            create: [
              { title: 'Valid Passport', isMandatory: true, displayOrder: 1 },
              { title: 'DLI Letter of Acceptance (LOA) & PAL', isMandatory: true, displayOrder: 2 },
              { title: 'Financial Proof / GIC & Sponsor Bank Statements', isMandatory: true, displayOrder: 3 },
              { title: 'IELTS / English Test & Academic Transcripts', isMandatory: true, displayOrder: 4 },
              { title: 'Upfront Medical Exam (eMedical)', isMandatory: true, displayOrder: 5 },
            ],
          },
        },
      });

      await prisma.visaService.create({
        data: {
          countryId: canada.id,
          category: VisaCategory.TOURIST_VISA,
          title: 'Canada Visitor Visa (TRV) Assistance',
          slug: 'canada-visitor-visa-assistance',
          shortDescription:
            'IRCC Temporary Resident Visa file preparation for tourism, family visit, or business conferences.',
          fullDescription:
            'Comprehensive IRCC Temporary Resident Visa (TRV) file preparation, financial tie verification, invitation letter review, and VFS biometric scheduling for Canada visitors.',
          estimatedProcessingTime: '8 to 14 Weeks (IRCC Indicative)',
          agencyServiceFee: 15000,
          governmentFeeInfo: 'IRCC Visitor Visa Fee (CAD 100) + Biometrics (CAD 85).',
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          lastVerifiedAt: new Date(),
          displayOrder: 2,
          isFeatured: false,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.LIMITED,
          requirements: {
            create: [
              { title: 'Valid Passport & Travel History', isMandatory: true, displayOrder: 1 },
              { title: '6-Month Bank Statement & Income Tax Return', isMandatory: true, displayOrder: 2 },
              { title: 'Invitation Letter / Hotel & Itinerary', isMandatory: false, displayOrder: 3 },
            ],
          },
        },
      });

      // 4.3 Malaysia
      const malaysia = await prisma.country.create({
        data: {
          name: 'Malaysia',
          isoCode: 'MYS',
          slug: 'malaysia',
          flagEmoji: '🇲🇾',
          shortIntro:
            'Fast-track Malaysia EMGS Student eVAL processing and Malaysia Tourist eVisa assistance.',
          detailedDescription:
            'Malaysia is one of the fastest and most affordable destinations for higher education and short leisure trips from Bangladesh.',
          coverageStatus: CountryCoverageStatus.ACTIVE,
          isFeatured: true,
          displayOrder: 3,
        },
      });

      await prisma.visaService.create({
        data: {
          countryId: malaysia.id,
          category: VisaCategory.STUDENT_VISA,
          title: 'Malaysia Student Visa & EMGS eVAL Assistance',
          slug: 'malaysia-student-visa-emgs',
          shortDescription:
            'University offer letter, EMGS portal tracking, eVAL approval, and Single Entry Visa (SEV) assistance.',
          fullDescription:
            'Complete Malaysian university admission, EMGS VAL portal tracking, eVAL approval support, and Single Entry Visa (SEV) submission guidance for international students.',
          estimatedProcessingTime: '4 to 6 Weeks (EMGS + SEV)',
          agencyServiceFee: 20000,
          governmentFeeInfo: 'EMGS processing fee varies by university & program duration.',
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          lastVerifiedAt: new Date(),
          displayOrder: 1,
          isFeatured: true,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
          requirements: {
            create: [
              { title: 'Passport (All Pages Scan, 18+ Months Validity)', isMandatory: true, displayOrder: 1 },
              { title: 'Academic Certificates & Transcripts', isMandatory: true, displayOrder: 2 },
              { title: 'White-Background Passport Photo', isMandatory: true, displayOrder: 3 },
              { title: 'Pre-Arrival Medical Declaration Form', isMandatory: true, displayOrder: 4 },
            ],
          },
        },
      });

      await prisma.visaService.create({
        data: {
          countryId: malaysia.id,
          category: VisaCategory.TOURIST_VISA,
          title: 'Malaysia Tourist eVisa Assistance',
          slug: 'malaysia-tourist-evisa',
          shortDescription:
            'Online eVisa application, flight/hotel itinerary preparation, and financial document formatting.',
          fullDescription:
            'Fast online Malaysia Tourist eVisa filing, compliant itinerary formatting, and bank document review for leisure and family travelers.',
          estimatedProcessingTime: '4 to 7 Working Days',
          agencyServiceFee: 4500,
          governmentFeeInfo: 'Official Malaysia eVisa fee paid via portal.',
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          lastVerifiedAt: new Date(),
          displayOrder: 2,
          isFeatured: false,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
          requirements: {
            create: [
              { title: 'Valid Passport (minimum 6 months)', isMandatory: true, displayOrder: 1 },
              { title: 'Recent Studio Photo (35mm x 50mm White BG)', isMandatory: true, displayOrder: 2 },
              { title: '6-Month Bank Statement & Solvency', isMandatory: true, displayOrder: 3 },
            ],
          },
        },
      });

      // 4.4 Saudi Arabia
      const saudi = await prisma.country.create({
        data: {
          name: 'Saudi Arabia',
          isoCode: 'SAU',
          slug: 'saudi-arabia',
          flagEmoji: '🇸🇦',
          shortIntro:
            'Verified Saudi company work visa stamping support, BMET clearance guidance, and Umrah visa processing.',
          coverageStatus: CountryCoverageStatus.ACTIVE,
          isFeatured: true,
          displayOrder: 4,
        },
      });

      await prisma.visaService.create({
        data: {
          countryId: saudi.id,
          category: VisaCategory.WORK_VISA,
          title: 'Saudi Arabia Company Work Visa Assistance',
          slug: 'saudi-company-work-visa',
          shortDescription:
            'Wakala & MOFA verification, GAMCA Wafid medical scheduling, police clearance, and embassy visa stamping guidance.',
          fullDescription:
            'Structured Saudi Arabia company work visa processing support including Wakala & MOFA verification, GAMCA/Wafid medical booking, Tasheer biometrics, and BMET clearance guidance.',
          estimatedProcessingTime: '45 to 60 Days',
          agencyServiceFee: 30000,
          governmentFeeInfo: 'GAMCA medical, Tasheer biometrics & BMET smart card fees apply.',
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          lastVerifiedAt: new Date(),
          displayOrder: 1,
          isFeatured: true,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
          requirements: {
            create: [
              { title: 'Original Passport (minimum 12 months validity)', isMandatory: true, displayOrder: 1 },
              { title: 'GAMCA / Wafid Medical Fit Certificate', isMandatory: true, displayOrder: 2 },
              { title: 'Police Clearance Certificate (Attested)', isMandatory: true, displayOrder: 3 },
              { title: 'Verified Employer Wakala & Employment Contract', isMandatory: true, displayOrder: 4 },
            ],
          },
        },
      });

      // 4.5 Romania (Work Permit - Limited Intake)
      const romania = await prisma.country.create({
        data: {
          name: 'Romania',
          isoCode: 'ROU',
          slug: 'romania',
          flagEmoji: '🇷🇴',
          shortIntro:
            'European Schengen work permit file preparation, IGI permit verification, and Romanian Embassy D-type visa guidance.',
          coverageStatus: CountryCoverageStatus.LIMITED,
          isFeatured: true,
          displayOrder: 5,
        },
      });
      romaniaCountryId = romania.id;

      const romaniaWork = await prisma.visaService.create({
        data: {
          countryId: romania.id,
          category: VisaCategory.WORK_PERMIT,
          title: 'Romania Work Permit & D-Type Visa File Assistance',
          slug: 'romania-work-permit-assistance',
          shortDescription:
            'Employer work permit (Aviz de Munca) verification, Ministry attestation, and Romanian Embassy D/AM visa file preparation.',
          fullDescription:
            'End-to-end documentation assistance for Romanian IGI work permit holders applying for a D/AM long-stay employment visa, including MOFA attestation and embassy interview preparation.',
          estimatedProcessingTime: '3 to 5 Months (IGI + Embassy)',
          agencyServiceFee: 45000,
          governmentFeeInfo: 'Embassy D-Type Visa Fee (€120) & notarization paid separately.',
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          lastVerifiedAt: new Date(),
          displayOrder: 1,
          isFeatured: true,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.LIMITED,
          requirements: {
            create: [
              { title: 'Valid Passport (minimum 18 months)', isMandatory: true, displayOrder: 1 },
              { title: 'Police Clearance Certificate (MOFA Attested)', isMandatory: true, displayOrder: 2 },
              { title: 'Employer Work Permit (Aviz de Munca)', isMandatory: true, displayOrder: 3 },
              { title: 'Skill / Experience Certificate & CV', isMandatory: false, displayOrder: 4 },
            ],
          },
        },
      });
      romaniaWorkServiceId = romaniaWork.id;

      // 4.6 United Arab Emirates
      const uae = await prisma.country.create({
        data: {
          name: 'United Arab Emirates',
          isoCode: 'ARE',
          slug: 'united-arab-emirates',
          flagEmoji: '🇦🇪',
          shortIntro:
            'UAE 30-day & 60-day Tourist eVisa processing for Dubai, Abu Dhabi, and Sharjah.',
          coverageStatus: CountryCoverageStatus.ACTIVE,
          isFeatured: false,
          displayOrder: 6,
        },
      });

      await prisma.visaService.create({
        data: {
          countryId: uae.id,
          category: VisaCategory.TOURIST_VISA,
          title: 'Dubai / UAE 30-Day & 60-Day Tourist Visa',
          slug: 'dubai-uae-tourist-visa',
          shortDescription:
            'Fast-track UAE tourist eVisa processing with hotel & return flight itinerary support.',
          fullDescription:
            'Quick UAE 30-day and 60-day tourist eVisa assistance with travel itinerary formatting, hotel booking support, and visa status tracking.',
          estimatedProcessingTime: '3 to 5 Working Days',
          agencyServiceFee: 14500,
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          lastVerifiedAt: new Date(),
          displayOrder: 1,
          isFeatured: false,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
          requirements: {
            create: [
              { title: 'Passport Scan (6+ Months Validity)', isMandatory: true, displayOrder: 1 },
              { title: 'Recent White-Background Photo', isMandatory: true, displayOrder: 2 },
              { title: 'Return Air Ticket / Hotel Confirmation', isMandatory: false, displayOrder: 3 },
            ],
          },
        },
      });

      await prisma.visaService.create({
        data: {
          countryId: uae.id,
          category: VisaCategory.WORK_VISA,
          title: 'UAE Employment Visa Documentation Support',
          slug: 'uae-employment-visa-support',
          shortDescription:
            'Temporarily paused while verifying new employer quotas for upcoming quarter.',
          fullDescription:
            'Employment visa attestation and entry permit documentation support for UAE employers. Currently paused for new intake while verifying updated employer quotas.',
          estimatedProcessingTime: 'TBD',
          agencyServiceFee: 25000,
          currency: 'BDT',
          disclaimer: STANDARD_DISCLAIMER,
          lastVerifiedAt: new Date(),
          displayOrder: 2,
          isFeatured: false,
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.TEMPORARILY_PAUSED,
          requirements: {
            create: [
              { title: 'Valid Passport', isMandatory: true, displayOrder: 1 },
              { title: 'Attested Academic / Skill Certificate', isMandatory: true, displayOrder: 2 },
            ],
          },
        },
      });

      console.log('Seeded 6 real destination countries and 10 visa services.');
    }

    // 5. Realistic Sample Leads, Notes, Follow-ups, and Linked Visa Inquiries
    const leadCount = await prisma.lead.count();
    if (leadCount === 0) {
      // Lead 1: Work Permit (Romania) linked to VisaInquiry
      const lead1 = await prisma.lead.create({
        data: {
          trackingCode: 'WP-102938',
          category: ServiceCategory.WORK_PERMIT,
          customerName: 'Md. Rakibul Islam',
          customerPhone: '+8801711223344',
          customerEmail: 'rakib.work@example.com',
          source: LeadSource.WEBSITE,
          destination: 'Romania',
          budget: 680000,
          stage: LeadStage.QUALIFIED,
          eligibilityStatus: 'HIGH_MATCH',
          assignedToId: agentUser.id,
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

      await prisma.leadNote.create({
        data: {
          leadId: lead1.id,
          authorId: agentUser.id,
          content: 'Verified passport expiry (2030) and 2 years logistics experience. Ready for PCC & medical briefing.',
        },
      });

      await prisma.followUpTask.create({
        data: {
          leadId: lead1.id,
          assignedToId: agentUser.id,
          title: 'Collect Police Clearance & schedule embassy briefing',
          dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: FollowUpStatus.OPEN,
        },
      });

      if (romaniaCountryId && romaniaWorkServiceId) {
        await prisma.visaInquiry.create({
          data: {
            countryId: romaniaCountryId,
            visaServiceId: romaniaWorkServiceId,
            category: VisaCategory.WORK_PERMIT,
            fullName: lead1.customerName,
            phone: lead1.customerPhone ?? '+8801711223344',
            email: lead1.customerEmail,
            message: 'Interested in Romania Warehouse Work Permit for 2027 intake.',
            consentGiven: true,
            leadId: lead1.id,
          },
        });
      }

      // Lead 2: UK Student Visa linked to VisaInquiry
      const lead2 = await prisma.lead.create({
        data: {
          trackingCode: 'TRK-UK4821',
          category: ServiceCategory.STUDENT_VISA,
          customerName: 'Nusrat Jahan Mim',
          customerPhone: '+8801812345678',
          customerEmail: 'nusrat.mim@example.com',
          source: LeadSource.WEBSITE,
          destination: 'United Kingdom',
          budget: 2500000,
          stage: LeadStage.NEW,
          eligibilityStatus: 'HIGH_MATCH',
          assignedToId: agentUser.id,
          requirements: 'BBA CGPA 3.45, IELTS 6.5 overall, targeting MSc Management for September intake.',
          documentChecklist: buildDefaultDocumentChecklist('STUDENT_VISA') as any,
          milestoneChecklist: buildDefaultMilestoneChecklist('STUDENT_VISA') as any,
        },
      });

      if (ukCountryId && ukStudentServiceId) {
        await prisma.visaInquiry.create({
          data: {
            countryId: ukCountryId,
            visaServiceId: ukStudentServiceId,
            category: VisaCategory.STUDENT_VISA,
            fullName: lead2.customerName,
            phone: lead2.customerPhone ?? '+8801812345678',
            email: lead2.customerEmail,
            message: 'Looking for UK MSc Management admission and Student Route visa guidance.',
            consentGiven: true,
            leadId: lead2.id,
          },
        });
      }

      // Lead 3: Hajj & Umrah
      await prisma.lead.create({
        data: {
          trackingCode: 'TRK-UM9012',
          category: ServiceCategory.HAJJ_UMRAH,
          customerName: 'Haji Abdul Karim',
          customerPhone: '+8801911556677',
          source: LeadSource.PHONE,
          destination: 'Makkah & Madinah, Saudi Arabia',
          travelerCount: 4,
          budget: 580000,
          stage: LeadStage.QUOTED,
          assignedToId: adminUser.id,
          requirements: 'Family of 4 (including 1 senior citizen), prefers 350m walking distance hotel in Makkah.',
          documentChecklist: buildDefaultDocumentChecklist('HAJJ_UMRAH') as any,
          milestoneChecklist: buildDefaultMilestoneChecklist('HAJJ_UMRAH') as any,
        },
      });

      // Lead 4: Dubai Tour
      await prisma.lead.create({
        data: {
          trackingCode: 'TRK-DB2045',
          category: ServiceCategory.TOUR,
          customerName: 'Farhan Ahmed',
          customerPhone: '+8801611998877',
          customerEmail: 'farhan.ahmed@example.com',
          source: LeadSource.WHATSAPP,
          destination: 'Dubai, UAE',
          travelerCount: 2,
          budget: 120000,
          stage: LeadStage.FOLLOW_UP,
          assignedToId: agentUser.id,
          requirements: '5D/4N Dubai couple trip with Desert Safari and UAE Tourist Visa.',
        },
      });

      console.log('Seeded 4 sample leads, notes, follow-up task, and 2 linked visa inquiries.');
    }

    console.log('Database seeding complete.');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seed();
