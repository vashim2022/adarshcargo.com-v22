import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  description: String,
  icon: String,
  accent: String,
  features: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Service', schema);
