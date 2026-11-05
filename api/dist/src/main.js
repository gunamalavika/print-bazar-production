"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const express = require("express");
const path = require("path");
const fs = require("fs");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
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
    app.use('/uploads', express.static(uploadsDir));
    app.setGlobalPrefix('api/v1');
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 4000;
    await app.listen(port);
    logger.log(`PRINT BAZZAR 2.0 API Server running on port ${port} (Swagger docs: http://localhost:${port}/api/docs)`);
}
bootstrap();
//# sourceMappingURL=main.js.map