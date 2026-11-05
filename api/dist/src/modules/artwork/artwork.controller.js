"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtworkController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path = require("path");
const fs = require("fs");
const swagger_1 = require("@nestjs/swagger");
const artwork_service_1 = require("./artwork.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
const artworkDiskStorage = (0, multer_1.diskStorage)({
    destination: (_req, _file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'artwork');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const uniqueName = `art_${baseName}_${Date.now()}${ext}`;
        cb(null, uniqueName);
    },
});
const referenceDiskStorage = (0, multer_1.diskStorage)({
    destination: (_req, _file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'references');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const uniqueName = `ref_${baseName}_${Date.now()}${ext}`;
        cb(null, uniqueName);
    },
});
let ArtworkController = class ArtworkController {
    artworkService;
    constructor(artworkService) {
        this.artworkService = artworkService;
    }
    async uploadArtwork(file, productId, minimumMegapixels) {
        if (!file) {
            throw new common_1.BadRequestException('Artwork file is required');
        }
        const minMP = minimumMegapixels !== undefined && minimumMegapixels !== '' ? Number(minimumMegapixels) : undefined;
        return this.artworkService.processArtworkUpload(file, productId, minMP);
    }
    async uploadReference(file) {
        if (!file) {
            throw new common_1.BadRequestException('Reference file is required');
        }
        return this.artworkService.processReferenceImageUpload(file);
    }
    async getVersions(orderItemId) {
        return this.artworkService.getVersionsForItem(orderItemId);
    }
    async registerArtwork(body, user) {
        return this.artworkService.registerArtworkVersion(body, user.sub);
    }
    async submitForApproval(artworkVersionId, prepressNotes, user) {
        return this.artworkService.submitForCustomerApproval(artworkVersionId, prepressNotes, user);
    }
    async approveProof(body, user, req) {
        return this.artworkService.approveProof({ ...body, ipAddress: req.ip }, user.sub);
    }
    async requestRevision(body, user) {
        return this.artworkService.requestRevision(body, user.sub);
    }
    async getDesignQueue(search, user) {
        return this.artworkService.getDesignQueue(search, user);
    }
    async claimDesignJob(orderId, user) {
        return this.artworkService.claimDesignJob(orderId, user);
    }
    async completeDesignJob(orderId, body, user) {
        return this.artworkService.completeDesignJob(orderId, body, user);
    }
};
exports.ArtworkController = ArtworkController;
__decorate([
    (0, auth_decorator_1.Public)(),
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: artworkDiskStorage, limits: { fileSize: 100 * 1024 * 1024 } })),
    (0, swagger_1.ApiOperation)({ summary: 'Upload artwork file and automatically verify image quality (Megapixels)' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('productId')),
    __param(2, (0, common_1.Body)('minimumMegapixels')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "uploadArtwork", null);
__decorate([
    (0, auth_decorator_1.Public)(),
    (0, common_1.Post)('upload-reference'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: referenceDiskStorage, limits: { fileSize: 50 * 1024 * 1024 } })),
    (0, swagger_1.ApiOperation)({ summary: 'Upload reference design image file' }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "uploadReference", null);
__decorate([
    (0, common_1.Get)('item/:orderItemId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all immutable artwork versions for an order item' }),
    __param(0, (0, common_1.Param)('orderItemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "getVersions", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload / register a new immutable artwork version' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "registerArtwork", null);
__decorate([
    (0, common_1.Post)('submit-proof/:artworkVersionId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Designer submits proof and requests customer sign-off' }),
    __param(0, (0, common_1.Param)('artworkVersionId')),
    __param(1, (0, common_1.Body)('prepressNotes')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "submitForApproval", null);
__decorate([
    (0, common_1.Post)('approve-proof'),
    (0, swagger_1.ApiOperation)({ summary: 'Customer digitally signs off proof, locking approved version' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "approveProof", null);
__decorate([
    (0, common_1.Post)('request-revision'),
    (0, swagger_1.ApiOperation)({ summary: 'Customer requests design/artwork revision' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "requestRevision", null);
__decorate([
    (0, common_1.Get)('design-queue'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get personal design queue for authenticated designer, or full queue for OE/Admin' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "getDesignQueue", null);
__decorate([
    (0, common_1.Post)('design/:orderId/claim'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Designer claims an order from the design queue' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "claimDesignJob", null);
__decorate([
    (0, common_1.Post)('design/:orderId/complete'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Designer submits completed design, creating approved artwork and releasing order to Pre-Production QC' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ArtworkController.prototype, "completeDesignJob", null);
exports.ArtworkController = ArtworkController = __decorate([
    (0, swagger_1.ApiTags)('artwork'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('artwork'),
    __metadata("design:paramtypes", [artwork_service_1.ArtworkService])
], ArtworkController);
//# sourceMappingURL=artwork.controller.js.map