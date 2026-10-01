import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./admin.component.html',styleUrl:'./admin.component.scss'})
export class AdminComponent {
 auth=inject(AuthService); api=inject(ApiService); router=inject(Router); active='overview'; stats:any={}; shipments:any[]=[]; quotes:any[]=[]; enquiries:any[]=[]; customers:any[]=[]; deliveryPartners:any[]=[]; partnerForm={name:'',email:'',phone:'',password:''}; loading=true; message=''; selected:any=null; selectedPartnerId=''; assignmentLocation=''; update={status:'In Transit',location:'',message:''}; showNewShipment=false; newShipment:any={sender:{name:'',city:''},receiver:{name:'',city:''},service:'Air Cargo',packageType:'General Cargo',weight:null,eta:''};
 ngOnInit(){if(!this.auth.isAdmin()){this.router.navigateByUrl('/login');return;}this.load();}
 load(){const t=this.auth.token()!;this.loading=true;Promise.all([this.api.stats(t).toPromise(),this.api.shipments(t).toPromise(),this.api.quotes(t).toPromise(),this.api.enquiries(t).toPromise(),this.api.customers(t).toPromise(),this.api.deliveryPartners(t).toPromise()]).then(([s,sh,q,e,c,p])=>{this.stats=s||{};this.shipments=sh||[];this.quotes=q||[];this.enquiries=e||[];this.customers=c||[];this.deliveryPartners=p||[];this.loading=false;}).catch(()=>{this.loading=false;this.message='Session expired. Please sign in again.';});}
 partnerDisplayName(partner:any){ return typeof partner==='object' && partner ? (partner.name || 'Unassigned') : 'Unassigned'; }
 selectShipment(s:any){this.selected=s;this.selectedPartnerId=s.assignedPartner?._id||s.assignedPartner||'';this.assignmentLocation=s.receiver?.city||s.sender?.city||'';this.update={status:s.status,location:'',message:''};}
assignShipment(){if(!this.selected||!this.selectedPartnerId)return;this.api.assignShipment(this.selected._id,this.selectedPartnerId,this.assignmentLocation,this.auth.token()!).subscribe({next:s=>{this.selected=s;const partnerName = typeof s.assignedPartner === 'object' && s.assignedPartner ? (s.assignedPartner.name || 'delivery partner') : 'delivery partner';this.message=`Shipment ${s.awbNumber} assigned to ${partnerName}.`;this.load();},error:e=>this.message=e.error?.message||'Unable to assign shipment'});}
 createShipment(){const t=this.auth.token()!;this.api.createShipment(this.newShipment,t).subscribe({next:s=>{this.message=`Shipment ${s.awbNumber} created successfully.`;this.newShipment={sender:{name:'',city:''},receiver:{name:'',city:''},service:'Air Cargo',packageType:'General Cargo',weight:null,eta:''};this.showNewShipment=false;this.load();},error:e=>this.message=e.error?.message||'Unable to create shipment'});}
 updateStatus(){if(!this.selected)return;this.api.updateShipment(this.selected._id,this.update,this.auth.token()!).subscribe({next:s=>{this.message='Shipment status updated';this.selected=s;this.load();},error:e=>this.message=e.error?.message||'Update failed'});}
 createDeliveryPartner(){const t=this.auth.token()!;this.api.createDeliveryPartner(this.partnerForm,t).subscribe({next:p=>{this.message='Delivery partner created successfully';this.deliveryPartners=[p,...this.deliveryPartners];this.partnerForm={name:'',email:'',phone:'',password:''};},error:e=>this.message=e.error?.message||'Unable to create delivery partner'});}
 deleteDeliveryPartner(p:any){if(!confirm(`Delete delivery partner ${p.name}?`))return;this.api.deleteDeliveryPartner(p._id,this.auth.token()!).subscribe({next:()=>{this.message='Delivery partner deleted';this.deliveryPartners=this.deliveryPartners.filter(x=>x._id!==p._id);},error:e=>this.message=e.error?.message||'Unable to delete delivery partner'});}
 downloadReport(format: 'xlsx' | 'pdf'){
  const token=this.auth.token(); if(!token) return;
  fetch(`/api/admin/reports/deliveries.${format}`, { headers:{ Authorization:`Bearer ${token}` } }).then(async r=>{
    if(!r.ok) throw new Error('Report download failed');
    const blob=await r.blob();
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;
    a.download=`adarsh-cargo-delivery-report-${new Date().toISOString().slice(0,10)}.${format}`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }).catch(()=>this.message='Unable to download the report. Please sign in again.');
}
logout(){this.auth.logout();}
}
