import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { StorageModule } from '../../storage/storage.module';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
    StorageModule,
  ],
  controllers: [UploadController],
  exports: [MulterModule],
})
export class UploadModule {}
