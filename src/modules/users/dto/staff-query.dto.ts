import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole, StaffStatus } from '../../../generated/prisma/client.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export const STAFF_SEARCHABLE_FIELDS = ['name', 'email'];
export const STAFF_ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'lastLoginAt',
];

export class StaffQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StaffRole })
  @IsEnum(StaffRole)
  @IsOptional()
  role?: StaffRole;

  @ApiPropertyOptional({ enum: StaffStatus })
  @IsEnum(StaffStatus)
  @IsOptional()
  status?: StaffStatus;
}
