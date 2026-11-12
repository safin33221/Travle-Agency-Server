import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import {
  CountryCoverageStatus,
  VisaCategory,
} from '../../../generated/prisma/client.js';

export const COUNTRY_SEARCHABLE_FIELDS = [
  'name',
  'isoCode',
  'slug',
  'shortIntro',
];

export const COUNTRY_ALLOWED_SORT_FIELDS = [
  'displayOrder',
  'name',
  'isoCode',
  'createdAt',
  'updatedAt',
];

export class CountryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CountryCoverageStatus,
    description: 'Filter by agency service coverage status',
  })
  @IsEnum(CountryCoverageStatus)
  @IsOptional()
  coverageStatus?: CountryCoverageStatus;

  @ApiPropertyOptional({
    description: 'Filter by featured status',
  })
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    enum: VisaCategory,
    description:
      'Filter countries that have at least one published visa service in this category',
  })
  @IsEnum(VisaCategory)
  @IsOptional()
  category?: VisaCategory;
}

