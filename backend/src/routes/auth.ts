import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Register - Create user in Supabase Auth
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    // Create user via sign up
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      console.error('Supabase Auth error:', error);
      throw new AppError(error.message || 'Failed to create user', 400);
    }

    if (!data.user) {
      throw new AppError('Failed to create user', 500);
    }

    const user = data.user;

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: name,
          email: user.email,
        },
        token,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Registration failed' });
    }
  }
});

// Login - Verify with Supabase Auth
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Sign in with email/password
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!data.user) {
      throw new AppError('Login failed', 500);
    }

    const user = data.user;

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0],
          email: user.email,
        },
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

    // Get user from Supabase Auth
    const { data: userData, error } = await supabaseAdmin.auth.getUserById(decoded.userId);

    if (error || !userData.user) {
      throw new AppError('User not found', 404);
    }

    const user = userData.user;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0],
          email: user.email,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  }
});

export default router;
