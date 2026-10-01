import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./login.component.html',styleUrl:'./auth.component.scss'})
export class LoginComponent { auth=inject(AuthService); router=inject(Router); form={email:'',password:''}; error=''; busy=false;
 submit(){this.error='';this.busy=true;this.auth.login(this.form).subscribe({next:r=>{this.busy=false;this.router.navigateByUrl(r.user.role==='admin'?'/admin':r.user.role==='delivery_partner'?'/partner':'/');},error:e=>{this.busy=false;this.error=e.error?.message||'Unable to sign in';}})} }
