import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TranscriptService } from './transcript.service';
import { ExtractTranscriptDto } from './dto/extract-transcript.dto';

@ApiTags('youtube')
@Controller('youtube')
export class TranscriptController {
  constructor(private readonly transcriptService: TranscriptService) {}

  @Post('extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extraer transcripción de un video de YouTube',
    description:
      'Recibe la URL de un video de YouTube e idioma (opcional). Soporta reintentos por variantes dialectales (ej. es-419) y fallback al idioma original.',
  })
  @ApiBody({ type: ExtractTranscriptDto })
  @ApiResponse({
    status: 200,
    description: 'Transcripción obtenida exitosamente',
    schema: {
      example: {
        success: true,
        transcript: 'Texto de la transcripción extraída...',
        langUsed: 'es-419',
        fallbackApplied: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'URL inválida o el video no contiene subtítulos disponibles',
    schema: {
      example: {
        statusCode: 400,
        message: 'No se pudo extraer la transcripción. El video no contiene subtítulos...',
        error: 'Bad Request',
      },
    },
  })
  async getTranscript(@Body() dto: ExtractTranscriptDto) {
    const allowFallback = dto.fallback !== undefined ? dto.fallback : true;
    const result = await this.transcriptService.extractText(dto.url, dto.lang || 'es', allowFallback);

    return {
      success: true,
      transcript: result.transcript,
      langUsed: result.langUsed,
      fallbackApplied: result.fallbackApplied,
    };
  }
}
