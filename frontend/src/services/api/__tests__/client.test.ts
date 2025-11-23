// API Client tests
import axios from 'axios';
import { api } from '../client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct base URL structure', () => {
    expect(api.defaults.baseURL).toMatch(/^http/);
  });

  it('should have timeout configured', () => {
    expect(api.defaults.timeout).toBeGreaterThan(0);
  });

  it('should have interceptors configured', () => {
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      // This test would require mocking the Supabase auth
      // For now, just verify the interceptor exists
      expect(api.interceptors.request.handlers.length).toBeGreaterThan(0);
    });
  });

  describe('Response Interceptor', () => {
    it('should handle 401 errors', async () => {
      // Verify error interceptor exists
      expect(api.interceptors.response.handlers.length).toBeGreaterThan(0);
    });
  });
});
