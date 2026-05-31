import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService, private router: Router) {}

  get token() { return this.cleanToken(localStorage.getItem('accessToken')) || this.cleanToken(localStorage.getItem('token')); }
  get isLoggedIn() { return !!this.token; }
  get role() { return String(localStorage.getItem('role') || 'ADMIN').toUpperCase(); }
  hasRole(...roles: string[]) { return roles.map(r => r.toUpperCase()).includes(this.role); }

  login(email: string, password: string) {
    return this.api.login(email, password).pipe(tap(r => {
      const token = this.cleanToken(String(r.accessToken || r.token || ''));
      if (token) {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('token', token);
      }
      if (r.refreshToken) localStorage.setItem('refreshToken', String(r.refreshToken).trim());
      localStorage.setItem('role', r.role || 'ADMIN');
      if (r.userId) localStorage.setItem('userId', String(r.userId));
      if (r.name) localStorage.setItem('name', String(r.name));
      this.router.navigateByUrl('/agents');
    }));
  }

  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/login');
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
}
