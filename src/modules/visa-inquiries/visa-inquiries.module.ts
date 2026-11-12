import { Module } from '@nestjs/common';
import { VisaInquiriesController } from './visa-inquiries.controller.js';
import { VisaInquiriesService } from './visa-inquiries.service.js';

@Module({
  controllers: [VisaInquiriesController],
  providers: [VisaInquiriesService],
  exports: [VisaInquiriesService],
})
export class VisaInquiriesModule {}

