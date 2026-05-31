/**
 * API Client for iProcess Agentic Builder
 * Connects frontend to FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ==================== AGENTS ====================

  async createAgent(data) {
    return this.request('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listAgents() {
    return this.request('/api/agents');
  }

  async getAgent(id) {
    return this.request(`/api/agents/${id}`);
  }

  async updateAgent(id, data) {
    return this.request(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAgent(id) {
    return this.request(`/api/agents/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== CHAT ====================

  async chat(agentId, messages, providersConfig = {}) {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: agentId,
        messages: messages,
        providers: providersConfig,
      }),
    });
  }

  async *chatStream(agentId, messages) {
    const url = `${this.baseURL}/api/chat/stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        messages: messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              yield parsed.content;
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  }

  // ==================== EXECUTIONS ====================

  async listExecutions(agentId = null) {
    const params = agentId ? `?agent_id=${agentId}` : '';
    return this.request(`/api/executions${params}`);
  }

  async getExecution(id) {
    return this.request(`/api/executions/${id}`);
  }

  // ==================== TOOLS ====================

  async createTool(data) {
    return this.request('/api/tools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listTools() {
    return this.request('/api/tools');
  }

  async getTool(id) {
    return this.request(`/api/tools/${id}`);
  }

  async updateTool(id, data) {
    return this.request(`/api/tools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTool(id) {
    return this.request(`/api/tools/${id}`, {
      method: 'DELETE',
    });
  }

  async testTool(id, parameters = {}) {
    return this.request(`/api/tools/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ parameters }),
    });
  }

  // ==================== HEALTH ====================

  async healthCheck() {
    return this.request('/health');
  }
}

export const apiClient = new APIClient();
export default apiClient;
