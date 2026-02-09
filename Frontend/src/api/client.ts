const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe(): Promise<{ id: string; email: string; name: string }> {
    return this.request('/auth/me');
  }

  // Candidates
  async getCandidates(): Promise<unknown[]> {
    return this.request('/candidates');
  }

  async getCandidate(id: string): Promise<unknown> {
    return this.request(`/candidates/${id}`);
  }

  async assignPosition(candidateId: string, positionId: string): Promise<unknown> {
    return this.request(`/candidates/${candidateId}/positions/${positionId}`, {
      method: 'POST',
    });
  }

  async unassignPosition(candidateId: string, positionId: string): Promise<unknown> {
    return this.request(`/candidates/${candidateId}/positions/${positionId}`, {
      method: 'DELETE',
    });
  }

  async getCandidateFiles(candidateId: string): Promise<unknown[]> {
    return this.request(`/candidates/${candidateId}/files`);
  }

  // Positions
  async getPositions(): Promise<unknown[]> {
    return this.request('/positions');
  }

  async getPosition(id: string): Promise<unknown> {
    return this.request(`/positions/${id}`);
  }

  async updatePosition(id: string, data: object): Promise<unknown> {
    return this.request(`/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Files
  getFileDownloadUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}`;
  }
}

export const api = new ApiClient();
