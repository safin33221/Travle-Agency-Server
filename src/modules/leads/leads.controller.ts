import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { LeadQueryDto } from './dto/lead-query.dto.js';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @Post('public-inquiry')
  @ApiOperation({
    summary:
      'Public inquiry & smart eligibility assessment for Tour, Hajj/Umrah, Work Permit, or Student Visa',
  })
  @ApiResponse({
    status: 201,
    description: 'Public inquiry recorded with tracking code and eligibility evaluation',
  })
  async createPublicInquiry(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.createPublicInquiry(createLeadDto);
  }

  @Public()
  @Get('track/:trackingCode')
  @ApiOperation({
    summary: 'Public file / visa status tracker by tracking code (no login required)',
  })
  @ApiResponse({ status: 200, description: 'Sanitized milestone and document status' })
  @ApiResponse({ status: 404, description: 'Tracking code not found' })
  async trackPublicStatus(@Param('trackingCode') trackingCode: string) {
    return this.leadsService.trackPublicStatus(trackingCode);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new CRM lead inquiry' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  async create(
    @Body() createLeadDto: CreateLeadDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.leadsService.create(createLeadDto, actorId);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter CRM leads' })
  @ApiResponse({ status: 200, description: 'Paginated list of leads' })
  async findAll(
    @Query() query: LeadQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get CRM lead details by ID with notes, follow-ups, and quotes' })
  @ApiResponse({ status: 200, description: 'Lead details' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update CRM lead stage or details' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.leadsService.update(id, updateLeadDto, actorId);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get internal notes for a lead' })
  @ApiResponse({ status: 200, description: 'List of lead notes' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async getNotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.getNotes(id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add an internal note to a lead' })
  @ApiResponse({ status: 201, description: 'Note added successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createNoteDto: CreateLeadNoteDto,
    @CurrentUser('id') authorId: string,
  ) {
    return this.leadsService.addNote(id, createNoteDto, authorId);
  }
}
