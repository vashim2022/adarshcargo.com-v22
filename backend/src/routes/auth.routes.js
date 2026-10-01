import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
const router = Router();

const publicUrl = (process.env.PUBLIC_WEB_URL || 'http://localhost').replace(/\/$/, '');
const allowDevResetLink = String(process.env.RESET_ALLOW_DEV_LINK || 'false') === 'true';
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
}) : null;

async function sendResetEmail(user, resetUrl) {
  if (!mailer || !process.env.SMTP_FROM) {
    console.log(`[PASSWORD RESET] ${user.email}: ${resetUrl}`);
    return false;
  }
  await mailer.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: 'Reset your Adarsh Cargo password',
    text: `Hello ${user.name},\n\nUse this link to reset your Adarsh Cargo password:\n${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Hello ${user.name},</p><p>Use the button below to reset your Adarsh Cargo password.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#0b3d91;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`
  });
  return true;
}

const sign = user => jwt.sign({ id: user._id.toString(), email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: 'Name, email and a password of at least 6 characters are required' });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists' });
  const user = await User.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 12), role: 'customer' });
  res.status(201).json({ token: sign(user), user: { id:user._id, name:user.name, email:user.email, role:user.role } });
});
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.trim()?.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, active: true });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
  res.json({ token: sign(user), user: { id:user._id, name:user.name, email:user.email, role:user.role } });
});
router.post('/forgot-password', async (req, res) => {
  const email = req.body?.email?.toLowerCase()?.trim();
  const generic = { message: 'If an account exists for this email, a password reset link has been sent.' };
  if (!email) return res.json(generic);
  const user = await User.findOne({ email, active: true });
  if (!user) return res.json(generic);
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const resetUrl = `${publicUrl}/reset-password?token=${rawToken}`;
  try {
    const emailed = await sendResetEmail(user, resetUrl);
    res.json({ ...generic, ...(emailed ? {} : (allowDevResetLink ? { devResetUrl: resetUrl } : {})) });
  } catch (error) {
    console.error('Password reset email failed:', error);
    res.status(500).json({ message: 'Unable to send the password reset email right now.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || password.length < 6) return res.status(400).json({ message: 'A valid reset token and a password of at least 6 characters are required.' });
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetTokenHash: hash, passwordResetExpiresAt: { $gt: new Date() }, active: true });
  if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();
  res.json({ message: 'Password changed successfully. You can now sign in.' });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Current password and a new password of at least 6 characters are required.' });
  if (currentPassword === newPassword) return res.status(400).json({ message: 'New password must be different from your current password.' });
  const user = await User.findOne({ _id: req.user.id, active: true });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ message: 'Current password is incorrect.' });
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();
  res.json({ message: 'Password changed successfully.' });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ message:'User not found' });
  res.json(user);
});
export default router;
