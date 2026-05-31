import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

interface ProviderMaster {
  name: string;
  displayName: string;
  baseUrl: string;
  secretRef: string;
  models: string[];
}

@Component({
  selector: 'app-llm-config',
  template: `
  <div class="page">
    <div class="top">
      <div>
        <h2>LLM Configurations</h2>
        <p class="muted">Connect providers, register models, then expose stable aliases for agents and routing.</p>
      </div>
      <div class="actions">
        <button mat-raised-button color="primary" (click)="createForActiveTab()"><mat-icon>add</mat-icon>{{primaryActionLabel}}</button>
        <button mat-button (click)="load()">Refresh</button>
      </div>
    </div>

    <div class="next-steps">
      <button class="next-step" type="button" (click)="activeTab=0">
        <mat-icon>key</mat-icon>
        <div><strong>Providers</strong><span>OpenAI, Anthropic, Ollama, OpenRouter, Azure, or custom gateways.</span></div>
      </button>
      <button class="next-step" type="button" (click)="activeTab=1">
        <mat-icon>smart_toy</mat-icon>
        <div><strong>Models</strong><span>Model names, display names, availability, and token pricing.</span></div>
      </button>
      <button class="next-step" type="button" (click)="activeTab=2">
        <mat-icon>alt_route</mat-icon>
        <div><strong>Aliases and routing</strong><span>Friendly names agents use, with ordered fallback models.</span></div>
      </button>
    </div>

    <mat-tab-group [selectedIndex]="activeTab" (selectedIndexChange)="activeTab=$event; clearSelection()">
      <mat-tab label="Providers">
        <mat-card *ngIf="providerFormOpen" class="form-card">
          <h3>{{provider.id ? 'Update provider' : 'Create provider'}}</h3>
          <div class="grid form-grid two">
            <section>
              <mat-form-field class="full-width">
                <mat-label>Provider type</mat-label>
                <mat-select [(ngModel)]="provider.name" (selectionChange)="onProviderSelected(provider.name)">
                  <mat-option *ngFor="let p of providerMaster" [value]="p.name">{{p.displayName}}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field class="full-width"><mat-label>Display name</mat-label><input matInput [(ngModel)]="provider.displayName" placeholder="OpenAI production"></mat-form-field>
              <mat-form-field class="full-width"><mat-label>Base URL</mat-label><input matInput [(ngModel)]="provider.baseUrl" placeholder="https://api.openai.com/v1"></mat-form-field>
            </section>
            <section>
              <mat-form-field class="full-width">
                <mat-label>{{provider.id ? 'Replace API key / secret reference' : 'API key / secret reference'}}</mat-label>
                <input matInput type="password" autocomplete="new-password" [(ngModel)]="provider.apiKeySecretRef" placeholder="Enter secret ref or API key">
                <mat-hint>{{provider.id ? 'Saved value is hidden. Leave blank to keep current value.' : 'This value will be hidden after save.'}}</mat-hint>
              </mat-form-field>
              <mat-form-field class="full-width">
                <mat-label>{{provider.id ? 'Replace advanced config JSON' : 'Advanced config JSON'}}</mat-label>
                <textarea matInput rows="5" autocomplete="off" [(ngModel)]="providerConfigJson" placeholder='{"organization":"org_..."}'></textarea>
                <mat-hint>{{provider.id ? 'Saved config is hidden. Leave blank to keep current config.' : 'Do not paste secrets here unless required.'}}</mat-hint>
              </mat-form-field>
              <mat-checkbox [(ngModel)]="provider.enabled">Enabled</mat-checkbox>
            </section>
          </div>
          <div class="actions">
            <button mat-raised-button color="primary" (click)="saveProvider()">Save Provider</button>
            <button mat-button (click)="resetProviderForm()">Cancel</button>
          </div>
        </mat-card>

        <mat-card>
          <div class="table-head">
            <h3>Providers</h3>
            <div class="actions"><button mat-button color="warn" (click)="deleteSelectedProviders()" [disabled]="selectedCount(providers) === 0">Delete Selected</button></div>
          </div>
          <table mat-table [dataSource]="providers">
            <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><mat-checkbox [checked]="allSelected(providers)" (change)="toggleAll(providers, $event.checked)"></mat-checkbox></th><td mat-cell *matCellDef="let p"><mat-checkbox [checked]="selected[p.id]" (change)="selected[p.id]=$event.checked"></mat-checkbox></td></ng-container>
            <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Provider</th><td mat-cell *matCellDef="let p"><strong>{{p.displayName || p.name}}</strong><small>{{p.name}}</small></td></ng-container>
            <ng-container matColumnDef="baseUrl"><th mat-header-cell *matHeaderCellDef>Endpoint</th><td mat-cell class="wrap-cell" *matCellDef="let p">{{p.baseUrl || '-'}}</td></ng-container>
            <ng-container matColumnDef="secret"><th mat-header-cell *matHeaderCellDef>Secret</th><td mat-cell *matCellDef="let p"><span class="secret-state" [class.off]="!p.apiKeyConfigured">{{p.apiKeyConfigured ? 'Configured' : 'Not configured'}}</span></td></ng-container>
            <ng-container matColumnDef="enabled"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let p"><span class="pill" [class.off]="!p.enabled">{{p.enabled ? 'Enabled' : 'Disabled'}}</span></td></ng-container>
            <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let p"><button mat-button (click)="editProvider(p)">Update</button><button mat-button color="warn" (click)="deleteProvider(p)">Delete</button></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="providerCols"></tr>
            <tr mat-row *matRowDef="let row;columns:providerCols"></tr>
          </table>
          <div class="empty-state" *ngIf="providers.length === 0"><strong>No providers yet</strong><p>Add one provider endpoint before creating models.</p></div>
        </mat-card>
      </mat-tab>

      <mat-tab label="Models">
        <mat-card *ngIf="modelFormOpen" class="form-card">
          <h3>{{model.id ? 'Update model' : 'Create model'}}</h3>
          <div class="grid form-grid two">
            <section>
              <mat-form-field class="full-width">
                <mat-label>Provider</mat-label>
                <mat-select [(ngModel)]="model.provider" (selectionChange)="onModelProviderSelected(model.provider)">
                  <mat-option *ngFor="let p of providers" [value]="p.name">{{p.displayName || p.name}}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field class="full-width">
                <mat-label>Model</mat-label>
                <mat-select [(ngModel)]="selectedModelName" (selectionChange)="onModelSelected(selectedModelName)">
                  <mat-option *ngFor="let m of modelOptionsFor(model.provider)" [value]="m">{{m}}</mat-option>
                  <mat-option value="custom">Custom model</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field class="full-width" *ngIf="selectedModelName === 'custom'"><mat-label>Custom model name</mat-label><input matInput [(ngModel)]="customModelName" placeholder="my-gateway-model"></mat-form-field>
              <mat-form-field class="full-width"><mat-label>Display name</mat-label><input matInput [(ngModel)]="model.displayName"></mat-form-field>
            </section>
            <section>
              <div class="grid two-small">
                <mat-form-field><mat-label>Input / 1k USD</mat-label><input matInput type="number" step="0.000001" [(ngModel)]="model.inputPer1kUsd"></mat-form-field>
                <mat-form-field><mat-label>Output / 1k USD</mat-label><input matInput type="number" step="0.000001" [(ngModel)]="model.outputPer1kUsd"></mat-form-field>
              </div>
              <mat-checkbox [(ngModel)]="model.vision">Supports vision</mat-checkbox>
              <mat-checkbox [(ngModel)]="model.enabled">Enabled</mat-checkbox>
              <p class="muted">Agents should normally select aliases. Models are the concrete targets behind those aliases.</p>
            </section>
          </div>
          <div class="actions">
            <button mat-raised-button color="primary" (click)="saveModel()">Save Model</button>
            <button mat-button (click)="resetModelForm()">Cancel</button>
          </div>
        </mat-card>

        <mat-card>
          <div class="table-head">
            <h3>Models</h3>
            <div class="actions"><button mat-button color="warn" (click)="deleteSelectedModels()" [disabled]="selectedCount(models) === 0">Delete Selected</button></div>
          </div>
          <table mat-table [dataSource]="models">
            <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><mat-checkbox [checked]="allSelected(models)" (change)="toggleAll(models, $event.checked)"></mat-checkbox></th><td mat-cell *matCellDef="let m"><mat-checkbox [checked]="selected[m.id]" (change)="selected[m.id]=$event.checked"></mat-checkbox></td></ng-container>
            <ng-container matColumnDef="provider"><th mat-header-cell *matHeaderCellDef>Provider</th><td mat-cell *matCellDef="let m">{{providerLabel(m.provider)}}</td></ng-container>
            <ng-container matColumnDef="model"><th mat-header-cell *matHeaderCellDef>Model</th><td mat-cell class="wrap-cell" *matCellDef="let m"><strong>{{m.displayName || m.model}}</strong><small>{{m.model}}</small></td></ng-container>
            <ng-container matColumnDef="pricing"><th mat-header-cell *matHeaderCellDef>Pricing</th><td mat-cell *matCellDef="let m">in {{money(m.inputPer1kUsd)}} / out {{money(m.outputPer1kUsd)}}</td></ng-container>
            <ng-container matColumnDef="enabled"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let m"><span class="pill" [class.off]="!m.enabled">{{m.enabled ? 'Enabled' : 'Disabled'}}</span></td></ng-container>
            <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let m"><button mat-button (click)="editModel(m)">Update</button><button mat-button color="warn" (click)="deleteModel(m)">Delete</button></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="modelCols"></tr>
            <tr mat-row *matRowDef="let row;columns:modelCols"></tr>
          </table>
          <div class="empty-state" *ngIf="models.length === 0"><strong>No models yet</strong><p>Create provider-backed models so aliases can route to them.</p></div>
        </mat-card>
      </mat-tab>

      <mat-tab label="Aliases / Router">
        <mat-card *ngIf="aliasFormOpen" class="form-card">
          <h3>{{alias.id ? 'Update alias route' : 'Create alias route'}}</h3>
          <div class="grid form-grid two">
            <section>
              <mat-form-field class="full-width"><mat-label>Alias name</mat-label><input matInput [(ngModel)]="alias.aliasName" placeholder="fast"></mat-form-field>
              <mat-checkbox [(ngModel)]="alias.enabled">Enabled</mat-checkbox>
              <p class="muted">Use this alias in LLM nodes. Keep aliases stable even when you change the underlying model route.</p>
            </section>
            <section>
              <div class="route-builder">
                <mat-form-field>
                  <mat-label>Provider</mat-label>
                  <mat-select [(ngModel)]="routeProvider" (selectionChange)="routeModel = firstModelFor(routeProvider)">
                    <mat-option *ngFor="let p of providers" [value]="p.name">{{p.displayName || p.name}}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Model</mat-label>
                  <mat-select [(ngModel)]="routeModel">
                    <mat-option *ngFor="let m of modelsForProvider(routeProvider)" [value]="m.model">{{m.displayName || m.model}}</mat-option>
                  </mat-select>
                </mat-form-field>
                <button mat-stroked-button type="button" (click)="addRoute()" [disabled]="!routeProvider || !routeModel"><mat-icon>add</mat-icon>Add route</button>
              </div>
              <div class="route-list" *ngIf="alias.providerModelOrder?.length">
                <div class="route-row" *ngFor="let route of alias.providerModelOrder; let i = index">
                  <span>{{i + 1}}. {{route}}</span>
                  <button mat-icon-button type="button" (click)="removeRoute(i)" aria-label="Remove route"><mat-icon>close</mat-icon></button>
                </div>
              </div>
              <mat-form-field class="full-width"><mat-label>Raw route JSON</mat-label><textarea matInput rows="3" [(ngModel)]="aliasRouteJson" (blur)="applyAliasRouteJson()" placeholder='["openai:gpt-4o-mini"]'></textarea></mat-form-field>
            </section>
          </div>
          <div class="actions">
            <button mat-raised-button color="primary" (click)="saveAlias()">Save Alias</button>
            <button mat-button (click)="resetAliasForm()">Cancel</button>
          </div>
        </mat-card>

        <mat-card>
          <div class="table-head">
            <h3>Aliases and router fallback order</h3>
            <div class="actions"><button mat-button color="warn" (click)="deleteSelectedAliases()" [disabled]="selectedCount(aliases) === 0">Delete Selected</button></div>
          </div>
          <table mat-table [dataSource]="aliases">
            <ng-container matColumnDef="select"><th mat-header-cell *matHeaderCellDef><mat-checkbox [checked]="allSelected(aliases)" (change)="toggleAll(aliases, $event.checked)"></mat-checkbox></th><td mat-cell *matCellDef="let a"><mat-checkbox [checked]="selected[a.id]" (change)="selected[a.id]=$event.checked"></mat-checkbox></td></ng-container>
            <ng-container matColumnDef="alias"><th mat-header-cell *matHeaderCellDef>Alias</th><td mat-cell *matCellDef="let a"><strong>{{a.aliasName}}</strong></td></ng-container>
            <ng-container matColumnDef="route"><th mat-header-cell *matHeaderCellDef>Route order</th><td mat-cell class="wrap-cell" *matCellDef="let a"><span class="route-chip" *ngFor="let route of a.providerModelOrder || []">{{route}}</span></td></ng-container>
            <ng-container matColumnDef="enabled"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let a"><span class="pill" [class.off]="!a.enabled">{{a.enabled ? 'Enabled' : 'Disabled'}}</span></td></ng-container>
            <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let a"><button mat-button (click)="editAlias(a)">Update</button><button mat-button color="warn" (click)="deleteAlias(a)">Delete</button></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="aliasCols"></tr>
            <tr mat-row *matRowDef="let row;columns:aliasCols"></tr>
          </table>
          <div class="empty-state" *ngIf="aliases.length === 0"><strong>No aliases yet</strong><p>Add aliases like fast, cheap, reasoning, or vision so agent graphs stay easy to read.</p></div>
        </mat-card>
      </mat-tab>
    </mat-tab-group>
  </div>`,
  styles: [`
    .top,.table-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .form-card{margin:16px 0}.form-grid.two{grid-template-columns:repeat(2,minmax(280px,1fr))}.two-small{grid-template-columns:1fr 1fr}
    .full-width,table{width:100%}
    .next-step{border:1px solid #d8e1ef;background:#fff;border-radius:8px;text-align:left;cursor:pointer}
    .next-step:hover{border-color:#2f6093;box-shadow:0 3px 12px rgba(31,54,82,.08)}
    td{vertical-align:top}
    td small{color:#6b7280;display:block;margin-top:3px;max-width:420px;overflow-wrap:anywhere;white-space:normal}
    .wrap-cell{max-width:420px;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.45}
    .pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 10px;background:#e8f5ee;color:#176b3a;font-weight:700;font-size:12px}
    .pill.off{background:#f2f4f7;color:#6b7280}
    .secret-state{display:inline-flex;border-radius:999px;padding:4px 10px;background:#edf7ed;color:#176b3a;font-weight:700;font-size:12px}
    .secret-state.off{background:#f2f4f7;color:#6b7280}
    .route-builder{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:start}
    .route-list{border:1px solid #d8e1ef;border-radius:8px;margin:0 0 12px;padding:6px;background:#f8fafc}
    .route-row{display:flex;align-items:center;justify-content:space-between;padding:4px 6px}
    .route-chip{display:inline-flex;margin:3px 6px 3px 0;padding:4px 8px;border-radius:999px;background:#eef2ff;color:#1f3a8a;font-size:12px;font-weight:700}
    .empty-state{padding:20px;color:#52647a}
    @media(max-width:900px){.form-grid.two,.route-builder{grid-template-columns:1fr}.top{display:block}}
  `]
})
export class LlmConfigComponent implements OnInit {
  providerMaster: ProviderMaster[] = [
    { name: 'openai', displayName: 'OpenAI', baseUrl: 'https://api.openai.com/v1', secretRef: 'OPENAI_API_KEY', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o3-mini'] },
    { name: 'azure-openai', displayName: 'Azure OpenAI', baseUrl: 'https://{resource}.openai.azure.com/openai/deployments', secretRef: 'AZURE_OPENAI_API_KEY', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'] },
    { name: 'openrouter', displayName: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', secretRef: 'OPENROUTER_API_KEY', models: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001', 'meta-llama/llama-3.1-70b-instruct'] },
    { name: 'anthropic', displayName: 'Anthropic', baseUrl: 'https://api.anthropic.com', secretRef: 'ANTHROPIC_API_KEY', models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'] },
    { name: 'gemini', displayName: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', secretRef: 'GEMINI_API_KEY', models: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
    { name: 'ollama', displayName: 'Ollama', baseUrl: 'http://localhost:11434/v1', secretRef: '', models: ['llama3.1', 'llama3.2', 'mistral', 'qwen2.5'] },
    { name: 'custom', displayName: 'Custom OpenAI-compatible', baseUrl: '', secretRef: '', models: ['custom'] }
  ];

  providers: any[] = [];
  models: any[] = [];
  aliases: any[] = [];
  provider: any = this.blankProvider();
  model: any = this.blankModel();
  alias: any = this.blankAlias();
  providerConfigJson = '{}';
  aliasRouteJson = '["openai:gpt-4o-mini"]';
  selectedModelName = 'gpt-4o-mini';
  customModelName = '';
  routeProvider = 'openai';
  routeModel = 'gpt-4o-mini';
  activeTab = 0;
  providerFormOpen = false;
  modelFormOpen = false;
  aliasFormOpen = false;
  selected: Record<string, boolean> = {};

  providerCols = ['select', 'name', 'baseUrl', 'secret', 'enabled', 'actions'];
  modelCols = ['select', 'provider', 'model', 'pricing', 'enabled', 'actions'];
  aliasCols = ['select', 'alias', 'route', 'enabled', 'actions'];

  constructor(private api: ApiService) {}

  get primaryActionLabel() {
    return this.activeTab === 0 ? 'Add Provider' : this.activeTab === 1 ? 'Add Model' : 'Add Alias';
  }

  ngOnInit() { this.load(); }

  load() {
    forkJoin({
      providers: this.api.llmProviders(),
      models: this.api.llmModels(),
      aliases: this.api.llmAliases()
    }).subscribe(({ providers, models, aliases }) => {
      this.providers = providers || [];
      this.models = models || [];
      this.aliases = aliases || [];
      this.ensureRouteDefaults();
      this.clearSelection();
    });
  }

  createForActiveTab() {
    if (this.activeTab === 0) { this.resetProviderForm(true); return; }
    if (this.activeTab === 1) { this.resetModelForm(true); return; }
    this.resetAliasForm(true);
  }

  onProviderSelected(name: string) {
    const selected = this.providerMaster.find(p => p.name === name);
    if (!selected) return;
    this.provider = { ...this.provider, name: selected.name, displayName: selected.displayName, baseUrl: selected.baseUrl, apiKeySecretRef: selected.secretRef, enabled: true };
  }

  saveProvider() {
    const body = { ...this.provider };
    if (body.id && !String(body.apiKeySecretRef || '').trim()) {
      delete body.apiKeySecretRef;
    }
    const configText = String(this.providerConfigJson || '').trim();
    if (configText) {
      body.config = this.safeJson(configText, {});
    } else if (body.id) {
      delete body.config;
    } else {
      body.config = {};
    }
    const call = body.id ? this.api.updateLlmProvider(body.id, body) : this.api.saveLlmProvider(body);
    call.subscribe(() => { this.resetProviderForm(); this.load(); });
  }

  editProvider(p: any) {
    this.provider = { ...p, apiKeySecretRef: '' };
    this.providerConfigJson = '';
    this.providerFormOpen = true;
    this.activeTab = 0;
  }

  deleteProvider(p: any) {
    if (confirm(`Delete provider "${p.displayName || p.name}"? Models and aliases that reference it should be updated first.`)) {
      this.api.deleteLlmProvider(p.id).subscribe(() => this.load());
    }
  }

  resetProviderForm(open = false) {
    this.provider = this.blankProvider();
    this.providerConfigJson = '{}';
    this.providerFormOpen = open;
  }

  onModelProviderSelected(providerName: string) {
    this.selectedModelName = this.modelOptionsFor(providerName)[0] || 'custom';
    this.onModelSelected(this.selectedModelName);
  }

  onModelSelected(modelName: string) {
    if (modelName !== 'custom') {
      this.customModelName = '';
      this.model.model = modelName;
      this.model.displayName = this.model.displayName || modelName;
    }
  }

  saveModel() {
    const finalModel = this.selectedModelName === 'custom' ? this.customModelName.trim() : this.selectedModelName;
    if (!finalModel) return;
    const body = { ...this.model, model: finalModel, displayName: this.model.displayName || finalModel };
    const call = body.id ? this.api.updateLlmModel(body.id, body) : this.api.saveLlmModel(body);
    call.subscribe(() => { this.resetModelForm(); this.load(); });
  }

  editModel(m: any) {
    this.model = { ...m };
    this.selectedModelName = this.modelOptionsFor(m.provider).includes(m.model) ? m.model : 'custom';
    this.customModelName = this.selectedModelName === 'custom' ? m.model : '';
    this.modelFormOpen = true;
    this.activeTab = 1;
  }

  deleteModel(m: any) {
    if (confirm(`Delete model "${m.model}"? Aliases that reference it should be updated first.`)) this.api.deleteLlmModel(m.id).subscribe(() => this.load());
  }

  resetModelForm(open = false) {
    const firstProvider = this.providers[0]?.name || 'openai';
    this.model = this.blankModel(firstProvider);
    this.selectedModelName = this.model.model;
    this.customModelName = '';
    this.modelFormOpen = open;
  }

  addRoute() {
    const route = `${this.routeProvider}:${this.routeModel}`;
    this.alias.providerModelOrder = [...(this.alias.providerModelOrder || []).filter((x: string) => x !== route), route];
    this.syncAliasRouteJson();
  }

  removeRoute(index: number) {
    this.alias.providerModelOrder = (this.alias.providerModelOrder || []).filter((_: string, i: number) => i !== index);
    this.syncAliasRouteJson();
  }

  applyAliasRouteJson() {
    const parsed = this.safeJson(this.aliasRouteJson, this.alias.providerModelOrder || []);
    this.alias.providerModelOrder = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    this.syncAliasRouteJson();
  }

  saveAlias() {
    this.applyAliasRouteJson();
    const call = this.alias.id ? this.api.updateLlmAlias(this.alias.id, this.alias) : this.api.saveLlmAlias(this.alias);
    call.subscribe(() => { this.resetAliasForm(); this.load(); });
  }

  editAlias(a: any) {
    this.alias = { ...a, providerModelOrder: [...(a.providerModelOrder || [])] };
    this.syncAliasRouteJson();
    this.aliasFormOpen = true;
    this.activeTab = 2;
  }

  deleteAlias(a: any) {
    if (confirm(`Delete alias "${a.aliasName}"?`)) this.api.deleteLlmAlias(a.id).subscribe(() => this.load());
  }

  resetAliasForm(open = false) {
    this.alias = this.blankAlias();
    this.syncAliasRouteJson();
    this.ensureRouteDefaults();
    this.aliasFormOpen = open;
  }

  deleteSelectedProviders() { this.deleteSelected(this.providers, row => this.api.deleteLlmProvider(row.id), 'providers'); }
  deleteSelectedModels() { this.deleteSelected(this.models, row => this.api.deleteLlmModel(row.id), 'models'); }
  deleteSelectedAliases() { this.deleteSelected(this.aliases, row => this.api.deleteLlmAlias(row.id), 'aliases'); }

  selectedCount(rows: any[]) { return rows.filter(row => this.selected[row.id]).length; }
  allSelected(rows: any[]) { return rows.length > 0 && this.selectedCount(rows) === rows.length; }
  toggleAll(rows: any[], checked: boolean) { rows.forEach(row => this.selected[row.id] = checked); }
  clearSelection() { this.selected = {}; }

  providerLabel(name: string) {
    return this.providers.find(p => p.name === name)?.displayName || this.providerMaster.find(p => p.name === name)?.displayName || name || '-';
  }

  modelOptionsFor(providerName: string) {
    return this.providerMaster.find(p => p.name === providerName)?.models || ['custom'];
  }

  modelsForProvider(providerName: string) {
    return this.models.filter(m => m.provider === providerName && m.enabled !== false);
  }

  firstModelFor(providerName: string) {
    return this.modelsForProvider(providerName)[0]?.model || this.modelOptionsFor(providerName)[0] || '';
  }

  money(value: any) {
    return `$${Number(value || 0).toFixed(6)}`;
  }

  private deleteSelected(rows: any[], deleteCall: (row: any) => any, label: string) {
    const selectedRows = rows.filter(row => this.selected[row.id]);
    if (!selectedRows.length || !confirm(`Delete ${selectedRows.length} selected ${label}?`)) return;
    forkJoin(selectedRows.map(row => deleteCall(row) || of(null))).subscribe(() => this.load());
  }

  private ensureRouteDefaults() {
    this.routeProvider = this.routeProvider && this.providers.some(p => p.name === this.routeProvider) ? this.routeProvider : (this.providers[0]?.name || 'openai');
    this.routeModel = this.modelsForProvider(this.routeProvider)[0]?.model || this.routeModel || this.firstModelFor(this.routeProvider);
    if (!this.alias.providerModelOrder?.length && this.routeProvider && this.routeModel) {
      this.alias.providerModelOrder = [`${this.routeProvider}:${this.routeModel}`];
      this.syncAliasRouteJson();
    }
  }

  private syncAliasRouteJson() {
    this.aliasRouteJson = JSON.stringify(this.alias.providerModelOrder || [], null, 2);
  }

  private safeJson(text: string, fallback: any) {
    try { return text?.trim() ? JSON.parse(text) : fallback; } catch { return fallback; }
  }

  private blankProvider() {
    return { name: 'openai', displayName: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKeySecretRef: 'OPENAI_API_KEY', enabled: true, config: {} };
  }

  private blankModel(provider = 'openai') {
    const firstModel = this.modelOptionsFor(provider)[0] || 'custom';
    return { provider, model: firstModel, displayName: firstModel, enabled: true, vision: false, inputPer1kUsd: 0.00015, outputPer1kUsd: 0.0006 };
  }

  private blankAlias() {
    return { aliasName: 'fast', providerModelOrder: ['openai:gpt-4o-mini'], enabled: true };
  }
}
