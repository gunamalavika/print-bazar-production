import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  fileUrl: string;
  storageKey: string;
}

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient | null = null;
  private readonly bucketName: string;
  private isEnabled = false;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY;
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'printbazzar-media';

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });
        this.isEnabled = true;
        this.logger.log(
          `Supabase Storage initialized for bucket: ${this.bucketName} (${supabaseUrl})`,
        );
      } catch (err) {
        this.logger.error('Failed to initialize Supabase client:', err);
      }
    } else {
      this.logger.warn(
        'Supabase Storage not configured (missing SUPABASE_URL or SUPABASE_KEY). Using local disk storage fallback.',
      );
    }
  }

  isConfigured(): boolean {
    return this.isEnabled && this.supabase !== null;
  }

  /**
   * Upload file buffer or disk file to Supabase Storage bucket.
   * If Supabase is not configured or upload fails, falls back gracefully to local URL.
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: 'artwork' | 'references' | 'products' | 'general',
  ): Promise<UploadResult> {
    // If Multer already saved the file to disk with a unique name, preserve it exactly!
    const diskFilename = file.filename;
    let uniqueKey: string;
    let localUrl: string;

    if (diskFilename) {
      uniqueKey = `${folder}/${diskFilename}`;
      localUrl = `/uploads/${folder}/${diskFilename}`;
    } else {
      const filename = file.originalname || 'file';
      const ext = path.extname(filename);
      const baseName = path
        .basename(filename, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const prefix = folder === 'artwork' ? 'art_' : folder === 'references' ? 'ref_' : '';
      const uniqueFilename = `${prefix}${baseName}_${Date.now()}${ext}`;
      uniqueKey = `${folder}/${uniqueFilename}`;
      localUrl = `/uploads/${folder}/${uniqueFilename}`;
    }

    // In local development, default to local storage unless Supabase is explicitly configured and requested
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabaseEnabled =
      this.isConfigured() &&
      this.supabase &&
      (isProduction || process.env.USE_SUPABASE_IN_DEV === 'true');

    if (isSupabaseEnabled && this.supabase) {
      try {
        let fileBuffer: Buffer | null = file.buffer || null;
        if (!fileBuffer && file.path && fs.existsSync(file.path)) {
          fileBuffer = fs.readFileSync(file.path);
        }

        if (fileBuffer) {
          const { error } = await this.supabase.storage
            .from(this.bucketName)
            .upload(uniqueKey, fileBuffer, {
              contentType: file.mimetype || 'application/octet-stream',
              upsert: true,
            });

          if (error) {
            this.logger.warn(
              `Supabase upload error for ${uniqueKey}: ${error.message}. Using fallback.`,
            );
          } else {
            const { data: publicUrlData } = this.supabase.storage
              .from(this.bucketName)
              .getPublicUrl(uniqueKey);

            if (publicUrlData?.publicUrl) {
              this.logger.log(
                `File successfully uploaded to Supabase Storage: ${publicUrlData.publicUrl}`,
              );
              return {
                fileUrl: publicUrlData.publicUrl,
                storageKey: uniqueKey,
              };
            }
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Error uploading to Supabase Storage: ${err?.message || err}`,
        );
      }
    }

    // Local disk fallback: exactly matches the saved file on disk
    return {
      fileUrl: localUrl,
      storageKey: uniqueKey,
    };
  }
}

