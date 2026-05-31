import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface TemplateCard {
  name: string;
  category: string;
  icon: string;
  description: string;
  agentName?: string;
  action: 'open-agent' | 'studio' | 'create-generic' | 'create-multi';
}

@Component({
  selector: 'app-templates',
  template: `
    <div class="page templates-page">
      <div class="hero">
        <div>
          <h2>Agent Templates</h2>
          <p class="muted">Start from ready-made agents, reusable workflow patterns, or guided Studio setup.</p>
        </div>
        <button mat-raised-button color="primary" routerLink="/studio"><mat-icon>auto_awesome</mat-icon>Create from Studio</button>
      </div>

      <div class="template-grid">
        <mat-card class="template-card" *ngFor="let t of templates" (click)="openTemplate(t)" tabindex="0" (keyup.enter)="openTemplate(t)">
          <div class="card-top">
            <span class="icon"><mat-icon>{{t.icon}}</mat-icon></span>
            <span class="category">{{t.category}}</span>
          </div>
          <h3>{{t.name}}</h3>
          <p>{{t.description}}</p>
          <button mat-stroked-button color="primary" type="button" (click)="openTemplate(t); $event.stopPropagation()">
            {{buttonLabel(t)}}
          </button>
        </mat-card>
      </div>

      <mat-card class="status-card" *ngIf="message">
        {{message}}
      </mat-card>
    </div>
  `,
  styles: [`
    .templates-page{padding:28px}.hero{align-items:center;display:flex;justify-content:space-between;margin-bottom:18px}.hero h2{font-size:30px;margin:0 0 6px}.template-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.template-card{border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 6px 18px #0f172a10;cursor:pointer;display:flex;flex-direction:column;gap:10px;min-height:210px;padding:18px}.template-card:hover{border-color:#2563eb;box-shadow:0 10px 28px #2563eb22;transform:translateY(-1px)}.card-top{align-items:center;display:flex;justify-content:space-between}.icon{align-items:center;background:#e8f2ff;border-radius:10px;color:#1d5f99;display:flex;height:48px;justify-content:center;width:48px}.icon mat-icon{font-size:28px;height:28px;width:28px}.category{background:#f1f5f9;border-radius:999px;color:#475569;font-size:12px;font-weight:800;padding:6px 10px}.template-card h3{font-size:19px;margin:2px 0 0}.template-card p{color:#5b6b82;line-height:1.45;margin:0;min-height:42px}.template-card button{align-self:flex-start;margin-top:auto}.status-card{margin-top:16px;color:#475569}
  `]
})
export class TemplatesComponent implements OnInit {
  agents: any[] = [];
  message = '';
  templates: TemplateCard[] = [
    { name: 'KYC Agent', category: 'Sample business service', icon: 'verified_user', agentName: 'KYC Agent', action: 'open-agent', description: 'End-to-end KYC onboarding, status lookup, checks, update, decision, and human approval workflow.' },
    { name: 'Fraud Detection Agent', category: 'Sample business service', icon: 'policy', agentName: 'Fraud Detection Agent', action: 'open-agent', description: 'Fraud rules, CSV analysis, transaction lookup, upload history, and suspicious transaction summary.' },
    { name: 'RAG Knowledge Agent', category: 'Knowledge', icon: 'storage', agentName: 'RAG Knowledge Agent', action: 'open-agent', description: 'Retrieval-first agent for document Q&A using the default RAG collection and memory context.' },
    { name: 'Generic Workflow Template', category: 'Workflow', icon: 'account_tree', action: 'create-generic', description: 'Starter graph with input, LLM reasoning, optional tools, and output mapping.' },
    { name: 'Multi-Agent Template', category: 'Orchestration', icon: 'hub', action: 'create-multi', description: 'Supervisor and specialist agent pattern for routing work across multiple agents.' },
    { name: 'Create from Studio', category: 'Guided builder', icon: 'auto_awesome', action: 'studio', description: 'Use the guided builder for a business-first agent setup with readiness checks.' }
  ];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.agents().subscribe({ next: agents => this.agents = agents || [], error: _ => this.agents = [] });
  }

  buttonLabel(t: TemplateCard) {
    if (t.action === 'open-agent') return 'Open Agent';
    if (t.action === 'studio') return 'Open Studio';
    return 'Create Template';
  }

  openTemplate(t: TemplateCard) {
    if (t.action === 'studio') {
      this.router.navigate(['/studio']);
      return;
    }
    if (t.action === 'open-agent') {
      const agent = this.agents.find(a => String(a.name || '').toLowerCase() === String(t.agentName || '').toLowerCase());
      if (agent?.id) {
        this.router.navigate(['/agents', agent.id, 'canvas']);
      } else {
        this.message = `${t.agentName} is not available yet. Restart the control-plane after applying migrations on a blank DB, then refresh this page.`;
      }
      return;
    }
    this.router.navigate(['/agents'], { queryParams: { template: t.action === 'create-multi' ? 'multi-agent' : 'generic-workflow' } });
  }
}
