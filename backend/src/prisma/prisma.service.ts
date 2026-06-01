import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const dbPath = path.resolve(
      process.cwd(),
      process.env['DATABASE_URL']?.replace('file:', '') ?? 'prisma/dev.db',
    );
    const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
