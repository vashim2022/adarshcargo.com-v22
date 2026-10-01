import jwt from 'jsonwebtoken';
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    // Support tokens issued by older project versions as well as current tokens.
    // Older builds may have stored the authenticated user's id as userId or _id.
    req.user.id = req.user.id || req.user.userId || req.user._id;
    if (!req.user.id) return res.status(401).json({ message: 'Invalid authentication token: user id is missing' });
    next();
  }
  catch { return res.status(401).json({ message: 'Invalid or expired token' }); }
}
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  });
}

export function requireDeliveryPartner(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'delivery_partner') return res.status(403).json({ message: 'Delivery partner access required' });
    next();
  });
}
