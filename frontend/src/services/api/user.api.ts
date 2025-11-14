import { api } from './client';
import { tokenService } from '../tokenService';
import type {
  UserProfile,
  UpdateProfileRequest,
  Subscription,
  UpgradeSubscriptionRequest,
} from '../../types';

export const userAPI = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  // Back-compat wrappers -> delegate to subscriptionAPI endpoints
  getSubscription: async (): Promise<Subscription> => {
    const response = await api.get('/subscription/status');
    return response.data;
  },

  upgradeSubscription: async (
    data: UpgradeSubscriptionRequest
  ): Promise<Subscription> => {
    const response = await api.post('/subscription/upgrade', data);
    return response.data;
  },

  cancelSubscription: async (): Promise<void> => {
    await api.post('/subscription/cancel');
  },

  deleteAccount: async (): Promise<void> => {
    try {
      console.log('🗑️ Отправка запроса на удаление аккаунта');
      const response = await api.delete('/user/account');
      console.log('✅ Аккаунт успешно удален', response.data);
      tokenService.clearToken();
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка удаления аккаунта:', error);
      if (error.response?.status === 401)
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
      else if (error.response?.status === 404)
        throw new Error('Пользователь не найден.');
      else if (error.response?.data?.message)
        throw new Error(error.response.data.message);
      else throw new Error('Не удалось удалить аккаунт. Попробуйте позже.');
    }
  },
};
