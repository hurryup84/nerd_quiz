import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

// Security headers middleware
function securityHeaders() {
  return (
    _req: unknown,
    res: { setHeader: (name: string, value: string) => void },
    next: () => void,
  ) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  };
}

function getAllowedOrigins(): string[] {
  const raw = process.env['CORS_ORIGIN'] ?? process.env['FRONTEND_URL'] ?? '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(securityHeaders());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');

  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on http://0.0.0.0:${port}`);
}
void bootstrap();
