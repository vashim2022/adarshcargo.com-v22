import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/database.js';
import Service from './models/Service.js';
import User from './models/User.js';

await connectDatabase();

const services = [
  { title:'Air Cargo', slug:'air-cargo', icon:'✈', accent:'Sky', description:'Priority air freight for time-sensitive domestic and international consignments.', features:['Priority handling','Airport-to-airport','Door delivery options'] },
  { title:'Road Freight', slug:'road-freight', icon:'▰', accent:'Road', description:'Flexible surface transportation for part loads, full loads and distribution.', features:['Pan-India lanes','FTL & PTL','Scheduled movement'] },
  { title:'Express Logistics', slug:'express-logistics', icon:'⚡', accent:'Express', description:'Fast, trackable movement for urgent commercial shipments.', features:['Live tracking','Fast pickup','Proof of delivery'] },
  { title:'Door-to-Door', slug:'door-to-door', icon:'⌂', accent:'Door', description:'A single coordinated journey from pickup point to final destination.', features:['Pickup scheduling','Single point contact','Delivery updates'] }
];
for (const service of services) {
  await Service.findOneAndUpdate({slug:service.slug}, {$set:service}, {upsert:true, new:true, setDefaultsOnInsert:true});
}

const email = process.env.ADMIN_EMAIL || 'admin@adarshcargo.com';
const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
const existing = await User.findOne({email});
if (!existing) {
  await User.create({name:'Adarsh Cargo Admin', email, passwordHash:await bcrypt.hash(password,12), role:'admin', active:true});
}
console.log(`Seed data ensured. Services: ${services.length}. Admin: ${email}`);
await import('mongoose').then(({default:mongoose})=>mongoose.disconnect());
