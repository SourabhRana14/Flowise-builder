import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-credentials',
  template: `
  <div class="page">
    <div class="top">
      <div><h2>Credentials</h2><p class="muted">Store encrypted credentials for tools and providers.</p></div>
      <button mat-raised-button color="primary" (click)="create()"><mat-icon>add</mat-icon>Create Credential</button>
    </div>
    <mat-card *ngIf="showForm" class="form-card">
      <h3>{{form.id ? 'Update Credential' : 'Create Credential'}}</h3>
      <mat-form-field class="full-width"><mat-label>Name</mat-label><input matInput [(ngModel)]="form.name"></mat-form-field>
      <mat-form-field><mat-label>Type</mat-label><mat-select [(ngModel)]="form.type"><mat-option value="API_KEY">API Key</mat-option><mat-option value="BEARER">Bearer Token</mat-option><mat-option value="BASIC">Basic</mat-option><mat-option value="CUSTOM">Custom</mat-option></mat-select></mat-form-field>
      <mat-form-field class="full-width"><mat-label>Secret value</mat-label><input matInput type="password" [(ngModel)]="form.value" [placeholder]="form.id ? 'Leave blank to keep current value' : ''"></mat-form-field>
      <mat-form-field class="full-width"><mat-label>Metadata JSON</mat-label><textarea rows="4" matInput [(ngModel)]="metadataText"></textarea></mat-form-field>
      <div class="actions"><button mat-raised-button color="primary" (click)="save()">Save</button><button mat-button (click)="cancel()">Cancel</button></div>
    </mat-card>
    <mat-card>
      <div class="table-head"><h3>Saved Credentials</h3><div class="actions"><button mat-button color="warn" (click)="deleteSelected()" [disabled]="selectedCount() === 0">Delete Selected</button><button mat-button (click)="load()">Refresh</button></div></div>
      <table mat-table [dataSource]="credentials">
        <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)"></th><td mat-cell *matCellDef="let c"><input type="checkbox" [checked]="selected[c.id]" (change)="toggle(c.id,$event)"></td></ng-container>
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let c">{{c.name}}</td></ng-container>
        <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let c">{{c.type}}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let c">{{c.status}}</td></ng-container>
        <ng-container matColumnDef="value"><th mat-header-cell *matHeaderCellDef>Value</th><td mat-cell *matCellDef="let c">{{c.value}}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let c"><button mat-button (click)="test(c)">Test</button><button mat-button (click)="edit(c)">Update</button><button mat-button color="warn" (click)="delete(c)">Delete</button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr><tr mat-row *matRowDef="let row;columns:cols"></tr>
      </table>
      <mat-paginator [length]="total" [pageIndex]="page.pageIndex" [pageSize]="page.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"></mat-paginator>
    </mat-card>
  </div>`,
  styles: [`.top,.table-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.form-card{margin-bottom:16px}.full-width,table{width:100%}.actions{display:flex;gap:8px}.muted{color:#64748b}`]
})
export class CredentialsComponent implements OnInit {
  credentials: any[] = []; cols = ['select','name','type','status','value','actions']; showForm = false; form: any = {}; metadataText = '{}';
  selected: Record<string, boolean> = {};
  pageSizeOptions = [10, 25, 50]; page = { pageIndex: 0, pageSize: 10 };
  total = 0;
  constructor(private api: ApiService) {}
  ngOnInit(){ this.load(); }
  load(){ this.api.credentialsPage(this.page.pageIndex, this.page.pageSize).subscribe(x => { this.credentials = x?.content || []; this.total = x?.totalElements || 0; this.pruneSelection(); }); }
  onPage(event:any){ this.page = event; this.load(); }
  create(){ this.form = { type: 'API_KEY', status: 'ACTIVE', value: '' }; this.metadataText = '{}'; this.showForm = true; }
  edit(c:any){ this.form = { ...c, value: '' }; this.metadataText = JSON.stringify(c.metadata || {}, null, 2); this.showForm = true; }
  cancel(){ this.showForm = false; this.form = {}; }
  save(){ let metadata = {}; try { metadata = JSON.parse(this.metadataText || '{}'); } catch { alert('Metadata must be valid JSON'); return; } const body = { ...this.form, metadata }; if (!body.value) delete body.value; const call = body.id ? this.api.updateCredential(body.id, body) : this.api.saveCredential(body); call.subscribe(() => { this.cancel(); this.load(); }); }
  delete(c:any){ if(confirm(`Delete credential "${c.name}"?`)) this.api.deleteCredential(c.id).subscribe(() => this.load()); }
  test(c:any){ this.api.testCredential(c.id).subscribe(r => alert(`${r.status}: ${r.masked || ''}`)); }
  toggle(id:string,event:Event){ this.selected[id] = (event.target as HTMLInputElement).checked; }
  toggleAll(event:Event){ const checked = (event.target as HTMLInputElement).checked; this.credentials.forEach(c => this.selected[c.id] = checked); }
  selectedCount(){ return this.credentials.filter(c => this.selected[c.id]).length; }
  allSelected(){ return this.credentials.length > 0 && this.selectedCount() === this.credentials.length; }
  deleteSelected(){ const rows = this.credentials.filter(c => this.selected[c.id]); if(!rows.length || !confirm(`Delete ${rows.length} selected credential${rows.length === 1 ? '' : 's'}?`)) return; forkJoin(rows.map(c => this.api.deleteCredential(c.id))).subscribe(() => { rows.forEach(c => delete this.selected[c.id]); this.load(); }); }
  private pruneSelection(){ const ids = new Set(this.credentials.map(c => c.id)); Object.keys(this.selected).forEach(id => { if(!ids.has(id)) delete this.selected[id]; }); }
}
