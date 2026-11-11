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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PackagesService } from './packages.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { PackageQueryDto } from './dto/package-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffRole } from '../../generated/prisma/client.js';

@ApiTags('Packages')
@ApiBearerAuth()
@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @ApiOperation({ summary: 'List tour packages with search and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated tour package catalog' })
  async findAll(@Query() query: PackageQueryDto) {
    return this.packagesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tour package details by ID' })
  @ApiResponse({ status: 200, description: 'Tour package details' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.findOne(id);
  }

  @Post()
  @Roles(StaffRole.OWNER_ADMIN)
  @ApiOperation({ summary: 'Create new tour package (Admin only)' })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  async create(
    @Body() createPackageDto: CreatePackageDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.packagesService.create(createPackageDto, actorId);
  }

  @Patch(':id')
  @Roles(StaffRole.OWNER_ADMIN)
  @ApiOperation({ summary: 'Update tour package details or pricing (Admin only)' })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePackageDto: UpdatePackageDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.packagesService.update(id, updatePackageDto, actorId);
  }

  @Delete(':id')
  @Roles(StaffRole.OWNER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive tour package (Admin only)' })
  @ApiResponse({ status: 200, description: 'Package soft-archived successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async softArchive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.packagesService.softArchive(id, actorId);
  }
}
