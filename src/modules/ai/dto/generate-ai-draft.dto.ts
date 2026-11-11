import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiDraftType } from '../../../generated/prisma/client.js';

export class GenerateAiDraftDto {
  @ApiProperty({ description: 'ID of the lead to generate draft response for' })
  @IsUUID()
  @IsNotEmpty()
  leadId!: string;

  @ApiPropertyOptional({
    example: 'Ami Cox\'s Bazar 3 diner ekta package chai 2 joner jonno.',
    description: 'Raw customer message or staff inquiry notes (Bangla / English / Banglish)',
  })
  @IsString()
  @IsOptional()
  inquiryText?: string;

  @ApiPropertyOptional({ enum: AiDraftType, default: AiDraftType.CUSTOMER_REPLY })
  @IsEnum(AiDraftType)
  @IsOptional()
  type: AiDraftType = AiDraftType.CUSTOMER_REPLY;

  @ApiPropertyOptional({
    example: 'bn',
    description: 'Target output language (e.g. bn, en, banglish)',
    default: 'bn',
  })
  @IsString()
  @IsOptional()
  language: string = 'bn';
}

