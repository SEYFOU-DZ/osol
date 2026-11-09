// إعدادات الاتصال بالسيرفر
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getAuthToken = () => {
  try {
    return localStorage.getItem('osool_token');
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string) => {
  try {
    localStorage.setItem('osool_token', token);
  } catch {}
};

export const removeAuthToken = () => {
  try {
    localStorage.removeItem('osool_token');
  } catch {}
};

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `خطأ في الخادم (${response.status})`);
  }

  return response.json();
}
