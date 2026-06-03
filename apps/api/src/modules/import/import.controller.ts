import {
  Controller, Post, Get, Param, Res, Req,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImportService, ImportEntity } from './import.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (!allowed.includes(file.mimetype) && !file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      return cb(new BadRequestException('Solo se permiten archivos Excel (.xlsx, .xls) o CSV'), false);
    }
    cb(null, true);
  },
}).single('file');

const VALID_ENTITIES: ImportEntity[] = ['products', 'services', 'customers', 'users', 'nail-designs'];

@ApiTags('Import')
@Controller('import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportController {
  constructor(private importService: ImportService) {}

  /** Download Excel template for a given entity */
  @Get('template/:entity')
  downloadTemplate(@Param('entity') entity: string, @Res() res: Response) {
    if (!VALID_ENTITIES.includes(entity as ImportEntity)) {
      throw new BadRequestException(`Entidad inválida: ${entity}`);
    }
    const buffer = this.importService.generateTemplate(entity as ImportEntity);
    const names: Record<string, string> = {
      products: 'plantilla-productos',
      services: 'plantilla-servicios',
      customers: 'plantilla-clientes',
      users: 'plantilla-usuarios',
      'nail-designs': 'plantilla-diseños-unas',
    };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${names[entity]}.xlsx"`);
    res.send(buffer);
  }

  /** Preview rows from an uploaded file without saving */
  @Post('preview/:entity')
  preview(@Param('entity') entity: string, @Req() req: Request) {
    if (!VALID_ENTITIES.includes(entity as ImportEntity)) {
      throw new BadRequestException(`Entidad inválida: ${entity}`);
    }
    return new Promise((resolve, reject) => {
      upload(req as any, {} as any, async (err: any) => {
        if (err) return reject(err);
        const file = (req as any).file;
        if (!file) return reject(new BadRequestException('No se subió ningún archivo'));
        try {
          const result = await this.importService.preview(entity as ImportEntity, file.buffer);
          resolve(result);
        } catch (e) { reject(e); }
      });
    });
  }

  /** Import rows from an uploaded file into the database */
  @Post(':entity')
  importData(
    @Param('entity') entity: string,
    @Req() req: Request,
    @CurrentUser() user: any,
  ) {
    if (!VALID_ENTITIES.includes(entity as ImportEntity)) {
      throw new BadRequestException(`Entidad inválida: ${entity}`);
    }
    return new Promise((resolve, reject) => {
      upload(req as any, {} as any, async (err: any) => {
        if (err) return reject(err);
        const file = (req as any).file;
        if (!file) return reject(new BadRequestException('No se subió ningún archivo'));
        try {
          const result = await this.importService.importData(
            entity as ImportEntity,
            user.tenantId,
            user.storeId,
            file.buffer,
          );
          resolve(result);
        } catch (e) { reject(e); }
      });
    });
  }
}
