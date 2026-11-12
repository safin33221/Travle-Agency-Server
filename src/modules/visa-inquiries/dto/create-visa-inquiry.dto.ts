import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSource, VisaCategory } from '../../../generated/prisma/client.js';

export class CreateVisaInquiryDto {
  @ApiProperty({ example: 'Tanvir Hasan' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(140)
  fullName!: string;

  @ApiProperty({ example: '+8801712345678' })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @ApiPropertyOptional({ example: 'tanvir@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Interested Destination Country UUID' })
  @IsUUID()
  countryId!: string;

  @ApiPropertyOptional({
    description: 'Interested Published Visa Service UUID (optional)',
  })
  @IsUUID()
  @IsOptional()
  visaServiceId?: string;

  @ApiPropertyOptional({
    enum: VisaCategory,
    description:
      'Visa category (auto-derived from visaService if visaServiceId is provided)',
  })
  @IsEnum(VisaCategory)
  @IsOptional()
  category?: VisaCategory;

  @ApiPropertyOptional({
    example:
      'I would like to schedule a consultation regarding the document checklist and intake timeline.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1500)
  message?: string;

  @ApiProperty({
    example: true,
    description: 'Mandatory consent acknowledgement',
  })
  @IsBoolean()
  @Equals(true, {
    message:
      'You must acknowledge the consultation terms and privacy consent to submit an inquiry.',
  })
  consentGiven!: boolean;

  @ApiPropertyOptional({ enum: LeadSource, default: LeadSource.WEBSITE })
  @IsEnum(LeadSource)
  @IsOptional()
  source: LeadSource = LeadSource.WEBSITE;
}

