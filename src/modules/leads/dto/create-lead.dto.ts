import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSource, LeadStage } from '../../../generated/prisma/client.js';

export class CreateLeadDto {
  @ApiProperty({ example: 'Tanvir Hasan' })
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @ApiPropertyOptional({ example: '+8801812345678' })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'tanvir@example.com' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({ enum: LeadSource, default: LeadSource.PHONE })
  @IsEnum(LeadSource)
  @IsOptional()
  source: LeadSource = LeadSource.PHONE;

  @ApiPropertyOptional({ example: 'Cox\'s Bazar' })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({ example: '2026-12-10' })
  @IsDateString()
  @IsOptional()
  travelStartDate?: string;

  @ApiPropertyOptional({ example: '2026-12-14' })
  @IsDateString()
  @IsOptional()
  travelEndDate?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @Min(1)
  @IsOptional()
  travelerCount?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({ example: 'Needs sea-facing room with airport pickup.' })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiPropertyOptional({ enum: LeadStage, default: LeadStage.NEW })
  @IsEnum(LeadStage)
  @IsOptional()
  stage: LeadStage = LeadStage.NEW;

  @ApiPropertyOptional({ description: 'Staff ID assigned to this lead' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}

