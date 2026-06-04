/**
 * Server-side fetch helpers for the storefront.
 * These run on the server and are NOT available on the client.
 */

const API = process.env.API_URL || 'http://localhost:3001';

async function safeFetch<T>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 300 }, ...opts });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function getStorefront(slug: string) {
  return safeFetch<any>(`${API}/api/v1/storefront/public/${slug}`);
}

export async function getStorefrontData(tenantId: string) {
  const [products, services, designs, reviews, locations] = await Promise.all([
    safeFetch<any>(`${API}/api/v1/storefront/public/products?tenantId=${tenantId}&limit=20`),
    safeFetch<any>(`${API}/api/v1/storefront/public/services?tenantId=${tenantId}&limit=20`),
    safeFetch<any>(`${API}/api/v1/storefront/public/designs?tenantId=${tenantId}&limit=12`),
    safeFetch<any>(`${API}/api/v1/storefront/reviews?tenantId=${tenantId}&limit=20`),
    safeFetch<any>(`${API}/api/v1/storefront/public/locations/${tenantId}`),
  ]);
  return {
    products: Array.isArray(products) ? products : products?.data || [],
    services: Array.isArray(services) ? services : services?.data || [],
    designs:  Array.isArray(designs)  ? designs  : designs?.data  || [],
    reviews:  Array.isArray(reviews)  ? reviews  : reviews?.data  || [],
    locations: Array.isArray(locations) ? locations : [],
  };
}

export async function getPublicStores() {
  return safeFetch<any[]>(`${API}/api/v1/storefront/public`) ?? [];
}

export async function getPublicProducts(limit = 20) {
  const data = await safeFetch<any>(`${API}/api/v1/storefront/public/products?limit=${limit}`);
  return Array.isArray(data) ? data : data?.data || [];
}

export async function getPublicDesigns(limit = 8) {
  const data = await safeFetch<any>(`${API}/api/v1/storefront/public/designs?limit=${limit}`);
  return Array.isArray(data) ? data : data?.data || [];
}

export async function getPublicProduct(id: string) {
  return safeFetch<any>(`${API}/api/v1/storefront/public/products/${id}`);
}
