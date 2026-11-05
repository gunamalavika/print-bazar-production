import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  ArtworkService,
  RegisterArtworkDto,
  ApproveProofDto,
  RequestRevisionDto,
} from './artwork.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser, Public } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';
import { Request } from 'express';

const artworkDiskStorage = diskStorage({
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

const referenceDiskStorage = diskStorage({
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

@ApiTags('artwork')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('artwork')
export class ArtworkController {
  constructor(private readonly artworkService: ArtworkService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: artworkDiskStorage, limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload artwork file and automatically verify image quality (Megapixels)' })
  async uploadArtwork(
    @UploadedFile() file: Express.Multer.File,
    @Body('productId') productId?: string,
    @Body('minimumMegapixels') minimumMegapixels?: string | number,
  ) {
    if (!file) {
      throw new BadRequestException('Artwork file is required');
    }
    const minMP = minimumMegapixels !== undefined && minimumMegapixels !== '' ? Number(minimumMegapixels) : undefined;
    return this.artworkService.processArtworkUpload(file, productId, minMP);
  }

  @Public()
  @Post('upload-reference')
  @UseInterceptors(FileInterceptor('file', { storage: referenceDiskStorage, limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload reference design image file' })
  async uploadReference(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Reference file is required');
    }
    return this.artworkService.processReferenceImageUpload(file);
  }

  @Get('item/:orderItemId')
  @ApiOperation({ summary: 'Get all immutable artwork versions for an order item' })
  async getVersions(@Param('orderItemId') orderItemId: string) {
    return this.artworkService.getVersionsForItem(orderItemId);
  }

  @Post('register')
  @ApiOperation({ summary: 'Upload / register a new immutable artwork version' })
  async registerArtwork(
    @Body() body: RegisterArtworkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.artworkService.registerArtworkVersion(body, user.sub);
  }

  @Post('submit-proof/:artworkVersionId')
  @Roles(UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Designer submits proof and requests customer sign-off' })
  async submitForApproval(
    @Param('artworkVersionId') artworkVersionId: string,
    @Body('prepressNotes') prepressNotes: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.artworkService.submitForCustomerApproval(artworkVersionId, prepressNotes, user);
  }

  @Post('approve-proof')
  @ApiOperation({ summary: 'Customer digitally signs off proof, locking approved version' })
  async approveProof(
    @Body() body: ApproveProofDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.artworkService.approveProof(
      { ...body, ipAddress: req.ip },
      user.sub,
    );
  }

  @Post('request-revision')
  @ApiOperation({ summary: 'Customer requests design/artwork revision' })
  async requestRevision(
    @Body() body: RequestRevisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.artworkService.requestRevision(body, user.sub);
  }

  @Get('design-queue')
  @Roles(UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Get personal design queue for authenticated designer, or full queue for OE/Admin' })
  async getDesignQueue(
    @Query('search') search?: string,
    @Query('tab') tab?: 'active' | 'passed' | 'all',
    @Query('scope') scope?: 'mine' | 'all',
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.artworkService.getDesignQueue(search, user, tab, scope);
  }

  @Get('passed-queue')
  @Roles(UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Get designs passed to production / QC' })
  async getPassedDesignQueue(
    @Query('search') search?: string,
    @Query('scope') scope?: 'mine' | 'all',
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.artworkService.getDesignQueue(search, user, 'passed', scope);
  }

  @Post('design/:orderId/claim')
  @Roles(UserRole.DESIGNER_PREPRESS, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Designer claims an order from the design queue' })
  async claimDesignJob(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.artworkService.claimDesignJob(orderId, user);
  }

  @Post('design/:orderId/complete')
  @Roles(UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Designer submits completed design, creating approved artwork and routing order to OE for Production Assignment' })
  async completeDesignJob(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      storageKey: string;
      originalFileName: string;
      mimeType?: string;
      fileSize?: number;
      prepressNotes?: string;
      resolutionDpi?: number;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.artworkService.completeDesignJob(orderId, body, user);
  }
}
