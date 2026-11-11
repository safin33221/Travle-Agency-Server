import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AiDraftType } from '../../../generated/prisma/client.js';

export class GenerateAiDraftDto {
  @ApiPropertyOptional({ description: 'Optional ID of the lead to generate draft response for' })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({
    example: 'Ami Cox\'s Bazar 3 diner ekta package chai 2 joner jonno.',
    description: 'Raw customer message or staff inquiry notes (Bangla / English / Banglish)',
  })
  @IsString()
  @IsOptional()
  inquiryText?: string;

  @ApiPropertyOptional({
    example: 'Ami Cox\'s Bazar 3 diner ekta package chai 2 joner jonno.',
    description: 'Alias for inquiryText',
  })
  @IsString()
  @IsOptional()
  customerInquiry?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  packageIds?: string[];

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

