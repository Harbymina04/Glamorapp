const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    // Auto-logout on 401 — token expired or revoked
    if (res.status === 401 && typeof window !== 'undefined') {
      const { clearAuth } = await import('@/lib/auth');
      clearAuth();
      window.location.href = '/auth/login';
    }
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(res.status, body.message || 'Request failed');
  }
  return res.json();
}

export const api = {
  async get(path: string, options?: FetchOptions) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options?.headers,
      },
    });
    return handleResponse(res);
  },

  async post(path: string, body?: any, options?: FetchOptions) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  async put(path: string, body?: any, options?: FetchOptions) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  async patch(path: string, body?: any, options?: FetchOptions) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  async postForm(path: string, formData: FormData, options?: FetchOptions) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
        // Do NOT set Content-Type — browser sets multipart/form-data with boundary automatically
      },
      body: formData,
    });
    return handleResponse(res);
  },

  async del(path: string, options?: FetchOptions) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options?.headers,
      },
    });
    return handleResponse(res);
  },
};
