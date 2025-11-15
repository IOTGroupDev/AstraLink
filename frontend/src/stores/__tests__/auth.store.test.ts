// Auth Store tests
import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../auth.store';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set user on login', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
    };

    act(() => {
      result.current.setUser(mockUser as any);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should clear user on logout', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
    };

    act(() => {
      result.current.setUser(mockUser as any);
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should update onboarding completion status', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.onboardingCompleted).toBe(false);

    act(() => {
      result.current.setOnboardingCompleted(true);
    });

    expect(result.current.onboardingCompleted).toBe(true);
  });
});
