import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { AuditLoggerService } from './common/audit/audit-logger.service';
import { EnvConfig } from './common/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService<EnvConfig, true>);

  app.use(helmet());
  app.useGlobalInterceptors(new AuditInterceptor(app.get(AuditLoggerService)));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const allowedOrigins = config
    .get('ALLOWED_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by HashNHedge orchestrator CORS policy'));
    },
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HashNHedge Orchestrator API')
    .setDescription('Production control-plane API for workers, jobs, vendors, payments, and Solana coordination.')
    .setVersion(config.get('ORCHESTRATOR_VERSION', { infer: true }))
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get('ORCHESTRATOR_PORT', { infer: true });
  await app.listen(port, '0.0.0.0');

  logger.log(`HashNHedge orchestrator listening on port ${port}`);
}

void bootstrap();
