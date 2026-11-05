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
    const filename = file.filename || file.originalname;
    const ext = path.extname(filename);
    const baseName = path
      .basename(filename, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueKey = `${folder}/${baseName}_${Date.now()}${ext}`;

    if (this.isConfigured() && this.supabase) {
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

    // Fallback: Local disk URL
    const localUrl = `/uploads/${folder}/${file.filename || filename}`;
    return {
      fileUrl: localUrl,
      storageKey: uniqueKey,
    };
  }
}

