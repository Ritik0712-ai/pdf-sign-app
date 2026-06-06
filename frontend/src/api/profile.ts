import api from './axios';

export const profileAPI = {
  getProfile: () => api.get('/profile'),
  
  updateProfile: (data: {
    name?: string;
    avatar_url?: string;
    phone?: string;
    company?: string;
  }) => api.patch('/profile', data),
};