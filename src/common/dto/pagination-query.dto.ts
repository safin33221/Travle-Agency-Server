import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type SortOrder = 'asc' | 'desc';

/**
 * Reusable base DTO for paginated, searchable, and sortable list endpoints.
 * Extend this class in module-specific query DTOs (e.g. LeadQueryDto, PackageQueryDto).
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number (1-indexed)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Search keyword across configured searchable fields' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Alias for search keyword (frontend compatibility)' })
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @ApiPropertyOptional({ default: 'createdAt', description: 'Field name to sort by' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Sort direction' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder: SortOrder = 'desc';
}

