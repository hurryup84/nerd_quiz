import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const rawUrl =
      process.env['TURSO_DATABASE_URL'] ??
      process.env['DATABASE_URL'] ??
      'file:./dev.db';
    const url = rawUrl.startsWith('file:')
      ? `file:${path.resolve(process.cwd(), rawUrl.replace('file:', ''))}`
      : rawUrl;
    const authToken = process.env['TURSO_AUTH_TOKEN'];

    const adapter = new PrismaLibSql(
      authToken ? { url, authToken } : { url },
    );
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
