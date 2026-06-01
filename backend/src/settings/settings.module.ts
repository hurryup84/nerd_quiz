import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [PrismaModule],
  providers: [SettingsService, AdminGuard],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
