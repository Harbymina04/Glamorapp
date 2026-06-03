import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as XLSX from 'xlsx';

export type ImportEntity = 'products' | 'services' | 'customers' | 'users' | 'nail-designs';

// ─── Template definitions ──────────────────────────────────────────────────

const TEMPLATES: Record<ImportEntity, { headers: string[]; example: Record<string, any> }> = {
  products: {
    headers: ['nombre', 'sku', 'descripcion', 'precio_venta', 'precio_costo', 'stock_actual', 'stock_minimo', 'categoria', 'marca', 'unidad'],
    example: {
      nombre: 'Esmalte Rojo Pasión',
      sku: 'ESM-001',
      descripcion: 'Esmalte de uñas color rojo intenso',
      precio_venta: 25000,
      precio_costo: 12000,
      stock_actual: 10,
      stock_minimo: 3,
      categoria: 'Esmaltes',
      marca: 'OPI',
      unidad: 'unidad',
    },
  },
  services: {
    headers: ['nombre', 'descripcion', 'precio', 'duracion_minutos', 'categoria', 'comision_porcentaje'],
    example: {
      nombre: 'Manicure Clásico',
      descripcion: 'Manicure con esmaltado tradicional',
      precio: 35000,
      duracion_minutos: 60,
      categoria: 'Uñas',
      comision_porcentaje: 40,
    },
  },
  customers: {
    headers: ['nombre', 'apellido', 'email', 'telefono', 'fecha_nacimiento', 'notas'],
    example: {
      nombre: 'María',
      apellido: 'García',
      email: 'maria@email.com',
      telefono: '3001234567',
      fecha_nacimiento: '1990-05-15',
      notas: 'Clienta VIP',
    },
  },
  users: {
    headers: ['nombre', 'apellido', 'email', 'telefono', 'rol', 'contrasena'],
    example: {
      nombre: 'Ana',
      apellido: 'López',
      email: 'ana@salon.com',
      telefono: '3009876543',
      rol: 'professional',
      contrasena: 'Temporal123',
    },
  },
  'nail-designs': {
    headers: ['nombre', 'descripcion', 'tecnica', 'precio', 'dificultad', 'colores'],
    example: {
      nombre: 'French Clásico',
      descripcion: 'Diseño francés tradicional con punta blanca',
      tecnica: 'acrílico',
      precio: 45000,
      dificultad: 'media',
      colores: 'blanco, nude',
    },
  },
};

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  // ─── Generate template ─────────────────────────────────────────────────────

  generateTemplate(entity: ImportEntity): Buffer {
    const def = TEMPLATES[entity];
    if (!def) throw new BadRequestException(`Entidad no soportada: ${entity}`);

    const wb = XLSX.utils.book_new();

    // Data sheet with example row
    const data = [def.example];
    const ws = XLSX.utils.json_to_sheet(data, { header: def.headers });

    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cell]) {
        ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'EC4899' } } };
      }
    }

    // Set column widths
    ws['!cols'] = def.headers.map(() => ({ wch: 20 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    // Instructions sheet
    const instructions = [
      { instruccion: `Plantilla de importación: ${entity}` },
      { instruccion: '' },
      { instruccion: 'INSTRUCCIONES:' },
      { instruccion: '1. No modifiques los nombres de las columnas (primera fila)' },
      { instruccion: '2. Elimina la fila de ejemplo antes de importar' },
      { instruccion: '3. Los campos marcados con * son obligatorios' },
      { instruccion: '4. Guarda el archivo en formato .xlsx o .csv' },
      ...this.getEntityInstructions(entity),
    ];
    const wsInst = XLSX.utils.json_to_sheet(instructions);
    wsInst['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  private getEntityInstructions(entity: ImportEntity): { instruccion: string }[] {
    const map: Record<ImportEntity, string[]> = {
      products: [
        '',
        'CAMPOS:',
        '* nombre: Nombre del producto (obligatorio)',
        '* precio_venta: Precio de venta en pesos (obligatorio)',
        '  sku: Código único del producto',
        '  descripcion: Descripción del producto',
        '  precio_costo: Precio de costo',
        '  stock_actual: Cantidad en inventario (default: 0)',
        '  stock_minimo: Stock mínimo para alertas (default: 0)',
        '  categoria: Nombre de la categoría',
        '  marca: Nombre de la marca',
        '  unidad: unidad, ml, gr, litro, etc.',
      ],
      services: [
        '',
        'CAMPOS:',
        '* nombre: Nombre del servicio (obligatorio)',
        '* precio: Precio del servicio en pesos (obligatorio)',
        '  descripcion: Descripción del servicio',
        '  duracion_minutos: Duración en minutos (default: 60)',
        '  categoria: Categoría del servicio',
        '  comision_porcentaje: % de comisión para profesionales (default: 0)',
      ],
      customers: [
        '',
        'CAMPOS:',
        '* nombre: Nombre del cliente (obligatorio)',
        '* apellido: Apellido del cliente (obligatorio)',
        '  email: Correo electrónico',
        '  telefono: Número de teléfono',
        '  fecha_nacimiento: Formato YYYY-MM-DD',
        '  notas: Notas internas',
      ],
      users: [
        '',
        'CAMPOS:',
        '* nombre: Nombre (obligatorio)',
        '* apellido: Apellido (obligatorio)',
        '* email: Email único (obligatorio)',
        '* contrasena: Contraseña inicial (obligatorio)',
        '  telefono: Teléfono',
        '  rol: professional, receptionist, store_admin (default: professional)',
      ],
      'nail-designs': [
        '',
        'CAMPOS:',
        '* nombre: Nombre del diseño (obligatorio)',
        '  descripcion: Descripción',
        '  tecnica: acrílico, gel, esmalte, nail art, etc.',
        '  precio: Precio del diseño',
        '  dificultad: baja, media, alta',
        '  colores: Colores separados por coma',
      ],
    };
    return (map[entity] || []).map(i => ({ instruccion: i }));
  }

  // ─── Parse Excel ───────────────────────────────────────────────────────────

  parseFile(buffer: Buffer): Record<string, any>[] {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
    if (!rows.length) throw new BadRequestException('El archivo está vacío');
    return rows;
  }

  // ─── Preview (validate without saving) ────────────────────────────────────

  async preview(entity: ImportEntity, buffer: Buffer) {
    const rows = this.parseFile(buffer);
    const def = TEMPLATES[entity];
    const results = rows.map((row, i) => {
      const errors = this.validateRow(entity, row);
      return { row: i + 2, data: row, errors, valid: errors.length === 0 };
    });
    return {
      total: rows.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      headers: def.headers,
      rows: results.slice(0, 50), // preview first 50
    };
  }

  private validateRow(entity: ImportEntity, row: Record<string, any>): string[] {
    const errors: string[] = [];
    const required: Record<ImportEntity, string[]> = {
      products: ['nombre', 'precio_venta'],
      services: ['nombre', 'precio'],
      customers: ['nombre', 'apellido'],
      users: ['nombre', 'apellido', 'email', 'contrasena'],
      'nail-designs': ['nombre'],
    };
    for (const field of required[entity] || []) {
      if (!row[field] && row[field] !== 0) errors.push(`Campo "${field}" es obligatorio`);
    }
    if (entity === 'users' && row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
      errors.push('Email inválido');
    }
    return errors;
  }

  // ─── Import (save to DB) ───────────────────────────────────────────────────

  async importData(entity: ImportEntity, tenantId: string, storeId: string, buffer: Buffer) {
    const rows = this.parseFile(buffer);
    const results = { created: 0, skipped: 0, errors: [] as { row: number; error: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const errors = this.validateRow(entity, row);
      if (errors.length) {
        results.errors.push({ row: rowNum, error: errors.join(', ') });
        results.skipped++;
        continue;
      }
      try {
        await this.saveRow(entity, tenantId, storeId, row);
        results.created++;
      } catch (err: any) {
        results.errors.push({ row: rowNum, error: err.message });
        results.skipped++;
      }
    }

    return results;
  }

  private async saveRow(entity: ImportEntity, tenantId: string, storeId: string, row: Record<string, any>) {
    switch (entity) {
      case 'products':
        return this.saveProduct(tenantId, storeId, row);
      case 'services':
        return this.saveService(tenantId, storeId, row);
      case 'customers':
        return this.saveCustomer(tenantId, storeId, row);
      case 'users':
        return this.saveUser(tenantId, storeId, row);
      case 'nail-designs':
        return this.saveNailDesign(tenantId, storeId, row);
    }
  }

  private async saveProduct(tenantId: string, storeId: string, row: Record<string, any>) {
    return this.prisma.product.create({
      data: {
        tenantId,
        storeId,
        name: String(row.nombre),
        sku: row.sku ? String(row.sku) : undefined,
        description: row.descripcion ? String(row.descripcion) : undefined,
        salePrice: Number(row.precio_venta) || 0,
        costPrice: Number(row.precio_costo) || 0,
        currentStock: Number(row.stock_actual) || 0,
        minStock: Number(row.stock_minimo) || 0,
        unitOfMeasure: row.unidad ? String(row.unidad) : 'unit',
        status: 'active',
      },
    });
  }

  private async saveService(tenantId: string, storeId: string, row: Record<string, any>) {
    return this.prisma.service.create({
      data: {
        tenantId,
        storeId,
        name: String(row.nombre),
        description: row.descripcion ? String(row.descripcion) : undefined,
        price: Number(row.precio) || 0,
        durationMinutes: Number(row.duracion_minutos) || 60,
        category: row.categoria ? String(row.categoria) : undefined,
        commissionRate: Number(row.comision_porcentaje) || 0,
        isActive: true,
      },
    });
  }

  private async saveCustomer(tenantId: string, storeId: string, row: Record<string, any>) {
    const count = await this.prisma.customer.count({ where: { tenantId } });
    const customerNumber = `C-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.customer.create({
      data: {
        tenantId,
        storeId,
        customerNumber,
        firstName: String(row.nombre),
        lastName: String(row.apellido),
        email: row.email ? String(row.email) : undefined,
        phone: row.telefono ? String(row.telefono) : undefined,
        dateOfBirth: row.fecha_nacimiento ? new Date(String(row.fecha_nacimiento)) : undefined,
        notes: row.notas ? String(row.notas) : undefined,
        source: 'import',
      },
    });
  }

  private async saveUser(tenantId: string, storeId: string, row: Record<string, any>) {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(String(row.contrasena), 10);
    const validRoles = ['professional', 'receptionist', 'store_admin'];
    const role = validRoles.includes(String(row.rol)) ? String(row.rol) : 'professional';
    return this.prisma.user.create({
      data: {
        tenantId,
        storeId,
        firstName: String(row.nombre),
        lastName: String(row.apellido),
        email: String(row.email),
        passwordHash,
        phone: row.telefono ? String(row.telefono) : undefined,
        role: role as any,
        isActive: true,
      },
    });
  }

  private async saveNailDesign(tenantId: string, storeId: string, row: Record<string, any>) {
    return this.prisma.nailDesign.create({
      data: {
        tenantId,
        storeId,
        name: String(row.nombre),
        technique: row.tecnica ? String(row.tecnica) : undefined,
        suggestedPrice: row.precio ? Number(row.precio) : undefined,
        colors: row.colores ? String(row.colores).split(',').map((c: string) => c.trim()) : [],
        isActive: true,
      },
    });
  }
}
