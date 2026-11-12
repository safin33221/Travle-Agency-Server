import { Module } from '@nestjs/common';
import { VisaServicesController } from './visa-services.controller.js';
import { VisaServicesService } from './visa-services.service.js';

@Module({
  controllers: [VisaServicesController],
  providers: [VisaServicesService],
  exports: [VisaServicesService],
})
export class VisaServicesModule {}

