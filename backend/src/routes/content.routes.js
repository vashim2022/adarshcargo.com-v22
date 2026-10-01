import { Router } from 'express';
import Service from '../models/Service.js';
const router = Router();
router.get('/home', async (_req, res) => {
  const services = await Service.find({ active: true }).sort({ createdAt: 1 }).lean();
  res.json({
    brand: 'Adarsh Cargo',
    domain: 'adarshcargo.com',
    headline: 'Move freight with confidence.',
    subheadline: 'Reliable cargo solutions across India and beyond — tracked, transparent and built around your business.',
    stats: [{ value: '99.2%', label: 'On-time movement' }, { value: '28+', label: 'Active routes' }, { value: '24/7', label: 'Shipment visibility' }, { value: '15k+', label: 'Shipments handled' }],
    services
  });
});
router.get('/services', async (_req, res) => res.json(await Service.find({ active: true }).sort({ createdAt: 1 }).lean()));
export default router;
