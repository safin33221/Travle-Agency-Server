import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CountryCoverageStatus } from '../../../generated/prisma/client.js';

export class UpdateCountryDto {
  @ApiPropertyOptional({ example: 'Malaysia' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'MY' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(3)
  isoCode?: string;

  @ApiPropertyOptional({ example: 'malaysia' })
  @IsString()
  @IsOptional()
  @MaxLength(140)
  slug?: string;

  @ApiPropertyOptional({ example: '🇲🇾' })
  @IsString()
  @IsOptional()
  @MaxLength(16)
  flagEmoji?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  flagUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shortIntro?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  detailedDescription?: string;

  @ApiPropertyOptional({ enum: CountryCoverageStatus })
  @IsEnum(CountryCoverageStatus)
  @IsOptional()
  coverageStatus?: CountryCoverageStatus;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

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

