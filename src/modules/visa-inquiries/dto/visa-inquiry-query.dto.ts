import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { VisaCategory } from '../../../generated/prisma/client.js';

export const VISA_INQUIRY_SEARCHABLE_FIELDS = [
  'fullName',
  'phone',
  'email',
  'message',
];

export const VISA_INQUIRY_ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'fullName',
  'category',
];

export class VisaInquiryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Country UUID' })
  @IsUUID()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional({ description: 'Filter by Visa Service UUID' })
  @IsUUID()
  @IsOptional()
  visaServiceId?: string;

  @ApiPropertyOptional({ enum: VisaCategory })
  @IsEnum(VisaCategory)
  @IsOptional()
  category?: VisaCategory;
}

