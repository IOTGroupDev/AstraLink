import { api } from './client';

export const userExtendedProfileAPI = {
  getUserProfile: async (): Promise<{
    user_id: string;
    bio?: string;
    gender?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    zodiac_sign?: string;

    // ✅ New DB columns
    looking_for?: string | null;
    looking_for_gender?: string | null;

    preferences: {
      interests?: string[];
      [key: string]: any;
    };
    last_active: string;
    is_onboarded: boolean;
    created_at: string;
    updated_at: string;
  }> => {
    const response = await api.get('/user/profile-extended');
    return response.data;
  },

  updateUserProfile: async (data: {
    bio?: string;
    gender?: string;
    city?: string;

    // ✅ New DB columns
    looking_for?: string | null;
    looking_for_gender?: string | null;

    preferences?: {
      interests?: string[];
      [key: string]: any;
    };
    is_onboarded?: boolean;
  }): Promise<any> => {
    const response = await api.put('/user/profile-extended', data);
    return response.data;
  },
};
