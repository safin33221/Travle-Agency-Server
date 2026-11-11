import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  LeadSource,
  LeadStage,
  ServiceCategory,
} from '../../../generated/prisma/client.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export const LEAD_SEARCHABLE_FIELDS = [
  'trackingCode',
  'customerName',
  'customerPhone',
  'customerEmail',
  'destination',
  'requirements',
];

export const LEAD_ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'customerName',
  'destination',
  'budget',
  'travelStartDate',
  'travelerCount',
  'stage',
  'category',
  'eligibilityStatus',
];

export class LeadQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ServiceCategory,
    description: 'Filter by service sector (TOUR, HAJJ_UMRAH, WORK_PERMIT, STUDENT_VISA)',
  })
  @IsEnum(ServiceCategory)
  @IsOptional()
  category?: ServiceCategory;

  @ApiPropertyOptional({ description: 'Filter by eligibility status (HIGH_MATCH, CONDITIONAL_MATCH, LOW_MATCH)' })
  @IsString()
  @IsOptional()
  eligibilityStatus?: string;

  @ApiPropertyOptional({ enum: LeadStage, description: 'Filter by pipeline stage' })
  @IsEnum(LeadStage)
  @IsOptional()
  stage?: LeadStage;

  @ApiPropertyOptional({ enum: LeadSource, description: 'Filter by inquiry source' })
  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'Filter by assigned staff ID' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Filter by destination (case-insensitive partial match)' })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({ description: 'Minimum budget filter' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minBudget?: number;

  @ApiPropertyOptional({ description: 'Maximum budget filter' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxBudget?: number;

  @ApiPropertyOptional({ description: 'Filter by travel start date from (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  travelFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by travel start date to (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  travelTo?: string;

  @ApiPropertyOptional({ description: 'Filter by created date from (ISO date)' })
  @IsDateString()
  @IsOptional()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by created date to (ISO date)' })
  @IsDateString()
  @IsOptional()
  createdTo?: string;
}
