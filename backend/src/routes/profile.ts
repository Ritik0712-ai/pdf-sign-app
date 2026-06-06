import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Get current user profile - creates profile if not exists
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new AppError('Invalid token', 401);
    }

    const userId = user.id;

    // Check if profile exists
    let { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // If no profile, create one
    if (error || !profile) {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          name: name,
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Create profile error:', createError);
        throw new AppError('Failed to create profile', 500);
      }

      profile = newProfile;
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
router.patch('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new AppError('Invalid token', 401);
    }

    const userId = user.id;
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