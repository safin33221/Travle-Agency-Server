import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CountryCoverageStatus } from '../../../generated/prisma/client.js';

export class CreateCountryDto {
  @ApiProperty({ example: 'Malaysia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'MY', description: 'ISO 2 or 3 letter country code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(3)
  isoCode!: string;

  @ApiPropertyOptional({
    example: 'malaysia',
    description: 'URL-friendly slug (auto-generated from name if omitted)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(140)
  slug?: string;

  @ApiPropertyOptional({ example: '🇲🇾' })
  @IsString()
  @IsOptional()
  @MaxLength(16)
  flagEmoji?: string;

  @ApiPropertyOptional({ example: 'https://flagcdn.com/w80/my.png' })
  @IsString()
  @IsOptional()
  flagUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiProperty({
    example:
      'Agency assistance for student, tourist, and employment visa documentation for Malaysia.',
  })
  @IsString()
  @IsNotEmpty()
  shortIntro!: string;

  @ApiPropertyOptional({
    example:
      'Comprehensive application documentation, EMGS student guidance, and tourist visa filing support.',
  })
  @IsString()
  @IsOptional()
  detailedDescription?: string;

  @ApiPropertyOptional({
    enum: CountryCoverageStatus,
    default: CountryCoverageStatus.ACTIVE,
  })
  @IsEnum(CountryCoverageStatus)
  @IsOptional()
  coverageStatus: CountryCoverageStatus = CountryCoverageStatus.ACTIVE;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured: boolean = false;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder: number = 0;

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

