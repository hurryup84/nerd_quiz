import { Module } from '@nestjs/common';
import { ImporterGuard } from './import.guard';

@Module({
  providers: [ImporterGuard],
  exports: [ImporterGuard],
})
export class ImportModule {}