import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  const testUser = {
    fullName: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'Test@1234',
    phone: '01712345678',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('should login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(201);

    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('should refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('should get current user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.email).toBe(testUser.email);
  });

  it('should logout', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(201);
  });
});