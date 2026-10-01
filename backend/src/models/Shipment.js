import mongoose from 'mongoose';
const eventSchema = new mongoose.Schema({
  status: String,
  location: String,
  message: String,
  date: { type: Date, default: Date.now }
}, { _id: false });
const podSchema = new mongoose.Schema({
  receiverName: String,
  receiverPhone: String,
  confirmationType: { type: String, enum: ['signature','otp','photo','other'], default: 'other' },
  confirmationReference: String,
  remarks: String,
  deliveredAt: Date,
  capturedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });
const schema = new mongoose.Schema({
  awbNumber: { type: String, unique: true, required: true, uppercase: true, trim: true },
  sender: { name: String, city: String },
  receiver: { name: String, city: String },
  service: String,
  packageType: String,
  weight: Number,
  status: { type: String, default: 'Booked' },
  eta: Date,
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: Date,
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  pickupAt: Date,
  outForDeliveryAt: Date,
  deliveredAt: Date,
  failedDeliveryReason: String,
  partnerRemarks: String,
  pod: { type: podSchema, default: null },
  trackingHistory: [eventSchema]
}, { timestamps: true });
export default mongoose.model('Shipment', schema);
