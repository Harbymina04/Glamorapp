import {
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StorageService } from '../../storage/storage.service';
import { Request } from 'express';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (!file.mimetype.match(/^image\//)) {
      return cb(new BadRequestException('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

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
        resolve(this.storage.saveFile(file));
      });
    });
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
        const saved = await Promise.all(
          files.map((f: any) => this.storage.saveFile(f)),
        );
        resolve({ files: saved });
      });
    });
  }
}
