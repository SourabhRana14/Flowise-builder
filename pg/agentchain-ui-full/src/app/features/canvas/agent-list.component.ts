import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, switchMap, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { starterGraph } from '../../shared/utils/default-config';

@Component({
  selector: 'app-agent-list',
  template: `
  <div class="page">
    <div class="top">
      <div>
        <h2>Agents</h2>
        <p class="muted">Create, edit, open, and delete agent definitions.</p>
      </div>
      <div class="top-actions">
        <input #agentImport type="file" hidden accept=".json,.yaml,.yml,application/json,application/x-yaml" (change)="importAgent($event)">
        <button mat-stroked-button (click)="agentImport.click()"><mat-icon>upload_file</mat-icon>Import</button>
        <button mat-stroked-button routerLink="/templates"><mat-icon>dashboard_customize</mat-icon>Templates</button>
        <button mat-raised-button color="primary" (click)="newAgent()"><mat-icon>add</mat-icon>Create Agent</button>
      </div>
    </div>
    <div class="next-steps">
      <button class="next-step" type="button" routerLink="/studio"><mat-icon>auto_awesome</mat-icon><div><strong>Create from Studio</strong><span>Use the guided builder when you want a simple business-first setup.</span></div></button>
      <button class="next-step" type="button" routerLink="/templates"><mat-icon>hub</mat-icon><div><strong>Use a template</strong><span>Start quickly with ready-made agents or workflow patterns.</span></div></button>
      <button class="next-step" type="button" routerLink="/chat"><mat-icon>play_circle</mat-icon><div><strong>Open and test</strong><span>After creating an agent, open it and run chat or regression scenarios.</span></div></button>
    </div>

    <mat-card class="copilot-card">
      <div class="copilot-header">
        <div>
          <h3>Agent Builder Copilot</h3>
          <p class="muted">Describe the agent or process you want. Copilot will draft the graph using your available tools and agents.</p>
        </div>
        <button mat-raised-button color="primary" [disabled]="copilotBusy || !copilotPrompt.trim()" (click)="generateWithCopilot()">
          <mat-icon>auto_awesome</mat-icon>{{ copilotBusy ? 'Generating...' : 'Generate Agent' }}
        </button>
      </div>
      <mat-form-field class="full-width">
        <mat-label>Requirement</mat-label>
        <textarea matInput rows="3" [(ngModel)]="copilotPrompt" placeholder="Example: Create a supervisor agent that routes inventory queries to iProvision, service health to iServe, and workflow execution to iProcess."></textarea>
      </mat-form-field>
      <div *ngIf="copilotMessage" class="copilot-message">{{ copilotMessage }}</div>
    </mat-card>

    <mat-card *ngIf="showForm" class="form-card">
        <h3>{{ editingId ? 'Edit Agent' : 'Create Agent' }}</h3>
        <mat-form-field class="full-width">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="form.name">
        </mat-form-field>
        <mat-form-field class="full-width">
          <mat-label>Max steps</mat-label>
          <input matInput type="number" [(ngModel)]="form.maxSteps">
        </mat-form-field>
        <mat-form-field class="full-width">
          <mat-label>Timeout seconds</mat-label>
          <input matInput type="number" [(ngModel)]="form.timeoutS">
        </mat-form-field>
        <mat-form-field class="full-width">
          <mat-label>Embed widget</mat-label>
          <mat-select [(ngModel)]="form.embedEnabled">
            <mat-option [value]="false">Disabled</mat-option>
            <mat-option [value]="true">Enabled</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field class="full-width" *ngIf="form.embedEnabled">
          <mat-label>Allowed origins</mat-label>
          <input matInput [(ngModel)]="form.embedAllowedOrigins" placeholder="https://example.com, http://localhost:*">
        </mat-form-field>
        <mat-form-field class="full-width" *ngIf="form.embedEnabled">
          <mat-label>Embed token TTL seconds</mat-label>
          <input matInput type="number" [(ngModel)]="form.embedTokenTtlS">
        </mat-form-field>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="save()">{{ editingId ? 'Update' : 'Create' }}</button>
          <button mat-button (click)="reset()">Clear</button>
        </div>
      </mat-card>

      <mat-card>
        <div class="table-head"><h3>Agent Registry</h3><div class="actions"><button mat-button color="warn" (click)="deleteSelected()" [disabled]="selectedCount() === 0">Delete Selected</button><button mat-button (click)="load()">Refresh</button></div></div>
        <table mat-table [dataSource]="agents">
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)"></th>
            <td mat-cell *matCellDef="let a"><input type="checkbox" [checked]="selected[a.id]" (change)="toggle(a.id,$event)"></td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let a">{{ a.name }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Limits</th>
            <td mat-cell *matCellDef="let a">{{ a.maxSteps || 25 }} steps / {{ a.timeoutS || 120 }}s</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let a">
              <button mat-button color="primary" (click)="open(a.id)">Open</button>
              <button mat-button (click)="edit(a)">Edit</button>
              <button mat-button (click)="exportAgent(a, 'json')">Export JSON</button>
              <button mat-button (click)="exportAgent(a, 'yaml')">Export YAML</button>
              <button mat-button color="warn" (click)="delete(a)">Delete</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row;columns:cols"></tr>
        </table>
        <div class="empty-state" *ngIf="agents.length === 0">
          <div>
            <strong>No agents yet</strong>
            <p>Create a guided agent, import a package, or start from a generic workflow template.</p>
            <button mat-raised-button color="primary" (click)="newAgent()">Create Agent</button>
          </div>
        </div>
        <mat-paginator [length]="total" [pageIndex]="page.pageIndex" [pageSize]="page.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"></mat-paginator>
      </mat-card>
  </div>`,
  styles: [`.top,.table-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.top-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.next-steps{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px}.next-step{align-items:flex-start;background:#fff;border:1px solid #dbe3ee;border-radius:10px;cursor:pointer;display:flex;gap:16px;padding:18px;text-align:left}.next-step:hover{border-color:#2563eb;box-shadow:0 8px 22px #2563eb1f}.next-step mat-icon{background:#e8f2ff;border-radius:10px;color:#1d5f99;height:32px;padding:8px;width:32px}.next-step strong{display:block;font-size:17px;margin-bottom:6px}.next-step span{color:#52657d;line-height:1.4}.copilot-card{margin-bottom:16px}.copilot-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.copilot-message{font-size:13px;color:#4b5563;margin-top:4px;white-space:pre-wrap}.form-card{margin-bottom:16px;max-width:520px}.actions{display:flex;gap:8px}.full-width{width:100%}table{width:100%}`]
})
export class AgentListComponent implements OnInit {
  agents: any[] = [];
  cols = ['select', 'name', 'status', 'actions'];
  pageSizeOptions = [10, 25, 50];
  page = { pageIndex: 0, pageSize: 10 };
  total = 0;
  editingId = '';
  form: any = this.blank();
  showForm = false;
  copilotPrompt = '';
  copilotBusy = false;
  copilotMessage = '';
  selected: Record<string, boolean> = {};

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.load();
    const template = this.router.parseUrl(this.router.url).queryParams['template'];
    if (template === 'multi-agent') setTimeout(() => this.createDynamicMultiAgentTemplate());
    if (template === 'generic-workflow') setTimeout(() => this.importSampleAgent());
  }

  load() {
    this.api.agentsPage(this.page.pageIndex, this.page.pageSize).subscribe({ next: r => { this.agents = r?.content || []; this.total = r?.totalElements || 0; this.pruneSelection(); }, error: _ => { this.agents = []; this.total = 0; this.selected = {}; } });
  }
  onPage(event: any) { this.page = event; this.load(); }

  newAgent() { this.reset(); this.showForm = true; }

  generateWithCopilot() {
    const message = this.copilotPrompt.trim();
    if (!message || this.copilotBusy) return;
    this.copilotBusy = true;
    this.copilotMessage = 'Drafting graph from your platform catalog...';
    this.api.generateAgentFromCopilot({ message, mode: 'create', use_llm: true }).subscribe({
      next: (result: any) => {
        const graphJson = result?.graphJson || result?.graph_json;
        if (!graphJson?.nodes?.length) {
          this.copilotBusy = false;
          this.copilotMessage = 'Copilot did not return a usable graph.';
          return;
        }
        const name = String(graphJson.name || result?.name || 'Generated Agent').trim() || 'Generated Agent';
        const body = {
          name,
          maxSteps: Number(graphJson.agent_config?.max_steps || 25),
          timeoutS: Number(graphJson.agent_config?.execution_timeout_s || graphJson.agent_config?.timeout_s || 180),
          monthlyBudgetUsd: 100,
          embedEnabled: false,
          embedAllowedOrigins: 'http://localhost:*',
          embedTokenTtlS: 86400,
          graphJson: { ...graphJson, name }
        };
        this.api.createAgent(name).pipe(
          switchMap((agent: any) => this.api.updateAgent(agent.id, body))
        ).subscribe({
          next: (saved: any) => {
            this.copilotBusy = false;
            const warnings = (result?.warnings || []).join('\n');
            this.copilotMessage = warnings ? `${result.answer || 'Agent created.'}\n${warnings}` : (result?.answer || 'Agent created.');
            this.load();
            this.router.navigate(['/agents', saved.id, 'canvas']);
          },
          error: err => {
            this.copilotBusy = false;
            this.copilotMessage = err?.error?.message || err?.error?.detail || 'Unable to save generated agent.';
          }
        });
      },
      error: err => {
        this.copilotBusy = false;
        this.copilotMessage = err?.error?.message || err?.error?.detail || 'Unable to generate agent. Check that the AI runtime is running.';
      }
    });
  }

  edit(agent: any) {
    this.editingId = agent.id;
    this.form = { ...agent };
    this.showForm = true;
  }

  save() {
    if (!this.form.name?.trim()) return;
    if (this.editingId) {
      this.api.updateAgent(this.editingId, this.form).subscribe(() => { this.reset(); this.load(); });
    } else {
      this.api.createAgent(this.form.name).subscribe((a: any) => {
        const body = { ...this.form, graphJson: this.defaultGraph(this.form.name) };
        this.api.updateAgent(a.id, body).subscribe(() => {
          this.router.navigate(['/agents', a.id, 'canvas']);
        });
      });
    }
  }

  delete(agent: any) {
    if (!confirm(`Delete agent "${agent.name}"?`)) return;
    this.api.deleteAgent(agent.id).subscribe(() => this.load());
  }

  toggle(id: string, event: Event) { this.selected[id] = (event.target as HTMLInputElement).checked; }
  toggleAll(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.agents.forEach(a => this.selected[a.id] = checked); }
  selectedCount() { return this.agents.filter(a => this.selected[a.id]).length; }
  allSelected() { return this.agents.length > 0 && this.selectedCount() === this.agents.length; }
  deleteSelected() {
    const rows = this.agents.filter(a => this.selected[a.id]);
    if (!rows.length || !confirm(`Delete ${rows.length} selected agent${rows.length === 1 ? '' : 's'}?`)) return;
    forkJoin(rows.map(a => this.api.deleteAgent(a.id))).subscribe(() => { rows.forEach(a => delete this.selected[a.id]); this.load(); });
  }
  private pruneSelection() { const ids = new Set(this.agents.map(a => a.id)); Object.keys(this.selected).forEach(id => { if (!ids.has(id)) delete this.selected[id]; }); }

  exportAgent(agent: any, format: 'json' | 'yaml') {
    this.api.exportAgent(agent.id, format).subscribe(text => {
      const blob = new Blob([text], { type: format === 'yaml' ? 'application/x-yaml' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.safeFilename(agent.name)}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  importAgent(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const format: 'json' | 'yaml' = file.name.toLowerCase().endsWith('.json') ? 'json' : 'yaml';
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      if (format === 'json') {
        this.importJsonAgent(text, input);
        return;
      }
      this.api.importAgent(text, format, 'duplicate', true).subscribe({
        next: (preview: any) => {
          if (!preview.valid) {
            input.value = '';
            alert(`Agent import is invalid:\n${(preview.errors || []).join('\n')}`);
            return;
          }
          let mode: 'duplicate' | 'overwrite' | 'reject' = 'duplicate';
          if (preview.duplicate) {
            const replace = confirm(`Agent "${preview.name}" already exists.\n\nOK = overwrite existing agent\nCancel = import as a copy`);
            mode = replace ? 'overwrite' : 'duplicate';
          }
          this.api.importAgent(text, format, mode).subscribe((agent: any) => {
            input.value = '';
            this.load();
            this.router.navigate(['/agents', agent.id, 'canvas']);
          });
        },
        error: err => {
          input.value = '';
          const message = err?.status === 401 || err?.status === 403
            ? 'Unable to validate agent import because your session is not authorized. Please log out, log in again, and retry the import.'
            : (err?.error?.message || err?.error?.detail || 'Unable to validate agent import.');
          alert(message);
        }
      });
    };
    reader.onerror = () => {
      input.value = '';
      alert('Unable to read selected agent file.');
    };
    reader.readAsText(file);
  }

  private importJsonAgent(text: string, input: HTMLInputElement) {
    let parsed: any;
    try {
      parsed = JSON.parse(this.normalizeJsonImportText(text));
    } catch (err: any) {
      input.value = '';
      const preview = String(text || '').slice(0, 120).replace(/\s+/g, ' ').trim();
      alert(`Agent import is invalid: selected JSON file cannot be parsed.\n${err?.message || ''}${preview ? `\n\nFile starts with:\n${preview}` : ''}`);
      return;
    }

    const spec = parsed?.spec || parsed || {};
    const graphJson = spec.graphJson || parsed?.graphJson || parsed?.graph_json;
    const errors = this.validateImportGraph(graphJson);
    if (errors.length) {
      input.value = '';
      alert(`Agent import is invalid:\n${errors.join('\n')}`);
      return;
    }

    let name = String(spec.name || graphJson?.name || 'Imported Agent').trim() || 'Imported Agent';
    const existing = this.agents.find(a => String(a.name || '').toLowerCase() === name.toLowerCase());
    let targetId = '';
    if (existing) {
      const replace = confirm(`Agent "${name}" already exists.\n\nOK = overwrite existing agent\nCancel = import as a copy`);
      if (replace) {
        targetId = existing.id;
      } else {
        name = this.uniqueImportedName(name);
      }
    }

    const body = {
      name,
      maxSteps: Number(spec.maxSteps || spec.max_steps || 25),
      timeoutS: Number(spec.timeoutS || spec.timeout_s || 120),
      monthlyBudgetUsd: Number(spec.monthlyBudgetUsd || spec.monthly_budget_usd || 100),
      embedEnabled: !!spec.embedEnabled,
      embedAllowedOrigins: spec.embedAllowedOrigins || 'http://localhost:*',
      embedTokenTtlS: Number(spec.embedTokenTtlS || spec.embed_token_ttl_s || 86400),
      graphJson: { ...graphJson, name }
    };

    if (targetId) {
      this.api.updateAgent(targetId, body).subscribe({
        next: (agent: any) => {
          input.value = '';
          this.load();
          this.router.navigate(['/agents', agent.id, 'canvas']);
        },
        error: err => this.handleLocalImportError(err, input)
      });
      return;
    }

    this.api.createAgent(name).subscribe({
      next: (agent: any) => {
        this.api.updateAgent(agent.id, body).subscribe({
          next: (saved: any) => {
            input.value = '';
            this.load();
            this.router.navigate(['/agents', saved.id, 'canvas']);
          },
          error: err => this.handleLocalImportError(err, input)
        });
      },
      error: err => this.handleLocalImportError(err, input)
    });
  }

  private validateImportGraph(graphJson: any): string[] {
    const errors: string[] = [];
    const nodes = Array.isArray(graphJson?.nodes) ? graphJson.nodes : [];
    const edges = Array.isArray(graphJson?.edges) ? graphJson.edges : [];
    if (!nodes.length) return ['graphJson.nodes is required'];
    const starts = nodes.filter((n: any) => n?.type === 'START').length;
    const ends = nodes.filter((n: any) => n?.type === 'END').length;
    if (starts !== 1) errors.push('graph must have exactly one START node');
    if (ends < 1) errors.push('graph must have at least one END node');
    const ids = new Set(nodes.map((n: any) => String(n?.id || '')).filter(Boolean));
    edges.forEach((e: any) => {
      const source = String(e?.source || '');
      const target = String(e?.target || '');
      if (!source || !target || !ids.has(source) || !ids.has(target)) errors.push('edge references an unknown node');
      if (source && source === target) errors.push('self-loop edges are not allowed');
    });
    return Array.from(new Set(errors));
  }

  private normalizeJsonImportText(text: string): string {
    let normalized = String(text || '')
      .replace(/^\uFEFF/, '')
      .replace(/\u0000/g, '')
      .replace(/[\u200B-\u200D\u2060]/g, '')
      .replace(/\u00A0/g, ' ')
      .trim();
    const fence = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) normalized = fence[1].trim();
    const firstBrace = normalized.indexOf('{');
    const lastBrace = normalized.lastIndexOf('}');
    if (firstBrace > 0 && lastBrace > firstBrace) {
      normalized = normalized.slice(firstBrace, lastBrace + 1).trim();
    }
    return normalized;
  }

  createDynamicMultiAgentTemplate() {
    this.api.tools().subscribe({
      next: tools => {
        const iProvisionName = this.uniqueImportedName('iProvision');
        const iServeName = this.uniqueImportedName('iServe');
        const iProcessName = this.uniqueImportedName('iProcess');
        const supervisorName = this.uniqueImportedName('iSupervisor');
        const iProvisionTools = this.mcpToolIdsForGroup(tools || [], 'iProvision');
        const iServeTools = this.mcpToolIdsForGroup(tools || [], 'iServe');
        const iProcessTools = this.mcpToolIdsForGroup(tools || [], 'iProcess');

        forkJoin({
          iProvision: this.createSampleFromGraph(iProvisionName, this.namedMcpSpecialistGraph(
            iProvisionName,
            iProvisionTools,
            'You are iProvision. Handle device, site, tenant, customer, circuit, inventory, capacity, and provisioning-readiness questions. Select only the MCP tools relevant to the user request and map natural language into tool inputs.',
            '{{input.message}}\\n\\nSupervisor context:\\n{{input.parent_context}}\\n\\nMemory context:\\n{{state.memory_context}}\\n\\nTool results:\\n{{state.tool_results}}'
          )),
          iServe: this.createSampleFromGraph(iServeName, this.namedMcpSpecialistGraph(
            iServeName,
            iServeTools,
            'You are iServe. Handle service assurance, service impact, customer service state, SLA, health, incidents, and monitoring questions. Use MCP tools when live service context is required.',
            '{{input.message}}\\n\\nSupervisor context:\\n{{input.parent_context}}\\n\\nMemory context:\\n{{state.memory_context}}\\n\\nTool results:\\n{{state.tool_results}}'
          )),
          iProcess: this.createSampleFromGraph(iProcessName, this.namedMcpSpecialistGraph(
            iProcessName,
            iProcessTools,
            'You are iProcess. Handle process lookup, workflow execution, runbook status, ticket/process lifecycle, and operational actions. Build structured tool inputs from natural language; do not ask for raw JSON when values are present.',
            '{{input.message}}\\n\\nSupervisor context:\\n{{input.parent_context}}\\n\\nMemory context:\\n{{state.memory_context}}\\n\\nTool results:\\n{{state.tool_results}}'
          ))
        }).pipe(
          switchMap(created => this.createSampleFromGraph(supervisorName, this.dynamicSupervisorGraph(supervisorName, created.iProvision.id, created.iServe.id, created.iProcess.id)))
        ).subscribe({
          next: supervisor => {
            this.load();
            const missing = [
              iProvisionTools.length ? '' : 'iProvision MCP tools',
              iServeTools.length ? '' : 'iServe MCP tools',
              iProcessTools.length ? '' : 'iProcess MCP tools'
            ].filter(Boolean);
            if (missing.length) alert(`Created the dynamic multi-agent template, but no matching tools were found for: ${missing.join(', ')}. Discover/select MCP tools whose name, group, or server contains iProvision, iServe, or iProcess.`);
            this.router.navigate(['/agents', supervisor.id, 'canvas']);
          },
          error: err => alert(err?.error?.message || err?.error?.detail || 'Unable to create multi-agent template.')
        });
      },
      error: err => alert(err?.error?.message || err?.error?.detail || 'Unable to load tools for multi-agent template.')
    });
  }

  importSampleAgent() {
    const name = this.uniqueImportedName('Orchestrated Agent Minimal Import');
    const graphJson = this.sampleGraph(name);
    const body = {
      name,
      maxSteps: 25,
      timeoutS: 180,
      monthlyBudgetUsd: 25,
      embedEnabled: false,
      embedAllowedOrigins: 'http://localhost:*',
      embedTokenTtlS: 86400,
      graphJson
    };
    this.api.createAgent(name).subscribe({
      next: (agent: any) => {
        this.api.updateAgent(agent.id, body).subscribe({
          next: (saved: any) => {
            this.load();
            this.router.navigate(['/agents', saved.id, 'canvas']);
          },
          error: err => alert(err?.error?.message || err?.error?.detail || 'Unable to create sample agent.')
        });
      },
      error: err => alert(err?.error?.message || err?.error?.detail || 'Unable to create sample agent.')
    });
  }

  createNetworkMultiAgentSample() {
    this.api.tools().subscribe({
      next: tools => {
        const domainName = this.uniqueImportedName('Domain Agent');
        const diagnosticsName = this.uniqueImportedName('Site Diagnostics Agent');
        const workflowName = this.uniqueImportedName('Workflow Execution Agent');
        const supervisorName = this.uniqueImportedName('Network Incident Supervisor Agent');
        const domainTools = this.toolIdsByNames(tools || [], ['get_domains', 'get_solution_areas_by_domain', 'get_solution_areas', 'get_workflows_by_domain', 'get_processes']);
        const diagnosticsTools = this.toolIdsByNames(tools || [], ['get_sites', 'get_devices', 'get_interfaces', 'get_interface_status', 'get_site_status']);
        const workflowTools = this.toolIdsByNames(tools || [], ['execute_workflow', 'get_workflow_status', 'get_workflow_inputs']);
        forkJoin({
          domain: this.createSampleFromGraph(domainName, this.specialistGraph(domainName, 'Domain MCP Tools', domainTools, 'You are the Domain Agent. Identify domain, solution area, process, and workflow from the user request. Use MCP tools when needed. Return concise structured facts for the supervisor.', '{{input.message}}\\n\\nTool results:\\n{{state.tool_results}}')),
          diagnostics: this.createSampleFromGraph(diagnosticsName, this.specialistGraph(diagnosticsName, 'Diagnostics MCP Tools', diagnosticsTools, 'You are the Site Diagnostics Agent. Inspect site, device, and interface health using MCP tools. Map natural language values like site name, SID, device, and interface into tool inputs. Return diagnosis, evidence, and missing details only if truly required.', '{{input.message}}\\n\\nDomain context:\\n{{input.domain_context}}\\n\\nTool results:\\n{{state.tool_results}}')),
          workflow: this.createSampleFromGraph(workflowName, this.specialistGraph(workflowName, 'Workflow MCP Tools', workflowTools, 'You are the Workflow Execution Agent. Execute approved workflows. Map natural language into workflowName and inputJson. If version or priority are required and not provided, use safe defaults: version latest or 1, priority NORMAL. Never ask for raw inputJson if values were provided naturally.', '{{input.message}}\\n\\nApproval:\\n{{input.approval}}\\n\\nDomain context:\\n{{input.domain_context}}\\n\\nDiagnostics:\\n{{input.diagnostics}}\\n\\nTool results:\\n{{state.tool_results}}'))
        }).pipe(
          switchMap(created => this.createSampleFromGraph(supervisorName, this.supervisorGraph(supervisorName, created.domain.id, created.diagnostics.id, created.workflow.id)))
        ).subscribe({
          next: supervisor => {
            this.load();
            const missing = [
              domainTools.length ? '' : 'Domain Agent tools',
              diagnosticsTools.length ? '' : 'Site Diagnostics Agent tools',
              workflowTools.length ? '' : 'Workflow Execution Agent tools'
            ].filter(Boolean);
            if (missing.length) alert(`Created the multi-agent sample, but these agents have no matching MCP tools yet: ${missing.join(', ')}. Discover/select MCP tools in Tool Center, then add them to the child agents.`);
            this.router.navigate(['/agents', supervisor.id, 'canvas']);
          },
          error: err => alert(err?.error?.message || err?.error?.detail || 'Unable to create multi-agent sample.')
        });
      },
      error: err => alert(err?.error?.message || err?.error?.detail || 'Unable to load tools for sample agent creation.')
    });
  }

  createServiceProvisionProcessSample() {
    this.api.tools().subscribe({
      next: tools => {
        const iServeName = this.uniqueImportedName('iServe');
        const iProvisionName = this.uniqueImportedName('iProvision');
        const iProcessName = this.uniqueImportedName('iProcess');
        const supervisorName = this.uniqueImportedName('iSupervisor');
        const iServeTools = this.mcpToolIdsForGroup(tools || [], 'iServe');
        const iProvisionTools = this.mcpToolIdsForGroup(tools || [], 'iProvision');
        const iProcessTools = this.mcpToolIdsForGroup(tools || [], 'iProcess');

        forkJoin({
          iServe: this.createSampleFromGraph(iServeName, this.namedMcpSpecialistGraph(
            iServeName,
            iServeTools,
            'You are iServe. Handle service discovery, service health, site/customer context, inventory lookup, and service-impact questions. Use your MCP tools first when the request needs live service data. Save useful site, service, SID, customer, and incident context to memory.',
            '{{input.message}}\\n\\nSupervisor context:\\n{{input.supervisor_context}}\\n\\nMemory context:\\n{{state.memory_context}}\\n\\nTool results:\\n{{state.tool_results}}'
          )),
          iProvision: this.createSampleFromGraph(iProvisionName, this.namedMcpSpecialistGraph(
            iProvisionName,
            iProvisionTools,
            'You are iProvision. Handle provisioning, configuration changes, activation, deactivation, capacity, and change-readiness checks. Convert natural language into valid MCP tool inputs. Use safe defaults only for optional fields, and report required missing business values clearly.',
            '{{input.message}}\\n\\niServe context:\\n{{input.service_context}}\\n\\nSupervisor context:\\n{{input.supervisor_context}}\\n\\nMemory context:\\n{{state.memory_context}}\\n\\nTool results:\\n{{state.tool_results}}'
          )),
          iProcess: this.createSampleFromGraph(iProcessName, this.namedMcpSpecialistGraph(
            iProcessName,
            iProcessTools,
            'You are iProcess. Handle process selection, workflow lookup, workflow execution, status tracking, ticket/runbook steps, and post-action summary. Accept natural language values and build structured inputs for your MCP tools without asking for raw JSON.',
            '{{input.message}}\\n\\niServe context:\\n{{input.service_context}}\\n\\niProvision context:\\n{{input.provision_context}}\\n\\nApproval:\\n{{input.approval}}\\n\\nMemory context:\\n{{state.memory_context}}\\n\\nTool results:\\n{{state.tool_results}}'
          ))
        }).pipe(
          switchMap(created => this.createSampleFromGraph(
            supervisorName,
            this.serviceProvisionProcessSupervisorGraph(supervisorName, created.iServe.id, created.iProvision.id, created.iProcess.id)
          ))
        ).subscribe({
          next: supervisor => {
            this.load();
            const missing = [
              iServeTools.length ? '' : 'iServe MCP tools',
              iProvisionTools.length ? '' : 'iProvision MCP tools',
              iProcessTools.length ? '' : 'iProcess MCP tools'
            ].filter(Boolean);
            if (missing.length) alert(`Created iSupervisor and the 3 child agents, but no matching tools were found for: ${missing.join(', ')}. Discover/select MCP tools in Tool Center whose name, server, or group contains iServe, iProvision, or iProcess, then add them to the child agents.`);
            this.router.navigate(['/agents', supervisor.id, 'canvas']);
          },
          error: err => alert(err?.error?.message || err?.error?.detail || 'Unable to create iServe multi-agent sample.')
        });
      },
      error: err => alert(err?.error?.message || err?.error?.detail || 'Unable to load tools for iServe sample creation.')
    });
  }

  private createSampleFromGraph(name: string, graphJson: any) {
    const body = { name, maxSteps: graphJson.agent_config?.max_steps || 25, timeoutS: graphJson.agent_config?.execution_timeout_s || 120, monthlyBudgetUsd: 25, embedEnabled: false, embedAllowedOrigins: 'http://localhost:*', embedTokenTtlS: 86400, graphJson };
    return this.api.createAgent(name).pipe(switchMap((agent: any) => this.api.updateAgent(agent.id, body)), map((agent: any) => ({ ...agent, graphJson })));
  }

  private toolIdsByNames(tools: any[], names: string[]) {
    const wanted = new Set(names.map(x => x.toLowerCase()));
    return tools
      .filter(t => String(t.type || '').toUpperCase() === 'MCP')
      .filter(t => {
        const values = [t.name, t.mcpToolName, String(t.name || '').split('/').pop()].map(v => String(v || '').trim().toLowerCase());
        return values.some(v => wanted.has(v));
      })
      .map(t => t.id);
  }

  private mcpToolIdsForGroup(tools: any[], groupName: string) {
    const needle = groupName.toLowerCase();
    return tools
      .filter(t => String(t.type || '').toUpperCase() === 'MCP')
      .filter(t => {
        const httpConfig = t.httpConfig || t.http_config || {};
        const values = [
          t.name,
          t.mcpToolName,
          t.mcp_tool_name,
          t.serverName,
          t.server_name,
          t.group,
          t.groupName,
          t.group_name,
          httpConfig.group,
          httpConfig.mcp_server_name,
          String(t.name || '').split('/')[0],
          String(t.name || '').split('/').pop()
        ].map(v => String(v || '').trim().toLowerCase());
        return values.some(v => v === needle || v.includes(needle));
      })
      .map(t => t.id);
  }

  private httpToolIdsForGroup(tools: any[], groupName: string) {
    const needle = groupName.toLowerCase();
    return tools
      .filter(t => String(t.type || '').toUpperCase() !== 'MCP')
      .filter(t => {
        const httpConfig = t.httpConfig || t.http_config || {};
        const values = [
          t.name,
          t.group,
          t.groupName,
          t.group_name,
          httpConfig.group,
          httpConfig.openapi_group,
          httpConfig.source,
          String(t.name || '').split('/')[0],
          String(t.name || '').split('/').pop()
        ].map(v => String(v || '').trim().toLowerCase());
        return values.some(v => v === needle || v.includes(needle));
      })
      .map(t => t.id);
  }

  private namedMcpSpecialistGraph(name: string, toolIds: string[], systemPrompt: string, userPrompt: string) {
    const namespace = this.memoryNamespace(name);
    return {
      name,
      agent_config: { max_steps: 25, execution_timeout_s: 150, recursion_limit: 5 },
      nodes: [
        { id: 'start_1', type: 'START', label: 'START', position: { x: 80, y: 220 }, config: { initial_message_key: 'message' } },
        { id: 'memory_1', type: 'MEMORY', label: 'Memory', position: { x: 360, y: 90 }, config: { mode: 'read_write', namespace, top_k: 5, memory_tier: 'both', memory_backend: 'REDIS', auto_route: true, output_key: 'memory_context' } },
        { id: 'tools_1', type: 'TOOLS', label: `${name} MCP Tools`, position: { x: 360, y: 300 }, config: { source: 'MCP', tool_type: 'MCP', tool_ids: toolIds, max_tools: Math.max(1, Math.min(6, toolIds.length || 1)), min_tool_score: 2, llm_planner: true, execute_all: false, timeout_s: 60, retry_count: 1, input_mapping: '{\n  "message": "{{input.message}}",\n  "query": "{{input.message}}",\n  "service_context": "{{input.service_context}}",\n  "provision_context": "{{input.provision_context}}",\n  "supervisor_context": "{{input.supervisor_context}}",\n  "approval": "{{input.approval}}"\n}' } },
        { id: 'llm_1', type: 'LLM', label: `${name} Analyst`, position: { x: 700, y: 220 }, config: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 1200, orchestrate: true, use_tools: true, write_memory: true, system_prompt: systemPrompt, user_prompt: userPrompt } },
        { id: 'end_1', type: 'END', label: 'END', position: { x: 1030, y: 220 }, config: { output_mapping: '{\n  "answer": "$.messages[-1].content",\n  "memory_context": "$.memory_context",\n  "tool_results": "$.tool_results"\n}' } }
      ],
      edges: [
        { id: 'e1', source: 'start_1', target: 'memory_1', type: 'FLOW' },
        { id: 'e2', source: 'memory_1', target: 'tools_1', type: 'FLOW' },
        { id: 'e3', source: 'tools_1', target: 'llm_1', type: 'FLOW' },
        { id: 'e4', source: 'llm_1', target: 'end_1', type: 'FLOW' }
      ],
      viewport: { x: 0, y: 0, zoom: 0.9 }
    };
  }

  private serviceProvisionProcessSupervisorGraph(name: string, iServeAgentId: string, iProvisionAgentId: string, iProcessAgentId: string) {
    return {
      name,
      agent_config: { max_steps: 35, execution_timeout_s: 300, recursion_limit: 6 },
      nodes: [
        { id: 'start_1', type: 'START', label: 'START', position: { x: 80, y: 240 }, config: { initial_message_key: 'message' } },
        { id: 'memory_1', type: 'MEMORY', label: 'Supervisor Memory', position: { x: 330, y: 100 }, config: { mode: 'read_write', namespace: 'isupervisor', top_k: 6, memory_tier: 'both', memory_backend: 'REDIS', auto_route: true, output_key: 'supervisor_memory' } },
        { id: 'iserve_agent', type: 'AGENT_CALL', label: 'iServe', position: { x: 610, y: 240 }, config: { agent_id: iServeAgentId, output_key: 'service_context', input_mapping: '{\n  "message": "{{input.message}}",\n  "supervisor_context": "{{state.supervisor_memory}}"\n}' } },
        { id: 'iprovision_agent', type: 'AGENT_CALL', label: 'iProvision', position: { x: 900, y: 240 }, config: { agent_id: iProvisionAgentId, output_key: 'provision_context', input_mapping: '{\n  "message": "{{input.message}}",\n  "service_context": "{{state.service_context}}",\n  "supervisor_context": "{{state.supervisor_memory}}"\n}' } },
        { id: 'approval_1', type: 'HUMAN_INTERACTION', label: 'Approval', position: { x: 1190, y: 240 }, config: { title: 'Approve process execution', message: 'Review iServe and iProvision outputs before iProcess executes workflow/process actions.', required: true, approval_type: 'approve_reject', timeout_s: 300 } },
        { id: 'iprocess_agent', type: 'AGENT_CALL', label: 'iProcess', position: { x: 1480, y: 240 }, config: { agent_id: iProcessAgentId, output_key: 'process_result', input_mapping: '{\n  "message": "{{input.message}}",\n  "service_context": "{{state.service_context}}",\n  "provision_context": "{{state.provision_context}}",\n  "approval": "{{input.human_response}}"\n}' } },
        { id: 'llm_1', type: 'LLM', label: 'Supervisor Summary', position: { x: 1770, y: 240 }, config: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 1400, orchestrate: false, write_memory: true, system_prompt: 'You are iSupervisor. Coordinate iServe, iProvision, and iProcess. Summarize service findings, provisioning readiness/actions, approval state, process execution, and next operator steps. Persist reusable SID/site/service context to memory.', user_prompt: 'Original request:\\n{{input.message}}\\n\\nSupervisor memory:\\n{{state.supervisor_memory}}\\n\\niServe result:\\n{{state.service_context}}\\n\\niProvision result:\\n{{state.provision_context}}\\n\\nApproval:\\n{{input.human_response}}\\n\\niProcess result:\\n{{state.process_result}}' } },
        { id: 'end_1', type: 'END', label: 'END', position: { x: 2060, y: 240 }, config: { output_mapping: '{\n  "answer": "$.messages[-1].content",\n  "service_context": "$.service_context",\n  "provision_context": "$.provision_context",\n  "process_result": "$.process_result"\n}' } }
      ],
      edges: [
        { id: 'e1', source: 'start_1', target: 'memory_1', type: 'FLOW' },
        { id: 'e2', source: 'memory_1', target: 'iserve_agent', type: 'FLOW' },
        { id: 'e3', source: 'iserve_agent', target: 'iprovision_agent', type: 'FLOW' },
        { id: 'e4', source: 'iprovision_agent', target: 'approval_1', type: 'FLOW' },
        { id: 'e5', source: 'approval_1', target: 'iprocess_agent', type: 'FLOW' },
        { id: 'e6', source: 'iprocess_agent', target: 'llm_1', type: 'FLOW' },
        { id: 'e7', source: 'llm_1', target: 'end_1', type: 'FLOW' }
      ],
      viewport: { x: 0, y: 0, zoom: 0.75 }
    };
  }

  private dynamicSupervisorGraph(name: string, iProvisionAgentId: string, iServeAgentId: string, iProcessAgentId: string) {
    const routeMetadata = JSON.stringify([
      {
        agent_id: iProvisionAgentId,
        name: 'iProvision',
        description: 'Device, site, tenant, customer, circuit, inventory, provisioning, activation, capacity, and readiness queries.',
        keywords: ['device', 'devices', 'site', 'sites', 'tenant', 'inventory', 'customer', 'circuit', 'provision', 'activation', 'capacity']
      },
      {
        agent_id: iServeAgentId,
        name: 'iServe',
        description: 'Service assurance, service health, service impact, SLA, monitoring, outage, alarm, and incident queries.',
        keywords: ['service', 'impact', 'health', 'sla', 'monitoring', 'outage', 'alarm', 'incident', 'assurance', 'degradation']
      },
      {
        agent_id: iProcessAgentId,
        name: 'iProcess',
        description: 'Process lookup, workflow execution, runbook, ticket, remediation, approval-driven action, and status tracking queries.',
        keywords: ['process', 'workflow', 'execute', 'runbook', 'ticket', 'remediation', 'approval', 'status', 'action', 'change']
      }
    ], null, 2);
    return {
      name,
      agent_config: { max_steps: 20, execution_timeout_s: 240, recursion_limit: 6 },
      nodes: [
        { id: 'start_1', type: 'START', label: 'START', position: { x: 80, y: 240 }, config: { initial_message_key: 'message' } },
        { id: 'memory_1', type: 'MEMORY', label: 'Supervisor Memory', position: { x: 360, y: 120 }, config: { mode: 'read_write', namespace: 'isupervisor', top_k: 6, memory_tier: 'both', memory_backend: 'REDIS', auto_route: true, output_key: 'supervisor_memory' } },
        { id: 'router_1', type: 'AGENT_ROUTER', label: 'Dynamic Specialist Router', position: { x: 670, y: 240 }, config: { candidate_agents: [iProvisionAgentId, iServeAgentId, iProcessAgentId], candidate_agent_routes: routeMetadata, strategy: 'hybrid', max_agents: 1, output_key: 'specialist_results', input_mapping: '{\n  "message": "{{input.message}}",\n  "parent_context": "{{state.supervisor_memory}}"\n}' } },
        { id: 'llm_1', type: 'LLM', label: 'Supervisor Answer', position: { x: 1020, y: 240 }, config: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 1400, orchestrate: false, write_memory: true, system_prompt: 'You are iSupervisor. Decide through the router which specialist handled the request, then produce one operational answer. Do not claim that every specialist was called; mention only selected specialist results.', user_prompt: 'Original request:\\n{{input.message}}\\n\\nSupervisor memory:\\n{{state.supervisor_memory}}\\n\\nSelected specialist results:\\n{{state.specialist_results}}' } },
        { id: 'end_1', type: 'END', label: 'END', position: { x: 1360, y: 240 }, config: { output_mapping: '{\n  "answer": "$.messages[-1].content",\n  "specialist_results": "$.specialist_results"\n}' } }
      ],
      edges: [
        { id: 'e1', source: 'start_1', target: 'memory_1', type: 'FLOW' },
        { id: 'e2', source: 'memory_1', target: 'router_1', type: 'FLOW' },
        { id: 'e3', source: 'router_1', target: 'llm_1', type: 'FLOW' },
        { id: 'e4', source: 'llm_1', target: 'end_1', type: 'FLOW' }
      ],
      viewport: { x: 0, y: 0, zoom: 0.85 }
    };
  }

  private fiveServiceRuntimeTopology(domain: string) {
    return {
      mode: 'five_services',
      domain,
      source_of_truth: 'runtime-orchestrator',
      services: [
        { name: 'runtime-orchestrator', owns: ['run_id', 'graph_state', 'checkpoints', 'event_ordering', 'resume_routing'] },
        { name: 'llm-inference-service', owns: ['model_calls', 'usage', 'cost'] },
        { name: 'tool-execution-service', owns: ['http_tools', 'mcp_tools', 'tool_contract_validation', 'idempotency'] },
        { name: 'human-task-service', owns: ['approval_inbox', 'form_schema', 'resume_payload'] },
        { name: 'memory-rag-service', owns: ['memory', 'retrieval', 'knowledge_context'] }
      ],
      compatibility_contract: {
        run_id: 'same across all service events',
        trace_id: 'propagated from gateway through every worker',
        state: 'orchestrator-owned checkpoint is canonical',
        attachments: 'orchestrator stores payload and passes references/content to tool workers',
        events: 'workers emit node events, orchestrator assigns sequence'
      }
    };
  }

  private memoryNamespace(name: string) {
    return String(name || 'agent').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'agent';
  }

  private specialistGraph(name: string, toolLabel: string, toolIds: string[], systemPrompt: string, userPrompt: string) {
    return {
      name,
      agent_config: { max_steps: 25, execution_timeout_s: 120, recursion_limit: 5 },
      nodes: [
        { id: 'start_1', type: 'START', label: 'START', position: { x: 120, y: 180 }, config: { initial_message_key: 'message' } },
        { id: 'tools_1', type: 'TOOLS', label: toolLabel, position: { x: 420, y: 180 }, config: { source: 'MCP', tool_type: 'MCP', tool_ids: toolIds, max_tools: Math.max(1, Math.min(4, toolIds.length || 1)), min_tool_score: 2, llm_planner: true, execute_all: false, timeout_s: 45, retry_count: 1, input_mapping: '{\n  "message": "{{input.message}}",\n  "query": "{{input.message}}",\n  "domain_context": "{{input.domain_context}}",\n  "diagnostics": "{{input.diagnostics}}",\n  "approval": "{{input.approval}}"\n}' } },
        { id: 'llm_1', type: 'LLM', label: 'Specialist Analyst', position: { x: 720, y: 180 }, config: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 1000, orchestrate: true, use_tools: true, system_prompt: systemPrompt, user_prompt: userPrompt } },
        { id: 'end_1', type: 'END', label: 'END', position: { x: 1020, y: 180 }, config: { output_mapping: '{\n  "answer": "$.messages[-1].content",\n  "tool_results": "$.tool_results"\n}' } }
      ],
      edges: [
        { id: 'e1', source: 'start_1', target: 'tools_1', type: 'FLOW' },
        { id: 'e2', source: 'tools_1', target: 'llm_1', type: 'FLOW' },
        { id: 'e3', source: 'llm_1', target: 'end_1', type: 'FLOW' }
      ]
    };
  }

  private supervisorGraph(name: string, domainAgentId: string, diagnosticsAgentId: string, workflowAgentId: string) {
    return {
      name,
      agent_config: { max_steps: 30, execution_timeout_s: 240, recursion_limit: 5 },
      nodes: [
        { id: 'start_1', type: 'START', label: 'START', position: { x: 80, y: 220 }, config: { initial_message_key: 'message' } },
        { id: 'domain_agent', type: 'AGENT_CALL', label: 'Domain Agent', position: { x: 360, y: 100 }, config: { agent_id: domainAgentId, output_key: 'domain_result', input_mapping: '{\n  "message": "{{input.message}}"\n}' } },
        { id: 'diagnostics_agent', type: 'AGENT_CALL', label: 'Site Diagnostics Agent', position: { x: 650, y: 220 }, config: { agent_id: diagnosticsAgentId, output_key: 'site_diagnostics', input_mapping: '{\n  "message": "{{input.message}}",\n  "domain_context": "{{state.domain_result}}"\n}' } },
        { id: 'approval_1', type: 'HUMAN_INTERACTION', label: 'Approval', position: { x: 940, y: 220 }, config: { title: 'Approve remediation execution', message: 'Review domain and diagnostics results, then approve or reject workflow execution.', required: true, approval_type: 'approve_reject', timeout_s: 300 } },
        { id: 'workflow_agent', type: 'AGENT_CALL', label: 'Workflow Execution Agent', position: { x: 1230, y: 220 }, config: { agent_id: workflowAgentId, output_key: 'workflow_execution', input_mapping: '{\n  "message": "{{input.message}}",\n  "domain_context": "{{state.domain_result}}",\n  "diagnostics": "{{state.site_diagnostics}}",\n  "approval": "{{input.human_response}}"\n}' } },
        { id: 'llm_1', type: 'LLM', label: 'Supervisor Summary', position: { x: 1520, y: 220 }, config: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 1200, orchestrate: false, system_prompt: 'You are the Network Incident Supervisor. Summarize what each specialist agent found and the final execution result. Be concise and operational.', user_prompt: 'Original request:\\n{{input.message}}\\n\\nDomain result:\\n{{state.domain_result}}\\n\\nDiagnostics:\\n{{state.site_diagnostics}}\\n\\nApproval:\\n{{input.human_response}}\\n\\nWorkflow execution:\\n{{state.workflow_execution}}' } },
        { id: 'end_1', type: 'END', label: 'END', position: { x: 1810, y: 220 }, config: { output_mapping: '{\n  "answer": "$.messages[-1].content",\n  "domain_result": "$.domain_result",\n  "site_diagnostics": "$.site_diagnostics",\n  "workflow_execution": "$.workflow_execution"\n}' } }
      ],
      edges: [
        { id: 'e1', source: 'start_1', target: 'domain_agent', type: 'FLOW' },
        { id: 'e2', source: 'domain_agent', target: 'diagnostics_agent', type: 'FLOW' },
        { id: 'e3', source: 'diagnostics_agent', target: 'approval_1', type: 'FLOW' },
        { id: 'e4', source: 'approval_1', target: 'workflow_agent', type: 'FLOW' },
        { id: 'e5', source: 'workflow_agent', target: 'llm_1', type: 'FLOW' },
        { id: 'e6', source: 'llm_1', target: 'end_1', type: 'FLOW' }
      ]
    };
  }

  private sampleGraph(name: string) {
    return {
      name,
      agent_config: { max_steps: 25, timeout_s: 180, recursion_limit: 5 },
      nodes: [
        { id: 'start_1', type: 'START', label: 'START', position: { x: 760, y: 80 }, config: { initial_message_key: 'message' } },
        { id: 'memory_1', type: 'MEMORY', label: 'Memory', position: { x: 400, y: 260 }, config: { mode: 'read_write', namespace: 'agentchain_orchestrated', top_k: 5, memory_tier: 'both', memory_backend: 'REDIS', auto_route: true } },
        { id: 'rag_query_1', type: 'RAG_QUERY', label: 'Knowledge', position: { x: 1120, y: 220 }, config: { collection: 'Linux', query_mapping: '{{message}}', top_k: 5, auto_route: true, min_route_score: 1, synthesize_answer: false, output_key: 'rag_context' } },
        { id: 'tools_1', type: 'TOOLS', label: 'Tools', position: { x: 1120, y: 340 }, config: { source: 'MCP', mcp_server_id: '', tool_ids: [], tool_type: 'MCP', max_tools: 1, min_tool_score: 3, llm_planner: true, execute_all: false, timeout_s: 30, retry_count: 1 } },
        { id: 'llm_1', type: 'LLM', label: 'LLM Orchestrator', position: { x: 760, y: 260 }, config: { model_alias: 'fast', temperature: 0.2, max_tokens: 1200, orchestrate: true, use_tools: true, use_rag: true, always_use_rag: false, write_memory: true, system_prompt: 'Use memory, knowledge, and relevant tools before answering. Do not call unrelated tools.', user_prompt: '{{message}}' } },
        { id: 'end_1', type: 'END', label: 'END', position: { x: 760, y: 460 }, config: {} }
      ],
      edges: [
        { id: 'edge_start_llm', source: 'start_1', target: 'llm_1', label: 'flow', type: 'FLOW' },
        { id: 'edge_llm_end', source: 'llm_1', target: 'end_1' },
        { id: 'resource_memory_llm', source: 'memory_1', target: 'llm_1', label: 'resource', type: 'RESOURCE', execution: false },
        { id: 'resource_rag_llm', source: 'rag_query_1', target: 'llm_1', label: 'resource', type: 'RESOURCE', execution: false },
        { id: 'resource_tools_llm', source: 'tools_1', target: 'llm_1', label: 'resource', type: 'RESOURCE', execution: false }
      ],
      viewport: { x: 0, y: 0, zoom: 0.85 }
    };
  }

  private uniqueImportedName(baseName: string): string {
    const names = new Set(this.agents.map(a => String(a.name || '').toLowerCase()));
    let index = 2;
    let candidate = `${baseName} Copy`;
    while (names.has(candidate.toLowerCase())) {
      candidate = `${baseName} Copy ${index++}`;
    }
    return candidate;
  }

  private handleLocalImportError(err: any, input: HTMLInputElement) {
    input.value = '';
    alert(err?.error?.message || err?.error?.detail || err?.error?.error || 'Unable to import agent.');
  }

  open(id: string) { this.router.navigate(['/agents', id, 'canvas']); }

  reset() {
    this.editingId = '';
    this.form = this.blank();
    this.showForm = false;
  }

  private blank() {
    return { name: 'New Agent', maxSteps: 25, timeoutS: 120, monthlyBudgetUsd: 100, embedEnabled: false, embedAllowedOrigins: 'http://localhost:*', embedTokenTtlS: 86400 };
  }

  private defaultGraph(name: string) {
    return starterGraph(name);
  }

  private safeFilename(name: string) {
    return (name || 'agent').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  }
}
