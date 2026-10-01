import { Router } from 'express';
import crypto from 'crypto';
import Shipment from '../models/Shipment.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
const router = Router();

async function generateAwb() {
  for (let i = 0; i < 10; i++) {
    // Compact 7-character AWB: AC + 5 random digits.
    const random = crypto.randomInt(10000, 100000);
    const awb = `AC${random}`;
    const exists = await Shipment.exists({ awbNumber: awb });
    if (!exists) return awb;
  }
  throw new Error('Unable to generate a unique AWB number');
}

router.get('/track/:awb', async (req, res) => {
  const shipment = await Shipment.findOne({ awbNumber: req.params.awb.toUpperCase() })
    .select('awbNumber sender receiver service packageType weight status eta trackingHistory createdAt updatedAt')
    .lean();
  if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
  res.json(shipment);
});

// Customer parcel booking: AWB is generated server-side and returned immediately.
router.post('/book', requireAuth, async (req, res) => {
  try {
    const { sender, receiver, service, packageType, weight, eta } = req.body || {};
    if (!sender?.name || !sender?.city || !receiver?.name || !receiver?.city || !service || !weight) {
      return res.status(400).json({ message: 'Sender, receiver, service and weight are required.' });
    }
    const awbNumber = await generateAwb();
    const shipment = await Shipment.create({
      awbNumber,
      bookedBy: req.user.id,
      sender,
      receiver,
      service,
      packageType: packageType || 'General Cargo',
      weight: Number(weight),
      status: 'Booked',
      eta: eta ? new Date(eta) : undefined,
      trackingHistory: [{ status: 'Booked', location: sender.city, message: 'Shipment booking created.', date: new Date() }]
    });
    res.status(201).json({
      message: 'Shipment booked successfully.',
      awbNumber: shipment.awbNumber,
      trackingUrl: `${process.env.PUBLIC_WEB_URL || 'http://localhost'}/track?awb=${encodeURIComponent(shipment.awbNumber)}`,
      shipment
    });
  } catch (error) {
    console.error('Booking failed:', error);
    res.status(500).json({ message: 'Unable to book shipment right now.' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const body = { ...req.body };
  if (!body.awbNumber) body.awbNumber = await generateAwb();
  if (!body.trackingHistory?.length) body.trackingHistory = [{ status: body.status || 'Booked', location: body.sender?.city || '', message: 'Shipment created.', date: new Date() }];
  res.status(201).json(await Shipment.create(body));
});

router.patch('/:id/status', requireAdmin, async (req, res) => {
  const { status, location, message } = req.body;
  const shipment = await Shipment.findByIdAndUpdate(req.params.id, { status, $push: { trackingHistory: { status, location, message, date: new Date() } } }, { new: true });
  if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
  res.json(shipment);
});
export default router;
