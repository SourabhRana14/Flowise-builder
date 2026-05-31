import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-run-input-dialog',
  template: `
  <h2 mat-dialog-title>Run Agent</h2>
  <mat-dialog-content>
    <mat-form-field class="full-width">
      <mat-label>Message</mat-label>
      <textarea matInput rows="4" [(ngModel)]="message" [placeholder]="messagePlaceholder"></textarea>
    </mat-form-field>
    <mat-form-field class="full-width">
      <mat-label>Additional input JSON</mat-label>
      <textarea matInput rows="6" [(ngModel)]="inputJson"></textarea>
    </mat-form-field>
  </mat-dialog-content>
  <mat-dialog-actions align="end">
    <button mat-button mat-dialog-close>Cancel</button>
    <button mat-raised-button color="primary" (click)="run()">Run</button>
  </mat-dialog-actions>
  `,
  styles: [`.full-width{width:100%}`]
})
export class RunInputDialogComponent {
  message = '';
  inputJson = '{}';
  messagePlaceholder = 'Ask the agent what to do...';

  constructor(private ref: MatDialogRef<RunInputDialogComponent>) {}

  run() {
    let input: any = {};
    try {
      input = JSON.parse(this.inputJson || '{}');
    } catch {
      alert('Additional input must be valid JSON.');
      return;
    }
    if (this.message.trim()) input.message = this.message.trim();
    this.ref.close(input);
  }
}
