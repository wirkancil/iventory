// Catatan: Tentukan base URL di dalam fetchAPI agar tidak terikat ke SSR port.

// Fungsi untuk mendapatkan token dari localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Fungsi helper untuk request API
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  const url = `${base}${endpoint}`;
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) => {
    return fetchAPI('/user/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  logout: () => {
    return fetchAPI('/auth/logout', { method: 'POST' });
  },
  getProfile: () => {
    return fetchAPI('/auth/profile');
  },
};

// Barang API
export const barangAPI = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return fetchAPI(`/barang${query}`);
  },
  getById: (id: string) => {
    return fetchAPI(`/barang/${id}`);
  },
  create: (data: any) => {
    return fetchAPI('/barang', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: any) => {
    return fetchAPI(`/barang/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) => {
    return fetchAPI(`/barang/${id}`, {
      method: 'DELETE',
    });
  },
};

// Users API
export const usersAPI = {
  getAll: () => {
    return fetchAPI('/user');
  },
  getById: (id: string) => {
    return fetchAPI(`/user/${id}`);
  },
  me: async () => {
    const res = await fetchAPI('/user/me');
    return res?.user ?? null;
  },
  create: (data: { email: string; password: string; role: 'admin' | 'user'; name?: string }) => {
    return fetchAPI('/user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: any) => {
    return fetchAPI(`/user/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) => {
    return fetchAPI(`/user/${id}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API
export const dashboardAPI = {
  getSummary: () => {
    return fetchAPI('/dashboard/summary');
  },
  getRecentActivity: () => {
    return fetchAPI('/dashboard/activity');
  },
  getTopProducts: () => {
    return fetchAPI('/dashboard/top-products');
  },
};

// Transaksi API
export const transaksiAPI = {
  create: (data: { id_barang: string; jumlah: number; tipe_transaksi: 'masuk' | 'keluar'; tanggal: string }) => {
    return fetchAPI('/transaksi', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  list: (params?: { id_barang?: string; tipe_transaksi?: 'masuk' | 'keluar'; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.id_barang) queryParams.append('id_barang', params.id_barang);
    if (params?.tipe_transaksi) queryParams.append('tipe_transaksi', params.tipe_transaksi);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    const q = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return fetchAPI(`/transaksi${q}`);
  }
};