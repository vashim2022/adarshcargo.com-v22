import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent {
  api = inject(ApiService);
  auth = inject(AuthService);
  router = inject(Router);
  busy = false;
  error = '';
  booked: any = null;
  form = {
    sender: { name: '', city: '' },
    receiver: { name: '', city: '' },
    service: 'Air Cargo',
    packageType: 'General Cargo',
    weight: null as number | null,
    eta: ''
  };

  ngOnInit() {
    if (!this.auth.isLoggedIn()) this.router.navigateByUrl('/login');
  }

  submit() {
    if (!this.auth.token()) { this.router.navigateByUrl('/login'); return; }
    this.error = '';
    this.busy = true;
    this.api.bookShipment(this.form, this.auth.token()!).subscribe({
      next: result => { this.booked = result; this.busy = false; },
      error: err => { this.error = err.error?.message || 'Unable to book your parcel.'; this.busy = false; }
    });
  }

  track() {
    if (this.booked?.awbNumber) this.router.navigate(['/track'], { queryParams: { awb: this.booked.awbNumber } });
  }
}
