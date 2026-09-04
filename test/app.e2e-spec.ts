import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('TranscriptController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/youtube/extract (POST) - should return 400 when url is missing', () => {
    return request(app.getHttpServer())
      .post('/youtube/extract')
      .send({})
      .expect(400);
  });

  it('/youtube/extract (POST) - should return 400 when url is invalid', () => {
    return request(app.getHttpServer())
      .post('/youtube/extract')
      .send({ url: 'not-a-valid-url' })
      .expect(400);
  });

  it('/youtube/extract (POST) - should return 400 when fallback is not a boolean', () => {
    return request(app.getHttpServer())
      .post('/youtube/extract')
      .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', fallback: 'invalid-boolean' })
      .expect(400);
  });
});
