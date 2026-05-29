import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StorageService } from '../../storage/storage.service';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

/** Allowed image magic-byte signatures (hex). */
const IMAGE_SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP
];

function detectImageMime(buffer: Buffer): string | null {
  for (const sig of IMAGE_SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    if (sig.bytes.every((b, i) => buffer[offset + i] === b)) {
      // Extra check for WEBP: bytes 8-11 must be "WEBP"
      if (sig.mime === 'image/webp') {
        if (buffer.length < 12) continue;
        const webp = buffer.slice(8, 12).toString('ascii');
        if (webp !== 'WEBP') continue;
      }
      return sig.mime;
    }
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
      return cb(new BadRequestException('Only JPEG, PNG, GIF or WEBP images are allowed'), false);
    }
    cb(null, true);
  },
});

function validateImageBuffer(buffer: Buffer): void {
  const detected = detectImageMime(buffer);
  if (!detected) {
    throw new BadRequestException('File content does not match a valid image format');
  }
}

const uploadSingle = upload.single('file');
const uploadMultiple = upload.array('files', 10);

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private storage: StorageService) {}

  @Post('image')
  uploadImage(@Req() req: Request) {
    return new Promise((resolve, reject) => {
      uploadSingle(req as any, {} as any, (err: any) => {
        if (err) return reject(err);
        const file = (req as any).file;
        if (!file) return reject(new BadRequestException('No file uploaded'));
        try { validateImageBuffer(file.buffer); } catch (e) { return reject(e); }
        resolve(this.storage.saveFile(file));
      });
    });
  }

  /** Serve an uploaded file — requires authentication */
  @Get('files/:folder/:filename')
  serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Prevent path traversal in both segments
    if (folder.includes('..') || filename.includes('..') || folder.includes('/') || filename.includes('/')) {
      throw new BadRequestException('Invalid path');
    }
    const filePath = this.storage.getAbsolutePath(`/uploads/${folder}/${filename}`);
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found');
    res.sendFile(filePath);
  }

  @Post('images')
  uploadImages(@Req() req: Request) {
    return new Promise((resolve, reject) => {
      uploadMultiple(req as any, {} as any, async (err: any) => {
        if (err) return reject(err);
        const files = (req as any).files;
        if (!files || files.length === 0) {
          return reject(new BadRequestException('No files uploaded'));
        }
        try {
          files.forEach((f: any) => validateImageBuffer(f.buffer));
        } catch (e) { return reject(e); }
        const saved = await Promise.all(
          files.map((f: any) => this.storage.saveFile(f)),
        );
        resolve({ files: saved });
      });
    });
  }
}
