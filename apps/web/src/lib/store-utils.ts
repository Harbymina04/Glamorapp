const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const storeApi = {
  get: async (path: string) => {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (path: string, body: any) => {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export const formatCOP = (amount: number) =>
  `$${Math.round(amount).toLocaleString('es-CO')}`;

export const categoryColors: Record<string, { color: string; bg: string }> = {
  nails:   { color: '#F43F5E', bg: '#FFE4E6' },
  hair:    { color: '#8B5CF6', bg: '#EDE9FE' },
  makeup:  { color: '#EC4899', bg: '#FCE7F3' },
  skin:    { color: '#F97316', bg: '#FFEDD5' },
  spa:     { color: '#14B8A6', bg: '#CCFBF1' },
  default: { color: '#EF2D8F', bg: '#FFF1F8' },
};
