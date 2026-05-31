import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { CanvasEdge, CanvasNode, NodeType, Point, RunEvent } from '../../shared/models/canvas';
import { defaultNodeConfig, nodeDisplayName, nodeLabel, normalizeGraph, starterGraph } from '../../shared/utils/default-config';
import { bezierBetween, sourceAnchor } from '../../shared/utils/edge.utils';
import * as A from '../../store/canvas/canvas.actions';
import { CanvasState, toGraph } from '../../store/canvas/canvas.reducer';
import { HitlDialogComponent } from './components/hitl-dialog.component';
import { RunInputDialogComponent } from './components/run-input-dialog.component';

interface ConnectionDraft { sourceNodeId: string; start: Point; current: Point; }

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasWrap') canvasWrap?: ElementRef<HTMLElement>;
  state: CanvasState = {
    nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, selectedNodeId: null, agentId: null, agentName: '',
    isDirty: false, isSaving: false, saveError: null,
    runState: { runId: null, status: 'idle', activeNodeId: null, stepLog: [], errorMsg: null }
  };

  sub?: Subscription;
  draft: ConnectionDraft | null = null;
  panning = false;
  last = { x: 0, y: 0 };
  validationErrors: string[] = [];
  versions: any[] = [];
  toolCatalog: any[] = [];
  agentCatalog: any[] = [];
  paletteCollapsed = false;
  configCollapsed = false;
  logsCollapsed = false;
  copilotCommandHidden = false;
  refinePrompt = '';
  refineBusy = false;
  refineMessage = '';
  preflightBusy = false;
  preflightMessages: Array<{ level: 'error' | 'warning' | 'info'; message: string }> = [];
  previewBusy = false;
  previewMessages: Array<{ label: string; message: string }> = [];
  previewNodeIds = new Set<string>();
  previewMissingNodeIds = new Set<string>();
  private dragStartPositions: Record<string, Point> = {};
  private readonly panelStateKey = 'agentchain.canvas.panelState';
  private wheelListener?: (ev: WheelEvent) => void;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private store: Store<{ canvas: CanvasState }>,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.restorePanelState();
    this.sub = this.store.select('canvas').subscribe(s => {
      this.state = s;
      this.validationErrors = this.validateGraph();
    });
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getAgent(id).subscribe(a => {
      const normalized = a.graphJson?.nodes?.length ? normalizeGraph(a.graphJson, a.name) : starterGraph(a.name);
      const g = normalized;
      this.store.dispatch(A.agentLoaded({ agentId: id, graph: g }));
      this.loadVersions(id);
    });
    this.api.tools().subscribe({ next: tools => this.toolCatalog = tools || [], error: _ => this.toolCatalog = [] });
    this.api.agents().subscribe({ next: agents => this.agentCatalog = agents || [], error: _ => this.agentCatalog = [] });
  }

  ngAfterViewInit() {
    this.wheelListener = (ev: WheelEvent) => this.zoom(ev);
    this.canvasWrap?.nativeElement.addEventListener('wheel', this.wheelListener, { passive: false });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.wheelListener) this.canvasWrap?.nativeElement.removeEventListener('wheel', this.wheelListener);
  }

  get selectedNode() { return this.state.nodes.find(n => n.id === this.state.selectedNodeId) || null; }
  get transform() { const v = this.state.viewport; return `translate(${v.x}px,${v.y}px) scale(${v.zoom})`; }
  get draftPath() { return this.draft ? bezierBetween(this.draft.start, this.draft.current) : ''; }
  get zoomPercent() { return Math.round((this.state.viewport.zoom || 1) * 100); }

  hasInput(n: CanvasNode) { return n.type !== 'START' && n.type !== 'WEBHOOK_TRIGGER'; }
  hasOutput(n: CanvasNode) { return n.type !== 'END'; }

  addNode(type: NodeType) {
    const node: CanvasNode = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      type,
      label: this.defaultLabel(type),
      position: { x: 280 + (this.state.nodes.length % 4) * 30, y: 120 + this.state.nodes.length * 24 },
      config: defaultNodeConfig(type)
    };
    this.store.dispatch(A.nodeAdded({ node }));
  }

  defaultLabel(type: NodeType) {
    return nodeLabel(type);
  }

  displayName(type: NodeType) {
    return nodeDisplayName(type);
  }

  nodeIcon(type: NodeType) {
    const icons: Record<NodeType, string> = {
      START: 'chat_bubble_outline',
      END: 'flag',
      LLM: 'memory',
      TOOLS: 'construction',
      TOOL_EXECUTOR: 'build_circle',
      CONDITION: 'alt_route',
      MEMORY: 'storage',
      MEMORY_READ: 'storage',
      MEMORY_WRITE: 'storage',
      HUMAN_INTERACTION: 'fact_check',
      RAG_QUERY: 'storage',
      PROMPT_TEMPLATE: 'auto_awesome',
      AGENT_CALL: 'smart_toy',
      AGENT_ROUTER: 'hub',
      WEBHOOK_TRIGGER: 'webhook',
      WAIT: 'timer',
      TRANSFORM: 'schema',
      RETRY_CATCH: 'replay'
    };
    return icons[type] || 'widgets';
  }

  nodeTone(type: NodeType) {
    if (['START', 'END', 'HUMAN_INTERACTION', 'WEBHOOK_TRIGGER'].includes(type)) return 'tone-io';
    if (['LLM', 'PROMPT_TEMPLATE', 'AGENT_CALL', 'AGENT_ROUTER'].includes(type)) return 'tone-ai';
    if (['MEMORY', 'MEMORY_READ', 'MEMORY_WRITE', 'RAG_QUERY'].includes(type)) return 'tone-memory';
    if (['TOOLS', 'TOOL_EXECUTOR'].includes(type)) return 'tone-tools';
    return 'tone-flow';
  }

  nodeBadge(n: CanvasNode) {
    if (['LLM', 'PROMPT_TEMPLATE', 'AGENT_CALL', 'AGENT_ROUTER'].includes(n.type)) return 'AI';
    if (['MEMORY', 'MEMORY_READ', 'MEMORY_WRITE', 'RAG_QUERY'].includes(n.type)) return 'Memory';
    if (['TOOLS', 'TOOL_EXECUTOR'].includes(n.type)) return 'Tools & Action';
    if (n.type === 'HUMAN_INTERACTION') return 'Human';
    if (n.type === 'CONDITION') return 'Flow';
    return 'Input & Output';
  }

  selectedInspectorTitle() {
    if (!this.selectedNode) return 'Inspector';
    return this.selectedNode.label || this.defaultLabel(this.selectedNode.type);
  }

  selectedInspectorSubtitle() {
    if (!this.selectedNode) return 'Select a component to configure its behavior.';
    if (['TOOLS', 'TOOL_EXECUTOR'].includes(this.selectedNode.type)) return 'External API calls, scripts, and agent handoffs';
    if (['LLM', 'PROMPT_TEMPLATE', 'AGENT_CALL', 'AGENT_ROUTER'].includes(this.selectedNode.type)) return 'Model, prompt, routing, and agent intelligence';
    if (['MEMORY', 'MEMORY_READ', 'MEMORY_WRITE', 'RAG_QUERY'].includes(this.selectedNode.type)) return 'Knowledge, retrieval, and context memory';
    if (this.selectedNode.type === 'HUMAN_INTERACTION') return 'Approval, review, and human-in-loop workflow';
    return 'Input, output, branching, and workflow control';
  }

  select(id: string | null) { this.store.dispatch(A.nodeSelected({ id })); }

  dragStarted(n: CanvasNode) {
    this.dragStartPositions[n.id] = { ...n.position };
  }

  moved(n: CanvasNode, e: any) {
    const start = this.dragStartPositions[n.id] || n.position;
    const position = { x: start.x + e.distance.x, y: start.y + e.distance.y };
    this.store.dispatch(A.nodeMoved({ id: n.id, position }));
    e.source.reset();
    delete this.dragStartPositions[n.id];
  }

  saveConfig(e: any) { this.store.dispatch(A.nodeConfigUpdated(e)); }
  removeNode(id: string) { this.store.dispatch(A.nodeRemoved({ id })); }
  removeEdge(id: string) { this.store.dispatch(A.edgeRemoved({ id })); }

  togglePalette() { this.paletteCollapsed = !this.paletteCollapsed; this.persistPanelState(); }
  toggleConfig() { this.configCollapsed = !this.configCollapsed; this.persistPanelState(); }
  toggleLogs() { this.logsCollapsed = !this.logsCollapsed; this.persistPanelState(); }
  toggleCopilotCommand() { this.copilotCommandHidden = !this.copilotCommandHidden; this.persistPanelState(); }

  refineWithCopilot() {
    const message = this.refinePrompt.trim();
    if (!message || this.refineBusy || !this.state.agentId) return;
    this.refineBusy = true;
    this.refineMessage = 'Refining graph...';
    this.preflightMessages = [];
    this.api.refineAgentWithCopilot({
      message,
      mode: 'refine',
      agent_name: this.state.agentName,
      graph_json: toGraph(this.state),
      use_llm: true
    }).subscribe({
      next: result => {
        const graph = result?.graphJson || result?.graph_json;
        this.refineBusy = false;
        if (!graph?.nodes?.length) {
          this.refineMessage = 'Copilot did not return a usable graph.';
          return;
        }
        const normalized = normalizeGraph(graph, graph.name || this.state.agentName);
        this.store.dispatch(A.agentLoaded({ agentId: this.state.agentId!, graph: normalized }));
        this.refineMessage = result?.answer || 'Graph refined. Review and save when ready.';
        this.applyPreflightResult(result?.validation);
      },
      error: err => {
        this.refineBusy = false;
        this.refineMessage = err?.error?.message || err?.error?.detail || 'Unable to refine graph. Check that the AI runtime is running.';
      }
    });
  }

  runPreflight(onValid?: () => void) {
    this.validationErrors = this.validateGraph();
    if (this.validationErrors.length) {
      this.preflightMessages = this.validationErrors.map(message => ({ level: 'error', message }));
      return;
    }
    this.preflightBusy = true;
    this.api.validateAgentWithCopilot({ message: 'preflight', graph_json: toGraph(this.state), use_llm: false }).subscribe({
      next: result => {
        this.preflightBusy = false;
        this.applyPreflightResult(result);
        if (result?.valid && onValid) onValid();
      },
      error: err => {
        this.preflightBusy = false;
        this.preflightMessages = [{ level: 'error', message: err?.error?.message || err?.error?.detail || 'Server preflight failed. Check that the AI runtime is running.' }];
      }
    });
  }

  previewRun() {
    const message = this.refinePrompt.trim();
    if (!message || this.previewBusy) return;
    this.previewBusy = true;
    this.previewMessages = [];
    this.previewNodeIds = new Set<string>();
    this.previewMissingNodeIds = new Set<string>();
    const input = { message };
    this.api.previewAgentWithCopilot({ message, graph_json: toGraph(this.state), input, use_llm: false }).subscribe({
      next: result => {
        this.previewBusy = false;
        this.previewNodeIds = new Set((result?.predictedPath || []).map(String));
        this.previewMissingNodeIds = new Set((result?.missingInputs || []).map((m: any) => String(m.node_id || m.nodeId)).filter(Boolean));
        this.previewMessages = this.previewResultMessages(result);
        this.applyPreflightResult(result?.validation);
      },
      error: err => {
        this.previewBusy = false;
        this.previewMessages = [{ label: 'Preview', message: err?.error?.message || err?.error?.detail || 'Preview failed. Check that the AI runtime is running.' }];
      }
    });
  }

  isPreviewNode(id: string) { return this.previewNodeIds.has(String(id)); }
  isPreviewMissingNode(id: string) { return this.previewMissingNodeIds.has(String(id)); }

  private applyPreflightResult(result: any) {
    const messages: Array<{ level: 'error' | 'warning' | 'info'; message: string }> = [];
    for (const err of result?.errors || []) messages.push({ level: 'error', message: err?.message || err?.code || String(err) });
    for (const warn of result?.warnings || []) messages.push({ level: 'warning', message: warn?.message || warn?.code || String(warn) });
    this.preflightMessages = messages.length ? messages : [{ level: 'info', message: 'Preflight passed with no blocking issues.' }];
  }

  private previewResultMessages(result: any): Array<{ label: string; message: string }> {
    const out: Array<{ label: string; message: string }> = [];
    if (result?.summary) out.push({ label: 'Summary', message: result.summary });
    if (result?.predictedPath?.length) out.push({ label: 'Path', message: result.predictedPath.join(' -> ') });
    if (result?.selectedAgents?.length) out.push({ label: 'Agents', message: result.selectedAgents.map((a: any) => a.name || a.id).join(', ') });
    if (result?.selectedTools?.length) out.push({ label: 'Tools', message: result.selectedTools.map((t: any) => t.name || t.id).join(', ') });
    if (result?.humanTasks?.length) out.push({ label: 'Human', message: result.humanTasks.map((h: any) => h.title || h.node_id).join(', ') });
    if (result?.missingInputs?.length) out.push({ label: 'Missing', message: result.missingInputs.map((m: any) => m.message || m.field).join('; ') });
    return out.length ? out : [{ label: 'Preview', message: 'No executable path was predicted.' }];
  }

  startConnection(n: CanvasNode, ev: MouseEvent) {
    ev.preventDefault(); ev.stopPropagation();
    if (!this.hasOutput(n)) return;
    const start = sourceAnchor(n);
    this.draft = { sourceNodeId: n.id, start, current: { ...start } };
  }

  finishConnection(n: CanvasNode, ev: MouseEvent) {
    ev.preventDefault(); ev.stopPropagation();
    if (!this.draft || !this.hasInput(n)) return;
    if (this.draft.sourceNodeId === n.id) { this.draft = null; return; }
    if (this.state.edges.some(e => e.source === this.draft!.sourceNodeId && e.target === n.id)) { this.draft = null; return; }

    const source = this.state.nodes.find(x => x.id === this.draft!.sourceNodeId);
    let label = '';
    if (source?.type === 'CONDITION') {
      label = prompt('Enter CONDITION edge label, for example: true / false / approve / reject', 'true') || '';
      if (!label.trim()) { this.draft = null; return; }
    }
    const edge: CanvasEdge = { id: `edge_${Date.now()}`, source: this.draft.sourceNodeId, target: n.id, label, type: 'FLOW' };
    this.store.dispatch(A.edgeAdded({ edge }));
    this.draft = null;
  }

  @HostListener('document:mousemove', ['$event'])
  pointerMove(ev: MouseEvent) {
    if (!this.draft) return;
    this.draft = { ...this.draft, current: this.toBoardPoint(ev) };
  }

  @HostListener('document:mouseup')
  pointerUp() {
    if (this.draft) this.draft = null;
    this.panning = false;
  }

  toBoardPoint(ev: MouseEvent): Point {
    const host = document.querySelector('.canvas-wrap') as HTMLElement;
    const rect = host.getBoundingClientRect();
    const v = this.state.viewport;
    return { x: (ev.clientX - rect.left - v.x) / v.zoom, y: (ev.clientY - rect.top - v.y) / v.zoom };
  }

  path(e: CanvasEdge) {
    const s = this.state.nodes.find(n => n.id === e.source), t = this.state.nodes.find(n => n.id === e.target);
    return s && t ? this.smartBezier(s, t, this.edgeType(e)) : '';
  }

  mid(e: CanvasEdge) {
    const s = this.state.nodes.find(n => n.id === e.source), t = this.state.nodes.find(n => n.id === e.target);
    if (!s || !t) return { x: 0, y: 0 };
    const points = this.smartAnchors(s, t, this.edgeType(e));
    return { x: (points.start.x + points.end.x) / 2, y: (points.start.y + points.end.y) / 2 - 8 };
  }

  edgeType(e: CanvasEdge) { return (e.type || ((e as any).execution === false ? 'RESOURCE' : 'FLOW')).toUpperCase(); }
  edgeLabel(e: CanvasEdge) { return this.edgeType(e) === 'RESOURCE' ? 'resource' : (e.label || 'flow'); }

  canAttachSelectedResource() {
    const node = this.selectedNode;
    return !!node && this.isResourceNode(node) && this.state.nodes.some(n => n.type === 'LLM');
  }

  attachSelectedToOrchestrator() {
    const source = this.selectedNode;
    if (!source || !this.isResourceNode(source)) return;
    const target = this.state.nodes.find(n => n.type === 'LLM' && n.config?.orchestrate !== false) || this.state.nodes.find(n => n.type === 'LLM');
    if (!target) return;
    const existing = this.state.edges.find(e => e.source === source.id && e.target === target.id && this.edgeType(e) === 'RESOURCE');
    if (existing) return;
    this.store.dispatch(A.edgeAdded({ edge: {
      id: `resource_${source.id}_${target.id}_${Date.now()}`,
      source: source.id,
      target: target.id,
      label: 'resource',
      type: 'RESOURCE',
      execution: false
    }}));
  }

  layoutTopBottom() {
    const nodeMap = new Map(this.state.nodes.map(n => [n.id, n]));
    const flowEdges = this.state.edges.filter(e => this.edgeType(e) === 'FLOW');
    const resourceEdges = this.state.edges.filter(e => this.edgeType(e) === 'RESOURCE');
    const resourceIds = new Set(resourceEdges.map(e => e.source));
    const start = this.state.nodes.find(n => n.type === 'START' || n.type === 'WEBHOOK_TRIGGER') || this.state.nodes[0];
    const ordered: CanvasNode[] = [];
    const visited = new Set<string>();
    let current = start;
    while (current && !visited.has(current.id)) {
      ordered.push(current);
      visited.add(current.id);
      const nextEdge = flowEdges.find(e => e.source === current!.id);
      current = nextEdge ? nodeMap.get(nextEdge.target) : undefined;
    }
    for (const node of this.state.nodes) {
      if (!visited.has(node.id) && !resourceIds.has(node.id)) ordered.push(node);
    }

    const positions = new Map<string, Point>();
    const mainX = 760;
    ordered.forEach((node, index) => positions.set(node.id, { x: mainX, y: 80 + index * 180 }));

    const offsets = [-360, 360, 620, -620, 880, -880];
    for (const target of this.state.nodes.filter(n => n.type === 'LLM')) {
      const attached = resourceEdges.filter(e => e.target === target.id).map(e => nodeMap.get(e.source)).filter(Boolean) as CanvasNode[];
      attached.forEach((node, index) => {
        const base = positions.get(target.id) || target.position;
        positions.set(node.id, { x: base.x + (offsets[index] ?? (360 + index * 260)), y: base.y + (index > 1 ? 110 : 0) });
      });
    }

    let overflowIndex = 0;
    for (const node of this.state.nodes) {
      if (!positions.has(node.id)) {
        positions.set(node.id, { x: 1120, y: 80 + overflowIndex++ * 160 });
      }
    }

    for (const [id, position] of positions) {
      const currentNode = nodeMap.get(id);
      if (!currentNode || (currentNode.position.x === position.x && currentNode.position.y === position.y)) continue;
      this.store.dispatch(A.nodeMoved({ id, position }));
    }
  }

  toolChildNodes() {
    const rows: Array<{ id: string; parentId: string; label: string; type: string; position: Point }> = [];
    for (const parent of this.state.nodes.filter(n => n.type === 'TOOLS' || n.type === 'TOOL_EXECUTOR')) {
      const ids = this.selectedToolIds(parent);
      const offsetY = Math.max(0, (ids.length - 1) * 28);
      ids.forEach((id, index) => {
        const tool = this.toolCatalog.find(t => String(t.id) === String(id));
        rows.push({
          id: `${parent.id}_${id}`,
          parentId: parent.id,
          label: this.toolNodeLabel(tool, id),
          type: String(tool?.type || parent.config?.tool_type || parent.config?.source || 'TOOL').toUpperCase(),
          position: { x: parent.position.x + 260, y: parent.position.y + index * 58 - offsetY }
        });
      });
    }
    return rows;
  }

  toolChildPath(child: { parentId: string; position: Point }) {
    const parent = this.state.nodes.find(n => n.id === child.parentId);
    if (!parent) return '';
    const start = { x: parent.position.x + 220, y: parent.position.y + 43 };
    const end = { x: child.position.x, y: child.position.y + 24 };
    return bezierBetween(start, end);
  }

  agentChildNodes() {
    const rows: Array<{ id: string; parentId: string; label: string; type: string; position: Point }> = [];
    for (const parent of this.state.nodes.filter(n => n.type === 'AGENT_ROUTER' || n.type === 'AGENT_CALL')) {
      const ids = this.selectedAgentIds(parent);
      const offsetY = Math.max(0, (ids.length - 1) * 32);
      ids.forEach((id, index) => {
        const agent = this.agentCatalog.find(a => String(a.id) === String(id));
        rows.push({
          id: `${parent.id}_${id}`,
          parentId: parent.id,
          label: agent?.name || String(id).slice(0, 8),
          type: parent.type === 'AGENT_ROUTER' ? 'CANDIDATE AGENT' : 'TARGET AGENT',
          position: { x: parent.position.x + 260, y: parent.position.y + index * 66 - offsetY }
        });
      });
    }
    return rows;
  }

  agentChildPath(child: { parentId: string; position: Point }) {
    const parent = this.state.nodes.find(n => n.id === child.parentId);
    if (!parent) return '';
    const start = { x: parent.position.x + 220, y: parent.position.y + 43 };
    const end = { x: child.position.x, y: child.position.y + 27 };
    return bezierBetween(start, end);
  }

  private selectedToolIds(node: CanvasNode): string[] {
    const ids = Array.isArray(node.config?.tool_ids) ? node.config.tool_ids : [];
    const legacy = node.config?.tool_id ? [node.config.tool_id] : [];
    return Array.from(new Set([...ids, ...legacy].filter(Boolean).map(String)));
  }

  private selectedAgentIds(node: CanvasNode): string[] {
    if (node.type === 'AGENT_CALL') return [node.config?.agent_id || node.config?.agentId].filter(Boolean).map(String);
    const ids = Array.isArray(node.config?.candidate_agents) ? node.config.candidate_agents : [];
    const camel = Array.isArray(node.config?.candidateAgents) ? node.config.candidateAgents : [];
    return Array.from(new Set([...ids, ...camel].filter(Boolean).map(String)));
  }

  private toolNodeLabel(tool: any, fallbackId: string) {
    return tool?.mcpToolName || tool?.mcp_tool_name || tool?.name || fallbackId.slice(0, 8);
  }

  private smartBezier(source: CanvasNode, target: CanvasNode, edgeType: string) {
    const { start, end } = this.smartAnchors(source, target, edgeType);
    if (edgeType === 'FLOW' && Math.abs(target.position.y - source.position.y) > Math.abs(target.position.x - source.position.x)) {
      const dy = Math.max(80, Math.abs(end.y - start.y) * 0.45);
      return `M ${start.x} ${start.y} C ${start.x} ${start.y + dy}, ${end.x} ${end.y - dy}, ${end.x} ${end.y}`;
    }
    return bezierBetween(start, end);
  }

  private smartAnchors(source: CanvasNode, target: CanvasNode, edgeType: string) {
    if (edgeType === 'FLOW' && Math.abs(target.position.y - source.position.y) > Math.abs(target.position.x - source.position.x)) {
      return {
        start: { x: source.position.x + 110, y: source.position.y + 86 },
        end: { x: target.position.x + 110, y: target.position.y }
      };
    }
    return { start: { x: source.position.x + 220, y: source.position.y + 43 }, end: { x: target.position.x, y: target.position.y + 43 } };
  }

  zoom(ev: WheelEvent) {
    ev.preventDefault();
    if (!ev.ctrlKey && !ev.metaKey) {
      this.panByWheel(ev);
      return;
    }
    const v = this.state.viewport;
    const oldZoom = v.zoom;
    const newZoom = this.clampZoom(v.zoom + (ev.deltaY < 0 ? 0.1 : -0.1));
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const boardX = (mx - v.x) / oldZoom;
    const boardY = (my - v.y) / oldZoom;
    this.store.dispatch(A.viewportUpdated({ viewport: { x: mx - boardX * newZoom, y: my - boardY * newZoom, zoom: newZoom } }));
  }

  private panByWheel(ev: WheelEvent) {
    const v = this.state.viewport;
    const multiplier = ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : 1;
    const dx = ev.shiftKey && Math.abs(ev.deltaX) < Math.abs(ev.deltaY) ? ev.deltaY : ev.deltaX;
    const dy = ev.shiftKey && Math.abs(ev.deltaX) < Math.abs(ev.deltaY) ? 0 : ev.deltaY;
    this.store.dispatch(A.viewportUpdated({
      viewport: {
        ...v,
        x: v.x - dx * multiplier,
        y: v.y - dy * multiplier
      }
    }));
  }

  zoomIn() { this.zoomAtCenter(this.state.viewport.zoom + 0.15); }
  zoomOut() { this.zoomAtCenter(this.state.viewport.zoom - 0.15); }
  resetZoom() { this.store.dispatch(A.viewportUpdated({ viewport: { x: 0, y: 0, zoom: 1 } })); }

  fitToView() {
    if (!this.state.nodes.length) {
      this.resetZoom();
      return;
    }
    const host = document.querySelector('.canvas-wrap') as HTMLElement | null;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const pad = 140;
    const minX = Math.min(...this.state.nodes.map(n => n.position.x));
    const minY = Math.min(...this.state.nodes.map(n => n.position.y));
    const maxX = Math.max(...this.state.nodes.map(n => n.position.x + 260));
    const maxY = Math.max(...this.state.nodes.map(n => n.position.y + 130));
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const zoom = this.clampZoom(Math.min((rect.width - pad) / width, (rect.height - pad) / height, 1.25));
    const x = (rect.width - width * zoom) / 2 - minX * zoom;
    const y = (rect.height - height * zoom) / 2 - minY * zoom;
    this.store.dispatch(A.viewportUpdated({ viewport: { x, y, zoom } }));
  }

  private zoomAtCenter(nextZoom: number) {
    const host = document.querySelector('.canvas-wrap') as HTMLElement | null;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const v = this.state.viewport;
    const oldZoom = v.zoom || 1;
    const newZoom = this.clampZoom(nextZoom);
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const boardX = (mx - v.x) / oldZoom;
    const boardY = (my - v.y) / oldZoom;
    this.store.dispatch(A.viewportUpdated({ viewport: { x: mx - boardX * newZoom, y: my - boardY * newZoom, zoom: newZoom } }));
  }

  private clampZoom(value: number) {
    return Math.min(2.5, Math.max(0.3, Number(value.toFixed(2))));
  }

  panStart(ev: MouseEvent) {
    if (ev.altKey || ev.button === 1 || (ev.button === 0 && this.isCanvasPanTarget(ev))) {
      ev.preventDefault();
      this.panning = true;
      this.last = { x: ev.clientX, y: ev.clientY };
    }
  }

  panMove(ev: MouseEvent) {
    if (!this.panning) return;
    const v = this.state.viewport;
    this.store.dispatch(A.viewportUpdated({ viewport: { ...v, x: v.x + ev.clientX - this.last.x, y: v.y + ev.clientY - this.last.y } }));
    this.last = { x: ev.clientX, y: ev.clientY };
  }

  private isCanvasPanTarget(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return false;
    return !!target.closest('.canvas-wrap') && !target.closest('.node,.tool-child-node,.port,.orchestrator-action,.zoom-controls,.canvas-help,.edge-label,button,mat-card,input,textarea,mat-select');
  }

  save() {
    if (!this.state.nodes.length) {
      this.store.dispatch(A.agentLoaded({ agentId: this.state.agentId!, graph: starterGraph(this.state.agentName || 'Agent') }));
      return;
    }
    this.validationErrors = this.validateGraph();
    if (this.validationErrors.length) return;
    this.runPreflight(() => {
      this.api.saveAgent(this.state.agentId!, toGraph(this.state)).subscribe(() => { this.store.dispatch(A.saveSuccess()); this.loadVersions(this.state.agentId!); });
    });
  }

  publish() {
    if (!this.state.agentId) return;
    if (this.validationErrors.length) return;
    this.runPreflight(() => {
      this.api.saveAgent(this.state.agentId!, toGraph(this.state)).subscribe(() => {
        this.store.dispatch(A.saveSuccess());
        this.api.publishAgent(this.state.agentId!).subscribe(() => this.loadVersions(this.state.agentId!));
      });
    });
  }

  restoreVersion(versionId: string) {
    if (!this.state.agentId || !versionId) return;
    if (!confirm('Restore this graph version? Current unsaved canvas changes will be replaced.')) return;
    this.api.restoreAgentVersion(this.state.agentId, versionId).subscribe(a => {
      const g = normalizeGraph(a.graphJson, a.name);
      this.store.dispatch(A.agentLoaded({ agentId: this.state.agentId!, graph: g }));
      this.loadVersions(this.state.agentId!);
    });
  }

  private loadVersions(agentId: string) {
    this.api.agentVersions(agentId).subscribe({ next: v => this.versions = v || [], error: _ => this.versions = [] });
  }

  run() {
    this.validationErrors = this.validateGraph();
    if (this.validationErrors.length) return;
    this.runPreflight(() => {
      this.dialog.open(RunInputDialogComponent, { width: '560px' }).afterClosed().subscribe(input => {
        if (!input) return;
        this.store.dispatch(A.runTriggered());
        this.api.saveAgent(this.state.agentId!, toGraph(this.state)).subscribe(() => {
          this.store.dispatch(A.saveSuccess());
          this.api.runtimeRun(this.state.agentId!, input, toGraph(this.state)).subscribe(r => {
            const runId = r.run_id || r.id || r.runId;
            this.store.dispatch(A.runStarted({ runId }));
            this.connectSse(runId);
          });
        });
      });
    });
  }

  cancelRun() {
    const runId = this.state.runState.runId;
    if (!runId) return;
    this.api.cancelRun(runId).subscribe({
      next: () => this.store.dispatch(A.runFailed({ error: 'Run cancelled by user' })),
      error: err => this.store.dispatch(A.runFailed({ error: err?.error?.message || err?.error?.detail || 'Unable to cancel run' }))
    });
  }

  connectSse(runId: string) {
    this.api.streamRun(runId, (ev) => {
      const event = this.toRunEvent(runId, ev);

      if (event.status === 'step') this.store.dispatch(A.runStep({ event }));
      if (event.status === 'awaiting_human') {
        this.store.dispatch(A.runAwaitingHuman({ event }));
        this.dialog.open(HitlDialogComponent, { data: event }).afterClosed().subscribe(res => {
          if (res) this.api.resumeRun(runId, res).subscribe();
        });
      }
      if (event.status === 'done') this.store.dispatch(A.runCompleted({ event }));
      if (event.status === 'error' || event.status === 'aborted') this.store.dispatch(A.runFailed({ error: event.error || event.reason || 'Run failed' }));
    }, () => this.store.dispatch(A.runFailed({ error: 'SSE connection failed' })));
  }

  private toRunEvent(runId: string, ev: any): RunEvent {
    return {
      status: ev?.status || 'step',
      run_id: ev?.run_id || ev?.runId || runId,
      node_id: ev?.node_id || ev?.nodeId,
      update: ev?.update ?? ev?.output ?? ev,
      error: ev?.error,
      reason: ev?.reason
    };
  }

  validateGraph(): string[] {
    const errors: string[] = [];
    const starts = this.state.nodes.filter(n => n.type === 'START' || n.type === 'WEBHOOK_TRIGGER');
    const ends = this.state.nodes.filter(n => n.type === 'END');
    if (starts.length !== 1) errors.push('Exactly one START or WEBHOOK_TRIGGER node is required.');
    if (ends.length < 1) errors.push('At least one END node is required.');
    for (const e of this.state.edges) {
      if (!this.state.nodes.some(n => n.id === e.source)) errors.push(`Edge ${e.id} has invalid source.`);
      if (!this.state.nodes.some(n => n.id === e.target)) errors.push(`Edge ${e.id} has invalid target.`);
      if (e.source === e.target) errors.push(`Self-loop is not allowed on edge ${e.id}.`);
    }
    for (const n of this.state.nodes) {
      const incoming = this.state.edges.some(e => e.target === n.id && this.edgeType(e) === 'FLOW');
      const outgoing = this.state.edges.some(e => e.source === n.id && this.edgeType(e) === 'FLOW');
      if (!this.isDetachedResourceNode(n) && n.type !== 'START' && n.type !== 'WEBHOOK_TRIGGER' && n.type !== 'END' && (!incoming || !outgoing)) errors.push(`${n.label} must have input and output connection.`);
      if ((n.type === 'START' || n.type === 'WEBHOOK_TRIGGER') && !outgoing) errors.push(`${n.type} must connect to at least one node.`);
      if (n.type === 'CONDITION') {
        const outs = this.state.edges.filter(e => e.source === n.id);
        if (outs.length < 2) errors.push(`${n.label} CONDITION requires at least 2 outbound edges.`);
        if (outs.some(e => !e.label?.trim())) errors.push(`${n.label} CONDITION outbound edges must have labels.`);
      }
    }
    return Array.from(new Set(errors));
  }

  private isDetachedResourceNode(node: any): boolean {
    const cfg = node?.config || {};
    if (node?.type === 'RAG_QUERY') return cfg.auto_route !== false && cfg.autoRoute !== false;
    if (node?.type === 'TOOLS' || node?.type === 'TOOL_EXECUTOR') return cfg.auto_route !== false && cfg.autoRoute !== false;
    if (node?.type === 'MEMORY' || node?.type === 'MEMORY_READ' || node?.type === 'MEMORY_WRITE') return cfg.auto_route !== false && cfg.autoRoute !== false;
    return false;
  }

  private isResourceNode(node: any): boolean {
    return ['RAG_QUERY', 'TOOLS', 'TOOL_EXECUTOR', 'MEMORY', 'MEMORY_READ', 'MEMORY_WRITE'].includes(node?.type);
  }

  private restorePanelState() {
    const raw = localStorage.getItem(this.panelStateKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      this.paletteCollapsed = !!state.paletteCollapsed;
      this.configCollapsed = !!state.configCollapsed;
      this.logsCollapsed = !!state.logsCollapsed;
      this.copilotCommandHidden = !!state.copilotCommandHidden;
    } catch {
      localStorage.removeItem(this.panelStateKey);
    }
  }

  private persistPanelState() {
    localStorage.setItem(this.panelStateKey, JSON.stringify({
      paletteCollapsed: this.paletteCollapsed,
      configCollapsed: this.configCollapsed,
      logsCollapsed: this.logsCollapsed,
      copilotCommandHidden: this.copilotCommandHidden
    }));
  }

}
