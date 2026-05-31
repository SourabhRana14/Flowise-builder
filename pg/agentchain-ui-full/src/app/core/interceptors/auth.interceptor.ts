import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private snack: MatSnackBar) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const suppressErrorSnackbar = req.headers.has('X-Suppress-Error-Snackbar');
    const suppressSuccessSnackbar = req.headers.has('X-Suppress-Success-Snackbar');
    const cleanReq = req.clone({
      headers: req.headers
        .delete('X-Suppress-Error-Snackbar')
        .delete('X-Suppress-Success-Snackbar')
    });
    const token = this.getAccessToken();
    const authReq = token ? cleanReq.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : cleanReq;

    return next.handle(authReq).pipe(
      tap(event => {
        if (event instanceof HttpResponse && !suppressSuccessSnackbar) {
          const message = this.successMessage(cleanReq);
          if (message) {
            this.snack.open(message, 'Dismiss', { duration: 2500, panelClass: ['success-snackbar'] });
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        const message = this.errorMessage(error);
        if (!suppressErrorSnackbar) {
          this.snack.open(message, 'Dismiss', { duration: 7000, panelClass: ['error-snackbar'] });
        }
        if (error.status === 401 && !req.url.includes('/auth/login')) {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  private getAccessToken(): string | null {
    const candidates = [localStorage.getItem('accessToken'), localStorage.getItem('token')];
    for (const candidate of candidates) {
      const cleaned = this.cleanToken(candidate);
      if (this.looksLikeJwt(cleaned)) return cleaned;
    }
    return null;
  }

  private cleanToken(token: string | null): string {
    if (!token) return '';
    let cleaned = token.replace(/^Bearer\s*/i, '').replace(/\r?\n|\r/g, '').trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed === 'string') cleaned = parsed;
      if (parsed?.accessToken || parsed?.token) cleaned = String(parsed.accessToken || parsed.token);
    } catch {
      // Keep the cleaned string.
    }
    return cleaned.replace(/^Bearer\s*/i, '').replace(/\r?\n|\r/g, '').trim();
  }

  private looksLikeJwt(token: string): boolean {
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body: any = error.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.detail) return String(body.detail);
    if (body?.message) return String(body.message);
    if (body?.error) return String(body.error);
    return `API request failed${error.status ? ` (${error.status})` : ''}`;
  }

  private successMessage(req: HttpRequest<any>): string {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return '';

    const path = this.path(req.url);
    const match = this.crudResource(path);
    if (!match) return '';

    if (method === 'DELETE') return `${match} deleted successfully`;
    if (method === 'POST') return `${match} created successfully`;
    return `${match} updated successfully`;
  }

  private crudResource(path: string): string {
    const rules: Array<[RegExp, string]> = [
      [/^\/api\/agents(?:\/[^/]+)?$/, 'Agent'],
      [/^\/api\/agents\/import$/, 'Agent'],
      [/^\/api\/llm\/providers(?:\/[^/]+)?$/, 'LLM provider'],
      [/^\/api\/llm\/models(?:\/[^/]+)?$/, 'LLM model'],
      [/^\/api\/llm\/aliases(?:\/[^/]+)?$/, 'LLM alias'],
      [/^\/api\/prompts(?:\/[^/]+)?$/, 'Prompt'],
      [/^\/api\/prompts\/[^/]+\/versions$/, 'Prompt version'],
      [/^\/api\/tools(?:\/[^/]+)?$/, 'Tool'],
      [/^\/api\/mcp\/servers(?:\/[^/]+)?$/, 'MCP server'],
      [/^\/api\/memory\/configs(?:\/[^/]+)?$/, 'Memory config'],
      [/^\/api\/rag\/collections(?:\/[^/]+)?$/, 'Knowledge collection'],
      [/^\/api\/rag\/collections\/[^/]+\/documents\/[^/]+$/, 'Knowledge document'],
      [/^\/api\/credentials(?:\/[^/]+)?$/, 'Credential'],
      [/^\/api\/observability\/alerts(?:\/[^/]+)?$/, 'Alert'],
      [/^\/api\/users(?:\/[^/]+)?$/, 'User']
    ];
    return rules.find(([regex]) => regex.test(path))?.[1] || '';
  }

  private path(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url.split('?')[0];
    }
  }
}
