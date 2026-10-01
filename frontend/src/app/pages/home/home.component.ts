import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, ServiceItem } from '../../core/services/api.service';
@Component({standalone:true,imports:[RouterLink,CommonModule],templateUrl:'./home.component.html',styleUrl:'./home.component.scss'})
export class HomeComponent { api=inject(ApiService); services:ServiceItem[]=[]; stats:any[]=[]; loading=true; constructor(){this.api.home().subscribe({next:r=>{this.services=r.services;this.stats=r.stats;this.loading=false},error:()=>this.loading=false})} }
