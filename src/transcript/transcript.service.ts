import { Injectable, BadRequestException } from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';

export interface ExtractResult {
  transcript: string;
  langUsed: string;
  fallbackApplied: boolean;
}

@Injectable()
export class TranscriptService {
  async extractText(youtubeUrl: string, targetLang = 'es', allowFallback = true): Promise<ExtractResult> {
    // 1. Intentar obtener los subtítulos con el idioma solicitado originalmente (ej. 'es')
    try {
      const items = await YoutubeTranscript.fetchTranscript(youtubeUrl, { lang: targetLang });
      if (items && items.length > 0) {
        return {
          transcript: items.map((item) => item.text).join(' '),
          langUsed: targetLang,
          fallbackApplied: false,
        };
      }
    } catch (err) {
      if (!allowFallback) {
        throw new BadRequestException(
          `No se encontraron subtítulos disponibles para el idioma solicitado '${targetLang}'.`,
        );
      }
    }

    // 2. Si fallback está activado:
    //    Si se pidió español, la prioridad ideal para IA en n8n es:
    //    Variantes en Español -> Variantes en Inglés -> Cualquier idioma de origen disponible.
    if (allowFallback) {
      const priorityLangsMap: Record<string, string[]> = {
        es: ['es-419', 'es-ES', 'es-MX', 'es-AR', 'en', 'en-US', 'en-GB'],
        en: ['en-US', 'en-GB', 'en-CA', 'es', 'es-419'],
      };

      const fallbackList = priorityLangsMap[targetLang] || [];

      for (const langCode of fallbackList) {
        try {
          const items = await YoutubeTranscript.fetchTranscript(youtubeUrl, { lang: langCode });
          if (items && items.length > 0) {
            return {
              transcript: items.map((item) => item.text).join(' '),
              langUsed: langCode,
              fallbackApplied: true,
            };
          }
        } catch (err) {
          // Probar siguiente idioma de prioridad
        }
      }

      // 3. Fallback al idioma original/predeterminado disponible del video (ej. ja, fr, de, etc.)
      try {
        const items = await YoutubeTranscript.fetchTranscript(youtubeUrl);
        if (items && items.length > 0) {
          return {
            transcript: items.map((item) => item.text).join(' '),
            langUsed: items[0]?.lang || 'default',
            fallbackApplied: true,
          };
        }
      } catch (err) {
        // Fallaron todos los reintentos
      }
    }

    throw new BadRequestException(
      `No se pudo extraer la transcripción. El video no contiene subtítulos en el idioma '${targetLang}' ni en idiomas alternativos.`,
    );
  }
}
