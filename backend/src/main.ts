import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow all origins in local network for dev
      callback(null, true);
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.listen(3000, '0.0.0.0');
  console.log('Backend running on http://0.0.0.0:3000');
}
bootstrap();
