import { Module } from '@nestjs/common';
import { TypesenseClient } from './typesense.client';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  providers: [TypesenseClient, SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
