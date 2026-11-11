import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuotationItemDto {
  @ApiPropertyOptional({ description: 'Optional package ID if linked to catalog' })
  @IsUUID()
  @IsOptional()
  packageId?: string;

  @ApiProperty({ example: '3-Day Luxury Beach Tour Package' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Includes deluxe ocean view cottage and daily meals.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 25000.0, description: 'Unit price per quantity' })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 'BDT', default: 'BDT' })
  @IsString()
  @IsOptional()
  currency: string = 'BDT';
}

