import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AuditLogService } from './modules/audit-logs/audit-log.service';
import { RequestContextService } from './common/context/request-context.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://192.168.1.14:3000',
    'http://localhost:3001',
  ];
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  // Global Audit Log Interceptor - ghi lại tất cả thao tác CRUD
  const auditLogService = app.get(AuditLogService);
  const requestContextService = app.get(RequestContextService);
  app.useGlobalInterceptors(new AuditLogInterceptor(requestContextService, auditLogService));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Portal XDV Taxi API')
    .setDescription('Fleet & Workshop Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
