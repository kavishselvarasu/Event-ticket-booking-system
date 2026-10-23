import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'event_reservation_jwt_secret_key_2026';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user record
    const result = await query('SELECT id, tenant_id, email, full_name, role, avatar_url FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      req.user = null;
      return next();
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    // If token invalid or expired, continue as unauthenticated guest
    req.user = null;
    next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication token required for this action'
    });
  }
  next();
}
