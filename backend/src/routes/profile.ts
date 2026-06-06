import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get current user profile
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new AppError('Profile not found', 404);
    }

    res.json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
  }
});

// Update user profile
router.patch('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, avatar_url, phone, company } = req.body;

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        name,
        avatar_url,
        phone,
        company,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      throw new AppError('Failed to update profile', 500);
    }

    res.json({
      success: true,
      data: { profile },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }
});

export default router;