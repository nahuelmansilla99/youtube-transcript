import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptService } from './transcript.service';
import { YoutubeTranscript } from 'youtube-transcript';
import { BadRequestException } from '@nestjs/common';

jest.mock('youtube-transcript');

describe('TranscriptService', () => {
  let service: TranscriptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TranscriptService],
    }).compile();

    service = module.get<TranscriptService>(TranscriptService);
    jest.clearAllMocks();
  });

  it('should return transcript with exact requested language if available', async () => {
    (YoutubeTranscript.fetchTranscript as jest.Mock).mockResolvedValueOnce([
      { text: 'Hola mundo' },
    ]);

    const result = await service.extractText('https://youtube.com/watch?v=123', 'es', true);

    expect(result).toEqual({
      transcript: 'Hola mundo',
      langUsed: 'es',
      fallbackApplied: false,
    });
    expect(YoutubeTranscript.fetchTranscript).toHaveBeenCalledTimes(1);
    expect(YoutubeTranscript.fetchTranscript).toHaveBeenCalledWith('https://youtube.com/watch?v=123', { lang: 'es' });
  });

  it('should fallback to regional variant (es-419) when exact lang (es) fails', async () => {
    (YoutubeTranscript.fetchTranscript as jest.Mock)
      .mockRejectedValueOnce(new Error('No transcripts in es')) // es
      .mockResolvedValueOnce([{ text: 'Subtítulos en español latino' }]); // es-419

    const result = await service.extractText('https://youtube.com/watch?v=123', 'es', true);

    expect(result).toEqual({
      transcript: 'Subtítulos en español latino',
      langUsed: 'es-419',
      fallbackApplied: true,
    });
    expect(YoutubeTranscript.fetchTranscript).toHaveBeenCalledTimes(2);
  });

  it('should fallback to origin language (e.g., Japanese "ja" or French "fr") if video has no Spanish or English subtitles', async () => {
    (YoutubeTranscript.fetchTranscript as jest.Mock)
      .mockRejectedValueOnce(new Error('No es')) // es
      .mockRejectedValueOnce(new Error('No es-419')) // es-419
      .mockRejectedValueOnce(new Error('No es-ES')) // es-ES
      .mockRejectedValueOnce(new Error('No es-MX')) // es-MX
      .mockRejectedValueOnce(new Error('No es-AR')) // es-AR
      .mockRejectedValueOnce(new Error('No en')) // en
      .mockRejectedValueOnce(new Error('No en-US')) // en-US
      .mockRejectedValueOnce(new Error('No en-GB')) // en-GB
      .mockResolvedValueOnce([{ text: 'こんにちは世界', lang: 'ja' }]); // default fallback (Japanese)

    const result = await service.extractText('https://youtube.com/watch?v=123', 'es', true);

    expect(result).toEqual({
      transcript: 'こんにちは世界',
      langUsed: 'ja',
      fallbackApplied: true,
    });
  });

  it('should throw BadRequestException if video has no subtitles at all in any language', async () => {
    (YoutubeTranscript.fetchTranscript as jest.Mock).mockRejectedValue(new Error('No captions available'));

    await expect(service.extractText('https://youtube.com/watch?v=123', 'es', true)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if fallback is disabled and exact lang fails', async () => {
    (YoutubeTranscript.fetchTranscript as jest.Mock).mockRejectedValueOnce(new Error('No es'));

    await expect(service.extractText('https://youtube.com/watch?v=123', 'es', false)).rejects.toThrow(
      BadRequestException,
    );
  });
});
