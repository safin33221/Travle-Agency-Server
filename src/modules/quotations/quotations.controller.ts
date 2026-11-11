import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { QuotationsService } from './quotations.service.js';
import { CreateQuotationDto } from './dto/create-quotation.dto.js';
import { UpdateQuotationDto } from './dto/update-quotation.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffRole } from '../../generated/prisma/client.js';

@ApiTags('Quotations')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get('leads/:id/quotations')
  @ApiOperation({ summary: 'List quotations associated with a lead' })
  @ApiResponse({ status: 200, description: 'List of quotations' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findByLead(@Param('id', ParseUUIDPipe) leadId: string) {
    return this.quotationsService.findByLead(leadId);
  }

  @Post('leads/:id/quotations')
  @ApiOperation({ summary: 'Create a new quotation for a lead with server-computed totals' })
  @ApiResponse({ status: 201, description: 'Quotation created successfully in DRAFT status' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async create(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body() dto: CreateQuotationDto,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.quotationsService.create(leadId, dto, creatorId);
  }

  @Get('quotations/:id')
  @ApiOperation({ summary: 'Get quotation details and line items by ID' })
  @ApiResponse({ status: 200, description: 'Quotation details' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch('quotations/:id')
  @ApiOperation({
    summary: 'Update quotation. If approved, generates a new revision (N+1) preserving previous revision.',
  })
  @ApiResponse({ status: 200, description: 'Quotation updated or new revision created' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.quotationsService.update(id, dto, actorId);
  }

  @Post('quotations/:id/approve')
  @Roles(StaffRole.OWNER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Formally approve a quotation revision (Admin only)' })
  @ApiResponse({ status: 200, description: 'Quotation approved and revision locked' })
  @ApiResponse({ status: 400, description: 'Cannot approve voided quotation' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') approverId: string,
  ) {
    return this.quotationsService.approve(id, approverId);
  }

  @Get('quotations/:id/pdf')
  @ApiOperation({ summary: 'Download branded quotation PDF (Restricted to approved quotations)' })
  @ApiResponse({ status: 200, description: 'PDF binary stream' })
  @ApiResponse({ status: 400, description: 'Quotation must be approved before PDF export' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.quotationsService.generatePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(Buffer.from(buffer));
  }
}
