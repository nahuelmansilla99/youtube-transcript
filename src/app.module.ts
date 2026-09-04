import { Module } from '@nestjs/common';
import { TranscriptModule } from './transcript/transcript.module';

@Module({
  imports: [TranscriptModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
