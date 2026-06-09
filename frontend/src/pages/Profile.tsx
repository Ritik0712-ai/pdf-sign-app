import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../api/profile';
import { supabase } from '../api/supabase';

export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    profileAPI.getProfile()
      .then((res) => {
        if (res.data.success) {
          const profile = res.data.data.profile;
          setName(profile.name || '');
          setPhone(profile.phone || '');
          setCompany(profile.company || '');
          setAvatarUrl(profile.avatar_url || '');
        }
      })
      .catch((err) => console.error('Failed to load profile:', err));
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `${session.user.id}/${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      setAvatarUrl(publicUrl);

      // Update profile with new avatar URL
      await profileAPI.updateProfile({ avatar_url: publicUrl });
      setSuccess('Profile photo updated!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await profileAPI.updateProfile({ name, phone, company, avatar_url: avatarUrl });
      if (res.data.success) {
        setSuccess('Profile updated successfully!');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          <div 
            className="relative cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200">
                {name ? name[0].toUpperCase() : user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs">📷</span>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{name || 'User'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-primary hover:underline mt-1"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Change photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Your company name"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}