import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  async getAll() {
    return this.settingsService.getAll();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('theme')
  async setTheme(@Body('theme') theme: string) {
    await this.settingsService.set('theme', theme);
    return { theme };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('refreshInterval')
  async setRefreshInterval(@Body('refreshInterval') refreshInterval: number) {
    await this.settingsService.set('refreshInterval', String(refreshInterval));
    return { refreshInterval };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('openrouterEndpoint')
  async setOpenrouterEndpoint(@Body('openrouterEndpoint') endpoint: string) {
    await this.settingsService.set('openrouterEndpoint', endpoint);
    return { openrouterEndpoint: endpoint };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('openrouterApiKey')
  async setOpenrouterApiKey(@Body('openrouterApiKey') apiKey: string) {
    await this.settingsService.set('openrouterApiKey', apiKey);
    return { openrouterApiKey: apiKey };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('openrouterPrompt')
  async setOpenrouterPrompt(@Body('openrouterPrompt') prompt: string) {
    await this.settingsService.set('openrouterPrompt', prompt);
    return { openrouterPrompt: prompt };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('openrouterModel')
  async setOpenrouterModel(@Body('openrouterModel') model: string) {
    await this.settingsService.set('openrouterModel', model);
    return { openrouterModel: model };
  }
}
