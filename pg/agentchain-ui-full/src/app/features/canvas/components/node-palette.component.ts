import { Component, EventEmitter, Output } from '@angular/core';
import { NodeType } from '../../../shared/models/canvas';
import { NODE_GROUPS, nodeDisplayName, nodeLabel } from '../../../shared/utils/default-config';

@Component({
  selector: 'app-node-palette',
  template: `
    <div class="palette">
      <mat-form-field appearance="outline" class="search">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="query" placeholder="Search Components">
        <button mat-icon-button matSuffix type="button" *ngIf="query" (click)="query=''"><mat-icon>close</mat-icon></button>
      </mat-form-field>
      <section *ngFor="let group of filteredGroups()" class="group" [class]="groupTone(group.name)">
        <button type="button" class="group-title" (click)="toggle(group.name)">
          <span>{{group.name}}</span>
          <mat-icon>{{collapsed[group.name] ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}}</mat-icon>
        </button>
        <div class="tiles" *ngIf="!collapsed[group.name]">
          <button type="button" class="tile" *ngFor="let t of group.types" (click)="add.emit(t)" [title]="displayName(t)">
            <mat-icon>{{icon(t)}}</mat-icon>
            <span>{{label(t)}}</span>
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .palette{display:flex;flex-direction:column;gap:8px;height:100%;overflow:auto;padding:0 2px 8px}
    .search{width:100%;margin-bottom:8px}
    :host ::ng-deep .search .mat-mdc-form-field-subscript-wrapper{display:none}
    :host ::ng-deep .search .mat-mdc-text-field-wrapper{height:36px;background:#fff}
    :host ::ng-deep .search .mat-mdc-form-field-flex{height:36px;align-items:center}
    .group{border-radius:8px;padding:10px 12px 12px}
    .group.io{background:#e9fbfb}.group.ai{background:#f4edff}.group.memory{background:#eef9ef}.group.tools{background:#fff8ed}.group.flow{background:#eef5ff}
    .group-title{align-items:center;background:transparent;border:0;color:#111827;cursor:pointer;display:flex;font-size:16px;font-weight:500;justify-content:space-between;letter-spacing:0;margin:0 0 10px;padding:0;width:100%}
    .tiles{display:grid;gap:9px;grid-template-columns:1fr 1fr}
    .tile{align-items:center;background:#fff;border:1px solid #d7e8ee;border-radius:7px;color:#111827;cursor:pointer;display:flex;flex-direction:column;font-size:12px;gap:8px;height:66px;justify-content:center;padding:8px;text-align:center}
    .tile mat-icon{font-size:23px;height:23px;width:23px}
    .io .tile mat-icon{color:#0ea5a5}.ai .tile mat-icon{color:#7c3aed}.memory .tile mat-icon{color:#2f9e44}.tools .tile mat-icon{color:#d97706}.flow .tile mat-icon{color:#2563eb}
    .tile:hover{border-color:#3b82f6;box-shadow:0 0 0 3px #3b82f61a}
    .tile span{line-height:1.15;overflow-wrap:anywhere}
  `]
})
export class NodePaletteComponent {
  groups = NODE_GROUPS;
  query = '';
  collapsed: Record<string, boolean> = {};
  @Output() add = new EventEmitter<NodeType>();

  label(type: NodeType) { return nodeLabel(type); }
  displayName(type: NodeType) { return nodeDisplayName(type); }
  toggle(name: string) { this.collapsed[name] = !this.collapsed[name]; }
  filteredGroups() {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.groups;
    return this.groups
      .map(group => ({ ...group, types: group.types.filter(t => `${this.label(t)} ${this.displayName(t)} ${t}`.toLowerCase().includes(q)) }))
      .filter(group => group.types.length);
  }
  groupTone(name: string) {
    const value = name.toLowerCase();
    if (value.includes('input')) return 'io';
    if (value.includes('ai') || value.includes('agent')) return 'ai';
    if (value.includes('memory') || value.includes('rag')) return 'memory';
    if (value.includes('tool')) return 'tools';
    return 'flow';
  }
  icon(type: NodeType) {
    const icons: Record<NodeType, string> = {
      START: 'forum',
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
}
