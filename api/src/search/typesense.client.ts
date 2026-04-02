import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'typesense';
import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

export const ISSUES_COLLECTION = 'issues';
export const DOCS_COLLECTION = 'docs';

const ISSUES_SCHEMA: CollectionCreateSchema = {
  name: ISSUES_COLLECTION,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'priority', type: 'string', facet: true },
    { name: 'labels', type: 'string[]', facet: true },
    { name: 'projectId', type: 'string', optional: true, facet: true },
    { name: 'sprintId', type: 'string', optional: true },
    { name: 'assigneeName', type: 'string', optional: true },
    { name: 'createdAt', type: 'int64' },
  ],
};

const DOCS_SCHEMA: CollectionCreateSchema = {
  name: DOCS_COLLECTION,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'emoji', type: 'string', optional: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'wordCount', type: 'int32' },
    { name: 'projectId', type: 'string', optional: true, facet: true },
    { name: 'authorName', type: 'string', optional: true },
    { name: 'createdAt', type: 'int64' },
  ],
};

@Injectable()
export class TypesenseClient implements OnModuleInit {
  private readonly logger = new Logger(TypesenseClient.name);
  client: Client;

  constructor(private config: ConfigService) {
    this.client = new Client({
      nodes: [{
        host: config.get('TYPESENSE_HOST', 'localhost'),
        port: config.get<number>('TYPESENSE_PORT', 8108),
        protocol: 'http',
      }],
      apiKey: config.get('TYPESENSE_API_KEY', 'xyz'),
      connectionTimeoutSeconds: 5,
    });
  }

  async onModuleInit() {
    await this.ensureCollection(ISSUES_SCHEMA);
    await this.ensureCollection(DOCS_SCHEMA);
    this.logger.log('Typesense collections ready');
  }

  private async ensureCollection(schema: CollectionCreateSchema) {
    try {
      await this.client.collections(schema.name).retrieve();
      this.logger.log(`Collection "${schema.name}" already exists`);
    } catch {
      await this.client.collections().create(schema);
      this.logger.log(`Collection "${schema.name}" created`);
    }
  }
}
