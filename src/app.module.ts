import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PackagesModule } from './modules/packages/packages.module.js';
import { AgencySettingsModule } from './modules/agency-settings/agency-settings.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module.js';
import { QuotationsModule } from './modules/quotations/quotations.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { CountriesModule } from './modules/countries/countries.module.js';
import { VisaServicesModule } from './modules/visa-services/visa-services.module.js';
import { VisaInquiriesModule } from './modules/visa-inquiries/visa-inquiries.module.js';
import { appConfig } from './config/env.config.js';
import { validate } from './config/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AgencySettingsModule,
    PackagesModule,
    LeadsModule,
    FollowUpsModule,
    QuotationsModule,
    AiModule,
    DashboardModule,
    AuditModule,
    CountriesModule,
    VisaServicesModule,
    VisaInquiriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
