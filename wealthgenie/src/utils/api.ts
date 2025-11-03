import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2ee15a73`;

// Helper function to make API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  signup: async (email: string, password: string, name: string) => {
    return apiCall('/signup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password, name }),
    });
  },

  getProfile: async (accessToken: string) => {
    return apiCall('/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },
};

// Transaction API
export const transactionApi = {
  add: async (accessToken: string, transaction: any) => {
    return apiCall('/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(transaction),
    });
  },

  getAll: async (accessToken: string, filters?: { year?: string; month?: string; type?: string; fileId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', filters.year);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.fileId) params.append('fileId', filters.fileId);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/transactions?${queryString}` : '/transactions';
    
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },

  delete: async (accessToken: string, transactionId: string) => {
    return apiCall(`/transactions/${transactionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },
};

// EMI API
export const emiApi = {
  add: async (accessToken: string, emi: any) => {
    return apiCall('/emis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(emi),
    });
  },

  getAll: async (accessToken: string, filters?: { fileId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.fileId) params.append('fileId', filters.fileId);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/emis?${queryString}` : '/emis';
    
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },

  update: async (accessToken: string, emiId: string, updates: any) => {
    return apiCall(`/emis/${emiId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updates),
    });
  },

  delete: async (accessToken: string, emiId: string) => {
    return apiCall(`/emis/${emiId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },
};

// Savings API
export const savingsApi = {
  add: async (accessToken: string, goal: any) => {
    return apiCall('/savings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(goal),
    });
  },

  getAll: async (accessToken: string, filters?: { fileId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.fileId) params.append('fileId', filters.fileId);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/savings?${queryString}` : '/savings';
    
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },

  update: async (accessToken: string, goalId: string, updates: any) => {
    return apiCall(`/savings/${goalId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updates),
    });
  },

  delete: async (accessToken: string, goalId: string) => {
    return apiCall(`/savings/${goalId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },
};

// Export API
export const exportApi = {
  getData: async (accessToken: string) => {
    return apiCall('/export', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },
};

// File API
export const fileApi = {
  add: async (accessToken: string, file: { fileName: string; transactionCount: number }) => {
    return apiCall('/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(file),
    });
  },

  getAll: async (accessToken: string) => {
    return apiCall('/files', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  },

  setActive: async (accessToken: string, fileId: string) => {
    return apiCall('/files/active', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ fileId }),
    });
  },
};
