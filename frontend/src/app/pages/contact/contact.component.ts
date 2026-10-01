import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
@Component({standalone:true,imports:[FormsModule,NgIf],templateUrl:'./contact.component.html',styleUrl:'./contact.component.scss'}) export class ContactComponent { api=inject(ApiService); sent=false; form={name:'',email:'',phone:'',message:''}; submit(){this.api.enquiry(this.form).subscribe({next:()=>this.sent=true})} }
