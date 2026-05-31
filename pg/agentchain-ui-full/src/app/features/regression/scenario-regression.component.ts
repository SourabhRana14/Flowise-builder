import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

interface ScenarioRow {
  selected: boolean;
  agent: any;
  scenario: any;
  result?: any;
}

@Component({
  selector: 'app-scenario-regression',
  template: `
  <div class="page">
    <div class="top">
      <div>
        <h2>Scenario Regression</h2>
        <p class="muted">Run saved agent scenarios, inspect output, and track pass/fail after service or configuration changes.</p>
      </div>
      <div class="actions">
        <button mat-stroked-button (click)="load()">Refresh</button>
        <button mat-raised-button color="primary" (click)="runSelected()" [disabled]="selectedCount() === 0 || running">Run Selected</button>
      </div>
    </div>
    <div class="next-steps">
      <div class="next-step"><mat-icon>playlist_add_check</mat-icon><div><strong>Select scenarios</strong><span>Choose saved tests for one agent or all agents.</span></div></div>
      <div class="next-step"><mat-icon>play_arrow</mat-icon><div><strong>Run after changes</strong><span>Use this whenever tools, prompts, runtime services, or agents change.</span></div></div>
      <div class="next-step"><mat-icon>troubleshoot</mat-icon><div><strong>Inspect failures</strong><span>Open execution previews to see the exact step that failed.</span></div></div>
    </div>

    <div class="grid cards">
      <mat-card><h3>Total</h3><h1>{{rows.length}}</h1></mat-card>
      <mat-card><h3>Passed</h3><h1>{{countBy('PASS')}}</h1></mat-card>
      <mat-card><h3>Failed</h3><h1>{{countBy('FAIL')}}</h1></mat-card>
      <mat-card><h3>Skipped</h3><h1>{{countBy('SKIP')}}</h1></mat-card>
      <mat-card><h3>Running</h3><h1>{{runningCount()}}</h1></mat-card>
    </div>

    <mat-card>
      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Agent</mat-label>
          <mat-select [(ngModel)]="agentFilter">
            <mat-option value="all">All agents</mat-option>
            <mat-option *ngFor="let a of agents" [value]="a.id">{{a.name}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="statusFilter">
            <mat-option value="all">All</mat-option>
            <mat-option value="PASS">Passed</mat-option>
            <mat-option value="FAIL">Failed</mat-option>
            <mat-option value="SKIP">Skipped</mat-option>
            <mat-option value="RUNNING">Running</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Environment</mat-label>
          <mat-select [(ngModel)]="environmentKey">
            <mat-option value="dev">dev</mat-option>
            <mat-option *ngFor="let env of environments" [value]="env.environmentKey">{{env.environmentKey}}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-button (click)="toggleAllVisible(true)">Select Visible</button>
        <button mat-button (click)="toggleAllVisible(false)">Clear</button>
      </div>

      <table class="scenario-table">
        <thead>
          <tr><th></th><th>Agent</th><th>Scenario</th><th>Assertion</th><th>Expected</th><th>Status</th><th>Latest Output</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of filteredRows()">
            <td><input type="checkbox" [(ngModel)]="row.selected"></td>
            <td>{{row.agent.name}}</td>
            <td><strong>{{row.scenario.name || 'Scenario'}}</strong><p>{{row.scenario.message}}</p></td>
            <td>{{assertionLabel(row.scenario.assertionType)}}</td>
            <td>{{row.scenario.expected || '-'}}</td>
            <td><span class="pill" [class.pass]="row.result?.assertion === 'PASS'" [class.fail]="row.result?.assertion === 'FAIL'" [class.skip]="row.result?.assertion === 'SKIP'">{{row.result?.assertion || 'SKIP'}}</span><div class="muted" *ngIf="row.result?.finishedAt">{{row.result.finishedAt | date:'medium'}}</div></td>
            <td><p>{{row.result?.answer || row.result?.message || '-'}}</p><details *ngIf="row.result?.events?.length"><summary>Execution preview</summary><pre>{{row.result.events | json}}</pre></details></td>
            <td><button mat-button (click)="runOne(row)" [disabled]="running">Run</button></td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" *ngIf="filteredRows().length === 0">
        <div>
          <strong>No scenarios to run</strong>
          <p>Create scenarios in Agent Studio, or clear filters if you expected existing tests.</p>
        </div>
      </div>
    </mat-card>
  </div>`,
  styles: [`.top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.actions,.filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cards{grid-template-columns:repeat(5,1fr);margin-bottom:16px}.scenario-table{border-collapse:collapse;width:100%}.scenario-table th{background:#f8fafc;color:#334155;text-align:left}.scenario-table th,.scenario-table td{border-top:1px solid #e5e7eb;padding:10px;vertical-align:top}.scenario-table p{margin:4px 0 0}.pill{background:#f1f5f9;border-radius:999px;color:#334155;display:inline-block;font-size:12px;font-weight:800;padding:4px 9px}.pill.pass{background:#dcfce7;color:#166534}.pill.fail{background:#fee2e2;color:#991b1b}.pill.skip{background:#fef3c7;color:#92400e}.muted{color:#64748b}.empty{padding:24px;text-align:center}pre{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;max-height:180px;overflow:auto;padding:8px;white-space:pre-wrap}@media(max-width:900px){.top{flex-direction:column}.cards{grid-template-columns:repeat(2,1fr)}}`]
})
export class ScenarioRegressionComponent implements OnInit {
  agents: any[] = [];
  environments: any[] = [];
  rows: ScenarioRow[] = [];
  agentFilter = 'all';
  statusFilter = 'all';
  environmentKey = 'dev';
  running = false;
  private storageKey = 'agentchain.scenarioRegressionResults';
  private results: Record<string, any> = {};

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.results = this.loadResults();
    this.api.environments().subscribe({ next: res => this.environments = res || [], error: _ => this.environments = [] });
    this.api.agents().subscribe(agents => {
      this.agents = agents || [];
      this.rows = [];
      for (const agent of this.agents) {
        const scenarios = agent.graphJson?.test_scenarios || agent.graphJson?.testScenarios || [];
        scenarios.forEach((scenario: any, index: number) => {
          const key = this.rowKey(agent, scenario, index);
          this.rows.push({ selected: false, agent, scenario: { ...scenario, index }, result: this.results[key] });
        });
      }
    });
  }

  filteredRows() {
    return this.rows.filter(row => {
      const status = row.result?.assertion || 'SKIP';
      return (this.agentFilter === 'all' || row.agent.id === this.agentFilter) && (this.statusFilter === 'all' || status === this.statusFilter);
    });
  }

  selectedCount() { return this.rows.filter(r => r.selected).length; }
  runningCount() { return this.rows.filter(r => r.result?.assertion === 'RUNNING').length; }
  countBy(status: string) { return this.rows.filter(r => (r.result?.assertion || 'SKIP') === status).length; }
  assertionLabel(type: string) {
    const labels: any = { answer_contains: 'Answer contains', tool_called: 'Tool called', missing_params: 'Missing params', human_approval: 'Human approval', guardrail_blocked: 'Guardrail blocked', cost_below: 'Cost below', tokens_below: 'Tokens below' };
    return labels[type || 'answer_contains'] || 'Answer contains';
  }
  toggleAllVisible(checked: boolean) { this.filteredRows().forEach(row => row.selected = checked); }
  runSelected() { this.runRows(this.rows.filter(row => row.selected)); }
  runOne(row: ScenarioRow) { this.runRows([row]); }

  private runRows(rows: ScenarioRow[]) {
    if (!rows.length) return;
    this.running = true;
    let remaining = rows.length;
    rows.forEach(row => this.execute(row, () => {
      remaining -= 1;
      if (remaining <= 0) this.running = false;
    }));
  }

  private execute(row: ScenarioRow, done: () => void) {
    const key = this.rowKey(row.agent, row.scenario, row.scenario.index);
    row.result = { assertion: 'RUNNING', startedAt: new Date().toISOString(), events: [] };
    this.persistResult(key, row.result);
    this.api.chat(row.agent.id, `regression-${Date.now()}-${Math.random()}`, row.scenario.message || '', row.agent.graphJson, undefined, [], this.environmentInput()).subscribe({
      next: res => {
        const runId = res.run_id || res.runId || res.id;
        row.result = { ...row.result, runId, answer: res.answer || res.output?.answer || res.message || '' };
        if (!runId) {
          row.result = this.finalResult(row, row.result, []);
          this.persistResult(key, row.result);
          done();
          return;
        }
        let source: EventSource | null = null;
        source = this.api.streamRun(runId, event => {
          const events = [...(row.result?.events || []), this.previewEvent(event)].slice(-60);
          const answer = event.output?.answer || event.output?.content || event.update?.answer || row.result?.answer || '';
          row.result = { ...row.result, events, answer };
          if (['done', 'error', 'aborted'].includes(event.status)) {
            source?.close();
            row.result = this.finalResult(row, row.result, events);
            this.persistResult(key, row.result);
            done();
          }
        }, err => {
          row.result = { ...row.result, assertion: 'FAIL', message: err?.message || 'Execution preview failed', finishedAt: new Date().toISOString() };
          this.persistResult(key, row.result);
          done();
        });
      },
      error: err => {
        row.result = { assertion: 'FAIL', message: err?.error?.message || err?.message || 'Scenario failed to start', finishedAt: new Date().toISOString(), events: [] };
        this.persistResult(key, row.result);
        done();
      }
    });
  }

  private finalResult(row: ScenarioRow, result: any, events: any[]) {
    const assertion = this.assertScenario(row.scenario, result?.answer || '', events);
    return { ...result, assertion, finishedAt: new Date().toISOString() };
  }

  private assertScenario(scenario: any, answer: string, events: any[]): 'PASS' | 'FAIL' | 'SKIP' {
    const expected = String(scenario.expected || '').trim();
    const text = `${answer}\n${JSON.stringify(events)}`.toLowerCase();
    const type = scenario.assertionType || 'answer_contains';
    if (type === 'tool_called') return text.includes('tool') && (!expected || text.includes(expected.toLowerCase())) ? 'PASS' : 'FAIL';
    if (type === 'missing_params') return text.includes('missing') || text.includes('required') ? 'PASS' : 'FAIL';
    if (type === 'human_approval') return text.includes('awaiting_human') || text.includes('approval') || text.includes('human') ? 'PASS' : 'FAIL';
    if (type === 'guardrail_blocked') return text.includes('guardrail') || text.includes('blocked') || text.includes('cannot') || text.includes('not allowed') ? 'PASS' : 'FAIL';
    if (type === 'cost_below') return this.numberFromEvents(events, 'cost') <= Number(expected || 0) ? 'PASS' : 'FAIL';
    if (type === 'tokens_below') return this.numberFromEvents(events, 'tokens') <= Number(expected || 0) ? 'PASS' : 'FAIL';
    if (!expected) return 'SKIP';
    const lower = expected.toLowerCase();
    if (lower.includes('missing') && lower.includes('parameter')) return text.includes('missing') || text.includes('required') ? 'PASS' : 'FAIL';
    if (lower.includes('approval') || lower.includes('human')) return text.includes('awaiting_human') || text.includes('approval') || text.includes('human') ? 'PASS' : 'FAIL';
    if (lower.includes('guardrail') || lower.includes('refuse') || lower.includes('blocked')) return text.includes('guardrail') || text.includes('blocked') || text.includes('cannot') || text.includes('not allowed') ? 'PASS' : 'FAIL';
    const words = lower.split(/[^a-z0-9]+/).filter(w => w.length > 3).slice(0, 8);
    if (!words.length) return 'SKIP';
    return words.some(word => text.includes(word)) ? 'PASS' : 'FAIL';
  }
  private numberFromEvents(events: any[], kind: 'cost' | 'tokens'): number {
    const raw = JSON.stringify(events || []);
    const regex = kind === 'cost' ? /"?(?:totalCostUsd|total_cost_usd|cost)"?\s*:\s*([0-9.]+)/gi : /"?(?:totalTokens|total_tokens)"?\s*:\s*([0-9.]+)/gi;
    let max = 0; let match: RegExpExecArray | null;
    while ((match = regex.exec(raw))) max = Math.max(max, Number(match[1] || 0));
    return max;
  }

  private previewEvent(event: any) {
    return { status: event?.status, node: event?.node_id || event?.nodeId, type: event?.node_type || event?.nodeType, update: event?.update || event?.payload || event?.output || event?.error || event?.reason };
  }

  private environmentInput() {
    const selected = this.environments.find(env => env.environmentKey === this.environmentKey);
    return { environmentKey: this.environmentKey || 'dev', environment: { key: this.environmentKey || 'dev', config: selected?.configJson || {} } };
  }

  private rowKey(agent: any, scenario: any, index: number) {
    return `${agent.id}:${scenario.id || scenario.name || index}:${index}`;
  }
  private loadResults(): Record<string, any> {
    try { return JSON.parse(localStorage.getItem(this.storageKey) || '{}'); } catch { return {}; }
  }
  private persistResult(key: string, result: any) {
    this.results[key] = result;
    localStorage.setItem(this.storageKey, JSON.stringify(this.results));
  }
}
