// Helpers para URLs de producto con slug SEO: /tienda/producto/<slug>--<uuid>
// El UUID al final es la fuente de verdad; el slug es decorativo para SEO.
// Las URLs viejas con UUID pelado siguen funcionando (redirect 301 a la forma con slug).

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extrae el UUID de un param de ruta, sea "uuid" o "slug--uuid". */
export function extractProductId(param: string): string {
  const m = decodeURIComponent(param).match(UUID_RE);
  return m ? m[0] : param;
}

export function slugifyName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Ruta canónica del producto, con slug si hay nombre. */
export function productPath(p: { id: string; name?: string | null }): string {
  const slug = slugifyName(p.name ?? '');
  return slug ? `/tienda/producto/${slug}--${p.id}` : `/tienda/producto/${p.id}`;
}
