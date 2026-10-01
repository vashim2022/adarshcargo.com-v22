import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./change-password.component.html',styleUrl:'./auth.component.scss'})
export class ChangePasswordComponent {
  auth=inject(AuthService); router=inject(Router); currentPassword='';newPassword='';confirm='';error='';message='';busy=false;
  submit(){this.error='';this.message='';if(this.newPassword!==this.confirm){this.error='New passwords do not match.';return;}this.busy=true;this.auth.changePassword(this.currentPassword,this.newPassword).subscribe({next:r=>{this.busy=false;this.message=r.message;this.currentPassword='';this.newPassword='';this.confirm='';},error:e=>{this.busy=false;if(e.status===401){this.auth.logout();}this.error=e.error?.message||'Unable to change password';}})}
}
