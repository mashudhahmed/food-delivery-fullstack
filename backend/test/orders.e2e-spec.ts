import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let customerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    // Login as a test customer first (you need a seeded customer)
    // const loginRes = await request(app.getHttpServer())
    //   .post('/api/auth/login')
    //   .send({ email: 'customer@test.com', password: '...' });
    // customerToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject order without auth', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .send({})
      .expect(401);
  });
});