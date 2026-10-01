import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ServiceItem {
  _id?: string;
  title: string;
  slug: string;
  description: string;
  icon?: string;
  accent?: string;
  features?: string[];
  active?: boolean;
}

export interface TrackingEvent {
  status: string;
  location: string;
  message: string;
  date: string | Date;
}

export interface ShipmentParty {
  name: string;
  city: string;
}

export interface Shipment {
  _id?: string;
  awbNumber: string;
  sender: ShipmentParty;
  receiver: ShipmentParty;
  service: string;
  packageType?: string;
  weight?: number;
  status: string;
  eta?: string | Date;
  trackingHistory: TrackingEvent[];
  assignedPartner?: { _id?: string; name?: string; email?: string; phone?: string; active?: boolean } | string | null;
  assignedAt?: string | Date;
  pickupAt?: string | Date;
  outForDeliveryAt?: string | Date;
  deliveredAt?: string | Date;
  failedDeliveryReason?: string;
  partnerRemarks?: string;
  pod?: { receiverName?: string; receiverPhone?: string; confirmationType?: string; confirmationReference?: string; remarks?: string; deliveredAt?: string | Date };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  home() { return this.http.get<{ services: ServiceItem[]; stats: { value: string; label: string }[] }>('/api/content/home'); }
  services() { return this.http.get<ServiceItem[]>('/api/content/services'); }
  track(awb: string) { return this.http.get<Shipment>(`/api/shipments/track/${encodeURIComponent(awb)}`); }
  bookShipment(body: any, token: string) { return this.http.post<any>('/api/shipments/book', body, { headers: { Authorization: `Bearer ${token}` } }); }
  quote(body: any) { return this.http.post('/api/quotes', body); }
  enquiry(body: any) { return this.http.post('/api/enquiries', body); }
  stats(token: string) { return this.http.get<any>('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }); }
  shipments(token: string) { return this.http.get<Shipment[]>('/api/admin/shipments', { headers: { Authorization: `Bearer ${token}` } }); }
  updateShipment(id: string, body: any, token: string) { return this.http.patch<Shipment>(`/api/admin/shipments/${id}/status`, body, { headers: { Authorization: `Bearer ${token}` } }); }
  createShipment(body: any, token: string) { return this.http.post<Shipment>('/api/admin/shipments', body, { headers: { Authorization: `Bearer ${token}` } }); }
  quotes(token: string) { return this.http.get<any[]>('/api/admin/quotes', { headers: { Authorization: `Bearer ${token}` } }); }
  enquiries(token: string) { return this.http.get<any[]>('/api/admin/enquiries', { headers: { Authorization: `Bearer ${token}` } }); }
  customers(token: string) { return this.http.get<any[]>('/api/admin/customers', { headers: { Authorization: `Bearer ${token}` } }); }
  deliveryPartners(token: string) { return this.http.get<any[]>('/api/admin/delivery-partners', { headers: { Authorization: `Bearer ${token}` } }); }
  createDeliveryPartner(body: any, token: string) { return this.http.post<any>('/api/admin/delivery-partners', body, { headers: { Authorization: `Bearer ${token}` } }); }
  deleteDeliveryPartner(id: string, token: string) { return this.http.delete<any>(`/api/admin/delivery-partners/${id}`, { headers: { Authorization: `Bearer ${token}` } }); }
  assignShipment(id: string, partnerId: string, location: string, token: string) { return this.http.patch<Shipment>(`/api/admin/shipments/${id}/assign`, { partnerId, location }, { headers: { Authorization: `Bearer ${token}` } }); }
  partnerDashboard(token: string) { return this.http.get<any>('/api/partner/dashboard', { headers: { Authorization: `Bearer ${token}` } }); }
  partnerShipments(token: string) { return this.http.get<Shipment[]>('/api/partner/shipments', { headers: { Authorization: `Bearer ${token}` } }); }
  partnerUpdateStatus(id: string, body: any, token: string) { return this.http.patch<Shipment>(`/api/partner/shipments/${id}/status`, body, { headers: { Authorization: `Bearer ${token}` } }); }
  partnerCapturePod(id: string, body: any, token: string) { return this.http.post<Shipment>(`/api/partner/shipments/${id}/pod`, body, { headers: { Authorization: `Bearer ${token}` } }); }
  partnerException(id: string, body: any, token: string) { return this.http.post<Shipment>(`/api/partner/shipments/${id}/exception`, body, { headers: { Authorization: `Bearer ${token}` } }); }
}
