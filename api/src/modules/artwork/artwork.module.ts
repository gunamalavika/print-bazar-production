import { Module } from '@nestjs/common';
import { ArtworkService } from './artwork.service';
import { ArtworkController } from './artwork.controller';
import { JobCardsModule } from '../job-cards/job-cards.module';

@Module({
  imports: [JobCardsModule],
  controllers: [ArtworkController],
  providers: [ArtworkService],
  exports: [ArtworkService],
})
export class ArtworkModule {}
