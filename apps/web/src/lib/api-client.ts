import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const getAuthHeaders = async (initHeaders?: HeadersInit) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(initHeaders as Record<string, string> || {}),
  };
  
  if (typeof window !== 'undefined') {
    const session = await getSession();
    if (session && session.user && (session.user as any).accessToken) {
      headers['Authorization'] = `Bearer ${(session.user as any).accessToken}`;
    } else {
      console.warn('API Client: No access token found in session', session);
    }
  }
  return headers;
};

export const apiClient = {
  get: async (endpoint: string, init?: RequestInit) => {
    const headers = await getAuthHeaders(init?.headers);
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      headers,
    });
    if (!res.ok) {
      const errText = await res.text();
      let message = `API GET ${endpoint} failed`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) message = parsed.message;
      } catch (_) {}
      throw new Error(message);
    }
    return res.json();
  },
  post: async (endpoint: string, body: any, init?: RequestInit) => {
    const headers = await getAuthHeaders(init?.headers);
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      let message = `API POST ${endpoint} failed`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) message = parsed.message;
      } catch (_) {}
      throw new Error(message);
    }
    return res.json();
  },
  put: async (endpoint: string, body: any, init?: RequestInit) => {
    const headers = await getAuthHeaders(init?.headers);
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      let message = `API PUT ${endpoint} failed`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) message = parsed.message;
      } catch (_) {}
      throw new Error(message);
    }
    return res.json();
  },
  delete: async (endpoint: string, init?: RequestInit) => {
    const headers = await getAuthHeaders(init?.headers);
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const errText = await res.text();
      let message = `API DELETE ${endpoint} failed`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) message = parsed.message;
      } catch (_) {}
      throw new Error(message);
    }
    if (res.status === 204 || res.headers.get('content-length') === '0') return null;
    return res.json();
  },
};
