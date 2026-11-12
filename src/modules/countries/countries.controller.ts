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
import { CountriesService } from './countries.service.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';
import { CountryQueryDto } from './dto/country-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffRole } from '../../generated/prisma/client.js';

@ApiTags('Countries')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  // ===========================================================================
  // PUBLIC ENDPOINTS (/api/v1/countries)
  // ===========================================================================

  @Public()
  @Get('countries')
  @ApiOperation({
    summary: 'List active destination countries with published visa services',
  })
  @ApiResponse({ status: 200, description: 'Paginated public country list' })
  async findPublicAll(@Query() query: CountryQueryDto) {
    return this.countriesService.findPublicAll(query);
  }

  @Public()
  @Get('countries/:slug')
  @ApiOperation({
    summary: 'Get public country details and published visa services by slug',
  })
  @ApiResponse({ status: 200, description: 'Country detail with services' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async findPublicBySlug(@Param('slug') slug: string) {
    return this.countriesService.findPublicBySlug(slug);
  }

  // ===========================================================================
  // ADMIN ENDPOINTS (/api/v1/admin/countries)
  // ===========================================================================

  @Get('admin/countries')
  @Roles(StaffRole.OWNER_ADMIN, StaffRole.SALES_AGENT)
  @ApiOperation({ summary: 'Admin list all managed countries with filters' })
  @ApiResponse({ status: 200, description: 'Paginated admin country list' })
  async findAdminAll(@Query() query: CountryQueryDto) {
    return this.countriesService.findAdminAll(query);
  }

  @Get('admin/countries/:id')
  @Roles(StaffRole.OWNER_ADMIN, StaffRole.SALES_AGENT)
  @ApiOperation({
    summary: 'Admin get country detail and all associated visa services by ID',
  })
  @ApiResponse({ status: 200, description: 'Admin country detail' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async findAdminOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.countriesService.findAdminOne(id);
  }

  @Post('admin/countries')
  @Roles(StaffRole.OWNER_ADMIN)
  @ApiOperation({ summary: 'Create a new destination country (Admin only)' })
  @ApiResponse({ status: 201, description: 'Country created successfully' })
  async create(
    @Body() createCountryDto: CreateCountryDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.countriesService.create(createCountryDto, actorId);
  }

  @Patch('admin/countries/:id')
  @Roles(StaffRole.OWNER_ADMIN)
  @ApiOperation({ summary: 'Update country details or status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Country updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCountryDto: UpdateCountryDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.countriesService.update(id, updateCountryDto, actorId);
  }

  @Delete('admin/countries/:id')
  @Roles(StaffRole.OWNER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive a destination country (Admin only)' })
  @ApiResponse({ status: 200, description: 'Country soft-archived' })
  async softArchive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.countriesService.softArchive(id, actorId);
  }
}

