import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-alerts',
  template: `
  <div class="page">
    <div class="top">
      <div><h2>Alerts</h2><p class="muted">Manage operational alerts and acknowledgements.</p></div>
      <button mat-raised-button color="primary" (click)="create()"><mat-icon>add</mat-icon>Create Alert</button>
    </div>

    <mat-card *ngIf="showForm" class="form-card">
      <h3>{{form.id ? 'Update Alert' : 'Create Alert'}}</h3>
      <div class="grid form-grid">
        <mat-form-field><mat-label>Type</mat-label><input matInput [(ngModel)]="form.alertType"></mat-form-field>
        <mat-form-field><mat-label>Severity</mat-label><mat-select [(ngModel)]="form.severity"><mat-option value="INFO">INFO</mat-option><mat-option value="WARN">WARN</mat-option><mat-option value="ERROR">ERROR</mat-option><mat-option value="CRITICAL">CRITICAL</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>Status</mat-label><mat-select [(ngModel)]="form.status"><mat-option value="OPEN">OPEN</mat-option><mat-option value="ACKNOWLEDGED">ACKNOWLEDGED</mat-option><mat-option value="RESOLVED">RESOLVED</mat-option></mat-select></mat-form-field>
      </div>
      <mat-form-field class="full-width"><mat-label>Message</mat-label><textarea matInput rows="4" [(ngModel)]="form.message"></textarea></mat-form-field>
      <div class="actions"><button mat-raised-button color="primary" (click)="save()">{{form.id ? 'Update' : 'Create'}}</button><button mat-button (click)="cancel()">Cancel</button></div>
    </mat-card>

    <mat-card>
      <div class="table-head"><h3>Alert List</h3><div class="actions"><button mat-button color="primary" (click)="ackSelected()" [disabled]="selectedCount() === 0">Acknowledge Selected</button><button mat-button color="warn" (click)="deleteSelected()" [disabled]="selectedCount() === 0">Delete Selected</button><button mat-button (click)="load()">Refresh</button></div></div>
      <table mat-table [dataSource]="alerts">
        <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)"></th><td mat-cell *matCellDef="let a"><input type="checkbox" [checked]="selected[a.id]" (change)="toggle(a.id,$event)"></td></ng-container>
        <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let a">{{a.alertType || a.alert_type}}</td></ng-container>
        <ng-container matColumnDef="severity"><th mat-header-cell *matHeaderCellDef>Severity</th><td mat-cell *matCellDef="let a">{{a.severity}}</td></ng-container>
        <ng-container matColumnDef="message"><th mat-header-cell *matHeaderCellDef>Message</th><td mat-cell *matCellDef="let a">{{a.message}}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let a">{{a.status || 'OPEN'}}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let a"><button mat-button color="primary" (click)="ack(a)" [disabled]="(a.status || 'OPEN') === 'ACKNOWLEDGED'">Acknowledge</button><button mat-button (click)="edit(a)">Update</button><button mat-button color="warn" (click)="delete(a)">Delete</button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row;columns:cols"></tr>
      </table>
      <mat-paginator [length]="total" [pageIndex]="page.pageIndex" [pageSize]="page.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"></mat-paginator>
    </mat-card>
  </div>`,
  styles: [`.top,.table-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.form-card{margin-bottom:16px}.form-grid{grid-template-columns:repeat(3,minmax(180px,1fr))}.full-width,table{width:100%}.actions{display:flex;gap:8px}`]
})
export class AlertsComponent implements OnInit {
  alerts: any[] = [];
  cols = ['select', 'type', 'severity', 'message', 'status', 'actions'];
  pageSizeOptions = [10, 25, 50];
  page = { pageIndex: 0, pageSize: 10 };
  total = 0;
  showForm = false;
  form: any = this.blank();
  selected: Record<string, boolean> = {};
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.alertsPage(this.page.pageIndex, this.page.pageSize).subscribe({ next: r => { this.alerts = r?.content || []; this.total = r?.totalElements || 0; this.pruneSelection(); }, error: _ => { this.alerts = []; this.total = 0; this.selected = {}; } }); }
  onPage(event: any) { this.page = event; this.load(); }
  create() { this.form = this.blank(); this.showForm = true; }
  edit(a: any) { this.form = { ...a }; this.showForm = true; }
  cancel() { this.showForm = false; this.form = this.blank(); }
  save() {
    const call = this.form.id ? this.api.updateAlert(this.form.id, this.form) : this.api.createAlert(this.form);
    call.subscribe(() => { this.cancel(); this.load(); });
  }
  ack(a: any) { this.api.ackAlert(a.id).subscribe(() => this.load()); }
  delete(a: any) { if (confirm(`Delete alert "${a.message}"?`)) this.api.deleteAlert(a.id).subscribe(() => this.load()); }
  toggle(id: string, event: Event) { this.selected[id] = (event.target as HTMLInputElement).checked; }
  toggleAll(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.alerts.forEach(a => this.selected[a.id] = checked); }
  selectedCount() { return this.alerts.filter(a => this.selected[a.id]).length; }
  allSelected() { return this.alerts.length > 0 && this.selectedCount() === this.alerts.length; }
  ackSelected() { const rows = this.alerts.filter(a => this.selected[a.id]); if (!rows.length) return; forkJoin(rows.map(a => this.api.ackAlert(a.id))).subscribe(() => this.load()); }
  deleteSelected() { const rows = this.alerts.filter(a => this.selected[a.id]); if (!rows.length || !confirm(`Delete ${rows.length} selected alert${rows.length === 1 ? '' : 's'}?`)) return; forkJoin(rows.map(a => this.api.deleteAlert(a.id))).subscribe(() => { rows.forEach(a => delete this.selected[a.id]); this.load(); }); }
  private pruneSelection() { const ids = new Set(this.alerts.map(a => a.id)); Object.keys(this.selected).forEach(id => { if (!ids.has(id)) delete this.selected[id]; }); }
  private blank() { return { alertType: 'SYSTEM', severity: 'INFO', status: 'OPEN', message: '' }; }
}
