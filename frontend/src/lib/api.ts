const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  post: async <T>(path: string, body: unknown, token?: string): Promise<T> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Request failed');
    return data as T;
  },

  get: async <T>(path: string, token?: string): Promise<T> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, { method: 'GET', headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Request failed');
    return data as T;
  },
};
