import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptService } from './transcript.service';
import { BadRequestException } from '@nestjs/common';

describe('TranscriptService', () => {
  let service: TranscriptService;
  let mockGetInfo: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TranscriptService],
    }).compile();

    service = module.get<TranscriptService>(TranscriptService);
    jest.clearAllMocks();

    mockGetInfo = jest.fn();
    jest.spyOn(service as any, 'getInnertube').mockResolvedValue({
      getInfo: mockGetInfo,
    });

    // Mock fetchCaptionText on the service instance
    jest.spyOn(service as any, 'fetchCaptionText').mockImplementation(async (trackUrl: string) => {
      if (trackUrl.includes('es-419')) return 'Subtítulos en español latino';
      if (trackUrl.includes('es')) return 'Hola mundo';
      if (trackUrl.includes('ja')) return 'こんにちは世界';
      return 'Generic transcript text';
    });
  });

  it('should return transcript with exact requested language if available', async () => {
    mockGetInfo.mockResolvedValueOnce({
      captions: {
        caption_tracks: [
          { language_code: 'es', base_url: 'https://youtube.com/timedtext?lang=es' },
          { language_code: 'en', base_url: 'https://youtube.com/timedtext?lang=en' },
        ],
      },
    });

    const result = await service.extractText('https://youtube.com/watch?v=12345678901', 'es', true);

    expect(result).toEqual({
      transcript: 'Hola mundo',
      langUsed: 'es',
      fallbackApplied: false,
    });
  });

  it('should fallback to regional variant (es-419) when exact lang (es) is not present', async () => {
    mockGetInfo.mockResolvedValueOnce({
      captions: {
        caption_tracks: [
          { language_code: 'es-419', base_url: 'https://youtube.com/timedtext?lang=es-419' },
          { language_code: 'en', base_url: 'https://youtube.com/timedtext?lang=en' },
        ],
      },
    });

    const result = await service.extractText('https://youtube.com/watch?v=12345678901', 'es', true);

    expect(result).toEqual({
      transcript: 'Subtítulos en español latino',
      langUsed: 'es-419',
      fallbackApplied: true,
    });
  });

  it('should fallback to default/origin language if requested languages are missing', async () => {
    mockGetInfo.mockResolvedValueOnce({
      captions: {
        caption_tracks: [
          { language_code: 'ja', base_url: 'https://youtube.com/timedtext?lang=ja' },
        ],
      },
    });

    const result = await service.extractText('https://youtube.com/watch?v=12345678901', 'es', true);

    expect(result).toEqual({
      transcript: 'こんにちは世界',
      langUsed: 'ja',
      fallbackApplied: true,
    });
  });

  it('should throw BadRequestException if video has no captions at all', async () => {
    mockGetInfo.mockResolvedValueOnce({
      captions: {
        caption_tracks: [],
      },
    });

    await expect(
      service.extractText('https://youtube.com/watch?v=12345678901', 'es', true),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if fallback is false and exact language is missing', async () => {
    mockGetInfo.mockResolvedValueOnce({
      captions: {
        caption_tracks: [
          { language_code: 'en', base_url: 'https://youtube.com/timedtext?lang=en' },
        ],
      },
    });

    await expect(
      service.extractText('https://youtube.com/watch?v=12345678901', 'es', false),
    ).rejects.toThrow(BadRequestException);
  });
});
