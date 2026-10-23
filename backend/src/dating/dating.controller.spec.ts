import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { SupabaseService } from '../supabase/supabase.service';
import { DatingController } from './dating.controller';
import { DatingService } from './dating.service';

describe('Dating discovery query', () => {
  let app: INestApplication;
  const candidates = jest.fn().mockResolvedValue([]);
  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: 'caller-id' } },
    error: null,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DatingController],
      providers: [
        {
          provide: DatingService,
          useValue: { getCandidatesViaSupabase: candidates },
        },
        { provide: SupabaseService, useValue: { getUser } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it.each([
    ['', false],
    ['&includeReviewed=false', false],
    ['&includeReviewed=true', true],
  ])(
    'parses replay query %s and forwards the verified Bearer token',
    async (query, expected) => {
      await request(app.getHttpServer())
        .get(`/dating/candidates?limit=20${query}`)
        .set('Authorization', 'Bearer caller-token')
        .expect(200, []);

      expect(getUser).toHaveBeenCalledWith('caller-token');
      expect(candidates).toHaveBeenCalledWith('caller-token', 20, expected);
    },
  );

  it('rejects invalid replay flags instead of treating any string as true', async () => {
    await request(app.getHttpServer())
      .get('/dating/candidates?includeReviewed=invalid')
      .set('Authorization', 'Bearer caller-token')
      .expect(400);
    expect(candidates).not.toHaveBeenCalled();
  });

  it('requires a Bearer token for replay requests', async () => {
    await request(app.getHttpServer())
      .get('/dating/candidates?includeReviewed=true')
      .expect(401);
    expect(candidates).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });
});
