import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePackageDto {
  @ApiProperty({ example: 'Cox\'s Bazar Luxury Beach Getaway' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Cox\'s Bazar, Bangladesh' })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @ApiProperty({ example: 3, description: 'Duration in days' })
  @IsInt()
  @Min(1)
  durationDays!: number;

  @ApiProperty({ example: 2, description: 'Duration in nights' })
  @IsInt()
  @Min(0)
  durationNights!: number;

  @ApiProperty({ example: 'Experience 3 days of beachside relaxation with 5-star resort accommodation.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: ['5-star hotel stay', 'Daily buffet breakfast', 'Airport transfers'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  inclusions!: string[];

  @ApiProperty({
    example: ['Lunch and dinner', 'Personal expenses', 'Flight tickets'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  exclusions!: string[];

  @ApiProperty({ example: 25000.0, description: 'Base price per person' })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional({ example: 'BDT', default: 'BDT' })
  @IsString()
  @IsOptional()
  currency: string = 'BDT';

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

