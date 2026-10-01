import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
@Component({standalone:true,imports:[FormsModule,NgIf],templateUrl:'./quote.component.html',styleUrl:'./quote.component.scss'}) export class QuoteComponent { api=inject(ApiService); sent=false; loading=false; form={name:'',email:'',phone:'',origin:'',destination:'',service:'Air Cargo',weight:null as number|null,message:''}; submit(){this.loading=true;this.api.quote(this.form).subscribe({next:()=>{this.sent=true;this.loading=false},error:()=>this.loading=false})} }
