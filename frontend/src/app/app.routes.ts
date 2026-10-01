import { Routes } from '@angular/router';
export const routes: Routes = [
 { path:'', loadComponent:()=>import('./pages/home/home.component').then(m=>m.HomeComponent), title:'Adarsh Cargo | Move with confidence' },
 { path:'about', loadComponent:()=>import('./pages/about/about.component').then(m=>m.AboutComponent), title:'About | Adarsh Cargo' },
 { path:'services', loadComponent:()=>import('./pages/services/services.component').then(m=>m.ServicesComponent), title:'Services | Adarsh Cargo' },
 { path:'track', loadComponent:()=>import('./pages/tracking/tracking.component').then(m=>m.TrackingComponent), title:'Track Shipment | Adarsh Cargo' },
 { path:'book', loadComponent:()=>import('./pages/booking/booking.component').then(m=>m.BookingComponent), title:'Book Shipment | Adarsh Cargo' },
 { path:'quote', loadComponent:()=>import('./pages/quote/quote.component').then(m=>m.QuoteComponent), title:'Get a Quote | Adarsh Cargo' },
 { path:'contact', loadComponent:()=>import('./pages/contact/contact.component').then(m=>m.ContactComponent), title:'Contact | Adarsh Cargo' },
 { path:'login', loadComponent:()=>import('./pages/auth/login.component').then(m=>m.LoginComponent), title:'Sign in | Adarsh Cargo' },
 { path:'forgot-password', loadComponent:()=>import('./pages/auth/forgot-password.component').then(m=>m.ForgotPasswordComponent), title:'Forgot Password | Adarsh Cargo' },
 { path:'reset-password', loadComponent:()=>import('./pages/auth/reset-password.component').then(m=>m.ResetPasswordComponent), title:'Reset Password | Adarsh Cargo' },
 { path:'change-password', loadComponent:()=>import('./pages/auth/change-password.component').then(m=>m.ChangePasswordComponent), title:'Change Password | Adarsh Cargo' },
 { path:'register', loadComponent:()=>import('./pages/auth/register.component').then(m=>m.RegisterComponent), title:'Create account | Adarsh Cargo' },
 { path:'admin', loadComponent:()=>import('./pages/admin/admin.component').then(m=>m.AdminComponent), title:'Admin Dashboard | Adarsh Cargo' },
 { path:'partner', loadComponent:()=>import('./pages/partner/partner.component').then(m=>m.PartnerComponent), title:'Delivery Partner | Adarsh Cargo' },
 { path:'**', redirectTo:'' }
];
