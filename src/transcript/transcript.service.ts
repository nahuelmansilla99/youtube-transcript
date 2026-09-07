import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import type { Innertube } from 'youtubei.js';

export interface ExtractResult {
  transcript: string;
  langUsed: string;
  fallbackApplied: boolean;
}

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);
  private innertubePromise: Promise<Innertube> | null = null;

  private async getInnertube(): Promise<Innertube> {
    if (!this.innertubePromise) {
      this.innertubePromise = (async () => {
        const { Innertube, UniversalCache, Log } = await import('youtubei.js');
        // Silenciar logs/warnings internos de la librería
        Log.setLevel(Log.Level.NONE);

        const proxyUrl = process.env.YOUTUBE_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        let customFetch: typeof fetch | undefined = undefined;

        if (proxyUrl) {
          const maskedProxy = proxyUrl.replace(/:([^:@]+)@/, ':****@');
          this.logger.log(`Inicializando YouTube Innertube con Proxy: ${maskedProxy}`);
          try {
            const { ProxyAgent } = await import('undici');
            const dispatcher = new ProxyAgent(proxyUrl);
            customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
              return fetch(input, {
                ...init,
                // @ts-expect-error undici dispatcher in node fetch
                dispatcher,
              });
            };
          } catch (proxyErr) {
            this.logger.error(`Error al configurar proxy: ${proxyErr.message}`);
          }
        }

        return await Innertube.create({
          cache: new UniversalCache(false),
          generate_session_locally: true,
          fetch: customFetch,
        });
      })();
    }
    return this.innertubePromise;
  }

  private extractVideoId(urlOrId: string): string {
    if (!urlOrId || typeof urlOrId !== 'string') {
      throw new BadRequestException('La URL o ID del video es obligatoria.');
    }

    const trimmed = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const match = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/,
    );
    if (match && match[1]) {
      return match[1];
    }

    throw new BadRequestException('No se pudo extraer un ID de video válido a partir de la URL proporcionada.');
  }

  private async fetchCaptionText(trackUrl: string): Promise<string> {
    const url = new URL(trackUrl);
    url.searchParams.set('fmt', 'json3');

    const proxyUrl = process.env.YOUTUBE_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    let fetchOptions: RequestInit = {};

    if (proxyUrl) {
      try {
        const { ProxyAgent } = await import('undici');
        const dispatcher = new ProxyAgent(proxyUrl);
        fetchOptions = {
          // @ts-expect-error undici dispatcher in node fetch
          dispatcher,
        };
      } catch (err) {
        this.logger.error(`Error al aplicar proxy en descarga de subtítulos: ${err.message}`);
      }
    }

    const response = await fetch(url.toString(), fetchOptions);
    if (!response.ok) {
      throw new Error(`Error al descargar subtítulos (${response.status}: ${response.statusText})`);
    }

    const data = await response.json();
    if (!data?.events || !Array.isArray(data.events)) {
      throw new Error('El formato de datos de subtítulos no es válido.');
    }

    const textParts: string[] = [];
    for (const event of data.events) {
      if (event.segs && Array.isArray(event.segs)) {
        for (const seg of event.segs) {
          if (seg.utf8 && seg.utf8 !== '\n') {
            textParts.push(seg.utf8);
          }
        }
      }
    }

    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  }

  private async getVideoInfo(yt: Innertube, videoId: string) {
    // Usar clientes móviles/TV primero para evitar el bloqueo del cliente WEB en Datacenters
    const clients: Array<'ANDROID' | 'TV_EMBEDDED' | 'IOS' | 'WEB'> = [
      'ANDROID',
      'TV_EMBEDDED',
      'IOS',
      'WEB',
    ];

    let lastError: Error | null = null;
    for (const client of clients) {
      try {
        const info = await yt.getInfo(videoId, client as any);
        if (info?.captions?.caption_tracks && info.captions.caption_tracks.length > 0) {
          return info;
        }
      } catch (err) {
        lastError = err;
      }
    }

    // Si ninguno devolvió pistas, intentar método predeterminado
    try {
      const defaultInfo = await yt.getInfo(videoId);
      if (defaultInfo) return defaultInfo;
    } catch (err) {
      if (lastError) throw lastError;
      throw err;
    }

    throw lastError || new Error('No se pudo obtener información del video.');
  }

  async extractText(youtubeUrl: string, targetLang = 'es', allowFallback = true): Promise<ExtractResult> {
    const videoId = this.extractVideoId(youtubeUrl);

    try {
      const yt = await this.getInnertube();
      const info = await this.getVideoInfo(yt, videoId);

      const tracks = info.captions?.caption_tracks;
      if (!tracks || tracks.length === 0) {
        this.logger.warn(`El video ${videoId} no contiene pistas de subtítulos disponibles.`);
        throw new BadRequestException(
          `No se pudo extraer la transcripción. El video no contiene subtítulos en el idioma '${targetLang}' ni en idiomas alternativos.`,
        );
      }

      const targetLangLower = targetLang.toLowerCase();

      // 1. Intentar coincidencia exacta con el idioma solicitado (ej. 'es')
      let selectedTrack = tracks.find((t) => t.language_code?.toLowerCase() === targetLangLower);
      let fallbackApplied = false;

      // 2. Si no existe y fallback está desactivado, arrojar error
      if (!selectedTrack && !allowFallback) {
        throw new BadRequestException(
          `No se encontraron subtítulos disponibles para el idioma solicitado '${targetLang}'.`,
        );
      }

      // 3. Si fallback está activado:
      if (!selectedTrack && allowFallback) {
        const priorityLangsMap: Record<string, string[]> = {
          es: ['es-419', 'es-es', 'es-mx', 'es-ar', 'es-us', 'en', 'en-us', 'en-gb'],
          en: ['en-us', 'en-gb', 'en-ca', 'es', 'es-419'],
        };

        const fallbackList = priorityLangsMap[targetLangLower] || [];

        // 3a. Buscar por lista de prioridad dialectal
        for (const langCode of fallbackList) {
          const match = tracks.find((t) => t.language_code?.toLowerCase() === langCode);
          if (match) {
            selectedTrack = match;
            fallbackApplied = true;
            break;
          }
        }

        // 3b. Buscar por prefijo (ej. si pidieron 'es', aceptar cualquier 'es-*')
        if (!selectedTrack) {
          const prefixMatch = tracks.find((t) =>
            t.language_code?.toLowerCase().startsWith(targetLangLower),
          );
          if (prefixMatch) {
            selectedTrack = prefixMatch;
            fallbackApplied = true;
          }
        }

        // 3c. Fallback al primer idioma disponible (idioma original del video)
        if (!selectedTrack && tracks.length > 0) {
          selectedTrack = tracks[0];
          fallbackApplied = true;
        }
      }

      if (!selectedTrack || !selectedTrack.base_url) {
        throw new BadRequestException(
          `No se pudo extraer la transcripción. El video no contiene subtítulos en el idioma '${targetLang}' ni en idiomas alternativos.`,
        );
      }

      const transcript = await this.fetchCaptionText(selectedTrack.base_url);

      if (!transcript || transcript.trim().length === 0) {
        throw new BadRequestException(
          `La transcripción del video ${videoId} se encuentra vacía.`,
        );
      }

      return {
        transcript,
        langUsed: selectedTrack.language_code || 'unknown',
        fallbackApplied,
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      this.logger.error(
        `Error al extraer transcripción para el video ${videoId} (${youtubeUrl}): ${err.message}`,
        err.stack,
      );

      throw new BadRequestException(
        `No se pudo extraer la transcripción: ${err.message || 'Error desconocido al consultar YouTube.'}`,
      );
    }
  }
}
