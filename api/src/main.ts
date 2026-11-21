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

  // 0. Unconditional Top-Level CORS & Preflight Handler (Guarantees Vercel & Custom Domains Never Fail Preflight)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestOrigin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      (req.headers['access-control-request-headers'] as string) ||
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma',
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Ensure uploads directories exist across potential working roots
  const candidateUploadsDirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'api', 'uploads'),
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', '..', 'uploads'),
  ];

  for (const dir of candidateUploadsDirs) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const artDir = path.join(dir, 'artwork');
      if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });
      const refDir = path.join(dir, 'references');
      if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });
      const prodDir = path.join(dir, 'products');
      if (!fs.existsSync(prodDir)) fs.mkdirSync(prodDir, { recursive: true });
    } catch {
      // Ignore directory creation permissions if running in sandboxed container
    }
  }

  // Incoming Request URL Normalization & API Prefix Fallback Middleware
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 1. Collapse multiple consecutive slashes (e.g., //products/categories -> /products/categories)
    if (req.url && req.url.includes('//')) {
      req.url = req.url.replace(/\/{2,}/g, '/');
    }

    // 2. If an API request is made without /api/v1 prefix, rewrite req.url to include /api/v1
    // (e.g. /products/categories, /products/site-settings, /products?featured=true)
    const apiRoutePattern = /^\/(products|auth|orders|admin|qc|prepress|production|dispatch|packaging|finance|customers|notifications|job-cards|quotes)(\/|\?|$)/;
    if (!req.url.startsWith('/api/v1/') && !req.url.startsWith('/uploads/') && apiRoutePattern.test(req.url)) {
      const pathname = req.url.split('?')[0];
      const hasFileExtension = /\.[a-zA-Z0-9]{2,5}$/.test(pathname);
      if (!hasFileExtension) {
        req.url = `/api/v1${req.url}`;
      }
    }

    next();
  });

  // Serve static uploaded assets across all detected upload locations with fallback resolver
  for (const baseDir of candidateUploadsDirs) {
    if (fs.existsSync(baseDir)) {
      app.use('/uploads', express.static(baseDir));
      app.use('/artwork', express.static(path.join(baseDir, 'artwork')));
      app.use('/references', express.static(path.join(baseDir, 'references')));
      app.use('/products', express.static(path.join(baseDir, 'products')));
    }
  }

  // Fallback explicit file resolver for /uploads & /artwork (handles double timestamps, subfolder differences, and prefix matching)
  const uploadsFallbackResolver = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawPath = decodeURIComponent(req.path.replace(/^\/+/, ''));
    if (!rawPath) return next();

    const strippedDoubleTimestamp = rawPath.replace(/_(\d{10,14})_\d{10,14}(\.[a-zA-Z0-9]+)$/, '_$1$2');
    const searchNames = Array.from(new Set([rawPath, strippedDoubleTimestamp]));
    const searchSubfolders = ['', 'artwork', 'references', 'products'];

    for (const base of candidateUploadsDirs) {
      if (!fs.existsSync(base)) continue;

      // 1. Exact or stripped double-timestamp filename matching
      for (const name of searchNames) {
        // Direct candidate
        const fullCandidate = path.join(base, name);
        if (fs.existsSync(fullCandidate) && fs.statSync(fullCandidate).isFile()) {
          return res.sendFile(path.resolve(fullCandidate));
        }

        // Subfolder candidates
        const baseFilename = path.basename(name);
        for (const sub of searchSubfolders) {
          if (!sub) continue;
          const subCandidate = path.join(base, sub, baseFilename);
          if (fs.existsSync(subCandidate) && fs.statSync(subCandidate).isFile()) {
            return res.sendFile(path.resolve(subCandidate));
          }
        }
      }

      // 2. Fuzzy prefix matching: If the request has fewer or extra timestamps or art_ prefix
      // E.g. requested art_ACHARYAS_SNACKS_1794055561395.jpg but file is art_art_ACHARYAS_SNACKS_1794055561395_1795106896398.jpg
      const ext = path.extname(rawPath);
      const baseNameWithoutExt = path.basename(rawPath, ext);
      const coreToken = baseNameWithoutExt.replace(/_?\d{10,14}$/, '');

      for (const sub of searchSubfolders) {
        const folder = sub ? path.join(base, sub) : base;
        if (!fs.existsSync(folder)) continue;
        try {
          const files = fs.readdirSync(folder);
          const matched = files.find((f) => {
            if (ext && !f.toLowerCase().endsWith(ext.toLowerCase())) return false;
            return (
              f.includes(baseNameWithoutExt) ||
              baseNameWithoutExt.includes(path.basename(f, ext)) ||
              (coreToken && coreToken.length > 5 && f.includes(coreToken))
            );
          });
          if (matched) {
            const matchedPath = path.join(folder, matched);
            if (fs.statSync(matchedPath).isFile()) {
              return res.sendFile(path.resolve(matchedPath));
            }
          }
        } catch {
          // ignore directory read issues
        }
      }
    }
    next();
  };

  app.use('/uploads', uploadsFallbackResolver);
  app.use('/artwork', uploadsFallbackResolver);

  // Health Check endpoint for Railway & Load Balancers (accessible at /health and /api/v1/health)
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'print-bazzar-2.0-api',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };
  app.use('/health', healthHandler);
  app.use('/api/v1/health', healthHandler);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
    ],
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

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`PRINT BAZZAR 2.0 API Server running on port ${port} (Swagger docs: http://0.0.0.0:${port}/api/docs)`);
}
bootstrap();
