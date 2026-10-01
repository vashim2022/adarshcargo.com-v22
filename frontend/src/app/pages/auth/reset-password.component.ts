import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./reset-password.component.html',styleUrl:'./auth.component.scss'})
export class ResetPasswordComponent {
  auth=inject(AuthService); route=inject(ActivatedRoute); router=inject(Router); password=''; confirm=''; token=''; error=''; message=''; busy=false;
  constructor(){this.token=this.route.snapshot.queryParamMap.get('token')||'';}
  submit(){this.error='';this.message='';if(!this.token){this.error='Reset token is missing or invalid.';return;}if(this.password!==this.confirm){this.error='Passwords do not match.';return;}this.busy=true;this.auth.resetPassword(this.token,this.password).subscribe({next:r=>{this.busy=false;this.message=r.message;setTimeout(()=>this.router.navigateByUrl('/login'),900);},error:e=>{this.busy=false;this.error=e.error?.message||'Unable to reset password';}})}
}
