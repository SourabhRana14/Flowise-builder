import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { starterGraph } from '../../shared/utils/default-config';

@Component({
  selector: 'app-agent-studio',
  template: `
  <div class="page studio-launcher">
    <div class="launcher-card">
      <div class="icon"><mat-icon>account_tree</mat-icon></div>
      <h2>Agent Studio</h2>
      <p class="muted">{{message}}</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Open existing agent</mat-label>
        <mat-select [(ngModel)]="selectedAgentId" [disabled]="busy">
          <mat-option value="">Choose an agent</mat-option>
          <mat-option *ngFor="let agent of agents" [value]="agent.id">{{agent.name}}</mat-option>
        </mat-select>
      </mat-form-field>
      <div class="actions" *ngIf="failed">
        <button mat-raised-button color="primary" (click)="openAgentList()"><mat-icon>list</mat-icon>Open Agents</button>
        <button mat-stroked-button color="primary" (click)="createCanvasAgent()"><mat-icon>add</mat-icon>Create Blank Canvas</button>
      </div>
      <div class="actions" *ngIf="!failed">
        <button mat-raised-button color="primary" [disabled]="busy || !selectedAgentId" (click)="openSelectedAgent()"><mat-icon>open_in_new</mat-icon>Open Canvas</button>
        <button mat-stroked-button color="primary" [disabled]="busy" (click)="createCanvasAgent()"><mat-icon>add</mat-icon>Create New Agent</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .studio-launcher{align-items:center;display:flex;justify-content:center;min-height:calc(100vh - 120px)}
    .launcher-card{align-items:center;border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 10px 30px #0f172a14;display:flex;flex-direction:column;gap:12px;max-width:520px;padding:36px;text-align:center}
    .icon{align-items:center;background:#e8f2ff;border-radius:12px;color:#1d5f99;display:flex;height:56px;justify-content:center;width:56px}
    .icon mat-icon{font-size:32px;height:32px;width:32px}
    h2{margin:0}
    .full-width{width:100%}
    .actions{display:flex;gap:10px;justify-content:center;margin-top:8px}
  `]
})
export class AgentStudioComponent implements OnInit {
  agents: any[] = [];
  selectedAgentId = '';
  message = 'Choose an existing agent or create a new canvas.';
  failed = false;
  busy = false;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const agentId = this.route.snapshot.queryParamMap.get('agentId') || this.route.snapshot.queryParamMap.get('id');
    if (agentId) {
      this.router.navigate(['/agents', agentId, 'canvas']);
      return;
    }
    this.loadAgents();
  }

  loadAgents() {
    this.api.agents().subscribe({
      next: agents => this.agents = agents || [],
      error: _ => {
        this.agents = [];
        this.failed = true;
        this.message = 'Unable to load agents. You can still try creating a new blank canvas.';
      }
    });
  }

  createCanvasAgent() {
    this.failed = false;
    this.busy = true;
    const name = `New Agent ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const graphJson = starterGraph(name);
    const body = {
      name,
      maxSteps: Number(graphJson.agent_config?.max_steps || 25),
      timeoutS: Number(graphJson.agent_config?.execution_timeout_s || 120),
      monthlyBudgetUsd: 100,
      embedEnabled: false,
      embedAllowedOrigins: 'http://localhost:*',
      embedTokenTtlS: 86400,
      graphJson
    };
    this.message = 'Creating a blank agent and opening the canvas...';
    this.api.createAgent(name).pipe(
      switchMap((agent: any) => this.api.updateAgent(agent.id, body))
    ).subscribe({
      next: (agent: any) => this.router.navigate(['/agents', agent.id, 'canvas']),
      error: err => {
        this.busy = false;
        this.failed = true;
        this.message = err?.error?.message || err?.error?.detail || 'Unable to create the canvas agent. Open Agents and try again.';
      }
    });
  }

  openSelectedAgent() {
    if (!this.selectedAgentId) return;
    this.router.navigate(['/agents', this.selectedAgentId, 'canvas']);
  }

  openAgentList() {
    this.router.navigate(['/agents']);
  }
}
