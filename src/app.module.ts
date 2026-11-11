import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PackagesModule } from './modules/packages/packages.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { QuotationsModule } from './modules/quotations/quotations.module.js';
import { AiModule } from './modules/ai/ai.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, PackagesModule, LeadsModule, QuotationsModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
