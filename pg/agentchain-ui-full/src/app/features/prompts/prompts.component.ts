import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-prompts',
  template: `
  <div class="page">
    <div class="top">
      <div><h2>Prompt Manager</h2><p class="muted">Manage prompt templates, versions, and previews.</p></div>
      <button mat-raised-button color="primary" (click)="create()"><mat-icon>add</mat-icon>Create Prompt</button>
    </div>

    <mat-card *ngIf="showForm" class="form-card">
      <h3>{{form.id ? 'Update Prompt' : 'Create Prompt'}}</h3>
      <mat-form-field class="full-width"><mat-label>Name</mat-label><input matInput [(ngModel)]="form.name"></mat-form-field>
      <mat-form-field class="full-width"><mat-label>Required vars CSV</mat-label><input matInput [(ngModel)]="form.requiredVarsText" placeholder="message,context"></mat-form-field>
      <mat-form-field class="full-width"><mat-label>Prompt content</mat-label><textarea matInput rows="8" [(ngModel)]="form.content" [placeholder]="promptPlaceholder"></textarea></mat-form-field>
      <div class="actions"><button mat-raised-button color="primary" (click)="save()">{{form.id ? 'Update' : 'Create'}}</button><button mat-button (click)="cancel()">Cancel</button></div>
    </mat-card>

    <mat-card>
      <div class="table-head"><h3>Prompt Templates</h3><div class="actions"><button mat-button color="warn" (click)="deleteSelected()" [disabled]="selectedCount() === 0">Delete Selected</button><button mat-button (click)="load()">Refresh</button></div></div>
      <table mat-table [dataSource]="items">
        <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)"></th><td mat-cell *matCellDef="let p"><input type="checkbox" [checked]="selected[p.id]" (change)="toggle(p.id,$event)"></td></ng-container>
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let p">{{p.name}}</td></ng-container>
        <ng-container matColumnDef="vars"><th mat-header-cell *matHeaderCellDef>Required Vars</th><td mat-cell *matCellDef="let p">{{(p.requiredVars || []).join(', ')}}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let p"><button mat-button color="primary" (click)="select(p)">Versions</button><button mat-button (click)="edit(p)">Update</button><button mat-button color="warn" (click)="delete(p)">Delete</button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr><tr mat-row *matRowDef="let row;columns:cols"></tr>
      </table>
      <mat-paginator [length]="promptTotal" [pageIndex]="promptPage.pageIndex" [pageSize]="promptPage.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onPromptPage($event)"></mat-paginator>
    </mat-card>

    <mat-card class="form-card" *ngIf="selectedId">
      <h3>Versions / Preview</h3>
      <div class="grid two">
        <section>
          <mat-form-field class="full-width"><mat-label>New version content</mat-label><textarea matInput rows="5" [(ngModel)]="versionContent"></textarea></mat-form-field>
          <button mat-raised-button color="primary" (click)="saveVersion()">Add Version</button>
        </section>
        <section>
          <mat-form-field class="full-width"><mat-label>Preview variables JSON</mat-label><textarea matInput rows="4" [(ngModel)]="varsText"></textarea></mat-form-field>
          <button mat-button (click)="preview()">Preview</button>
          <pre *ngIf="previewResult">{{previewResult | json}}</pre>
        </section>
      </div>
      <table mat-table [dataSource]="versions">
        <ng-container matColumnDef="version"><th mat-header-cell *matHeaderCellDef>Version</th><td mat-cell *matCellDef="let v">{{v.version}}</td></ng-container>
        <ng-container matColumnDef="content"><th mat-header-cell *matHeaderCellDef>Content</th><td mat-cell *matCellDef="let v">{{v.content}}</td></ng-container>
        <tr mat-header-row *matHeaderRowDef="versionCols"></tr><tr mat-row *matRowDef="let row;columns:versionCols"></tr>
      </table>
      <mat-paginator [length]="versionTotal" [pageIndex]="versionPage.pageIndex" [pageSize]="versionPage.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onVersionPage($event)"></mat-paginator>
    </mat-card>
  </div>`,
  styles: [`.top,.table-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.form-card{margin-bottom:16px}.full-width,table{width:100%}.two{grid-template-columns:repeat(2,minmax(320px,1fr))}.actions{display:flex;gap:8px}pre{max-height:220px;overflow:auto}`]
})
export class PromptsComponent implements OnInit {
  promptPlaceholder = 'You are helpful. Question: {{message}}';
  items: any[] = []; versions: any[] = [];
  cols = ['select', 'name', 'vars', 'actions']; versionCols = ['version', 'content'];
  pageSizeOptions = [10, 25, 50];
  promptPage = { pageIndex: 0, pageSize: 10 };
  versionPage = { pageIndex: 0, pageSize: 10 };
  promptTotal = 0; versionTotal = 0;
  showForm = false; selectedId = ''; versionContent = ''; varsText = '{"message":"hello"}'; previewResult: any;
  selected: Record<string, boolean> = {};
  form: any = this.blank();
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.promptsPage(this.promptPage.pageIndex, this.promptPage.pageSize).subscribe(x => { this.items = x?.content || []; this.promptTotal = x?.totalElements || 0; this.pruneSelection(); }); }
  onPromptPage(event: any) { this.promptPage = event; this.load(); }
  onVersionPage(event: any) { this.versionPage = event; this.loadVersions(); }
  create() { this.form = this.blank(); this.showForm = true; }
  edit(p: any) { this.form = { ...p, requiredVarsText: (p.requiredVars || []).join(', ') }; this.showForm = true; }
  cancel() { this.showForm = false; this.form = this.blank(); }
  save() {
    const body = { ...this.form, requiredVars: String(this.form.requiredVarsText || '').split(',').map(x => x.trim()).filter(Boolean) };
    const call = body.id ? this.api.updatePrompt(body.id, body) : this.api.savePrompt(body);
    call.subscribe((p: any) => { this.selectedId = p.id; this.versionContent = body.content || ''; this.cancel(); this.load(); });
  }
  delete(p: any) { if (confirm(`Delete prompt "${p.name}"?`)) this.api.deletePrompt(p.id).subscribe(() => this.load()); }
  toggle(id: string, event: Event) { this.selected[id] = (event.target as HTMLInputElement).checked; }
  toggleAll(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.items.forEach(p => this.selected[p.id] = checked); }
  selectedCount() { return this.items.filter(p => this.selected[p.id]).length; }
  allSelected() { return this.items.length > 0 && this.selectedCount() === this.items.length; }
  deleteSelected() { const rows = this.items.filter(p => this.selected[p.id]); if (!rows.length || !confirm(`Delete ${rows.length} selected prompt${rows.length === 1 ? '' : 's'}?`)) return; forkJoin(rows.map(p => this.api.deletePrompt(p.id))).subscribe(() => { rows.forEach(p => delete this.selected[p.id]); this.load(); }); }
  private pruneSelection() { const ids = new Set(this.items.map(p => p.id)); Object.keys(this.selected).forEach(id => { if (!ids.has(id)) delete this.selected[id]; }); }
  select(p: any) { this.selectedId = p.id; this.versionContent = p.content || ''; this.loadVersions(); }
  loadVersions() { if (this.selectedId) this.api.promptVersionsPage(this.selectedId, this.versionPage.pageIndex, this.versionPage.pageSize).subscribe(x => { this.versions = x?.content || []; this.versionTotal = x?.totalElements || 0; }); }
  saveVersion() { if (this.selectedId) this.api.savePromptVersion(this.selectedId, { content: this.versionContent }).subscribe(() => this.loadVersions()); }
  preview() { let vars = {}; try { vars = JSON.parse(this.varsText || '{}'); } catch { alert('Invalid variables JSON'); return; } this.api.previewPrompt(this.selectedId, vars).subscribe(x => this.previewResult = x); }
  private blank() { return { name: 'Default Assistant', content: 'You are helpful. Answer: {{message}}', requiredVarsText: 'message' }; }
}
