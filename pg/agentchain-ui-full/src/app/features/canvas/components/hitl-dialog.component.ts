import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-hitl-dialog',
  template: `
    <h2 mat-dialog-title>{{payload.title || 'Human Input Required'}}</h2>
    <mat-dialog-content class="hitl-content">
      <p class="message">{{payload.message || 'Agent is waiting for approval/input.'}}</p>

      <section class="details" *ngIf="detailRows().length">
        <h3>Task Details</h3>
        <div class="detail-row" *ngFor="let row of detailRows()">
          <span>{{label(row.key)}}</span>
          <pre>{{format(row.value)}}</pre>
        </div>
      </section>

      <section class="form" *ngIf="fields().length; else legacyResponse">
        <h3>Submit Details</h3>
        <ng-container *ngFor="let field of fields()">
          <mat-form-field class="full-width" *ngIf="field.type !== 'checkbox' && field.type !== 'select' && field.type !== 'textarea'">
            <mat-label>{{field.label}}</mat-label>
            <input matInput [type]="field.type || 'text'" [(ngModel)]="form[field.key]" [required]="field.required">
          </mat-form-field>

          <mat-form-field class="full-width" *ngIf="field.type === 'textarea'">
            <mat-label>{{field.label}}</mat-label>
            <textarea matInput rows="4" [(ngModel)]="form[field.key]" [required]="field.required"></textarea>
          </mat-form-field>

          <mat-form-field class="full-width" *ngIf="field.type === 'select'">
            <mat-label>{{field.label}}</mat-label>
            <mat-select [(ngModel)]="form[field.key]" [required]="field.required">
              <mat-option *ngFor="let option of field.options" [value]="option">{{option}}</mat-option>
            </mat-select>
          </mat-form-field>

          <label class="checkbox-field" *ngIf="field.type === 'checkbox'">
            <input type="checkbox" [(ngModel)]="form[field.key]">
            <span>{{field.label}}</span>
          </label>
        </ng-container>
      </section>

      <ng-template #legacyResponse>
        <mat-form-field class="full-width">
          <mat-label>Response</mat-label>
          <textarea matInput rows="5" [(ngModel)]="response"></textarea>
        </mat-form-field>
      </ng-template>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="close()">Submit</button>
    </mat-dialog-actions>
  `,
  styles: [`.hitl-content{min-width:520px;max-width:720px}.message{color:#334155;line-height:1.5}.details,.form{border-top:1px solid #e5e7eb;margin-top:14px;padding-top:12px}.details h3,.form h3{font-size:14px;margin:0 0 10px;color:#0f172a}.detail-row{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;overflow:hidden}.detail-row span{background:#f8fafc;color:#475569;display:block;font-size:12px;font-weight:800;padding:7px 9px;text-transform:uppercase}.detail-row pre{background:#fff;color:#0f172a;font-size:12px;margin:0;max-height:180px;overflow:auto;padding:9px;white-space:pre-wrap}.full-width{width:100%}.checkbox-field{align-items:center;color:#0f172a;display:flex;gap:10px;font-weight:600;margin:8px 0 16px}.checkbox-field input{height:18px;width:18px}`]
})
export class HitlDialogComponent implements OnInit {
  payload: any = {};
  form: Record<string, any> = {};
  response = 'approved';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private ref: MatDialogRef<HitlDialogComponent>) {
    this.payload = this.extractPayload(data);
  }

  ngOnInit() {
    for (const field of this.fields()) {
      if (field.default !== undefined) this.form[field.key] = field.default;
      else if (field.type === 'checkbox') this.form[field.key] = false;
      else if (field.type === 'select' && field.options?.length) this.form[field.key] = field.options[0];
      else this.form[field.key] = '';
    }
  }

  fields() {
    const schema = this.payload.form_schema || this.payload.formSchema || {};
    return Object.keys(schema || {}).map(key => {
      const spec = schema[key] || {};
      return {
        key,
        label: spec.label || this.label(key),
        type: spec.type || 'text',
        required: !!spec.required,
        options: Array.isArray(spec.options) ? spec.options : (Array.isArray(spec.enum) ? spec.enum : []),
        default: spec.default
      };
    });
  }

  detailRows() {
    const details = this.payload.details || {};
    return Object.keys(details).map(key => ({ key, value: details[key] }));
  }

  label(key: string) {
    return String(key || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  format(value: any) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }

  close() {
    const fields = this.fields();
    if (fields.length) {
      this.ref.close({ ...this.form });
      return;
    }
    this.ref.close({ response: this.response });
  }

  private extractPayload(data: any) {
    return data?.payload || data?.update?.payload || data?.update || data || {};
  }
}
