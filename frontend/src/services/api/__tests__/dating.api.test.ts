import { datingAPI } from '../dating.api';
import { api } from '../client';

jest.mock('../client', () => ({ api: { post: jest.fn(), get: jest.fn() } }));
const post = jest.mocked(api.post);
const get = jest.mocked(api.get);

describe('dating discovery requests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests new profiles by default', async () => {
    get.mockResolvedValueOnce({ data: [] });

    await expect(datingAPI.getCandidates(20)).resolves.toEqual([]);

    expect(get).toHaveBeenCalledWith('/dating/candidates?limit=20');
  });

  it('explicitly requests reviewed profiles when restarting discovery', async () => {
    get.mockResolvedValueOnce({ data: [] });

    await datingAPI.getCandidates(20, true);

    expect(get).toHaveBeenCalledWith(
      '/dating/candidates?limit=20&includeReviewed=true'
    );
  });
});

describe('dating actions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the selected target and returns the confirmed result', async () => {
    const result = {
      success: true,
      matchId: 'match-id',
      message: 'Mutual match',
    };
    post.mockResolvedValueOnce({ data: result });

    await expect(datingAPI.like('target-id')).resolves.toEqual(result);
    expect(post).toHaveBeenCalledWith('/dating/like', {
      targetUserId: 'target-id',
      action: 'like',
    });
  });

  it('rejects the legacy HTTP 200 success:false response', async () => {
    post.mockResolvedValueOnce({
      data: { success: false, matchId: null, message: 'Like failed' },
    });

    await expect(datingAPI.like('target-id')).rejects.toThrow(
      'Dating action was not saved'
    );
  });

  it('propagates a failed request instead of reporting a saved like', async () => {
    post.mockRejectedValueOnce(new Error('Service unavailable'));

    await expect(datingAPI.like('target-id')).rejects.toThrow(
      'Service unavailable'
    );
  });
});
