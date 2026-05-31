import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin',
  template: `
  <div class="page">
    <div class="top">
      <div><h2>Admin</h2><p class="muted">Manage platform users and roles.</p></div>
      <button mat-raised-button color="primary" (click)="create()"><mat-icon>add</mat-icon>Create User</button>
    </div>

    <mat-card *ngIf="showForm" class="form-card">
      <h3>{{form.id ? 'Update User' : 'Create User'}}</h3>
      <div class="grid form-grid">
        <mat-form-field><mat-label>Email</mat-label><input matInput [(ngModel)]="form.email"></mat-form-field>
        <mat-form-field><mat-label>Name</mat-label><input matInput [(ngModel)]="form.name"></mat-form-field>
        <mat-form-field><mat-label>Role</mat-label><mat-select [(ngModel)]="form.role"><mat-option value="ADMIN">ADMIN</mat-option><mat-option value="DEVELOPER">DEVELOPER</mat-option><mat-option value="VIEWER">VIEWER</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>Password</mat-label><input matInput type="password" [(ngModel)]="form.password" [placeholder]="form.id ? 'Leave blank to keep current password' : ''"></mat-form-field>
      </div>
      <div class="actions"><button mat-raised-button color="primary" (click)="save()">{{form.id ? 'Update' : 'Create'}}</button><button mat-button (click)="cancel()">Cancel</button></div>
    </mat-card>

    <mat-card>
      <div class="table-head"><h3>Users</h3><div class="actions"><button mat-button color="warn" (click)="deleteSelected()" [disabled]="selectedCount() === 0">Delete Selected</button><button mat-button (click)="load()">Refresh</button></div></div>
      <table mat-table [dataSource]="users">
        <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)"></th><td mat-cell *matCellDef="let u"><input type="checkbox" [checked]="selected[u.id]" (change)="toggle(u.id,$event)"></td></ng-container>
        <ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let u">{{u.email}}</td></ng-container>
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let u">{{u.name}}</td></ng-container>
        <ng-container matColumnDef="role"><th mat-header-cell *matHeaderCellDef>Role</th><td mat-cell *matCellDef="let u">{{u.role}}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let u"><button mat-button (click)="edit(u)">Update</button><button mat-button color="warn" (click)="delete(u)">Delete</button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row;columns:cols"></tr>
      </table>
      <mat-paginator [length]="total" [pageIndex]="page.pageIndex" [pageSize]="page.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"></mat-paginator>
    </mat-card>
  </div>`,
  styles: [`.top,.table-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.form-card{margin-bottom:16px}.form-grid{grid-template-columns:repeat(4,minmax(180px,1fr))}.actions{display:flex;gap:8px}table{width:100%}`]
})
export class AdminComponent implements OnInit {
  users: any[] = [];
  cols = ['select', 'email', 'name', 'role', 'actions'];
  pageSizeOptions = [10, 25, 50];
  page = { pageIndex: 0, pageSize: 10 };
  total = 0;
  form: any = this.blank();
  showForm = false;
  selected: Record<string, boolean> = {};

  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.usersPage(this.page.pageIndex, this.page.pageSize).subscribe({ next: r => { this.users = r?.content || []; this.total = r?.totalElements || 0; this.pruneSelection(); }, error: _ => { this.users = []; this.total = 0; this.selected = {}; } }); }
  onPage(event: any) { this.page = event; this.load(); }
  create() { this.form = this.blank(); this.showForm = true; }
  edit(u: any) { this.form = { ...u, password: '' }; this.showForm = true; }
  cancel() { this.showForm = false; this.form = this.blank(); }
  save() {
    if (!this.form.email || (!this.form.id && !this.form.password)) return;
    const body = { ...this.form };
    if (body.id && !body.password) delete body.password;
    const call = body.id ? this.api.updateUser(body.id, body) : this.api.createUser(body);
    call.subscribe(() => { this.cancel(); this.load(); });
  }
  delete(u: any) { if (confirm(`Delete user "${u.email}"?`)) this.api.deleteUser(u.id).subscribe(() => this.load()); }
  toggle(id: string, event: Event) { this.selected[id] = (event.target as HTMLInputElement).checked; }
  toggleAll(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.users.forEach(u => this.selected[u.id] = checked); }
  selectedCount() { return this.users.filter(u => this.selected[u.id]).length; }
  allSelected() { return this.users.length > 0 && this.selectedCount() === this.users.length; }
  deleteSelected() {
    const rows = this.users.filter(u => this.selected[u.id]);
    if (!rows.length || !confirm(`Delete ${rows.length} selected user${rows.length === 1 ? '' : 's'}?`)) return;
    forkJoin(rows.map(u => this.api.deleteUser(u.id))).subscribe(() => { rows.forEach(u => delete this.selected[u.id]); this.load(); });
  }
  private pruneSelection() { const ids = new Set(this.users.map(u => u.id)); Object.keys(this.selected).forEach(id => { if (!ids.has(id)) delete this.selected[id]; }); }
  private blank() { return { email: '', name: '', role: 'DEVELOPER', password: '' }; }
}
