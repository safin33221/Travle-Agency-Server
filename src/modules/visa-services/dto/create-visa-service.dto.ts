import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AgencyServiceStatus,
  VisaCategory,
  VisaPublicationStatus,
} from '../../../generated/prisma/client.js';

export const DEFAULT_VISA_DISCLAIMER =
  'Information is provided for general guidance. Visa requirements and decisions are determined by the relevant authorities and may change.';

export class VisaRequirementItemDto {
  @ApiProperty({ example: 'Valid Passport (Minimum 12 Months Validity)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional({
    example: 'Clear color scan of bio page and any previous visas.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isMandatory: boolean = true;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder: number = 0;
}

export class CreateVisaServiceDto {
  @ApiProperty({ description: 'Destination Country UUID' })
  @IsUUID()
  countryId!: string;

  @ApiProperty({ enum: VisaCategory, example: VisaCategory.STUDENT_VISA })
  @IsEnum(VisaCategory)
  category!: VisaCategory;

  @ApiPropertyOptional({
    example: 'Research Scholar Visa',
    description: 'Optional custom label when category is OTHER',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  customCategoryLabel?: string;

  @ApiProperty({ example: 'Student Visa Assistance' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({
    example: 'student-visa-assistance',
    description: 'Scoped unique slug within the country (auto-generated if omitted)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(180)
  slug?: string;

  @ApiProperty({
    example:
      'End-to-end documentation review, offer letter guidance, and student visa filing assistance.',
  })
  @IsString()
  @IsNotEmpty()
  shortDescription!: string;

  @ApiProperty({
    example:
      'Our counselors assist applicants with university application review, financial documentation checklist verification, and embassy appointment preparation.',
  })
  @IsString()
  @IsNotEmpty()
  fullDescription!: string;

  @ApiPropertyOptional({
    example:
      'Applicants must hold a valid offer letter from an accredited institution and meet financial solvency requirements set by the destination authority.',
  })
  @IsString()
  @IsOptional()
  eligibilityInfo?: string;

  @ApiPropertyOptional({
    type: [VisaRequirementItemDto],
    description: 'Structured document requirements checklist',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisaRequirementItemDto)
  @IsOptional()
  requirements?: VisaRequirementItemDto[];

  @ApiPropertyOptional({
    type: [String],
    example: [
      'Initial consultation & profile document review',
      'Institution offer letter & admission checklist verification',
      'Visa file compilation & appointment scheduling assistance',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicationProcessSteps?: string[];

  @ApiPropertyOptional({
    example: '4 to 8 Weeks (Depends on embassy workload)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  estimatedProcessingTime?: string;

  @ApiPropertyOptional({
    example: 25000,
    description: 'Optional agency consultation/assistance service fee',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  agencyServiceFee?: number;

  @ApiPropertyOptional({
    example:
      'Embassy visa fee and health surcharge are paid directly to the official authority according to current embassy rates.',
  })
  @IsString()
  @IsOptional()
  governmentFeeInfo?: string;

  @ApiPropertyOptional({ default: 'BDT' })
  @IsString()
  @IsOptional()
  currency: string = 'BDT';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  importantNotes?: string;

  @ApiPropertyOptional({ default: DEFAULT_VISA_DISCLAIMER })
  @IsString()
  @IsOptional()
  disclaimer?: string;

  @ApiPropertyOptional({
    example: 'https://www.example.gov/immigration',
  })
  @IsString()
  @IsOptional()
  informationSourceUrl?: string;

  @ApiPropertyOptional({ example: '2026-11-12T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  lastVerifiedAt?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder: number = 0;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured: boolean = false;

  @ApiPropertyOptional({
    enum: VisaPublicationStatus,
    default: VisaPublicationStatus.DRAFT,
  })
  @IsEnum(VisaPublicationStatus)
  @IsOptional()
  publicationStatus: VisaPublicationStatus = VisaPublicationStatus.DRAFT;

  @ApiPropertyOptional({
    enum: AgencyServiceStatus,
    default: AgencyServiceStatus.ACCEPTING_INQUIRIES,
  })
  @IsEnum(AgencyServiceStatus)
  @IsOptional()
  serviceStatus: AgencyServiceStatus = AgencyServiceStatus.ACCEPTING_INQUIRIES;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(160)
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(320)
  seoDescription?: string;
}

