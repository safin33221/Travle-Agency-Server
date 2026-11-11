import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole, StaffStatus } from '../../../generated/prisma/client.js';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Farhan Ahmed Updated' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: StaffRole })
  @IsEnum(StaffRole)
  @IsOptional()
  role?: StaffRole;

  @ApiPropertyOptional({ enum: StaffStatus })
  @IsEnum(StaffStatus)
  @IsOptional()
  status?: StaffStatus;

  @ApiPropertyOptional({ description: 'Reset password if supplied' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}

