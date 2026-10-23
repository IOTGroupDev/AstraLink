import { invalidateLocalAuthSession } from '../authInvalidation';
import { queryClient } from '../../providers/QueryProvider';
import { supabase } from '../supabase';
import { tokenService } from '../tokenService';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { useChartStore } from '../../stores/chart.store';
import { useSubscriptionStore } from '../../stores/subscription.store';

jest.mock('../supabase', () => ({
  supabase: { auth: { signOut: jest.fn().mockResolvedValue({ error: null }) } },
}));
jest.mock('../tokenService', () => ({
  tokenService: { clearToken: jest.fn().mockResolvedValue(undefined) },
}));

describe('forced auth invalidation', () => {
  it('clears private query data and all user stores before another sign-in', async () => {
    queryClient.setQueryData(['profile', 'old-user'], {
      name: 'Private old profile',
    });
    useOnboardingStore.getState().setName('Old name');
    useChartStore.setState({ error: 'Old chart state' });
    useSubscriptionStore.setState({ error: 'Old subscription state' });

    await invalidateLocalAuthSession('test invalidation');

    expect(tokenService.clearToken).toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(queryClient.getQueryData(['profile', 'old-user'])).toBeUndefined();
    expect(useOnboardingStore.getState().data.name).toBeUndefined();
    expect(useChartStore.getState().error).toBeNull();
    expect(useSubscriptionStore.getState().error).toBeNull();
  });
});
