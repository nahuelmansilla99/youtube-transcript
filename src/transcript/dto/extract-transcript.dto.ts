import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class ExtractTranscriptDto {
  @ApiProperty({
    description: 'URL completa del video de YouTube',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsNotEmpty({ message: 'La URL es requerida' })
  @IsUrl({}, { message: 'La URL proporcionada no es una URL válida' })
  url: string;

  @ApiPropertyOptional({
    description: 'Código de idioma ISO de los subtítulos a extraer (por defecto: "es")',
    example: 'es',
    default: 'es',
  })
  @IsOptional()
  @IsString({ message: 'El campo lang debe ser una cadena de texto' })
  lang?: string;

  @ApiPropertyOptional({
    description: 'Si es true, si el idioma solicitado no está disponible intenta buscar variantes (ej. es-419) o el idioma original del video en lugar de fallar',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo fallback debe ser un booleano' })
  fallback?: boolean;
}
