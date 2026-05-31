export type NodeType = 'START' | 'END' | 'LLM' | 'TOOLS' | 'TOOL_EXECUTOR' | 'CONDITION' | 'MEMORY' | 'MEMORY_READ' | 'MEMORY_WRITE' | 'HUMAN_INTERACTION' | 'RAG_QUERY' | 'PROMPT_TEMPLATE' | 'AGENT_CALL' | 'AGENT_ROUTER' | 'WEBHOOK_TRIGGER' | 'WAIT' | 'TRANSFORM' | 'RETRY_CATCH';
export interface Point { x: number; y: number; }
export interface CanvasNode { id: string; type: NodeType; label: string; position: Point; config: any; }
export type EdgeType = 'FLOW' | 'RESOURCE';
export interface CanvasEdge { id: string; source: string; target: string; label?: string; type?: EdgeType; execution?: boolean; }
export interface AgentGraphSpec { agent_id?: string; spec_version: string; name: string; nodes: CanvasNode[]; edges: CanvasEdge[]; viewport?: { x: number; y: number; zoom: number }; agent_config: { max_steps: number; execution_timeout_s: number; recursion_limit: number }; memory_config: { tier: 'session' | 'longterm' | 'both'; session_ttl_s: number; longterm_top_k: number; similarity_threshold: number }; }
export interface Agent { id: string; name: string; graphJson: any; createdAt?: string; updatedAt?: string; }
export interface RunEvent { status: string; run_id: string; node_id?: string; update?: any; error?: string; reason?: string; }
