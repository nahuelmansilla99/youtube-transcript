import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptController } from './transcript.controller';
import { TranscriptService } from './transcript.service';

describe('TranscriptController', () => {
  let controller: TranscriptController;
  let service: TranscriptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranscriptController],
      providers: [
        {
          provide: TranscriptService,
          useValue: {
            extractText: jest.fn().mockResolvedValue({
              transcript: 'Texto de prueba transcrito',
              langUsed: 'es-419',
              fallbackApplied: true,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<TranscriptController>(TranscriptController);
    service = module.get<TranscriptService>(TranscriptService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTranscript', () => {
    it('should return transcript object successfully with langUsed and fallbackApplied', async () => {
      const dto = { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', lang: 'es', fallback: true };
      const result = await controller.getTranscript(dto);

      expect(service.extractText).toHaveBeenCalledWith(dto.url, 'es', true);
      expect(result).toEqual({
        success: true,
        transcript: 'Texto de prueba transcrito',
        langUsed: 'es-419',
        fallbackApplied: true,
      });
    });
  });
});
