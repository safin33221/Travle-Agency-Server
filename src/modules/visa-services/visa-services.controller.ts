import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { VisaServicesService } from './visa-services.service.js';
import { CreateVisaServiceDto } from './dto/create-visa-service.dto.js';
import { UpdateVisaServiceDto } from './dto/update-visa-service.dto.js';
import { VisaServiceQueryDto } from './dto/visa-service-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffRole } from '../../generated/prisma/client.js';

@ApiTags('Visa Services')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisaServicesController {
  constructor(private readonly visaServicesService: VisaServicesService) {}

  // ===========================================================================
  // PUBLIC ENDPOINTS (/api/v1/visa-services)
  // ===========================================================================

  @Public()
  @Get('visa-services')
  @ApiOperation({
    summary: 'List published visa service offerings across active countries',
  })
  @ApiResponse({ status: 200, description: 'Paginated published visa services' })
  async findPublicAll(@Query() query: VisaServiceQueryDto) {
    return this.visaServicesService.findPublicAll(query);
  }

  @Public()
  @Get('visa-services/:countrySlug/:serviceSlug')
  @ApiOperation({
    summary:
      'Get published visa service details, requirements, and disclaimer by countrySlug and serviceSlug',
  })
  @ApiResponse({ status: 200, description: 'Published visa service detail' })
  @ApiResponse({ status: 404, description: 'Service not found or unpublished' })
  async findPublicBySlugs(
    @Param('countrySlug') countrySlug: string,
    @Param('serviceSlug') serviceSlug: string,
  ) {
    return this.visaServicesService.findPublicByCountryAndServiceSlug(
      countrySlug,
      serviceSlug,
    );
  }

  // ===========================================================================
  // ADMIN ENDPOINTS (/api/v1/admin/visa-overview & /api/v1/admin/visa-services)
  // ===========================================================================

  @Get('admin/visa-overview')
  @Roles(StaffRole.OWNER_ADMIN, StaffRole.SALES_AGENT)
  @ApiOperation({
    summary: 'Get Visa & Immigration admin dashboard overview counts',
  })
  @ApiResponse({ status: 200, description: 'Visa & Immigration summary metrics' })
  async getAdminOverview() {
    return this.visaServicesService.getAdminOverview();
  }

  @Get('admin/visa-services')
  @Roles(StaffRole.OWNER_ADMIN, StaffRole.SALES_AGENT)
  @ApiOperation({
    summary:
      'Admin list all visa services (including drafts and archived) with filters',
  })
  @ApiResponse({ status: 200, description: 'Paginated admin visa services' })
  async findAdminAll(@Query() query: VisaServiceQueryDto) {
    return this.visaServicesService.findAdminAll(query);
  }

  @Post('admin/visa-services')
  @Roles(StaffRole.OWNER_ADMIN)
  @ApiOperation({ summary: 'Create a new visa service offering (Admin only)' })
  @ApiResponse({ status: 201, description: 'Visa service created' })
  async create(
    @Body() createDto: CreateVisaServiceDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.visaServicesService.create(createDto, actorId);
  }

  @Get('admin/visa-services/:id')
  @Roles(StaffRole.OWNER_ADMIN, StaffRole.SALES_AGENT)
  @ApiOperation({ summary: 'Admin get visa service detail by ID' })
  @ApiResponse({ status: 200, description: 'Admin visa service detail' })
  @ApiResponse({ status: 404, description: 'Visa service not found' })
  async findAdminOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.visaServicesService.findAdminOne(id);
  }

  @Patch('admin/visa-services/:id')
  @Roles(StaffRole.OWNER_ADMIN)
  @ApiOperation({
    summary:
      'Update visa service details, requirements, availability, or publication status (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Visa service updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateVisaServiceDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.visaServicesService.update(id, updateDto, actorId);
  }

  @Delete('admin/visa-services/:id')
  @Roles(StaffRole.OWNER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive a visa service offering (Admin only)' })
  @ApiResponse({ status: 200, description: 'Visa service soft-archived' })
  async softArchive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.visaServicesService.softArchive(id, actorId);
  }
}

