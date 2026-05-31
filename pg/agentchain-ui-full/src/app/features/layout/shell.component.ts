import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  template: `
    <mat-toolbar class="app-toolbar">
      <button mat-icon-button (click)="snav.toggle()" title="Show or hide menu"><mat-icon>menu</mat-icon></button>
      <div class="brand">
        <strong>AgentChain</strong>
        <span>Agent builder platform</span>
      </div>
      <span class="spacer"></span>
      <a mat-button routerLink="/studio" routerLinkActive="top-active"><mat-icon>auto_awesome</mat-icon>Build</a>
      <a mat-button routerLink="/chat" routerLinkActive="top-active"><mat-icon>play_circle</mat-icon>Try</a>
      <button mat-button (click)="auth.logout()"><mat-icon>logout</mat-icon>Logout</button>
    </mat-toolbar>
    <mat-sidenav-container class="shell">
      <mat-sidenav #snav mode="side" opened>
        <div class="nav-intro">
          <strong>Workspace</strong>
          <span>Build, test, publish, and monitor agents.</span>
        </div>
        <mat-nav-list>
          <ng-container *ngFor="let group of navGroups">
            <div class="nav-group" *ngIf="visibleItems(group).length">{{group.title}}</div>
            <a mat-list-item *ngFor="let item of visibleItems(group)" [routerLink]="item.link" routerLinkActive="active-link">
              <mat-icon>{{item.icon}}</mat-icon>
              <span>{{item.label}}</span>
              <small>{{item.help}}</small>
            </a>
          </ng-container>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content><router-outlet></router-outlet></mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-toolbar{background:#12324a;color:#fff;border-bottom:1px solid rgba(255,255,255,.12);gap:8px}
    .brand{display:flex;flex-direction:column;line-height:1.1;margin-left:4px}
    .brand strong{font-size:17px;letter-spacing:0}
    .brand span{font-size:12px;color:#c9d7e4}
    .shell{height:calc(100vh - 64px)}
    mat-sidenav{width:288px;background:#fbfcfe;border-right:1px solid #dbe3ee}
    mat-sidenav-content{background:#f5f7fb}
    mat-icon{margin-right:12px}
    .spacer{flex:1}
    .nav-intro{padding:18px 18px 10px;display:flex;flex-direction:column;gap:3px;color:#102033}
    .nav-intro span{font-size:12px;color:#617086;line-height:1.35}
    .nav-group{font-size:11px;font-weight:800;text-transform:uppercase;color:#718096;letter-spacing:.08em;padding:18px 18px 6px}
    a[mat-list-item]{height:58px!important;margin:2px 10px;border-radius:8px;color:#1b3148}
    a[mat-list-item] span{font-weight:700;font-size:14px}
    a[mat-list-item] small{display:block;color:#6b7a90;font-size:11px;line-height:1.2;margin-top:2px}
    a[mat-list-item].active-link{background:#e8f2ff;color:#0d4b89}
    .app-toolbar button mat-icon,.app-toolbar a mat-icon{margin-right:6px}
    .app-toolbar a{color:#fff;text-decoration:none}
    .app-toolbar a.top-active{background:rgba(255,255,255,.14)}
  `]
})
export class ShellComponent {
  navGroups = [
    {
      title: 'Build',
      items: [
        { link: '/studio', icon: 'auto_awesome', label: 'Agent Studio', help: 'Create and improve agents', roles: ['ADMIN', 'DEVELOPER'] },
        { link: '/templates', icon: 'dashboard_customize', label: 'Templates', help: 'Ready-made agent starters', roles: ['ADMIN', 'DEVELOPER'] },
        { link: '/agents', icon: 'account_tree', label: 'Agent Library', help: 'Drafts, versions, packages', roles: ['ADMIN', 'DEVELOPER'] },
        { link: '/chat', icon: 'chat', label: 'Try Agent', help: 'Run a conversation', roles: ['ADMIN', 'DEVELOPER', 'VIEWER'] }
      ]
    },
    {
      title: 'Configure',
      items: [
        { link: '/tools', icon: 'build', label: 'Tools', help: 'APIs, MCP, Postman imports', roles: ['ADMIN', 'DEVELOPER'] },
        { link: '/llm', icon: 'smart_toy', label: 'Models', help: 'Providers, aliases, router', roles: ['ADMIN', 'DEVELOPER'] },
        { link: '/credentials', icon: 'key', label: 'Connections', help: 'Secrets and auth profiles', roles: ['ADMIN'] },
        { link: '/prompts', icon: 'article', label: 'Prompts', help: 'Reusable instructions', roles: ['ADMIN', 'DEVELOPER'] },
        { link: '/rag', icon: 'storage', label: 'Knowledge', help: 'Documents and search', roles: ['ADMIN', 'DEVELOPER'] },
        { link: '/memory', icon: 'memory', label: 'Memory', help: 'Conversation recall', roles: ['ADMIN', 'DEVELOPER'] }
      ]
    },
    {
      title: 'Operate',
      items: [
        { link: '/observability/traces', icon: 'timeline', label: 'Traces', help: 'Runs, steps, replay', roles: ['ADMIN', 'DEVELOPER', 'VIEWER'] },
        { link: '/observability/cost', icon: 'paid', label: 'Cost', help: 'Tokens and spend', roles: ['ADMIN', 'DEVELOPER', 'VIEWER'] },
        { link: '/observability/health', icon: 'health_and_safety', label: 'Health', help: 'Runtime service status', roles: ['ADMIN', 'DEVELOPER', 'VIEWER'] },
        { link: '/regression', icon: 'rule', label: 'Tests', help: 'Scenario regression', roles: ['ADMIN', 'DEVELOPER'] },
        { link: '/publish-approvals', icon: 'approval', label: 'Approvals', help: 'Publish review queue', roles: ['ADMIN'] },
        { link: '/alerts', icon: 'notifications', label: 'Alerts', help: 'Failures and budgets', roles: ['ADMIN'] }
      ]
    },
    {
      title: 'Admin',
      items: [
        { link: '/admin', icon: 'admin_panel_settings', label: 'Users & Access', help: 'Roles and tenant setup', roles: ['ADMIN'] }
      ]
    }
  ];
  visibleItems(group: any) {
    const role = this.auth.role;
    if (role === 'ADMIN') return group.items || [];
    return (group.items || []).filter((item: any) => !item.roles || item.roles.includes(role));
  }
  constructor(public auth: AuthService) {}
}
