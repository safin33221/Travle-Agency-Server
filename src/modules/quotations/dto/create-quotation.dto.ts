import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateQuotationItemDto } from './create-quotation-item.dto.js';

export class CreateQuotationDto {
  @ApiPropertyOptional({ example: 'BDT', default: 'BDT' })
  @IsString()
  @IsOptional()
  currency: string = 'BDT';

  @ApiPropertyOptional({ example: 2000.0, description: 'Optional discount amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount: number = 0;

  @ApiPropertyOptional({ example: '2026-11-20T23:59:59Z', description: 'Validity date for quotation' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Specific terms for this quotation' })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @ApiPropertyOptional({ description: 'Alias for termsAndConditions' })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({ description: 'Optional tax rate override' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ example: 'Special corporate package offer.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateQuotationItemDto], description: 'Line items for quotation' })
  @IsArray()
  @ArrayMinSize(1, { message: 'A quotation must contain at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items!: CreateQuotationItemDto[];
}

