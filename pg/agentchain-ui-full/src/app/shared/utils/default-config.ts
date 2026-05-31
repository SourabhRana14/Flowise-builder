import { AgentGraphSpec, CanvasEdge, CanvasNode, NodeType } from '../models/canvas';

export const NODE_TYPES: NodeType[] = ['START','END','LLM','TOOLS','AGENT_CALL','AGENT_ROUTER','WEBHOOK_TRIGGER','WAIT','TRANSFORM','RETRY_CATCH','CONDITION','MEMORY','HUMAN_INTERACTION','RAG_QUERY','PROMPT_TEMPLATE'];

export const NODE_DISPLAY_NAMES: Record<NodeType, string> = {
  START: 'Start',
  END: 'Finish',
  LLM: 'Think & Respond',
  TOOLS: 'Use Tools',
  TOOL_EXECUTOR: 'Use Tool',
  CONDITION: 'Decision',
  MEMORY: 'Remember Context',
  MEMORY_READ: 'Read Memory',
  MEMORY_WRITE: 'Save Memory',
  HUMAN_INTERACTION: 'Ask Human',
  RAG_QUERY: 'Search Knowledge',
  PROMPT_TEMPLATE: 'Apply Instruction',
  AGENT_CALL: 'Ask Another Agent',
  AGENT_ROUTER: 'Route to Agent',
  WEBHOOK_TRIGGER: 'Incoming Request',
  WAIT: 'Wait',
  TRANSFORM: 'Prepare Data',
  RETRY_CATCH: 'Retry on Failure'
};

export const NODE_GROUPS: Array<{ name: string; types: NodeType[] }> = [
  { name: 'Conversation', types: ['START', 'LLM', 'PROMPT_TEMPLATE', 'END'] },
  { name: 'Actions', types: ['TOOLS', 'TOOL_EXECUTOR', 'AGENT_CALL', 'AGENT_ROUTER'] },
  { name: 'Knowledge & Memory', types: ['RAG_QUERY', 'MEMORY', 'MEMORY_READ', 'MEMORY_WRITE'] },
  { name: 'Control Flow', types: ['CONDITION', 'WAIT', 'RETRY_CATCH', 'TRANSFORM'] },
  { name: 'Human Review', types: ['HUMAN_INTERACTION'] },
  { name: 'Triggers', types: ['WEBHOOK_TRIGGER'] }
];

export function nodeDisplayName(type: NodeType): string {
  return NODE_DISPLAY_NAMES[type] || type.replace(/_/g, ' ');
}

export function nodeLabel(type: NodeType): string {
  return `${type}(${nodeDisplayName(type)})`;
}

export function defaultNodeConfig(type: NodeType): any {
  switch (type) {
    case 'START': return { input_schema: '{\n  "message": "string"\n}', initial_message_key: 'message' };
    case 'END': return { output_mapping: '{\n  "answer": "$.messages[-1].content"\n}' };
    case 'LLM': return { model_alias: 'capable', temperature: 0.2, max_tokens: 1024, system_prompt: 'You are a helpful assistant.', user_prompt: '{{input.message}}' };
    case 'TOOLS': return { source: 'MCP', mcp_server_id: '', tool_id: '', tool_ids: [], tool_type: 'MCP', max_tools: 1, min_tool_score: 3, route_keywords: '', llm_planner: false, execute_all: false, timeout_s: 30, retry_count: 1, input_mapping: '{\n  "query": "{{input.message}}",\n  "message": "{{input.message}}"\n}' };
    case 'AGENT_CALL': return { agent_id: '', output_key: 'agent_result', timeout_s: 120, input_mapping: '{\n  "message": "{{input.message}}",\n  "parent_context": "{{state.context}}"\n}' };
    case 'AGENT_ROUTER': return { candidate_agents: [], candidate_agent_routes: '[]', strategy: 'hybrid', max_agents: 1, route_keywords: '', output_key: 'agent_results', input_mapping: '{\n  "message": "{{input.message}}",\n  "parent_context": "{{state.context}}"\n}' };
    case 'TOOL_EXECUTOR': return { tool_id: '', tool_ids: [], tool_type: 'HTTP', max_tools: 1, min_tool_score: 3, route_keywords: '', llm_planner: false, timeout_s: 30, retry_count: 1, input_mapping: '{\n  "query": "{{state.messages[-1].content}}"\n}' };
    case 'CONDITION': return { decision_key: 'prediction.action', expression: 'state.prediction.action', default_route: '' };
    case 'MEMORY': return { mode: 'read_write', namespace: 'default', top_k: 5, similarity_threshold: 0.72, query_mapping: '{{input.message}}', fields_to_store: 'messages,tool_results,output' };
    case 'MEMORY_READ': return { namespace: 'default', top_k: 5, similarity_threshold: 0.72, query_mapping: '{{input.message}}' };
    case 'MEMORY_WRITE': return { namespace: 'default', fields_to_store: 'messages,tool_results' };
    case 'HUMAN_INTERACTION': return { title: 'Approval required', message: 'Please review and approve.', approval_type: 'form', output_key: 'human_response', timeout_s: 300, details_mapping: '{\n  "request": "{{input.message}}",\n  "latest_assessment": "{{state.messages[-1].content}}"\n}', form_schema: '{\n  "decision": {\n    "type": "select",\n    "label": "Decision",\n    "required": true,\n    "options": ["approved", "rejected", "needs_more_info"]\n  },\n  "comments": {\n    "type": "textarea",\n    "label": "Comments",\n    "required": false\n  }\n}' };
    case 'RAG_QUERY': return { collection: 'default', query_mapping: '{{input.message}}', top_k: 5, rerank: false, auto_route: true, route_keywords: '', min_route_score: 2 };
    case 'PROMPT_TEMPLATE': return { template_id: '', variables_json: '{\n  "input": "{{input.message}}"\n}' };
    case 'WEBHOOK_TRIGGER': return { path: '/api/runtime/webhooks/{agentId}', sample_payload: '{\n  "message": "Hello"\n}' };
    case 'WAIT': return { seconds: 5 };
    case 'TRANSFORM': return { output_key: 'transform', mapping: '{\n  "message": "{{input.message}}",\n  "summary": "{{state.output.answer}}"\n}' };
    case 'RETRY_CATCH': return { retry_count: 1, catch_route: 'error' };
    default: return {};
  }
}

export function newGraph(name = 'New Agent') {
  return {
    spec_version: '1.0',
    name,
    nodes: [
      { id: 'start_1', type: 'START' as NodeType, label: nodeLabel('START'), position: { x: 120, y: 240 }, config: defaultNodeConfig('START') },
      { id: 'end_1', type: 'END' as NodeType, label: nodeLabel('END'), position: { x: 850, y: 240 }, config: defaultNodeConfig('END') }
    ],
    edges: [],
    agent_config: { max_steps: 25, execution_timeout_s: 120, recursion_limit: 50 },
    memory_config: { tier: 'both' as const, session_ttl_s: 3600, longterm_top_k: 5, similarity_threshold: .72 }
  };
}

export function starterGraph(name = 'New Agent'): AgentGraphSpec {
  return normalizeGraph({
    spec_version: '1.0',
    name,
    nodes: [
      { id: 'start_1', type: 'START', label: nodeLabel('START'), position: { x: 120, y: 220 }, config: defaultNodeConfig('START') },
      { id: 'llm_1', type: 'LLM', label: nodeLabel('LLM'), position: { x: 420, y: 220 }, config: defaultNodeConfig('LLM') },
      { id: 'end_1', type: 'END', label: nodeLabel('END'), position: { x: 720, y: 220 }, config: defaultNodeConfig('END') }
    ],
    edges: [
      { id: 'edge_start_llm', source: 'start_1', target: 'llm_1' },
      { id: 'edge_llm_end', source: 'llm_1', target: 'end_1' }
    ],
    agent_config: { max_steps: 25, execution_timeout_s: 120, recursion_limit: 50 },
    memory_config: { tier: 'both' as const, session_ttl_s: 3600, longterm_top_k: 5, similarity_threshold: .72 }
  });
}

export function normalizeGraph(raw: any, fallbackName = 'Agent'): AgentGraphSpec {
  const graph = raw && typeof raw === 'object' ? raw : {};
  const rawNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const nodes: CanvasNode[] = rawNodes
    .filter((n: any) => n?.id && n?.type)
    .map((n: any, index: number) => normalizeNode(n, index));
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges: CanvasEdge[] = (Array.isArray(graph.edges) ? graph.edges : [])
    .filter((e: any) => e?.source && e?.target && nodeIds.has(String(e.source)) && nodeIds.has(String(e.target)) && e.source !== e.target)
    .map((e: any, index: number) => ({
      id: String(e.id || `edge_${index}_${e.source}_${e.target}`),
      source: String(e.source),
      target: String(e.target),
      label: e.label || '',
      type: normalizeEdgeType(e)
    }));

  return {
    spec_version: graph.spec_version || '1.0',
    name: graph.name || fallbackName,
    nodes,
    edges,
    agent_config: graph.agent_config || { max_steps: 25, execution_timeout_s: 120, recursion_limit: 50 },
    memory_config: graph.memory_config || { tier: 'both' as const, session_ttl_s: 3600, longterm_top_k: 5, similarity_threshold: .72 }
  };
}

function normalizeEdgeType(e: any): 'FLOW' | 'RESOURCE' {
  const raw = String(e?.type || '').toUpperCase();
  if (raw === 'RESOURCE' || e?.execution === false || e?.label === 'resource' || e?.label === 'available_to_orchestrator') {
    return 'RESOURCE';
  }
  return 'FLOW';
}

function normalizeNode(n: any, index: number): CanvasNode {
  const type = String(n.type).toUpperCase() as NodeType;
  const position = n.position || { x: Number(n.x), y: Number(n.y) };
  return {
    id: String(n.id),
    type,
    label: String(n.label || defaultLabel(type)),
    position: {
      x: Number.isFinite(Number(position?.x)) ? Number(position.x) : 120 + index * 280,
      y: Number.isFinite(Number(position?.y)) ? Number(position.y) : 220
    },
    config: { ...defaultNodeConfig(type), ...(n.config || {}) }
  };
}

function defaultLabel(type: NodeType) {
  return nodeLabel(type);
}
