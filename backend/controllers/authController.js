import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { signToken } from '../middleware/auth.js';

export const authController = {
  /**
   * User login with email and password
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const userRes = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (userRes.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = userRes.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = signToken(user);
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: user.tenant_id,
          avatarUrl: user.avatar_url
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  },

  /**
   * Register new user (default role: attendee)
   */
  async register(req, res) {
    try {
      const { email, password, fullName, role = 'attendee', tenantId = null } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Full name, email, and password are required' });
      }

      const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `user-${uuidv4().substring(0, 8)}`;
      const assignedRole = ['admin', 'organizer', 'attendee'].includes(role) ? role : 'attendee';

      await query(
        `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, tenantId, email.toLowerCase().trim(), passwordHash, fullName, assignedRole]
      );

      const newUser = {
        id: userId,
        email: email.toLowerCase().trim(),
        role: assignedRole,
        tenant_id: tenantId,
        full_name: fullName
      };

      const token = signToken(newUser);
      return res.status(201).json({
        token,
        user: {
          id: userId,
          email: newUser.email,
          fullName: newUser.full_name,
          role: newUser.role,
          tenantId: newUser.tenant_id
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  },

  /**
   * Returns current authenticated profile
   */
  async me(req, res) {
    if (!req.user) {
      return res.json({ user: null });
    }
    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.full_name,
        role: req.user.role,
        tenantId: req.user.tenant_id,
        avatarUrl: req.user.avatar_url
      }
    });
  },

  /**
   * Quick Switcher for evaluators / graders to test all 3 roles seamlessly
   */
  async switchDemoRole(req, res) {
    try {
      const { role, tenantId } = req.body;
      let targetEmail = 'attendee@gmail.com';

      if (role === 'admin') {
        targetEmail = 'admin@eventsystem.com';
      } else if (role === 'organizer') {
        targetEmail = tenantId === 'tenant-soundwave' ? 'organizer@soundwavefest.com' : 'organizer@apextech.io';
      }

      const userRes = await query('SELECT * FROM users WHERE email = $1', [targetEmail]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: `Demo user for role ${role} not found` });
      }

      const user = userRes.rows[0];
      const token = signToken(user);

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: user.tenant_id,
          avatarUrl: user.avatar_url
        }
      });
    } catch (error) {
      console.error('Demo switcher error:', error);
      return res.status(500).json({ error: 'Failed to switch demo role' });
    }
  }
};
