import {
  AlertTriangle,
  Bot,
  Brain,
  CheckSquare,
  Database,
  FileText,
  GitPullRequest,
  KeyRound,
  MemoryStick,
  MessageSquare,
  Shield,
  TestTube2,
  Timeline,
  Wrench,
} from 'lucide-react';

export const FEATURE_NAV_GROUPS = [
  {
    title: 'Build',
    items: [
      { id: 'studio', icon: Bot, label: 'Agent Studio', help: 'Create and improve agents' },
      { id: 'templates', icon: FileText, label: 'Templates', help: 'Ready-made starters' },
      { id: 'agent-library', icon: GitPullRequest, label: 'Agent Library', help: 'Drafts and versions' },
      { id: 'try-agent', icon: MessageSquare, label: 'Try Agent', help: 'Run a conversation' },
    ],
  },
  {
    title: 'Configure',
    items: [
      { id: 'tools', icon: Wrench, label: 'Tools', help: 'APIs, MCP, Postman imports' },
      { id: 'models', icon: Brain, label: 'Models', help: 'Providers, aliases, router' },
      { id: 'connections', icon: KeyRound, label: 'Connections', help: 'Secrets and auth profiles' },
      { id: 'prompts', icon: FileText, label: 'Prompts', help: 'Reusable instructions' },
      { id: 'knowledge', icon: Database, label: 'Knowledge', help: 'Documents and search' },
      { id: 'memory', icon: MemoryStick, label: 'Memory', help: 'Conversation recall' },
    ],
  },
  {
    title: 'Operate',
    items: [
      { id: 'traces', icon: Timeline, label: 'Traces', help: 'Runs, steps, replay' },
      { id: 'tests', icon: TestTube2, label: 'Tests', help: 'Scenario regression' },
      { id: 'approvals', icon: CheckSquare, label: 'Approvals', help: 'Publish review queue' },
      { id: 'alerts', icon: AlertTriangle, label: 'Alerts', help: 'Failures and budgets' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { id: 'admin', icon: Shield, label: 'Users & Access', help: 'Roles and tenant setup' },
    ],
  },
];

export const FEATURE_MODULES = {
  studio: {
    title: 'Agent Studio',
    description: 'Open existing agents, create blank canvases, and continue editing saved workflow drafts.',
    primaryAction: 'Create New Agent',
    tabs: ['Recent Agents', 'Starter Canvas'],
    steps: [
      ['Choose agent', 'Open an existing draft or start from a clean graph.'],
      ['Edit canvas', 'Configure nodes, routing, memory, tools, and knowledge.'],
      ['Run preview', 'Validate the path before publishing.'],
    ],
    rows: [
      { name: 'Customer Support Bot', status: 'Draft', owner: 'CX Team', updated: 'Today' },
      { name: 'HR Policy Assistant', status: 'Staging', owner: 'People Ops', updated: 'Yesterday' },
      { name: 'Sales Qualification Agent', status: 'Published', owner: 'Revenue Ops', updated: '2 days ago' },
    ],
  },
  templates: {
    title: 'Templates',
    description: 'Ready-made agent starters with persona, tools, memory, knowledge, and guardrails.',
    primaryAction: 'New Template',
    tabs: ['Library', 'Versioning'],
    steps: [
      ['Pick a use case', 'Support, HR, sales, finance, or custom workflows.'],
      ['Review defaults', 'Check nodes, policies, prompts, and data sources.'],
      ['Promote safely', 'Version template changes before production rollout.'],
    ],
    rows: [
      { name: 'Support Bot', status: 'Approved', owner: 'Product', updated: 'v3' },
      { name: 'HR Bot', status: 'Review', owner: 'Compliance', updated: 'v2' },
      { name: 'Sales Bot', status: 'Draft', owner: 'Sales Ops', updated: 'v1' },
    ],
  },
  'agent-library': {
    title: 'Agent Library',
    description: 'Manage draft agents, versions, packages, rollout state, and deployable artifacts.',
    primaryAction: 'Package Agent',
    tabs: ['Drafts', 'Versions', 'Packages'],
    steps: [
      ['Save draft', 'Persist workflow JSON and node metadata.'],
      ['Compare versions', 'Review graph changes before restore.'],
      ['Package release', 'Prepare a deployable versioned artifact.'],
    ],
    rows: [
      { name: 'Support Bot v1.4', status: 'Canary', owner: 'CX Team', updated: '12 runs' },
      { name: 'HR Bot v0.9', status: 'Draft', owner: 'People Ops', updated: '5 runs' },
      { name: 'Sales Bot v1.1', status: 'Production', owner: 'Revenue Ops', updated: '88 runs' },
    ],
  },
  'try-agent': {
    title: 'Try Agent',
    description: 'Run a conversation against the selected workflow and inspect response behavior.',
    primaryAction: 'Run Chat',
    tabs: ['Chat', 'Inputs', 'Transcript'],
    steps: [
      ['Enter message', 'Use realistic customer or operator scenarios.'],
      ['Watch route', 'See selected nodes, tools, and knowledge calls.'],
      ['Save transcript', 'Use outputs for regression tests.'],
    ],
    rows: [
      { name: 'Return eligibility test', status: 'Passed', owner: 'N05 -> N03 -> N04', updated: '1.2s' },
      { name: 'PII masking scenario', status: 'Passed', owner: 'N09 Guardrail', updated: '0.4s' },
      { name: 'Missing order id', status: 'Needs input', owner: 'Human handoff', updated: '0.8s' },
    ],
  },
  tools: {
    title: 'Tools',
    description: 'Connect APIs and MCP tools agents can use. Import, review, test, then attach to workflows.',
    primaryAction: 'Import Tool',
    tabs: ['HTTP', 'OpenAPI', 'Postman', 'MCP', 'Registry', 'Test'],
    steps: [
      ['Import or create', 'Start from OpenAPI, Postman, MCP, or a captured request.'],
      ['Set auth once', 'Save auth at creation time so agents do not repeat it.'],
      ['Test before use', 'Run each tool with sample input before adding it to an agent.'],
    ],
    rows: [
      { name: 'CRM lookup', status: 'Enabled', owner: 'HTTP', updated: '180ms' },
      { name: 'Ticket creation', status: 'Enabled', owner: 'OpenAPI', updated: '260ms' },
      { name: 'Calendar booking', status: 'Review', owner: 'MCP', updated: '410ms' },
    ],
  },
  models: {
    title: 'LLM Configurations',
    description: 'Connect providers, register models, and expose stable aliases for agents and routing.',
    primaryAction: 'Add Provider',
    tabs: ['Providers', 'Models', 'Aliases / Router'],
    steps: [
      ['Providers', 'OpenAI, Anthropic, Gemini, Azure, Bedrock, self-hosted gateways.'],
      ['Models', 'Model names, availability, vision support, and token pricing.'],
      ['Aliases and routing', 'Friendly names with ordered fallback model routes.'],
    ],
    rows: [
      { name: 'OpenAI production', status: 'Enabled', owner: 'gpt-4o, gpt-4o-mini', updated: 'Configured' },
      { name: 'Anthropic fallback', status: 'Enabled', owner: 'claude-sonnet', updated: 'Configured' },
      { name: 'fast alias', status: 'Enabled', owner: 'openai:gpt-4o-mini', updated: '$0.003/run' },
    ],
  },
  connections: {
    title: 'Connections',
    description: 'Manage secret references, auth profiles, vault-backed credentials, and allowed origins.',
    primaryAction: 'New Connection',
    tabs: ['Secrets', 'Auth Profiles', 'Origins'],
    steps: [
      ['Create profile', 'Define bearer, API key, OAuth, or custom headers.'],
      ['Bind secret', 'Reference Vault-managed values instead of exposing raw keys.'],
      ['Audit use', 'Track which tools and agents consume credentials.'],
    ],
    rows: [
      { name: 'CRM OAuth', status: 'Configured', owner: 'Vault', updated: '3 tools' },
      { name: 'Support API key', status: 'Configured', owner: 'Header', updated: '2 tools' },
      { name: 'Sandbox token', status: 'Expiring', owner: 'Bearer', updated: '7 days' },
    ],
  },
  prompts: {
    title: 'Prompts',
    description: 'Reusable prompt templates with variables, approval status, and rollout control.',
    primaryAction: 'New Prompt',
    tabs: ['Templates', 'Variables', 'A/B Tests'],
    steps: [
      ['Draft instruction', 'Write reusable system and user prompt blocks.'],
      ['Inject variables', 'Bind memory, RAG, tool, and user context safely.'],
      ['Approve version', 'Promote prompts through review before production.'],
    ],
    rows: [
      { name: 'support-assistant-v1', status: 'Approved', owner: 'CX Team', updated: '14% lift' },
      { name: 'hr-policy-v1', status: 'Review', owner: 'People Ops', updated: 'Draft' },
      { name: 'sales-qualification-v1', status: 'Draft', owner: 'Revenue Ops', updated: 'A/B pending' },
    ],
  },
  knowledge: {
    title: 'Knowledge',
    description: 'Manage RAG collections, document ingestion, chunking, search, reranking, and citations.',
    primaryAction: 'Ingest Documents',
    tabs: ['Collections', 'Ingestion', 'Query Test'],
    steps: [
      ['Upload sources', 'PDF, DOCX, CSV, web, database, or API sources.'],
      ['Index vectors', 'Chunk, embed, and store in the selected vector database.'],
      ['Test retrieval', 'Validate hybrid search and citation quality.'],
    ],
    rows: [
      { name: 'support-faq', status: 'Indexed', owner: 'pgvector', updated: '84% hit rate' },
      { name: 'hr-handbook', status: 'Indexing', owner: 'Qdrant', updated: '62 docs' },
      { name: 'product-manuals', status: 'Indexed', owner: 'Pinecone', updated: '312 chunks' },
    ],
  },
  memory: {
    title: 'Memory',
    description: 'Configure session history, long-term recall, namespaces, TTL, and GDPR deletion.',
    primaryAction: 'New Memory Config',
    tabs: ['Configs', 'Namespaces', 'Recall Test'],
    steps: [
      ['Choose backend', 'Redis, MongoDB, PostgreSQL, or vector memory.'],
      ['Set recall policy', 'Top K, similarity threshold, TTL, and profile fields.'],
      ['Control retention', 'Enable selective deletion and export workflows.'],
    ],
    rows: [
      { name: 'default-support-memory', status: 'Enabled', owner: 'Redis + MongoDB', updated: '45m TTL' },
      { name: 'sales-profile-memory', status: 'Enabled', owner: 'Vector Store', updated: 'top 5' },
      { name: 'sandbox-memory', status: 'Disabled', owner: 'PostgreSQL', updated: 'No retention' },
    ],
  },
  traces: {
    title: 'Traces',
    description: 'Search runs, replay execution, and inspect node-level debug events.',
    primaryAction: 'Send Sample Trace',
    tabs: ['Trace Explorer', 'Replay', 'Health'],
    steps: [
      ['Find a run', 'Filter by agent, status, dates, tokens, cost, or node kind.'],
      ['Replay and compare', 'Open a trace to inspect execution steps and behavior.'],
      ['Inspect execution', 'Review node states, tool payloads, human tasks, and checkpoints.'],
    ],
    rows: [
      { name: 'run_support_128', status: 'Done', owner: 'N01 -> N09 -> N05 -> N02', updated: '1.4s' },
      { name: 'run_hr_044', status: 'Needs human', owner: 'N09 escalation', updated: 'Paused' },
      { name: 'run_sales_271', status: 'Error', owner: 'N04 tool timeout', updated: 'Retry queued' },
    ],
  },
  tests: {
    title: 'Scenario Regression',
    description: 'Save scenarios from transcripts and run repeatable checks against agent versions.',
    primaryAction: 'New Scenario',
    tabs: ['Scenarios', 'Runs', 'Diffs'],
    steps: [
      ['Capture scenario', 'Store input, expected route, and expected answer traits.'],
      ['Run suite', 'Execute across draft, staging, and production versions.'],
      ['Review diff', 'Compare route, response, tool calls, and guardrail results.'],
    ],
    rows: [
      { name: 'Return policy with order id', status: 'Passed', owner: 'Support Suite', updated: 'v1.4' },
      { name: 'Prompt injection attempt', status: 'Passed', owner: 'Security Suite', updated: 'N09 blocked' },
      { name: 'Missing account number', status: 'Review', owner: 'Support Suite', updated: 'Human handoff' },
    ],
  },
  approvals: {
    title: 'Publish Approvals',
    description: 'Review publish requests, prompt changes, guardrail updates, and production rollouts.',
    primaryAction: 'Approve Selected',
    tabs: ['Queue', 'History', 'Policy'],
    steps: [
      ['Review request', 'Inspect graph, diff, validations, and risk flags.'],
      ['Approve or reject', 'Capture reviewer comments and required follow-ups.'],
      ['Promote safely', 'Deploy canary or staged rollout after approval.'],
    ],
    rows: [
      { name: 'Support Bot v1.5', status: 'Waiting', owner: 'Compliance', updated: '2 blockers' },
      { name: 'Prompt support-assistant-v2', status: 'Approved', owner: 'Prompt Lead', updated: 'Today' },
      { name: 'Tool calendar-booking', status: 'Rejected', owner: 'Security', updated: 'Needs auth fix' },
    ],
  },
  alerts: {
    title: 'Alerts',
    description: 'Monitor failures, budget thresholds, safety violations, latency spikes, and service health.',
    primaryAction: 'New Alert Rule',
    tabs: ['Rules', 'Incidents', 'Budgets'],
    steps: [
      ['Define trigger', 'Failure rate, token cost, latency, safety violation, or health check.'],
      ['Route alert', 'Send to Slack, email, webhook, or incident platform.'],
      ['Track incident', 'Record status, owner, and resolution notes.'],
    ],
    rows: [
      { name: 'N04 timeout rate > 5%', status: 'Active', owner: 'Ops', updated: '2 incidents' },
      { name: 'Monthly budget 80%', status: 'Active', owner: 'Finance', updated: '$412 used' },
      { name: 'Guardrail violations', status: 'Active', owner: 'Security', updated: '7 today' },
    ],
  },
  admin: {
    title: 'Users & Access',
    description: 'Manage RBAC, tenant isolation, workspace membership, and environment permissions.',
    primaryAction: 'Invite User',
    tabs: ['Users', 'Roles', 'Tenants'],
    steps: [
      ['Assign role', 'Admin, developer, viewer, compliance, or custom role.'],
      ['Scope access', 'Limit access by tenant, workspace, agent, and environment.'],
      ['Audit activity', 'Review changes, approvals, deployments, and key usage.'],
    ],
    rows: [
      { name: 'parveer@workspace', status: 'Admin', owner: 'All tenants', updated: 'Active' },
      { name: 'developer@workspace', status: 'Developer', owner: 'Agent Builder', updated: 'Active' },
      { name: 'viewer@workspace', status: 'Viewer', owner: 'Dashboard only', updated: 'Active' },
    ],
  },
};

export const getFeature = (id) => FEATURE_MODULES[id] || FEATURE_MODULES.studio;

export const FEATURE_LIST = FEATURE_NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title, module: getFeature(item.id) }))
);
