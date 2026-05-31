import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { CanvasNode } from '../../../shared/models/canvas';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-config-panel',
  template: `
  <mat-card class="panel">
    <ng-container *ngIf="node; else none">
      <div class="node-hero">
        <div class="node-icon"><mat-icon>{{nodeIcon(node.type)}}</mat-icon></div>
        <div class="node-heading">
          <span class="eyebrow">Selected node</span>
          <h3>{{label || node.type}}</h3>
          <p>{{nodeHelp(node.type)}}</p>
        </div>
      </div>
      <div class="quick-summary">
        <span class="type-badge">{{node.type}}</span>
        <span class="summary-chip" *ngIf="config.model_alias">Alias: {{config.model_alias}}</span>
        <span class="summary-chip" *ngIf="config.collection">Collection: {{config.collection}}</span>
        <span class="summary-chip" *ngIf="config.tool_ids?.length">{{config.tool_ids.length}} tools</span>
        <span class="summary-chip" *ngIf="config.namespace">Memory: {{config.namespace}}</span>
      </div>
      <section class="form-section">
        <div class="section-title">
          <span>Basics</span>
          <small>Rename the node and review its role.</small>
        </div>
        <mat-form-field class="full-width"><mat-label>Label</mat-label><input matInput [(ngModel)]="label"></mat-form-field>
      </section>
      <section class="form-section">
        <div class="section-title">
          <span>Configuration</span>
          <small>{{configHelp(node.type)}}</small>
        </div>
      <ng-container [ngSwitch]="node.type">
        <ng-container *ngSwitchCase="'START'">
          <mat-form-field class="full-width"><mat-label>Initial message key</mat-label><input matInput [(ngModel)]="config.initial_message_key"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Input schema JSON</mat-label><textarea rows="6" matInput [(ngModel)]="config.input_schema"></textarea></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'END'">
          <mat-form-field class="full-width"><mat-label>Output mapping JSON</mat-label><textarea rows="8" matInput [(ngModel)]="config.output_mapping"></textarea></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'LLM'">
          <mat-form-field class="full-width"><mat-label>Model alias</mat-label><mat-select [(ngModel)]="config.model_alias" (selectionChange)="onAliasChange()"><mat-option value="">Direct provider/model</mat-option><mat-option *ngFor="let a of aliases" [value]="a.aliasName">{{a.aliasName}} - {{(a.providerModelOrder || []).join(', ')}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Smart LLM router</mat-label><mat-select [(ngModel)]="config.smart_routing"><mat-option [value]="false">Off</mat-option><mat-option [value]="true">On</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Router strategy</mat-label><mat-select [(ngModel)]="config.router_strategy" [disabled]="!config.smart_routing"><mat-option *ngFor="let strategy of routerStrategies" [value]="strategy">{{routerStrategyLabel(strategy)}}</mat-option></mat-select></mat-form-field>
          <div class="mini-actions"><button mat-button type="button" (click)="previewRouter()" [disabled]="!config.smart_routing">Preview Route</button><span class="hint" *ngIf="routerPreview">Selected {{routerPreview.provider}} / {{routerPreview.model}}</span></div>
          <pre class="router-preview" *ngIf="routerPreview">{{routerPreview | json}}</pre>
          <mat-form-field class="full-width"><mat-label>Provider</mat-label><mat-select [(ngModel)]="config.provider" (selectionChange)="onProviderChange()"><mat-option value="">Default</mat-option><mat-option *ngFor="let p of providers" [value]="p.name">{{p.displayName || p.name}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Model</mat-label><mat-select [(ngModel)]="config.model" [disabled]="!!config.model_alias"><mat-option value="">Use alias/default</mat-option><mat-option *ngFor="let m of filteredModels()" [value]="m.model">{{m.provider}} / {{m.displayName || m.model}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Temperature</mat-label><input matInput type="number" step="0.1" [(ngModel)]="config.temperature"></mat-form-field>
          <mat-form-field class="half"><mat-label>Max tokens</mat-label><input matInput type="number" [(ngModel)]="config.max_tokens"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Prompt template</mat-label><mat-select [(ngModel)]="config.prompt_template_id"><mat-option value="">None</mat-option><mat-option *ngFor="let p of prompts" [value]="p.id">{{p.name}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Orchestrator</mat-label><mat-select [(ngModel)]="config.orchestrate"><mat-option [value]="true">On</mat-option><mat-option [value]="false">Off</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Use tools</mat-label><mat-select [(ngModel)]="config.use_tools"><mat-option [value]="true">Auto</mat-option><mat-option [value]="false">Off</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Use RAG</mat-label><mat-select [(ngModel)]="config.use_rag"><mat-option [value]="true">Auto</mat-option><mat-option [value]="false">Off</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Always use RAG</mat-label><mat-select [(ngModel)]="config.always_use_rag"><mat-option [value]="false">No</mat-option><mat-option [value]="true">Yes</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Memory config</mat-label><mat-select [(ngModel)]="config.memory_config_id" (selectionChange)="onMemorySelected()"><mat-option value="">No direct memory</mat-option><mat-option *ngFor="let m of memoryConfigs" [value]="m.id">{{memoryLabel(m)}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Memory namespace</mat-label><input matInput [(ngModel)]="config.memory_namespace"></mat-form-field>
          <mat-form-field class="half"><mat-label>Memory top K</mat-label><input matInput type="number" [(ngModel)]="config.memory_top_k"></mat-form-field>
          <mat-form-field class="half"><mat-label>Write memory</mat-label><mat-select [(ngModel)]="config.write_memory"><mat-option [value]="true">Yes</mat-option><mat-option [value]="false">No</mat-option></mat-select></mat-form-field>
          <p class="hint">When orchestrator is on, this LLM reads configured memory, selects relevant RAG/tools from the canvas, answers with gathered context, and can write the conversation back to memory.</p>
          <mat-form-field class="full-width"><mat-label>System prompt</mat-label><textarea rows="4" matInput [(ngModel)]="config.system_prompt"></textarea></mat-form-field>
          <mat-form-field class="full-width"><mat-label>User prompt</mat-label><textarea rows="5" matInput [(ngModel)]="config.user_prompt"></textarea></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'TOOLS'">
          <mat-form-field class="full-width"><mat-label>Tool source</mat-label><mat-select [(ngModel)]="config.source" (selectionChange)="onToolSourceChange()"><mat-option value="HTTP">HTTP</mat-option><mat-option value="OPENAPI">OpenAPI</mat-option><mat-option value="MCP">MCP</mat-option></mat-select></mat-form-field>
          <ng-container *ngIf="config.source === 'MCP'; else httpToolPicker">
            <mat-form-field class="full-width"><mat-label>MCP server</mat-label><mat-select [(ngModel)]="config.mcp_server_id" (selectionChange)="onMcpServerChange()"><mat-option value="">Select MCP server</mat-option><mat-option *ngFor="let s of mcpServers" [value]="s.id">{{s.name}} / {{s.endpoint}}</mat-option></mat-select></mat-form-field>
            <mat-form-field class="full-width"><mat-label>MCP tools</mat-label><mat-select multiple [(ngModel)]="config.tool_ids" (selectionChange)="onToolsNodeSelected()"><mat-option *ngFor="let t of mcpToolOptions" [value]="t.id">{{toolLabel(t)}}</mat-option></mat-select></mat-form-field>
          </ng-container>
          <ng-template #httpToolPicker>
            <mat-form-field class="full-width"><mat-label>{{config.source === 'OPENAPI' ? 'OpenAPI tools' : 'HTTP tools'}}</mat-label><mat-select multiple [(ngModel)]="config.tool_ids" (selectionChange)="onToolsNodeSelected()"><mat-option *ngFor="let t of nonMcpToolsForSource()" [value]="t.id">{{toolLabel(t)}}</mat-option></mat-select></mat-form-field>
          </ng-template>
          <div class="mini-actions"><button mat-button type="button" (click)="selectAllVisibleTools()">Select all</button><button mat-button type="button" (click)="clearSelectedTools()">Clear</button></div>
          <p class="hint">{{selectedToolSummary()}}</p>
          <details *ngFor="let t of selectedToolObjects()" class="schema-preview">
            <summary>{{toolLabel(t)}} schema</summary>
            <p class="hint" *ngIf="t.description">{{t.description}}</p>
            <h4>Input</h4>
            <pre>{{schemaText(t.inputSchema)}}</pre>
            <h4>Output</h4>
            <pre>{{schemaText(t.outputSchema)}}</pre>
          </details>
          <mat-form-field class="half"><mat-label>Max relevant tools</mat-label><input matInput type="number" [(ngModel)]="config.max_tools"></mat-form-field>
          <mat-form-field class="half"><mat-label>Min relevance score</mat-label><input matInput type="number" [(ngModel)]="config.min_tool_score"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Route keywords</mat-label><input matInput [(ngModel)]="config.route_keywords" placeholder="tenant, site, device"></mat-form-field>
          <mat-form-field class="half"><mat-label>LLM planner</mat-label><mat-select [(ngModel)]="config.llm_planner"><mat-option [value]="false">Off</mat-option><mat-option [value]="true">On</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Execute all selected</mat-label><mat-select [(ngModel)]="config.execute_all"><mat-option [value]="false">No</mat-option><mat-option [value]="true">Yes</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Timeout seconds</mat-label><input matInput type="number" [(ngModel)]="config.timeout_s"></mat-form-field>
          <mat-form-field class="half"><mat-label>Retry count</mat-label><input matInput type="number" [(ngModel)]="config.retry_count"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Input mapping JSON</mat-label><textarea rows="7" matInput [(ngModel)]="config.input_mapping"></textarea></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'TOOL_EXECUTOR'">
          <mat-form-field class="full-width"><mat-label>Tools</mat-label><mat-select multiple [(ngModel)]="config.tool_ids" (selectionChange)="onToolsSelected()"><mat-option *ngFor="let t of tools" [value]="t.id">{{toolLabel(t)}}</mat-option></mat-select></mat-form-field>
          <div class="mini-actions"><button mat-button type="button" (click)="selectAllTools()">Select all</button><button mat-button type="button" (click)="clearSelectedTools()">Clear</button></div>
          <p class="hint">{{selectedToolSummary()}}</p>
          <mat-form-field class="half"><mat-label>Tool Type</mat-label><mat-select [(ngModel)]="config.tool_type"><mat-option value="HTTP">HTTP</mat-option><mat-option value="MCP">MCP</mat-option><mat-option value="MIXED">MIXED</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Min relevance score</mat-label><input matInput type="number" [(ngModel)]="config.min_tool_score"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Route keywords</mat-label><input matInput [(ngModel)]="config.route_keywords" placeholder="tenant, site, device"></mat-form-field>
          <mat-form-field class="half"><mat-label>LLM planner</mat-label><mat-select [(ngModel)]="config.llm_planner"><mat-option [value]="false">Off</mat-option><mat-option [value]="true">On</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Timeout seconds</mat-label><input matInput type="number" [(ngModel)]="config.timeout_s"></mat-form-field>
          <mat-form-field class="half"><mat-label>Retry count</mat-label><input matInput type="number" [(ngModel)]="config.retry_count"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Input mapping JSON</mat-label><textarea rows="7" matInput [(ngModel)]="config.input_mapping"></textarea></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'AGENT_CALL'">
          <mat-form-field class="full-width"><mat-label>Target agent</mat-label><mat-select [(ngModel)]="config.agent_id"><mat-option value="">Select agent</mat-option><mat-option *ngFor="let a of agents" [value]="a.id">{{a.name}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Output key</mat-label><input matInput [(ngModel)]="config.output_key"></mat-form-field>
          <mat-form-field class="half"><mat-label>Timeout seconds</mat-label><input matInput type="number" [(ngModel)]="config.timeout_s"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Input mapping JSON</mat-label><textarea rows="7" matInput [(ngModel)]="config.input_mapping"></textarea></mat-form-field>
          <p class="hint">Calls another saved agent as a child run and stores the child output under the output key.</p>
        </ng-container>
        <ng-container *ngSwitchCase="'AGENT_ROUTER'">
          <mat-form-field class="full-width"><mat-label>Candidate agents</mat-label><mat-select multiple [(ngModel)]="config.candidate_agents"><mat-option *ngFor="let a of agents" [value]="a.id">{{a.name}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Strategy</mat-label><mat-select [(ngModel)]="config.strategy"><mat-option value="hybrid">Hybrid router</mat-option><mat-option value="llm">LLM router</mat-option><mat-option value="keyword">Keyword router</mat-option><mat-option value="first">First candidates</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Max agents</mat-label><input matInput type="number" [(ngModel)]="config.max_agents"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Route keywords</mat-label><input matInput [(ngModel)]="config.route_keywords" placeholder="billing, support, network"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Candidate route metadata JSON</mat-label><textarea rows="7" matInput [(ngModel)]="config.candidate_agent_routes"></textarea></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Output key</mat-label><input matInput [(ngModel)]="config.output_key"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Input mapping JSON</mat-label><textarea rows="7" matInput [(ngModel)]="config.input_mapping"></textarea></mat-form-field>
          <p class="hint">Selects one or more specialist agents, invokes them, and passes their results to downstream nodes.</p>
        </ng-container>
        <ng-container *ngSwitchCase="'CONDITION'">
          <mat-form-field class="full-width"><mat-label>Route mode</mat-label><mat-select [(ngModel)]="config.route_mode"><mat-option value="decision_key">Decision key</mat-option><mat-option value="expression">Expression</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Decision key</mat-label><input matInput [(ngModel)]="config.decision_key"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Expression</mat-label><textarea rows="4" matInput [(ngModel)]="config.expression"></textarea></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Default route label</mat-label><input matInput [(ngModel)]="config.default_route"></mat-form-field>
          <div class="condition-examples">
            <button mat-button type="button" (click)="setConditionExample('message contains tenant')">message contains tenant</button>
            <button mat-button type="button" (click)="setConditionExample('state.rag_context.chunks exists')">RAG exists</button>
            <button mat-button type="button" (click)="setConditionExample('state.rag_context.chunks[0].score > 0.25')">score &gt; 0.25</button>
          </div>
          <p class="hint">Use FLOW edge labels like true, false, docs, tools, or the exact value from Decision key. Default route is used when no label matches.</p>
        </ng-container>
        <ng-container *ngSwitchCase="'MEMORY'">
          <mat-form-field class="full-width"><mat-label>Memory config</mat-label><mat-select [(ngModel)]="config.memory_config_id" (selectionChange)="onMemorySelected()"><mat-option value="">Manual</mat-option><mat-option *ngFor="let m of memoryConfigs" [value]="m.id">{{memoryLabel(m)}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Mode</mat-label><mat-select [(ngModel)]="config.mode"><mat-option value="read">Read only</mat-option><mat-option value="write">Write only</mat-option><mat-option value="read_write">Read and write</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Namespace</mat-label><input matInput [(ngModel)]="config.namespace"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Output key</mat-label><input matInput [(ngModel)]="config.output_key" placeholder="memory_refs"></mat-form-field>
          <mat-form-field class="half"><mat-label>Top K</mat-label><input matInput type="number" [(ngModel)]="config.top_k"></mat-form-field>
          <mat-form-field class="half"><mat-label>Similarity threshold</mat-label><input matInput type="number" step="0.01" [(ngModel)]="config.similarity_threshold"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Query mapping</mat-label><input matInput [(ngModel)]="config.query_mapping"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Fields to store</mat-label><input matInput [(ngModel)]="config.fields_to_store"></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'MEMORY_READ'">
          <mat-form-field class="full-width"><mat-label>Memory config</mat-label><mat-select [(ngModel)]="config.memory_config_id" (selectionChange)="onMemorySelected()"><mat-option value="">Manual</mat-option><mat-option *ngFor="let m of memoryConfigs" [value]="m.id">{{memoryLabel(m)}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Namespace</mat-label><input matInput [(ngModel)]="config.namespace"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Output key</mat-label><input matInput [(ngModel)]="config.output_key" placeholder="memory_refs"></mat-form-field>
          <mat-form-field class="half"><mat-label>Top K</mat-label><input matInput type="number" [(ngModel)]="config.top_k"></mat-form-field>
          <mat-form-field class="half"><mat-label>Similarity threshold</mat-label><input matInput type="number" step="0.01" [(ngModel)]="config.similarity_threshold"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Query mapping</mat-label><input matInput [(ngModel)]="config.query_mapping"></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'MEMORY_WRITE'">
          <mat-form-field class="full-width"><mat-label>Memory config</mat-label><mat-select [(ngModel)]="config.memory_config_id" (selectionChange)="onMemorySelected()"><mat-option value="">Manual</mat-option><mat-option *ngFor="let m of memoryConfigs" [value]="m.id">{{memoryLabel(m)}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Namespace</mat-label><input matInput [(ngModel)]="config.namespace"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Fields to store</mat-label><input matInput [(ngModel)]="config.fields_to_store"></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'RAG_QUERY'">
          <mat-form-field class="full-width"><mat-label>Collection</mat-label><mat-select [(ngModel)]="config.collection"><mat-option value="default">default</mat-option><mat-option *ngFor="let c of collections" [value]="c.name">{{c.name}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Query mapping</mat-label><input matInput [(ngModel)]="config.query_mapping"></mat-form-field>
          <mat-form-field class="half"><mat-label>Top K</mat-label><input matInput type="number" [(ngModel)]="config.top_k"></mat-form-field>
          <mat-form-field class="half"><mat-label>Rerank</mat-label><mat-select [(ngModel)]="config.rerank"><mat-option [value]="false">false</mat-option><mat-option [value]="true">true</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Route keywords</mat-label><input matInput [(ngModel)]="config.route_keywords" placeholder="policy, docs, knowledge"></mat-form-field>
          <mat-form-field class="half"><mat-label>Auto route before LLM</mat-label><mat-select [(ngModel)]="config.auto_route"><mat-option [value]="true">Yes</mat-option><mat-option [value]="false">No</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Synthesize answer</mat-label><mat-select [(ngModel)]="config.synthesize_answer"><mat-option [value]="false">Auto when ending</mat-option><mat-option [value]="true">Always</mat-option></mat-select></mat-form-field>
          <mat-form-field class="half"><mat-label>Min route score</mat-label><input matInput type="number" [(ngModel)]="config.min_route_score"></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'PROMPT_TEMPLATE'">
          <mat-form-field class="full-width"><mat-label>Prompt template</mat-label><mat-select [(ngModel)]="config.template_id"><mat-option value="">Select template</mat-option><mat-option *ngFor="let p of prompts" [value]="p.id">{{p.name}}</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Variables JSON</mat-label><textarea rows="8" matInput [(ngModel)]="config.variables_json"></textarea></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'HUMAN_INTERACTION'">
          <mat-form-field class="full-width"><mat-label>Title</mat-label><input matInput [(ngModel)]="config.title"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Message</mat-label><textarea rows="4" matInput [(ngModel)]="config.message"></textarea></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Task type</mat-label><mat-select [(ngModel)]="config.approval_type"><mat-option value="form">Form</mat-option><mat-option value="approve_reject">Approve / Reject</mat-option><mat-option value="text_input">Text Input</mat-option><mat-option value="choice">Choice</mat-option></mat-select></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Output key</mat-label><input matInput [(ngModel)]="config.output_key" placeholder="human_response"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Details mapping JSON</mat-label><textarea rows="7" matInput [(ngModel)]="config.details_mapping"></textarea></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Form schema JSON</mat-label><textarea rows="9" matInput [(ngModel)]="config.form_schema"></textarea></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Timeout seconds</mat-label><input matInput type="number" [(ngModel)]="config.timeout_s"></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'WEBHOOK_TRIGGER'">
          <mat-form-field class="full-width"><mat-label>Webhook path</mat-label><input matInput [(ngModel)]="config.path" readonly></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Sample payload JSON</mat-label><textarea rows="6" matInput [(ngModel)]="config.sample_payload"></textarea></mat-form-field>
          <p class="hint">POST to /api/runtime/webhooks/{{node.id}} is represented here; use the agent ID in the real URL.</p>
        </ng-container>
        <ng-container *ngSwitchCase="'WAIT'">
          <mat-form-field class="full-width"><mat-label>Seconds</mat-label><input matInput type="number" [(ngModel)]="config.seconds"></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'TRANSFORM'">
          <mat-form-field class="full-width"><mat-label>Output key</mat-label><input matInput [(ngModel)]="config.output_key"></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Mapping JSON</mat-label><textarea rows="8" matInput [(ngModel)]="config.mapping"></textarea></mat-form-field>
        </ng-container>
        <ng-container *ngSwitchCase="'RETRY_CATCH'">
          <mat-form-field class="half"><mat-label>Retry count</mat-label><input matInput type="number" [(ngModel)]="config.retry_count"></mat-form-field>
          <mat-form-field class="half"><mat-label>Catch route label</mat-label><input matInput [(ngModel)]="config.catch_route"></mat-form-field>
          <p class="hint">Stores retry/catch policy for downstream execution. Dedicated error-edge execution can be expanded from this node.</p>
        </ng-container>
      </ng-container>
      </section>
      <div class="actions"><button mat-raised-button color="primary" (click)="apply()"><mat-icon>check</mat-icon> Apply</button><button mat-button color="warn" (click)="remove.emit(node.id)"><mat-icon>delete</mat-icon> Delete</button></div>
      <details class="advanced-json"><summary>Advanced raw JSON</summary><ngx-monaco-editor style="height:230px;display:block" [options]="editorOptions" [(ngModel)]="json"></ngx-monaco-editor><button mat-button (click)="applyJson()">Apply Raw JSON</button></details>
    </ng-container>
    <ng-template #none>
      <div class="empty-state">
        <mat-icon>ads_click</mat-icon>
        <h3>Select a node</h3>
        <p>Click any canvas node to edit its label, routing behavior, model, memory, RAG, or tool settings here.</p>
      </div>
    </ng-template>
  </mat-card>`,
  styles: [`.panel{background:#fff;max-height:calc(100vh - 190px);overflow:auto;padding:0}.node-hero{align-items:flex-start;background:linear-gradient(180deg,#f8fafc,#fff);border-bottom:1px solid #e5e7eb;display:flex;gap:12px;padding:14px}.node-icon{align-items:center;background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;color:#3730a3;display:flex;height:42px;justify-content:center;width:42px}.node-heading{min-width:0}.eyebrow{color:#64748b;font-size:11px;font-weight:800;text-transform:uppercase}.node-heading h3{color:#0f172a;font-size:18px;line-height:1.2;margin:2px 0 4px;word-break:break-word}.node-heading p{color:#64748b;font-size:12px;line-height:1.45;margin:0}.quick-summary{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px 0}.form-section{border-top:1px solid #eef2f7;margin-top:12px;padding:14px 14px 0}.section-title{margin-bottom:10px}.section-title span{color:#0f172a;display:block;font-weight:800}.section-title small{color:#64748b;display:block;font-size:12px;margin-top:2px}.full-width{width:100%}.half{width:calc(50% - 6px);margin-right:6px}.type-badge,.summary-chip{align-items:center;border-radius:999px;display:inline-flex;font-size:11px;font-weight:800;line-height:1;padding:6px 9px}.type-badge{background:#eef2ff;color:#3730a3}.summary-chip{background:#f1f5f9;color:#334155}.actions,.mini-actions,.condition-examples{display:flex;gap:8px;margin:10px 14px 16px}.actions{border-top:1px solid #eef2f7;justify-content:space-between;padding-top:14px}.actions button{align-items:center;display:inline-flex;gap:6px}.condition-examples{flex-wrap:wrap;margin-top:-8px}.mini-actions{align-items:center;margin:-8px 0 6px}.hint,.muted{color:#64748b;font-size:12px}.router-preview{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;font-size:11px;max-height:180px;overflow:auto;padding:8px;white-space:pre-wrap}.advanced-json{border-top:1px solid #eef2f7;margin:0;padding:0 14px 14px}summary{cursor:pointer;color:#4f46e5;font-weight:700;padding:12px 0}.schema-preview{border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin:8px 0 12px}.schema-preview h4{margin:10px 0 4px;font-size:12px}.schema-preview pre{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;max-height:180px;overflow:auto;padding:8px;font-size:11px;white-space:pre-wrap}.empty-state{align-items:center;color:#64748b;display:flex;flex-direction:column;min-height:260px;justify-content:center;padding:24px;text-align:center}.empty-state mat-icon{background:#eef2ff;border-radius:999px;color:#4f46e5;height:52px;font-size:28px;margin-bottom:12px;padding:12px;width:52px}.empty-state h3{color:#0f172a;margin:0 0 6px}.empty-state p{line-height:1.5;margin:0;max-width:270px}`]
})
export class ConfigPanelComponent implements OnChanges, OnInit {
  @Input() node: CanvasNode | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() remove = new EventEmitter<string>();
  json = '{}'; label = ''; config: any = {};
  providers:any[]=[]; models:any[]=[]; aliases:any[]=[]; tools:any[]=[]; mcpServers:any[]=[]; mcpToolOptions:any[]=[]; prompts:any[]=[]; collections:any[]=[]; memoryConfigs:any[]=[]; agents:any[]=[];
  routerStrategies = ['balanced','cost_aware','complexity','latency','quality','knn','svm','mlp','matrix_factorization','elo','graph','bert','hybrid_probabilistic','transformed_score','multi_round','bandit','semantic','fallback_chain'];
  routerPreview:any;
  editorOptions = { theme: 'vs-light', language: 'json', automaticLayout: true };
  constructor(private api: ApiService) {}
  ngOnInit(){ this.loadOptions(); }
  loadOptions(){ this.api.llmProviders().subscribe(x=>this.providers=x||[]); this.api.llmModels().subscribe(x=>this.models=x||[]); this.api.llmAliases().subscribe(x=>this.aliases=x||[]); this.api.llmRouterStrategies().subscribe({next:x=>this.routerStrategies=x?.strategies||this.routerStrategies,error:_=>{}}); this.api.tools().subscribe(x=>this.tools=x||[]); this.api.mcpServers().subscribe(x=>this.mcpServers=x||[]); this.api.prompts().subscribe(x=>this.prompts=x||[]); this.api.ragCollections().subscribe(x=>this.collections=x||[]); this.api.memoryConfigs().subscribe(x=>this.memoryConfigs=x||[]); this.api.agents().subscribe(x=>this.agents=x||[]); }
  ngOnChanges(){
    this.label=this.node?.label||'';
    this.config=JSON.parse(JSON.stringify(this.node?.config||{}));
    if (this.node?.type === 'LLM') this.normalizeLlmConfig();
    if (this.node?.type === 'TOOL_EXECUTOR' || this.node?.type === 'TOOLS') this.normalizeToolConfig();
    if (this.node?.type === 'CONDITION') this.normalizeConditionConfig();
    if (this.node?.type === 'TOOLS' && this.config.source === 'MCP' && this.config.mcp_server_id) this.loadMcpToolOptions(this.config.mcp_server_id);
    this.json=JSON.stringify(this.config,null,2);
  }
  apply(){ this.save.emit({ id: this.node!.id, label: this.label, config: this.config }); this.json=JSON.stringify(this.config,null,2); }
  applyJson(){ try{ this.config=JSON.parse(this.json||'{}'); this.save.emit({ id:this.node!.id,label:this.label,config:this.config }); } catch(e){ alert('Invalid JSON config'); } }
  filteredModels(){ return this.config.provider ? this.models.filter(m=>m.provider===this.config.provider) : this.models; }
  onProviderChange(){ if(this.config.model && !this.filteredModels().some(m=>m.model===this.config.model)) this.config.model=''; if(this.config.provider || this.config.model) this.config.model_alias=''; }
  onAliasChange(){ if(this.config.model_alias){ this.config.provider=''; this.config.model=''; } }
  routerStrategyLabel(value:string){ return String(value||'').replace(/_/g, ' ').replace(/\b\w/g, c=>c.toUpperCase()); }
  previewRouter(){
    this.api.previewLlmRouter({ messages:[{role:'user',content:this.config.user_prompt || 'Analyze this request and choose an LLM.'}], config:this.config }).subscribe({
      next: res => this.routerPreview = res,
      error: err => this.routerPreview = { status:'FAILED', message:err?.message || 'Router preview failed' }
    });
  }
  toolLabel(t:any){ return `${t.type} / ${t.name}${t.mcpToolName ? ' / ' + t.mcpToolName : ''}`; }
  memoryLabel(m:any){ return `${m.name || m.namespace} / ${m.tier || 'both'} / ${m.backend || 'IN_MEMORY'}`; }
  selectedToolSummary(){
    const ids = this.selectedToolIds();
    if (!ids.length) return 'No tools selected.';
    return `${ids.length} tool${ids.length === 1 ? '' : 's'} selected. Runtime will execute only the most relevant match unless Execute all selected is Yes.`;
  }
  onToolsSelected(){
    const ids = this.selectedToolIds();
    this.config.tool_ids = ids;
    this.config.tool_id = ids[0] || '';
    const selectedTypes = Array.from(new Set(ids.map(id => this.tools.find(t => t.id === id)?.type).filter(Boolean)));
    if (selectedTypes.length === 1) this.config.tool_type = selectedTypes[0];
    else if (selectedTypes.length > 1) this.config.tool_type = 'MIXED';
  }
  onToolsNodeSelected(){ this.onToolsSelected(); }
  onToolSourceChange(){
    this.config.tool_ids = [];
    this.config.tool_id = '';
    this.config.tool_type = this.config.source === 'MCP' ? 'MCP' : 'HTTP';
    if (this.config.source !== 'MCP') {
      this.config.mcp_server_id = '';
      this.mcpToolOptions = [];
    }
  }
  onMcpServerChange(){
    this.config.tool_ids = [];
    this.config.tool_id = '';
    this.loadMcpToolOptions(this.config.mcp_server_id);
  }
  httpTools(){ return this.tools.filter(t => String(t.type || '').toUpperCase() === 'HTTP' && !this.isOpenApiTool(t)); }
  openApiTools(){ return this.tools.filter(t => String(t.type || '').toUpperCase() === 'HTTP' && this.isOpenApiTool(t)); }
  nonMcpToolsForSource(){ return this.config.source === 'OPENAPI' ? this.openApiTools() : this.httpTools(); }
  visibleTools(){ return this.config.source === 'MCP' ? this.mcpToolOptions : this.nonMcpToolsForSource(); }
  selectedToolObjects(){ const ids = new Set(this.selectedToolIds()); return this.visibleTools().filter(t => ids.has(t.id)); }
  schemaText(value:any){ return JSON.stringify(value || {}, null, 2); }
  setConditionExample(expression: string){ this.config.route_mode = 'expression'; this.config.expression = expression; }
  nodeIcon(type: string){
    const icons: Record<string, string> = {
      START: 'play_circle',
      END: 'flag',
      LLM: 'psychology',
      TOOLS: 'build',
      TOOL_EXECUTOR: 'build',
      RAG_QUERY: 'travel_explore',
      MEMORY: 'database',
      MEMORY_READ: 'database',
      MEMORY_WRITE: 'database',
      CONDITION: 'alt_route',
      HUMAN_INTERACTION: 'person',
      PROMPT_TEMPLATE: 'article',
      AGENT_CALL: 'hub',
      AGENT_ROUTER: 'account_tree',
      WEBHOOK_TRIGGER: 'webhook',
      WAIT: 'schedule',
      TRANSFORM: 'transform',
      RETRY_CATCH: 'restart_alt'
    };
    return icons[type] || 'settings';
  }
  nodeHelp(type: string){
    const help: Record<string, string> = {
      START: 'Defines how an execution enters the graph.',
      END: 'Maps final state into the response returned to the user.',
      LLM: 'Acts as the reasoning/orchestration node and can use attached memory, knowledge, and tools.',
      TOOLS: 'Select HTTP or MCP tools that the orchestrator can call when relevant.',
      TOOL_EXECUTOR: 'Executes selected tools directly in a flow.',
      RAG_QUERY: 'Connects a knowledge collection so the agent can answer from documents.',
      MEMORY: 'Reads or writes short-term and long-term user/session memory.',
      CONDITION: 'Routes execution based on state values or expressions.',
      HUMAN_INTERACTION: 'Pauses execution and waits for user approval or input.',
      PROMPT_TEMPLATE: 'Renders a managed prompt template into the graph state.',
      AGENT_CALL: 'Invokes another agent as a specialist worker.',
      AGENT_ROUTER: 'Chooses one or more specialist agents dynamically.',
      WEBHOOK_TRIGGER: 'Starts the graph from an external webhook request.',
      WAIT: 'Pauses the graph for a configured duration.',
      TRANSFORM: 'Maps or reshapes state before the next node.',
      RETRY_CATCH: 'Stores retry and catch policy for resilient execution.'
    };
    return help[type] || 'Configure this node for the selected workflow step.';
  }
  configHelp(type: string){
    if (type === 'LLM') return 'Choose model routing and how this node should use resources.';
    if (type === 'TOOLS' || type === 'TOOL_EXECUTOR') return 'Pick callable tools and tune routing behavior.';
    if (type === 'RAG_QUERY') return 'Choose the collection and retrieval behavior.';
    if (type.includes('MEMORY')) return 'Configure namespace, lookup, and write behavior.';
    if (type === 'CONDITION') return 'Define route logic and matching edge labels.';
    return 'Fill the fields needed by this node type.';
  }
  selectAllVisibleTools(){ this.config.tool_ids = this.visibleTools().map(t => t.id).filter(Boolean); this.onToolsSelected(); }
  selectAllTools(){ this.config.tool_ids = this.tools.map(t => t.id).filter(Boolean); this.onToolsSelected(); }
  clearSelectedTools(){ this.config.tool_ids = []; this.onToolsSelected(); }
  onMemorySelected(){ const m=this.memoryConfigs.find(x=>x.id===this.config.memory_config_id); if(m){ this.config.namespace=m.namespace; this.config.memory_namespace=m.namespace; this.config.memory_tier=m.tier; this.config.memory_backend=m.backend || 'IN_MEMORY'; } }
  private normalizeLlmConfig(){
    if (this.config.orchestrate === undefined) this.config.orchestrate = true;
    if (this.config.use_tools === undefined) this.config.use_tools = true;
    if (this.config.use_rag === undefined) this.config.use_rag = true;
    if (this.config.always_use_rag === undefined) this.config.always_use_rag = false;
    if (this.config.write_memory === undefined) this.config.write_memory = true;
    if (!this.config.memory_top_k) this.config.memory_top_k = 5;
    if (this.config.namespace && !this.config.memory_namespace) this.config.memory_namespace = this.config.namespace;
  }
  private normalizeToolConfig(){
    if (!this.config.source) this.config.source = String(this.config.tool_type || '').toUpperCase() === 'HTTP' ? 'HTTP' : 'MCP';
    const existing = Array.isArray(this.config.tool_ids) ? this.config.tool_ids : [];
    const legacy = this.config.tool_id ? [this.config.tool_id] : [];
    this.config.tool_ids = Array.from(new Set([...existing, ...legacy].filter(Boolean)));
    this.config.tool_id = this.config.tool_ids[0] || '';
    this.config.tool_type = this.config.source === 'MCP' ? 'MCP' : (this.config.tool_type || 'HTTP');
    if (!this.config.max_tools) this.config.max_tools = 1;
    if (!this.config.min_tool_score) this.config.min_tool_score = 3;
    if (this.config.llm_planner === undefined) this.config.llm_planner = false;
    if (this.config.execute_all === undefined) this.config.execute_all = false;
  }
  private normalizeConditionConfig(){
    if (!this.config.route_mode) this.config.route_mode = this.config.expression ? 'expression' : 'decision_key';
    if (!this.config.decision_key) this.config.decision_key = 'message';
    if (!this.config.default_route) this.config.default_route = 'false';
  }
  private loadMcpToolOptions(serverId: string){
    if (!serverId) { this.mcpToolOptions = []; return; }
    this.api.mcpTools(serverId).subscribe(x => this.mcpToolOptions = x || []);
  }
  private selectedToolIds(): string[] { return Array.isArray(this.config.tool_ids) ? this.config.tool_ids.filter(Boolean) : []; }
  private isOpenApiTool(t: any): boolean {
    const cfg = t?.httpConfig || t?.http_config || {};
    return String(cfg.source || '').toLowerCase() === 'openapi'
      || !!cfg.openapi_group
      || !!cfg.openapi_operation_key
      || !!cfg.openapi_path;
  }
}
