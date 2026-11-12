import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import {
  AgencyServiceStatus,
  VisaCategory,
  VisaPublicationStatus,
} from '../../../generated/prisma/client.js';

export const VISA_SERVICE_SEARCHABLE_FIELDS = [
  'title',
  'slug',
  'shortDescription',
  'fullDescription',
];

export const VISA_SERVICE_ALLOWED_SORT_FIELDS = [
  'displayOrder',
  'title',
  'category',
  'agencyServiceFee',
  'createdAt',
  'updatedAt',
];

export class VisaServiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Country UUID' })
  @IsUUID()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional({ description: 'Filter by Country URL slug' })
  @IsString()
  @IsOptional()
  countrySlug?: string;

  @ApiPropertyOptional({ enum: VisaCategory })
  @IsEnum(VisaCategory)
  @IsOptional()
  category?: VisaCategory;

  @ApiPropertyOptional({ enum: AgencyServiceStatus })
  @IsEnum(AgencyServiceStatus)
  @IsOptional()
  serviceStatus?: AgencyServiceStatus;

  @ApiPropertyOptional({
    enum: VisaPublicationStatus,
    description: 'Admin-only publication filter (ignored on public endpoints)',
  })
  @IsEnum(VisaPublicationStatus)
  @IsOptional()
  publicationStatus?: VisaPublicationStatus;

  @ApiPropertyOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}

