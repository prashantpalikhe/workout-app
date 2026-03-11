import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth';
import { UsersModule } from './users';
import { ExercisesModule } from './exercises';
import { ProgramsModule } from './programs';
import { SessionsModule } from './sessions';
import { RecordsModule } from './records';
import { TrainerModule } from './trainer';
import { MailModule } from './mail';
import { envSchema, type Env } from './config';

@Module({
  imports: [
    // ── Config: load .env + validate with Zod ──────
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => envSchema.parse(config),
    }),

    // ── Logger: structured Pino logging ────────────
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isProduction =
          config.get('NODE_ENV', { infer: true }) === 'production';

        return {
          pinoHttp: {
            // debug in dev, info in production (less noise)
            level: isProduction ? 'info' : 'debug',

            // Correlation IDs: use x-request-id from load balancer, or generate one
            genReqId: (req) => {
              const xRequestId = req.headers['x-request-id'];
              return (
                (Array.isArray(xRequestId) ? xRequestId[0] : xRequestId) ??
                crypto.randomUUID()
              );
            },

            // Pretty-print in dev, raw JSON to stdout in production
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                },

            // Don't log health check requests (too noisy in production)
            autoLogging: {
              ignore: (req: { url?: string }) => req.url === '/health',
            },
          },
        };
      },
    }),

    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    ExercisesModule,
    ProgramsModule,
    SessionsModule,
    RecordsModule,
    TrainerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
