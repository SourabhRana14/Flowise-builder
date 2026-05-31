import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-observability',
  template: `
  <div class="page">
    <div class="top">
      <div>
        <h2>{{sectionTitle()}}</h2>
        <p class="muted">{{sectionDescription()}}</p>
      </div>
      <mat-form-field appearance="outline" class="agent-select" *ngIf="section !== 'health'">
        <mat-label>Agent</mat-label>
        <mat-select [(ngModel)]="agentId" (selectionChange)="load()">
          <mat-option value="all">All agents</mat-option>
          <mat-option *ngFor="let a of agents" [value]="a.id">{{a.name}}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    <div class="next-steps" *ngIf="section === 'traces'">
      <div class="next-step"><mat-icon>search</mat-icon><div><strong>Find a run</strong><span>Filter by agent, status, dates, tokens, cost, or node kind.</span></div></div>
      <div class="next-step"><mat-icon>replay</mat-icon><div><strong>Replay and compare</strong><span>Open a trace to inspect execution steps and compare behavior.</span></div></div>
      <div class="next-step"><mat-icon>account_tree</mat-icon><div><strong>Inspect execution</strong><span>Review node states, tool payloads, human tasks, and checkpoint details.</span></div></div>
    </div>
    <div class="next-steps" *ngIf="section === 'cost'">
      <div class="next-step"><mat-icon>paid</mat-icon><div><strong>Track spend</strong><span>Review tokens, total cost, and model usage by run and trace state.</span></div></div>
      <div class="next-step"><mat-icon>analytics</mat-icon><div><strong>Find cost drivers</strong><span>Compare traces, prompts, evaluations, and failure patterns.</span></div></div>
      <div class="next-step"><mat-icon>notifications</mat-icon><div><strong>Control budgets</strong><span>Use alert rules for cost spikes, latency, and failure rates.</span></div></div>
    </div>
    <div class="next-steps" *ngIf="section === 'health'">
      <div class="next-step"><mat-icon>health_and_safety</mat-icon><div><strong>Runtime health</strong><span>Confirm orchestrator and worker services before running agents.</span></div></div>
      <div class="next-step"><mat-icon>settings_ethernet</mat-icon><div><strong>Service URLs</strong><span>Review local endpoints used by the UI and runtime integrations.</span></div></div>
      <div class="next-step"><mat-icon>sync</mat-icon><div><strong>Refresh quickly</strong><span>Check status again after restarting any service.</span></div></div>
    </div>

    <mat-card class="filters" *ngIf="section === 'traces'">
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="statusFilter" (selectionChange)="resetAndLoad()">
          <mat-option value="all">All</mat-option>
          <mat-option value="RUNNING">Running</mat-option>
          <mat-option value="DONE">Done</mat-option>
          <mat-option value="ERROR">Error</mat-option>
          <mat-option value="ABORTED">Aborted</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>From</mat-label>
        <input matInput type="date" [(ngModel)]="fromFilter" (change)="resetAndLoad()">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>To</mat-label>
        <input matInput type="date" [(ngModel)]="toFilter" (change)="resetAndLoad()">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Detail events</mat-label>
        <mat-select [(ngModel)]="eventTypeFilter">
          <mat-option value="all">All events</mat-option>
          <mat-option value="tool">Tool calls</mat-option>
          <mat-option value="guardrail">Guardrails</mat-option>
          <mat-option value="missing_params">Missing params</mat-option>
          <mat-option value="human">Human approvals</mat-option>
          <mat-option value="failed">Failed nodes</mat-option>
        </mat-select>
      </mat-form-field>
      <button mat-stroked-button (click)="clearFilters()">Clear</button>
    </mat-card>

    <mat-card class="endpoint-config" *ngIf="section === 'health'">
      <div class="ai-head">
        <div>
          <h3>Service URLs</h3>
          <p class="muted">Local runtime URLs used for health checks, trace search, and replay.</p>
        </div>
        <div class="ai-actions">
          <button mat-stroked-button color="primary" (click)="applyEndpointConfig()">Apply URLs</button>
          <button mat-stroked-button (click)="saveEndpointConfig()">Save URLs</button>
          <button mat-stroked-button (click)="resetEndpointConfig()">Reset Local Defaults</button>
        </div>
      </div>
      <div class="endpoint-grid">
        <mat-form-field appearance="outline"><mat-label>Observability</mat-label><input matInput [(ngModel)]="api.aiObservability"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Orchestrator</mat-label><input matInput [(ngModel)]="api.runtimeOrchestrator"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Tool Execution</mat-label><input matInput [(ngModel)]="api.toolExecution"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>LLM Inference</mat-label><input matInput [(ngModel)]="api.llmInference"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Memory/RAG</mat-label><input matInput [(ngModel)]="api.memoryRag"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Human Task</mat-label><input matInput [(ngModel)]="api.humanTask"></mat-form-field>
      </div>
    </mat-card>

    <mat-card class="runtime-health" *ngIf="section === 'health'">
      <div class="ai-head">
        <div>
          <h3>Runtime health</h3>
          <p class="muted">Quick status for the orchestrator, workers, and observability service.</p>
        </div>
        <div class="ai-actions">
          <span class="pill" [class.offline]="runtimeOnlineCount() !== runtimeServices.length">{{runtimeOnlineCount()}} / {{runtimeServices.length}} ONLINE</span>
          <button mat-stroked-button color="primary" (click)="loadRuntimeHealth()">Refresh Health</button>
        </div>
      </div>
      <div class="service-grid">
        <div class="service-tile" *ngFor="let s of runtimeServices">
          <div>
            <strong>{{s.name}}</strong>
            <div class="mono muted">{{s.url}}</div>
          </div>
          <span class="pill" [class.offline]="s.status !== 'online'">{{s.status | uppercase}}</span>
          <div class="muted service-error" *ngIf="s.error">{{s.error}}</div>
        </div>
      </div>
    </mat-card>

    <mat-card class="ai-observability" *ngIf="section === 'traces'">
      <div class="ai-head">
        <div>
          <h3>Trace Explorer</h3>
          <p class="muted">Search traces, replay execution, and inspect node-level debug events.</p>
        </div>
        <div class="ai-actions">
          <span class="pill" [class.offline]="!aiObsOnline">{{aiObsOnline ? 'ONLINE' : 'OFFLINE'}}</span>
          <button mat-stroked-button color="primary" (click)="loadAiObservability()">Refresh</button>
          <button mat-stroked-button (click)="sendSampleTrace()">Send Sample Trace</button>
        </div>
      </div>
      <div class="ai-panels">
        <div>
          <div class="table-head compact"><h4>Service Traces</h4><mat-form-field appearance="outline"><mat-label>State</mat-label><mat-select [(ngModel)]="aiObsState" (selectionChange)="loadAiObservability()"><mat-option value="all">All</mat-option><mat-option value="running">Running</mat-option><mat-option value="completed">Completed</mat-option><mat-option value="failed">Failed</mat-option><mat-option value="cancelled">Cancelled</mat-option></mat-select></mat-form-field></div>
          <div class="trace-filters">
            <mat-form-field appearance="outline"><mat-label>Search</mat-label><input matInput [(ngModel)]="aiSearch.q" (keyup.enter)="loadAiObservability()" placeholder="trace, run, metadata"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Agent ID</mat-label><input matInput [(ngModel)]="aiSearch.agent_id" (keyup.enter)="loadAiObservability()"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Run ID</mat-label><input matInput [(ngModel)]="aiSearch.run_id" (keyup.enter)="loadAiObservability()"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Node ID</mat-label><input matInput [(ngModel)]="aiSearch.node_id" (keyup.enter)="loadAiObservability()"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Span Kind</mat-label><mat-select [(ngModel)]="aiSearch.kind"><mat-option value="">Any</mat-option><mat-option value="workflow">Workflow</mat-option><mat-option value="llm">LLM</mat-option><mat-option value="tool">Tool</mat-option><mat-option value="retrieval">Retrieval</mat-option><mat-option value="memory">Memory</mat-option><mat-option value="human_review">Human Review</mat-option></mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>From</mat-label><input matInput type="date" [(ngModel)]="aiSearch.from"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>To</mat-label><input matInput type="date" [(ngModel)]="aiSearch.to"></mat-form-field>
            <button mat-stroked-button color="primary" (click)="loadAiObservability()">Apply</button>
            <button mat-stroked-button (click)="resetAiSearch()">Reset</button>
          </div>
          <div *ngIf="!aiObsOnline" class="muted empty-small">Start the AI Observability Service on port 8090 or set the UI base URL later.</div>
          <div *ngIf="aiObsOnline && aiObsTraces.length === 0" class="muted empty-small">No traces ingested yet.</div>
          <div class="ai-trace-list" *ngIf="aiObsTraces.length">
            <button class="trace-row" *ngFor="let t of aiObsTraces" (click)="selectAiTrace(t)" [class.selected]="selectedAiTrace?.trace_id === t.trace_id">
              <span class="mono">{{shortId(t.trace_id)}}</span>
              <span>{{t.name || 'trace'}}</span>
              <span class="pill">{{t.state}}</span>
              <span class="mono">{{shortId(t.run_id || '-')}}</span>
            </button>
          </div>
          <div class="compare-pick" *ngIf="selectedAiTrace">
            <button mat-stroked-button (click)="setCompareTrace('left')">Set Left</button>
            <button mat-stroked-button (click)="setCompareTrace('right')">Set Right</button>
            <span class="muted">Left {{shortId(compareLeft?.trace_id)}} / Right {{shortId(compareRight?.trace_id)}}</span>
          </div>
        </div>
        <div [class.focus-panel]="traceFocusMode">
          <h4>Replay Preview</h4>
          <div *ngIf="!selectedAiTrace" class="muted empty-small">Select a service trace.</div>
          <div *ngIf="selectedAiTrace">
            <div class="ai-actions trace-actions">
              <button mat-stroked-button (click)="copySelectedTraceId()">Copy Trace ID</button>
              <button mat-stroked-button (click)="copyReplayJson()">Copy Replay JSON</button>
              <button mat-stroked-button (click)="downloadReplayJson()">Export JSON</button>
              <button mat-stroked-button color="primary" (click)="toggleLiveStream()">{{liveStreamActive ? 'Stop Live' : 'Start Live'}}</button>
              <button mat-stroked-button (click)="traceFocusMode = !traceFocusMode">{{traceFocusMode ? 'Exit Focus' : 'Focus View'}}</button>
            </div>
            <p><strong>Trace:</strong> <span class="mono">{{selectedAiTrace.trace_id}}</span></p>
            <p><strong>Run:</strong> <span class="mono">{{selectedAiTrace.run_id || '-'}}</span></p>
            <p><strong>Agent:</strong> {{selectedAiTrace.agent_id || '-'}}</p>
            <div class="detail-cards">
              <div class="detail-card"><strong>{{aiReplay?.spans?.length || 0}}</strong><span>Spans</span></div>
              <div class="detail-card"><strong>{{aiReplay?.events?.length || 0}}</strong><span>Events</span></div>
              <div class="detail-card"><strong>{{aiReplay?.graph?.nodes?.length || 0}}</strong><span>Graph Nodes</span></div>
            </div>
            <mat-tab-group>
              <mat-tab label="Spans">
                <div *ngIf="spanRows().length === 0" class="muted empty-small">No spans captured for this trace.</div>
                <div class="span-list" *ngIf="spanRows().length">
                  <div class="span-row" *ngFor="let row of spanRows()" [style.paddingLeft.px]="row.depth * 18 + 10">
                    <span class="pill">{{row.span.kind || 'span'}}</span>
                    <div>
                      <strong>{{row.span.name || row.span.node_type || row.span.node_id || 'span'}}</strong>
                      <div class="muted mono">{{row.span.node_id || row.span.span_id}}</div>
                    </div>
                    <span class="pill" [class.offline]="row.span.state === 'failed'">{{row.span.state}}</span>
                    <span>{{formatDuration(row.span.latency_ms || row.span.latencyMs)}}</span>
                  </div>
                </div>
              </mat-tab>
              <mat-tab label="Events">
                <div *ngIf="eventRows().length === 0" class="muted empty-small">No events captured for this trace.</div>
                <div class="event-list" *ngIf="eventRows().length">
                  <div class="event-row" *ngFor="let e of eventRows()">
                    <span class="pill">{{e.status}}</span>
                    <span class="mono">{{e.node_id || e.nodeId || '-'}}</span>
                    <span>{{e.node_type || e.nodeType || '-'}}</span>
                    <span class="muted">{{e.created_at || e.createdAt | date:'medium'}}</span>
                    <pre>{{redactedJson(e.event || e)}}</pre>
                  </div>
                </div>
              </mat-tab>
              <mat-tab label="Live">
                <div class="live-head">
                  <span class="pill" [class.offline]="!liveStreamActive">{{liveStreamActive ? 'STREAMING' : 'STOPPED'}}</span>
                  <span class="muted">{{liveEvents.length}} live events</span>
                  <span class="muted" *ngIf="liveStreamMessage">{{liveStreamMessage}}</span>
                </div>
                <div *ngIf="liveEvents.length === 0" class="muted empty-small">Start live streaming while this trace is running to see new events.</div>
                <div class="event-list" *ngIf="liveEvents.length">
                  <div class="event-row" *ngFor="let e of liveEvents">
                    <span class="pill">{{e.type || 'event'}}</span>
                    <span class="mono">{{e.data?.node_id || e.data?.nodeId || '-'}}</span>
                    <span>{{e.data?.status || e.data?.state || '-'}}</span>
                    <span class="muted">{{e.receivedAt | date:'mediumTime'}}</span>
                    <pre>{{redactedJson(e.data || e)}}</pre>
                  </div>
                </div>
              </mat-tab>
              <mat-tab label="Graph">
                <div *ngIf="graphReplayRows().length === 0" class="muted empty-small">No graph replay data available.</div>
                <div class="graph-replay" *ngIf="graphReplayRows().length">
                  <div class="graph-node" *ngFor="let n of graphReplayRows()" [class.failed]="n.failed">
                    <span class="pill">{{n.status}}</span>
                    <strong>{{n.label}}</strong>
                    <span class="muted mono">{{n.nodeId}}</span>
                    <span class="muted">{{formatDuration(n.durationMs)}}</span>
                  </div>
                </div>
              </mat-tab>
              <mat-tab label="Raw">
                <pre>{{redactedJson(aiReplay || selectedAiTrace)}}</pre>
              </mat-tab>
            </mat-tab-group>
          </div>
        </div>
      </div>
    </mat-card>

    <mat-card class="ops-panel" *ngIf="section === 'cost'">
      <div class="ai-head">
        <div>
          <h3>Quality And Operations</h3>
          <p class="muted">Compare traces, review evaluations, prompts, costs, and alert rules.</p>
        </div>
        <button mat-stroked-button color="primary" (click)="loadOpsPanels()">Refresh Panels</button>
      </div>
      <mat-tab-group>
        <mat-tab label="Compare">
          <div class="compare-grid">
            <div>
              <h4>Left Trace</h4>
              <pre>{{redactedJson(compareLeft || {})}}</pre>
            </div>
            <div>
              <h4>Right Trace</h4>
              <pre>{{redactedJson(compareRight || {})}}</pre>
            </div>
            <div>
              <h4>Diff</h4>
              <button mat-stroked-button color="primary" (click)="loadTraceDiff()" [disabled]="!compareLeft || !compareRight">Load Diff</button>
              <pre>{{redactedJson(compareDiff || localTraceDiff())}}</pre>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Evaluations">
          <div class="ops-summary">
            <div class="detail-card"><strong>{{evaluations.length}}</strong><span>Total</span></div>
            <div class="detail-card"><strong>{{evaluationPassedCount()}}</strong><span>Passed</span></div>
            <div class="detail-card"><strong>{{evaluationFailedCount()}}</strong><span>Failed</span></div>
          </div>
          <div *ngIf="evaluations.length === 0" class="muted empty-small">No evaluations recorded.</div>
          <div class="ops-list" *ngIf="evaluations.length">
            <div class="ops-row" *ngFor="let e of evaluations">
              <span class="pill" [class.offline]="!e.passed">{{e.passed ? 'PASS' : 'FAIL'}}</span>
              <strong>{{e.evaluator}}</strong>
              <span>{{e.score | number:'1.2-2'}}</span>
              <span class="mono muted">{{shortId(e.trace_id || e.traceId)}}</span>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Prompts">
          <div *ngIf="prompts.length === 0" class="muted empty-small">No prompts registered.</div>
          <div class="ops-list" *ngIf="prompts.length">
            <div class="ops-row" *ngFor="let p of prompts">
              <span class="pill">{{p.scope}}</span>
              <strong>{{p.name}}</strong>
              <span>{{p.versions?.length || 0}} versions</span>
              <span class="muted">{{(p.tags || []).join(', ') || '-'}}</span>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Cost">
          <div class="ops-summary">
            <div class="detail-card"><strong>\${{costSummary?.total_cost_usd || 0 | number:'1.5-5'}}</strong><span>Total Cost</span></div>
            <div class="detail-card"><strong>{{costSummary?.total_tokens || 0}}</strong><span>Total Tokens</span></div>
            <div class="detail-card"><strong>{{costByState().length}}</strong><span>States</span></div>
          </div>
          <div class="cost-bars">
            <div class="cost-row" *ngFor="let item of costByState()">
              <span>{{item.state}}</span>
              <div><i [style.width.%]="item.percent"></i></div>
              <strong>{{item.count}}</strong>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Alerts">
          <div *ngIf="alertRules.length === 0" class="muted empty-small">No alert rules configured.</div>
          <div class="ops-list" *ngIf="alertRules.length">
            <div class="ops-row" *ngFor="let a of alertRules">
              <span class="pill" [class.offline]="!a.enabled">{{a.enabled ? 'ACTIVE' : 'PAUSED'}}</span>
              <strong>{{a.name}}</strong>
              <span>{{a.metric}} {{a.operator}} {{a.threshold}}</span>
              <span class="muted">{{a.channel}}</span>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-card>

    <div class="grid cards" *ngIf="section === 'cost'">
      <mat-card><h3>Runs</h3><h1>{{summary?.runCount || 0}}</h1></mat-card>
      <mat-card><h3>P95 Latency</h3><h1>{{summary?.p95LatencyMs || 0}} ms</h1></mat-card>
      <mat-card><h3>Total Spend</h3><h1>\${{summary?.totalSpendUsd || 0 | number:'1.5-5'}}</h1></mat-card>
      <mat-card><h3>Error Rate</h3><h1>{{summary?.errorRate || 0 | number:'1.0-1'}}%</h1></mat-card>
      <mat-card><h3>Total Tokens</h3><h1>{{summary?.totalTokens || 0}}</h1></mat-card>
      <mat-card><h3>Nodes</h3><h1>{{summary?.nodeCount || 0}}</h1></mat-card>
      <mat-card><h3>Tool Latency</h3><h1>{{summary?.avgToolLatencyMs || 0 | number:'1.0-0'}} ms</h1></mat-card>
      <mat-card><h3>RAG Hits</h3><h1>{{summary?.ragHitCount || 0}}</h1></mat-card>
    </div>

    <div class="grid two" *ngIf="section === 'traces'">
      <mat-card>
        <div class="table-head"><h3>Run History</h3><button mat-button color="warn" (click)="cancelSelected()" [disabled]="selectedCount() === 0">Cancel Selected</button></div>
        <table mat-table [dataSource]="runs">
          <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)"></th><td mat-cell *matCellDef="let r"><input type="checkbox" [checked]="selectedRuns[r.id]" (change)="toggle(r.id,$event)"></td></ng-container>
          <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Run</th><td mat-cell *matCellDef="let r" class="mono">{{shortId(r.id)}}</td></ng-container>
          <ng-container matColumnDef="agent"><th mat-header-cell *matHeaderCellDef>Agent</th><td mat-cell *matCellDef="let r">{{agentName(r.agentId)}}</td></ng-container>
          <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let r"><span class="pill">{{r.status}}</span></td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let r"><button mat-button color="primary" (click)="selectRun(r)">Details</button></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row;columns:cols"></tr>
        </table>
        <mat-paginator [length]="runTotal" [pageIndex]="runPage.pageIndex" [pageSize]="runPage.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onRunPage($event)"></mat-paginator>
      </mat-card>

      <mat-card>
        <h3>Run Details</h3>
        <div *ngIf="!selected" class="muted empty">Select a run to inspect details.</div>
        <div *ngIf="selected">
          <p><strong>Run:</strong> <span class="mono">{{selected.id}}</span></p>
          <p><strong>Agent:</strong> {{agentName(selected.agentId)}}</p>
          <p><strong>Status:</strong> {{selected.status}}</p>
          <p><strong>Duration:</strong> {{formatDuration(selected.durationMs || selected.duration_ms)}}</p>
          <p><strong>Session:</strong> {{selected.sessionId}}</p>
          <p><strong>Started:</strong> {{selected.startedAt | date:'medium'}}</p>
          <p><strong>Ended:</strong> {{selected.endedAt ? (selected.endedAt | date:'medium') : '-'}}</p>
          <div class="actions replay-actions">
            <button mat-stroked-button color="primary" (click)="replaySelectedRun(false)">Replay Same Input</button>
            <button mat-stroked-button color="primary" (click)="replaySelectedRun(true)">Replay Edited Input</button>
            <span class="muted" *ngIf="replayResult">{{replayResult}}</span>
          </div>
          <div class="detail-cards">
            <div class="detail-card" *ngFor="let item of detailSummaryCards()"><strong>{{item.count}}</strong><span>{{item.label}}</span></div>
          </div>
          <h4>Timeline</h4>
          <div *ngIf="filteredTimeline().length === 0" class="muted empty-small">No timeline available for this filter.</div>
          <div class="timeline" *ngIf="filteredTimeline().length">
            <div class="timeline-row" *ngFor="let t of filteredTimeline()" [class.failed]="isTimelineFailed(t)" [class.retry]="t.retrying">
              <span class="timeline-dot"></span>
              <div>
                <strong>{{t.sequence}}. {{t.nodeType || t.nodeId}}</strong>
                <span class="mono muted"> {{t.nodeId}}</span>
                <span class="duration-pill">{{formatDuration(t.durationMs)}}</span>
                <div class="muted">
                  {{t.status || '-'}}
                  <span *ngIf="t.tool"> / tool {{t.tool}}</span>
                  <span *ngIf="t.ragHitCount"> / rag {{t.ragHitCount}}</span>
                  <span *ngIf="t.retrying"> / retry</span>
                </div>
                <div class="error" *ngIf="t.error">{{t.error}}</div>
              </div>
            </div>
          </div>
          <h4>Runtime Checkpoints</h4>
          <div class="checkpoint-actions">
            <button mat-stroked-button color="primary" (click)="loadCheckpoints(selected.id)">Refresh checkpoints</button>
            <span class="muted" *ngIf="checkpointLoading">Loading...</span>
            <span class="muted" *ngIf="!checkpointLoading">{{checkpoints.length}} saved</span>
          </div>
          <div *ngIf="checkpoints.length === 0" class="muted empty-small">No runtime checkpoints captured for this run.</div>
          <div class="checkpoint-list" *ngIf="checkpoints.length">
            <div class="checkpoint-row" *ngFor="let c of checkpoints">
              <span class="pill">{{c.status}}</span>
              <span class="mono">{{c.node_id || c.nodeId}}</span>
              <span class="muted">{{c.created_at || c.createdAt | date:'medium'}}</span>
            </div>
          </div>
          <details *ngIf="latestState">
            <summary>Latest State Snapshot</summary>
            <pre>{{redactedJson(latestState)}}</pre>
          </details>
          <h4>Run Tree</h4>
          <div *ngIf="runTreeRows.length === 0" class="muted empty-small">No child agent runs recorded.</div>
          <div class="tree-list" *ngIf="runTreeRows.length">
            <div class="tree-row" *ngFor="let r of runTreeRows" [style.paddingLeft.px]="r.depth * 18">
              <span class="pill">{{r.run.status}}</span>
              <span>{{agentName(r.run.agentId)}}</span>
              <span class="mono muted">{{shortId(r.run.id)}}</span>
              <span class="muted" *ngIf="r.run.invocationNodeId">via {{r.run.invocationNodeId}}</span>
            </div>
          </div>
          <h4>Input</h4>
          <pre>{{redactedJson(selected.inputJson)}}</pre>
          <h4>Node Steps</h4>
          <div *ngIf="filteredSteps().length === 0" class="muted empty-small">No step records captured for this filter.</div>
          <div class="step-list" *ngIf="filteredSteps().length">
            <div class="step-row" *ngFor="let s of filteredSteps()">
              <div>
                <strong>{{s.sequence}}. {{s.nodeType || s.nodeId || 'Node'}}</strong>
                <span class="mono muted">{{s.nodeId}}</span>
                <span class="duration-pill">{{formatDuration(s.durationMs || s.duration_ms)}}</span>
              </div>
              <div class="muted">{{s.eventStatus || s.status}} · {{formatDuration(s.durationMs || s.duration_ms)}}</div>
              <div class="muted" *ngIf="s.totalTokens">tokens {{s.totalTokens}} · cost \${{s.totalCostUsd || 0 | number:'1.5-5'}}</div>
              <div class="muted" *ngIf="stepToolName(s)">tool {{stepToolName(s)}} <span *ngIf="stepToolStatus(s)">/ {{stepToolStatus(s)}}</span></div>
              <div class="muted" *ngIf="s.toolLatencyMs">tool latency {{formatDuration(s.toolLatencyMs)}}</div>
              <div class="muted" *ngIf="s.ragHitCount">rag hits {{s.ragHitCount}}</div>
              <pre>{{redactedJson(s.eventJson)}}</pre>
            </div>
          </div>
        </div>
      </mat-card>
    </div>
  </div>`,
  styles: [`.top,.table-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.agent-select{width:280px}.actions{align-items:center;display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}.filters{align-items:center;display:flex;flex-direction:row;flex-wrap:nowrap;gap:10px;justify-content:flex-start;margin-bottom:16px;overflow-x:auto;padding:14px}.filters mat-form-field{flex:0 0 180px;width:180px}.filters button{flex:0 0 auto}.endpoint-config,.runtime-health,.ai-observability,.ops-panel{margin-bottom:16px}.endpoint-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:12px}.replay-actions{border-bottom:1px solid #e5e7eb;margin:10px 0 12px;padding-bottom:10px}.ai-head,.ai-actions{align-items:flex-start;display:flex;gap:10px;justify-content:space-between}.ai-actions{align-items:center;flex-wrap:wrap}.trace-actions{justify-content:flex-start;margin:0 0 10px}.setup-row{align-items:center;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;padding:8px 10px}.setup-row code{background:#fff;border:1px solid #e5e7eb;border-radius:6px;color:#0f172a;padding:4px 6px}.service-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:12px}.service-tile{align-items:flex-start;background:#fff;border:1px solid #e5e7eb;border-radius:8px;display:flex;gap:8px;justify-content:space-between;min-height:76px;padding:10px}.service-error{font-size:12px;grid-column:1/-1;max-width:100%;overflow:hidden;text-overflow:ellipsis}.trace-filters{align-items:center;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:row;flex-wrap:nowrap;gap:8px;margin:0 0 10px;overflow-x:auto;padding:8px}.trace-filters mat-form-field{flex:0 0 135px;width:135px}.trace-filters mat-form-field:first-child{flex-basis:210px;width:210px}.trace-filters button{flex:0 0 auto}.compare-pick{align-items:center;display:flex;gap:8px;margin-top:10px}.ai-grid{display:grid;gap:10px;grid-template-columns:repeat(4,minmax(0,1fr));margin:12px 0}.ai-grid.obs-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.ai-metric{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px}.ai-metric span{color:#64748b;display:block;font-size:12px}.ai-metric strong{color:#0f172a;display:block;font-size:18px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ai-panels{display:grid;gap:14px;grid-template-columns:minmax(0,1fr)minmax(0,1fr)}.focus-panel{background:#fff;bottom:16px;box-shadow:0 24px 70px #0003;left:16px;overflow:auto;padding:18px;position:fixed;right:16px;top:16px;z-index:40}.compact{align-items:center;margin-bottom:6px}.compact mat-form-field{width:150px}.ai-trace-list{border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:column;max-height:320px;overflow:auto}.trace-row{align-items:center;background:#fff;border:0;border-bottom:1px solid #eef2f7;color:#0f172a;display:grid;gap:8px;grid-template-columns:90px minmax(0,1fr)100px 90px;padding:9px;text-align:left}.trace-row:hover,.trace-row.selected{background:#f8fafc}.span-list,.event-list{border:1px solid #e5e7eb;border-radius:8px;margin-top:10px;max-height:330px;overflow:auto}.span-row{align-items:center;border-bottom:1px solid #eef2f7;display:grid;gap:8px;grid-template-columns:84px minmax(0,1fr)90px 80px 80px 80px;padding:9px}.event-row{border-bottom:1px solid #eef2f7;display:grid;gap:8px;grid-template-columns:90px 120px 120px minmax(0,1fr);padding:9px}.event-row pre{grid-column:1/-1;margin:0;max-height:120px}.live-head{align-items:center;display:flex;gap:10px;margin:10px 0}.graph-replay{align-items:center;display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}.graph-node{border:1px solid #dbeafe;border-radius:8px;display:flex;flex-direction:column;gap:4px;min-width:140px;padding:10px;position:relative}.graph-node:after{content:'>';color:#94a3b8;position:absolute;right:-12px;top:35%}.graph-node:last-child:after{content:''}.graph-node.failed{border-color:#fecaca;background:#fff7f7}.compare-grid{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:10px}.ops-summary{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr));margin:12px 0}.ops-list{border:1px solid #e5e7eb;border-radius:8px;margin-top:10px}.ops-row{align-items:center;border-bottom:1px solid #eef2f7;display:grid;gap:10px;grid-template-columns:90px minmax(0,1fr)120px minmax(0,1fr);padding:10px}.cost-bars{display:flex;flex-direction:column;gap:8px;margin-top:12px}.cost-row{align-items:center;display:grid;gap:10px;grid-template-columns:120px minmax(0,1fr)80px}.cost-row div{background:#e5e7eb;border-radius:999px;height:10px;overflow:hidden}.cost-row i{background:#2563eb;display:block;height:100%}.pill.offline{background:#fee2e2;color:#991b1b}.cards{grid-template-columns:repeat(8,1fr);margin-bottom:16px}.two{grid-template-columns:minmax(0,1fr)560px}table{width:100%}.mono{font-family:Consolas,monospace}.pill,.duration-pill{background:#eef2ff;border-radius:999px;color:#3730a3;font-size:12px;font-weight:700;padding:4px 8px}.duration-pill{background:#f1f5f9;color:#334155;float:right;font-family:Consolas,monospace}pre{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;max-height:260px;overflow:auto;padding:10px}.empty{padding:24px;text-align:center}.empty-small{padding:12px;text-align:center}.detail-cards{display:grid;gap:8px;grid-template-columns:repeat(5,minmax(0,1fr));margin:12px 0}.detail-card{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:column;padding:8px}.detail-card strong{font-size:18px}.detail-card span{color:#64748b;font-size:12px}.timeline{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;padding:8px}.timeline-row{display:grid;grid-template-columns:16px minmax(0,1fr);gap:8px;padding:8px}.timeline-dot{background:#22c55e;border-radius:999px;height:10px;margin-top:5px;width:10px}.timeline-row.failed .timeline-dot{background:#ef4444}.timeline-row.retry .timeline-dot{background:#f59e0b}.error{color:#b91c1c}.step-list{display:flex;flex-direction:column;gap:10px;max-height:520px;overflow:auto}.step-row{border:1px solid #e5e7eb;border-radius:8px;padding:10px}.step-row pre{max-height:140px;margin:8px 0 0}.tree-list,.checkpoint-list{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;padding:8px}.tree-row,.checkpoint-row{display:flex;gap:8px;align-items:center;padding:6px}.checkpoint-actions{display:flex;align-items:center;gap:10px;margin:0 0 8px}.muted{color:#64748b}@media(max-width:1100px){.detail-cards,.ai-grid,.ai-grid.obs-grid,.ai-panels,.service-grid,.endpoint-grid,.compare-grid,.ops-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}`]
})
export class ObservabilityComponent implements OnInit, OnDestroy {
  agents: any[] = [];
  agentId = 'all';
  summary: any = {};
  runs: any[] = [];
  selected: any;
  steps: any[] = [];
  runTreeRows: any[] = [];
  checkpoints: any[] = [];
  timeline: any[] = [];
  latestState: any = null;
  checkpointLoading = false;
  cols = ['select', 'id', 'agent', 'status', 'actions'];
  selectedRuns: Record<string, boolean> = {};
  pageSizeOptions = [10, 25, 50];
  runPage = { pageIndex: 0, pageSize: 10 };
  runTotal = 0;
  statusFilter = 'all';
  eventTypeFilter = 'all';
  fromFilter = '';
  toFilter = '';
  replayResult = '';
  aiObsOnline = false;
  aiObsHealth: any = null;
  aiObsDashboard: any = null;
  aiObsTraces: any[] = [];
  aiObsState = 'all';
  selectedAiTrace: any = null;
  aiReplay: any = null;
  aiObsMessage = '';
  aiSearch: any = { q: '', agent_id: '', run_id: '', node_id: '', kind: '', from: '', to: '', min_tokens: '', min_cost_usd: '' };
  runtimeServices: any[] = [];
  liveEvents: any[] = [];
  liveStreamActive = false;
  liveStreamMessage = '';
  private liveSource?: EventSource;
  private endpointStorageKey = 'agentchain.observability.endpoints';
  private preferenceStorageKey = 'agentchain.observability.preferences';
  compareLeft: any = null;
  compareRight: any = null;
  compareDiff: any = null;
  evaluations: any[] = [];
  prompts: any[] = [];
  alertRules: any[] = [];
  costSummary: any = null;
  traceFocusMode = false;
  section: 'traces' | 'cost' | 'health' = 'traces';
  private routeSub?: Subscription;

  constructor(public api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.restoreEndpointConfig();
    this.restorePreferences();
    this.syncRuntimeServices();
    this.api.agents().subscribe(a => this.agents = a || []);
    this.routeSub = this.route.paramMap.subscribe(params => {
      const routeSection = String(params.get('section') || 'traces').toLowerCase();
      this.section = ['traces', 'cost', 'health'].includes(routeSection) ? routeSection as any : 'traces';
      this.loadSection();
    });
  }

  ngOnDestroy() {
    this.stopLiveStream();
    this.routeSub?.unsubscribe();
  }

  loadSection() {
    if (this.section === 'traces') {
      this.load();
      this.loadAiObservability();
      return;
    }
    if (this.section === 'cost') {
      this.load();
      this.loadAiObservability();
      this.loadOpsPanels();
      return;
    }
    this.loadRuntimeHealth();
    this.loadAiObservability();
  }

  sectionTitle() {
    if (this.section === 'cost') return 'Cost';
    if (this.section === 'health') return 'Health';
    return 'Traces';
  }

  sectionDescription() {
    if (this.section === 'cost') return 'Track tokens, spend, evaluations, prompts, and alert rules.';
    if (this.section === 'health') return 'Check runtime service status and configure local observability endpoints.';
    return 'Search runs, inspect traces, replay execution, and debug node-level behavior.';
  }

  load() {
    this.api.obsSummary(this.agentId).subscribe({ next: r => this.summary = r || {}, error: _ => this.summary = {} });
    this.api.runsPage(this.agentId, this.runPage.pageIndex, this.runPage.pageSize, this.statusFilter, this.fromFilter, this.toFilter).subscribe({ next: r => { this.runs = r?.content || []; this.runTotal = r?.totalElements || 0; this.pruneSelection(); if (this.runs[0]) this.selectRun(this.runs[0]); else { this.selected = null; this.steps = []; this.timeline = []; } }, error: _ => { this.runs = []; this.steps = []; this.timeline = []; this.runTotal = 0; this.selectedRuns = {}; } });
  }
  onRunPage(event: any) { this.runPage = event; this.savePreferences(); this.load(); }
  resetAndLoad() { this.runPage = { ...this.runPage, pageIndex: 0 }; this.savePreferences(); this.load(); }
  clearFilters() { this.statusFilter = 'all'; this.eventTypeFilter = 'all'; this.fromFilter = ''; this.toFilter = ''; this.resetAndLoad(); }

  loadAiObservability() {
    this.savePreferences();
    this.api.aiObsHealth().subscribe({
      next: health => {
        this.aiObsOnline = true;
        this.aiObsHealth = health;
        this.aiObsMessage = 'Connected';
        this.api.aiObsDashboard().subscribe({ next: d => this.aiObsDashboard = d || {}, error: _ => this.aiObsDashboard = null });
        this.api.aiObsTraces(25, this.aiObsState, this.aiSearchFilters()).subscribe({
          next: r => {
            this.aiObsTraces = r?.items || [];
            if (this.aiObsTraces.length && !this.selectedAiTrace) this.selectAiTrace(this.aiObsTraces[0]);
          },
          error: _ => this.aiObsTraces = []
        });
      },
      error: _ => {
        this.aiObsOnline = false;
        this.aiObsMessage = 'Service not reachable';
        this.aiObsHealth = null;
        this.aiObsDashboard = null;
        this.aiObsTraces = [];
        this.selectedAiTrace = null;
        this.aiReplay = null;
      }
    });
  }

  loadRuntimeHealth() {
    this.syncRuntimeServices();
    this.runtimeServices.forEach(service => {
      service.status = 'checking';
      service.error = '';
      this.api.directHealth(service.url).subscribe({
        next: response => {
          service.status = 'online';
          service.response = response;
        },
        error: err => {
          service.status = 'offline';
          service.error = err?.error?.message || err?.message || 'Not reachable';
        }
      });
    });
  }

  runtimeOnlineCount() {
    return this.runtimeServices.filter(s => s.status === 'online').length;
  }

  loadOpsPanels() {
    this.api.aiObsEvaluations().subscribe({ next: r => this.evaluations = r?.items || [], error: _ => this.evaluations = [] });
    this.api.aiObsPrompts().subscribe({ next: r => this.prompts = r?.items || [], error: _ => this.prompts = [] });
    this.api.aiObsAlerts().subscribe({ next: r => this.alertRules = r?.items || [], error: _ => this.alertRules = [] });
    this.api.aiObsCosts().subscribe({ next: r => this.costSummary = r || {}, error: _ => this.costSummary = null });
  }

  setCompareTrace(side: 'left' | 'right') {
    if (!this.selectedAiTrace) return;
    if (side === 'left') this.compareLeft = this.selectedAiTrace;
    else this.compareRight = this.selectedAiTrace;
    this.compareDiff = null;
  }

  loadTraceDiff() {
    if (!this.compareLeft?.trace_id || !this.compareRight?.trace_id) return;
    this.api.aiObsReplayDiff(this.compareLeft.trace_id, this.compareRight.trace_id).subscribe({
      next: r => this.compareDiff = r,
      error: _ => this.compareDiff = this.localTraceDiff()
    });
  }

  localTraceDiff() {
    if (!this.compareLeft || !this.compareRight) return {};
    return {
      left_trace_id: this.compareLeft.trace_id,
      right_trace_id: this.compareRight.trace_id,
      state_changed: this.compareLeft.state !== this.compareRight.state,
      token_delta: Number(this.compareRight.usage?.total_tokens || 0) - Number(this.compareLeft.usage?.total_tokens || 0),
      cost_delta_usd: Number(this.compareRight.usage?.cost_usd || 0) - Number(this.compareLeft.usage?.cost_usd || 0)
    };
  }

  evaluationPassedCount() {
    return this.evaluations.filter(e => e.passed).length;
  }

  evaluationFailedCount() {
    return this.evaluations.filter(e => !e.passed).length;
  }

  costByState() {
    const byState = this.aiObsDashboard?.summary?.by_state || {};
    const max = Math.max(1, ...Object.values(byState).map((v: any) => Number(v || 0)));
    return Object.entries(byState).map(([state, count]: [string, any]) => ({ state, count, percent: Math.max(4, Number(count || 0) * 100 / max) }));
  }

  resetAiSearch() {
    this.aiSearch = { q: '', agent_id: '', run_id: '', node_id: '', kind: '', from: '', to: '', min_tokens: '', min_cost_usd: '' };
    this.aiObsState = 'all';
    this.savePreferences();
    this.selectedAiTrace = null;
    this.aiReplay = null;
    this.loadAiObservability();
  }

  applyEndpointConfig() {
    this.syncRuntimeServices();
    this.loadRuntimeHealth();
    this.selectedAiTrace = null;
    this.aiReplay = null;
    this.stopLiveStream();
    this.loadAiObservability();
  }

  saveEndpointConfig() {
    const config = {
      aiObservability: this.api.aiObservability,
      runtimeOrchestrator: this.api.runtimeOrchestrator,
      toolExecution: this.api.toolExecution,
      llmInference: this.api.llmInference,
      memoryRag: this.api.memoryRag,
      humanTask: this.api.humanTask
    };
    localStorage.setItem(this.endpointStorageKey, JSON.stringify(config));
    this.aiObsMessage = 'Endpoint URLs saved';
    this.applyEndpointConfig();
  }

  resetEndpointConfig() {
    this.api.aiObservability = 'http://localhost:8090';
    this.api.runtimeOrchestrator = 'http://localhost:8084';
    this.api.toolExecution = 'http://localhost:8085';
    this.api.llmInference = 'http://localhost:8086';
    this.api.memoryRag = 'http://localhost:8087';
    this.api.humanTask = 'http://localhost:8088';
    localStorage.removeItem(this.endpointStorageKey);
    this.applyEndpointConfig();
  }

  copySelectedTraceId() {
    const traceId = this.selectedAiTrace?.trace_id || '';
    if (!traceId) return;
    navigator.clipboard?.writeText(traceId);
    this.aiObsMessage = 'Trace ID copied';
  }

  copyReplayJson() {
    navigator.clipboard?.writeText(this.redactedJson(this.aiReplay || this.selectedAiTrace || {}));
    this.aiObsMessage = 'Replay JSON copied';
  }

  downloadReplayJson() {
    const content = this.redactedJson(this.aiReplay || this.selectedAiTrace || {});
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.selectedAiTrace?.trace_id || 'trace'}-replay.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  toggleLiveStream() {
    if (this.liveStreamActive) {
      this.stopLiveStream();
    } else {
      this.startLiveStream();
    }
  }

  startLiveStream() {
    const traceId = this.selectedAiTrace?.trace_id;
    if (!traceId) return;
    this.stopLiveStream();
    this.liveEvents = [];
    this.liveStreamMessage = 'Connecting';
    const source = new EventSource(this.api.aiObsLiveSseUrl(traceId));
    this.liveSource = source;
    this.liveStreamActive = true;
    source.onmessage = message => {
      try {
        const event = JSON.parse(message.data);
        this.liveEvents = [{ ...event, receivedAt: new Date() }, ...this.liveEvents].slice(0, 100);
        this.liveStreamMessage = 'Receiving events';
      } catch {
        this.liveEvents = [{ type: 'raw', data: message.data, receivedAt: new Date() }, ...this.liveEvents].slice(0, 100);
      }
    };
    source.onerror = () => {
      this.liveStreamMessage = 'Stream disconnected';
      this.stopLiveStream(false);
    };
  }

  stopLiveStream(clearMessage = true) {
    if (this.liveSource) {
      this.liveSource.close();
      this.liveSource = undefined;
    }
    this.liveStreamActive = false;
    if (clearMessage) this.liveStreamMessage = '';
  }

  spanRows() {
    const spans = this.aiReplay?.spans || [];
    if (!spans.length) return [];
    const byParent: Record<string, any[]> = {};
    spans.forEach((span: any) => {
      const parent = span.parent_span_id || span.parentSpanId || 'root';
      byParent[parent] = byParent[parent] || [];
      byParent[parent].push(span);
    });
    const rows: any[] = [];
    const visit = (span: any, depth: number) => {
      rows.push({ span, depth });
      const id = span.span_id || span.spanId || span.id;
      (byParent[id] || []).forEach(child => visit(child, depth + 1));
    };
    const childIds = new Set(spans.map((s: any) => s.span_id || s.spanId || s.id));
    const roots = spans.filter((s: any) => {
      const parent = s.parent_span_id || s.parentSpanId;
      return !parent || !childIds.has(parent);
    });
    roots.forEach((span: any) => visit(span, 0));
    return rows.length ? rows : spans.map((span: any) => ({ span, depth: 0 }));
  }

  eventRows() {
    return this.aiReplay?.events || [];
  }

  graphReplayRows() {
    const spans = this.aiReplay?.spans || [];
    const events = this.aiReplay?.events || [];
    const rows = spans.length
      ? spans.map((span: any) => ({
          label: span.name || span.node_type || span.node_id || 'span',
          nodeId: span.node_id || span.nodeId || span.span_id || span.id,
          status: span.state || 'completed',
          durationMs: span.latency_ms || span.latencyMs || 0,
          failed: String(span.state || '').toLowerCase() === 'failed'
        }))
      : events.map((event: any) => ({
          label: event.node_type || event.nodeType || event.status || 'event',
          nodeId: event.node_id || event.nodeId || event.id,
          status: event.status || 'event',
          durationMs: 0,
          failed: ['error', 'failed'].includes(String(event.status || '').toLowerCase())
        }));
    return rows;
  }

  private aiSearchFilters() {
    const filters: any = {};
    Object.entries(this.aiSearch || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') filters[key] = value;
    });
    return filters;
  }

  private syncRuntimeServices() {
    const previous = new Map(this.runtimeServices.map(s => [s.name, s]));
    this.runtimeServices = [
      { name: 'Observability', url: `${this.api.aiObservability}/health` },
      { name: 'Runtime Orchestrator', url: `${this.api.runtimeOrchestrator}/api/orchestrator/health` },
      { name: 'Tool Execution', url: `${this.api.toolExecution}/api/tool-execution/health` },
      { name: 'LLM Inference', url: `${this.api.llmInference}/api/llm-inference/health` },
      { name: 'Memory/RAG', url: `${this.api.memoryRag}/api/memory-rag/health` },
      { name: 'Human Task', url: `${this.api.humanTask}/api/human-task/health` }
    ].map(service => ({ ...service, status: previous.get(service.name)?.status || 'checking', error: previous.get(service.name)?.error || '' }));
  }

  private restoreEndpointConfig() {
    try {
      const raw = localStorage.getItem(this.endpointStorageKey);
      if (!raw) return;
      const config = JSON.parse(raw);
      this.api.aiObservability = config.aiObservability || this.api.aiObservability;
      this.api.runtimeOrchestrator = config.runtimeOrchestrator || this.api.runtimeOrchestrator;
      this.api.toolExecution = config.toolExecution || this.api.toolExecution;
      this.api.llmInference = config.llmInference || this.api.llmInference;
      this.api.memoryRag = config.memoryRag || this.api.memoryRag;
      this.api.humanTask = config.humanTask || this.api.humanTask;
      this.aiObsMessage = 'Saved endpoint URLs loaded';
    } catch {
      localStorage.removeItem(this.endpointStorageKey);
    }
  }

  private savePreferences() {
    const prefs = {
      agentId: this.agentId,
      statusFilter: this.statusFilter,
      eventTypeFilter: this.eventTypeFilter,
      fromFilter: this.fromFilter,
      toFilter: this.toFilter,
      aiObsState: this.aiObsState,
      aiSearch: this.aiSearch,
      runPage: this.runPage
    };
    localStorage.setItem(this.preferenceStorageKey, JSON.stringify(prefs));
  }

  private restorePreferences() {
    try {
      const raw = localStorage.getItem(this.preferenceStorageKey);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      this.agentId = prefs.agentId || this.agentId;
      this.statusFilter = prefs.statusFilter || this.statusFilter;
      this.eventTypeFilter = prefs.eventTypeFilter || this.eventTypeFilter;
      this.fromFilter = prefs.fromFilter || '';
      this.toFilter = prefs.toFilter || '';
      this.aiObsState = prefs.aiObsState || this.aiObsState;
      this.aiSearch = { ...this.aiSearch, ...(prefs.aiSearch || {}) };
      this.runPage = { ...this.runPage, ...(prefs.runPage || {}) };
    } catch {
      localStorage.removeItem(this.preferenceStorageKey);
    }
  }

  selectAiTrace(trace: any) {
    this.stopLiveStream();
    this.liveEvents = [];
    this.selectedAiTrace = trace;
    this.aiReplay = null;
    if (!trace?.trace_id) return;
    this.api.aiObsReplay(trace.trace_id).subscribe({ next: r => this.aiReplay = r, error: _ => this.aiReplay = null });
  }

  sendSampleTrace() {
    const traceId = `ui-sample-${Date.now()}`;
    const event = {
      trace_id: traceId,
      run_id: traceId,
      status: 'done',
      node_id: 'ui_sample_llm',
      node_type: 'LLM',
      output: {
        answer: 'Sample observability event from UI',
        provider: 'sample',
        model: 'sample-model',
        usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 },
        cost: 0.00001
      }
    };
    this.api.aiObsRuntimeEvent(event).subscribe({ next: _ => { this.selectedAiTrace = null; this.loadAiObservability(); }, error: _ => this.loadAiObservability() });
  }

  copyObservabilityEnv() {
    const value = `$env:OBSERVABILITY_SERVICE_URL="${this.api.aiObservability}"`;
    navigator.clipboard?.writeText(value);
    this.aiObsMessage = 'Runtime env copied';
  }

  openObservabilityDocs() {
    window.open(`${this.api.aiObservability}/docs`, '_blank');
  }

  selectRun(run: any) {
    this.api.runDetail(run.id).subscribe({ next: d => { this.selected = d.run || run; this.steps = d.steps || []; this.timeline = d.timeline || []; }, error: _ => { this.selected = run; this.steps = []; this.timeline = []; } });
    this.api.runTree(run.id).subscribe({ next: tree => this.runTreeRows = this.flattenTree(tree), error: _ => this.runTreeRows = [] });
    this.loadCheckpoints(run.id);
  }

  loadCheckpoints(runId: string) {
    this.checkpointLoading = true;
    this.api.runCheckpoints(runId).subscribe({
      next: r => {
        this.checkpoints = r?.checkpoints || [];
        this.checkpointLoading = false;
      },
      error: _ => {
        this.checkpoints = [];
        this.checkpointLoading = false;
      }
    });
    this.api.runState(runId).subscribe({
      next: r => this.latestState = r?.state || r?.latest_checkpoint || null,
      error: _ => this.latestState = null
    });
  }

  agentName(id: string) {
    return this.agents.find(a => a.id === id)?.name || (id ? this.shortId(id) : '-');
  }

  shortId(id: string) {
    return id ? id.slice(0, 8) : '-';
  }

  formatDuration(ms: any) {
    const value = Number(ms || 0);
    if (!Number.isFinite(value) || value <= 0) return '0 ms';
    if (value < 1000) return `${Math.round(value)} ms`;
    return `${(value / 1000).toFixed(value < 10000 ? 2 : 1)} s`;
  }

  stepToolName(step: any) {
    const update = step?.eventJson?.update || step?.outputJson || {};
    return update.tool_name || update.toolName || update.tool_result?.tool || update.tool_result?.name || update.tool_id || update.toolId || '';
  }

  stepToolStatus(step: any) {
    const update = step?.eventJson?.update || step?.outputJson || {};
    return update.tool_status || update.toolStatus || update.tool_result?.status || '';
  }

  isTimelineFailed(item: any) {
    return ['ERROR', 'ABORTED'].includes(String(item?.status || '').toUpperCase()) || !!item?.error;
  }

  replaySelectedRun(edit: boolean) {
    if (!this.selected?.agentId) return;
    const input = this.selected.inputJson || {};
    const message = this.messageFromInput(input);
    const nextMessage = edit ? prompt('Edit replay message/input', message) : message;
    if (!nextMessage?.trim()) return;
    this.replayResult = 'Starting replay...';
    this.api.getAgent(this.selected.agentId).subscribe({
      next: agent => {
        this.api.chat(this.selected.agentId, `replay-${Date.now()}-${Math.random()}`, nextMessage.trim(), agent.graphJson, undefined, [], input).subscribe({
          next: res => {
            const runId = res.run_id || res.runId || res.id;
            this.replayResult = runId ? `Replay started: ${this.shortId(runId)}` : 'Replay started.';
            this.resetAndLoad();
          },
          error: err => this.replayResult = err?.error?.message || err?.message || 'Replay failed to start.'
        });
      },
      error: err => this.replayResult = err?.error?.message || err?.message || 'Unable to load agent for replay.'
    });
  }

  private messageFromInput(input: any): string {
    if (typeof input === 'string') return input;
    if (typeof input?.message === 'string') return input.message;
    if (typeof input?.input?.message === 'string') return input.input.message;
    return JSON.stringify(input || {});
  }

  redactedJson(value: any): string {
    try { return JSON.stringify(this.redactSecrets(value), null, 2); } catch { return this.redactText(String(value)); }
  }
  private redactText(value: string): string {
    return String(value || '')
      .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s",}]+/gi, '$1***')
      .replace(/((?:api[_-]?key|token|secret|password|credential)\s*[:=]\s*)["']?[^"',}\s]+["']?/gi, '$1***');
  }
  private redactSecrets(value: any): any {
    if (Array.isArray(value)) return value.map(v => this.redactSecrets(v));
    if (!value || typeof value !== 'object') return typeof value === 'string' ? this.redactText(value) : value;
    const out: any = {};
    for (const [key, raw] of Object.entries(value)) out[key] = /(authorization|api[_-]?key|token|secret|password|credential)/i.test(key) ? '***' : this.redactSecrets(raw);
    return out;
  }

  filteredTimeline() { return this.timeline.filter(t => this.matchesEventFilter(this.timelineKind(t))); }
  filteredSteps() { return this.steps.filter(s => this.matchesEventFilter(this.stepKind(s))); }
  detailSummaryCards() {
    return [
      { label: 'Tool calls', count: this.steps.filter(s => this.stepKind(s) === 'tool').length },
      { label: 'Guardrails', count: this.steps.filter(s => this.stepKind(s) === 'guardrail').length },
      { label: 'Missing params', count: this.steps.filter(s => this.stepKind(s) === 'missing_params').length },
      { label: 'Human approvals', count: this.steps.filter(s => this.stepKind(s) === 'human').length },
      { label: 'Failed nodes', count: this.steps.filter(s => this.stepKind(s) === 'failed').length }
    ];
  }
  private matchesEventFilter(kind: string) {
    return this.eventTypeFilter === 'all' || kind === this.eventTypeFilter || (this.eventTypeFilter === 'failed' && kind === 'failed');
  }
  private timelineKind(item: any): string {
    if (this.isTimelineFailed(item)) return 'failed';
    const text = JSON.stringify(item || {}).toLowerCase();
    if (item?.tool || text.includes('tool')) return 'tool';
    if (text.includes('guardrail')) return 'guardrail';
    if (text.includes('missing') && text.includes('param')) return 'missing_params';
    if (text.includes('human') || text.includes('approval')) return 'human';
    return 'other';
  }
  private stepKind(step: any): string {
    if (this.isTimelineFailed(step) || ['ERROR', 'FAILED', 'ABORTED'].includes(String(step?.eventStatus || step?.status || '').toUpperCase())) return 'failed';
    const update = step?.eventJson?.update || step?.outputJson || {};
    const text = JSON.stringify({ step, update }).toLowerCase();
    if (this.stepToolName(step) || text.includes('tool_result') || text.includes('tool_name')) return 'tool';
    if (text.includes('missing') && text.includes('param')) return 'missing_params';
    if (text.includes('guardrail')) return 'guardrail';
    if (text.includes('human') || text.includes('approval') || String(step?.nodeType || '').includes('HUMAN')) return 'human';
    return 'other';
  }

  toggle(id: string, event: Event) { this.selectedRuns[id] = (event.target as HTMLInputElement).checked; }
  toggleAll(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.runs.forEach(r => this.selectedRuns[r.id] = checked); }
  selectedCount() { return this.runs.filter(r => this.selectedRuns[r.id]).length; }
  allSelected() { return this.runs.length > 0 && this.selectedCount() === this.runs.length; }
  cancelSelected() { const rows = this.runs.filter(r => this.selectedRuns[r.id]); if (!rows.length || !confirm(`Cancel ${rows.length} selected run${rows.length === 1 ? '' : 's'}?`)) return; forkJoin(rows.map(r => this.api.cancelRun(r.id, 'cancelled_from_observability'))).subscribe(() => this.load()); }
  private pruneSelection() { const ids = new Set(this.runs.map(r => r.id)); Object.keys(this.selectedRuns).forEach(id => { if (!ids.has(id)) delete this.selectedRuns[id]; }); }

  private flattenTree(node: any, depth = 0): any[] {
    if (!node?.run) return [];
    const rows = depth === 0 ? [] : [{ run: node.run, depth }];
    for (const child of node.children || []) rows.push(...this.flattenTree(child, depth + 1));
    return rows;
  }
}
