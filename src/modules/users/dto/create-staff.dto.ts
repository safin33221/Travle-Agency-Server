import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StaffRole } from '../../../generated/prisma/client.js';

export class CreateStaffDto {
  @ApiProperty({ example: 'agent1@travelpilot.internal', description: 'Staff email address' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Farhan Ahmed', description: 'Full name of staff' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'InitialTempPass123!', description: 'Initial account password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: StaffRole, default: StaffRole.SALES_AGENT })
  @IsEnum(StaffRole)
  role: StaffRole = StaffRole.SALES_AGENT;
}

