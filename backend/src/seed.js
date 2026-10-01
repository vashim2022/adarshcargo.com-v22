import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/database.js';
import Service from './models/Service.js';
import Shipment from './models/Shipment.js';
import User from './models/User.js';
await connectDatabase();
await Service.deleteMany({});
await Service.insertMany([
 { title:'Air Cargo', slug:'air-cargo', icon:'✈', accent:'Sky', description:'Priority air freight for time-sensitive domestic and international consignments.', features:['Priority handling','Airport-to-airport','Door delivery options'] },
 { title:'Road Freight', slug:'road-freight', icon:'▰', accent:'Road', description:'Flexible surface transportation for part loads, full loads and distribution.', features:['Pan-India lanes','FTL & PTL','Scheduled movement'] },
 { title:'Express Logistics', slug:'express-logistics', icon:'⚡', accent:'Express', description:'Fast, trackable movement for urgent commercial shipments.', features:['Live tracking','Fast pickup','Proof of delivery'] },
 { title:'Door-to-Door', slug:'door-to-door', icon:'⌂', accent:'Door', description:'A single coordinated journey from pickup point to final destination.', features:['Pickup scheduling','Single point contact','Delivery updates'] }
]);
await Shipment.deleteMany({ awbNumber:'AC100200300' });
await Shipment.create({ awbNumber:'AC100200300', sender:{name:'Adarsh Exports',city:'Mumbai'}, receiver:{name:'North Star Retail',city:'Delhi'}, service:'Air Cargo', packageType:'Commercial', weight:48, status:'In Transit', eta:new Date(Date.now()+86400000*2), trackingHistory:[
 {status:'Booked',location:'Mumbai',message:'Shipment booked and label generated',date:new Date(Date.now()-86400000*2)},
 {status:'Picked Up',location:'Mumbai',message:'Cargo picked up from sender',date:new Date(Date.now()-86400000)},
 {status:'In Transit',location:'Mumbai Hub',message:'Shipment departed origin hub',date:new Date()}
]});
const email = process.env.ADMIN_EMAIL || 'admin@adarshcargo.com';
const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
const passwordHash = await bcrypt.hash(password,12);
await User.findOneAndUpdate(
  { email },
  { $set: { name:'Adarsh Cargo Admin', email, passwordHash, role:'admin', active:true, passwordResetTokenHash:null, passwordResetExpiresAt:null } },
  { upsert:true, new:true, setDefaultsOnInsert:true }
);
console.log(`Seed complete. Demo AWB: AC100200300. Admin: ${email}`);
process.exit(0);
