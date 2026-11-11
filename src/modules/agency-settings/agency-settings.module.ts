import { Module } from '@nestjs/common';
import { AgencySettingsController } from './agency-settings.controller.js';
import { AgencySettingsService } from './agency-settings.service.js';

@Module({
  controllers: [AgencySettingsController],
  providers: [AgencySettingsService],
  exports: [AgencySettingsService],
})
export class AgencySettingsModule {}

