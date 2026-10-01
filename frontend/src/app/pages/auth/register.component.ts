import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./register.component.html',styleUrl:'./auth.component.scss'})
export class RegisterComponent { auth=inject(AuthService); router=inject(Router); form={name:'',email:'',phone:'',password:''}; error=''; busy=false;
 submit(){this.error='';this.busy=true;this.auth.register(this.form).subscribe({next:()=>{this.busy=false;this.router.navigateByUrl('/');},error:e=>{this.busy=false;this.error=e.error?.message||'Unable to create account';}})} }
