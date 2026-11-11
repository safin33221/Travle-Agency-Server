import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAgencySettingsDto {
  @ApiPropertyOptional({ example: 'TravelPilot Tours & Travels' })
  @IsString()
  @IsOptional()
  agencyName?: string;

  @ApiPropertyOptional({ example: 'TravelPilot Agency Ltd.' })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Gulshan-2, Dhaka, Bangladesh' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '+8801700000000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@travelpilot.internal' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'https://travelpilot.internal' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'BDT' })
  @IsString()
  @IsOptional()
  defaultCurrency?: string;

  @ApiPropertyOptional({ example: 5.0, description: 'Default tax percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Default terms and conditions for quotations' })
  @IsString()
  @IsOptional()
  quotationTerms?: string;

  @ApiPropertyOptional({ example: 7, description: 'Default validity period in days' })
  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  quotationValidityDays?: number;
}

