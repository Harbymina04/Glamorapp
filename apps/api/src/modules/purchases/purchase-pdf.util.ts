// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

export interface PurchaseForPdf {
  purchaseNumber: string;
  createdAt: Date | string;
  dueDate?: Date | string | null;
  notes?: string | null;
  ivaPercent: number;
  ivaAmount: number;
  subtotal: number;
  total: number;
  supplier: {
    businessName: string;
    supplierNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    contactName?: string | null;
  };
  store: {
    name: string;
    primaryColor?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    slogan?: string | null;
    nit?: string | null;
  };
  items: Array<{
    product: { name: string; sku?: string | null };
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const DATE_FMT = (d: Date | string) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

// Ensure hex color is valid, fallback to default
const safeColor = (c?: string | null, fallback = '#1a1a2e') =>
  c && /^#[0-9A-Fa-f]{6}$/.test(c) ? c : fallback;

const DARK  = '#1a1a2e';
const GRAY  = '#64748b';
const LGRAY = '#f1f5f9';
const WHITE = '#ffffff';
const BORD  = '#e2e8f0';

export function generatePurchasePdf(data: PurchaseForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const BRAND = safeColor(data.store.primaryColor);

    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 96;
    const L = 48;

    // ── HEADER — color de la tienda ───────────────────────────────
    doc.rect(0, 0, doc.page.width, 88).fill(BRAND);

    // Nombre de la tienda (izquierda)
    doc.font('Helvetica-Bold').fontSize(22).fillColor(WHITE)
      .text(data.store.name, L, 22);
    if (data.store.slogan) {
      doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.80)')
        .text(data.store.slogan, L, 48);
    }

    // OC info (derecha)
    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE)
      .text('ORDEN DE COMPRA', 0, 18, { align: 'right', width: doc.page.width - L });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(WHITE)
      .text(data.purchaseNumber, 0, 40, { align: 'right', width: doc.page.width - L });
    doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.80)')
      .text(`Fecha: ${DATE_FMT(data.createdAt)}`, 0, 62, { align: 'right', width: doc.page.width - L });

    let y = 104;

    // ── TARJETAS INFO ─────────────────────────────────────────────
    const cardW = (W - 16) / 2;

    // Helper tarjeta
    const drawCard = (cx: number, title: string, lines: (string | null | undefined)[]) => {
      const validLines = lines.filter(Boolean) as string[];
      const h = 24 + 16 + validLines.length * 14 + 8;
      doc.rect(cx, y, cardW, h).fillAndStroke(LGRAY, BORD);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND)
        .text(title, cx + 12, y + 10);
      let ly = y + 26;
      validLines.forEach((line, i) => {
        const bold = i === 0;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 11 : 9)
          .fillColor(bold ? DARK : GRAY)
          .text(line, cx + 12, ly, { width: cardW - 24 });
        ly += bold ? 16 : 13;
      });
      return h;
    };

    const supH = drawCard(L, 'PROVEEDOR', [
      data.supplier.businessName,
      data.supplier.supplierNumber ? `NIT/ID: ${data.supplier.supplierNumber}` : null,
      data.supplier.contactName ? `Contacto: ${data.supplier.contactName}` : null,
      data.supplier.email,
      data.supplier.phone,
      data.supplier.address,
    ]);

    const storeLines: (string | null | undefined)[] = [
      data.store.name,
      data.store.nit ? `NIT: ${data.store.nit}` : null,
      data.store.email,
      data.store.phone,
      data.store.address,
      data.dueDate ? `Fecha límite: ${DATE_FMT(data.dueDate)}` : null,
    ];
    const stoH = drawCard(L + cardW + 16, 'EMITIDO POR', storeLines);

    y += Math.max(supH, stoH) + 16;

    // ── TABLA DE PRODUCTOS ────────────────────────────────────────
    const cols = { sku: 68, name: W - 68 - 52 - 80 - 80, qty: 52, price: 80, total: 80 };
    const colX = {
      sku:   L,
      name:  L + cols.sku,
      qty:   L + cols.sku + cols.name,
      price: L + cols.sku + cols.name + cols.qty,
      total: L + cols.sku + cols.name + cols.qty + cols.price,
    };

    // Encabezado
    doc.rect(L, y, W, 22).fill(BRAND);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE);
    doc.text('SKU',           colX.sku   + 4, y + 7, { width: cols.sku   - 8 });
    doc.text('PRODUCTO',      colX.name  + 4, y + 7, { width: cols.name  - 8 });
    doc.text('CANT.',         colX.qty   + 4, y + 7, { width: cols.qty   - 8, align: 'center' });
    doc.text('PRECIO UNIT.',  colX.price + 4, y + 7, { width: cols.price - 8, align: 'right' });
    doc.text('SUBTOTAL',      colX.total + 4, y + 7, { width: cols.total - 8, align: 'right' });
    y += 22;

    // Filas
    data.items.forEach((item, i) => {
      const rowH = 24;
      doc.rect(L, y, W, rowH).fill(i % 2 === 0 ? WHITE : LGRAY);
      doc.rect(L, y, W, rowH).stroke(BORD);

      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text(item.product.sku ?? '—', colX.sku + 4, y + 7, { width: cols.sku - 8 });
      doc.font('Helvetica').fontSize(9).fillColor(DARK)
        .text(item.product.name, colX.name + 4, y + 7, { width: cols.name - 8 });
      doc.font('Helvetica').fontSize(9).fillColor(DARK)
        .text(String(item.quantity), colX.qty + 4, y + 7, { width: cols.qty - 8, align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor(DARK)
        .text(COP(Number(item.unitPrice)), colX.price + 4, y + 7, { width: cols.price - 8, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK)
        .text(COP(Number(item.total)), colX.total + 4, y + 7, { width: cols.total - 8, align: 'right' });
      y += rowH;
    });

    y += 16;

    // ── TOTALES ───────────────────────────────────────────────────
    const totW = 230;
    const totX = L + W - totW;

    const addTotalRow = (label: string, value: string, bold = false, color = DARK) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9)
        .fillColor(GRAY).text(label, totX, y, { width: 120 });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9)
        .fillColor(color).text(value, totX + 120, y, { width: totW - 120, align: 'right' });
      y += bold ? 18 : 14;
    };

    addTotalRow('Subtotal:', COP(Number(data.subtotal)));
    if (Number(data.ivaPercent) > 0) {
      addTotalRow(`IVA (${Number(data.ivaPercent)}%):`, COP(Number(data.ivaAmount)), false, '#2563eb');
    }
    doc.moveTo(totX, y).lineTo(totX + totW, y).strokeColor(BORD).stroke();
    y += 6;
    addTotalRow('TOTAL:', COP(Number(data.total)), true, BRAND);

    y += 16;

    // ── NOTAS ─────────────────────────────────────────────────────
    if (data.notes) {
      doc.rect(L, y, W, 1).fill(BORD); y += 12;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('NOTAS:', L, y); y += 14;
      doc.font('Helvetica').fontSize(9).fillColor(DARK)
        .text(data.notes, L, y, { width: W });
      y += doc.heightOfString(data.notes, { width: W }) + 12;
    }

    // ── FOOTER ───────────────────────────────────────────────────
    const pageH = doc.page.height;
    doc.rect(0, pageH - 36, doc.page.width, 36).fill(BRAND);
    doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.70)')
      .text(
        `${data.store.name} · ${data.purchaseNumber} · Generado el ${DATE_FMT(new Date())}`,
        0, pageH - 22,
        { align: 'center', width: doc.page.width },
      );

    doc.end();
  });
}
