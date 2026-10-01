import { Router } from 'express';
import Shipment from '../models/Shipment.js';
import Quote from '../models/Quote.js';
import Enquiry from '../models/Enquiry.js';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';
import crypto from 'crypto';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
const router = Router();

async function generateAwb() {
  for (let i = 0; i < 10; i++) {
    // Compact 7-character AWB: AC + 5 random digits.
    const random = crypto.randomInt(10000, 100000);
    const awb = `AC${random}`;
    if (!(await Shipment.exists({ awbNumber: awb }))) return awb;
  }
  throw new Error('Unable to generate a unique AWB number');
}

router.use(requireAdmin);
router.get('/stats', async (_req,res)=>{
  const [shipments, quotes, enquiries, customers] = await Promise.all([
    Shipment.countDocuments(), Quote.countDocuments(), Enquiry.countDocuments(), User.countDocuments({role:'customer'})
  ]);
  res.json({ shipments, quotes, enquiries, customers });
});
router.get('/shipments', async (_req,res)=>res.json(await Shipment.find().populate('assignedPartner','name email phone active').sort({createdAt:-1}).limit(100).lean()));
router.get('/quotes', async (_req,res)=>res.json(await Quote.find().sort({createdAt:-1}).limit(100).lean()));
router.get('/enquiries', async (_req,res)=>res.json(await Enquiry.find().sort({createdAt:-1}).limit(100).lean()));
router.get('/customers', async (_req,res)=>res.json(await User.find({role:'customer'}).select('-passwordHash').sort({createdAt:-1}).limit(100).lean()));
router.get('/delivery-partners', async (_req,res)=>res.json(await User.find({role:'delivery_partner'}).select('-passwordHash -passwordResetTokenHash -passwordResetExpiresAt').sort({createdAt:-1}).limit(200).lean()));
router.post('/delivery-partners', async (req,res)=>{
  try {
    const {name,email,phone,password}=req.body || {};
    const normalizedEmail=email?.trim()?.toLowerCase();
    if(!name?.trim() || !normalizedEmail || !password || password.length < 6) return res.status(400).json({message:'Name, email and a password of at least 6 characters are required'});
    const exists=await User.findOne({email:normalizedEmail});
    if(exists) return res.status(409).json({message:'An account with this email already exists'});
    const bcrypt=(await import('bcryptjs')).default;
    const partner=await User.create({name:name.trim(),email:normalizedEmail,phone:phone?.trim(),passwordHash:await bcrypt.hash(password,12),role:'delivery_partner',active:true});
    res.status(201).json({id:partner._id,name:partner.name,email:partner.email,phone:partner.phone,role:partner.role,active:partner.active,createdAt:partner.createdAt});
  } catch(error){
    console.error('Delivery partner creation failed:',error);
    res.status(400).json({message:error?.message||'Unable to create delivery partner.'});
  }
});
router.delete('/delivery-partners/:id', async (req,res)=>{
  const partner=await User.findOneAndDelete({_id:req.params.id,role:'delivery_partner'});
  if(!partner) return res.status(404).json({message:'Delivery partner not found'});
  res.json({message:'Delivery partner deleted'});
});
router.post('/shipments', async (req,res)=>{
  try {
    const body = { ...req.body };
    if (!body.awbNumber) body.awbNumber = await generateAwb();
    if (!body.trackingHistory?.length) {
      body.trackingHistory = [{ status: body.status || 'Booked', location: body.sender?.city || '', message: 'Shipment created.', date: new Date() }];
    }
    res.status(201).json(await Shipment.create(body));
  } catch (error) {
    console.error('Admin shipment creation failed:', error);
    res.status(400).json({ message: error?.message || 'Unable to create shipment.' });
  }
});
router.patch('/shipments/:id/status', async (req,res)=>{
  const {status,location,message}=req.body;
  const shipment=await Shipment.findByIdAndUpdate(req.params.id,{status,$push:{trackingHistory:{status,location,message,date:new Date()}}},{new:true});
  if(!shipment)return res.status(404).json({message:'Shipment not found'});
  res.json(shipment);
});

router.patch('/shipments/:id/assign', async (req,res)=>{
  try {
    const { partnerId, location } = req.body || {};
    if (!partnerId) return res.status(400).json({ message:'A delivery partner is required.' });
    const partner = await User.findOne({ _id: partnerId, role:'delivery_partner', active:true });
    if (!partner) return res.status(404).json({ message:'Active delivery partner not found.' });
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ message:'Shipment not found' });
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message:'Authenticated administrator id is missing. Please sign in again.' });
    shipment.assignedPartner=partner._id;
    shipment.assignedAt=new Date();
    shipment.assignedBy=adminId;
    shipment.trackingHistory.push({ status:'Assigned', location:typeof location==='string'?location.trim():'', message:`Assigned to ${partner.name}.`, date:new Date() });
    await shipment.save();
    await shipment.populate('assignedPartner','name email phone active');
    res.json(shipment);
  } catch (error) {
    console.error('Shipment assignment failed:', error);
    res.status(400).json({ message:error?.message || 'Unable to assign shipment.' });
  }
});

router.get('/reports/deliveries.xlsx', async (_req, res) => {
  const shipments = await Shipment.find().populate('assignedPartner','name email phone').sort({ createdAt: -1 }).lean();
  const rows = shipments.map((s) => {
    const history = Array.isArray(s.trackingHistory) ? s.trackingHistory : [];
    const latest = history.length ? history[history.length - 1] : null;
    return {
      AWB: s.awbNumber,
      Sender: s.sender?.name || '',
      'Origin City': s.sender?.city || '',
      Receiver: s.receiver?.name || '',
      'Destination City': s.receiver?.city || '',
      Service: s.service || '',
      'Package Type': s.packageType || '',
      'Weight (kg)': s.weight ?? '',
      Status: s.status || '',
      'Delivery Partner': s.assignedPartner?.name || '',
      'Partner Phone': s.assignedPartner?.phone || '',
      'POD Receiver': s.pod?.receiverName || '',
      'POD Confirmation': s.pod?.confirmationType ? `${s.pod.confirmationType}: ${s.pod.confirmationReference || ''}` : '',
      ETA: s.eta ? new Date(s.eta).toISOString() : '',
      'Latest Location': latest?.location || '',
      'Latest Update': latest?.date ? new Date(latest.date).toISOString() : '',
      'Latest Message': latest?.message || '',
      'Tracking Events': history.length,
      'Created At': s.createdAt ? new Date(s.createdAt).toISOString() : ''
    };
  });
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ['ADARSH CARGO - DELIVERY REPORT'],
    ['Generated At', new Date().toISOString()],
    ['Total Shipments', shipments.length],
    [],
    ['Status', 'Count'],
    ...Object.entries(shipments.reduce((acc, s) => { acc[s.status || 'Unknown'] = (acc[s.status || 'Unknown'] || 0) + 1; return acc; }, {}))
  ]);
  const deliveries = XLSX.utils.json_to_sheet(rows);
  const historyRows = [];
  for (const s of shipments) for (const h of (s.trackingHistory || [])) historyRows.push({ AWB: s.awbNumber, Status: h.status, Location: h.location || '', Message: h.message || '', Date: h.date ? new Date(h.date).toISOString() : '' });
  const history = XLSX.utils.json_to_sheet(historyRows);
  XLSX.utils.book_append_sheet(workbook, summary, 'Summary');
  XLSX.utils.book_append_sheet(workbook, deliveries, 'Deliveries');
  XLSX.utils.book_append_sheet(workbook, history, 'Tracking History');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="adarsh-cargo-delivery-report-${new Date().toISOString().slice(0,10)}.xlsx"`);
  res.send(buffer);
});

router.get('/reports/deliveries.pdf', async (_req, res) => {
  const shipments = await Shipment.find()
    .populate('assignedPartner', 'name email phone')
    .populate('bookedBy', 'name email phone')
    .sort({ createdAt: -1 })
    .lean();

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="adarsh-cargo-consignment-notes-${new Date().toISOString().slice(0,10)}.pdf"`
  );
  doc.pipe(res);

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const navy = '#073b78';
  const deepNavy = '#0b2a5b';
  const orange = '#f47c20';
  const ink = '#12345a';
  const muted = '#345579';
  const line = '#7c98b4';
  const light = '#f7fafc';

  const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '';
  const fmtDateTime = (value) => value ? new Date(value).toLocaleString('en-IN') : '';
  const val = (value) => value === undefined || value === null ? '' : String(value);
  const first = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '') || '';

  function box(x, y, w, h, fill = null, stroke = line) {
    if (fill) doc.rect(x, y, w, h).fillAndStroke(fill, stroke);
    else doc.rect(x, y, w, h).strokeColor(stroke).stroke();
  }

  function cell(x, y, w, h, label, value = '', opts = {}) {
    box(x, y, w, h, opts.fill || null);
    doc.font('Helvetica-Bold').fontSize(opts.labelSize || 7.4).fillColor(muted)
      .text(label, x + 6, y + 5, { width: w - 12, lineBreak: false });
    if (val(value)) {
      doc.font('Helvetica-Bold').fontSize(opts.valueSize || 9.2).fillColor(ink)
        .text(val(value), x + 6, y + 19, { width: w - 12, height: h - 22, ellipsis: true });
    }
  }

  function multilineCell(x, y, w, h, label, value = '') {
    box(x, y, w, h);
    doc.font('Helvetica-Bold').fontSize(7.4).fillColor(muted)
      .text(label, x + 7, y + 6, { width: w - 14 });
    if (val(value)) {
      doc.font('Helvetica-Bold').fontSize(8.4).fillColor(ink)
        .text(val(value), x + 7, y + 20, { width: w - 14, height: h - 24, lineGap: 1.5, ellipsis: true });
    }
  }

  function barcodeLike(text, x, y, w, h) {
    const source = val(text) || 'AWB';
    let seed = 0;
    for (let i = 0; i < source.length; i++) seed = ((seed * 31) + source.charCodeAt(i)) >>> 0;
    let cursor = x;
    while (cursor < x + w) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const bar = 1 + (seed % 3);
      const gap = 1 + ((seed >>> 8) % 3);
      doc.rect(cursor, y, bar, h).fill(deepNavy);
      cursor += bar + gap;
    }
  }

  function iconMark(x, y, kind = 'pin') {
    doc.save();
    doc.fillColor(orange);
    if (kind === 'box') doc.roundedRect(x, y, 18, 18, 3).fill();
    else if (kind === 'history') doc.roundedRect(x, y, 16, 18, 3).fill();
    else doc.circle(x + 9, y + 9, 9).fill();
    doc.restore();
  }

  function footer() {
    const y = pageHeight - 38;
    doc.rect(0, y, pageWidth, 38).fill(deepNavy);
    doc.rect(0, y, pageWidth, 3).fill(orange);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
      .text('☎  +91 8948912884   |   +91 7011673129', 28, y + 14, { width: 205 });
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor('#fff')
      .text('KH. NO.-806/1, GROUND FLOOR, MAHIPALPUR,\nSOUTH WEST DELHI, DELHI - 110037', 245, y + 8, { width: 265, lineGap: 1 });
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor('#fff')
      .text('GSTIN: 07CWLPK4509H1ZD', 585, y + 14, { width: 125 });
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#fff')
      .text('Delivering India\nAcross India', 725, y + 5, { width: 88, align: 'right', lineGap: 0 });
  }

  function header(s) {
    const y = margin;
    const headerH = 82;
    box(margin, y, contentWidth, headerH, '#fff', navy);
    const logoPath = new URL('../../assets/branding/adarsh-cargo-logo.png', import.meta.url);
    try {
      doc.image(logoPath, margin + 8, y + 5, { fit: [285, 70], align: 'left', valign: 'center' });
    } catch {
      doc.font('Helvetica-Bold').fontSize(26).fillColor(navy).text('ADARSH', margin + 12, y + 17);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(orange).text('CARGO SERVICES', margin + 14, y + 49);
    }

    const noteW = 260;
    const noteX = margin + contentWidth - noteW - 8;
    doc.roundedRect(noteX, y + 6, noteW, 30, 5).fill(orange);
    doc.font('Helvetica-Bold').fontSize(17).fillColor('#fff')
      .text('CONSIGNMENT NOTE', noteX, y + 13, { width: noteW, align: 'center' });
    doc.rect(noteX, y + 39, 170, 34).fill(deepNavy);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#fff').text('AWB / DOCKET NO.', noteX + 10, y + 45);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#fff').text(val(s.awbNumber), noteX + 10, y + 56);
    box(noteX + 170, y + 39, 82, 34, '#fff', deepNavy);
    barcodeLike(s.awbNumber, noteX + 178, y + 44, 66, 22);
  }

  function drawShipmentPage(s, index) {
    const history = Array.isArray(s.trackingHistory) ? s.trackingHistory : [];
    const latest = history.length ? history[history.length - 1] : null;
    const partner = s.assignedPartner || {};
    const bookedBy = s.bookedBy || {};
    const pod = s.pod || {};

    header(s);
    let y = margin + 82;
    const rowH = 38;
    const widths = [130, 155, 165, 130, contentWidth - 580];
    let x = margin;
    [
      ['Origin', s.sender?.city],
      ['Destination', s.receiver?.city],
      ['Docket No.', s.awbNumber],
      ['Booking Date', fmtDate(s.createdAt)],
      ['Booking Person', bookedBy.name]
    ].forEach(([label, value], i) => { cell(x, y, widths[i], rowH, label, value); x += widths[i]; });

    y += rowH;
    const partyH = 82;
    const half = contentWidth / 2;
    multilineCell(margin, y, half, partyH, 'SHIPPER / SENDER', [s.sender?.name, s.sender?.city].filter(Boolean).join('\n'));
    multilineCell(margin + half, y, half, partyH, 'RECEIVER / CONSIGNEE', [s.receiver?.name, s.receiver?.city].filter(Boolean).join('\n'));
    y += partyH;

    const detailH = 52;
    const detailWidths = [88, 88, 92, 92, 104, 104, 110, contentWidth - 678];
    const details = [
      ['No. of Packages', ''],
      ['Item Count', ''],
      ['Actual Weight', s.weight ? `${s.weight} kg` : ''],
      ['Charged Weight', ''],
      ['Mode of Packaging', s.packageType],
      ['Mode of Payment', ''],
      ['Mode of Service', s.service],
      ['Status', s.status]
    ];
    x = margin;
    details.forEach(([label, value], i) => { cell(x, y, detailWidths[i], detailH, label, value, { valueSize: 8.2 }); x += detailWidths[i]; });
    y += detailH;

    const refH = 31;
    const refW = contentWidth / 3;
    cell(margin, y, refW, refH, 'Reference No.', '');
    cell(margin + refW, y, refW, refH, 'Declared Value', '');
    cell(margin + refW * 2, y, refW, refH, 'E-Waybill No.', '');
    y += refH;

    const descH = 61;
    const leftW = contentWidth * 0.48;
    iconMark(margin + 9, y + 27, 'box');
    multilineCell(margin, y, leftW, descH, 'DESCRIPTION / SHIPMENT DETAILS', [
      s.packageType,
      s.service,
      s.weight ? `Weight: ${s.weight} kg` : '',
      partner.name ? `Delivery Partner: ${partner.name}` : '',
      partner.phone ? `Partner Phone: ${partner.phone}` : ''
    ].filter(Boolean).join('\n'));

    const trackX = margin + leftW;
    const trackW = contentWidth - leftW;
    iconMark(trackX + 9, y + 27, 'pin');
    multilineCell(trackX, y, trackW, descH, 'LATEST TRACKING INFORMATION', [
      s.status ? `Status: ${s.status}` : '',
      latest?.location ? `Location: ${latest.location}` : '',
      latest?.date ? `Date: ${fmtDateTime(latest.date)}` : '',
      latest?.message ? `Update: ${latest.message}` : '',
      s.eta ? `ETA: ${fmtDate(s.eta)}` : ''
    ].filter(Boolean).join('\n'));
    y += descH;

    const podH = 58;
    multilineCell(margin, y, contentWidth * 0.50, podH, 'RECEIVED BY / PROOF OF DELIVERY', [
      pod.receiverName ? `Name: ${pod.receiverName}` : '',
      pod.receiverPhone ? `Phone: ${pod.receiverPhone}` : '',
      pod.confirmationType ? `Confirmation: ${pod.confirmationType}` : '',
      pod.confirmationReference ? `Reference: ${pod.confirmationReference}` : '',
      pod.deliveredAt ? `Delivered: ${fmtDateTime(pod.deliveredAt)}` : ''
    ].filter(Boolean).join('\n'));
    multilineCell(margin + contentWidth * 0.50, y, contentWidth * 0.50, podH, 'REMARKS / TERMS', [s.partnerRemarks || '', pod.remarks || ''].filter(Boolean).join('\n'));
    y += podH;

    const historyH = Math.max(80, pageHeight - 38 - y - 6);
    box(margin, y, contentWidth, historyH);
    iconMark(margin + 8, y + 8, 'history');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(muted).text('TRACKING HISTORY', margin + 31, y + 12);
    const columns = [
      ['DATE / TIME', 130],
      ['STATUS', 135],
      ['LOCATION', 165],
      ['MESSAGE', contentWidth - 430]
    ];
    let hx = margin + 8;
    let hy = y + 29;
    columns.forEach(([label, w]) => { doc.font('Helvetica-Bold').fontSize(7).fillColor(muted).text(label, hx, hy, { width: w }); hx += w; });
    hy += 12;
    const rows = Math.max(1, Math.floor((historyH - 46) / 11));
    const current = history.slice(-rows);
    current.forEach(h => {
      hx = margin + 8;
      const values = [fmtDateTime(h.date), h.status, h.location || '', h.message || ''];
      columns.forEach(([_, w], i) => {
        doc.font('Helvetica').fontSize(7).fillColor(ink).text(val(values[i]), hx, hy, { width: w - 5, height: 10, ellipsis: true });
        hx += w;
      });
      hy += 11;
    });

    footer();
  }

  function drawHistoryContinuation(s, index, pageIndex, historyEvents) {
    doc.addPage();
    header(s);
    const y = margin + 96;
    box(margin, y, contentWidth, pageHeight - y - 48);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(muted).text('TRACKING HISTORY — CONTINUATION', margin + 10, y + 10);
    const cols = [['DATE / TIME', 140], ['STATUS', 135], ['LOCATION', 165], ['MESSAGE', contentWidth - 440]];
    let x = margin + 8, cy = y + 30;
    cols.forEach(([label, w]) => { cell(x, cy, w, 25, label, '', { labelSize: 6.8 }); x += w; });
    cy += 25;
    historyEvents.forEach(h => {
      if (cy > pageHeight - 70) return;
      x = margin + 8;
      const vals = [fmtDateTime(h.date), h.status, h.location || '', h.message || ''];
      cols.forEach(([_, w], i) => {
        box(x, cy, w, 30);
        doc.font('Helvetica').fontSize(7.5).fillColor(ink).text(val(vals[i]), x + 5, cy + 8, { width: w - 10, height: 12, ellipsis: true });
        x += w;
      });
      cy += 30;
    });
    footer();
    doc.font('Helvetica').fontSize(6.5).fillColor(muted).text(`Shipment ${index + 1} • Tracking history continuation • Page ${pageIndex}`, margin, pageHeight - 49, { width: contentWidth, align: 'right' });
  }

  if (!shipments.length) {
    doc.font('Helvetica-Bold').fontSize(18).fillColor(navy).text('ADARSH CARGO SERVICES', margin, margin + 25);
    doc.font('Helvetica').fontSize(10).fillColor(muted).text('No shipment tracking records are available.', margin, margin + 55);
    footer();
  } else {
    shipments.forEach((shipment, index) => {
      if (index > 0) doc.addPage();
      drawShipmentPage(shipment, index);
      const history = Array.isArray(shipment.trackingHistory) ? shipment.trackingHistory : [];
      const firstPageRows = 5;
      if (history.length > firstPageRows) {
        const older = history.slice(0, history.length - firstPageRows);
        const rowsPerPage = 12;
        for (let offset = 0, pageIndex = 2; offset < older.length; offset += rowsPerPage, pageIndex++) {
          drawHistoryContinuation(shipment, index, pageIndex, older.slice(offset, offset + rowsPerPage));
        }
      }
    });
  }

  doc.end();
});

export default router;
