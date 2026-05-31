import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

type ChatRole = 'user' | 'agent' | 'system';

interface ChatMessage {
  role: ChatRole;
  text: string;
  progress?: string[];
  progressVisible?: boolean;
  run?: MessageRunPreview;
}

interface MessageRunPreview {
  runId: string;
  status?: string;
  logs: RunLog[];
  executionNodes: ExecutionNode[];
  nodeStatuses: Record<string, string>;
  activeNode?: string;
  startedAt?: number;
  metrics?: any;
}

interface RunLog {
  status: string;
  nodeId?: string;
  nodeType?: string;
  message: string;
  durationMs?: number;
  event?: any;
}

interface ExecutionNode {
  id: string;
  label: string;
  type: string;
  status: string;
}

interface ChatGraphNode {
  id: string;
  label: string;
  type: string;
  position: { x: number; y: number };
}

interface ChatGraphEdge {
  id?: string;
  source: string;
  target: string;
  type?: string;
}

interface HumanPrompt {
  title: string;
  message: string;
  approvalType?: string;
  choices?: string[];
  details?: any;
  formSchema?: any;
  formValues?: Record<string, any>;
  summaryCards?: { label: string; value: string; tone?: string }[];
}

interface MissingParamRequest {
  toolName: string;
  missingArgs: string[];
  examples: Record<string, any>;
  values: Record<string, any>;
  message?: string;
  contextMessage?: string;
  contextInput?: Record<string, any>;
}

@Component({
  selector: 'app-chat',
  template: `
  <div class="page">
    <div class="chat-header">
      <div>
        <h2>Agent Chat</h2>
        <p class="muted">Conversations are saved to your user account.</p>
      </div>

      <mat-form-field appearance="outline" class="agent-select">
        <mat-label>Agent</mat-label>
        <mat-select [(ngModel)]="agentId" (selectionChange)="onAgentChanged()">
          <mat-option *ngFor="let a of agents" [value]="a.id">{{ a.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="agent-select">
        <mat-label>Environment</mat-label>
        <mat-select [(ngModel)]="selectedEnvironmentKey">
          <mat-option value="dev">dev</mat-option>
          <mat-option *ngFor="let env of environments" [value]="env.environmentKey">{{ env.environmentKey }}</mat-option>
        </mat-select>
      </mat-form-field>

      <button mat-stroked-button color="primary" class="embed-button" (click)="copyEmbedWidget()" [disabled]="!agentId">
        <mat-icon>content_copy</mat-icon>
        Copy widget
      </button>
      <button mat-raised-button color="primary" class="embed-button" (click)="openRunReview()" [disabled]="!currentRunId && logs.length === 0">
        <mat-icon>visibility</mat-icon>
        Preview
      </button>
      <button mat-stroked-button color="primary" class="embed-button" (click)="toggleExecutionPanel()" [disabled]="!currentRunId && logs.length === 0">
        <mat-icon>{{ executionCollapsed ? 'account_tree' : 'visibility_off' }}</mat-icon>
        {{ executionCollapsed ? 'Show execution' : 'Hide execution' }}
      </button>
    </div>

    <div class="chat-shell" [class.history-collapsed]="historyCollapsed" [class.execution-open]="!executionCollapsed">
      <mat-card class="history-card" [class.collapsed-panel]="historyCollapsed">
        <button
          type="button"
          class="collapsed-toggle"
          *ngIf="historyCollapsed; else historyExpanded"
          title="Show chats"
          (click)="toggleHistoryPanel()">
          <mat-icon>chevron_right</mat-icon>
          <span>Chats</span>
        </button>

        <ng-template #historyExpanded>
          <div class="history-header">
            <h3>Chats</h3>
            <div class="panel-actions">
              <button mat-icon-button type="button" title="Hide chats" (click)="toggleHistoryPanel()">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <button mat-stroked-button color="primary" (click)="newChat()">
                <mat-icon>add</mat-icon>
                New
              </button>
            </div>
          </div>

          <div class="conversation-list">
            <button
              type="button"
              class="conversation-item"
              *ngFor="let c of conversations"
              [class.active]="c.id === conversationId"
              (click)="loadConversation(c.id)">
              <span class="conversation-title">{{ c.title || 'New chat' }}</span>
              <span class="conversation-meta">{{ conversationAgentName(c.agentId) }}</span>
            </button>
          </div>

          <button
            mat-button
            color="warn"
            class="delete-button"
            *ngIf="conversationId"
            (click)="deleteCurrentConversation()">
            <mat-icon>delete</mat-icon>
            Delete chat
          </button>
        </ng-template>
      </mat-card>

      <mat-card class="conversation-card">
        <div class="messages" #messagesPane>
          <div *ngIf="messages.length === 0" class="empty-state">
            Start a new conversation or select a previous chat.
          </div>

          <div *ngFor="let m of messages; let i = index" class="message-row" [class.user]="m.role === 'user'">
            <div class="bubble" [class.user-bubble]="m.role === 'user'" [class.agent-bubble]="m.role === 'agent'">
              <div class="bubble-header">
                <div class="bubble-label">{{ m.role === 'user' ? 'You' : 'Agent' }}</div>
                <div class="message-actions">
                  <button mat-icon-button type="button" title="Copy message" (click)="copyMessage(m)">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                  <button mat-icon-button type="button" title="Edit message" *ngIf="m.role === 'user'" [disabled]="loading || awaitingHuman" (click)="editMessage(m)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button type="button" title="Open run preview" *ngIf="canPreviewMessage(i)" (click)="openRunReview(m)">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </div>
              </div>
              <div class="bubble-text">{{ m.text }}</div>
              <div class="progress-trail" *ngIf="m.role === 'user' && (loading || awaitingHuman) && m.progressVisible && m.progress?.length">
                <div class="progress-row" *ngFor="let p of m.progress">
                  <span class="progress-dot"></span>
                  <span>{{ p }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="human-panel" *ngIf="awaitingHuman && humanPrompt">
          <div>
            <strong>{{ humanPrompt.title }}</strong>
            <p>{{ humanPrompt.message }}</p>
          </div>
          <div class="human-summary" *ngIf="humanPrompt.summaryCards?.length">
            <div class="summary-card" *ngFor="let card of humanPrompt.summaryCards" [class.good]="card.tone === 'good'" [class.warn]="card.tone === 'warn'" [class.bad]="card.tone === 'bad'">
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </div>
          </div>
          <div class="human-details" *ngIf="humanDetailRows.length">
            <details class="human-detail-row" *ngFor="let row of humanDetailRows">
              <summary>{{ row.key }}</summary>
              <pre>{{ row.value }}</pre>
            </details>
          </div>
          <div class="human-form" *ngIf="humanPrompt.approvalType === 'form' && humanFormFields.length">
            <ng-container *ngFor="let field of humanFormFields">
              <mat-form-field appearance="outline" class="full-width" *ngIf="field.type === 'select'">
                <mat-label>{{ field.label }}</mat-label>
                <mat-select [(ngModel)]="humanPrompt.formValues![field.key]">
                  <mat-option *ngFor="let option of field.options" [value]="option">{{ option }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width" *ngIf="field.type !== 'select' && field.type !== 'checkbox'">
                <mat-label>{{ field.label }}</mat-label>
                <textarea matInput rows="3" *ngIf="field.type === 'textarea'" [(ngModel)]="humanPrompt.formValues![field.key]"></textarea>
                <input matInput *ngIf="field.type !== 'textarea'" [(ngModel)]="humanPrompt.formValues![field.key]">
              </mat-form-field>
              <mat-checkbox *ngIf="field.type === 'checkbox'" [(ngModel)]="humanPrompt.formValues![field.key]">{{ field.label }}</mat-checkbox>
            </ng-container>
            <button mat-raised-button color="primary" type="button" (click)="submitHumanForm()">Submit</button>
          </div>
          <div class="human-actions" *ngIf="humanPrompt.approvalType === 'approve_reject'">
            <button mat-stroked-button color="primary" (click)="resumeHuman('approved')">Approve</button>
            <button mat-stroked-button color="warn" (click)="resumeHuman('rejected')">Reject</button>
          </div>
          <div class="human-actions" *ngIf="humanPrompt.approvalType === 'choice'">
            <button mat-stroked-button color="primary" *ngFor="let choice of humanPrompt.choices" (click)="resumeHuman(choice)">{{ choice }}</button>
          </div>
        </div>

        <div class="missing-param-panel" *ngIf="missingParamRequest">
          <div>
            <strong>Required parameters needed</strong>
            <p>{{ missingParamRequest.message || ('Provide values before calling ' + missingParamRequest.toolName + '.') }}</p>
          </div>
          <div class="missing-param-grid">
            <mat-form-field appearance="outline" class="full-width" *ngFor="let arg of missingParamRequest.missingArgs">
              <mat-label>{{ arg }}</mat-label>
              <input matInput [(ngModel)]="missingParamRequest.values[arg]" [placeholder]="missingParamExample(arg)">
              <mat-hint>Example: {{ missingParamExample(arg) }}</mat-hint>
            </mat-form-field>
          </div>
          <div class="human-actions">
            <button mat-raised-button color="primary" type="button" (click)="submitMissingParams()">Submit And Continue</button>
            <button mat-button type="button" (click)="missingParamRequest=undefined">Dismiss</button>
          </div>
        </div>

        <div class="composer">
          <input #chatFile type="file" hidden accept=".csv,.txt,.json,text/csv,text/plain,application/json" (change)="selectChatFile($event)">
          <mat-form-field appearance="outline" class="message-input">
            <mat-label>{{ awaitingHuman ? 'Human response' : 'Message' }}</mat-label>
            <textarea
              matInput
              [(ngModel)]="message"
              rows="3"
              [placeholder]="messagePlaceholder"
              (keydown.enter)="onComposerEnter($event)">
            </textarea>
          </mat-form-field>

          <div class="attachment-chip" *ngIf="attachedFileName">
            <mat-icon>attach_file</mat-icon>
            <span>{{ attachedFileName }}</span>
            <button mat-icon-button type="button" title="Remove file" (click)="clearChatFile()"><mat-icon>close</mat-icon></button>
          </div>
          <button mat-icon-button type="button" title="Attach CSV or text file" [disabled]="loading || awaitingHuman" (click)="chatFile.click()">
            <mat-icon>attach_file</mat-icon>
          </button>
          <button mat-raised-button color="primary" (click)="send()" [disabled]="loading || (!message.trim() && !attachedFileText) || !agentId">
            {{ loading ? 'Running...' : (awaitingHuman ? 'Resume' : 'Send') }}
          </button>
        </div>
      </mat-card>

      <div class="execution-backdrop" *ngIf="!executionCollapsed" (click)="toggleExecutionPanel()"></div>
      <mat-card class="run-card" *ngIf="!executionCollapsed">
          <div class="run-card-header">
            <div>
              <h3>Execution</h3>
              <p class="muted" *ngIf="executionPanelActiveNode()">Active: {{ executionPanelActiveNode() }}</p>
              <p class="muted" *ngIf="!executionPanelActiveNode()">No active run</p>
            </div>
            <div class="panel-actions">
              <span class="status-pill" [class.running]="executionPanelStatus() === 'running'">{{ executionPanelStatus() | titlecase }}</span>
              <button mat-icon-button type="button" title="Hide execution" (click)="toggleExecutionPanel()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <div class="run-id" *ngIf="previewRunId()">Run {{ previewRunId() }}</div>

          <div class="execution-overlay-body">
          <div class="execution-canvas" [class.panning]="executionPanning" (wheel)="executionWheel($event)" (mousedown)="executionPanStart($event)" (mousemove)="executionPanMove($event)">
            <div class="execution-zoom-controls" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
              <button mat-icon-button type="button" title="Zoom out" (click)="executionZoomOut()"><mat-icon>remove</mat-icon></button>
              <button mat-button type="button" class="zoom-value" title="Reset zoom" (click)="executionResetZoom()">{{ executionZoomPercent() }}%</button>
              <button mat-icon-button type="button" title="Zoom in" (click)="executionZoomIn()"><mat-icon>add</mat-icon></button>
              <span class="zoom-divider"></span>
              <button mat-icon-button type="button" title="Fit graph to view" (click)="executionFitToView($event)"><mat-icon>fit_screen</mat-icon></button>
            </div>
            <div *ngIf="graphNodes.length === 0" class="empty-flow">Agent diagram will appear after selecting an agent.</div>
            <div class="execution-board" *ngIf="graphNodes.length" [style.width.px]="executionCanvasWidth()" [style.height.px]="executionCanvasHeight()" [style.transform]="executionTransform()">
              <svg class="execution-edges" [attr.width]="executionCanvasWidth()" [attr.height]="executionCanvasHeight()">
                <path *ngFor="let edge of executionEdges()" class="execution-edge" [attr.d]="executionEdgePath(edge)"></path>
              </svg>
              <div
                class="execution-node"
                *ngFor="let node of graphNodes"
                [class.running]="nodeStatus(node.id) === 'running'"
                [class.done]="nodeStatus(node.id) === 'done'"
                [class.error]="nodeStatus(node.id) === 'error'"
                [style.left.px]="graphNodeX(node)"
                [style.top.px]="graphNodeY(node)">
                <span class="flow-type">{{ node.type }}</span>
                <strong>{{ node.label }}</strong>
                <small>{{ nodeStatus(node.id) }}</small>
              </div>
            </div>
            <div class="flow-row" *ngFor="let node of executionPanelNodes(); let i = index">
              <div class="flow-node" [class.running]="node.status === 'running'" [class.done]="node.status === 'done'" [class.error]="node.status === 'error'">
                <span class="flow-type">{{ node.type }}</span>
                <strong>{{ node.label }}</strong>
                <small>{{ node.status }}</small>
              </div>
              <div class="flow-arrow" *ngIf="i < executionPanelNodes().length - 1">↓</div>
            </div>
          </div>

          <section class="execution-details" open>
            <div class="execution-log-header">
              <h3>Execution Logs</h3>
              <span>{{ executionPanelLogs().length }} events</span>
            </div>
            <div class="logs">
            <div *ngIf="executionPanelLogs().length === 0" class="empty-log">Execution events will appear here.</div>
            <div *ngFor="let l of executionPanelLogs()" class="log-row">
              <span class="log-status">{{ l.status }}</span>
              <span class="log-node" *ngIf="l.nodeType || l.nodeId">{{ l.nodeType || l.nodeId }}</span>
              <span class="log-message">{{ redactText(l.message) }}</span>
              <span class="log-time" *ngIf="l.durationMs !== undefined">{{ formatDuration(l.durationMs) }}</span>
            </div>
            </div>
          </section>
          </div>
      </mat-card>
    </div>

    <div class="review-overlay" *ngIf="reviewOpen">
      <div class="review-header">
        <div>
          <h2>Run Preview</h2>
          <p class="muted" *ngIf="previewRunId()">Run {{ previewRunId() }}</p>
        </div>
        <div class="panel-actions">
          <span class="status-pill" [class.running]="loading">{{ loading ? 'Running' : (awaitingHuman ? 'Waiting' : 'Idle') }}</span>
          <button mat-icon-button type="button" title="Close preview" (click)="closeRunReview()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <div class="preview-metrics">
        <div class="preview-metric" *ngFor="let card of previewMetricCards()">
          <span>{{card.label}}</span>
          <strong>{{card.value}}</strong>
        </div>
      </div>

      <div class="review-body">
        <section class="review-canvas">
          <div class="execution-canvas fullscreen" [class.panning]="executionPanning" (click)="selectPreviewNode('')" (wheel)="executionWheel($event)" (mousedown)="executionPanStart($event)" (mousemove)="executionPanMove($event)">
            <div class="execution-zoom-controls" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
              <button mat-icon-button type="button" title="Zoom out" (click)="executionZoomOut()"><mat-icon>remove</mat-icon></button>
              <button mat-button type="button" class="zoom-value" title="Reset zoom" (click)="executionResetZoom()">{{ executionZoomPercent() }}%</button>
              <button mat-icon-button type="button" title="Zoom in" (click)="executionZoomIn()"><mat-icon>add</mat-icon></button>
              <span class="zoom-divider"></span>
              <button mat-icon-button type="button" title="Fit graph to view" (click)="executionFitToView($event)"><mat-icon>fit_screen</mat-icon></button>
            </div>
            <div *ngIf="graphNodes.length === 0" class="empty-flow">Agent diagram is not available for this run.</div>
            <div class="execution-board" *ngIf="graphNodes.length" [style.width.px]="executionCanvasWidth()" [style.height.px]="executionCanvasHeight()" [style.transform]="executionTransform()">
              <svg class="execution-edges" [attr.width]="executionCanvasWidth()" [attr.height]="executionCanvasHeight()">
                <path *ngFor="let edge of executionEdges()" class="execution-edge" [attr.d]="executionEdgePath(edge)"></path>
              </svg>
              <div
                class="execution-node"
                *ngFor="let node of graphNodes"
                [class.running]="nodeStatus(node.id) === 'running'"
                [class.done]="nodeStatus(node.id) === 'done'"
                [class.error]="nodeStatus(node.id) === 'error'"
                [class.selected]="selectedPreviewNodeId === node.id"
                [style.left.px]="graphNodeX(node)"
                [style.top.px]="graphNodeY(node)"
                (click)="selectPreviewNode(node.id, $event)">
                <span class="flow-type">{{ node.type }}</span>
                <strong>{{ node.label }}</strong>
                <small>{{ nodeStatus(node.id) }}</small>
              </div>
            </div>
          </div>
        </section>

        <aside class="review-steps">
          <h3>{{ previewInspectorTitle() }}</h3>
          <p class="muted">{{ selectedPreviewNodeId ? 'Actual node input and output from the latest run event.' : 'Agent-level request, response, and run result.' }}</p>
          <div class="preview-timeline">
            <button type="button" class="preview-timeline-row" *ngFor="let item of previewTimeline()" [class.active]="item.nodeId && item.nodeId === selectedPreviewNodeId" [class.error]="item.kind === 'error'" [class.guardrail]="item.kind === 'guardrail'" [class.tool]="item.kind === 'tool'" (click)="item.nodeId ? selectPreviewNode(item.nodeId, $event) : null">
              <span class="timeline-kind">{{item.kind}}</span>
              <strong>{{item.title}}</strong>
              <small>{{item.detail}}</small>
            </button>
          </div>
          <div class="inspector-panel">
            <section class="inspector-section" *ngFor="let section of previewInspectorSections()">
              <h4>{{ section.title }}</h4>
              <div class="inspector-empty" *ngIf="!section.value">No data captured yet.</div>
              <pre *ngIf="section.value">{{ section.value }}</pre>
            </section>
          </div>
        </aside>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .chat-header {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .chat-header h2,
    .history-card h3,
    .run-card h3 {
      margin: 0;
    }

    .agent-select {
      width: 280px;
    }

    .embed-button {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      height: 40px;
    }

    .chat-shell {
      display: grid;
      gap: 16px;
      grid-template-columns: 260px minmax(0, 1fr);
      height: calc(100vh - 170px);
      min-height: 0;
      transition: grid-template-columns .18s ease;
    }

    .chat-shell.history-collapsed {
      grid-template-columns: 56px minmax(0, 1fr);
    }

    .chat-shell.history-collapsed.execution-open {
      grid-template-columns: 56px minmax(0, 1fr);
    }

    .history-card,
    .conversation-card,
    .run-card {
      display: none;
      height: calc(100vh - 170px);
      min-height: 0;
      overflow: hidden;
    }

    .conversation-card,
    .run-card,
    .history-card {
      display: flex;
      flex-direction: column;
    }

    .history-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .history-header button,
    .delete-button {
      display: inline-flex;
      gap: 6px;
      align-items: center;
    }

    .panel-actions {
      align-items: center;
      display: inline-flex;
      gap: 8px;
    }

    .panel-actions button[mat-icon-button] {
      align-items: center;
      display: inline-flex;
      justify-content: center;
    }

    .collapsed-panel {
      align-items: center;
      justify-content: stretch;
      padding: 8px;
    }

    .collapsed-toggle {
      align-items: center;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #374151;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      font-weight: 700;
      gap: 8px;
      height: 100%;
      justify-content: flex-start;
      letter-spacing: .02em;
      min-height: 160px;
      padding: 12px 6px;
      width: 100%;
    }

    .collapsed-toggle span {
      writing-mode: vertical-rl;
    }

    .collapsed-toggle:hover {
      background: #eef2ff;
      border-color: #c7d2fe;
      color: #3730a3;
    }

    .execution-toggle span {
      transform: rotate(180deg);
    }

    .conversation-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: calc(100vh - 280px);
      overflow: auto;
    }

    .conversation-item {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      padding: 10px;
      text-align: left;
      width: 100%;
    }

    .conversation-item.active {
      background: #eef2ff;
      border-color: #818cf8;
    }

    .conversation-title {
      color: #111827;
      display: block;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .conversation-meta {
      color: #6b7280;
      display: block;
      font-size: 12px;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .delete-button {
      margin-top: 12px;
      width: 100%;
    }

    .messages {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding: 4px;
      scroll-behavior: smooth;
    }

    .message-row {
      display: flex;
    }

    .message-row.user {
      justify-content: flex-end;
    }

    .bubble {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      max-width: 78%;
      padding: 8px 10px 10px;
      white-space: pre-wrap;
    }

    .user-bubble {
      background: #eef2ff;
      border-color: #c7d2fe;
    }

    .agent-bubble {
      background: #ffffff;
    }

    .bubble-header {
      align-items: center;
      display: flex;
      gap: 8px;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .bubble-label {
      color: #6b7280;
      font-size: 12px;
      font-weight: 600;
    }

    .message-actions {
      align-items: center;
      display: flex;
      gap: 2px;
      opacity: .72;
      transition: opacity .15s ease;
    }

    .bubble:hover .message-actions,
    .message-actions:focus-within {
      opacity: 1;
    }

    .message-actions button {
      color: #64748b;
      height: 28px;
      line-height: 28px;
      width: 28px;
    }

    .message-actions mat-icon {
      font-size: 17px;
      height: 17px;
      line-height: 17px;
      width: 17px;
    }

    .bubble-text {
      line-height: 1.45;
    }

    .progress-trail {
      border-top: 1px solid #dbe3ff;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 10px;
      padding-top: 8px;
    }

    .progress-row {
      align-items: center;
      color: #4b5563;
      display: flex;
      font-size: 12px;
      gap: 8px;
    }

    .progress-dot {
      animation: pulse 1.2s ease-in-out infinite;
      background: #4f46e5;
      border-radius: 999px;
      height: 7px;
      width: 7px;
    }

    @keyframes pulse {
      0%, 100% { opacity: .35; transform: scale(.9); }
      50% { opacity: 1; transform: scale(1.1); }
    }

    .composer {
      align-items: flex-start;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 12px;
      padding-top: 16px;
    }

    .attachment-chip {
      align-items: center;
      align-self: center;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 8px;
      color: #1e293b;
      display: flex;
      gap: 4px;
      max-width: 220px;
      padding: 3px 6px;
    }

    .attachment-chip span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .attachment-chip mat-icon {
      color: #3f51b5;
      margin: 0;
    }

    .human-panel,
    .missing-param-panel {
      align-items: flex-start;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 10px;
      display: grid;
      gap: 12px;
      margin-top: 10px;
      padding: 12px;
    }

    .missing-param-panel {
      background: #f8fafc;
      border-color: #d1d5db;
    }

    .human-panel p,
    .missing-param-panel p {
      color: #4b5563;
      margin: 4px 0 0;
      white-space: pre-wrap;
    }

    .human-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .human-details {
      display: grid;
      gap: 8px;
      margin: 10px 0 12px;
      max-height: 180px;
      overflow: auto;
    }

    .human-detail-row {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .human-detail-row summary {
      background: #f8fafc;
      color: #475569;
      cursor: pointer;
      display: block;
      font-size: 12px;
      font-weight: 800;
      padding: 6px 8px;
      text-transform: uppercase;
    }

    .human-detail-row pre {
      background: #fff;
      color: #0f172a;
      font-size: 12px;
      margin: 0;
      max-height: 150px;
      overflow: auto;
      padding: 8px;
      white-space: pre-wrap;
    }

    .human-summary {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      width: 100%;
    }

    .summary-card {
      background: #fff;
      border: 1px solid #dbe3f0;
      border-radius: 8px;
      display: grid;
      gap: 4px;
      padding: 10px;
    }

    .summary-card span {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .summary-card strong {
      color: #0f172a;
      font-size: 16px;
      overflow-wrap: anywhere;
    }

    .summary-card.good {
      border-color: #86efac;
      background: #f0fdf4;
    }

    .summary-card.warn {
      border-color: #facc15;
      background: #fefce8;
    }

    .summary-card.bad {
      border-color: #fca5a5;
      background: #fef2f2;
    }

    .human-form {
      align-items: end;
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(3, minmax(180px, 1fr)) minmax(220px, 1fr) minmax(160px, 220px);
      margin-bottom: 12px;
    }

    .human-form .full-width {
      min-width: 0;
    }

    .human-form textarea {
      min-height: 72px;
      resize: vertical;
    }

    .missing-param-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      width: 100%;
    }

    .full-width {
      width: 100%;
    }

    .message-input {
      flex: 1;
    }

    .run-card-header {
      align-items: flex-start;
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .execution-backdrop {
      background: rgba(15, 23, 42, .18);
      inset: 0;
      position: fixed;
      z-index: 850;
    }

    .run-card {
      bottom: 24px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, .24);
      height: auto;
      left: 24px;
      max-width: none;
      position: fixed;
      right: 24px;
      top: 92px;
      width: auto;
      z-index: 860;
    }

    .execution-overlay-body {
      display: grid;
      flex: 1 1 auto;
      gap: 16px;
      grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
      min-height: 0;
    }

    .status-pill {
      background: #f3f4f6;
      border-radius: 999px;
      color: #374151;
      font-size: 12px;
      font-weight: 600;
      padding: 5px 10px;
    }

    .status-pill.running {
      background: #dcfce7;
      color: #166534;
    }

    .preview-metrics {
      border-bottom: 1px solid #e5e7eb;
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(5, minmax(120px, 1fr));
      padding: 10px 18px 14px;
    }

    .preview-metric {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: grid;
      gap: 4px;
      padding: 9px 10px;
    }

    .preview-metric span {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .preview-metric strong {
      color: #0f172a;
      overflow-wrap: anywhere;
    }

    .preview-timeline {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 12px 0;
      max-height: 260px;
      overflow: auto;
    }

    .preview-timeline-row {
      background: #fff;
      border: 0;
      border-top: 1px solid #e5e7eb;
      cursor: pointer;
      display: grid;
      gap: 3px;
      grid-template-columns: 72px minmax(0, 1fr);
      padding: 9px 10px;
      text-align: left;
    }

    .preview-timeline-row:first-child {
      border-top: 0;
    }

    .preview-timeline-row.active,
    .preview-timeline-row:hover {
      background: #eef2ff;
    }

    .preview-timeline-row small {
      color: #64748b;
      grid-column: 2;
      overflow-wrap: anywhere;
    }

    .timeline-kind {
      align-self: start;
      background: #f1f5f9;
      border-radius: 999px;
      color: #334155;
      font-size: 10px;
      font-weight: 800;
      padding: 4px 7px;
      text-align: center;
      text-transform: uppercase;
    }

    .preview-timeline-row.tool .timeline-kind {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .preview-timeline-row.guardrail .timeline-kind {
      background: #fef3c7;
      color: #92400e;
    }

    .preview-timeline-row.error .timeline-kind {
      background: #fee2e2;
      color: #991b1b;
    }

    .run-id {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #4b5563;
      font-family: Consolas, monospace;
      font-size: 12px;
      margin-bottom: 12px;
      overflow: hidden;
      padding: 8px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .logs {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
    }

    .execution-canvas {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      cursor: grab;
      height: 100%;
      margin-bottom: 0;
      min-height: 0;
      max-height: none;
      overflow: hidden;
      padding: 10px;
      position: relative;
      touch-action: none;
      user-select: none;
    }

    .execution-canvas.panning {
      cursor: grabbing;
    }

    .execution-board {
      position: relative;
      background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
      background-size: 22px 22px;
      min-height: 340px;
      transform-origin: 0 0;
    }

    .execution-zoom-controls {
      align-items: center;
      background: #fffffff2;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      box-shadow: 0 4px 14px #0001;
      display: flex;
      gap: 2px;
      padding: 4px;
      position: absolute;
      right: 12px;
      top: 12px;
      z-index: 6;
    }

    .execution-zoom-controls button {
      height: 34px;
      min-width: 34px;
    }

    .zoom-value {
      color: #1e293b;
      font-weight: 800;
      letter-spacing: 0;
    }

    .zoom-divider {
      background: #e2e8f0;
      height: 24px;
      margin: 0 4px;
      width: 1px;
    }

    .execution-edges {
      left: 0;
      overflow: visible;
      pointer-events: none;
      position: absolute;
      top: 0;
    }

    .execution-edge {
      fill: none;
      stroke: #64748b;
      stroke-width: 2.2;
    }

    .empty-flow {
      align-items: center;
      color: #6b7280;
      display: flex;
      min-height: 72px;
      justify-content: center;
      text-align: center;
    }

    .flow-row {
      align-items: center;
      display: none;
      flex-direction: column;
      gap: 6px;
    }

    .execution-node,
    .flow-node {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      border-left: 4px solid #2563eb;
      border-radius: 8px;
      box-sizing: border-box;
      padding: 8px 10px;
      position: absolute;
      width: 100%;
    }

    .execution-node {
      box-shadow: 0 4px 12px #00000012;
      cursor: pointer;
      width: 180px;
    }

    .execution-node.selected {
      box-shadow: 0 0 0 4px #2563eb30, 0 8px 18px #00000018;
      transform: translateY(-1px);
    }

    .execution-node.running,
    .flow-node.running {
      background: #fefce8;
      border-color: #facc15;
      border-left-color: #eab308;
      box-shadow: 0 0 0 3px #facc1533;
    }

    .execution-node.done,
    .flow-node.done {
      background: #f0fdf4;
      border-color: #86efac;
      border-left-color: #16a34a;
    }

    .execution-node.error,
    .flow-node.error {
      background: #fef2f2;
      border-color: #fca5a5;
      border-left-color: #dc2626;
    }

    .flow-type {
      color: #64748b;
      display: block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .execution-node strong,
    .flow-node strong {
      color: #0f172a;
      display: block;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .execution-node small,
    .flow-node small {
      color: #475569;
      display: block;
      margin-top: 3px;
    }

    .execution-details {
      border-left: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding-left: 16px;
    }

    .execution-log-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .execution-log-header h3 {
      margin: 0;
    }

    .execution-log-header span {
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
    }

    .flow-arrow {
      color: #94a3b8;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 6px;
    }

    .review-overlay {
      background: #ffffff;
      inset: 0;
      position: fixed;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      padding: 16px;
    }

    .review-header {
      align-items: center;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      padding-bottom: 12px;
    }

    .review-header h2 {
      margin: 0;
    }

    .review-body {
      display: grid;
      flex: 1 1 auto;
      gap: 16px;
      grid-template-columns: minmax(0, 1fr) 430px;
      min-height: 0;
      padding-top: 16px;
    }

    .review-canvas,
    .review-steps {
      min-height: 0;
      overflow: hidden;
    }

    .execution-canvas.fullscreen {
      height: 100%;
      max-height: none;
      margin-bottom: 0;
    }

    .review-steps {
      border-left: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      padding-left: 16px;
    }

    .review-steps h3 {
      margin: 0 0 10px;
    }

    .review-log,
    .inspector-panel {
      flex: 1 1 auto;
    }

    .inspector-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
      overflow: auto;
      padding-right: 4px;
    }

    .inspector-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
    }

    .inspector-section h4 {
      color: #334155;
      font-size: 12px;
      letter-spacing: .04em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .inspector-section pre {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      color: #0f172a;
      font: 12px/1.45 Consolas, 'Courier New', monospace;
      margin: 0;
      max-height: 280px;
      overflow: auto;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .inspector-empty {
      color: #64748b;
      font-size: 13px;
      padding: 8px 0;
    }

    .log-row {
      border-left: 3px solid #c7d2fe;
      background: #f9fafb;
      border-radius: 8px;
      display: grid;
      gap: 4px;
      grid-template-columns: 76px minmax(80px, 116px) minmax(0, 1fr) 74px;
      padding: 8px;
    }

    .log-status {
      color: #3730a3;
      font-weight: 700;
      text-transform: uppercase;
    }

    .log-node {
      color: #4b5563;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .log-message {
      color: #111827;
      overflow-wrap: anywhere;
    }

    .log-time {
      color: #475569;
      font-family: Consolas, monospace;
      font-size: 12px;
      justify-self: end;
      white-space: nowrap;
    }

    .empty-state,
    .empty-log {
      align-items: center;
      color: #6b7280;
      display: flex;
      height: 100%;
      justify-content: center;
      text-align: center;
    }

    @media (max-width: 1200px) {
      .chat-shell {
        grid-template-columns: 220px minmax(0, 1fr);
      }

      .chat-shell.history-collapsed,
      .chat-shell.history-collapsed.execution-open {
        grid-template-columns: 56px minmax(0, 1fr);
      }

      .human-form {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
    }

    @media (max-width: 820px) {
      .chat-header,
      .composer {
        flex-direction: column;
      }

      .agent-select,
      .composer button {
        width: 100%;
      }

      .chat-shell {
        grid-template-columns: 1fr;
      }

      .chat-shell.history-collapsed,
      .chat-shell.history-collapsed.execution-open {
        grid-template-columns: 1fr;
      }

      .history-card,
      .conversation-card {
        min-height: auto;
      }

      .run-card {
        bottom: 12px;
        left: 12px;
        max-width: calc(100vw - 24px);
        right: 12px;
        top: 86px;
        width: calc(100vw - 24px);
      }

      .execution-overlay-body {
        grid-template-columns: 1fr;
        overflow: auto;
      }

      .execution-canvas {
        min-height: 420px;
      }

      .execution-details {
        border-left: 0;
        border-top: 1px solid #e5e7eb;
        min-height: 260px;
        padding-left: 0;
        padding-top: 12px;
      }

      .history-card.collapsed-panel {
        height: 56px;
      }

      .history-card.collapsed-panel .collapsed-toggle {
        flex-direction: row;
        justify-content: center;
        min-height: 40px;
      }

      .history-card.collapsed-panel .collapsed-toggle span {
        transform: none;
        writing-mode: horizontal-tb;
      }
    }
  `]
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesPane') messagesPane?: ElementRef<HTMLElement>;
  agents: any[] = [];
  environments: any[] = [];
  conversations: any[] = [];
  conversationId = '';
  agentId = '';
  selectedEnvironmentKey = 'dev';
  runtimeHealthStatus: 'unknown' | 'online' | 'offline' = 'unknown';
  runtimeServices: any[] = [];
  message = '';
  messages: ChatMessage[] = [];
  logs: RunLog[] = [];
  executionNodes: ExecutionNode[] = [];
  graphNodes: ChatGraphNode[] = [];
  graphEdges: ChatGraphEdge[] = [];
  nodeStatuses: Record<string, string> = {};
  loading = false;
  awaitingHuman = false;
  sessionId = this.newSessionId();
  currentRunId = '';
  activeNode = '';
  humanPrompt?: HumanPrompt;
  missingParamRequest?: MissingParamRequest;
  humanDetailRows: { key: string; value: string }[] = [];
  humanFormFields: { key: string; label: string; type: string; options: string[] }[] = [];
  traceId = this.newTraceId();
  terminalRunRecorded = false;
  historyCollapsed = false;
  executionCollapsed = true;
  reviewOpen = false;
  selectedPreviewNodeId = '';
  selectedPreviewRun?: MessageRunPreview;
  selectedPreviewMessage?: ChatMessage;
  executionViewport = { x: 0, y: 0, zoom: 1 };
  executionPanning = false;
  private executionPanLast = { x: 0, y: 0 };
  messagePlaceholder = 'Type your message...';
  attachedFileName = '';
  attachedFileType = '';
  attachedFileText = '';
  private currentRunAttachmentInput: Record<string, any> = {};
  private currentRunUserRequest = '';
  private pendingContinuationInput: Record<string, any> = {};
  lastRunMetrics: any = {};
  private shouldScrollMessages = false;
  private eventSource?: EventSource;
  private handledEventCount = 0;
  private streamSeenCount = 0;
  private persistedStepCount = 0;
  private nodeStartedAt: Record<string, number> = {};
  private runStartedAt = 0;
  private readonly activeStateKey = 'agentchain.chat.activeState';
  private readonly panelStateKey = 'agentchain.chat.panelState';

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.restorePanelState();
    this.loadAgents();
    this.loadEnvironments();
    this.refreshRuntimeHealth();
    this.restoreActiveState();
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.persistActiveState();
    this.closeStream();
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollMessages || !this.messagesPane) return;
    this.shouldScrollMessages = false;
    const el = this.messagesPane.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  loadAgents() {
    this.api.agents().subscribe({
      next: (res: any[]) => {
        this.agents = res || [];
        if (this.agents.length > 0 && !this.agentId) {
          this.agentId = this.agents[0].id;
        }
        this.loadAgentDiagram();
      },
      error: err => console.error(err)
    });
  }

  loadEnvironments() {
    this.api.environments().subscribe({
      next: res => this.environments = res || [],
      error: _ => this.environments = []
    });
  }

  refreshRuntimeHealth() {
    this.runtimeServices = this.runtimeServiceChecks().map(service => ({ ...service, status: 'checking' }));
    this.runtimeServices.forEach(service => {
      this.api.directHealth(service.url).subscribe({
        next: _ => {
          service.status = 'online';
          service.error = '';
          this.runtimeHealthStatus = this.runtimeServices.every(s => s.status === 'online') ? 'online' : this.runtimeServices.some(s => s.status === 'offline') ? 'offline' : 'unknown';
        },
        error: err => {
          service.status = 'offline';
          service.error = err?.message || 'unreachable';
          this.runtimeHealthStatus = 'offline';
        }
      });
    });
  }

  runtimeServiceChecks() {
    return [
      { name: 'Runtime Orchestrator', url: `${this.api.runtimeOrchestrator}/api/orchestrator/health` },
      { name: 'Tool Execution', url: `${this.api.toolExecution}/api/tool-execution/health` },
      { name: 'LLM Inference', url: `${this.api.llmInference}/api/llm-inference/health` },
      { name: 'Memory/RAG', url: `${this.api.memoryRag}/api/memory-rag/health` },
      { name: 'Human Task', url: `${this.api.humanTask}/api/human-task/health` }
    ];
  }

  loadConversations() {
    this.api.conversations().subscribe({
      next: (items: any[]) => {
        this.conversations = items || [];
        if (!this.conversationId && !this.currentRunId && this.conversations.length > 0) {
          this.applyConversation(this.conversations[0]);
        }
      },
      error: err => console.error(err)
    });
  }

  newChat() {
    this.closeStream();
    this.conversationId = '';
    this.messages = [];
    this.shouldScrollMessages = true;
    this.logs = [];
    this.executionNodes = [];
    this.nodeStatuses = {};
    this.currentRunId = '';
    this.activeNode = '';
    this.selectedPreviewNodeId = '';
    this.terminalRunRecorded = false;
    this.awaitingHuman = false;
    this.humanPrompt = undefined;
    this.missingParamRequest = undefined;
    this.humanDetailRows = [];
    this.humanFormFields = [];
    this.lastRunMetrics = {};
    this.handledEventCount = 0;
    this.streamSeenCount = 0;
    this.persistedStepCount = 0;
    this.nodeStartedAt = {};
    this.runStartedAt = 0;
    this.sessionId = this.newSessionId();
    this.clearActiveState();
  }

  loadConversation(id: string) {
    if (this.loading) return;
    this.closeStream();
    this.api.getConversation(id).subscribe(c => this.applyConversation(c));
  }

  deleteCurrentConversation() {
    if (!this.conversationId || this.loading) return;
    this.api.deleteConversation(this.conversationId).subscribe(() => {
      this.newChat();
      this.loadConversations();
    });
  }

  onAgentChanged() {
    this.loadAgentDiagram();
    if (this.conversationId) {
      this.saveConversation();
    }
  }

  copyEmbedWidget() {
    if (!this.agentId) return;
    const agent = this.agents.find(a => a.id === this.agentId);
    this.api.embedToken(this.agentId, agent?.embedTokenTtlS || 86400).subscribe({
      next: token => {
        this.copyEmbedSnippet(token.token);
      },
      error: err => {
        if (err?.status === 403 && agent) {
          const enabledAgent = { ...agent, embedEnabled: true, embedAllowedOrigins: agent.embedAllowedOrigins || 'http://localhost:*', embedTokenTtlS: agent.embedTokenTtlS || 86400 };
          this.api.updateAgent(this.agentId, enabledAgent).subscribe({
            next: updated => {
              const idx = this.agents.findIndex(a => a.id === updated.id);
              if (idx >= 0) this.agents[idx] = updated;
              const ttl = (updated as any).embedTokenTtlS || 86400;
              this.api.embedToken(this.agentId, ttl).subscribe({
                next: token => this.copyEmbedSnippet(token.token, 'Embed enabled and widget snippet copied'),
                error: secondErr => this.snack.open(this.errorText(secondErr), 'Dismiss', { duration: 3500 })
              });
            },
            error: updateErr => this.snack.open(this.errorText(updateErr), 'Dismiss', { duration: 3500 })
          });
          return;
        }
        this.snack.open(this.errorText(err), 'Dismiss', { duration: 3500 });
      }
    });
  }

  send() {
    const typedMsg = this.message.trim();
    const userMsg = typedMsg || (this.attachedFileText ? `Analyze uploaded file ${this.attachedFileName}` : '');
    if (!userMsg || !this.agentId || this.loading) return;
    if (this.missingParamRequest) {
      this.applyTypedMissingParamValue(userMsg);
      this.submitMissingParams();
      return;
    }
    if (this.runtimeHealthStatus === 'offline') {
      const offline = this.runtimeServices.filter(s => s.status === 'offline').map(s => s.name).join(', ');
      this.snack.open(`Runtime service offline: ${offline || 'unknown'}. Start runtime services before running chat.`, 'Dismiss', { duration: 5500 });
      this.refreshRuntimeHealth();
      return;
    }
    if (this.awaitingHuman && this.currentRunId) {
      this.resumeHuman(userMsg);
      return;
    }

    const attachmentInput = this.chatAttachmentInput();
    const continuationInput = { ...this.pendingContinuationInput };
    this.pendingContinuationInput = {};
    const history = this.chatHistoryForRuntime();
    const sentMessage: ChatMessage = { role: 'user', text: this.attachedFileName ? `${userMsg}\n\nAttached: ${this.attachedFileName}` : userMsg };
    this.messages.push(sentMessage);
    this.selectedPreviewMessage = sentMessage;
    this.selectedPreviewRun = undefined;
    this.selectedPreviewNodeId = '';
    this.addProgress('Thinking...');
    this.shouldScrollMessages = true;
    this.message = '';
    this.clearChatFile();
    this.loading = true;
    this.awaitingHuman = false;
    this.humanPrompt = undefined;
    this.missingParamRequest = undefined;
    this.humanDetailRows = [];
    this.humanFormFields = [];
    this.traceId = this.newTraceId();
    this.currentRunAttachmentInput = { ...attachmentInput, ...continuationInput };
    this.currentRunUserRequest = userMsg;
    this.logs = [];
    this.currentRunId = '';
    this.activeNode = '';
    this.executionNodes = [];
    this.nodeStatuses = {};
    this.lastRunMetrics = {};
    this.terminalRunRecorded = false;
    this.handledEventCount = 0;
    this.streamSeenCount = 0;
    this.persistedStepCount = 0;
    this.nodeStartedAt = {};
    this.runStartedAt = Date.now();
    this.ensureConversationSaved();
    this.persistActiveState();

    this.api.chat(this.agentId, this.sessionId, userMsg, undefined, this.traceId, history, { ...attachmentInput, ...continuationInput, ...this.environmentInput() }).subscribe({
      next: (res: any) => {
        const runId = res.run_id || res.id;
        this.currentRunId = runId;
        this.runStartedAt = Date.now();
        this.logs.push({ status: 'running', message: 'Run started', event: { status: 'running' } });
        this.executionNodes = [{ id: 'run_start', label: 'Run started', type: 'START', status: 'done' }];
        sentMessage.run = this.currentRunSnapshot('running');
        if (this.selectedPreviewMessage === sentMessage) this.selectedPreviewRun = sentMessage.run;
        this.addProgress('Run started.');
        this.persistActiveState();
        this.recordRun('RUNNING', 0, { message: userMsg });
        this.stream(runId);
      },
      error: err => {
        this.logs.push({ status: 'error', message: this.errorText(err), event: { status: 'error', error: this.errorText(err) } });
        this.loading = false;
        this.persistActiveState();
        this.saveConversation();
      }
    });
  }

  copyMessage(message: ChatMessage) {
    const text = message?.text || '';
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => this.snack.open('Message copied', 'Dismiss', { duration: 1600 }),
        () => this.snack.open('Unable to copy message', 'Dismiss', { duration: 2500 })
      );
      return;
    }
    this.snack.open('Clipboard is not available in this browser.', 'Dismiss', { duration: 2500 });
  }

  editMessage(message: ChatMessage) {
    if (this.loading || this.awaitingHuman || message.role !== 'user') return;
    this.message = this.editableMessageText(message.text);
    this.snack.open('Message loaded into composer', 'Dismiss', { duration: 1800 });
  }

  canPreviewMessage(index: number): boolean {
    const message = this.messages[index];
    if (!message) return false;
    if (message.run?.runId) return true;
    return index === this.lastRunMessageIndex() && (!!this.currentRunId || this.logs.length > 0);
  }

  private editableMessageText(text: string): string {
    return String(text || '').replace(/\n\nAttached:\s*.+$/i, '').trim();
  }

  private lastUserMessageIndex(): number {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') return i;
    }
    return -1;
  }

  private lastRunMessageIndex(): number {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user' || this.messages[i].role === 'agent') return i;
    }
    return -1;
  }

  selectChatFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.attachedFileName = file.name;
      this.attachedFileType = file.type || 'text/plain';
      this.attachedFileText = String(reader.result || '');
      input.value = '';
    };
    reader.onerror = () => {
      input.value = '';
      this.snack.open('Unable to read selected file.', 'Dismiss', { duration: 3000 });
    };
    reader.readAsText(file);
  }

  clearChatFile() {
    this.attachedFileName = '';
    this.attachedFileType = '';
    this.attachedFileText = '';
  }

  private chatAttachmentInput() {
    if (!this.attachedFileText) return {};
    const payload: any = {
      file_name: this.attachedFileName,
      filename: this.attachedFileName,
      file_type: this.attachedFileType,
      file_content: this.attachedFileText,
      files: [{ filename: this.attachedFileName, contentType: this.attachedFileType, content: this.attachedFileText }]
    };
    if (this.attachedFileName.toLowerCase().endsWith('.csv') || this.attachedFileType.includes('csv')) {
      payload.csvContent = this.attachedFileText;
      payload.csv_content = this.attachedFileText;
    }
    return payload;
  }

  private environmentInput() {
    const selected = this.environments.find(env => env.environmentKey === this.selectedEnvironmentKey);
    return { environmentKey: this.selectedEnvironmentKey || 'dev', environment: { key: this.selectedEnvironmentKey || 'dev', config: selected?.configJson || {} } };
  }

  onComposerEnter(event: KeyboardEvent) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.send();
  }

  toggleHistoryPanel() {
    this.historyCollapsed = !this.historyCollapsed;
    this.persistPanelState();
  }

  toggleExecutionPanel() {
    this.executionCollapsed = !this.executionCollapsed;
    this.persistPanelState();
  }

  openRunReview(message?: ChatMessage) {
    this.selectedPreviewMessage = message;
    this.selectedPreviewRun = message?.run;
    this.reviewOpen = false;
    this.executionCollapsed = false;
    this.selectedPreviewNodeId = '';
    this.persistPanelState();
    this.loadAgentDiagram();
  }

  closeRunReview() {
    this.reviewOpen = false;
    this.selectedPreviewMessage = undefined;
    this.selectedPreviewRun = undefined;
  }

  selectPreviewNode(nodeId: string, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.selectedPreviewNodeId = nodeId;
  }

  previewInspectorTitle(): string {
    if (!this.selectedPreviewNodeId) return 'Agent Run';
    const node = this.graphNodes.find(n => n.id === this.selectedPreviewNodeId);
    return node?.label || this.selectedPreviewNodeId;
  }

  previewInspectorSections(): { title: string; value: string }[] {
    if (!this.selectedPreviewNodeId) {
      return [
        { title: 'Input', value: this.formatInspectorValue({ message: this.previewUserMessage(), agent: this.conversationAgentName(this.agentId), runId: this.previewRunId() }) },
        { title: 'Output', value: this.formatInspectorValue(this.latestAgentOutput()) },
        { title: 'Status', value: this.formatInspectorValue(this.agentRunStatus()) }
      ];
    }
    const events = this.previewLogs().filter(l => l.nodeId === this.selectedPreviewNodeId || (!l.nodeId && l.nodeType === this.selectedPreviewNodeId));
    const latest = [...events].reverse().find(l => this.nodeEventOutput(l.event) !== undefined) || events[events.length - 1];
    return [
      { title: 'Input', value: this.formatInspectorValue(this.nodeEventInput(latest?.event)) },
      { title: 'Output', value: this.formatInspectorValue(this.nodeEventOutput(latest?.event)) },
      { title: 'Status', value: this.formatInspectorValue(this.nodeInspectorStatus(latest)) }
    ];
  }

  conversationAgentName(agentId: string): string {
    return this.agents.find(a => a.id === agentId)?.name || 'Agent';
  }

  formatDuration(ms: number | undefined): string {
    const value = Number(ms || 0);
    if (!Number.isFinite(value)) return '-';
    if (value < 1000) return `${Math.max(0, Math.round(value))} ms`;
    return `${(value / 1000).toFixed(value < 10000 ? 2 : 1)} s`;
  }

  executionTransform(): string {
    const v = this.executionViewport;
    return `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
  }

  executionZoomPercent(): number {
    return Math.round((this.executionViewport.zoom || 1) * 100);
  }

  executionWheel(event: WheelEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!event.ctrlKey && !event.metaKey) {
      this.executionPanByWheel(event);
      return;
    }
    this.executionZoomAt(event.currentTarget as HTMLElement, event.clientX, event.clientY, event.deltaY < 0 ? 0.1 : -0.1);
  }

  executionZoomIn() {
    this.executionZoomAtCenter(0.15);
  }

  executionZoomOut() {
    this.executionZoomAtCenter(-0.15);
  }

  executionResetZoom() {
    this.executionViewport = { x: 0, y: 0, zoom: 1 };
  }

  executionFitToView(event?: MouseEvent) {
    event?.stopPropagation();
    if (!this.graphNodes.length) {
      this.executionResetZoom();
      return;
    }
    const host = this.executionCanvasHost(event?.currentTarget as HTMLElement | undefined);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const pad = 110;
    const width = this.executionCanvasWidth();
    const height = this.executionCanvasHeight();
    const zoom = this.executionClampZoom(Math.min((rect.width - pad) / width, (rect.height - pad) / height, 1.25));
    this.executionViewport = {
      x: Math.max(24, (rect.width - width * zoom) / 2),
      y: Math.max(24, (rect.height - height * zoom) / 2),
      zoom
    };
  }

  executionPanStart(event: MouseEvent) {
    if (!this.isExecutionPanTarget(event)) return;
    event.preventDefault();
    this.executionPanning = true;
    this.executionPanLast = { x: event.clientX, y: event.clientY };
  }

  executionPanMove(event: MouseEvent) {
    if (!this.executionPanning) return;
    event.preventDefault();
    this.executionViewport = {
      ...this.executionViewport,
      x: this.executionViewport.x + event.clientX - this.executionPanLast.x,
      y: this.executionViewport.y + event.clientY - this.executionPanLast.y
    };
    this.executionPanLast = { x: event.clientX, y: event.clientY };
  }

  @HostListener('document:mouseup')
  executionPanEnd() {
    this.executionPanning = false;
  }

  executionCanvasWidth(): number {
    if (!this.graphNodes.length) return 620;
    const maxX = Math.max(...this.graphNodes.map(n => this.graphNodeX(n) + 220));
    return Math.max(620, maxX + 80);
  }

  executionCanvasHeight(): number {
    if (!this.graphNodes.length) return 340;
    const maxY = Math.max(...this.graphNodes.map(n => this.graphNodeY(n) + 96));
    return Math.max(340, maxY + 80);
  }

  graphNodeX(node: ChatGraphNode): number {
    const minX = Math.min(...this.graphNodes.map(n => Number(n.position?.x || 0)));
    return Number(node.position?.x || 0) - minX + 50;
  }

  graphNodeY(node: ChatGraphNode): number {
    const minY = Math.min(...this.graphNodes.map(n => Number(n.position?.y || 0)));
    return Number(node.position?.y || 0) - minY + 50;
  }

  executionEdges(): ChatGraphEdge[] {
    return this.graphEdges.filter(e => this.graphNodes.some(n => n.id === e.source) && this.graphNodes.some(n => n.id === e.target));
  }

  executionEdgePath(edge: ChatGraphEdge): string {
    const source = this.graphNodes.find(n => n.id === edge.source);
    const target = this.graphNodes.find(n => n.id === edge.target);
    if (!source || !target) return '';
    const start = { x: this.graphNodeX(source) + 180, y: this.graphNodeY(source) + 36 };
    const end = { x: this.graphNodeX(target), y: this.graphNodeY(target) + 36 };
    if (Math.abs(end.y - start.y) > Math.abs(end.x - start.x)) {
      const midY = start.y + 54;
      return `M ${start.x} ${start.y} C ${start.x + 70} ${start.y}, ${end.x - 70} ${midY}, ${end.x} ${midY} L ${end.x} ${end.y}`;
    }
    const dx = Math.max(70, Math.abs(end.x - start.x) * 0.45);
    return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
  }

  private executionPanByWheel(event: WheelEvent) {
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : 1;
    const dx = event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY) ? event.deltaY : event.deltaX;
    const dy = event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY) ? 0 : event.deltaY;
    this.executionViewport = {
      ...this.executionViewport,
      x: this.executionViewport.x - dx * multiplier,
      y: this.executionViewport.y - dy * multiplier
    };
  }

  private executionZoomAt(host: HTMLElement, clientX: number, clientY: number, delta: number) {
    const rect = host.getBoundingClientRect();
    const v = this.executionViewport;
    const oldZoom = v.zoom || 1;
    const newZoom = this.executionClampZoom(oldZoom + delta);
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const boardX = (mx - v.x) / oldZoom;
    const boardY = (my - v.y) / oldZoom;
    this.executionViewport = { x: mx - boardX * newZoom, y: my - boardY * newZoom, zoom: newZoom };
  }

  private executionZoomAtCenter(delta: number) {
    const host = this.executionCanvasHost();
    if (!host) return;
    const rect = host.getBoundingClientRect();
    this.executionZoomAt(host, rect.left + rect.width / 2, rect.top + rect.height / 2, delta);
  }

  private executionClampZoom(value: number): number {
    return Math.min(2.5, Math.max(0.3, Number(value.toFixed(2))));
  }

  private executionCanvasHost(from?: HTMLElement): HTMLElement | null {
    return from?.closest('.execution-canvas') as HTMLElement || document.querySelector('.review-overlay .execution-canvas, .run-card .execution-canvas') as HTMLElement | null;
  }

  private isExecutionPanTarget(event: MouseEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    return !!target.closest('.execution-canvas') && !target.closest('.execution-node,.execution-zoom-controls,button,mat-card,input,textarea,mat-select');
  }

  nodeStatus(nodeId: string): string {
    const statuses = this.selectedPreviewRun ? this.selectedPreviewRun.nodeStatuses : this.nodeStatuses;
    return statuses[nodeId] || 'pending';
  }

  executionPanelLogs(): RunLog[] {
    return this.selectedPreviewRun?.logs || this.logs;
  }

  executionPanelNodes(): ExecutionNode[] {
    return this.selectedPreviewRun?.executionNodes || this.executionNodes;
  }

  executionPanelActiveNode(): string {
    return this.selectedPreviewRun?.activeNode || this.activeNode || '';
  }

  executionPanelStatus(): string {
    if (this.selectedPreviewRun?.status) return String(this.selectedPreviewRun.status).toLowerCase();
    const logs = this.executionPanelLogs();
    return String(logs[logs.length - 1]?.status || (this.loading ? 'running' : 'idle')).toLowerCase();
  }

  private latestAgentOutput(): any {
    if (this.selectedPreviewMessage) {
      const start = this.messages.indexOf(this.selectedPreviewMessage);
      const nextAgent = start >= 0 ? this.messages.slice(start + 1).find(msg => msg.role === 'agent' && msg.text?.trim()) : undefined;
      if (nextAgent) return nextAgent.text;
      const selectedRunOutput = [...this.previewLogs()].reverse().find(log => log.event?.output);
      return selectedRunOutput?.event?.output;
    }
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg.role === 'agent' && msg.text?.trim()) return msg.text;
    }
    const done = [...this.previewLogs()].reverse().find(log => log.event?.output);
    return done?.event?.output;
  }

  private agentRunStatus(): any {
    const logs = this.previewLogs();
    const latest = logs[logs.length - 1];
    const preview = this.selectedPreviewRun;
    return {
      status: preview?.status || latest?.status || (this.loading ? 'running' : 'idle'),
      activeNode: preview?.activeNode || this.activeNode || undefined,
      eventsCaptured: logs.length,
      metrics: preview?.metrics || this.lastRunMetrics || undefined,
      duration: preview?.startedAt ? this.formatDuration(Date.now() - preview.startedAt) : (this.runStartedAt ? this.formatDuration(Date.now() - this.runStartedAt) : undefined)
    };
  }

  previewMetricCards(): Array<{ label: string; value: string }> {
    const logs = this.previewLogs();
    const metrics = this.previewMetrics();
    const status = this.selectedPreviewRun?.status || logs[logs.length - 1]?.status || (this.loading ? 'running' : 'idle');
    return [
      { label: 'Status', value: String(status || 'idle').toUpperCase() },
      { label: 'Events', value: String(logs.length) },
      { label: 'Model', value: [metrics.provider, metrics.model].filter(Boolean).join(' / ') || '-' },
      { label: 'Tokens', value: String(metrics.totalTokens || 0) },
      { label: 'Cost', value: `$${Number(metrics.totalCostUsd || 0).toFixed(5)}` }
    ];
  }

  previewTimeline(): Array<{ kind: string; title: string; detail: string; nodeId?: string }> {
    return this.previewLogs().map(log => {
      const event = log.event || {};
      const update = event.update || {};
      const kind = event.status === 'error' || event.status === 'aborted' || event.error ? 'error'
        : event.status === 'awaiting_human' || String(log.nodeType || '').includes('GUARDRAIL') || update.guardrail_rule ? 'guardrail'
        : update.tool_started || update.tool_result || update.tool_id ? 'tool'
        : update.usage || event.output?.usage ? 'llm'
        : log.nodeType ? String(log.nodeType).toLowerCase() : 'run';
      return {
        kind,
        title: log.nodeType || log.nodeId || String(log.status || 'event'),
        detail: this.timelineDetail(log),
        nodeId: log.nodeId
      };
    });
  }

  private previewMetrics(): any {
    const base = { ...(this.selectedPreviewRun?.metrics || this.lastRunMetrics || {}) };
    for (const log of this.previewLogs()) {
      const metrics = this.metricsFromPayload(log.event?.output || log.event?.update || log.event);
      Object.keys(metrics).forEach(key => {
        if (metrics[key] !== undefined && metrics[key] !== '' && metrics[key] !== 0) base[key] = metrics[key];
      });
    }
    return base;
  }

  private timelineDetail(log: RunLog): string {
    const update = log.event?.update || {};
    const metrics = this.metricsFromPayload(log.event?.output || update);
    const parts = [log.message || log.status];
    if (update.tool_name || update.toolName || update.tool_id) parts.push(`tool ${this.toolDisplayName(update)}`);
    if (update.missing_args?.length) parts.push(`missing ${update.missing_args.join(', ')}`);
    if (metrics.totalTokens) parts.push(`${metrics.totalTokens} tokens`);
    if (metrics.totalCostUsd) parts.push(`$${Number(metrics.totalCostUsd).toFixed(5)}`);
    if (log.durationMs !== undefined) parts.push(this.formatDuration(log.durationMs));
    return parts.filter(Boolean).join(' / ');
  }

  private nodeEventInput(event: any): any {
    if (!event) return undefined;
    const update = event.update || {};
    if (update.input !== undefined) return update.input;
    if (event.input !== undefined) return event.input;
    if (event.payload !== undefined) return event.payload;
    if (update.resume !== undefined) return update.resume;
    return { message: this.previewUserMessage() };
  }

  private nodeEventOutput(event: any): any {
    if (!event) return undefined;
    const update = event.update || {};
    if (event.output !== undefined) return event.output;
    if (update.tool_result !== undefined) return update.tool_result;
    if (update.answer !== undefined) return update.answer;
    if (update.output !== undefined) return update.output;
    if (update.memory_read !== undefined || update.memory_write !== undefined) return update;
    if (update.skipped || event.error || event.reason) return { error: event.error, reason: event.reason || update.reason, missingArgs: update.missing_args };
    return undefined;
  }

  private nodeInspectorStatus(log?: RunLog): any {
    if (!this.selectedPreviewNodeId) return undefined;
    return {
      nodeId: this.selectedPreviewNodeId,
      nodeType: log?.nodeType,
      status: this.nodeStatus(this.selectedPreviewNodeId),
      event: log?.message,
      duration: log?.durationMs !== undefined ? this.formatDuration(log.durationMs) : undefined
    };
  }

  private formatInspectorValue(value: any): string {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'string') return this.redactText(value);
    try {
      return JSON.stringify(this.redactSecrets(value), null, 2);
    } catch {
      return this.redactText(String(value));
    }
  }

  redactText(value: any): string {
    return String(value || '')
      .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s",}]+/gi, '$1***')
      .replace(/((?:api[_-]?key|token|secret|password|credential)\s*[:=]\s*)["']?[^"',}\s]+["']?/gi, '$1***');
  }

  private redactSecrets(value: any): any {
    if (Array.isArray(value)) return value.map(v => this.redactSecrets(v));
    if (!value || typeof value !== 'object') return typeof value === 'string' ? this.redactText(value) : value;
    const out: any = {};
    for (const [key, raw] of Object.entries(value)) {
      out[key] = /(authorization|api[_-]?key|token|secret|password|credential)/i.test(key) ? '***' : this.redactSecrets(raw);
    }
    return out;
  }

  previewRunId(): string {
    return this.selectedPreviewRun?.runId || this.currentRunId;
  }

  private previewLogs(): RunLog[] {
    return this.selectedPreviewRun?.logs || this.logs;
  }

  private previewUserMessage(): string {
    return this.selectedPreviewMessage?.text || this.lastUserMessage();
  }

  private currentRunSnapshot(status?: string): MessageRunPreview | undefined {
    if (!this.currentRunId) return undefined;
    return {
      runId: this.currentRunId,
      status: status || this.logs[this.logs.length - 1]?.status || (this.loading ? 'running' : 'idle'),
      logs: this.logs.map(log => ({ ...log })),
      executionNodes: this.executionNodes.map(node => ({ ...node })),
      nodeStatuses: { ...this.nodeStatuses },
      activeNode: this.activeNode,
      startedAt: this.runStartedAt,
      metrics: { ...this.lastRunMetrics }
    };
  }

  private updateLatestMessageRunSnapshot(status?: string) {
    const snapshot = this.currentRunSnapshot(status);
    if (!snapshot) return;
    const user = this.latestUserMessage();
    if (user) user.run = snapshot;
    const agent = this.latestAgentMessageAfter(user);
    if (agent) agent.run = snapshot;
    if (this.selectedPreviewMessage === user || this.selectedPreviewMessage === agent) {
      this.selectedPreviewRun = snapshot;
    }
  }

  private stream(runId: string) {
    this.closeStream();
    this.streamSeenCount = 0;
    this.eventSource = this.api.streamRun(
      runId,
      (event: any) => {
        this.streamSeenCount += 1;
        if (this.streamSeenCount <= this.handledEventCount) return;
        this.handleEvent(event);
      },
      (err: any) => {
        if (this.awaitingHuman) {
          this.closeStream();
          this.persistActiveState();
          this.saveConversation();
          return;
        }
        if (!this.loading && !this.awaitingHuman) return;
        this.logs.push({ status: 'error', message: this.errorText(err), event: { status: 'error', error: this.errorText(err) } });
        this.loading = false;
        this.awaitingHuman = false;
        this.clearAllProgress();
        this.setFinalAssistant('The run stopped because the stream connection failed. Please retry after checking the execution log.');
        this.persistActiveState();
        this.saveConversation();
      }
    );
  }

  private loadAgentDiagram() {
    if (!this.agentId) {
      this.graphNodes = [];
      this.graphEdges = [];
      return;
    }
    this.api.getAgent(this.agentId).subscribe({
      next: agent => {
        const graph = agent?.graphJson || {};
        this.graphNodes = Array.isArray(graph.nodes) ? graph.nodes.map((n: any) => ({
          id: String(n.id),
          label: String(n.label || n.type || n.id),
          type: String(n.type || 'NODE'),
          position: {
            x: Number(n.position?.x ?? n.x ?? 0),
            y: Number(n.position?.y ?? n.y ?? 0)
          }
        })) : [];
        this.graphEdges = Array.isArray(graph.edges) ? graph.edges.map((e: any, index: number) => ({
          id: String(e.id || `edge_${index}`),
          source: String(e.source),
          target: String(e.target),
          type: String(e.type || 'FLOW')
        })) : [];
      },
      error: _ => {
        this.graphNodes = [];
        this.graphEdges = [];
      }
    });
  }

  private handleEvent(event: any) {
    this.handledEventCount += 1;
    const status = event.status || 'event';
    const nodeId = event.node_id || event.nodeId;
    const nodeType = event.node_type || event.nodeType;
    const durationMs = this.eventDurationMs(event, nodeId, nodeType);
    this.updateExecutionDiagram(event, status, nodeId, nodeType);

    if (nodeId || nodeType) {
      this.activeNode = nodeType || nodeId;
    }

    const progress = this.progressText(event);
    if (progress) this.addProgress(progress);

    if (event.delta) {
      this.appendAssistant(String(event.delta));
    }

    if (event.output) {
      const answer = this.extractAnswer(event.output);
      this.lastRunMetrics = { ...this.lastRunMetrics, ...this.metricsFromPayload(event.output) };
      if (answer) {
        this.setFinalAssistant(answer);
        this.clearAllProgress();
      }
    }

    if (event.update) {
      this.lastRunMetrics = { ...this.lastRunMetrics, ...this.metricsFromPayload(event.update) };
      this.recordChildRunFromEvent(event, nodeId);
      if (event.update?.skipped && event.update?.missing_args?.length) this.showMissingParamForm(event.update);
    }

    this.logs.push({
      status,
      nodeId,
      nodeType,
      message: this.describeEvent(event),
      durationMs,
      event
    });
    this.updateLatestMessageRunSnapshot(status);
    this.recordStepEvent(event, status, nodeId, nodeType);

    if (['done', 'error', 'aborted'].includes(status)) {
      this.loading = false;
      this.awaitingHuman = false;
      this.humanPrompt = undefined;
      if (status !== 'done') this.missingParamRequest = undefined;
      this.humanDetailRows = [];
      this.humanFormFields = [];
      this.clearAllProgress();
      if (status !== 'done') {
        this.activeNode = '';
        this.setFinalAssistant(this.terminalErrorText(event));
      }
      this.closeStream();
      if (!this.terminalRunRecorded) {
        this.terminalRunRecorded = true;
        this.recordRun(status.toUpperCase(), this.logs.length, { message: this.lastUserMessage() });
      }
      this.updateLatestMessageRunSnapshot(status);
      this.saveConversation();
      this.clearActiveState();
    } else {
      if (status === 'awaiting_human') {
        this.loading = false;
        this.awaitingHuman = true;
        this.clearAllProgress();
        this.showHumanPrompt(event);
        this.closeStream();
      }
      this.persistActiveState();
    }
  }

  resumeHuman(response: string) {
    this.clearAllProgress();
    this.messages.push({ role: 'user', text: response });
    this.addProgress('Sending your response back to the agent.');
    this.message = '';
    this.loading = true;
    this.awaitingHuman = false;
    this.humanPrompt = undefined;
    this.missingParamRequest = undefined;
    this.humanDetailRows = [];
    this.humanFormFields = [];
    this.api.resumeRun(this.currentRunId, { response }).subscribe({
      next: () => {
        this.persistActiveState();
        if (this.currentRunId) this.stream(this.currentRunId);
      },
      error: err => {
        this.loading = false;
        this.awaitingHuman = true;
        this.humanPrompt = this.humanPrompt || { title: 'Input needed', message: 'Please provide the requested input so the agent can continue.' };
        this.logs.push({ status: 'error', message: this.errorText(err), event: { status: 'error', error: this.errorText(err) } });
        this.persistActiveState();
      }
    });
  }

  submitHumanForm() {
    if (!this.humanPrompt?.formValues) return;
    const payload = { ...this.humanPrompt.formValues };
    this.resumeHumanPayload(payload, 'Submitted form');
  }

  submitMissingParams() {
    if (!this.missingParamRequest) return;
    const values = { ...this.missingParamRequest.values };
    const missing = this.missingParamRequest.missingArgs.filter(arg => !String(values[arg] ?? '').trim());
    if (missing.length) {
      this.snack.open(`Provide ${missing.join(', ')}`, 'Dismiss', { duration: 2500 });
      return;
    }
    const text = `Provide required parameters for ${this.missingParamRequest.toolName}: ${JSON.stringify(values)}`;
    const request = this.missingParamRequest;
    this.missingParamRequest = undefined;
    this.closeStream();
    this.loading = false;
    this.awaitingHuman = false;
    this.pendingContinuationInput = { ...(request.contextInput || {}), ...values };
    const baseMessage = request.contextMessage || this.lastUserMessage() || text;
    this.message = `${baseMessage}\n\nAdditional required parameters: ${JSON.stringify(values)}`;
    this.send();
  }

  private applyTypedMissingParamValue(text: string) {
    const request = this.missingParamRequest;
    if (!request) return;
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    const parsed = this.parseInlineValues(trimmed);
    if (Object.keys(parsed).length) {
      request.missingArgs.forEach(arg => {
        const value = parsed[arg] ?? parsed[this.camelKey(arg)] ?? parsed[this.compactKey(arg)];
        if (value !== undefined) request.values[arg] = value;
      });
      return;
    }
    if (request.missingArgs.length === 1) {
      request.values[request.missingArgs[0]] = trimmed;
    }
  }

  private parseInlineValues(text: string): Record<string, string> {
    const out: Record<string, string> = {};
    const pattern = /\b([A-Za-z][A-Za-z0-9_-]*)\b\s*(?:=|:|is)?\s+([A-Za-z0-9_.@:/-]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const key = match[1];
      const value = match[2];
      out[key] = value;
      out[this.camelKey(key)] = value;
      out[this.compactKey(key)] = value;
    }
    return out;
  }

  private camelKey(key: string): string {
    const parts = String(key || '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (!parts.length) return key;
    return parts[0].charAt(0).toLowerCase() + parts[0].slice(1) + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }

  private compactKey(key: string): string {
    return String(key || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  }

  missingParamExample(arg: string): string {
    const examples = this.missingParamRequest?.examples || {};
    return this.formatMissingParamExample(examples[arg] !== undefined ? examples[arg] : this.exampleValueForParam(arg));
  }

  private formatMissingParamExample(value: any): string {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  private toHumanDetailRows(details: any): { key: string; value: string }[] {
    if (!details || typeof details !== 'object') return [];
    const normalized = this.normalizedHumanDetails(details);
    return Object.keys(normalized)
      .filter(key => this.hasUsefulHumanValue(normalized[key]))
      .map(key => ({
        key: this.humanDetailLabel(key),
        value: this.prettyHumanValue(normalized[key])
      }));
  }

  private toHumanFormFields(schema: any): { key: string; label: string; type: string; options: string[] }[] {
    if (!schema || typeof schema !== 'object') return [];
    return Object.keys(schema).map(key => {
      const field = schema[key] || {};
      return {
        key,
        label: String(field.label || key),
        type: String(field.type || 'text'),
        options: Array.isArray(field.options) ? field.options.map((option: any) => String(option)) : []
      };
    });
  }

  private prettyHumanValue(value: any): string {
    const limit = 3000;
    const clip = (text: string) => text.length > limit ? `${text.slice(0, limit)}\n... truncated ...` : text;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return clip(JSON.stringify(parsed, null, 2));
      } catch {
        return clip(value);
      }
    }
    return clip(JSON.stringify(value, null, 2));
  }

  private normalizedHumanDetails(details: any): Record<string, any> {
    if (!details || typeof details !== 'object') return {};
    if ('value' in details) {
      const parsedValue = this.parseHumanDetailValue(details.value);
      if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) return parsedValue;
      if (this.hasUsefulHumanValue(parsedValue)) return { value: parsedValue };

      const nonEnvelopeEntries = Object.entries(details).filter(([key, value]) => {
        const normalizedKey = key.toLowerCase();
        return !['id', 'status', 'value'].includes(normalizedKey) && this.hasUsefulHumanValue(value);
      });
      return Object.fromEntries(nonEnvelopeEntries);
    }
    return details;
  }

  private parseHumanDetailValue(value: any): any {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const normalized = trimmed
        .replace(/\bNone\b/g, 'null')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/'/g, '"');
      return JSON.parse(normalized);
    } catch {
      return trimmed;
    }
  }

  private hasUsefulHumanValue(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  private humanDetailLabel(key: string): string {
    return String(key || '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, char => char.toUpperCase());
  }

  private humanSummaryCards(details: any): { label: string; value: string; tone?: string }[] {
    const normalized = this.normalizedHumanDetails(details);
    const text = JSON.stringify(normalized);
    if (!text || text === '{}') return [];
    const card = (label: string, value: string, tone?: string) => value ? { label, value, tone } : undefined;
    return [
      card('ID', this.matchText(text, /["']?(?:id|recordId|resourceId)["']?\s*[:=]\s*["']([^"',}]+)/i)),
      card('Status', this.latestStatus(text, 'status'), this.statusTone(this.latestStatus(text, 'status'))),
      card('Decision', this.latestStatus(text, 'decision'), this.statusTone(this.latestStatus(text, 'decision'))),
      card('Result', this.latestStatus(text, 'result'), this.statusTone(this.latestStatus(text, 'result'))),
      card('Risk', this.latestStatus(text, 'riskLevel'), this.statusTone(this.latestStatus(text, 'riskLevel')))
    ].filter(Boolean) as { label: string; value: string; tone?: string }[];
  }

  private matchText(text: string, pattern: RegExp): string {
    return text.match(pattern)?.[1] || '';
  }

  private latestStatus(text: string, key: string): string {
    const pattern = new RegExp(`${key}["']?\\s*[:=]\\s*["']([^"',}]+)`, 'ig');
    const values = Array.from(text.matchAll(pattern)).map(match => match[1]).filter(Boolean);
    return [...values].reverse().find(value => value.toUpperCase() !== 'UNKNOWN') || values[values.length - 1] || '';
  }

  private statusTone(value: string): string {
    const normalized = String(value || '').toUpperCase();
    if (['CLEAR', 'LOW', 'APPROVED'].includes(normalized)) return 'good';
    if (['UNKNOWN', 'PENDING', 'INCOMPLETE', 'MANUAL_REVIEW', 'NEEDS_MORE_INFO'].includes(normalized)) return 'warn';
    if (['FAILED', 'BLOCKED', 'MATCH_FOUND', 'HIGH', 'REJECTED'].includes(normalized)) return 'bad';
    return '';
  }

  private resumeHumanPayload(payload: any, displayText: string) {
    this.clearAllProgress();
    this.messages.push({ role: 'user', text: displayText });
    this.addProgress('Sending your response back to the agent.');
    this.message = '';
    this.loading = true;
    this.awaitingHuman = false;
    this.humanPrompt = undefined;
    this.humanDetailRows = [];
    this.humanFormFields = [];
    this.api.resumeRun(this.currentRunId, payload).subscribe({
      next: () => {
        this.persistActiveState();
        if (this.currentRunId) this.stream(this.currentRunId);
      },
      error: err => {
        this.loading = false;
        this.awaitingHuman = true;
        this.humanPrompt = this.humanPrompt || { title: 'Input needed', message: 'Please provide the requested input so the agent can continue.' };
        this.logs.push({ status: 'error', message: this.errorText(err), event: { status: 'error', error: this.errorText(err) } });
        this.persistActiveState();
      }
    });
  }

  private updateExecutionDiagram(event: any, status: string, nodeId?: string, nodeType?: string) {
    const update = event.update || {};
    if (nodeId) {
      if (status === 'error' || status === 'aborted') this.nodeStatuses[nodeId] = 'error';
      else if (status === 'awaiting_human' || update.started) this.nodeStatuses[nodeId] = 'running';
      else this.nodeStatuses[nodeId] = 'done';
    }
    if (['done', 'error', 'aborted'].includes(status)) {
      Object.keys(this.nodeStatuses).forEach(id => {
        if (this.nodeStatuses[id] === 'running') this.nodeStatuses[id] = status === 'done' ? 'done' : 'error';
      });
    }
    if (status === 'running' && this.executionNodes.length === 0) {
      this.executionNodes.push({ id: 'run_start', label: 'Run started', type: 'START', status: 'done' });
    }

    const id = nodeId || `${nodeType || status}_${this.executionNodes.length}`;
    if (nodeId || nodeType) {
      this.upsertExecutionNode({
        id,
        label: this.executionNodeLabel(nodeId, nodeType),
        type: String(nodeType || 'NODE'),
        status: this.executionNodeStatus(status, update)
      });
    }

    const selected = update.selected_agent_ids || update.selectedAgentIds || [];
    if (Array.isArray(selected)) {
      selected.forEach((agentId: any) => this.upsertExecutionNode({
        id: `agent_${agentId}`,
        label: this.agentName(agentId),
        type: 'SELECTED AGENT',
        status: 'done'
      }));
    }

    const childAgentId = update.child_agent_id || update.childAgentId;
    if (childAgentId) {
      this.upsertExecutionNode({
        id: `agent_${childAgentId}`,
        label: this.agentName(childAgentId),
        type: 'CHILD AGENT',
        status: String(update.child_status || update.childStatus || 'done').toLowerCase()
      });
    }

    if (['done', 'error', 'aborted'].includes(status)) {
      this.upsertExecutionNode({
        id: 'run_end',
        label: status === 'done' ? 'Completed' : 'Stopped',
        type: 'END',
        status: status === 'done' ? 'done' : 'error'
      });
    }
  }

  private upsertExecutionNode(node: ExecutionNode) {
    const existing = this.executionNodes.find(n => n.id === node.id);
    if (existing) {
      existing.label = node.label || existing.label;
      existing.type = node.type || existing.type;
      existing.status = node.status || existing.status;
      return;
    }
    this.executionNodes.push(node);
    if (this.executionNodes.length > 40) this.executionNodes = this.executionNodes.slice(-40);
  }

  private executionNodeLabel(nodeId?: string, nodeType?: string) {
    const type = String(nodeType || '').replace(/_/g, ' ');
    return type || nodeId || 'Step';
  }

  private executionNodeStatus(status: string, update: any) {
    if (status === 'error' || status === 'aborted') return 'error';
    if (status === 'awaiting_human') return 'running';
    if (update?.started) return 'running';
    return 'done';
  }

  private agentName(agentId: any) {
    const id = String(agentId || '');
    return this.agents.find(a => String(a.id) === id)?.name || id.slice(0, 12) || 'Agent';
  }

  private recordRun(status: string, stepCount: number, input: any) {
    if (!this.currentRunId) return;
    this.api.recordRunEvent({
      runId: this.currentRunId,
      agentId: this.agentId,
      sessionId: this.sessionId,
      traceId: this.traceId,
      status,
      stepCount,
      input,
      ...this.lastRunMetrics
    }).subscribe({ error: err => console.error(err) });
  }

  private recordChildRunFromEvent(event: any, nodeId?: string) {
    const update = event.update || {};
    const childRunId = update.child_run_id || update.childRunId;
    if (!childRunId) return;
    this.api.recordRunEvent({
      runId: childRunId,
      agentId: update.child_agent_id || update.childAgentId,
      parentRunId: this.currentRunId,
      invokedByAgentId: this.agentId,
      invocationNodeId: nodeId,
      traceId: this.traceId,
      status: String(update.child_status || update.childStatus || 'DONE').toUpperCase(),
      stepCount: 0,
      input: { parentRunId: this.currentRunId }
    }).subscribe({ error: err => console.error(err) });
  }

  private recordStepEvent(event: any, status: string, nodeId?: string, nodeType?: string) {
    if (!this.currentRunId || (!nodeId && !nodeType)) return;
    const update = event.update || {};
    const output = event.output || update;
    const metrics = this.metricsFromPayload(output);
    const nodeKey = nodeId || nodeType || 'unknown';
    if (update.started) this.nodeStartedAt[nodeKey] = Date.now();
    const startedAt = this.nodeStartedAt[nodeKey];
    const durationMs = this.num(update.duration_ms ?? update.durationMs) || (startedAt ? Date.now() - startedAt : 0);
    const toolLatencyMs = this.num(update.tool_latency_ms ?? update.toolLatencyMs ?? update.tool_result?.latency_ms ?? update.tool_result?.latencyMs);
    const ragHitCount = this.num(update.rag_hit_count ?? update.ragHitCount ?? update.chunks?.length);
    this.persistedStepCount += 1;
    this.api.recordRunEvent({
      runId: this.currentRunId,
      agentId: this.agentId,
      sessionId: this.sessionId,
      traceId: this.traceId,
      status: 'STEP',
      eventStatus: status,
      sequence: this.persistedStepCount,
      nodeId,
      nodeType,
      durationMs,
      toolLatencyMs,
      ragHitCount,
      provider: metrics.provider,
      model: metrics.model,
      promptTokens: metrics.promptTokens,
      completionTokens: metrics.completionTokens,
      totalTokens: metrics.totalTokens,
      totalCostUsd: metrics.totalCostUsd,
      error: event.error,
      input: { message: this.lastUserMessage() },
      output: typeof output === 'object' ? output : { value: output },
      event
    }).subscribe({ error: err => console.error(err) });
  }

  private metricsFromPayload(payload: any): any {
    const found = this.findMetricsPayload(payload);
    if (!found) return {};
    const usage = found.usage || {};
    const promptTokens = this.num(usage.prompt_tokens ?? usage.promptTokens ?? usage.input_tokens ?? usage.inputTokens);
    const completionTokens = this.num(usage.completion_tokens ?? usage.completionTokens ?? usage.output_tokens ?? usage.outputTokens);
    const totalTokens = this.num(usage.total_tokens ?? usage.totalTokens) || promptTokens + completionTokens;
    const totalCostUsd = this.num(found.cost ?? found.total_cost_usd ?? found.totalCostUsd) || this.estimateCostUsd(found.provider, found.model, promptTokens, completionTokens);
    return {
      provider: found.provider,
      model: found.model,
      promptTokens,
      completionTokens,
      totalTokens,
      totalCostUsd
    };
  }

  private findMetricsPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return undefined;
    const usage = payload.usage || {};
    const hasUsage = usage && typeof usage === 'object' && Object.keys(usage).some(key => /tokens?/i.test(key));
    if (hasUsage) return payload;
    for (const value of Object.values(payload)) {
      if (value && typeof value === 'object') {
        const nested = this.findMetricsPayload(value);
        if (nested) return { provider: nested.provider || payload.provider, model: nested.model || payload.model, usage: nested.usage, cost: nested.cost ?? nested.total_cost_usd ?? nested.totalCostUsd };
      }
    }
    return undefined;
  }

  private estimateCostUsd(provider: any, model: any, promptTokens: number, completionTokens: number): number {
    const normalized = String(model || '').toLowerCase().split(/[/:]/).pop() || '';
    const prices: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.0025, output: 0.0100 },
      'claude-3-5-sonnet-latest': { input: 0.0030, output: 0.0150 },
      'claude-3-5-sonnet-20241022': { input: 0.0030, output: 0.0150 }
    };
    const price = prices[normalized];
    if (!price || (!promptTokens && !completionTokens)) return 0;
    return (promptTokens / 1000) * price.input + (completionTokens / 1000) * price.output;
  }

  private num(value: any): number {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  private lastUserMessage(): string {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') return this.messages[i].text;
    }
    return '';
  }

  private ensureConversationSaved() {
    if (this.conversationId) {
      this.saveConversation();
      return;
    }

    this.api.createConversation(this.conversationPayload()).subscribe(c => {
      this.conversationId = c.id;
      this.sessionId = c.sessionId || this.sessionId;
      this.persistActiveState();
      this.loadConversations();
    });
  }

  private saveConversation() {
    if (!this.conversationId) return;
    this.api.updateConversation(this.conversationId, this.conversationPayload()).subscribe({
      next: () => this.loadConversations(),
      error: err => console.error(err)
    });
  }

  private conversationPayload() {
    return {
      agentId: this.agentId,
      sessionId: this.sessionId,
      traceId: this.traceId,
      title: this.titleFromMessages(),
      messages: this.messages,
      runState: {
        currentRunId: this.currentRunId,
        traceId: this.traceId,
        logs: this.logs,
        executionNodes: this.executionNodes,
        nodeStatuses: this.nodeStatuses,
        loading: this.loading,
        awaitingHuman: this.awaitingHuman,
        humanPrompt: this.humanPrompt,
        missingParamRequest: this.missingParamRequest,
        activeNode: this.activeNode,
        handledEventCount: this.handledEventCount,
        persistedStepCount: this.persistedStepCount,
        runStartedAt: this.runStartedAt,
        lastRunMetrics: this.lastRunMetrics
      }
    };
  }

  private applyConversation(c: any) {
    this.closeStream();
    this.conversationId = c.id || '';
    this.agentId = c.agentId || this.agentId;
    this.loadAgentDiagram();
    this.sessionId = c.sessionId || this.newSessionId();
    this.messages = this.extractMessages(c);
    this.shouldScrollMessages = true;
    const runState = c?.messagesJson?.runState || c?.runState || {};
    this.logs = Array.isArray(runState.logs) ? runState.logs : [];
    this.executionNodes = Array.isArray(runState.executionNodes) ? runState.executionNodes : [];
    this.nodeStatuses = runState.nodeStatuses || {};
    this.currentRunId = runState.currentRunId || '';
    this.traceId = runState.traceId || this.traceId;
    this.activeNode = runState.activeNode || '';
    this.loading = !!runState.loading && !!this.currentRunId;
    this.awaitingHuman = !!runState.awaitingHuman;
    this.humanPrompt = runState.humanPrompt;
    this.missingParamRequest = runState.missingParamRequest;
    if (this.humanPrompt) this.humanPrompt.summaryCards = this.humanPrompt.summaryCards || this.humanSummaryCards(this.humanPrompt.details);
    this.humanDetailRows = this.toHumanDetailRows(this.humanPrompt?.details);
    this.humanFormFields = this.toHumanFormFields(this.humanPrompt?.formSchema);
    this.handledEventCount = Number(runState.handledEventCount || 0);
    this.persistedStepCount = Number(runState.persistedStepCount || 0);
    this.runStartedAt = Number(runState.runStartedAt || 0);
    this.lastRunMetrics = runState.lastRunMetrics || {};
    this.terminalRunRecorded = false;
    this.persistActiveState();
    if ((this.loading || this.awaitingHuman) && this.currentRunId) this.stream(this.currentRunId);
  }

  private extractMessages(c: any): ChatMessage[] {
    const messages = c?.messagesJson?.messages || c?.messages || [];
    return Array.isArray(messages) ? messages : [];
  }

  private addProgress(text: string) {
    const user = this.latestUserMessage();
    if (!user) return;
    user.progress = user.progress || [];
    user.progressVisible = true;
    if (user.progress[user.progress.length - 1] === text) return;
    user.progress.push(text);
    if (user.progress.length > 12) user.progress = user.progress.slice(-12);
    this.shouldScrollMessages = true;
  }

  private clearAllProgress() {
    this.messages.forEach(m => {
      if (m.role === 'user') {
        m.progressVisible = false;
        m.progress = [];
      }
    });
  }

  private latestUserMessage(): ChatMessage | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') return this.messages[i];
    }
    return undefined;
  }

  private latestAgentMessage(): ChatMessage | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'agent') return this.messages[i];
    }
    return undefined;
  }

  private latestAgentMessageAfter(message?: ChatMessage): ChatMessage | undefined {
    const start = message ? this.messages.indexOf(message) : -1;
    if (start < 0) return this.latestAgentMessage();
    for (let i = this.messages.length - 1; i > start; i--) {
      if (this.messages[i].role === 'agent') return this.messages[i];
    }
    return undefined;
  }

  private titleFromMessages(): string {
    const firstUser = this.messages.find(m => m.role === 'user')?.text || 'New chat';
    return firstUser.length > 48 ? firstUser.slice(0, 45) + '...' : firstUser;
  }

  private newSessionId(): string {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  private newTraceId(): string {
    return 'trace-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
  }

  private appendAssistant(text: string) {
    const last = this.messages[this.messages.length - 1];
    if (!last || last.role !== 'agent') {
      this.messages.push({ role: 'agent', text: text, run: this.currentRunSnapshot() });
      this.shouldScrollMessages = true;
      return;
    }
    last.text += text;
    this.shouldScrollMessages = true;
  }

  private setFinalAssistant(text: string) {
    const last = this.messages[this.messages.length - 1];
    if (last && last.role === 'agent') {
      last.text = text;
      last.run = this.currentRunSnapshot();
    } else {
      this.messages.push({ role: 'agent', text, run: this.currentRunSnapshot() });
    }
    this.shouldScrollMessages = true;
  }

  private showHumanPrompt(event: any) {
    const payload = event.payload || {};
    const title = payload.title || 'Input needed';
    const detail = payload.message || 'Please provide the requested input so the agent can continue.';
    const type = payload.approval_type || payload.approvalType;
    this.missingParamRequest = undefined;
    this.humanPrompt = {
      title,
      message: detail,
      approvalType: type || 'text_input',
      choices: this.promptChoices(payload),
      details: payload.details,
      formSchema: payload.form_schema || payload.formSchema,
      formValues: this.initialHumanFormValues(payload.form_schema || payload.formSchema),
      summaryCards: this.humanSummaryCards(payload.details)
    };
    this.humanDetailRows = this.toHumanDetailRows(payload.details);
    this.humanFormFields = this.toHumanFormFields(payload.form_schema || payload.formSchema);
    const text = `${title}\n${detail}${type ? `\nType: ${type}` : ''}`;
    const last = this.messages[this.messages.length - 1];
    if (last?.role === 'agent' && last.text === text) return;
    this.messages.push({ role: 'agent', text });
    this.activeNode = 'Waiting for human input';
    this.shouldScrollMessages = true;
  }

  private promptChoices(payload: any): string[] {
    const choices = payload.choices || payload.options;
    if (Array.isArray(choices)) return choices.map(choice => String(choice)).filter(Boolean);
    if (typeof choices === 'string') return choices.split(',').map(choice => choice.trim()).filter(Boolean);
    return [];
  }

  private initialHumanFormValues(schema: any): Record<string, any> {
    if (!schema || typeof schema !== 'object') return {};
    const values: Record<string, any> = {};
    Object.keys(schema).forEach(key => {
      const field = schema[key] || {};
      if (field.default !== undefined) values[key] = field.default;
      else if (Array.isArray(field.options) && field.options.length) values[key] = field.options[0];
      else values[key] = field.type === 'checkbox' ? false : '';
    });
    return values;
  }

  private extractAnswer(output: any): string {
    if (typeof output === 'string') return output;
    if (!output) return '';
    if (typeof output.answer === 'string') return output.answer;
    if (typeof output.content === 'string') return output.content;
    if (typeof output.message === 'string') return output.message;
    return JSON.stringify(output, null, 2);
  }

  private describeEvent(event: any): string {
    if (event.error) return String(event.error);
    if (event.reason) return String(event.reason);
    if (event.status === 'running') return 'Execution started';
    if (event.status === 'awaiting_human') return 'Waiting for human input';
    if (event.status === 'done') return 'Execution completed';
    if (event.update?.child_run_id) return `Child agent completed: ${event.update.child_run_id}`;
    if (event.update?.answer) return 'LLM response received';
    if (event.update?.tool_started) return `Calling tool ${this.toolDisplayName(event.update)}`;
    if (event.update?.skipped && event.update?.missing_args?.length) return `Need ${event.update.missing_args.join(', ')} for ${this.toolDisplayName(event.update)}`;
    if (event.update?.skipped && event.update?.tool_id) return `Skipped tool ${this.toolDisplayName(event.update)}: ${event.update.reason || 'not runnable'}`;
    if (event.update?.tool_result) return this.toolResultText(event.update.tool_result);
    if (event.update?.started) return 'Node started';
    return 'Event received';
  }

  private eventDurationMs(event: any, nodeId?: string, nodeType?: string): number | undefined {
    const update = event.update || {};
    const explicit = this.num(update.duration_ms ?? update.durationMs ?? update.tool_latency_ms ?? update.toolLatencyMs ?? update.tool_result?.latency_ms ?? update.tool_result?.latencyMs);
    if (explicit > 0) return explicit;
    if (event.status === 'running') {
      if (!this.runStartedAt) this.runStartedAt = Date.now();
      return 0;
    }
    if (['done', 'error', 'aborted'].includes(event.status || '')) {
      return this.runStartedAt ? Date.now() - this.runStartedAt : undefined;
    }
    const nodeKey = nodeId || nodeType;
    if (!nodeKey) return undefined;
    if (update.started) {
      this.nodeStartedAt[nodeKey] = Date.now();
      return 0;
    }
    const startedAt = this.nodeStartedAt[nodeKey];
    return startedAt ? Date.now() - startedAt : undefined;
  }

  private progressText(event: any): string {
    const status = event.status || '';
    const nodeType = String(event.node_type || event.nodeType || '').toUpperCase();
    const update = event.update || {};
    if (status === 'running') return 'Thinking...';
    if (status === 'awaiting_human') return 'Waiting for your input.';
    if (status === 'done') return '';
    if (status === 'error') return 'Stopped with an error.';
    if (update.tool_started) return `Calling ${this.toolDisplayName(update)}.`;
    if (update.skipped && update.missing_args?.length) return `Need ${update.missing_args.join(', ')} before calling ${this.toolDisplayName(update)}.`;
    if (update.skipped && update.tool_id) return `Skipped ${this.toolDisplayName(update)}: ${update.reason || 'not runnable'}.`;
    if (update.tool_result) {
      const name = this.toolDisplayName(update);
      return `Got result from ${name}.`;
    }
    if (update.tool_id) return `Tool ${this.toolDisplayName(update)} updated.`;
    if (update.memory_read !== undefined) return `Checking memory (${update.memory_read} item${update.memory_read === 1 ? '' : 's'} found).`;
    if (update.memory_write) return 'Saving useful details to memory.';
    if (update.answer) return 'Preparing the answer.';
    if (update.started) {
      if (nodeType === 'MEMORY') return 'Going to memory.';
      if (nodeType === 'RAG_QUERY') return 'Searching knowledge.';
      if (nodeType === 'TOOLS' || nodeType === 'TOOL_EXECUTOR') return 'Choosing the right tool.';
      if (nodeType === 'AGENT_CALL') return 'Calling a specialist agent.';
      if (nodeType === 'AGENT_ROUTER') return 'Routing to specialist agents.';
      if (nodeType === 'LLM') return 'Thinking with the selected LLM.';
      if (nodeType === 'PROMPT_TEMPLATE') return 'Preparing the prompt.';
      if (nodeType === 'CONDITION') return 'Checking the next step.';
      return nodeType ? `Running ${nodeType}.` : 'Running next step.';
    }
    return '';
  }

  private errorText(err: any): string {
    return err?.error?.detail || err?.message || 'Request failed';
  }

  private showMissingParamForm(update: any) {
    const args = Array.isArray(update.missing_args) ? update.missing_args.map((x: any) => String(x)).filter(Boolean) : [];
    if (!args.length) return;
    const examples = this.examplesForMissingParams(args, update);
    this.missingParamRequest = {
      toolName: this.toolDisplayName(update),
      missingArgs: args,
      examples,
      values: Object.fromEntries(args.map(arg => [arg, ''])),
      message: update.message || update.reason || `I need ${args.join(', ')} before calling ${this.toolDisplayName(update)}.`,
      contextMessage: this.currentRunUserRequest || this.lastUserMessage(),
      contextInput: this.currentRunAttachmentInput || {}
    };
    const text = `I need these required parameters before calling ${this.toolDisplayName(update)}:\n${args.map(arg => `- ${arg}: example ${examples[arg]}`).join('\n')}`;
    const last = this.messages[this.messages.length - 1];
    if (!last || last.role !== 'agent' || last.text !== text) this.messages.push({ role: 'agent', text, run: this.currentRunSnapshot() });
    this.shouldScrollMessages = true;
  }

  private examplesForMissingParams(args: string[], update: any): Record<string, any> {
    const schema = update.input_schema || update.inputSchema || update.schema || {};
    const props = schema.properties || {};
    const supplied = update.example_values || update.examples || {};
    const out: Record<string, any> = {};
    args.forEach(arg => {
      out[arg] = supplied[arg] ?? props[arg]?.example ?? props[arg]?.default ?? this.exampleValueForParam(arg);
    });
    return out;
  }

  private exampleValueForParam(arg: string): string {
    const key = String(arg || '').toLowerCase();
    if (key.includes('tenant')) return 'TENANT-001';
    if (key.includes('amount')) return '1000';
    if (key.includes('email')) return 'user@example.com';
    if (key.includes('phone')) return '1234567890';
    if (key.includes('date')) return '2026-05-13';
    if (key.includes('file') || key.includes('csv')) return 'test.csv';
    if (key.includes('pageable')) return '{"page":0,"size":10}';
    if (key.includes('body')) return '{"fieldName":"exampleValue"}';
    if (key.includes('id')) return 'ID-001';
    return 'exampleValue';
  }

  private terminalErrorText(event: any): string {
    const raw = event?.error || event?.reason || event?.update?.error || event?.output?.error || 'The run stopped before producing a response.';
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (text.includes('Prompt tokens limit exceeded') || text.includes('tokens limit exceeded')) {
      return 'The model rejected this request because the prompt became too large. I trimmed context handling for future runs; please retry the same question.';
    }
    if (text.includes('timed out')) {
      return 'The run timed out while waiting for a model or tool response. Please retry, or reduce the selected tools/context.';
    }
    return `The run stopped with an error: ${text.slice(0, 600)}`;
  }

  private toolResultText(result: any): string {
    if (!result) return 'Tool result received';
    const status = result.status || 'done';
    const tool = result.tool ? ` ${result.tool}` : '';
    const output = result.output ?? result.error ?? '';
    const preview = typeof output === 'string' ? output : JSON.stringify(output);
    return `Tool${tool} ${status}: ${preview.slice(0, 240)}`;
  }

  private toolDisplayName(update: any): string {
    return String(update?.tool_name || update?.toolName || update?.tool_result?.tool || update?.tool_result?.name || update?.tool_id || update?.toolId || 'tool');
  }

  private chatHistoryForRuntime() {
    return this.messages.slice(-6).map(m => ({ role: m.role, text: this.limitText(m.text, 3000) }));
  }

  private limitText(text: string, limit: number): string {
    const value = String(text || '');
    if (value.length <= limit) return value;
    return value.slice(0, limit) + `\n[truncated ${value.length - limit} characters]`;
  }

  private embedSnippet(embedToken: string): string {
    const agentName = this.agents.find(a => a.id === this.agentId)?.name || 'Agent';
    const runtimeBase = `${this.api.gateway}/api/runtime`;
    return `<div id="agentchain-chat-widget"></div>
<script>
(function () {
  const config = {
    agentId: ${JSON.stringify(this.agentId)},
    agentName: ${JSON.stringify(agentName)},
    runtimeBase: ${JSON.stringify(runtimeBase)},
    embedToken: ${JSON.stringify(embedToken)}
  };
  const root = document.getElementById('agentchain-chat-widget');
  root.innerHTML = '<div style="width:360px;max-width:100%;border:1px solid #e5e7eb;border-radius:12px;font-family:Arial,sans-serif;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.12)"><div style="background:#3f51b5;color:white;padding:12px 14px;font-weight:700"></div><div data-log style="height:360px;overflow:auto;padding:12px;background:#fff"></div><form data-form style="display:flex;gap:8px;border-top:1px solid #e5e7eb;padding:10px"><input data-input style="flex:1;border:1px solid #d1d5db;border-radius:8px;padding:9px" placeholder="Type your message..."><button style="border:0;border-radius:8px;background:#3f51b5;color:white;padding:0 14px">Send</button></form></div>';
  root.querySelector('div div').textContent = config.agentName;
  const log = root.querySelector('[data-log]');
  const form = root.querySelector('[data-form]');
  const input = root.querySelector('[data-input]');
  const sessionId = 'embed-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  function add(role, text) {
    const row = document.createElement('div');
    row.style.cssText = 'margin:8px 0;white-space:pre-wrap;line-height:1.4';
    row.innerHTML = '<strong>' + role + '</strong><br>' + String(text).replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    add('You', message);
    const thinking = add(config.agentName, 'Thinking...');
    try {
      const res = await fetch(config.runtimeBase + '/chat?embed_token=' + encodeURIComponent(config.embedToken), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({agent_id: config.agentId, session_id: sessionId, message})
      });
      const run = await res.json();
      const es = new EventSource(config.runtimeBase + '/runs/' + run.run_id + '/stream');
      es.onmessage = function (evt) {
        const event = JSON.parse(evt.data);
        if (event.output) thinking.innerHTML = '<strong>' + config.agentName + '</strong><br>' + (event.output.answer || event.output.content || JSON.stringify(event.output));
        if (['done','error','aborted'].includes(event.status)) es.close();
      };
      es.onerror = function () { es.close(); };
    } catch (err) {
      thinking.innerHTML = '<strong>' + config.agentName + '</strong><br>Unable to reach the agent runtime.';
    }
  });
})();
</script>`;
  }

  private copyEmbedSnippet(embedToken: string, successMessage = 'Chat widget snippet copied') {
    const snippet = this.embedSnippet(embedToken);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet)
        .then(() => this.snack.open(successMessage, 'Dismiss', { duration: 2500 }))
        .catch(() => this.fallbackCopy(snippet));
      return;
    }
    this.fallbackCopy(snippet);
  }

  private fallbackCopy(text: string) {
    window.prompt('Copy chat widget snippet:', text);
    this.snack.open('Copy the widget snippet from the prompt', 'Dismiss', { duration: 3500 });
  }

  private restoreActiveState() {
    const raw = localStorage.getItem(this.activeStateKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      if (!state?.currentRunId && !state?.conversationId) return;
      this.conversationId = state.conversationId || '';
      this.agentId = state.agentId || this.agentId;
      this.selectedEnvironmentKey = state.selectedEnvironmentKey || this.selectedEnvironmentKey;
      this.sessionId = state.sessionId || this.sessionId;
      this.traceId = state.traceId || this.traceId;
      this.messages = Array.isArray(state.messages) ? state.messages : [];
      this.logs = Array.isArray(state.logs) ? state.logs : [];
      this.executionNodes = Array.isArray(state.executionNodes) ? state.executionNodes : [];
      this.nodeStatuses = state.nodeStatuses || {};
      this.currentRunId = state.currentRunId || '';
      this.activeNode = state.activeNode || '';
      this.loading = !!state.loading && !!this.currentRunId;
      this.awaitingHuman = !!state.awaitingHuman;
      this.humanPrompt = state.humanPrompt;
      this.missingParamRequest = state.missingParamRequest;
      this.handledEventCount = Number(state.handledEventCount || 0);
      this.persistedStepCount = Number(state.persistedStepCount || 0);
      this.runStartedAt = Number(state.runStartedAt || 0);
      this.lastRunMetrics = state.lastRunMetrics || {};
      this.shouldScrollMessages = true;
      if ((this.loading || this.awaitingHuman) && this.currentRunId) this.stream(this.currentRunId);
    } catch {
      this.clearActiveState();
    }
  }

  private persistActiveState() {
    if (!this.currentRunId && !this.conversationId && this.messages.length === 0) {
      this.clearActiveState();
      return;
    }
    localStorage.setItem(this.activeStateKey, JSON.stringify({
      conversationId: this.conversationId,
      agentId: this.agentId,
      selectedEnvironmentKey: this.selectedEnvironmentKey,
      sessionId: this.sessionId,
      traceId: this.traceId,
      messages: this.messages,
      logs: this.logs,
      executionNodes: this.executionNodes,
      nodeStatuses: this.nodeStatuses,
      loading: this.loading,
      awaitingHuman: this.awaitingHuman,
      humanPrompt: this.humanPrompt,
      missingParamRequest: this.missingParamRequest,
      currentRunId: this.currentRunId,
      activeNode: this.activeNode,
      handledEventCount: this.handledEventCount,
      persistedStepCount: this.persistedStepCount,
      runStartedAt: this.runStartedAt,
      lastRunMetrics: this.lastRunMetrics
    }));
  }

  private clearActiveState() {
    localStorage.removeItem(this.activeStateKey);
  }

  private restorePanelState() {
    const raw = localStorage.getItem(this.panelStateKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      this.historyCollapsed = !!state.historyCollapsed;
      this.executionCollapsed = state.executionCollapsed !== false;
    } catch {
      localStorage.removeItem(this.panelStateKey);
    }
  }

  private persistPanelState() {
    localStorage.setItem(this.panelStateKey, JSON.stringify({
      historyCollapsed: this.historyCollapsed,
      executionCollapsed: this.executionCollapsed
    }));
  }

  private closeStream() {
    if (!this.eventSource) return;
    this.eventSource.close();
    this.eventSource = undefined;
  }
}
