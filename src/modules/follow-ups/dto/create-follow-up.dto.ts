import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFollowUpDto {
  @ApiPropertyOptional({ example: 'Call client regarding hotel choice' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Follow up on the hotel budget quotation sent yesterday.' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ example: '2026-11-15T10:00:00Z', description: 'Due date/time for the reminder' })
  @IsDateString()
  @IsNotEmpty()
  dueAt!: string;

  @ApiPropertyOptional({ description: 'Staff user assigned to follow up. Defaults to current staff.' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}

