import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-tools',
  template: `
  <div class="page">
    <div class="top">
      <div>
        <h2>Tools</h2>
        <p class="muted">Connect APIs and MCP tools that agents can use. Import, review, test, then attach them to an agent.</p>
      </div>
      <div class="actions"><button mat-raised-button color="primary" (click)="openImportWizard()"><mat-icon>upload_file</mat-icon>Import</button><button mat-stroked-button color="primary" (click)="createHttpTool()"><mat-icon>add</mat-icon>New HTTP tool</button><button mat-stroked-button (click)="openRequestTool()"><mat-icon>route</mat-icon>Paste request</button><button mat-stroked-button (click)="createMcpServer()"><mat-icon>hub</mat-icon>Add MCP server</button><button mat-button (click)="load()">Refresh</button></div>
    </div>
    <div class="next-steps">
      <div class="next-step"><mat-icon>upload_file</mat-icon><div><strong>Import or create</strong><span>Start from OpenAPI, Postman, MCP, or a single captured request.</span></div></div>
      <div class="next-step"><mat-icon>lock</mat-icon><div><strong>Set auth once</strong><span>Save auth at creation time so agents do not need users to repeat it.</span></div></div>
      <div class="next-step"><mat-icon>play_circle</mat-icon><div><strong>Test before use</strong><span>Run each tool with sample input before adding it to an agent.</span></div></div>
    </div>

    <mat-card class="tool-tabs">
      <button mat-button [class.active]="toolTab === 'http'" (click)="setToolTab('http')"><mat-icon>http</mat-icon>HTTP</button>
      <button mat-button [class.active]="toolTab === 'openapi'" (click)="setToolTab('openapi')"><mat-icon>schema</mat-icon>OpenAPI</button>
      <button mat-button [class.active]="toolTab === 'postman'" (click)="setToolTab('postman')"><mat-icon>folder_open</mat-icon>Postman</button>
      <button mat-button [class.active]="toolTab === 'mcp'" (click)="setToolTab('mcp')"><mat-icon>hub</mat-icon>MCP</button>
      <button mat-button [class.active]="toolTab === 'registry'" (click)="setToolTab('registry')"><mat-icon>inventory_2</mat-icon>Registry</button>
      <button mat-button [class.active]="toolTab === 'test'" (click)="setToolTab('test')"><mat-icon>play_circle</mat-icon>Test</button>
    </mat-card>

    <mat-card *ngIf="showImportWizard && (toolTab === 'openapi' || toolTab === 'postman' || toolTab === 'mcp')" class="wizard-card">
      <div class="wizard-head">
        <div>
          <h3>Import tools</h3>
          <p class="muted">Choose a source, set auth once, preview what will be created, select tools, then test.</p>
        </div>
        <button mat-button (click)="closeImportWizard()">Close</button>
      </div>
      <div class="wizard-sources">
        <button mat-stroked-button [class.active]="importSource === 'openapi'" (click)="setImportSource('openapi')"><mat-icon>schema</mat-icon>OpenAPI</button>
        <button mat-stroked-button [class.active]="importSource === 'postman'" (click)="setImportSource('postman')"><mat-icon>folder_open</mat-icon>Postman</button>
        <button mat-stroked-button [class.active]="importSource === 'mcp'" (click)="setImportSource('mcp')"><mat-icon>hub</mat-icon>MCP</button>
      </div>
      <div class="wizard-steps">
        <span class="step-chip" [class.done]="wizardSourceReady()">1 Source</span>
        <span class="step-chip" [class.done]="wizardAuthReady()">2 Auth</span>
        <span class="step-chip" [class.done]="wizardPreviewCount() > 0">3 Preview</span>
        <span class="step-chip" [class.done]="wizardSelectedCount() > 0">4 Select</span>
        <span class="step-chip" [class.done]="wizardSaved()">5 Save</span>
        <span class="step-chip" [class.done]="!!testResult">6 Test</span>
      </div>
      <div class="wizard-summary">
        <strong>{{wizardSourceLabel()}}</strong>
        <span>{{wizardPreviewCount()}} previewed</span>
        <span>{{wizardSelectedCount()}} selected</span>
        <span>{{wizardAuthLabel()}}</span>
        <mat-form-field appearance="outline" class="duplicate-policy">
          <mat-label>Duplicates</mat-label>
          <mat-select [(ngModel)]="duplicatePolicy">
            <mat-option value="skip">Skip duplicates</mat-option>
            <mat-option value="update">Update existing</mat-option>
            <mat-option value="rename">Rename new</mat-option>
            <mat-option value="import">Import anyway</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <div class="auth-profiles">
        <mat-form-field appearance="outline">
          <mat-label>Auth profile</mat-label>
          <mat-select [(ngModel)]="selectedAuthProfileId">
            <mat-option value="">No profile</mat-option>
            <mat-option *ngFor="let p of authProfiles" [value]="p.id">{{p.name}} / {{p.auth?.type || 'none'}}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-stroked-button (click)="applyAuthProfile()" [disabled]="!selectedAuthProfileId">Apply To Current Source</button>
        <button mat-stroked-button (click)="saveCurrentAuthProfile()">Save Current Auth</button>
      </div>
      <div class="import-report" *ngIf="importReport.length">
        <div class="report-row" *ngFor="let row of importReport" [class.warn]="row.status === 'warning'" [class.error]="row.status === 'error'" [class.ok]="row.status === 'ready'">
          <mat-icon>{{row.status === 'ready' ? 'check_circle' : row.status === 'warning' ? 'warning' : 'error'}}</mat-icon>
          <div><strong>{{row.title}}</strong><p>{{row.message}}</p></div>
        </div>
      </div>
    </mat-card>

    <div class="grid two" *ngIf="toolTab === 'http' || toolTab === 'mcp'">
      <mat-card *ngIf="showRequestToolForm">
        <h3>Create Tool From API Request</h3>
        <p class="muted">Paste a request captured from browser dev tools, Postman, or API logs. Save it, then run the test panel below.</p>
        <mat-form-field class="full-width"><mat-label>Tool name</mat-label><input matInput [(ngModel)]="requestTool.name"></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Description</mat-label><input matInput [(ngModel)]="requestTool.description"></mat-form-field>
        <div class="grid method-row">
          <mat-form-field><mat-label>Method</mat-label><mat-select [(ngModel)]="requestTool.method"><mat-option value="GET">GET</mat-option><mat-option value="POST">POST</mat-option><mat-option value="PUT">PUT</mat-option><mat-option value="PATCH">PATCH</mat-option><mat-option value="DELETE">DELETE</mat-option></mat-select></mat-form-field>
          <mat-form-field><mat-label>Group</mat-label><input matInput [(ngModel)]="requestTool.group" placeholder="Captured API"></mat-form-field>
        </div>
        <mat-form-field class="full-width"><mat-label>URL</mat-label><input matInput [(ngModel)]="requestTool.url" placeholder="https://service/api/resources/{{id}}"></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Headers JSON</mat-label><textarea matInput rows="4" [(ngModel)]="requestTool.headersText"></textarea></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Body JSON</mat-label><textarea matInput rows="5" [(ngModel)]="requestTool.bodyText" placeholder='{"id":"ITEM-001"}'></textarea></mat-form-field>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="createToolFromRequest()">Save And Prepare Test</button>
          <button mat-button (click)="showRequestToolForm=false">Close</button>
        </div>
      </mat-card>

      <mat-card *ngIf="showToolForm && toolTab === 'http'">
        <h3>{{tool.id ? 'Edit HTTP Tool' : 'Create HTTP Tool'}}</h3>
        <mat-form-field class="full-width"><mat-label>Name</mat-label><input matInput [(ngModel)]="tool.name"></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Description</mat-label><input matInput [(ngModel)]="tool.description"></mat-form-field>
        <div class="grid method-row">
          <mat-form-field><mat-label>Method</mat-label><mat-select [(ngModel)]="tool.method"><mat-option value="GET">GET</mat-option><mat-option value="POST">POST</mat-option><mat-option value="PUT">PUT</mat-option><mat-option value="DELETE">DELETE</mat-option></mat-select></mat-form-field>
          <mat-form-field><mat-label>Timeout ms</mat-label><input matInput type="number" [(ngModel)]="tool.timeoutMs"></mat-form-field>
        </div>
        <mat-form-field class="full-width"><mat-label>URL</mat-label><input matInput [(ngModel)]="tool.url" [placeholder]="toolUrlPlaceholder"></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Group</mat-label><input matInput [(ngModel)]="tool.group" placeholder="HTTP"></mat-form-field>
        <div class="grid method-row">
          <mat-form-field><mat-label>Auth Type</mat-label><mat-select [(ngModel)]="tool.authType"><mat-option value="none">none</mat-option><mat-option value="bearer">bearer token</mat-option><mat-option value="basic">basic</mat-option><mat-option value="api_key">api key</mat-option><mat-option value="custom_header">custom header</mat-option></mat-select></mat-form-field>
          <mat-form-field *ngIf="tool.authType === 'api_key'"><mat-label>API Key Location</mat-label><mat-select [(ngModel)]="tool.authLocation"><mat-option value="header">header</mat-option><mat-option value="query">query</mat-option></mat-select></mat-form-field>
        </div>
        <mat-form-field class="full-width" *ngIf="tool.authType === 'bearer'"><mat-label>Token or ENV ref</mat-label><input matInput [(ngModel)]="tool.authTokenRef" placeholder="MY_API_TOKEN or raw token"></mat-form-field>
        <div class="grid method-row" *ngIf="tool.authType === 'basic'">
          <mat-form-field><mat-label>Username or ENV ref</mat-label><input matInput [(ngModel)]="tool.authUsernameRef"></mat-form-field>
          <mat-form-field><mat-label>Password or ENV ref</mat-label><input matInput [(ngModel)]="tool.authPasswordRef"></mat-form-field>
        </div>
        <div class="grid method-row" *ngIf="tool.authType === 'api_key' || tool.authType === 'custom_header'">
          <mat-form-field><mat-label>{{tool.authType === 'api_key' && tool.authLocation === 'query' ? 'Query param name' : 'Header name'}}</mat-label><input matInput [(ngModel)]="tool.authName" [placeholder]="tool.authType === 'api_key' ? 'X-API-Key' : 'Authorization'"></mat-form-field>
          <mat-form-field><mat-label>Value or ENV ref</mat-label><input matInput [(ngModel)]="tool.authValueRef"></mat-form-field>
        </div>
        <details class="advanced-section">
          <summary>Advanced request and schema settings</summary>
          <mat-form-field class="full-width"><mat-label>Headers JSON</mat-label><textarea matInput rows="4" [(ngModel)]="tool.headersText"></textarea></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Fixed Arguments JSON</mat-label><textarea matInput rows="3" [(ngModel)]="tool.fixedArgumentsText" placeholder='{"pageable":"{\"page\":0,\"size\":10}"}'></textarea><mat-hint>Always merged into tool input before required-parameter checks.</mat-hint></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Input JSON Schema</mat-label><textarea matInput rows="5" [(ngModel)]="tool.inputSchemaText"></textarea></mat-form-field>
          <mat-form-field class="full-width"><mat-label>Output JSON Schema</mat-label><textarea matInput rows="5" [(ngModel)]="tool.outputSchemaText"></textarea></mat-form-field>
        </details>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="saveHttpTool()">Save HTTP Tool</button>
          <button mat-button (click)="clearTool()">Clear</button>
        </div>
      </mat-card>

      <mat-card *ngIf="showMcpForm && toolTab === 'mcp'">
        <h3>{{mcp.id ? 'Edit MCP Server' : 'Onboard MCP Server'}}</h3>
        <div class="mcp-progress" *ngIf="mcpStatusMessage || savingMcp || discoveringMcp">
          <mat-spinner *ngIf="savingMcp || discoveringMcp" diameter="22"></mat-spinner>
          <mat-icon *ngIf="!savingMcp && !discoveringMcp">{{mcpStatusIcon()}}</mat-icon>
          <div>
            <strong>{{mcpStatusTitle}}</strong>
            <p>{{mcpStatusMessage}}</p>
          </div>
        </div>
        <div class="mcp-checklist">
          <div [class.done]="!!mcp.id"><mat-icon>{{mcp.id ? 'check_circle' : 'radio_button_unchecked'}}</mat-icon><span>Server registered</span></div>
          <div [class.done]="mcpPreviewTools.length > 0"><mat-icon>{{mcpPreviewTools.length ? 'check_circle' : 'radio_button_unchecked'}}</mat-icon><span>Tools previewed</span></div>
          <div [class.done]="lastMcpSavedCount > 0"><mat-icon>{{lastMcpSavedCount ? 'check_circle' : 'radio_button_unchecked'}}</mat-icon><span>Tools saved</span></div>
        </div>
        <mat-form-field class="full-width"><mat-label>Name</mat-label><input matInput [(ngModel)]="mcp.name"></mat-form-field>
        <mat-form-field class="full-width"><mat-label>Endpoint</mat-label><input matInput [(ngModel)]="mcp.endpoint" [placeholder]="mcpEndpointPlaceholder"></mat-form-field>
        <div class="grid method-row">
          <mat-form-field><mat-label>Transport</mat-label><mat-select [(ngModel)]="mcp.transport"><mat-option value="sse">sse</mat-option><mat-option value="http">http</mat-option><mat-option value="stdio">stdio</mat-option></mat-select></mat-form-field>
          <mat-form-field><mat-label>Auth Type</mat-label><mat-select [(ngModel)]="mcp.authType"><mat-option value="none">none</mat-option><mat-option value="bearer">bearer</mat-option><mat-option value="basic">basic</mat-option></mat-select></mat-form-field>
        </div>
        <mat-form-field class="full-width"><mat-label>Secret Ref</mat-label><input matInput [(ngModel)]="mcp.secretRef"></mat-form-field>
        <details class="advanced-section">
          <summary>Advanced MCP config</summary>
          <mat-form-field class="full-width"><mat-label>Config JSON</mat-label><textarea matInput rows="5" [(ngModel)]="mcp.configText"></textarea></mat-form-field>
        </details>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="saveMcp()" [disabled]="savingMcp || discoveringMcp">Save MCP Server</button>
          <button mat-stroked-button color="primary" (click)="saveMcp(true)" [disabled]="savingMcp || discoveringMcp">Save And Discover</button>
          <button mat-button (click)="previewMcp(activeMcpId())" [disabled]="!activeMcpId() || savingMcp || discoveringMcp">Preview Tools</button>
          <button mat-button (click)="discover(activeMcpId())" [disabled]="!activeMcpId() || savingMcp || discoveringMcp">Discover & Save All</button>
          <button mat-button (click)="clearMcp()">Clear</button>
        </div>
        <div class="mcp-result" *ngIf="lastMcpResult">
          <div class="mcp-result-head">
            <strong>{{lastMcpResultTitle()}}</strong>
            <span>{{lastMcpResultCountLabel()}}</span>
          </div>
          <p *ngIf="lastMcpResult.error" class="error-text">{{lastMcpResult.error}}</p>
          <pre>{{redactedJson(lastMcpResult)}}</pre>
        </div>
      </mat-card>
    </div>

    <mat-card *ngIf="showOpenApiForm && toolTab === 'openapi'" class="import-card">
      <h3>OpenAPI Import Wizard</h3>
      <p class="muted">Step 1: provide the spec. Step 2: set auth. Step 3: preview operations and import all or selected tools.</p>
      <div class="grid method-row">
        <mat-form-field><mat-label>OpenAPI JSON URL</mat-label><input matInput [(ngModel)]="openApi.url" placeholder="https://service/openapi.json"></mat-form-field>
        <mat-form-field><mat-label>Override Server URL</mat-label><input matInput [(ngModel)]="openApi.serverUrl" placeholder="https://service/api"></mat-form-field>
      </div>
      <mat-form-field class="full-width"><mat-label>Imported Tool Group Name</mat-label><input matInput [(ngModel)]="openApi.group" placeholder="Business Service"></mat-form-field>
      <div class="grid method-row">
        <mat-form-field><mat-label>Auth Type</mat-label><mat-select [(ngModel)]="openApi.authType"><mat-option value="none">none</mat-option><mat-option value="bearer">bearer token</mat-option><mat-option value="basic">basic</mat-option><mat-option value="api_key">api key</mat-option><mat-option value="custom_header">custom header</mat-option></mat-select></mat-form-field>
        <mat-form-field *ngIf="openApi.authType === 'api_key'"><mat-label>API Key Location</mat-label><mat-select [(ngModel)]="openApi.authLocation"><mat-option value="header">header</mat-option><mat-option value="query">query</mat-option></mat-select></mat-form-field>
      </div>
      <mat-form-field class="full-width" *ngIf="openApi.authType === 'bearer'"><mat-label>Token or ENV ref</mat-label><input matInput [(ngModel)]="openApi.authTokenRef"></mat-form-field>
      <div class="grid method-row" *ngIf="openApi.authType === 'basic'">
        <mat-form-field><mat-label>Username or ENV ref</mat-label><input matInput [(ngModel)]="openApi.authUsernameRef"></mat-form-field>
        <mat-form-field><mat-label>Password or ENV ref</mat-label><input matInput [(ngModel)]="openApi.authPasswordRef"></mat-form-field>
      </div>
      <div class="grid method-row" *ngIf="openApi.authType === 'api_key' || openApi.authType === 'custom_header'">
        <mat-form-field><mat-label>{{openApi.authType === 'api_key' && openApi.authLocation === 'query' ? 'Query param name' : 'Header name'}}</mat-label><input matInput [(ngModel)]="openApi.authName"></mat-form-field>
        <mat-form-field><mat-label>Value or ENV ref</mat-label><input matInput [(ngModel)]="openApi.authValueRef"></mat-form-field>
      </div>
      <mat-form-field class="full-width"><mat-label>Or Paste OpenAPI JSON</mat-label><textarea matInput rows="8" [(ngModel)]="openApi.json"></textarea></mat-form-field>
      <details class="advanced-section" open>
        <summary>Import behavior</summary>
        <div class="grid method-row">
          <mat-form-field><mat-label>Duplicate handling</mat-label><mat-select [(ngModel)]="duplicatePolicy"><mat-option value="skip">Skip duplicates</mat-option><mat-option value="update">Update existing</mat-option><mat-option value="rename">Rename new</mat-option><mat-option value="import">Import anyway</mat-option></mat-select></mat-form-field>
          <mat-form-field><mat-label>Timeout ms</mat-label><input matInput type="number" [(ngModel)]="openApi.defaultTimeoutMs"></mat-form-field>
        </div>
        <mat-checkbox [(ngModel)]="openApi.allowPrivateNetwork">Allow private network URLs</mat-checkbox>
      </details>
      <div class="actions">
        <button mat-raised-button color="primary" (click)="importOpenApi()">Import Tools</button>
        <button mat-button (click)="previewOpenApi()">Preview</button>
        <button mat-button (click)="showOpenApiForm=false">Close</button>
      </div>
      <div class="selection-panel" *ngIf="openApiOperations.length">
        <div class="selection-head"><strong>{{openApi.group || 'OpenAPI'}} operations</strong><button mat-button (click)="toggleAllOpenApi(true)">Select All</button><button mat-button (click)="toggleAllOpenApi(false)">Clear</button></div>
        <label class="selection-row" *ngFor="let op of openApiOperations"><input type="checkbox" [(ngModel)]="selectedOpenApiOperations[op.key]"><span>{{op.method}} {{op.path}}</span><small>{{op.name}}</small></label>
      </div>
    </mat-card>

    <mat-card *ngIf="showPostmanForm && toolTab === 'postman'" class="import-card">
      <h3>Postman Import Wizard</h3>
      <p class="muted">Step 1: paste the collection. Step 2: choose collection auth or override auth. Step 3: preview requests and import all or selected tools.</p>
      <div class="grid method-row">
        <mat-form-field><mat-label>Collection name / Tool group</mat-label><input matInput [(ngModel)]="postman.group" placeholder="Payments API"></mat-form-field>
        <mat-form-field><mat-label>Base URL override</mat-label><input matInput [(ngModel)]="postman.baseUrl" placeholder="https://api.company.com"></mat-form-field>
      </div>
      <div class="grid method-row">
        <mat-form-field><mat-label>Auth Type</mat-label><mat-select [(ngModel)]="postman.authType"><mat-option value="collection">Use collection auth</mat-option><mat-option value="none">none</mat-option><mat-option value="bearer">bearer token</mat-option><mat-option value="basic">basic</mat-option><mat-option value="api_key">api key</mat-option><mat-option value="custom_header">custom header</mat-option></mat-select></mat-form-field>
        <mat-form-field *ngIf="postman.authType === 'api_key'"><mat-label>API Key Location</mat-label><mat-select [(ngModel)]="postman.authLocation"><mat-option value="header">header</mat-option><mat-option value="query">query</mat-option></mat-select></mat-form-field>
      </div>
      <mat-form-field class="full-width" *ngIf="postman.authType === 'bearer'"><mat-label>Token or ENV ref</mat-label><input matInput [(ngModel)]="postman.authTokenRef"></mat-form-field>
      <div class="grid method-row" *ngIf="postman.authType === 'basic'">
        <mat-form-field><mat-label>Username or ENV ref</mat-label><input matInput [(ngModel)]="postman.authUsernameRef"></mat-form-field>
        <mat-form-field><mat-label>Password or ENV ref</mat-label><input matInput [(ngModel)]="postman.authPasswordRef"></mat-form-field>
      </div>
      <div class="grid method-row" *ngIf="postman.authType === 'api_key' || postman.authType === 'custom_header'">
        <mat-form-field><mat-label>{{postman.authType === 'api_key' && postman.authLocation === 'query' ? 'Query param name' : 'Header name'}}</mat-label><input matInput [(ngModel)]="postman.authName"></mat-form-field>
        <mat-form-field><mat-label>Value or ENV ref</mat-label><input matInput [(ngModel)]="postman.authValueRef"></mat-form-field>
      </div>
      <mat-form-field class="full-width"><mat-label>Paste Postman Collection JSON</mat-label><textarea matInput rows="8" [(ngModel)]="postman.json"></textarea></mat-form-field>
      <details class="advanced-section" open>
        <summary>Collection import details</summary>
        <div class="grid method-row">
          <mat-form-field><mat-label>Duplicate handling</mat-label><mat-select [(ngModel)]="duplicatePolicy"><mat-option value="skip">Skip duplicates</mat-option><mat-option value="update">Update existing</mat-option><mat-option value="rename">Rename new</mat-option><mat-option value="import">Import anyway</mat-option></mat-select></mat-form-field>
          <mat-form-field><mat-label>Timeout ms</mat-label><input matInput type="number" [(ngModel)]="postman.defaultTimeoutMs"></mat-form-field>
        </div>
        <mat-checkbox [(ngModel)]="postman.useCollectionVariables">Use collection variables</mat-checkbox>
        <mat-checkbox [(ngModel)]="postman.allowPrivateNetwork">Allow private network URLs</mat-checkbox>
      </details>
      <div class="actions">
        <button mat-raised-button color="primary" (click)="importPostman()">Import Selected</button>
        <button mat-button (click)="previewPostman()">Preview</button>
        <button mat-button (click)="showPostmanForm=false">Close</button>
      </div>
      <div class="selection-panel" *ngIf="postmanRequests.length">
        <div class="selection-head"><strong>{{postman.group || 'Postman'}} requests</strong><button mat-button (click)="toggleAllPostman(true)">Select All</button><button mat-button (click)="toggleAllPostman(false)">Clear</button></div>
        <label class="selection-row" *ngFor="let req of postmanRequests"><input type="checkbox" [(ngModel)]="selectedPostmanRequests[req.key]"><span>{{req.method}} {{req.path}}</span><small>{{req.name}}</small></label>
      </div>
    </mat-card>

    <mat-card class="registry" *ngIf="toolTab === 'registry'">
      <div class="registry-head">
        <div>
          <h3>Tools</h3>
          <p class="muted">All executable tools in one place, grouped as HTTP, OpenAPI, or MCP.</p>
        </div>
        <div class="server-actions">
          <button mat-button color="warn" (click)="deleteSelectedTools()" [disabled]="selectedToolCount() === 0">Delete Selected</button>
          <mat-form-field>
            <mat-label>MCP Server</mat-label>
            <mat-select [(ngModel)]="selectedMcpServerId" (selectionChange)="onMcpServerSelected($event.value)">
              <mat-option value="">Select MCP server</mat-option>
              <mat-option *ngFor="let s of mcpServers" [value]="s.id">{{s.name}}</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-button (click)="editSelectedMcp()" [disabled]="!selectedMcpServerId">Edit Server</button>
          <button mat-button (click)="previewMcp(selectedMcpServerId)" [disabled]="!selectedMcpServerId">Preview</button>
          <button mat-button (click)="discover(selectedMcpServerId)" [disabled]="!selectedMcpServerId">Discover</button>
          <button mat-button color="warn" (click)="deleteSelectedMcp()" [disabled]="!selectedMcpServerId">Delete Server</button>
        </div>
      </div>
      <div class="selected-mcp-panel" *ngIf="selectedMcpServerId">
        <div class="selected-mcp-head">
          <div>
            <strong>{{selectedMcpServer()?.name || 'Selected MCP server'}}</strong>
            <p class="muted">{{selectedMcpServer()?.endpoint || 'No endpoint configured'}}</p>
          </div>
          <span class="group-pill">MCP</span>
          <span class="muted" *ngIf="loadingMcpTools">Loading tools...</span>
          <span class="muted" *ngIf="!loadingMcpTools">{{selectedMcpTools.length}} registered tools</span>
        </div>
        <div class="empty-state compact" *ngIf="!loadingMcpTools && selectedMcpTools.length === 0">
          <div>
            <strong>No tools registered for this MCP server</strong>
            <p>Use Preview to inspect remote tools, then Save Selected or Discover to register them.</p>
            <button mat-raised-button color="primary" (click)="previewMcp(selectedMcpServerId)">Preview Tools</button>
          </div>
        </div>
        <table class="group-table" *ngIf="selectedMcpTools.length">
          <thead><tr><th></th><th>MCP Tool</th><th>Server</th><th>Description</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let t of selectedMcpTools">
              <td><input type="checkbox" [checked]="selectedTools[t.id]" (change)="toggleToolSelection(t.id, $event)"></td>
              <td><strong>{{toolDisplayName(t)}}</strong><div class="endpoint">{{t.mcpToolName || t.name}}</div></td>
              <td>{{selectedMcpServer()?.name || 'MCP'}}</td>
              <td class="description-cell">{{t.description || 'No description available.'}}</td>
              <td><div class="actions"><button mat-button (click)="inspectTool(t)">Inspect</button><button mat-button (click)="selectTool(t)">Test</button><button mat-button color="warn" (click)="deleteTool(t)">Delete</button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="selection-panel" *ngIf="mcpPreviewTools.length">
        <div class="selection-head"><strong>MCP discovered tools</strong><span class="muted">{{mcpPreviewSelectedCount()}} of {{mcpPreviewTools.length}} selected</span><button mat-button (click)="toggleAllMcpPreview(true)">Select All</button><button mat-button (click)="toggleAllMcpPreview(false)">Clear</button><button mat-raised-button color="primary" (click)="saveSelectedMcpTools()" [disabled]="discoveringMcp || mcpPreviewSelectedCount() === 0">Save Selected</button></div>
        <label class="selection-row" *ngFor="let t of mcpPreviewTools"><input type="checkbox" [checked]="isMcpPreviewSelected(t)" (change)="toggleMcpPreviewTool(t, $event)"><span>{{mcpPreviewToolName(t)}}</span><small>{{t.description || t.title || ''}}</small></label>
      </div>

      <div class="tool-groups">
        <div class="empty-state" *ngIf="tools.length === 0">
          <div>
            <strong>No tools yet</strong>
            <p>Import tools from OpenAPI/Postman/MCP or create one HTTP tool manually.</p>
            <button mat-raised-button color="primary" (click)="openImportWizard()">Import Tools</button>
          </div>
        </div>
        <section class="tool-group" *ngFor="let group of groupedTools()">
          <div class="tool-group-head">
            <button mat-button (click)="toggleToolGroup(group.key)"><mat-icon>{{expandedToolGroups[group.key] === false ? 'chevron_right' : 'expand_more'}}</mat-icon>{{group.name}}</button>
            <span class="group-pill">{{group.kind}}</span>
            <span class="muted">{{group.tools.length}} tools</span>
            <span class="spacer"></span>
            <input type="checkbox" [checked]="groupSelected(group)" (change)="toggleToolGroupSelection(group, $event)">
          </div>
          <table class="group-table" *ngIf="expandedToolGroups[group.key] !== false">
            <thead><tr><th></th><th>Name</th><th>Type</th><th>Description</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let t of group.tools">
                <td><input type="checkbox" [checked]="selectedTools[t.id]" (change)="toggleToolSelection(t.id, $event)"></td>
                <td><strong>{{toolDisplayName(t)}}</strong><div class="endpoint" *ngIf="toolEndpointLabel(t)">{{toolEndpointLabel(t)}}</div></td>
                <td>{{toolKindLabel(t)}}</td>
                <td class="description-cell">{{t.description || 'No description available.'}}</td>
                <td><div class="actions"><button mat-button (click)="inspectTool(t)">Inspect</button><button mat-button *ngIf="t.type !== 'MCP'" (click)="editTool(t)">Edit</button><button mat-button (click)="selectTool(t)">Test</button><button mat-button color="warn" (click)="deleteTool(t)">Delete</button></div></td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
      <mat-paginator [length]="toolTotal" [pageIndex]="toolPage.pageIndex" [pageSize]="toolPage.pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onToolPage($event)"></mat-paginator>
    </mat-card>

    <mat-card class="schema-card" *ngIf="inspectedTool && (toolTab === 'registry' || toolTab === 'test')">
      <div class="schema-head">
        <div>
          <h3>{{inspectedTool.name}}</h3>
          <p class="muted">{{inspectedTool.type}}<span *ngIf="inspectedTool.mcpToolName"> / {{inspectedTool.mcpToolName}}</span></p>
        </div>
        <div class="actions">
          <button mat-stroked-button color="primary" (click)="validateAndPublishTool(inspectedTool)">Validate & Publish</button>
          <button mat-button (click)="inspectedTool=null">Close</button>
        </div>
      </div>
      <div class="import-report" *ngIf="toolValidationReport.length">
        <div class="report-row" *ngFor="let row of toolValidationReport" [class.warn]="row.status === 'warning'" [class.error]="row.status === 'error'" [class.ok]="row.status === 'ready'">
          <mat-icon>{{row.status === 'ready' ? 'check_circle' : row.status === 'warning' ? 'warning' : 'error'}}</mat-icon>
          <div><strong>{{row.title}}</strong><p>{{row.message}}</p></div>
        </div>
      </div>
      <div class="import-report" *ngIf="toolQuality">
        <div class="report-row" [class.ok]="toolQuality.score >= 90" [class.warn]="toolQuality.score >= 70 && toolQuality.score < 90" [class.error]="toolQuality.score < 70">
          <mat-icon>{{toolQuality.score >= 70 ? 'verified' : 'warning'}}</mat-icon>
          <div><strong>Quality score {{toolQuality.score}} / {{toolQuality.status}}</strong><p>Contract quality, fixed args, parameter docs, and publish status.</p></div>
        </div>
        <div class="report-row" *ngFor="let row of toolQuality.checks" [class.ok]="row.ready" [class.warn]="!row.ready">
          <mat-icon>{{row.ready ? 'check_circle' : 'radio_button_unchecked'}}</mat-icon>
          <div><strong>{{row.label}}</strong><p>{{row.ready ? 'Ready' : row.action}}</p></div>
        </div>
      </div>
      <div class="mini-table" *ngIf="toolTestHistory.length">
        <div class="mini-row head"><span>Recent Tool Test</span><span>Status</span></div>
        <div class="mini-row" *ngFor="let run of toolTestHistory"><span>{{run.createdAt | date:'short'}}<br><small>{{run.latencyMs || 0}} ms</small></span><span>{{run.status}}</span></div>
      </div>
      <p *ngIf="inspectedTool.description" class="description">{{inspectedTool.description}}</p>
      <div class="grid two schema-grid">
        <div>
          <h4>Fixed Arguments</h4>
          <pre>{{schemaText(inspectedTool.fixedArguments || inspectedTool.fixed_arguments || {})}}</pre>
        </div>
        <div>
          <h4>Input Schema</h4>
          <pre>{{schemaText(inspectedTool.inputSchema)}}</pre>
        </div>
        <div>
          <h4>Output Schema</h4>
          <pre>{{schemaText(inspectedTool.outputSchema)}}</pre>
        </div>
      </div>
    </mat-card>

    <mat-card class="test-card" *ngIf="toolTab === 'test'">
      <h3>Tool Test</h3>
      <mat-form-field class="full-width"><mat-label>Tool</mat-label><mat-select [(ngModel)]="selectedToolId"><mat-option *ngFor="let t of tools" [value]="t.id">{{toolOptionLabel(t)}}</mat-option></mat-select></mat-form-field>
      <mat-form-field class="full-width"><mat-label>Environment</mat-label><mat-select [(ngModel)]="selectedEnvironmentKey"><mat-option value="dev">dev</mat-option><mat-option *ngFor="let env of environments" [value]="env.environmentKey">{{env.environmentKey}}</mat-option></mat-select></mat-form-field>
      <mat-form-field class="full-width"><mat-label>Test Input JSON</mat-label><textarea matInput rows="4" [(ngModel)]="testInputText"></textarea></mat-form-field>
      <button mat-raised-button color="primary" (click)="testTool()">Run Test</button>
      <pre *ngIf="testResult">{{redactedJson(testResult)}}</pre>
    </mat-card>
  </div>`,
  styles: [`.top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.two{grid-template-columns:repeat(2,minmax(320px,1fr))}.method-row{grid-template-columns:1fr 1fr}.full-width,table{width:100%}.actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.tool-tabs{align-items:center;display:flex;gap:8px;justify-content:center;min-height:0;padding:10px}.tool-tabs button{display:inline-flex;align-items:center;gap:6px}.tool-tabs button.active{background:#eef2ff;color:#1d4ed8}.registry,.test-card,.schema-card,.import-card,.wizard-card{margin-top:16px}.wizard-head{align-items:flex-start;display:flex;justify-content:space-between;gap:16px}.wizard-head h3{margin-bottom:2px}.wizard-sources{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.wizard-sources button{display:inline-flex;align-items:center;gap:6px}.wizard-sources button.active{background:#eef2ff;border-color:#818cf8;color:#3730a3}.wizard-steps{display:flex;gap:8px;flex-wrap:wrap}.step-chip{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;color:#64748b;font-size:12px;font-weight:800;padding:6px 10px}.step-chip.done{background:#dcfce7;border-color:#86efac;color:#166534}.wizard-summary,.auth-profiles{align-items:center;border-top:1px solid #e5e7eb;display:flex;gap:14px;margin-top:12px;padding-top:10px;flex-wrap:wrap}.auth-profiles mat-form-field{width:260px}.duplicate-policy{width:190px}.mcp-progress{align-items:flex-start;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:grid;gap:10px;grid-template-columns:28px minmax(0,1fr);margin:8px 0 12px;padding:10px}.mcp-progress p{color:#64748b;margin:2px 0 0}.mcp-progress mat-icon{color:#2563eb}.mcp-checklist{display:grid;gap:8px;grid-template-columns:repeat(3,minmax(0,1fr));margin:8px 0 14px}.mcp-checklist div{align-items:center;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;color:#64748b;display:flex;gap:8px;padding:8px}.mcp-checklist .done{background:#f0fdf4;border-color:#bbf7d0;color:#166534}.mcp-checklist mat-icon{font-size:20px;height:20px;width:20px}.mcp-result{border:1px solid #e5e7eb;border-radius:8px;margin-top:12px;padding:10px}.mcp-result-head{align-items:center;display:flex;justify-content:space-between;gap:10px}.selected-mcp-panel{border:1px solid #dbeafe;border-radius:8px;margin:12px 0;padding:10px}.selected-mcp-head{align-items:flex-start;display:flex;gap:10px;justify-content:space-between;margin-bottom:8px}.selected-mcp-head p{margin:2px 0 0}.empty-state.compact{border:1px dashed #cbd5e1;border-radius:8px;margin-top:8px;padding:14px}.error-text{color:#dc2626;margin:8px 0}.import-report{border:1px solid #e5e7eb;border-radius:8px;display:grid;gap:0;margin-top:12px;overflow:hidden}.report-row{align-items:flex-start;border-top:1px solid #e5e7eb;display:grid;gap:10px;grid-template-columns:24px minmax(0,1fr);padding:10px}.report-row:first-child{border-top:0}.report-row p{color:#64748b;margin:2px 0 0}.report-row.ok mat-icon{color:#16a34a}.report-row.warn mat-icon{color:#ca8a04}.report-row.error mat-icon{color:#dc2626}.registry-head{align-items:flex-start;display:flex;gap:16px;justify-content:space-between;margin-bottom:10px}.registry-head h3{margin-bottom:2px}.server-actions{align-items:center;display:flex;gap:8px;justify-content:flex-end;min-width:420px}.server-actions mat-form-field{width:180px}.schema-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.schema-head h3{margin-bottom:2px}.schema-grid h4{margin:0 0 8px}.description{margin:4px 0 14px}.description-cell{color:#334155;max-width:420px}.muted{color:#64748b}.endpoint{color:#64748b;font-size:12px;margin-top:3px;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.group-pill{background:#eef2ff;border-radius:999px;color:#334155;display:inline-block;font-size:12px;font-weight:700;padding:4px 9px;white-space:nowrap}.spacer{flex:1}.tool-groups{display:flex;flex-direction:column;gap:10px}.tool-group{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.tool-group-head{align-items:center;background:#f8fafc;display:flex;gap:10px;padding:8px 10px}.tool-group-head button{display:inline-flex;align-items:center;font-weight:800}.group-table{border-collapse:collapse}.group-table th{background:#f1f5f9;color:#334155;font-size:12px;text-align:left}.group-table th,.group-table td{border-top:1px solid #e5e7eb;padding:10px;vertical-align:top}.selection-panel{border:1px solid #e5e7eb;border-radius:8px;margin-top:12px;padding:10px}.selection-head{align-items:center;display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}.selection-row{align-items:center;display:grid;gap:8px;grid-template-columns:auto 160px 1fr;padding:6px}.selection-row small{color:#64748b}.schema-grid{margin-top:10px}pre{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;max-height:280px;overflow:auto;padding:10px;white-space:pre-wrap}@media(max-width:900px){.top,.registry-head,.server-actions,.wizard-head{align-items:stretch;flex-direction:column}.tool-tabs{align-items:stretch;flex-direction:column}.mcp-checklist{grid-template-columns:1fr}.server-actions{min-width:0}.server-actions mat-form-field,.auth-profiles mat-form-field,.duplicate-policy{width:100%}.description-cell{max-width:260px}}`]
})
export class ToolsComponent implements OnInit {
  tools: any[] = [];
  mcpServers: any[] = [];
  environments: any[] = [];
  toolCols = ['select', 'name', 'type', 'group', 'description', 'actions'];
  tool: any = this.blankTool();
  mcp: any = this.blankMcp();
  showToolForm = false;
  showRequestToolForm = false;
  showMcpForm = false;
  showOpenApiForm = false;
  showPostmanForm = false;
  showImportWizard = false;
  toolTab: 'http' | 'openapi' | 'postman' | 'mcp' | 'registry' | 'test' = 'registry';
  importSource: 'openapi' | 'postman' | 'mcp' = 'openapi';
  lastImportedCount = 0;
  selectedToolId = '';
  inspectedTool: any = null;
  toolQuality: any = null;
  toolTestHistory: any[] = [];
  testInputText = '{"message":"hello"}';
  testResult: any;
  selectedEnvironmentKey = 'dev';
  selectedMcpServerId = '';
  selectedMcpTools: any[] = [];
  loadingMcpTools = false;
  selectedTools: Record<string, boolean> = {};
  pageSizeOptions = [10, 25, 50];
  toolPage = { pageIndex: 0, pageSize: 10 };
  toolTotal = 0;
  expandedServers: Record<string, boolean> = {};
  expandedToolSchemas: Record<string, boolean> = {};
  openApi = { url: '', serverUrl: '', json: '', group: '', authType: 'none', authLocation: 'header', authTokenRef: '', authUsernameRef: '', authPasswordRef: '', authName: '', authValueRef: '', defaultTimeoutMs: 30000, allowPrivateNetwork: false };
  openApiOperations: any[] = [];
  selectedOpenApiOperations: Record<string, boolean> = {};
  postman = { json: '', group: '', baseUrl: '', authType: 'collection', authLocation: 'header', authTokenRef: '', authUsernameRef: '', authPasswordRef: '', authName: '', authValueRef: '', defaultTimeoutMs: 30000, useCollectionVariables: true, allowPrivateNetwork: false };
  postmanRequests: any[] = [];
  selectedPostmanRequests: Record<string, boolean> = {};
  expandedToolGroups: Record<string, boolean> = {};
  mcpPreviewTools: any[] = [];
  selectedMcpPreviewTools: Record<string, boolean> = {};
  requestTool: any = this.blankRequestTool();
  authProfiles: any[] = [];
  selectedAuthProfileId = '';
  importReport: { status: string; title: string; message: string }[] = [];
  toolValidationReport: { status: string; title: string; message: string }[] = [];
  savingMcp = false;
  discoveringMcp = false;
  mcpStatusTitle = 'MCP setup';
  mcpStatusMessage = '';
  mcpStatusKind: 'ready' | 'warning' | 'error' | 'running' = 'warning';
  lastMcpResult: any = null;
  lastMcpSavedCount = 0;
  duplicatePolicy: 'skip' | 'update' | 'rename' | 'import' = 'skip';
  toolUrlPlaceholder = 'http://service/api/{{id}}';
  mcpEndpointPlaceholder = 'http://localhost:9000/mcp';

  constructor(private api: ApiService) {}
  ngOnInit() { this.authProfiles = this.loadAuthProfiles(); this.load(); }

  setToolTab(tab: 'http' | 'openapi' | 'postman' | 'mcp' | 'registry' | 'test') {
    this.toolTab = tab;
    if (tab === 'http') {
      this.showToolForm = true;
      this.showRequestToolForm = false;
      this.showMcpForm = false;
      this.showImportWizard = false;
      return;
    }
    if (tab === 'openapi') {
      this.openImportWizard('openapi');
      this.showToolForm = false;
      this.showRequestToolForm = false;
      this.showMcpForm = false;
      return;
    }
    if (tab === 'postman') {
      this.openImportWizard('postman');
      this.showToolForm = false;
      this.showRequestToolForm = false;
      this.showMcpForm = false;
      return;
    }
    if (tab === 'mcp') {
      this.openImportWizard('mcp');
      this.showToolForm = false;
      this.showRequestToolForm = false;
      if (!this.showMcpForm) this.showMcpForm = true;
      return;
    }
    if (tab === 'test') {
      this.showImportWizard = false;
      this.showToolForm = false;
      this.showRequestToolForm = false;
      this.showMcpForm = false;
      return;
    }
    this.showImportWizard = false;
    this.showToolForm = false;
    this.showRequestToolForm = false;
    this.showMcpForm = false;
  }

  createHttpTool() { this.toolTab = 'http'; this.clearTool(); this.showRequestToolForm = false; this.showToolForm = true; }
  openRequestTool() { this.toolTab = 'http'; this.requestTool = this.blankRequestTool(); this.showToolForm = false; this.showRequestToolForm = true; }
  createMcpServer() { this.toolTab = 'mcp'; this.clearMcp(); this.showMcpForm = true; this.setMcpStatus('warning', 'Register MCP server', 'Enter the endpoint, auth settings, then save the server before discovery.'); }
  openImportWizard(source: 'openapi' | 'postman' | 'mcp' = this.importSource) { this.toolTab = source; this.showImportWizard = true; this.setImportSource(source); }
  closeImportWizard() { this.showImportWizard = false; this.showOpenApiForm = false; this.showPostmanForm = false; }
  setImportSource(source: 'openapi' | 'postman' | 'mcp') {
    this.importSource = source;
    this.showOpenApiForm = source === 'openapi';
    this.showPostmanForm = source === 'postman';
    if (source === 'mcp' && !this.selectedMcpServerId) this.showMcpForm = true;
  }

  load() {
    this.api.toolsPage(this.toolPage.pageIndex, this.toolPage.pageSize).subscribe(x => {
      this.tools = x?.content || [];
      this.toolTotal = x?.totalElements || 0;
      const currentIds = new Set(this.tools.map(t => t.id));
      Object.keys(this.selectedTools).forEach(id => { if (!currentIds.has(id)) delete this.selectedTools[id]; });
      if (!this.selectedToolId && this.tools[0]) this.pickToolForTesting(this.tools[0]);
    });
    this.api.mcpServers().subscribe(x => {
      this.mcpServers = x || [];
      if (!this.selectedMcpServerId && this.mcpServers[0]) {
        this.selectedMcpServerId = this.mcpServers[0].id;
        this.loadSelectedMcpTools();
      } else if (this.selectedMcpServerId) {
        this.loadSelectedMcpTools();
      }
    });
    this.api.environments().subscribe({ next: x => this.environments = x || [], error: _ => this.environments = [] });
  }
  onToolPage(event: any) { this.toolPage = event; this.load(); }

  onMcpServerSelected(serverId: string) {
    this.selectedMcpServerId = serverId || '';
    this.mcpPreviewTools = [];
    this.selectedMcpPreviewTools = {};
    this.lastMcpResult = null;
    this.loadSelectedMcpTools();
  }

  loadSelectedMcpTools() {
    if (!this.selectedMcpServerId) {
      this.selectedMcpTools = [];
      return;
    }
    this.loadingMcpTools = true;
    this.api.mcpTools(this.selectedMcpServerId).subscribe({
      next: rows => {
        this.loadingMcpTools = false;
        this.selectedMcpTools = rows || [];
        const currentIds = new Set(this.selectedMcpTools.map(t => t.id));
        Object.keys(this.selectedTools).forEach(id => {
          const visibleInPage = this.tools.some(t => t.id === id);
          if (!visibleInPage && !currentIds.has(id)) delete this.selectedTools[id];
        });
      },
      error: err => {
        this.loadingMcpTools = false;
        this.selectedMcpTools = [];
        this.lastMcpResult = { status: 'FAILED', operation: 'MCP_TOOLS_LOAD', message: this.describeHttpError(err), response: err.error || null };
      }
    });
  }

  saveHttpTool() {
    const body = {
      id: this.tool.id,
      name: this.tool.name,
      description: this.tool.description,
      type: 'HTTP',
      inputSchema: this.parseJson(this.tool.inputSchemaText, 'Input JSON Schema'),
      outputSchema: this.parseJson(this.tool.outputSchemaText, 'Output JSON Schema'),
      fixedArguments: this.parseJson(this.tool.fixedArgumentsText, 'Fixed Arguments JSON'),
      httpConfig: { method: this.tool.method, url: this.tool.url, headers: this.parseJson(this.tool.headersText, 'Headers JSON'), timeout_ms: this.tool.timeoutMs, group: this.tool.group || 'HTTP', source: 'http', auth: this.httpAuthConfig() },
      enabled: true
    };
    if (!body.inputSchema || !body.outputSchema || !body.fixedArguments || !body.httpConfig.headers) return;
    const call = body.id ? this.api.updateTool(body.id, body) : this.api.createTool(body);
    call.subscribe((x: any) => { this.pickToolForTesting(x); this.clearTool(); this.load(); });
  }

  createToolFromRequest() {
    const headers = this.parseJson(this.requestTool.headersText, 'Headers JSON');
    const bodySample = this.parseJson(this.requestTool.bodyText, 'Body JSON');
    if (!headers || !bodySample || !this.requestTool.url?.trim()) return;
    const body = {
      name: this.requestTool.name || 'Captured API Tool',
      description: this.requestTool.description || `Captured ${this.requestTool.method} request`,
      type: 'HTTP',
      inputSchema: this.schemaFromRequest(this.requestTool.url, bodySample),
      outputSchema: { type: 'object' },
      httpConfig: {
        method: this.requestTool.method || 'GET',
        url: this.requestTool.url.trim(),
        headers,
        timeout_ms: 10000,
        group: this.requestTool.group || 'Captured API',
        source: 'captured_request',
        auth: { type: 'none' }
      },
      enabled: true
    };
    this.api.createTool(body).subscribe((saved: any) => {
      this.showRequestToolForm = false;
      this.lastImportedCount = 1;
      this.testResult = { status: 'READY', message: 'Tool created from request. Review the generated input and run the test.', tool: saved };
      this.pickToolForTesting(saved);
      this.load();
    });
  }

  saveMcp(discoverAfterSave = false) {
    const body = { ...this.mcp, config: this.parseJson(this.mcp.configText, 'Config JSON') };
    if (!body.config) return;
    if (!String(body.name || '').trim()) {
      this.setMcpStatus('error', 'Name required', 'Give this MCP server a readable name before saving.');
      return;
    }
    if (!String(body.endpoint || '').trim()) {
      this.setMcpStatus('error', 'Endpoint required', 'Enter the MCP server endpoint before saving.');
      return;
    }
    delete body.configText;
    const call = body.id ? this.api.updateMcpServer(body.id, body) : this.api.saveMcpServer(body);
    this.savingMcp = true;
    this.lastMcpResult = null;
    this.setMcpStatus('running', body.id ? 'Updating MCP server' : 'Saving MCP server', 'Registering the server in AgentChain.');
    call.subscribe({
      next: (x: any) => {
        this.savingMcp = false;
        this.mcp = { ...x, configText: JSON.stringify(x.config || {}, null, 2) };
        this.selectedMcpServerId = x.id;
        this.lastMcpResult = { status: 'OK', message: 'MCP server saved.', server: x };
        this.setMcpStatus('ready', 'MCP server registered', discoverAfterSave ? 'Server saved. Starting tool discovery now.' : 'Server saved. Preview or discover tools next.');
        this.load();
        if (discoverAfterSave) this.previewMcp(x.id);
      },
      error: err => {
        this.savingMcp = false;
        this.lastMcpResult = { status: 'FAILED', operation: 'MCP_SAVE', message: this.describeHttpError(err), response: err.error || null };
        this.setMcpStatus('error', 'MCP server save failed', this.describeHttpError(err));
      }
    });
  }

  discover(id = this.mcp.id) {
    if (!id) return;
    this.discoveringMcp = true;
    this.lastMcpResult = null;
    this.testResult = { status: 'RUNNING', message: 'Discovering MCP tools...' };
    this.setMcpStatus('running', 'Discovering MCP tools', 'Calling the MCP server and saving discovered tools into the registry.');
    this.api.discoverMcpTools(id).subscribe({
      next: x => {
        this.discoveringMcp = false;
        this.testResult = x;
        this.lastMcpResult = x;
        this.lastMcpSavedCount = Number(x?.count || (x?.discovered || []).length || 0);
        if (String(x?.status || '').toUpperCase() === 'FAILED') {
          this.setMcpStatus('error', 'MCP discovery failed', x?.error || 'The server responded, but no tools were discovered.');
          this.importReport = [{ status: 'error', title: 'Discovery failed', message: x?.error || 'No tools were saved.' }];
          return;
        }
        this.setMcpStatus(this.lastMcpSavedCount ? 'ready' : 'warning', `${this.lastMcpSavedCount} MCP tools saved`, this.lastMcpSavedCount ? 'The tools are now visible in the registry and can be tested.' : 'Discovery completed but did not save any tools.');
        this.importReport = this.reportForImport('MCP', this.lastMcpSavedCount, this.lastMcpSavedCount, x);
        this.loadSelectedMcpTools();
        this.load();
        if ((x?.discovered || [])[0]) this.inspectedTool = x.discovered[0];
      },
      error: err => {
        this.discoveringMcp = false;
        this.testResult = {
          status: 'FAILED',
          operation: 'MCP_DISCOVER',
          httpStatus: err.status || 0,
          message: this.describeHttpError(err),
          response: err.error || null
        };
        this.lastMcpResult = this.testResult;
        this.setMcpStatus('error', 'MCP discovery failed', this.describeHttpError(err));
      }
    });
  }
  previewMcp(id = this.mcp.id) {
    if (!id) return;
    this.discoveringMcp = true;
    this.lastMcpResult = null;
    this.setMcpStatus('running', 'Previewing MCP tools', 'Calling the MCP server without saving tools yet.');
    this.api.previewMcpTools(id).subscribe({
      next: res => {
        this.discoveringMcp = false;
        this.mcpPreviewTools = res?.tools || [];
        this.selectedMcpPreviewTools = {};
        this.mcpPreviewTools.forEach(t => {
          const name = this.mcpPreviewToolName(t);
          if (name) this.selectedMcpPreviewTools[name] = true;
        });
        this.importReport = this.reportForPreview('MCP', this.mcpPreviewTools, [], this.mcp.authType || 'none');
        this.testResult = res;
        this.lastMcpResult = res;
        if (String(res?.status || '').toUpperCase() === 'FAILED') {
          this.setMcpStatus('error', 'MCP preview failed', res?.error || 'No MCP tools were discovered.');
          return;
        }
        this.setMcpStatus(this.mcpPreviewTools.length ? 'ready' : 'warning', `${this.mcpPreviewTools.length} MCP tools previewed`, this.mcpPreviewTools.length ? 'Review the discovered tools, then save selected tools.' : 'The MCP server responded, but no tools were found.');
      },
      error: err => {
        this.discoveringMcp = false;
        this.testResult = { status: 'FAILED', message: this.describeHttpError(err), response: err.error || null };
        this.lastMcpResult = this.testResult;
        this.setMcpStatus('error', 'MCP preview failed', this.describeHttpError(err));
      }
    });
  }
  saveSelectedMcpTools() {
    const names = this.selectedMcpPreviewToolNames();
    if (!this.selectedMcpServerId || !names.length) return;
    this.discoveringMcp = true;
    this.setMcpStatus('running', 'Saving selected MCP tools', `Saving ${names.length} selected tool${names.length === 1 ? '' : 's'} into the registry.`);
    this.api.discoverMcpTools(this.selectedMcpServerId, { selectedToolNames: names }).subscribe({
      next: x => {
        this.discoveringMcp = false;
        this.testResult = x;
        this.lastMcpResult = x;
        this.lastImportedCount = Number(x?.count || names.length || 0);
        this.lastMcpSavedCount = this.lastImportedCount;
        this.importReport = this.reportForImport('MCP', this.lastImportedCount, names.length, x);
        this.mcpPreviewTools = [];
        this.selectedMcpPreviewTools = {};
        this.setMcpStatus(this.lastMcpSavedCount ? 'ready' : 'warning', `${this.lastMcpSavedCount} MCP tools saved`, this.lastMcpSavedCount ? 'Saved tools are now available in the registry and test panel.' : 'No selected tools were saved. Check the response details.');
        this.loadSelectedMcpTools();
        this.loadAndPickImported(names);
      },
      error: err => {
        this.discoveringMcp = false;
        this.lastMcpResult = { status: 'FAILED', operation: 'MCP_SAVE_SELECTED', message: this.describeHttpError(err), response: err.error || null };
        this.setMcpStatus('error', 'Saving MCP tools failed', this.describeHttpError(err));
      }
    });
  }
  toggleAllMcpPreview(checked: boolean) {
    this.mcpPreviewTools.forEach(t => {
      const name = this.mcpPreviewToolName(t);
      if (name) this.selectedMcpPreviewTools[name] = checked;
    });
  }
  toggleMcpPreviewTool(tool: any, event: Event) {
    const name = this.mcpPreviewToolName(tool);
    if (!name) return;
    this.selectedMcpPreviewTools[name] = (event.target as HTMLInputElement).checked;
  }
  isMcpPreviewSelected(tool: any): boolean {
    const name = this.mcpPreviewToolName(tool);
    return !!name && this.selectedMcpPreviewTools[name] === true;
  }
  mcpPreviewSelectedCount(): number { return this.selectedMcpPreviewToolNames().length; }
  selectedMcpPreviewToolNames(): string[] {
    return this.mcpPreviewTools
      .map(t => this.mcpPreviewToolName(t))
      .filter(name => !!name && this.selectedMcpPreviewTools[name]);
  }
  mcpPreviewToolName(tool: any): string {
    return String(tool?.name || tool?.mcpToolName || tool?.toolName || tool?.id || '').trim();
  }

  importOpenApi() {
    const body: any = this.openApiBody();
    const selected = Object.keys(this.selectedOpenApiOperations).filter(k => this.selectedOpenApiOperations[k]);
    if (selected.length) body.selectedOperationKeys = selected;
    if (this.openApi.group?.trim()) body.groupName = this.openApi.group.trim();
    body.duplicatePolicy = this.duplicatePolicy;
    if (!body) return;
    this.testResult = { status: 'RUNNING', message: 'Importing OpenAPI operations...' };
    this.api.importOpenApiTools(body).subscribe({
      next: res => {
        this.testResult = res;
        this.lastImportedCount = Number(res?.imported || res?.created || selected.length || 0);
        this.importReport = this.reportForImport('OpenAPI', this.lastImportedCount, selected.length || this.openApiOperations.length, res);
        this.showOpenApiForm = false;
        this.openApiOperations = [];
        this.selectedOpenApiOperations = {};
        this.loadAndPickImported(selected);
      },
      error: err => this.testResult = { status: 'FAILED', message: this.describeHttpError(err), response: err.error || null }
    });
  }

  previewOpenApi() {
    const body = this.openApiBody();
    if (!body) return;
    if (this.openApi.group?.trim()) body.groupName = this.openApi.group.trim();
    this.api.previewOpenApiTools(body).subscribe({
      next: res => {
        this.openApi.group = res?.group || this.openApi.group;
        this.openApiOperations = res?.operations || [];
        this.selectedOpenApiOperations = {};
        this.openApiOperations.forEach(op => this.selectedOpenApiOperations[op.key] = true);
        this.importReport = this.reportForPreview('OpenAPI', this.openApiOperations, this.tools, this.openApi.authType || 'none');
        this.testResult = res;
      },
      error: err => this.testResult = { status: 'FAILED', message: this.describeHttpError(err), response: err.error || null }
    });
  }

  importPostman() {
    const body: any = this.postmanBody();
    if (!body) return;
    const selected = Object.keys(this.selectedPostmanRequests).filter(k => this.selectedPostmanRequests[k]);
    if (selected.length) body.selectedOperationKeys = selected;
    body.duplicatePolicy = this.duplicatePolicy;
    this.testResult = { status: 'RUNNING', message: 'Importing Postman requests...' };
    this.api.importPostmanTools(body).subscribe({
      next: res => {
        this.testResult = res;
        this.lastImportedCount = Number(res?.imported || res?.created || selected.length || 0);
        this.importReport = this.reportForImport('Postman', this.lastImportedCount, selected.length || this.postmanRequests.length, res);
        this.showPostmanForm = false;
        this.postmanRequests = [];
        this.selectedPostmanRequests = {};
        this.loadAndPickImported(selected);
      },
      error: err => this.testResult = { status: 'FAILED', message: this.describeHttpError(err), response: err.error || null }
    });
  }

  previewPostman() {
    const body = this.postmanBody();
    if (!body) return;
    this.api.previewPostmanTools(body).subscribe({
      next: res => {
        this.postman.group = res?.group || this.postman.group;
        this.postmanRequests = res?.requests || [];
        this.selectedPostmanRequests = {};
        this.postmanRequests.forEach(req => this.selectedPostmanRequests[req.key] = true);
        this.importReport = this.reportForPreview('Postman', this.postmanRequests, this.tools, this.postman.authType || 'collection');
        this.testResult = res;
      },
      error: err => this.testResult = { status: 'FAILED', message: this.describeHttpError(err), response: err.error || null }
    });
  }

  private openApiBody(): any {
    const body: any = {};
    if (this.openApi.url?.trim()) body.url = this.openApi.url.trim();
    if (this.openApi.serverUrl?.trim()) body.serverUrl = this.openApi.serverUrl.trim();
    body.auth = this.openApiAuthConfig();
    if (this.openApi.json?.trim()) {
      const spec = this.parseJson(this.openApi.json, 'OpenAPI JSON');
      if (!spec) return;
      body.spec = spec;
    }
    if (!body.url && !body.spec) {
      alert('Provide an OpenAPI JSON URL or paste the OpenAPI JSON.');
      return null;
    }
    body.defaultTimeoutMs = this.openApi.defaultTimeoutMs || 30000;
    body.allowPrivateNetwork = !!this.openApi.allowPrivateNetwork;
    return body;
  }

  private postmanBody(): any {
    if (!this.postman.json?.trim()) {
      alert('Paste a Postman collection JSON first.');
      return null;
    }
    const collection = this.parseJson(this.postman.json, 'Postman collection JSON');
    if (!collection) return null;
    const body: any = { collection };
    if (this.postman.group?.trim()) body.groupName = this.postman.group.trim();
    if (this.postman.baseUrl?.trim()) body.baseUrl = this.postman.baseUrl.trim();
    body.defaultTimeoutMs = this.postman.defaultTimeoutMs || 30000;
    body.useCollectionVariables = !!this.postman.useCollectionVariables;
    body.allowPrivateNetwork = !!this.postman.allowPrivateNetwork;
    const auth = this.postmanAuthConfig();
    if (auth) body.auth = auth;
    return body;
  }

  testTool() {
    const input = this.parseJson(this.testInputText, 'Test Input JSON');
    if (!input || !this.selectedToolId) return;
    const selected = this.environments.find(env => env.environmentKey === this.selectedEnvironmentKey);
    this.api.testTool(this.selectedToolId, { ...input, environmentKey: this.selectedEnvironmentKey, environment: { key: this.selectedEnvironmentKey, config: selected?.configJson || {} } }).subscribe(x => this.testResult = x);
  }

  editTool(t: any) {
    const auth = t.httpConfig?.auth || {};
    this.tool = {
      id: t.id,
      name: t.name,
      description: t.description,
      method: t.httpConfig?.method || 'GET',
      url: t.httpConfig?.url || '',
      group: t.httpConfig?.group || 'HTTP',
      timeoutMs: t.httpConfig?.timeout_ms || 10000,
      authType: auth.type || 'none',
      authLocation: auth.in || auth.location || 'header',
      authTokenRef: auth.token_ref || auth.tokenRef || auth.token || '',
      authUsernameRef: auth.username_ref || auth.usernameRef || auth.username || '',
      authPasswordRef: auth.password_ref || auth.passwordRef || auth.password || '',
      authName: auth.name || auth.header_name || auth.query_name || '',
      authValueRef: auth.value_ref || auth.valueRef || auth.value || auth.api_key || auth.apiKey || '',
      headersText: JSON.stringify(t.httpConfig?.headers || {}, null, 2),
      fixedArgumentsText: JSON.stringify(t.fixedArguments || t.fixed_arguments || {}, null, 2),
      inputSchemaText: JSON.stringify(t.inputSchema || {}, null, 2),
      outputSchemaText: JSON.stringify(t.outputSchema || {}, null, 2)
    };
    this.showToolForm = true;
  }
  inspectTool(t: any) {
    this.inspectedTool = t;
    this.toolValidationReport = [];
    this.toolQuality = null;
    this.toolTestHistory = [];
    if (t?.id) this.api.toolQuality(t.id).subscribe({ next: q => this.toolQuality = q, error: _ => this.toolQuality = null });
    if (t?.id) this.api.toolTestRuns(t.id).subscribe({ next: rows => this.toolTestHistory = rows || [], error: _ => this.toolTestHistory = [] });
  }
  validateAndPublishTool(t: any) {
    if (!t?.id) return;
    this.toolValidationReport = [{ status: 'warning', title: 'Validating contract', message: 'Checking required schema, endpoint, and type configuration.' }];
    this.api.validateTool(t.id).subscribe({
      next: validation => {
        if (!validation?.valid) {
          const errors = validation?.errors || ['Tool is not publishable.'];
          this.toolValidationReport = errors.map((e: any) => ({ status: 'error', title: 'Contract issue', message: String(e) }));
          return;
        }
        this.api.publishTool(t.id).subscribe({
          next: res => this.toolValidationReport = [{ status: 'ready', title: 'Tool published', message: `Version ${res?.version || ''} is published and ready for agents.` }],
          error: err => this.toolValidationReport = [{ status: 'error', title: 'Publish failed', message: this.describeHttpError(err) }]
        });
      },
      error: err => this.toolValidationReport = [{ status: 'error', title: 'Validation failed', message: this.describeHttpError(err) }]
    });
  }
  editMcp(s: any) { this.mcp = { ...s, configText: JSON.stringify(s.config || {}, null, 2) }; this.showMcpForm = true; }
  editSelectedMcp() { const server = this.selectedMcpServer(); if (server) this.editMcp(server); }
  selectTool(t: any) { this.pickToolForTesting(t); }
  toggleServer(id: string) { this.expandedServers[id] = !this.expandedServers[id]; }
  toggleToolSchema(id: string) { this.expandedToolSchemas[id] = !this.expandedToolSchemas[id]; }
  mcpToolsFor(serverId: string) { return this.tools.filter(t => t.type === 'MCP' && t.mcpServerId === serverId); }
  selectedMcpServer() { return this.mcpServers.find(s => s.id === this.selectedMcpServerId); }
  deleteSelectedMcp() { const server = this.selectedMcpServer(); if (server) this.deleteMcp(server); }
  toggleToolSelection(id: string, event: Event) { this.selectedTools[id] = (event.target as HTMLInputElement).checked; }
  toggleToolGroup(key: string) { this.expandedToolGroups[key] = this.expandedToolGroups[key] === false; }
  toggleToolGroupSelection(group: any, event: Event) { const checked = (event.target as HTMLInputElement).checked; group.tools.forEach((t: any) => this.selectedTools[t.id] = checked); }
  groupSelected(group: any): boolean { return group.tools.length > 0 && group.tools.every((t: any) => this.selectedTools[t.id]); }
  toggleAllOpenApi(checked: boolean) { this.openApiOperations.forEach(op => this.selectedOpenApiOperations[op.key] = checked); }
  toggleAllPostman(checked: boolean) { this.postmanRequests.forEach(req => this.selectedPostmanRequests[req.key] = checked); }
  wizardSourceLabel() { return this.importSource === 'openapi' ? 'OpenAPI' : this.importSource === 'postman' ? 'Postman Collection' : 'MCP Server'; }
  wizardSourceReady(): boolean {
    if (this.importSource === 'openapi') return !!(this.openApi.url?.trim() || this.openApi.json?.trim());
    if (this.importSource === 'postman') return !!this.postman.json?.trim();
    return !!this.selectedMcpServerId || !!this.mcp.id;
  }
  wizardAuthReady(): boolean {
    const type = this.importSource === 'openapi' ? this.openApi.authType : this.importSource === 'postman' ? this.postman.authType : this.mcp.authType;
    return !!type;
  }
  wizardAuthLabel(): string {
    const type = this.importSource === 'openapi' ? this.openApi.authType : this.importSource === 'postman' ? this.postman.authType : this.mcp.authType;
    return `auth: ${type || 'none'}`;
  }
  wizardPreviewCount(): number {
    if (this.importSource === 'openapi') return this.openApiOperations.length;
    if (this.importSource === 'postman') return this.postmanRequests.length;
    return this.mcpPreviewTools.length;
  }
  wizardSelectedCount(): number {
    if (this.importSource === 'openapi') return Object.values(this.selectedOpenApiOperations).filter(Boolean).length;
    if (this.importSource === 'postman') return Object.values(this.selectedPostmanRequests).filter(Boolean).length;
    return this.mcpPreviewSelectedCount();
  }
  wizardSaved(): boolean { return this.lastImportedCount > 0; }
  saveCurrentAuthProfile() {
    const auth = this.currentSourceAuth();
    const name = prompt('Auth profile name', `${this.wizardSourceLabel()} ${auth?.type || 'none'}`);
    if (!name?.trim()) return;
    const profile = { id: `auth_${Date.now()}`, name: name.trim(), auth };
    this.authProfiles = [...this.authProfiles.filter(p => p.name !== profile.name), profile];
    this.persistAuthProfiles();
    this.selectedAuthProfileId = profile.id;
  }
  applyAuthProfile() {
    const profile = this.authProfiles.find(p => p.id === this.selectedAuthProfileId);
    if (!profile) return;
    this.applyAuthConfig(profile.auth || {});
  }
  toggleAllTools(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.tools.forEach(t => this.selectedTools[t.id] = checked);
  }
  selectedToolCount(): number { return this.tools.filter(t => this.selectedTools[t.id]).length; }
  allToolsSelected(): boolean { return this.tools.length > 0 && this.selectedToolCount() === this.tools.length; }
  someToolsSelected(): boolean { const count = this.selectedToolCount(); return count > 0 && count < this.tools.length; }
  deleteSelectedTools() {
    const selected = this.tools.filter(t => this.selectedTools[t.id]);
    if (!selected.length || !confirm(`Delete ${selected.length} selected tool${selected.length === 1 ? '' : 's'}?`)) return;
    this.api.deleteTools(selected.map(t => t.id)).subscribe(() => {
      selected.forEach(t => delete this.selectedTools[t.id]);
      this.load();
    });
  }
  toolDisplayName(t: any): string { return t.type === 'MCP' ? (t.mcpToolName || t.name) : t.name; }
  toolKindLabel(t: any): string {
    if (t.type === 'MCP') return 'MCP';
    if (this.isOpenApiTool(t)) return 'OpenAPI';
    if (this.isPostmanTool(t)) return 'Postman';
    return t.type || 'HTTP';
  }
  toolGroupLabel(t: any): string {
    if (t.type === 'MCP') return this.mcpServers.find(s => s.id === t.mcpServerId)?.name || 'MCP';
    if (this.isOpenApiTool(t)) return t.httpConfig?.openapi_group || t.httpConfig?.group || 'OpenAPI';
    if (this.isPostmanTool(t)) return t.httpConfig?.postman_group || t.httpConfig?.group || 'Postman';
    return t.httpConfig?.group || 'HTTP';
  }
  groupedTools(): any[] {
    const groups = new Map<string, any>();
    for (const tool of this.tools) {
      const kind = this.toolKindLabel(tool);
      const name = this.toolGroupLabel(tool);
      const key = `${kind}:${name}`;
      if (!groups.has(key)) groups.set(key, { key, kind, name, tools: [] });
      groups.get(key).tools.push(tool);
    }
    return Array.from(groups.values()).sort((a, b) => `${a.kind} ${a.name}`.localeCompare(`${b.kind} ${b.name}`));
  }
  toolEndpointLabel(t: any): string {
    if (t.type === 'MCP') {
      const server = this.mcpServers.find(s => s.id === t.mcpServerId);
      return server?.endpoint || '';
    }
    return t.httpConfig?.url || '';
  }
  isOpenApiTool(t: any): boolean {
    const source = String(t.httpConfig?.source || t.httpConfig?.imported_from || '').toLowerCase();
    return source === 'openapi' || source === 'swagger';
  }
  isPostmanTool(t: any): boolean {
    const source = String(t.httpConfig?.source || t.httpConfig?.imported_from || '').toLowerCase();
    return source === 'postman';
  }
  toolOptionLabel(t: any): string {
    if (t.type === 'MCP') {
      const server = this.mcpServers.find(s => s.id === t.mcpServerId);
      return `MCP / ${server?.name || 'Server'} / ${t.mcpToolName || t.name}`;
    }
    return `${t.type} / ${t.name}`;
  }
  deleteTool(t: any) { if (confirm(`Delete tool "${t.name}"?`)) this.api.deleteTool(t.id).subscribe(() => this.load()); }
  deleteMcp(s: any) { if (confirm(`Delete MCP server "${s.name}"?`)) this.api.deleteMcpServer(s.id).subscribe(() => this.load()); }
  clearTool() { this.tool = this.blankTool(); this.showToolForm = false; }
  clearMcp() {
    this.mcp = this.blankMcp();
    this.showMcpForm = false;
    this.mcpPreviewTools = [];
    this.selectedMcpPreviewTools = {};
    this.lastMcpResult = null;
    this.lastMcpSavedCount = 0;
    this.setMcpStatus('warning', 'MCP setup', '');
  }

  activeMcpId(): string { return this.mcp?.id || this.selectedMcpServerId || ''; }
  mcpStatusIcon(): string {
    if (this.mcpStatusKind === 'ready') return 'check_circle';
    if (this.mcpStatusKind === 'error') return 'error';
    if (this.mcpStatusKind === 'running') return 'sync';
    return 'info';
  }
  lastMcpResultTitle(): string {
    const status = String(this.lastMcpResult?.status || '').toUpperCase();
    if (status === 'FAILED') return 'MCP operation failed';
    if (this.lastMcpResult?.tools) return 'MCP preview response';
    if (this.lastMcpResult?.discovered) return 'MCP discovery response';
    return 'MCP response';
  }
  lastMcpResultCountLabel(): string {
    if (!this.lastMcpResult) return '';
    const count = this.lastMcpResult.count ?? this.lastMcpResult.tools?.length ?? this.lastMcpResult.discovered?.length;
    return count === undefined ? '' : `${count} tool${Number(count) === 1 ? '' : 's'}`;
  }

  private parseJson(text: string, label: string): any {
    try { return JSON.parse(text || '{}'); } catch { alert(`${label} must be valid JSON.`); return null; }
  }
  private describeHttpError(err: any): string {
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.detail) return String(body.detail);
    if (body?.message) return String(body.message);
    if (body?.error) return String(body.error);
    if (err?.status === 403) return 'Discovery was rejected. Check your login token, gateway route, MCP server auth type, and secret ref.';
    return err?.message || 'Discovery failed.';
  }
  private setMcpStatus(kind: 'ready' | 'warning' | 'error' | 'running', title: string, message: string) {
    this.mcpStatusKind = kind;
    this.mcpStatusTitle = title;
    this.mcpStatusMessage = message;
  }
  schemaText(value: any): string { return JSON.stringify(value || {}, null, 2); }
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
  private loadAndPickImported(keys: string[] = []) {
    const keySet = new Set((keys || []).map(k => String(k).toLowerCase()));
    this.api.toolsPage(this.toolPage.pageIndex, this.toolPage.pageSize).subscribe(x => {
      this.tools = x?.content || [];
      this.toolTotal = x?.totalElements || 0;
      const candidate = this.tools.find(t => keySet.has(String(t.httpConfig?.operationKey || t.httpConfig?.postman_key || t.mcpToolName || t.name).toLowerCase())) || this.tools[0];
      if (candidate) this.pickToolForTesting(candidate);
    });
    this.api.mcpServers().subscribe(x => this.mcpServers = x || []);
  }
  private pickToolForTesting(tool: any) {
    if (!tool) return;
    this.selectedToolId = tool.id;
    this.testInputText = JSON.stringify({ ...this.sampleInputForSchema(tool.inputSchema), ...(tool.fixedArguments || tool.fixed_arguments || {}) }, null, 2);
  }
  private sampleInputForSchema(schema: any): any {
    const resolved = schema || {};
    if (resolved.type === 'array') return [this.sampleInputForSchema(resolved.items || {})];
    const props = resolved.properties || {};
    const out: any = {};
    for (const key of Object.keys(props)) out[key] = this.sampleValueForSchema(key, props[key]);
    return Object.keys(out).length ? out : { message: 'hello' };
  }
  private sampleValueForSchema(key: string, schema: any): any {
    const lower = key.toLowerCase();
    if (schema?.example !== undefined) return schema.example;
    if (schema?.default !== undefined) return schema.default;
    if (schema?.enum?.length) return schema.enum[0];
    if (schema?.type === 'number' || schema?.type === 'integer') return lower.includes('amount') ? 1000 : 1;
    if (schema?.type === 'boolean') return true;
    if (schema?.type === 'array') return [this.sampleValueForSchema(key, schema.items || {})];
    if (schema?.type === 'object') return this.sampleInputForSchema(schema);
    if (lower.includes('email')) return 'user@example.com';
    if (lower.includes('tenant')) return 'TENANT-001';
    if (lower.includes('id')) return 'ID-001';
    if (lower.includes('date')) return '2026-05-13';
    return 'exampleValue';
  }
  private schemaFromRequest(url: string, bodySample: any): any {
    const properties: any = {};
    const required: string[] = [];
    const matches = String(url || '').match(/\{\{([^}]+)\}\}/g) || [];
    for (const token of matches) {
      const name = token.replace(/[{}]/g, '').trim();
      if (name) {
        properties[name] = { type: 'string', example: this.sampleValueForSchema(name, {}) };
        required.push(name);
      }
    }
    if (bodySample && typeof bodySample === 'object' && !Array.isArray(bodySample) && Object.keys(bodySample).length) {
      properties.body = { type: 'object', properties: this.schemaPropertiesFromSample(bodySample) };
      required.push('body');
    }
    return { type: 'object', properties, required };
  }
  private schemaPropertiesFromSample(sample: any): any {
    const props: any = {};
    for (const [key, value] of Object.entries(sample || {})) {
      if (typeof value === 'number') props[key] = { type: Number.isInteger(value) ? 'integer' : 'number', example: value };
      else if (typeof value === 'boolean') props[key] = { type: 'boolean', example: value };
      else if (Array.isArray(value)) props[key] = { type: 'array', example: value };
      else if (value && typeof value === 'object') props[key] = { type: 'object', properties: this.schemaPropertiesFromSample(value), example: value };
      else props[key] = { type: 'string', example: value || this.sampleValueForSchema(key, {}) };
    }
    return props;
  }
  private httpAuthConfig() {
    const type = this.tool.authType || 'none';
    if (type === 'bearer') return { type, token_ref: this.tool.authTokenRef || '' };
    if (type === 'basic') return { type, username_ref: this.tool.authUsernameRef || '', password_ref: this.tool.authPasswordRef || '' };
    if (type === 'api_key') return { type, in: this.tool.authLocation || 'header', name: this.tool.authName || (this.tool.authLocation === 'query' ? 'api_key' : 'X-API-Key'), value_ref: this.tool.authValueRef || '' };
    if (type === 'custom_header') return { type, name: this.tool.authName || 'Authorization', value_ref: this.tool.authValueRef || '' };
    return { type: 'none' };
  }
  private openApiAuthConfig() {
    const type = this.openApi.authType || 'none';
    if (type === 'bearer') return { type, token_ref: this.openApi.authTokenRef || '' };
    if (type === 'basic') return { type, username_ref: this.openApi.authUsernameRef || '', password_ref: this.openApi.authPasswordRef || '' };
    if (type === 'api_key') return { type, in: this.openApi.authLocation || 'header', name: this.openApi.authName || (this.openApi.authLocation === 'query' ? 'api_key' : 'X-API-Key'), value_ref: this.openApi.authValueRef || '' };
    if (type === 'custom_header') return { type, name: this.openApi.authName || 'Authorization', value_ref: this.openApi.authValueRef || '' };
    return { type: 'none' };
  }
  private postmanAuthConfig() {
    if (this.postman.authType === 'collection') return null;
    const type = this.postman.authType || 'none';
    if (type === 'bearer') return { type, token_ref: this.postman.authTokenRef || '' };
    if (type === 'basic') return { type, username_ref: this.postman.authUsernameRef || '', password_ref: this.postman.authPasswordRef || '' };
    if (type === 'api_key') return { type, in: this.postman.authLocation || 'header', name: this.postman.authName || (this.postman.authLocation === 'query' ? 'api_key' : 'X-API-Key'), value_ref: this.postman.authValueRef || '' };
    if (type === 'custom_header') return { type, name: this.postman.authName || 'Authorization', value_ref: this.postman.authValueRef || '' };
    return { type: 'none' };
  }
  private currentSourceAuth() {
    if (this.importSource === 'openapi') return this.openApiAuthConfig();
    if (this.importSource === 'postman') return this.postmanAuthConfig() || { type: 'collection' };
    return { type: this.mcp.authType || 'none', secret_ref: this.mcp.secretRef || '' };
  }
  private applyAuthConfig(auth: any) {
    const target = this.importSource === 'openapi' ? this.openApi : this.importSource === 'postman' ? this.postman : this.mcp;
    const type = auth?.type || 'none';
    target.authType = this.importSource === 'postman' && type === 'collection' ? 'collection' : type;
    if (this.importSource === 'mcp') {
      this.mcp.secretRef = auth.secret_ref || auth.secretRef || auth.token_ref || auth.username_ref || '';
      return;
    }
    target.authLocation = auth.in || auth.location || 'header';
    target.authTokenRef = auth.token_ref || auth.tokenRef || auth.token || '';
    target.authUsernameRef = auth.username_ref || auth.usernameRef || auth.username || '';
    target.authPasswordRef = auth.password_ref || auth.passwordRef || auth.password || '';
    target.authName = auth.name || auth.header_name || auth.query_name || '';
    target.authValueRef = auth.value_ref || auth.valueRef || auth.value || auth.api_key || auth.apiKey || '';
  }
  private loadAuthProfiles(): any[] {
    try { return JSON.parse(localStorage.getItem('agentchain.authProfiles') || '[]'); } catch { return []; }
  }
  private persistAuthProfiles() { localStorage.setItem('agentchain.authProfiles', JSON.stringify(this.authProfiles)); }
  private reportForPreview(source: string, items: any[], existingTools: any[], authType: string) {
    const names = new Set(existingTools.map(t => String(t.name || t.mcpToolName || '').toLowerCase()));
    const duplicateCount = items.filter(item => names.has(String(item.name || item.key || '').toLowerCase())).length;
    const selectedCount = source === 'OpenAPI' ? Object.values(this.selectedOpenApiOperations).filter(Boolean).length : source === 'Postman' ? Object.values(this.selectedPostmanRequests).filter(Boolean).length : this.mcpPreviewSelectedCount();
    const report = [
      { status: items.length ? 'ready' : 'warning', title: `${items.length} ${source} tools previewed`, message: items.length ? 'Review the list and unselect anything you do not want to create.' : 'No tools were discovered from this source.' },
      { status: selectedCount ? 'ready' : 'warning', title: `${selectedCount} selected`, message: selectedCount ? 'Selected tools will be created on import.' : 'Select at least one tool before importing.' },
      { status: duplicateCount ? 'warning' : 'ready', title: `${duplicateCount} possible duplicates`, message: duplicateCount ? 'Some previewed names already exist in the library. Review before importing.' : 'No obvious duplicate names found on the current page.' },
      { status: authType && authType !== 'none' ? 'ready' : 'warning', title: `Auth: ${authType || 'none'}`, message: authType && authType !== 'none' ? 'Auth will be attached when tools are created.' : 'No auth is configured. This is fine for public/local endpoints only.' }
    ];
    return report;
  }
  private reportForImport(source: string, imported: number, selected: number, res: any) {
    const skipped = Math.max(0, Number(selected || 0) - Number(imported || 0));
    return [
      { status: imported ? 'ready' : 'error', title: `${imported} ${source} tools imported`, message: imported ? 'The test panel has been prepared for one imported tool.' : 'Nothing was imported. Check the response details below.' },
      { status: skipped ? 'warning' : 'ready', title: `${skipped} skipped`, message: skipped ? 'Some selected items were not created. Check duplicates, schema, or backend validation.' : 'No selected tools were skipped.' },
      { status: res?.errors?.length ? 'error' : 'ready', title: `${res?.errors?.length || 0} errors`, message: res?.errors?.length ? JSON.stringify(res.errors).slice(0, 200) : 'No import errors reported.' }
    ];
  }
  private blankTool() { return { name: 'HTTP Tool', description: '', method: 'GET', url: '', group: 'HTTP', timeoutMs: 10000, authType: 'none', authLocation: 'header', authTokenRef: '', authUsernameRef: '', authPasswordRef: '', authName: '', authValueRef: '', headersText: '{}', fixedArgumentsText: '{}', inputSchemaText: '{"type":"object"}', outputSchemaText: '{"type":"object"}' }; }
  private blankRequestTool() { return { name: 'Captured API Tool', description: '', method: 'GET', url: '', group: 'Captured API', headersText: '{}', bodyText: '{}' }; }
  private blankMcp() { return { name: 'MCP Server', transport: 'sse', endpoint: '', authType: 'none', secretRef: '', enabled: true, configText: '{}' }; }
}
