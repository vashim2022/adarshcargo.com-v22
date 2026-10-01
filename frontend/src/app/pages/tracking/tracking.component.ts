import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { ApiService, Shipment } from '../../core/services/api.service';
@Component({standalone:true,imports:[FormsModule,NgIf,NgFor,DatePipe],templateUrl:'./tracking.component.html',styleUrl:'./tracking.component.scss'}) export class TrackingComponent { api=inject(ApiService); route=inject(ActivatedRoute); awb=''; shipment?:Shipment; error=''; loading=false; ngOnInit(){const awb=this.route.snapshot.queryParamMap.get('awb'); if(awb){this.awb=awb; this.track();}} track(){this.error='';this.shipment=undefined;if(!this.awb.trim())return;this.loading=true;this.api.track(this.awb.trim()).subscribe({next:s=>{this.shipment=s;this.loading=false},error:e=>{this.error=e.error?.message||'Shipment not found. Check the AWB number.';this.loading=false}})} }
