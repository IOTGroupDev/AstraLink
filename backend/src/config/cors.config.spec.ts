import { Module, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as request from 'supertest';
import { getCorsConfig } from './cors.config';

@Module({})
class CorsTestModule {}

describe('browser locale preflight', () => {
  const original = { ...process.env };
  let app: INestApplication;
  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS =
      ' https://web.example.com, https://other.example.com ';
    app = await NestFactory.create(CorsTestModule, { logger: false });
    app.enableCors(getCorsConfig());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    process.env = original;
  });
  it('allows the real Authorization/x-locale/Accept-Language request headers', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/user/profile')
      .set('Origin', 'https://web.example.com')
      .set('Access-Control-Request-Method', 'GET')
      .set(
        'Access-Control-Request-Headers',
        'authorization,x-locale,accept-language',
      )
      .expect(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://web.example.com',
    );
    expect(
      String(response.headers['access-control-allow-headers']).toLowerCase(),
    ).toContain('x-locale');
  });
  it('does not authorize arbitrary browser origins', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/user/profile')
      .set('Origin', 'https://attacker.example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
