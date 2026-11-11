import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FollowUpsService } from './follow-ups.service.js';
import { CreateFollowUpDto } from './dto/create-follow-up.dto.js';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Follow-Ups')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get('leads/:id/follow-ups')
  @ApiOperation({ summary: 'Get manual follow-up tasks for a lead' })
  @ApiResponse({ status: 200, description: 'List of follow-up tasks' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findByLead(@Param('id', ParseUUIDPipe) leadId: string) {
    return this.followUpsService.findByLead(leadId);
  }

  @Post('leads/:id/follow-ups')
  @ApiOperation({ summary: 'Create a manual follow-up task for a lead' })
  @ApiResponse({ status: 201, description: 'Follow-up task created' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async create(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body() dto: CreateFollowUpDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.followUpsService.create(leadId, dto, actorId);
  }

  @Patch('follow-ups/:id')
  @ApiOperation({ summary: 'Update follow-up task status or details' })
  @ApiResponse({ status: 200, description: 'Follow-up task updated' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFollowUpDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.followUpsService.update(id, dto, actorId);
  }
}

