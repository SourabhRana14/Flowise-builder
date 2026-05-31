import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-memory',
  template: `
  <div class="page">
    <div class="top">
      <div>
        <h2>Memory Config</h2>
        <p class="muted">Configure short-term and long-term memory backends for agent canvas memory nodes.</p>
      </div>
      <button mat-raised-button color="primary" (click)="create()"><mat-icon>add</mat-icon>Create Memory Config</button>
    </div>

      <mat-card *ngIf="showForm" class="form-card">
        <h3>{{cfg.id ? 'Edit Memory Config' : 'Create Memory Config'}}</h3>
        <mat-form-field class="full-width"><mat-label>Name</mat-label><input matInput [(ngModel)]="cfg.name"></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Namespace</mat-label><input matInput [(ngModel)]="cfg.namespace"></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Memory Type</mat-label><mat-select [(ngModel)]="cfg.tier"><mat-option value="session">Short-term / session</mat-option><mat-option value="longterm">Long-term</mat-option><mat-option value="both">Both</mat-option></mat-select></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Backend</mat-label><mat-select [(ngModel)]="cfg.backend"><mat-option value="IN_MEMORY">In-memory</mat-option><mat-option value="REDIS">Redis</mat-option></mat-select></mat-form-field>
        <mat-form-field class="full-width" *ngIf="cfg.backend === 'REDIS'"><mat-label>Redis URL</mat-label><input matInput [(ngModel)]="cfg.redisUrl" [placeholder]="redisPlaceholder"></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Key Prefix</mat-label><input matInput [(ngModel)]="cfg.keyPrefix"></mat-form-field>
        <div class="grid two-small">
          <mat-form-field><mat-label>TTL seconds</mat-label><input matInput type="number" [(ngModel)]="cfg.sessionTtlS"></mat-form-field>
          <mat-form-field><mat-label>Long-term Top K</mat-label><input matInput type="number" [(ngModel)]="cfg.longtermTopK"></mat-form-field>
        </div>
        <mat-form-field class="full-width"><mat-label>Similarity Threshold</mat-label><input matInput type="number" step="0.01" [(ngModel)]="cfg.similarityThreshold"></mat-form-field>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="save()">Save Memory Config</button>
          <button mat-button (click)="clear()">Clear</button>
        </div>
      </mat-card>

      <mat-card>
        <div class="table-head"><h3>Saved Memory Configs</h3><div class="actions"><button mat-button color="warn" (click)="deleteSelected()" [disabled]="selectedCount() === 0">Delete Selected</button><button mat-button (click)="load()">Refresh</button></div></div>
        <table mat-table [dataSource]="items">
          <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)"></th><td mat-cell *matCellDef="let m"><input type="checkbox" [checked]="selected[m.id]" (change)="toggle(m.id,$event)"></td></ng-container>
          <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let m">{{m.name}}</td></ng-container>
          <ng-container matColumnDef="tier"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let m">{{m.tier}}</td></ng-container>
          <ng-container matColumnDef="backend"><th mat-header-cell *matHeaderCellDef>Backend</th><td mat-cell *matCellDef="let m">{{m.backend || 'IN_MEMORY'}}</td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let m"><button mat-button (click)="edit(m)">Edit</button><button mat-button color="warn" (click)="delete(m)">Delete</button></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr><tr mat-row *matRowDef="let row;columns:cols"></tr>
        </table>
        <mat-paginator [length]="total" [pageIndex]="page.pageIndex" [pageSize]="page.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"></mat-paginator>
      </mat-card>
  </div>`,
  styles: [`.top,.table-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.form-card{margin-bottom:16px;max-width:560px}.two-small{grid-template-columns:1fr 1fr}.full-width,table{width:100%}.actions{display:flex;gap:8px}`]
})
export class MemoryComponent implements OnInit {
  cfg: any = this.blank();
  items: any[] = [];
  cols = ['select', 'name', 'tier', 'backend', 'actions'];
  pageSizeOptions = [10, 25, 50];
  page = { pageIndex: 0, pageSize: 10 };
  total = 0;
  redisPlaceholder = 'redis://localhost:6379/0';
  showForm = false;
  selected: Record<string, boolean> = {};

  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.memoryConfigsPage(this.page.pageIndex, this.page.pageSize).subscribe(x => { this.items = x?.content || []; this.total = x?.totalElements || 0; this.pruneSelection(); }); }
  onPage(event: any) { this.page = event; this.load(); }
  create() { this.cfg = this.blank(); this.showForm = true; }
  save() {
    const call = this.cfg.id ? this.api.updateMemoryConfig(this.cfg.id, this.cfg) : this.api.saveMemoryConfig(this.cfg);
    call.subscribe(() => { this.clear(); this.load(); });
  }
  edit(m: any) { this.cfg = { backend: 'IN_MEMORY', ...m }; this.showForm = true; }
  delete(m: any) { if (confirm(`Delete memory config "${m.name}"?`)) this.api.deleteMemoryConfig(m.id).subscribe(() => this.load()); }
  clear() { this.cfg = this.blank(); this.showForm = false; }
  toggle(id: string, event: Event) { this.selected[id] = (event.target as HTMLInputElement).checked; }
  toggleAll(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.items.forEach(m => this.selected[m.id] = checked); }
  selectedCount() { return this.items.filter(m => this.selected[m.id]).length; }
  allSelected() { return this.items.length > 0 && this.selectedCount() === this.items.length; }
  deleteSelected() { const rows = this.items.filter(m => this.selected[m.id]); if (!rows.length || !confirm(`Delete ${rows.length} selected memory config${rows.length === 1 ? '' : 's'}?`)) return; forkJoin(rows.map(m => this.api.deleteMemoryConfig(m.id))).subscribe(() => { rows.forEach(m => delete this.selected[m.id]); this.load(); }); }
  private pruneSelection() { const ids = new Set(this.items.map(m => m.id)); Object.keys(this.selected).forEach(id => { if (!ids.has(id)) delete this.selected[id]; }); }
  private blank() { return { name: 'Default Memory', namespace: 'default', tier: 'both', backend: 'IN_MEMORY', redisUrl: 'redis://localhost:6379/0', keyPrefix: 'agentchain', retentionPolicy: 'TTL', sessionTtlS: 3600, longtermTopK: 5, similarityThreshold: .72, enabled: true }; }
}
