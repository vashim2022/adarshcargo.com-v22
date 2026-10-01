import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, Shipment } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './partner.component.html',
  styleUrl: './partner.component.scss'
})
export class PartnerComponent {
  auth=inject(AuthService); api=inject(ApiService); router=inject(Router);
  loading=true; message=''; dashboard:any={}; shipments:Shipment[]=[]; selected:Shipment|null=null;
  statusForm={status:'Picked Up',location:'',message:'',failedReason:''};
  podForm={receiverName:'',receiverPhone:'',confirmationType:'signature',confirmationReference:'',remarks:''};
  exceptionForm={reason:'',location:'',message:''};

  ngOnInit(){
    if(!this.auth.isDeliveryPartner()){ this.router.navigateByUrl(this.auth.isAdmin()?'/admin':'/login'); return; }
    this.load();
  }
  load(){
    const t=this.auth.token()!; this.loading=true;
    Promise.all([this.api.partnerDashboard(t).toPromise(),this.api.partnerShipments(t).toPromise()])
      .then(([d,s])=>{this.dashboard=d||{};this.shipments=s||[];this.loading=false;})
      .catch(e=>{this.loading=false;this.message=e?.error?.message||'Unable to load your delivery work.';});
  }
  select(s:Shipment){
    this.selected=s;
    const operational=['Picked Up','In Transit','At Hub','Out for Delivery','Delivered','Delivery Failed','Rescheduled'];
    this.statusForm={status:operational.includes(s.status)?s.status:'Picked Up',location:s.receiver?.city||'',message:'',failedReason:s.failedDeliveryReason||''};
    this.podForm={receiverName:s.pod?.receiverName||s.receiver?.name||'',receiverPhone:s.pod?.receiverPhone||'',confirmationType:(s.pod?.confirmationType as any)||'signature',confirmationReference:s.pod?.confirmationReference||'',remarks:s.pod?.remarks||''};
    this.exceptionForm={reason:s.failedDeliveryReason||'',location:s.receiver?.city||'',message:s.partnerRemarks||''};
  }
  updateStatus(){
    if(!this.selected)return;
    this.api.partnerUpdateStatus(this.selected._id!,this.statusForm,this.auth.token()!).subscribe({next:s=>{this.selected=s;this.message='Shipment status updated successfully.';this.load();},error:e=>this.message=e.error?.message||'Unable to update shipment status.'});
  }
  capturePod(){
    if(!this.selected)return;
    this.api.partnerCapturePod(this.selected._id!,this.podForm,this.auth.token()!).subscribe({next:s=>{this.selected=s;this.message='Proof of delivery captured.';this.load();},error:e=>this.message=e.error?.message||'Unable to capture POD.'});
  }
  reportException(){
    if(!this.selected)return;
    this.api.partnerException(this.selected._id!,this.exceptionForm,this.auth.token()!).subscribe({next:s=>{this.selected=s;this.message='Delivery exception recorded.';this.load();},error:e=>this.message=e.error?.message||'Unable to record delivery exception.'});
  }
  allowedNextStatuses(status:string){
    const map:any={
      Booked:['Picked Up','Delivery Failed'],
      Assigned:['Picked Up','Delivery Failed'],
      'Picked Up':['In Transit','Delivery Failed'],
      'In Transit':['At Hub','Out for Delivery','Delivery Failed'],
      'At Hub':['In Transit','Out for Delivery','Delivery Failed'],
      'Out for Delivery':['Delivered','Delivery Failed'],
      Rescheduled:['Picked Up','In Transit','Out for Delivery','Delivery Failed'],
      'Delivery Failed':['Rescheduled','Picked Up'],
      Delivered:[]
    };
    return map[status]||[];
  }
  quickStatus(status:string){
    if(!this.selected)return;
    if(status==='Delivered' && !this.selected.pod?.receiverName){
      this.message='Capture Proof of Delivery first, then mark the shipment Delivered.';
      return;
    }
    const location=this.statusForm.location?.trim()||this.selected.receiver?.city||'';
    const body={status,location,message:this.statusForm.message?.trim()||`Shipment marked ${status} by delivery partner.`};
    this.api.partnerUpdateStatus(this.selected._id!,body,this.auth.token()!).subscribe({
      next:s=>{this.selected=s;this.statusForm.status=s.status;this.statusForm.location=location;this.statusForm.message='';this.message=`Shipment ${s.awbNumber} moved to ${s.status}.`;this.load();},
      error:e=>this.message=e.error?.message||'Unable to update shipment status.'
    });
  }
  refresh(){this.load();}
  logout(){this.auth.logout();}
}
