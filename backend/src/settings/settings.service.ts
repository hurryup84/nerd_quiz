import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULTS: Record<string, string> = {
  theme: 'terminal',
  refreshInterval: '5',
  openrouterEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
  openrouterApiKey: '',
  openrouterModel: 'openrouter/free',
  openrouterPrompt:
    'Complete the following quiz question JSON. Fill in any missing fields (category, difficulty, info, answer options, and correct answer). For category and difficulty, return the name as a string (e.g., "Science", "Easy"). Randomly assign the correct answer to one of options A, B, C, or D. Return only valid JSON with fields: questionText, category (string), difficulty (string), info (string), answerA, answerB, answerC, answerD, correctAnswer. Question JSON: ',
};

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      const existing = await this.prisma.settings.findUnique({
        where: { key },
      });
      if (!existing) {
        await this.prisma.settings.create({ data: { key, value } });
      }
    }
  }

  async get(key: string): Promise<string> {
    const setting = await this.prisma.settings.findUnique({ where: { key } });
    return setting?.value ?? DEFAULTS[key] ?? '';
  }

  async set(key: string, value: string) {
    return this.prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getAll(): Promise<{
    theme: string;
    refreshInterval: number;
    openrouterEndpoint: string;
    openrouterModel: string;
    openrouterPrompt: string;
    openrouterApiKeySet: boolean;
  }> {
    const rows = await this.prisma.settings.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      theme: map['theme'] ?? DEFAULTS['theme'],
      refreshInterval: Number(
        map['refreshInterval'] ?? DEFAULTS['refreshInterval'],
      ),
      openrouterEndpoint:
        map['openrouterEndpoint'] ?? DEFAULTS['openrouterEndpoint'],
      openrouterApiKeySet: (map['openrouterApiKey'] ?? '') !== '',
      openrouterModel: map['openrouterModel'] ?? DEFAULTS['openrouterModel'],
      openrouterPrompt: map['openrouterPrompt'] ?? DEFAULTS['openrouterPrompt'],
    };
  }

  // Legacy helpers kept for compatibility
  async getTheme() {
    return this.get('theme');
  }
  async setTheme(value: string) {
    return this.set('theme', value);
  }
}
