import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-rag',
  template: `
  <div class="page">
    <div class="top">
      <div><h2>RAG Knowledge Base</h2><p class="muted">Manage collections, upload documents, and test retrieval.</p></div>
      <button mat-raised-button color="primary" (click)="create()"><mat-icon>add</mat-icon>Create Collection</button>
    </div>
    <div class="next-steps">
      <div class="next-step"><mat-icon>create_new_folder</mat-icon><div><strong>Create collection</strong><span>Group documents by business area, customer, or agent use case.</span></div></div>
      <div class="next-step"><mat-icon>upload_file</mat-icon><div><strong>Ingest documents</strong><span>Upload files or use a configured source after selecting a collection.</span></div></div>
      <div class="next-step"><mat-icon>search</mat-icon><div><strong>Test retrieval</strong><span>Ask a question and check the answer plus retrieved evidence.</span></div></div>
    </div>

    <mat-card *ngIf="showForm" class="form-card">
      <h3>{{collection.id ? 'Update Collection' : 'Create Collection'}}</h3>
      <mat-form-field class="full-width"><mat-label>Name</mat-label><input matInput [(ngModel)]="collection.name"></mat-form-field>
      <mat-form-field class="full-width"><mat-label>Description</mat-label><textarea matInput rows="3" [(ngModel)]="collection.description"></textarea></mat-form-field>
      <div class="grid form-grid">
        <mat-form-field><mat-label>LLM Alias</mat-label><mat-select [(ngModel)]="collection.llmAlias"><mat-option value="">Direct provider/model</mat-option><mat-option *ngFor="let a of aliases" [value]="a.aliasName">{{a.aliasName}}</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>LLM Provider</mat-label><mat-select [(ngModel)]="collection.llmProvider"><mat-option value="">Use alias/default</mat-option><mat-option *ngFor="let p of providers" [value]="p.name">{{p.displayName || p.name}}</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>LLM Model</mat-label><mat-select [(ngModel)]="collection.llmModel"><mat-option value="">Use alias/default</mat-option><mat-option *ngFor="let m of modelsForProvider()" [value]="m.model">{{m.displayName || m.model}}</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>Embedding Model</mat-label><input matInput [(ngModel)]="collection.embeddingModel"></mat-form-field>
        <mat-form-field><mat-label>Vector DB</mat-label><mat-select [(ngModel)]="collection.vectorDb"><mat-option value="POSTGRES">PostgreSQL / pgvector</mat-option><mat-option value="FAISS">FAISS</mat-option><mat-option value="PINECONE">Pinecone</mat-option><mat-option value="QDRANT">Qdrant</mat-option><mat-option value="WEAVIATE">Weaviate</mat-option><mat-option value="CHROMA">Chroma</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>Source Type</mat-label><mat-select [(ngModel)]="collection.sourceType"><mat-option value="FILE">File</mat-option><mat-option value="DB">Database</mat-option><mat-option value="WEB">Web</mat-option></mat-select></mat-form-field>
      </div>
      <details class="advanced-section">
        <summary>Advanced vector/source settings</summary>
        <mat-form-field class="full-width"><mat-label>Vector DB URL</mat-label><input matInput [(ngModel)]="collection.vectorDbUrl"></mat-form-field>
        <mat-form-field class="full-width" *ngIf="collection.sourceType === 'DB'"><mat-label>DB Source Config JSON</mat-label><textarea matInput rows="4" [(ngModel)]="sourceConfigText"></textarea></mat-form-field>
        <mat-form-field class="full-width" *ngIf="collection.sourceType === 'WEB'"><mat-label>Web Source Config JSON</mat-label><textarea matInput rows="4" [(ngModel)]="sourceConfigText"></textarea></mat-form-field>
      </details>
      <div class="actions"><button mat-raised-button color="primary" (click)="saveCollection()">{{collection.id ? 'Update' : 'Create'}}</button><button mat-button (click)="cancel()">Cancel</button></div>
    </mat-card>

    <mat-card>
      <div class="table-head"><h3>Collections</h3><div class="actions"><button mat-button color="warn" (click)="deleteSelectedCollections()" [disabled]="selectedCollectionCount() === 0">Delete Selected</button><button mat-button (click)="load()">Refresh</button></div></div>
      <table mat-table [dataSource]="collections">
        <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allCollectionsSelected()" (change)="toggleAllCollections($event)"></th><td mat-cell *matCellDef="let c"><input type="checkbox" [checked]="selectedCollections[c.id]" (change)="toggleCollection(c.id,$event)"></td></ng-container>
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let c">{{c.name}}</td></ng-container>
        <ng-container matColumnDef="llm"><th mat-header-cell *matHeaderCellDef>LLM</th><td mat-cell *matCellDef="let c">{{c.llmAlias || ((c.llmProvider || '-') + ' / ' + (c.llmModel || '-'))}}</td></ng-container>
        <ng-container matColumnDef="vector"><th mat-header-cell *matHeaderCellDef>Vector DB</th><td mat-cell *matCellDef="let c">{{c.vectorDb || 'POSTGRES'}}</td></ng-container>
        <ng-container matColumnDef="source"><th mat-header-cell *matHeaderCellDef>Source</th><td mat-cell *matCellDef="let c">{{c.sourceType || 'FILE'}}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let c"><button mat-button color="primary" (click)="select(c)">Use</button><button mat-button (click)="edit(c)">Update</button><button mat-button color="warn" (click)="delete(c)">Delete</button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr><tr mat-row *matRowDef="let row;columns:cols"></tr>
      </table>
      <div class="empty-state" *ngIf="collections.length === 0">
        <div>
          <strong>No knowledge collections yet</strong>
          <p>Create a collection before uploading documents or connecting knowledge to an agent.</p>
          <button mat-raised-button color="primary" (click)="create()">Create Collection</button>
        </div>
      </div>
      <mat-paginator [length]="collectionTotal" [pageIndex]="collectionPage.pageIndex" [pageSize]="collectionPage.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onCollectionPage($event)"></mat-paginator>
    </mat-card>

    <div class="grid two form-card">
      <mat-card>
        <h3>Ingest Knowledge</h3>
        <p class="muted">Collection: {{queryCollection || 'Select a collection'}}</p>
        <ng-container *ngIf="selectedCollection()?.sourceType === 'FILE' || !selectedCollection()">
          <input type="file" (change)="selectFile($event)">
          <button mat-button (click)="upload()">Upload</button>
        </ng-container>
        <ng-container *ngIf="selectedCollection() && selectedCollection()?.sourceType !== 'FILE'">
          <p class="muted">Source: {{selectedCollection()?.sourceType}}. Uses the saved source config JSON for this collection.</p>
          <button mat-raised-button color="primary" (click)="ingestConfiguredSource()">Ingest Configured Source</button>
        </ng-container>
        <div class="result-box" *ngIf="uploadResult">
          <strong>{{uploadResult.status}}</strong>
          <mat-progress-bar *ngIf="pollingJobId" mode="determinate" [value]="uploadResult.progressPct || uploadResult.progress_pct || 10"></mat-progress-bar>
          <p>{{uploadResult.filename || uploadResult.vectorDb}} / {{uploadResult.documentCount || 1}} docs / {{uploadResult.chunkCount || 0}} chunks</p>
          <p class="muted" *ngIf="pollingJobId">Job {{pollingJobId}} is still running...</p>
          <p class="error" *ngIf="uploadResult.errorMessage">{{uploadResult.errorMessage}}</p>
        </div>
      </mat-card>
      <mat-card>
        <h3>Query Test</h3>
        <mat-form-field class="full-width"><mat-label>Collection</mat-label><mat-select [(ngModel)]="queryCollection"><mat-option *ngFor="let c of collections" [value]="c.name">{{c.name}}</mat-option></mat-select></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Query</mat-label><textarea matInput rows="4" [(ngModel)]="queryText"></textarea></mat-form-field>
        <button mat-raised-button color="primary" (click)="query()">Query</button>
        <div class="result-box" *ngIf="queryResult">
          <strong>{{resultMessage(queryResult)}}</strong>
          <div class="answer" *ngIf="displayAnswer(queryResult) as answer">
            <h4>Answer</h4>
            <p>{{answer}}</p>
            <div class="muted" *ngIf="queryResult.provider || queryResult.model">
              {{queryResult.provider || 'provider'}} / {{queryResult.model || 'model'}}
              <span *ngIf="queryResult.usage?.total_tokens"> / {{queryResult.usage.total_tokens}} tokens</span>
            </div>
          </div>
          <details class="evidence" *ngIf="queryResult.results?.length" [open]="!queryResult.answer">
            <summary>Retrieved chunks ({{queryResult.results.length}})</summary>
            <div class="chunk" *ngFor="let r of queryResult.results">
              <div><b>{{r.filename}}</b> / chunk {{r.chunkIndex}} / score {{formatScore(r.score)}}</div>
              <p>{{r.content}}</p>
            </div>
          </details>
        </div>
      </mat-card>
    </div>

    <div class="grid two form-card">
      <mat-card>
        <div class="table-head"><h3>Documents</h3><div class="actions"><button mat-button color="warn" (click)="deleteSelectedDocuments()" [disabled]="selectedDocumentCount() === 0">Delete Selected</button><button mat-button (click)="loadDocuments()">Refresh</button></div></div>
        <div *ngIf="documents.length === 0" class="muted">No indexed documents for selected collection.</div>
        <table mat-table [dataSource]="documents" *ngIf="documents.length">
          <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allDocumentsSelected()" (change)="toggleAllDocuments($event)"></th><td mat-cell *matCellDef="let d"><input type="checkbox" [checked]="selectedDocuments[documentKey(d)]" (change)="toggleDocument(d,$event)"></td></ng-container>
          <ng-container matColumnDef="doc"><th mat-header-cell *matHeaderCellDef>Document</th><td mat-cell *matCellDef="let d">{{d.filename || d.docId}}</td></ng-container>
          <ng-container matColumnDef="chunks"><th mat-header-cell *matHeaderCellDef>Chunks</th><td mat-cell *matCellDef="let d">{{d.chunkCount}}</td></ng-container>
          <ng-container matColumnDef="vector"><th mat-header-cell *matHeaderCellDef>Vector DB</th><td mat-cell *matCellDef="let d">{{d.vectorDb}}</td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let d"><button mat-button color="warn" (click)="deleteDocument(d)">Delete</button></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="docCols"></tr><tr mat-row *matRowDef="let row;columns:docCols"></tr>
        </table>
        <mat-paginator *ngIf="documents.length" [length]="documentTotal" [pageIndex]="documentPage.pageIndex" [pageSize]="documentPage.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onDocumentPage($event)"></mat-paginator>
      </mat-card>
      <mat-card>
        <div class="table-head"><h3>Ingest Jobs</h3><button mat-button (click)="loadJobs()">Refresh</button></div>
        <div *ngIf="jobs.length === 0" class="muted">No ingest jobs.</div>
        <div class="job-row" *ngFor="let j of jobs">
          <div><b>{{j.status}}</b> {{j.filename || j.collection}}</div>
          <mat-progress-bar mode="determinate" [value]="j.progressPct || j.progress_pct || 0"></mat-progress-bar>
          <div class="actions"><button mat-button (click)="retryJob(j)" [disabled]="!canRetry(j)">Retry</button><button mat-button color="warn" (click)="cancelJob(j)" [disabled]="!canCancel(j)">Cancel</button></div>
          <p class="error" *ngIf="j.errorMessage">{{j.errorMessage}}</p>
        </div>
      </mat-card>
    </div>
  </div>`,
  styles: [`.top,.table-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.form-card{margin-top:16px}.form-grid{grid-template-columns:repeat(3,minmax(220px,1fr))}.full-width,table{width:100%}.two{grid-template-columns:repeat(2,minmax(320px,1fr))}.actions{display:flex;gap:8px}.result-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-top:12px;padding:10px}.answer{background:#fff;border:1px solid #dbe3ff;border-radius:8px;margin-top:10px;padding:12px}.answer h4{color:#001f4d;margin:0 0 8px}.answer p{line-height:1.45;margin:0 0 8px;white-space:pre-wrap}.evidence{margin-top:12px}.evidence summary{cursor:pointer;font-weight:700}.chunk{border-top:1px solid #e5e7eb;margin-top:10px;padding-top:10px}.chunk p{margin:6px 0 0;max-height:120px;overflow:auto}.job-row{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:10px;padding:10px}.error{color:#b91c1c}.muted{color:#64748b}`]
})
export class RagComponent implements OnInit {
  collection: any = this.blank(); collections: any[] = []; cols = ['select', 'name', 'llm', 'vector', 'source', 'actions'];
  documents: any[] = []; jobs: any[] = []; docCols = ['select','doc','chunks','vector','actions'];
  selectedCollections: Record<string, boolean> = {};
  selectedDocuments: Record<string, boolean> = {};
  pageSizeOptions = [10, 25, 50];
  collectionPage = { pageIndex: 0, pageSize: 10 };
  documentPage = { pageIndex: 0, pageSize: 10 };
  collectionTotal = 0; documentTotal = 0;
  providers: any[] = []; models: any[] = []; aliases: any[] = [];
  showForm = false; queryCollection = ''; queryText = 'What is AgentChain?'; queryResult: any; uploadResult: any; file?: File;
  pollingJobId = ''; pollingAttempts = 0;
  sourceConfigText = '{}';
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); this.loadLlmOptions(); }
  load() { this.api.ragCollectionsPage(this.collectionPage.pageIndex, this.collectionPage.pageSize).subscribe(x => { this.collections = x?.content || []; this.collectionTotal = x?.totalElements || 0; this.pruneCollectionSelection(); if (!this.queryCollection && this.collections[0]) this.queryCollection = this.collections[0].name; this.loadDocuments(); this.loadJobs(); }); }
  onCollectionPage(event: any) { this.collectionPage = event; this.load(); }
  onDocumentPage(event: any) { this.documentPage = event; this.loadDocuments(); }
  loadLlmOptions() { this.api.llmProviders().subscribe(x => this.providers = x || []); this.api.llmModels().subscribe(x => this.models = x || []); this.api.llmAliases().subscribe(x => this.aliases = x || []); }
  create() { this.collection = this.blank(); this.sourceConfigText = '{}'; this.showForm = true; }
  edit(c: any) { this.collection = { ...this.blank(), ...c }; this.sourceConfigText = JSON.stringify(c.sourceConfig || {}, null, 2); this.showForm = true; }
  cancel() { this.showForm = false; this.collection = this.blank(); this.sourceConfigText = '{}'; }
  saveCollection() {
    let sourceConfig = {};
    try { sourceConfig = JSON.parse(this.sourceConfigText || '{}'); } catch { alert('Source config must be valid JSON.'); return; }
    const body = { ...this.collection, sourceConfig };
    const call = body.id ? this.api.updateRagCollection(body.id, body) : this.api.saveRagCollection(body);
    call.subscribe(() => { this.cancel(); this.load(); });
  }
  delete(c: any) { if (confirm(`Delete collection "${c.name}"?`)) this.api.deleteRagCollection(c.id).subscribe(() => this.load()); }
  toggleCollection(id: string, event: Event) { this.selectedCollections[id] = (event.target as HTMLInputElement).checked; }
  toggleAllCollections(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.collections.forEach(c => this.selectedCollections[c.id] = checked); }
  selectedCollectionCount() { return this.collections.filter(c => this.selectedCollections[c.id]).length; }
  allCollectionsSelected() { return this.collections.length > 0 && this.selectedCollectionCount() === this.collections.length; }
  deleteSelectedCollections() { const rows = this.collections.filter(c => this.selectedCollections[c.id]); if (!rows.length || !confirm(`Delete ${rows.length} selected collection${rows.length === 1 ? '' : 's'}?`)) return; forkJoin(rows.map(c => this.api.deleteRagCollection(c.id))).subscribe(() => { rows.forEach(c => delete this.selectedCollections[c.id]); this.load(); }); }
  select(c: any) { this.queryCollection = c.name; this.loadDocuments(); this.loadJobs(); }
  selectFile(e: any) { this.file = e.target.files?.[0]; }
  upload() { if (!this.file || !this.queryCollection) { alert('Select collection and file first'); return; } const form = new FormData(); form.append('file', this.file); this.api.ingest(this.queryCollection, form).subscribe(x => this.handleIngestResponse(x)); }
  ingestConfiguredSource() { if (!this.queryCollection) { alert('Select collection first'); return; } this.api.ingestSource(this.queryCollection, {}).subscribe(x => this.handleIngestResponse(x)); }
  query() { this.api.ragQuery(this.queryCollection, { query: this.queryText, top_k: 5 }).subscribe(x => this.queryResult = x); }
  formatScore(score: any) { const n = Number(score); return Number.isFinite(n) ? n.toFixed(5) : score; }
  resultMessage(result: any) {
    if (result?.message) return result.message;
    const count = result?.results?.length || result?.chunks?.length || 0;
    return count ? `Retrieved ${count} chunk${count === 1 ? '' : 's'}` : 'No matching chunks found';
  }
  displayAnswer(result: any): string {
    if (result?.answer && String(result.answer).trim()) return String(result.answer);
    const rows = result?.results || result?.chunks || [];
    if (!rows.length) return '';
    return this.extractiveAnswer(rows);
  }
  extractiveAnswer(rows: any[]): string {
    const selected = rows
      .filter(r => String(r?.content || '').trim())
      .slice(0, 3)
      .map(r => {
        const source = r.filename || r.docId || 'document';
        const chunk = r.chunkIndex ?? '-';
        return `- ${this.snippet(r.content)} [${source} chunk ${chunk}]`;
      });
    return selected.length ? `Based on the retrieved document context:\n${selected.join('\n')}` : '';
  }
  snippet(value: any): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > 420 ? text.slice(0, 417).trimEnd() + '...' : text;
  }
  selectedCollection() { return this.collections.find(c => c.name === this.queryCollection); }
  modelsForProvider() { return this.collection.llmProvider ? this.models.filter(m => m.provider === this.collection.llmProvider) : this.models; }
  handleIngestResponse(x: any) { this.uploadResult = x; this.loadJobs(); if (x?.id && !['COMPLETED', 'FAILED'].includes(String(x.status || '').toUpperCase())) this.pollJob(x.id); }
  pollJob(id: string) {
    this.pollingJobId = id; this.pollingAttempts++;
    setTimeout(() => this.api.ragJobs(id).subscribe(job => {
      this.uploadResult = job;
      const status = String(job?.status || '').toUpperCase();
      if (!['COMPLETED', 'FAILED'].includes(status) && this.pollingAttempts < 180) this.pollJob(id);
      else { this.pollingJobId = ''; this.pollingAttempts = 0; this.loadDocuments(); this.loadJobs(); }
    }), 1500);
  }
  loadDocuments() { if (!this.queryCollection) return; this.api.ragDocumentsPage(this.queryCollection, this.documentPage.pageIndex, this.documentPage.pageSize).subscribe(x => { this.documents = x?.documents || x?.content || []; this.documentTotal = x?.totalElements || 0; this.pruneDocumentSelection(); }); }
  loadJobs() { this.api.ragJobList(this.queryCollection).subscribe(x => this.jobs = x || []); }
  deleteDocument(d: any) { if (confirm(`Delete document "${d.filename || d.docId}"?`)) this.api.deleteRagDocument(this.queryCollection, d.docId).subscribe(() => this.loadDocuments()); }
  documentKey(d: any) { return d.docId || d.filename || JSON.stringify(d); }
  toggleDocument(d: any, event: Event) { this.selectedDocuments[this.documentKey(d)] = (event.target as HTMLInputElement).checked; }
  toggleAllDocuments(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.documents.forEach(d => this.selectedDocuments[this.documentKey(d)] = checked); }
  selectedDocumentCount() { return this.documents.filter(d => this.selectedDocuments[this.documentKey(d)]).length; }
  allDocumentsSelected() { return this.documents.length > 0 && this.selectedDocumentCount() === this.documents.length; }
  deleteSelectedDocuments() { const rows = this.documents.filter(d => this.selectedDocuments[this.documentKey(d)]); if (!rows.length || !confirm(`Delete ${rows.length} selected document${rows.length === 1 ? '' : 's'}?`)) return; forkJoin(rows.map(d => this.api.deleteRagDocument(this.queryCollection, d.docId))).subscribe(() => { rows.forEach(d => delete this.selectedDocuments[this.documentKey(d)]); this.loadDocuments(); }); }
  private pruneCollectionSelection() { const ids = new Set(this.collections.map(c => c.id)); Object.keys(this.selectedCollections).forEach(id => { if (!ids.has(id)) delete this.selectedCollections[id]; }); }
  private pruneDocumentSelection() { const ids = new Set(this.documents.map(d => this.documentKey(d))); Object.keys(this.selectedDocuments).forEach(id => { if (!ids.has(id)) delete this.selectedDocuments[id]; }); }
  canRetry(j: any) { return String(j.status || '').toUpperCase() === 'FAILED' && String(j.filename || '').startsWith('SOURCE:'); }
  canCancel(j: any) { return ['QUEUED','RUNNING'].includes(String(j.status || '').toUpperCase()); }
  retryJob(j: any) { this.api.retryRagJob(j.id).subscribe(x => this.handleIngestResponse(x)); }
  cancelJob(j: any) { this.api.cancelRagJob(j.id).subscribe(() => this.loadJobs()); }
  private blank() { return { name: 'default', description: 'Default knowledge collection', llmAlias: '', llmProvider: '', llmModel: '', embeddingModel: 'text-embedding-3-small', vectorDimension: 1536, vectorDb: 'POSTGRES', vectorDbUrl: '', sourceType: 'FILE', sourceConfig: {} }; }
}
