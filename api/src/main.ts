import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

// Bootstrap application
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const productsUploadsDir = path.join(uploadsDir, 'products');
  if (!fs.existsSync(productsUploadsDir)) {
    fs.mkdirSync(productsUploadsDir, { recursive: true });
  }
  const artworkUploadsDir = path.join(uploadsDir, 'artwork');
  if (!fs.existsSync(artworkUploadsDir)) {
    fs.mkdirSync(artworkUploadsDir, { recursive: true });
  }
  const referencesUploadsDir = path.join(uploadsDir, 'references');
  if (!fs.existsSync(referencesUploadsDir)) {
    fs.mkdirSync(referencesUploadsDir, { recursive: true });
  }

  // Serve static uploaded assets
  app.use('/uploads', express.static(uploadsDir));
  app.use('/artwork', express.static(artworkUploadsDir));
  app.use('/references', express.static(referencesUploadsDir));
  app.use('/products', express.static(productsUploadsDir));

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('PRINT BAZZAR 2.0 API')
    .setDescription('Customer-to-Production Operating System API specification')
    .setVersion('2.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication and user management')
    .addTag('pricing', 'Server-side authoritative pricing engine')
    .addTag('orders', 'Omnichannel order management and tracking')
    .addTag('workflow', '16-stage master workflow state machine')
    .addTag('artwork', 'Artwork version control and proof approval')
    .addTag('job-cards', 'Automatic Job Card engine and shop floor routing')
    .addTag('quality-control', 'Pre-Production and Final QC gates')
    .addTag('packing', 'Carton packaging and dimensional weight recording')
    .addTag('dispatch', 'Courier manifest handover and store pickup')
    .addTag('payments', 'Razorpay checkout and signature verification')
    .addTag('invoices', 'GST Tax invoices')
    .addTag('sla', 'SLA monitoring and operational delay detection')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`PRINT BAZZAR 2.0 API Server running on port ${port} (Swagger docs: http://localhost:${port}/api/docs)`);
}
bootstrap();
