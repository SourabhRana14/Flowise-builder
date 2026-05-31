import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-publish-approvals',
  template: `
  <div class="page">
    <div class="top"><div><h2>Publish Approvals</h2><p class="muted">Approve or reject production publish requests.</p></div><button mat-button (click)="load()">Refresh</button></div>
    <mat-card>
      <div class="approval-row head"><span>Agent</span><span>Environment</span><span>Status</span><span>Comments</span><span>Action</span></div>
      <div class="approval-row" *ngFor="let item of approvals">
        <span>{{item.agentId}}</span>
        <span>{{item.environmentKey}}</span>
        <span>{{item.status}}</span>
        <mat-form-field><mat-label>Comments</mat-label><input matInput [(ngModel)]="item.comments"></mat-form-field>
        <span><button mat-button color="primary" (click)="review(item,true)" [disabled]="item.status !== 'PENDING'">Approve</button><button mat-button color="warn" (click)="review(item,false)" [disabled]="item.status !== 'PENDING'">Reject</button></span>
      </div>
      <p class="muted empty" *ngIf="!approvals.length">No pending approvals.</p>
    </mat-card>
  </div>`,
  styles: [`.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.muted{color:#64748b}.approval-row{display:grid;grid-template-columns:1.4fr .8fr .7fr 1.4fr 1fr;gap:10px;align-items:center;border-top:1px solid #e5e7eb;padding:10px}.approval-row.head{background:#f8fafc;font-weight:800;border-top:0}.empty{text-align:center;padding:20px}`]
})
export class PublishApprovalsComponent implements OnInit {
  approvals: any[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.publishApprovalInbox('PENDING').subscribe({ next: rows => this.approvals = rows || [], error: _ => this.approvals = [] }); }
  review(item: any, approved: boolean) { this.api.reviewApprovalInbox(item.id, { approved, comments: item.comments || '' }).subscribe(() => this.load()); }
}
