import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true }, email: String, phone: String,
  origin: String, destination: String, service: String, weight: Number,
  message: String, status: { type: String, default: 'new' }
}, { timestamps: true });
export default mongoose.model('Quote', schema);
