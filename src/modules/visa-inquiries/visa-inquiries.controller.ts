import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VisaInquiriesService } from './visa-inquiries.service.js';
import { CreateVisaInquiryDto } from './dto/create-visa-inquiry.dto.js';
import { VisaInquiryQueryDto } from './dto/visa-inquiry-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { StaffRole } from '../../generated/prisma/client.js';

@ApiTags('Visa Inquiries')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisaInquiriesController {
  constructor(private readonly visaInquiriesService: VisaInquiriesService) {}

  // ===========================================================================
  // PUBLIC ENDPOINT (/api/v1/visa-inquiries)
  // ===========================================================================

  @Public()
  @Post('visa-inquiries')
  @ApiOperation({
    summary:
      'Submit a public visa consultation inquiry and link to existing Lead CRM',
  })
  @ApiResponse({
    status: 201,
    description: 'Inquiry recorded and linked to Lead CRM',
  })
  @ApiResponse({ status: 400, description: 'Invalid input or missing consent' })
  @ApiResponse({
    status: 409,
    description: 'Service is paused or not accepting inquiries',
  })
  async submitPublicInquiry(@Body() dto: CreateVisaInquiryDto) {
    return this.visaInquiriesService.submitPublicInquiry(dto);
  }

  // ===========================================================================
  // ADMIN ENDPOINTS (/api/v1/admin/visa-inquiries)
  // ===========================================================================

  @Get('admin/visa-inquiries')
  @Roles(StaffRole.OWNER_ADMIN, StaffRole.SALES_AGENT)
  @ApiOperation({
    summary: 'Admin list all visa inquiries with linked Lead CRM status',
  })
  @ApiResponse({ status: 200, description: 'Paginated visa inquiries list' })
  async findAdminAll(@Query() query: VisaInquiryQueryDto) {
    return this.visaInquiriesService.findAdminAll(query);
  }

  @Get('admin/visa-inquiries/:id')
  @Roles(StaffRole.OWNER_ADMIN, StaffRole.SALES_AGENT)
  @ApiOperation({ summary: 'Admin get visa inquiry details by ID' })
  @ApiResponse({ status: 200, description: 'Visa inquiry detail' })
  @ApiResponse({ status: 404, description: 'Visa inquiry not found' })
  async findAdminOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.visaInquiriesService.findAdminOne(id);
  }
}

