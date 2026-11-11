import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class AuditQueryDto extends PaginationQueryDto {
  override limit: number = 50;

  @ApiPropertyOptional({ example: 'Quotation' })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ example: 'QUOTATION_APPROVED' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by actor staff ID' })
  @IsUUID()
  @IsOptional()
  actorId?: string;
}


