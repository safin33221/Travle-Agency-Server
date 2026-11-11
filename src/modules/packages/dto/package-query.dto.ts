import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PackageQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Filter by search term in title or destination' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by destination' })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({
    description: 'Filter by archived status. Defaults to false (active packages only)',
    default: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isArchived: boolean = false;
}

