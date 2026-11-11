import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgencySettingsService } from './agency-settings.service.js';
import { UpdateAgencySettingsDto } from './dto/update-agency-settings.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffRole } from '../../generated/prisma/client.js';

@ApiTags('Agency Settings')
@ApiBearerAuth()
@Controller('settings/agency')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgencySettingsController {
  constructor(private readonly agencySettingsService: AgencySettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get agency configuration and default quotation settings' })
  @ApiResponse({ status: 200, description: 'Agency settings data' })
  async getSettings() {
    return this.agencySettingsService.getSettings();
  }

  @Patch()
  @Roles(StaffRole.OWNER_ADMIN)
  @ApiOperation({ summary: 'Update agency configuration (Admin only)' })
  @ApiResponse({ status: 200, description: 'Agency settings updated successfully' })
  async updateSettings(
    @Body() dto: UpdateAgencySettingsDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.agencySettingsService.updateSettings(dto, actorId);
  }
}

