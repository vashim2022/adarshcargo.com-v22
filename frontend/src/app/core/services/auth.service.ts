import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
@Injectable({providedIn:'root'})
export class AuthService {
  private http=inject(HttpClient); private router=inject(Router);
  private key='adarshcargo_token'; private userKey='adarshcargo_user';
  token(){ return localStorage.getItem(this.key); }
  user(){ try{return JSON.parse(localStorage.getItem(this.userKey)||'null');}catch{return null;} }
  login(payload:any){ return this.http.post<any>('/api/auth/login',payload).pipe(tap(r=>this.save(r))); }
  register(payload:any){ return this.http.post<any>('/api/auth/register',payload).pipe(tap(r=>this.save(r))); }
  save(r:any){localStorage.setItem(this.key,r.token);localStorage.setItem(this.userKey,JSON.stringify(r.user));}
  logout(){localStorage.removeItem(this.key);localStorage.removeItem(this.userKey);this.router.navigateByUrl('/login');}
  isLoggedIn(){return !!this.token();}
  isAdmin(){return this.user()?.role==='admin';}
  isDeliveryPartner(){return this.user()?.role==='delivery_partner';}
  forgotPassword(email:string){ return this.http.post<any>('/api/auth/forgot-password',{email}); }
  resetPassword(token:string,password:string){ return this.http.post<any>('/api/auth/reset-password',{token,password}); }
  changePassword(currentPassword:string,newPassword:string){ const token=this.token(); return this.http.post<any>('/api/auth/change-password',{currentPassword,newPassword},{headers:{Authorization:`Bearer ${token}`}}); }
}
