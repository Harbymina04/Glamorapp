import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Firmas (magic bytes) de los únicos formatos de imagen permitidos.
 * SVG queda EXCLUIDO a propósito: puede contener JavaScript y se sirve
 * desde una URL pública → vector de XSS almacenado.
 */
const IMAGE_SIGNATURES: { mime: string; ext: string; bytes: number[]; offset?: number }[] = [
  { mime: 'image/jpeg', ext: 'jpg',  bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png',  ext: 'png',  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif',  ext: 'gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP
];

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
   * Detecta el tipo de imagen real a partir de los magic bytes del contenido.
   * Devuelve null si el contenido no coincide con una imagen permitida.
   */
  private detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
    for (const sig of IMAGE_SIGNATURES) {
      const offset = sig.offset ?? 0;
      if (buffer.length < offset + sig.bytes.length) continue;
      if (!sig.bytes.every((b, i) => buffer[offset + i] === b)) continue;
      // WEBP: además los bytes 8-11 deben ser "WEBP"
      if (sig.mime === 'image/webp') {
        if (buffer.length < 12 || buffer.slice(8, 12).toString('ascii') !== 'WEBP') continue;
      }
      return { mime: sig.mime, ext: sig.ext };
    }
    return null;
  }

  /**
   * Save a file to disk and return its public URL.
   * Folder is created under the upload root.
   *
   * Seguridad: el contenido se valida por magic bytes (no por el mimetype del
   * cliente, que es falsificable) y la extensión del archivo guardado se deriva
   * del tipo detectado — nunca del nombre del cliente. Esto evita XSS almacenado
   * vía archivos políglotas (p. ej. un GIF válido subido como "x.html") y SVG.
   */
  async saveFile(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
    const detected = this.detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException('El archivo no es una imagen válida (solo JPEG, PNG, GIF o WEBP).');
    }

    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Nombre aleatorio + extensión segura derivada del contenido real.
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${detected.ext}`;
    const filePath = path.join(folderPath, uniqueName);

    fs.writeFileSync(filePath, file.buffer);

    const url = `/uploads/${folder}/${uniqueName}`;
    this.logger.log(`File saved: ${url}`);

    return {
      url,
      filename: file.originalname,
      size: file.size,
      mimeType: detected.mime,
    };
  }

  /**
   * Delete a file by its relative URL path (e.g. /uploads/products/abc.jpg).
   * Validates the resolved path stays inside uploadDir to prevent path traversal.
   */
  async deleteFile(url: string): Promise<void> {
    const fullPath = this.resolveSafePath(url);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`File deleted: ${url}`);
    }
  }

  /**
   * Get the absolute path for a relative URL.
   * Validates the resolved path stays inside uploadDir.
   */
  getAbsolutePath(url: string): string {
    return this.resolveSafePath(url);
  }

  private resolveSafePath(url: string): string {
    const relativePath = url.replace(/^\/uploads\//, '');
    const resolved = path.resolve(path.join(this.uploadDir, relativePath));
    const uploadRoot = path.resolve(this.uploadDir);
    if (!resolved.startsWith(uploadRoot + path.sep) && resolved !== uploadRoot) {
      throw new BadRequestException('Invalid file path');
    }
    return resolved;
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
