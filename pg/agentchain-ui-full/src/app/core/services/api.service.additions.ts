// Add these methods to your existing ApiService class.
runtime = 'http://localhost:8084';

llmProviders() { return this.http.get<any[]>(`${this.gateway}/api/llm/providers`); }
createLlmProvider(body: any) { return this.http.post<any>(`${this.gateway}/api/llm/providers`, body); }
updateLlmProvider(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/llm/providers/${id}`, body); }
deleteLlmProvider(id: string) { return this.http.delete(`${this.gateway}/api/llm/providers/${id}`); }
llmModels() { return this.http.get<any[]>(`${this.gateway}/api/llm/models`); }
createLlmModel(body: any) { return this.http.post<any>(`${this.gateway}/api/llm/models`, body); }
llmAliases() { return this.http.get<any[]>(`${this.gateway}/api/llm/aliases`); }
createLlmAlias(body: any) { return this.http.post<any>(`${this.gateway}/api/llm/aliases`, body); }

memoryConfigs() { return this.http.get<any[]>(`${this.gateway}/api/memory/configs`); }
createMemoryConfig(body: any) { return this.http.post<any>(`${this.gateway}/api/memory/configs`, body); }
updateMemoryConfig(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/memory/configs/${id}`, body); }
deleteMemoryConfig(id: string) { return this.http.delete(`${this.gateway}/api/memory/configs/${id}`); }

ragCollections() { return this.http.get<any[]>(`${this.gateway}/api/rag/collections`); }
createRagCollection(body: any) { return this.http.post<any>(`${this.gateway}/api/rag/collections`, body); }
ingest(collection: string, form: FormData) { return this.http.post<any>(`${this.gateway}/api/rag/collections/${collection}/ingest`, form); }
ragQuery(collection: string, body: any) { return this.http.post<any>(`${this.gateway}/api/rag/collections/${collection}/query`, body); }

tools() { return this.http.get<any[]>(`${this.gateway}/api/tools`); }
createTool(body: any) { return this.http.post<any>(`${this.gateway}/api/tools`, body); }
updateTool(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/tools/${id}`, body); }
deleteTool(id: string) { return this.http.delete(`${this.gateway}/api/tools/${id}`); }
testTool(id: string, input: any) { return this.http.post<any>(`${this.gateway}/api/tools/${id}/test`, input); }
mcpServers() { return this.http.get<any[]>(`${this.gateway}/api/mcp/servers`); }
createMcpServer(body: any) { return this.http.post<any>(`${this.gateway}/api/mcp/servers`, body); }
discoverMcpTools(id: string) { return this.http.post<any>(`${this.gateway}/api/mcp/servers/${id}/discover`, {}); }

chat(agentId: string, message: string, input: any = {}) {
  return this.http.post<any>(`${this.gateway}/api/agents/${agentId}/chat`, { message, input });
}
streamRun(runId: string, onEvent: (event: any) => void, onError?: (error: any) => void) {
  const es = new EventSource(`${this.runtime}/api/runs/${runId}/stream`);
  es.onmessage = e => {
    const data = JSON.parse(e.data);
    onEvent(data);
    if (['done', 'error', 'aborted'].includes(data.status)) es.close();
  };
  es.onerror = err => { es.close(); if (onError) onError(err); };
  return es;
}
