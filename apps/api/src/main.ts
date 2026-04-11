import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common';
import { swaggerConfig } from './config';
import type { Env } from './config';

async function bootstrap() {
  // bufferLogs: true → NestJS buffers logs during bootstrap until Pino is ready,
  // so ALL logs (including module init) go through Pino with consistent format.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });

  // ── Security headers (Helmet) ────────────────────
  app.use(helmet());

  // ── CORS: allow the Nuxt frontend to call the API ─
  app.enableCors({
    origin: corsOrigin,
    credentials: true, // needed for cookie-based refresh tokens later
  });

  // ── Global prefix: all routes start with /api ─────
  // Health check excluded so load balancers can hit /health directly.
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // ── Swagger / OpenAPI docs at /api/docs (disabled in production) ─
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // keeps JWT token between page refreshes
      },
    });
  }

  // ── Global exception filter ──────────────────────
  // Catches all unhandled errors and returns consistent JSON format.
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port, '0.0.0.0');
}
void bootstrap();
