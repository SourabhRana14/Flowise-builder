import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Agent, AgentGraphSpec } from '../../shared/models/canvas';

export interface RunStreamEvent {
  status: string;
  run_id?: string;
  runId?: string;
  node_id?: string;
  nodeId?: string;
  update?: any;
  output?: any;
  error?: string;
  reason?: string;
  [key: string]: any;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  gateway = 'http://localhost:8083';
  runtime = `${this.gateway}/api/runtime`;
  aiObservability = 'http://localhost:8090';
  runtimeOrchestrator = 'http://localhost:8084';
  toolExecution = 'http://localhost:8085';
  llmInference = 'http://localhost:8086';
  memoryRag = 'http://localhost:8087';
  humanTask = 'http://localhost:8088';

  constructor(private http: HttpClient, private zone: NgZone) {}

  login(email: string, password: string) { return this.http.post<any>(`${this.gateway}/auth/login`, { email, password }); }

  agents(): Observable<Agent[]> { return this.http.get<Agent[]>(`${this.gateway}/api/agents`); }
  agentsPage(page = 0, size = 10) { return this.http.get<PageResponse<Agent>>(`${this.gateway}/api/agents?page=${page}&size=${size}`); }
  createAgent(name: string) { return this.http.post<Agent>(`${this.gateway}/api/agents`, { name, graphJson: {} }); }
  getAgent(id: string) { return this.http.get<Agent>(`${this.gateway}/api/agents/${id}`); }
  saveAgent(id: string, graphJson: AgentGraphSpec) { return this.http.put<Agent>(`${this.gateway}/api/agents/${id}`, { graphJson, name: graphJson.name }); }
  updateAgent(id: string, body: any) { return this.http.put<Agent>(`${this.gateway}/api/agents/${id}`, body); }
  deleteAgent(id: string) { return this.http.delete(`${this.gateway}/api/agents/${id}`); }
  exportAgent(id: string, format: 'json' | 'yaml') { return this.http.get(`${this.gateway}/api/agents/${id}/export?format=${format}`, { responseType: 'text' }); }
  importAgent(body: string, format: 'json' | 'yaml', mode: 'duplicate' | 'overwrite' | 'reject' = 'duplicate', dryRun = false) {
    const contentType = format === 'yaml' ? 'application/x-yaml' : 'application/json';
    return this.http.post<Agent>(`${this.gateway}/api/agents/import-file?format=${format}&mode=${mode}&dryRun=${dryRun}`, body, { headers: new HttpHeaders({ 'Content-Type': contentType }) });
  }
  agentVersions(id: string) { return this.http.get<any[]>(`${this.gateway}/api/agents/${id}/versions`); }
  restoreAgentVersion(id: string, versionId: string) { return this.http.post<Agent>(`${this.gateway}/api/agents/${id}/versions/${versionId}/restore`, {}); }
  publishAgent(id: string, body: any = {}) { return this.http.post<any>(`${this.gateway}/api/agents/${id}/publish`, body); }
  agentPublishApprovals(id: string) { return this.http.get<any[]>(`${this.gateway}/api/agents/${id}/publish-approvals`); }
  reviewPublishApproval(id: string, approvalId: string, body: any) { return this.http.post<any>(`${this.gateway}/api/agents/${id}/publish-approvals/${approvalId}/review`, body); }
  agentReadiness(id: string) { return this.http.get<any>(`${this.gateway}/api/agents/${id}/readiness`); }
  simulateAgent(id: string, body: any) { return this.http.post<any>(`${this.gateway}/api/agents/${id}/simulate`, body); }
  agentVersionDiff(id: string, leftVersionId: string, rightVersionId: string) { return this.http.get<any>(`${this.gateway}/api/agents/${id}/versions/${leftVersionId}/diff/${rightVersionId}`); }
  embedToken(id: string, ttlSeconds = 3600) { return this.http.post<any>(`${this.gateway}/api/agents/${id}/embed-token`, { ttlSeconds }); }
  generateAgentFromCopilot(body: any) { return this.http.post<any>(`${this.gateway}/api/agent-copilot/generate`, body); }
  validateAgentWithCopilot(body: any) { return this.http.post<any>(`${this.gateway}/api/agent-copilot/validate`, body); }
  refineAgentWithCopilot(body: any) { return this.http.post<any>(`${this.gateway}/api/agent-copilot/refine`, body); }
  previewAgentWithCopilot(body: any) { return this.http.post<any>(`${this.gateway}/api/agent-copilot/preview`, body); }

  runAgent(id: string, input: any = {}, graphJson?: AgentGraphSpec) { return this.http.post<any>(`${this.gateway}/api/agents/${id}/run`, { input, input_json: input, graph_json: graphJson }); }
  runtimeRun(agentId: string, input: any = {}, graphJson?: AgentGraphSpec) { return this.http.post<any>(`${this.runtime}/runs`, { agent_id: agentId, input, graph_json: graphJson }); }
  chat(agentId: string, sessionId: string, message: string, graphJson?: AgentGraphSpec, traceId?: string, history: any[] = [], extraInput: any = {}) { return this.http.post<any>(`${this.runtime}/chat`, { agent_id: agentId, session_id: sessionId, message, graph_json: graphJson, input: { ...extraInput, ...(traceId ? { trace_id: traceId } : {}), history } }); }
  conversations() { return this.http.get<any[]>(`${this.gateway}/api/chat/conversations`); }
  createConversation(body: any) { return this.http.post<any>(`${this.gateway}/api/chat/conversations`, body); }
  getConversation(id: string) { return this.http.get<any>(`${this.gateway}/api/chat/conversations/${id}`); }
  updateConversation(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/chat/conversations/${id}`, body); }
  deleteConversation(id: string) { return this.http.delete(`${this.gateway}/api/chat/conversations/${id}`); }
  resumeRun(id: string, payload: any) { return this.http.post<any>(`${this.runtime}/runs/${id}/resume`, payload); }
  cancelRun(id: string, reason = 'cancelled_by_user') { return this.http.post<any>(`${this.gateway}/api/runs/${id}/cancel`, { reason }); }
  runTrace(id: string) { return this.http.get<any>(`${this.gateway}/api/runs/${id}/trace`); }
  runCheckpoints(id: string, limit = 200) { return this.http.get<any>(`${this.gateway}/api/runs/${id}/checkpoints?limit=${limit}`); }
  runState(id: string) { return this.http.get<any>(`${this.gateway}/api/runs/${id}/state`); }
  humanTasks() { return this.http.get<any>(`${this.runtime}/human/tasks`); }
  streamUrl(runId: string) { return `${this.runtime}/runs/${runId}/stream`; }

  streamRun(runId: string, onEvent: (event: RunStreamEvent) => void, onError?: (error: any) => void): EventSource {
    const es = new EventSource(this.streamUrl(runId));
    es.onmessage = (message: MessageEvent) => this.zone.run(() => {
      try {
        const event = JSON.parse(message.data);
        onEvent(event);
        if (['done', 'error', 'aborted'].includes(event.status)) es.close();
      } catch (err) {
        console.error('Failed to parse SSE event', err, message.data);
      }
    });
    es.onerror = (err) => this.zone.run(() => {
      console.error('SSE connection error', err);
      es.close();
      if (onError) onError(err);
    });
    return es;
  }

  llmProviders() { return this.http.get<any[]>(`${this.gateway}/api/llm/providers`); }
  saveLlmProvider(body: any) { return this.http.post<any>(`${this.gateway}/api/llm/providers`, body); }
  updateLlmProvider(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/llm/providers/${id}`, body); }
  deleteLlmProvider(id: string) { return this.http.delete(`${this.gateway}/api/llm/providers/${id}`); }
  llmModels() { return this.http.get<any[]>(`${this.gateway}/api/llm/models`); }
  saveLlmModel(body: any) { return this.http.post<any>(`${this.gateway}/api/llm/models`, body); }
  updateLlmModel(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/llm/models/${id}`, body); }
  deleteLlmModel(id: string) { return this.http.delete(`${this.gateway}/api/llm/models/${id}`); }
  llmAliases() { return this.http.get<any[]>(`${this.gateway}/api/llm/aliases`); }
  llmAliasesPage(page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/llm/aliases?page=${page}&size=${size}`); }
  saveLlmAlias(body: any) { return this.http.post<any>(`${this.gateway}/api/llm/aliases`, body); }
  updateLlmAlias(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/llm/aliases/${id}`, body); }
  deleteLlmAlias(id: string) { return this.http.delete(`${this.gateway}/api/llm/aliases/${id}`); }

  tools() { return this.http.get<any[]>(`${this.gateway}/api/tools`); }
  toolsPage(page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/tools?page=${page}&size=${size}`); }
  createTool(body: any) { return this.http.post<any>(`${this.gateway}/api/tools`, body); }
  updateTool(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/tools/${id}`, body); }
  deleteTool(id: string) { return this.http.delete(`${this.gateway}/api/tools/${id}`); }
  deleteTools(ids: string[]) { return this.http.delete<any>(`${this.gateway}/api/tools/bulk`, { body: { ids } }); }
  testTool(id: string, input: any) { return this.http.post<any>(`${this.gateway}/api/tools/${id}/test`, input); }
  toolTestRuns(id: string) { return this.http.get<any[]>(`${this.gateway}/api/tools/${id}/test-runs`); }
  validateTool(id: string) { return this.http.post<any>(`${this.gateway}/api/tools/${id}/validate`, {}); }
  toolQuality(id: string) { return this.http.get<any>(`${this.gateway}/api/tools/${id}/quality`); }
  publishTool(id: string) { return this.http.post<any>(`${this.gateway}/api/tools/${id}/publish`, {}); }
  environments() { return this.http.get<any[]>(`${this.gateway}/api/environments`); }
  saveEnvironment(body: any) { return body.id ? this.http.put<any>(`${this.gateway}/api/environments/${body.id}`, body) : this.http.post<any>(`${this.gateway}/api/environments`, body); }
  deleteEnvironment(id: string) { return this.http.delete(`${this.gateway}/api/environments/${id}`); }
  evaluationDatasets(agentId?: string) { return this.http.get<any[]>(`${this.gateway}/api/evaluation-datasets${agentId ? `?agentId=${agentId}` : ''}`); }
  saveEvaluationDataset(body: any) { return body.id ? this.http.put<any>(`${this.gateway}/api/evaluation-datasets/${body.id}`, body) : this.http.post<any>(`${this.gateway}/api/evaluation-datasets`, body); }
  deleteEvaluationDataset(id: string) { return this.http.delete(`${this.gateway}/api/evaluation-datasets/${id}`); }
  previewEvaluationDataset(id: string) { return this.http.post<any>(`${this.gateway}/api/evaluation-datasets/${id}/preview`, {}); }
  runEvaluationDataset(id: string, body: any = {}) { return this.http.post<any>(`${this.gateway}/api/evaluation-datasets/${id}/run`, body); }
  evaluationRunHistory(id: string) { return this.http.get<any[]>(`${this.gateway}/api/evaluation-datasets/${id}/runs`); }
  completeEvaluationRun(datasetId: string, runId: string) { return this.http.post<any>(`${this.gateway}/api/evaluation-datasets/${datasetId}/runs/${runId}/complete`, {}); }
  retryEvaluationRun(datasetId: string, runId: string) { return this.http.post<any>(`${this.gateway}/api/evaluation-datasets/${datasetId}/runs/${runId}/retry-failed`, {}); }
  cancelEvaluationRun(datasetId: string, runId: string, reason = 'Cancelled from UI') { return this.http.post<any>(`${this.gateway}/api/evaluation-datasets/${datasetId}/runs/${runId}/cancel`, { reason }); }
  completePendingEvaluationRuns() { return this.http.post<any>(`${this.gateway}/api/evaluation-datasets/complete-pending`, {}); }
  publishApprovalInbox(status = 'PENDING') { return this.http.get<any[]>(`${this.gateway}/api/publish-approvals?status=${status}`); }
  reviewApprovalInbox(id: string, body: any) { return this.http.post<any>(`${this.gateway}/api/publish-approvals/${id}/review`, body); }
  exportAgentPackage(agentId: string) { return this.http.get<any>(`${this.gateway}/api/agent-packages/${agentId}/export`); }
  previewAgentPackage(body: any, mode = 'duplicate') { return this.http.post<any>(`${this.gateway}/api/agent-packages/preview?mode=${mode}`, body); }
  importAgentPackage(body: any, mode = 'duplicate') { return this.http.post<any>(`${this.gateway}/api/agent-packages/import?mode=${mode}`, body); }
  importOpenApiTools(body: any) { return this.http.post<any>(`${this.gateway}/api/tools/import-openapi`, body); }
  previewOpenApiTools(body: any) { return this.http.post<any>(`${this.gateway}/api/tools/openapi/operations`, body); }
  importPostmanTools(body: any) { return this.http.post<any>(`${this.gateway}/api/tools/import-postman`, body); }
  previewPostmanTools(body: any) { return this.http.post<any>(`${this.gateway}/api/tools/postman/requests`, body); }
  mcpServers() { return this.http.get<any[]>(`${this.gateway}/api/mcp/servers`); }
  saveMcpServer(body: any) { return this.http.post<any>(`${this.gateway}/api/mcp/servers`, body); }
  updateMcpServer(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/mcp/servers/${id}`, body); }
  deleteMcpServer(id: string) { return this.http.delete(`${this.gateway}/api/mcp/servers/${id}`); }
  discoverMcpTools(id: string, body: any = {}) {
    return this.http.post<any>(`${this.gateway}/api/mcp/servers/${id}/discover`, body, {
      headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' })
    });
  }
  previewMcpTools(id: string) { return this.http.post<any>(`${this.gateway}/api/mcp/servers/${id}/discover-preview`, {}, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  mcpTools(id: string) { return this.http.get<any[]>(`${this.gateway}/api/mcp/servers/${id}/tools`); }

  prompts() { return this.http.get<any[]>(`${this.gateway}/api/prompts`); }
  promptsPage(page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/prompts?page=${page}&size=${size}`); }
  savePrompt(body: any) { return this.http.post<any>(`${this.gateway}/api/prompts`, body); }
  updatePrompt(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/prompts/${id}`, body); }
  deletePrompt(id: string) { return this.http.delete(`${this.gateway}/api/prompts/${id}`); }
  promptVersions(id: string) { return this.http.get<any[]>(`${this.gateway}/api/prompts/${id}/versions`); }
  promptVersionsPage(id: string, page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/prompts/${id}/versions?page=${page}&size=${size}`); }
  savePromptVersion(id: string, body: any) { return this.http.post<any>(`${this.gateway}/api/prompts/${id}/versions`, body); }
  renderPrompt(id: string, vars: any) { return this.http.post<any>(`${this.gateway}/api/prompts/${id}/render`, vars); }
  previewPrompt(id: string, vars: any) { return this.http.post<any>(`${this.gateway}/api/prompts/${id}/preview`, vars); }

  ragCollections() { return this.http.get<any[]>(`${this.gateway}/api/rag/collections`); }
  ragCollectionsPage(page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/rag/collections?page=${page}&size=${size}`); }
  saveRagCollection(body: any) { return this.http.post<any>(`${this.gateway}/api/rag/collections`, body); }
  updateRagCollection(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/rag/collections/${id}`, body); }
  deleteRagCollection(id: string) { return this.http.delete(`${this.gateway}/api/rag/collections/${id}`); }
  ingest(col: string, form: FormData) { return this.http.post<any>(`${this.gateway}/api/rag/collections/${col}/ingest`, form); }
  ingestSource(col: string, body: any = {}) { return this.http.post<any>(`${this.gateway}/api/rag/collections/${col}/ingest-source`, body); }
  ragJobs(id: string) { return this.http.get<any>(`${this.gateway}/api/rag/jobs/${id}`); }
  ragJobList(collection?: string) { return this.http.get<any[]>(`${this.gateway}/api/rag/jobs${collection ? '?collection=' + encodeURIComponent(collection) : ''}`); }
  cancelRagJob(id: string) { return this.http.post<any>(`${this.gateway}/api/rag/jobs/${id}/cancel`, {}); }
  retryRagJob(id: string) { return this.http.post<any>(`${this.gateway}/api/rag/jobs/${id}/retry`, {}); }
  ragDocuments(col: string) { return this.http.get<any>(`${this.gateway}/api/rag/collections/${col}/documents`); }
  ragDocumentsPage(col: string, page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/rag/collections/${col}/documents?page=${page}&size=${size}`); }
  deleteRagDocument(col: string, docId: string) { return this.http.delete<any>(`${this.gateway}/api/rag/collections/${col}/documents/${docId}`); }
  ragQuery(col: string, body: any) { return this.http.post<any>(`${this.gateway}/api/rag/collections/${col}/query`, body); }

  credentials() { return this.http.get<any[]>(`${this.gateway}/api/credentials`); }
  credentialsPage(page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/credentials?page=${page}&size=${size}`); }
  saveCredential(body: any) { return this.http.post<any>(`${this.gateway}/api/credentials`, body); }
  updateCredential(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/credentials/${id}`, body); }
  deleteCredential(id: string) { return this.http.delete(`${this.gateway}/api/credentials/${id}`); }
  testCredential(id: string) { return this.http.post<any>(`${this.gateway}/api/credentials/${id}/test`, {}); }

  memoryConfigs() { return this.http.get<any[]>(`${this.gateway}/api/memory/configs`); }
  memoryConfigsPage(page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/memory/configs?page=${page}&size=${size}`); }
  saveMemoryConfig(body: any) { return this.http.post<any>(`${this.gateway}/api/memory/configs`, body); }
  updateMemoryConfig(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/memory/configs/${id}`, body); }
  deleteMemoryConfig(id: string) { return this.http.delete<any>(`${this.gateway}/api/memory/configs/${id}`); }
  memorySearch(body: any) { return this.http.post<any>(`${this.gateway}/api/memory/search`, body); }

  obsSummary(agentId: string) { return this.http.get<any>(`${this.gateway}/api/observability/agents/${agentId}/summary?hours=24`); }
  runs(agentId: string) { return this.http.get<any[]>(`${this.gateway}/api/observability/agents/${agentId}/runs`); }
  runsPage(agentId: string, page = 0, size = 10, status = 'all', from = '', to = '') {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status && status !== 'all') params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.http.get<PageResponse<any>>(`${this.gateway}/api/observability/agents/${agentId}/runs?${params.toString()}`);
  }
  runDetail(runId: string) { return this.http.get<any>(`${this.gateway}/api/observability/runs/${runId}`); }
  runTree(runId: string) { return this.http.get<any>(`${this.gateway}/api/observability/runs/${runId}/tree`); }
  recordRunEvent(body: any) { return this.http.post<any>(`${this.gateway}/api/observability/runs/events`, body); }
  alerts() { return this.http.get<any[]>(`${this.gateway}/api/observability/alerts`); }
  alertsPage(page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/observability/alerts?page=${page}&size=${size}`); }
  createAlert(body: any) { return this.http.post<any>(`${this.gateway}/api/observability/alerts`, body); }
  updateAlert(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/observability/alerts/${id}`, body); }
  deleteAlert(id: string) { return this.http.delete(`${this.gateway}/api/observability/alerts/${id}`); }
  ackAlert(id: string) { return this.http.post<any>(`${this.gateway}/api/observability/alerts/${id}/acknowledge`, {}); }
  aiObsHealth() { return this.http.get<any>(`${this.aiObservability}/health`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  aiObsDashboard() { return this.http.get<any>(`${this.aiObservability}/api/v1/dashboards/overview`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  aiObsCosts(agentId = '') {
    const query = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';
    return this.http.get<any>(`${this.aiObservability}/api/v1/analytics/costs${query}`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) });
  }
  directHealth(url: string) { return this.http.get<any>(url, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  llmRouterStrategies() { return this.http.get<any>(`${this.gateway}/api/llm/router/strategies`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  previewLlmRouter(body: any) { return this.http.post<any>(`${this.gateway}/api/llm/router/preview`, body, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  aiObsTraces(limit = 25, state = '', filters: any = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (state && state !== 'all') params.set('state', state);
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '' && value !== 'all') params.set(key, String(value));
    });
    return this.http.get<any>(`${this.aiObservability}/api/v1/traces?${params.toString()}`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) });
  }
  aiObsReplay(traceId: string) { return this.http.get<any>(`${this.aiObservability}/api/v1/replay/${traceId}`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  aiObsReplayDiff(leftTraceId: string, rightTraceId: string) { return this.http.get<any>(`${this.aiObservability}/api/v1/replay/${leftTraceId}/diff/${rightTraceId}`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  aiObsEvaluations(traceId = '') {
    const query = traceId ? `?trace_id=${encodeURIComponent(traceId)}` : '';
    return this.http.get<any>(`${this.aiObservability}/api/v1/evaluations${query}`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) });
  }
  aiObsPrompts() { return this.http.get<any>(`${this.aiObservability}/api/v1/prompts`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  aiObsAlerts() { return this.http.get<any>(`${this.aiObservability}/api/v1/alerts`, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  aiObsRuntimeEvent(body: any) { return this.http.post<any>(`${this.aiObservability}/api/v1/traces/events/runtime`, body, { headers: new HttpHeaders({ 'X-Suppress-Error-Snackbar': 'true' }) }); }
  aiObsLiveSseUrl(traceId: string) { return `${this.aiObservability}/api/v1/live/${encodeURIComponent(traceId)}/sse`; }
  users() { return this.http.get<any[]>(`${this.gateway}/api/users`); }
  usersPage(page = 0, size = 10) { return this.http.get<PageResponse<any>>(`${this.gateway}/api/users?page=${page}&size=${size}`); }
  createUser(body: any) { return this.http.post<any>(`${this.gateway}/api/users`, body); }
  updateUser(id: string, body: any) { return this.http.put<any>(`${this.gateway}/api/users/${id}`, body); }
  deleteUser(id: string) { return this.http.delete(`${this.gateway}/api/users/${id}`); }
}
