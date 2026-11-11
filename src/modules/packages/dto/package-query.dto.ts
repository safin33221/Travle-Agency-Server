import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export const PACKAGE_SEARCHABLE_FIELDS = [
  'title',
  'destination',
  'description',
];

export const PACKAGE_ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'title',
  'destination',
  'basePrice',
  'durationDays',
];

export class PackageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by destination (case-insensitive partial match)' })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({ description: 'Minimum base price filter' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum base price filter' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by archived status. Defaults to false (active packages only)',
    default: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isArchived: boolean = false;
}
