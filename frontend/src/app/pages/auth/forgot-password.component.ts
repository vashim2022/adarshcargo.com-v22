import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./forgot-password.component.html',styleUrl:'./auth.component.scss'})
export class ForgotPasswordComponent {
  auth=inject(AuthService); email=''; error=''; message=''; devResetUrl=''; busy=false;
  submit(){this.error='';this.message='';this.devResetUrl='';this.busy=true;this.auth.forgotPassword(this.email).subscribe({next:r=>{this.busy=false;this.message=r.message;this.devResetUrl=r.devResetUrl||'';},error:e=>{this.busy=false;this.error=e.error?.message||'Unable to process the request';}})}
}
