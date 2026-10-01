import { Router } from 'express';
import Quote from '../models/Quote.js';
import Enquiry from '../models/Enquiry.js';
const router = Router();
router.post('/quotes', async (req, res) => {
  const quote = await Quote.create(req.body);
  res.status(201).json({ message: 'Quote request received', id: quote._id });
});
router.post('/enquiries', async (req, res) => {
  const enquiry = await Enquiry.create(req.body);
  res.status(201).json({ message: 'Enquiry received', id: enquiry._id });
});
export default router;
