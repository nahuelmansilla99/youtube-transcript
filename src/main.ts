import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS
  app.enableCors();

  // Validaciones globales de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Configuración de OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('YouTube Transcript API')
    .setDescription('Microservicio para extraer transcripciones de subtítulos de videos de YouTube')
    .setVersion('1.0.0')
    .addTag('youtube')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'YouTube Transcript API - Swagger Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Servidor ejecutándose en: http://localhost:${port}`);
  logger.log(`Documentación de Swagger disponible en: http://localhost:${port}/api`);
}

bootstrap();
