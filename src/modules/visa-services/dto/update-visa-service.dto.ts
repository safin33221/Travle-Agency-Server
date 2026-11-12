import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AgencyServiceStatus,
  VisaCategory,
  VisaPublicationStatus,
} from '../../../generated/prisma/client.js';
import { VisaRequirementItemDto } from './create-visa-service.dto.js';

export class UpdateVisaServiceDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional({ enum: VisaCategory })
  @IsEnum(VisaCategory)
  @IsOptional()
  category?: VisaCategory;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  customCategoryLabel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(180)
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fullDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  eligibilityInfo?: string;

  @ApiPropertyOptional({ type: [VisaRequirementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisaRequirementItemDto)
  @IsOptional()
  requirements?: VisaRequirementItemDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicationProcessSteps?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(160)
  estimatedProcessingTime?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  agencyServiceFee?: number | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  governmentFeeInfo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  importantNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  disclaimer?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  informationSourceUrl?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  lastVerifiedAt?: string | null;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: VisaPublicationStatus })
  @IsEnum(VisaPublicationStatus)
  @IsOptional()
  publicationStatus?: VisaPublicationStatus;

  @ApiPropertyOptional({ enum: AgencyServiceStatus })
  @IsEnum(AgencyServiceStatus)
  @IsOptional()
  serviceStatus?: AgencyServiceStatus;

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

