export type SectorCategoryKey =
  | 'TOUR'
  | 'HAJJ_UMRAH'
  | 'WORK_PERMIT'
  | 'STUDENT_VISA';

export type DocumentItemStatus = 'PENDING' | 'RECEIVED' | 'VERIFIED' | 'REJECTED';

export interface LeadDocumentChecklistItem {
  key: string;
  title: string;
  required: boolean;
  status: DocumentItemStatus;
  note?: string;
  updatedAt?: string;
}

export type MilestoneItemStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface LeadMilestoneItem {
  key: string;
  title: string;
  status: MilestoneItemStatus;
  completedAt?: string;
}

export const DEFAULT_SECTOR_DOCUMENTS: Record<SectorCategoryKey, string[]> = {
  TOUR: [
    'Passport Copy (Minimum 6 Months Validity)',
    'Recent Passport Size Photograph (White Background)',
    'Bank Statement (Last 6 Months) & Solvency Certificate',
    'NOC / Leave Approval Letter or Trade License Copy',
    'National ID (NID) Copy',
  ],
  HAJJ_UMRAH: [
    'Original Passport (Minimum 6 Months Validity)',
    'National ID (NID) or Birth Certificate Copy',
    'Passport Size Photo (White Background)',
    'Saudi Visa Bio (Biometric) Confirmation Slip',
    'Meningitis & Seasonal Flu Vaccination Card',
    'Pre-Registration (PID) / Nusuk Reference (For Hajj)',
  ],
  WORK_PERMIT: [
    'Original Passport (Minimum 12 Months Validity)',
    'Police Clearance Certificate (PCC)',
    'GAMCA / Wafid Medical Fit Report',
    'Passport Size Photos (White Background, Matte Paper)',
    'National ID (NID) Copy & Nominee NID',
    'Skill / Experience / Trade Certificate (If Applicable)',
    'BMET Registration & PDO Certificate',
  ],
  STUDENT_VISA: [
    'Valid Passport Copy',
    'SSC & HSC Marksheets and Certificates',
    'Bachelor / Master Transcript & Provisional Certificate',
    'IELTS / PTE / Duolingo / MOI Score Report',
    'Updated Academic CV / Resume',
    'Statement of Purpose (SOP) / Study Plan',
    'Two Academic / Professional Reference Letters (LOR)',
    'Sponsor Bank Solvency & 6 Months Bank Statement',
  ],
};

export const DEFAULT_SECTOR_MILESTONES: Record<
  SectorCategoryKey,
  Array<{ key: string; title: string }>
> = {
  TOUR: [
    { key: 'INQUIRY_LOGGED', title: 'Inquiry & Travel Preferences Recorded' },
    { key: 'PACKAGE_QUOTED', title: 'Approved Package Quotation Issued' },
    { key: 'DOCS_COLLECTED', title: 'Passport & Visa Documents Collected' },
    { key: 'VISA_OR_TICKET', title: 'Visa & Air Ticket / Hotel Confirmed' },
    { key: 'READY_TO_TRAVEL', title: 'Final Travel Voucher & Briefing Ready' },
  ],
  HAJJ_UMRAH: [
    { key: 'PRE_REGISTRATION', title: 'File Opened & Pre-Registration / Booking' },
    { key: 'BIOMETRIC_VACCINE', title: 'Saudi Biometric & Vaccine Verification' },
    { key: 'NUSUK_MOFA_VISA', title: 'Nusuk / MOFA & Umrah/Hajj Visa Issued' },
    { key: 'HOTEL_TRANSPORT', title: 'Makkah/Madinah Hotel & Flight Assigned' },
    { key: 'MOALLEM_BRIEFING', title: 'Training, Ihram Kit & Ready for Flight' },
  ],
  WORK_PERMIT: [
    { key: 'FILE_OPENED', title: 'Passport Received & Job Category Selected' },
    { key: 'MEDICAL_PCC', title: 'Police Clearance & GAMCA Medical Completed' },
    { key: 'OFFER_PERMIT', title: 'Work Permit / Calling / Demand Approved' },
    { key: 'EMBASSY_STAMPING', title: 'Mofa & Embassy Visa Stamping Done' },
    { key: 'BMET_MANPOWER', title: 'BMET Smart Card / Manpower Clearance' },
    { key: 'FLIGHT_READY', title: 'Air Ticket Issued & Ready for Departure' },
  ],
  STUDENT_VISA: [
    { key: 'PROFILE_ASSESSED', title: 'Academic Profile & University Shortlisted' },
    { key: 'OFFER_APPLIED', title: 'Application Submitted for Offer Letter' },
    { key: 'OFFER_RECEIVED', title: 'Conditional / Unconditional Offer Received' },
    { key: 'TUITION_CAS_I20', title: 'Tuition Deposit Paid & CAS / I-20 / COE Issued' },
    { key: 'VISA_BIOMETRICS', title: 'Financial File, SOP & Embassy Biometrics Done' },
    { key: 'VISA_DECISION', title: 'Student Visa Approved & Pre-Departure Briefing' },
  ],
};

export function buildDefaultDocumentChecklist(
  category: SectorCategoryKey = 'TOUR',
  customDocs?: string[],
): LeadDocumentChecklistItem[] {
  const sourceDocs =
    customDocs && customDocs.length > 0
      ? customDocs
      : DEFAULT_SECTOR_DOCUMENTS[category] ?? DEFAULT_SECTOR_DOCUMENTS.TOUR;

  return sourceDocs.map((title, idx) => ({
    key: `DOC_${idx + 1}`,
    title,
    required: true,
    status: 'PENDING',
  }));
}

export function buildDefaultMilestoneChecklist(
  category: SectorCategoryKey = 'TOUR',
): LeadMilestoneItem[] {
  const milestones =
    DEFAULT_SECTOR_MILESTONES[category] ?? DEFAULT_SECTOR_MILESTONES.TOUR;

  return milestones.map((item, idx) => ({
    key: item.key,
    title: item.title,
    status: idx === 0 ? 'DONE' : 'PENDING',
    completedAt: idx === 0 ? new Date().toISOString() : undefined,
  }));
}

export function generateTrackingCode(category: SectorCategoryKey = 'TOUR'): string {
  const prefixMap: Record<SectorCategoryKey, string> = {
    TOUR: 'TR',
    HAJJ_UMRAH: 'HJ',
    WORK_PERMIT: 'WP',
    STUDENT_VISA: 'SV',
  };
  const prefix = prefixMap[category] ?? 'TP';
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomDigits}`;
}

export interface EligibilityAssessmentResult {
  status: 'HIGH_MATCH' | 'CONDITIONAL_MATCH' | 'LOW_MATCH';
  score: number;
  summary: string;
  reasons: string[];
}

export function evaluateLeadEligibility(
  category: SectorCategoryKey,
  metadata?: Record<string, unknown>,
  budget?: number,
): EligibilityAssessmentResult {
  if (!metadata || Object.keys(metadata).length === 0) {
    return {
      status: 'CONDITIONAL_MATCH',
      score: 70,
      summary: 'Initial inquiry recorded; profile verification pending.',
      reasons: ['Awaiting detailed document and profile review by counselor.'],
    };
  }

  const reasons: string[] = [];
  let score = 80;

  if (category === 'STUDENT_VISA') {
    const gpa = Number(metadata['gpa'] ?? metadata['cgpa'] ?? 0);
    const ielts = Number(metadata['ieltsScore'] ?? metadata['englishScore'] ?? 0);
    const studyGap = Number(metadata['studyGapYears'] ?? 0);

    if (gpa > 0) {
      if (gpa >= 3.0) {
        score += 10;
        reasons.push(`Strong GPA/CGPA (${gpa})`);
      } else if (gpa < 2.5) {
        score -= 20;
        reasons.push(`Low GPA/CGPA (${gpa}) may limit university options`);
      }
    }

    if (ielts > 0) {
      if (ielts >= 6.0) {
        score += 10;
        reasons.push(`Meets standard IELTS requirement (${ielts})`);
      } else if (ielts < 5.5) {
        score -= 15;
        reasons.push(`English score (${ielts}) may require foundation/pathway`);
      }
    } else {
      reasons.push('IELTS/PTE/MOI status needs confirmation');
    }

    if (studyGap > 5) {
      score -= 25;
      reasons.push(`Study gap of ${studyGap} years requires strong work justification`);
    } else if (studyGap <= 2) {
      reasons.push(`Acceptable study gap (${studyGap} yrs)`);
    }
  } else if (category === 'WORK_PERMIT') {
    const age = Number(metadata['age'] ?? 0);
    const passportValidityMonths = Number(metadata['passportValidityMonths'] ?? 12);

    if (age > 0) {
      if (age >= 21 && age <= 42) {
        score += 10;
        reasons.push(`Age (${age}) is within prime work permit limit`);
      } else if (age < 20 || age > 48) {
        score -= 30;
        reasons.push(`Age (${age}) may face embassy/employer age restrictions`);
      }
    }

    if (passportValidityMonths < 12) {
      score -= 20;
      reasons.push(
        `Passport validity (${passportValidityMonths} months) is below 12-month minimum for work permits; renewal advised`,
      );
    } else {
      reasons.push('Passport validity meets work permit requirement');
    }
  } else if (category === 'HAJJ_UMRAH') {
    const passportValidityMonths = Number(metadata['passportValidityMonths'] ?? 6);
    if (passportValidityMonths < 6) {
      score -= 25;
      reasons.push('Passport needs at least 6 months validity for Umrah/Hajj visa');
    } else {
      reasons.push('Ready for Umrah/Hajj biometric & visa processing');
    }
  }

  if (budget !== undefined && budget > 0) {
    reasons.push(`Declared budget: ${budget.toLocaleString()}`);
  }

  const clampedScore = Math.max(10, Math.min(100, score));
  const status =
    clampedScore >= 75
      ? 'HIGH_MATCH'
      : clampedScore >= 50
        ? 'CONDITIONAL_MATCH'
        : 'LOW_MATCH';

  const summary =
    status === 'HIGH_MATCH'
      ? 'Strong candidate profile for immediate processing.'
      : status === 'CONDITIONAL_MATCH'
        ? 'Eligible with counselor review / additional documents.'
        : 'Requires special counselor evaluation before file opening.';

  return {
    status,
    score: clampedScore,
    summary,
    reasons,
  };
}

