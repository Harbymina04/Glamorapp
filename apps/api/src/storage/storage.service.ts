import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private uploadDir: string;
  private publicBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir =
      this.configService.get('UPLOAD_DIR') ||
      path.join(process.cwd(), 'uploads');
    this.publicBaseUrl =
      this.configService.get('PUBLIC_URL') ||
      `http://localhost:${this.configService.get('PORT', 3001)}`;

    // Ensure upload dir exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save a file to disk and return its public URL.
   * Folder is created under the upload root.
   */
  async saveFile(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(folderPath, uniqueName);

    fs.writeFileSync(filePath, file.buffer);

    const url = `/uploads/${folder}/${uniqueName}`;
    this.logger.log(`File saved: ${url}`);

    return {
      url,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Delete a file by its relative URL path (e.g. /uploads/products/abc.jpg)
   */
  async deleteFile(url: string): Promise<void> {
    // Remove leading slash and "uploads/" prefix
    const relativePath = url.replace(/^\/uploads\//, '');
    const fullPath = path.join(this.uploadDir, relativePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`File deleted: ${url}`);
    }
  }

  /**
   * Get the absolute path for a relative URL
   */
  getAbsolutePath(url: string): string {
    const relativePath = url.replace(/^\/uploads\//, '');
    return path.join(this.uploadDir, relativePath);
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
