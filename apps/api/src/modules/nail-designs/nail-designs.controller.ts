import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NailDesignsService } from './nail-designs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { StorageService } from '../../storage/storage.service';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Nail Designs')
@Controller('nail-designs')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
@ApiBearerAuth()
export class NailDesignsController {
  constructor(
    private service: NailDesignsService,
    private storage: StorageService,
  ) {}

  @Get()
  findAll(@TenantId() t: string, @StoreId() s: string, @Query() q: any) { return this.service.findAll(t, s, q); }

  @Get('ranking')
  ranking(@TenantId() t: string, @StoreId() s: string) { return this.service.getRanking(t, s); }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.findOne(t, s, id); }

  @Post() create(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.create(t, s, d); }
  @Put(':id') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: any) { return this.service.update(t, s, id, d); }
  @Delete(':id') remove(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.remove(t, s, id); }
  @Post(':id/favorite') toggleFavorite(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.toggleFavorite(t, s, id); }

  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\//)) {
        return cb(new BadRequestException('Solo se permiten imágenes'), false);
      }
      cb(null, true);
    },
  }))
  async uploadImage(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se subió ninguna imagen');
    await this.service.findOne(tenantId, storeId, id);
    const saved = await this.storage.saveFile(file, 'nail-designs');
    return this.service.setImage(id, saved.url);
  }
}
