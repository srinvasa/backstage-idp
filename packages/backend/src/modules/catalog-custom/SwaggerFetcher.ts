import { CatalogProcessor } from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';

// A simple processor that bypasses UrlReader security lists
export class SwaggerFetcherProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'SwaggerFetcherProcessor';
  }

  async preProcessEntity(entity: Entity): Promise<Entity> {
    // 1. Only run on API entities
    if (entity.kind !== 'API') return entity;

    // 2. Check for our custom annotation
    const url = entity.metadata.annotations?.['trinet/fetch-url'];
    if (!url) return entity;

    try {
      // 3. Fetch using standard fetch (ignores app-config.yaml allow list!)
      // We use 'rejectUnauthorized: false' to handle your internal SSL issues
      const https = require('https');
      const agent = new https.Agent({ rejectUnauthorized: false });
      
      const response = await fetch(url, { agent } as any);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const definition = await response.text();

      // 4. Inject the result into the entity spec
      if (!entity.spec) entity.spec = {};
      (entity.spec as any).definition = definition;

    } catch (error) {
      console.error(`[SwaggerFetcher] Error loading ${entity.metadata.name}:`, error);
      (entity.spec as any).definition = `Error loading spec: ${error}`;
    }

    return entity;
  }
}
