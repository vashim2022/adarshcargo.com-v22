import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, ServiceItem } from '../../core/services/api.service';
@Component({standalone:true,imports:[RouterLink,CommonModule],templateUrl:'./services.component.html',styleUrl:'./services.component.scss'}) export class ServicesComponent { api=inject(ApiService); services:ServiceItem[]=[]; constructor(){this.api.services().subscribe(r=>this.services=r)} }
