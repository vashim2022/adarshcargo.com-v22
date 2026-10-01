import { Router } from 'express';
import Shipment from '../models/Shipment.js';
import { requireDeliveryPartner } from '../middleware/auth.js';

const router = Router();
router.use(requireDeliveryPartner);
const operationalStatuses = ['Picked Up','In Transit','At Hub','Out for Delivery','Delivered','Delivery Failed','Rescheduled'];
const allowedTransitions = {
  Booked:['Picked Up','Delivery Failed','Rescheduled'],
  Assigned:['Picked Up','Delivery Failed','Rescheduled'],
  'Picked Up':['In Transit','Delivery Failed','Rescheduled'],
  'In Transit':['At Hub','Out for Delivery','Delivery Failed','Rescheduled'],
  'At Hub':['In Transit','Out for Delivery','Delivery Failed','Rescheduled'],
  'Out for Delivery':['Delivered','Delivery Failed','Rescheduled'],
  'Rescheduled':['Picked Up','In Transit','Out for Delivery','Delivery Failed'],
  'Delivery Failed':['Rescheduled','Picked Up'],
  Delivered:[]
};

router.get('/dashboard', async (req,res)=>{
  const partnerId=req.user.id;
  const [assigned,pickedUp,inTransit,outForDelivery,delivered,failed] = await Promise.all([
    Shipment.countDocuments({assignedPartner:partnerId, status:{$nin:['Delivered','Delivery Failed']}}),
    Shipment.countDocuments({assignedPartner:partnerId, status:'Picked Up'}),
    Shipment.countDocuments({assignedPartner:partnerId, status:'In Transit'}),
    Shipment.countDocuments({assignedPartner:partnerId, status:'Out for Delivery'}),
    Shipment.countDocuments({assignedPartner:partnerId, status:'Delivered'}),
    Shipment.countDocuments({assignedPartner:partnerId, status:'Delivery Failed'})
  ]);
  res.json({assigned,pickedUp,inTransit,outForDelivery,delivered,failed});
});

router.get('/shipments', async (req,res)=>{
  res.json(await Shipment.find({assignedPartner:req.user.id}).sort({updatedAt:-1}).limit(200).lean());
});

router.patch('/shipments/:id/status', async (req,res)=>{
  const {status,location,message,failedReason}=req.body||{};
  if(!operationalStatuses.includes(status)) return res.status(400).json({message:'Invalid delivery status.'});
  const shipment=await Shipment.findOne({_id:req.params.id,assignedPartner:req.user.id});
  if(!shipment) return res.status(404).json({message:'Shipment is not assigned to you.'});
  if(!allowedTransitions[shipment.status]?.includes(status)) return res.status(400).json({message:`Cannot move shipment from ${shipment.status} to ${status}.`});
  if(status==='Delivered' && !shipment.pod?.receiverName) return res.status(400).json({message:'Capture proof of delivery before marking the shipment delivered.'});
  shipment.status=status;
  if(status==='Picked Up' && !shipment.pickupAt) shipment.pickupAt=new Date();
  if(status==='Out for Delivery' && !shipment.outForDeliveryAt) shipment.outForDeliveryAt=new Date();
  if(status==='Delivered') shipment.deliveredAt=new Date();
  if(status==='Delivery Failed') shipment.failedDeliveryReason=failedReason?.trim() || message?.trim() || 'Delivery failed';
  if(message) shipment.partnerRemarks=message.trim();
  shipment.trackingHistory.push({status,location:location?.trim()||'',message:message?.trim()||`Status updated by ${req.user.name}.`,date:new Date()});
  await shipment.save();
  res.json(shipment);
});

router.post('/shipments/:id/pod', async (req,res)=>{
  const {receiverName,receiverPhone,confirmationType,confirmationReference,remarks}=req.body||{};
  if(!receiverName?.trim()) return res.status(400).json({message:'Receiver name is required for proof of delivery.'});
  if(!confirmationType || !confirmationReference?.trim()) return res.status(400).json({message:'Capture a confirmation type and reference (signature, OTP, photo reference or other proof).'});
  const shipment=await Shipment.findOne({_id:req.params.id,assignedPartner:req.user.id});
  if(!shipment) return res.status(404).json({message:'Shipment is not assigned to you.'});
  shipment.pod={receiverName:receiverName.trim(),receiverPhone:receiverPhone?.trim()||'',confirmationType,confirmationReference:confirmationReference.trim(),remarks:remarks?.trim()||'',deliveredAt:new Date(),capturedBy:req.user.id};
  shipment.trackingHistory.push({status:shipment.status==='Delivered'?'Delivered':'POD Captured',location:shipment.receiver?.city||'',message:`POD captured from ${receiverName.trim()}.`,date:new Date()});
  await shipment.save();
  res.json(shipment);
});

router.post('/shipments/:id/exception', async (req,res)=>{
  const {reason,location,message}=req.body||{};
  if(!reason?.trim()) return res.status(400).json({message:'A delivery exception reason is required.'});
  const shipment=await Shipment.findOne({_id:req.params.id,assignedPartner:req.user.id});
  if(!shipment) return res.status(404).json({message:'Shipment is not assigned to you.'});
  shipment.status='Delivery Failed';
  shipment.failedDeliveryReason=reason.trim();
  shipment.partnerRemarks=message?.trim()||'';
  shipment.trackingHistory.push({status:'Delivery Failed',location:location?.trim()||'',message:message?.trim()||reason.trim(),date:new Date()});
  await shipment.save();
  res.json(shipment);
});

export default router;
