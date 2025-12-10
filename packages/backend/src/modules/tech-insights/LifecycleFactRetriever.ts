// packages/backend/src/modules/tech-insights/LifecycleFactRetriever.ts

import {
  TechInsightsFactRetriever,
  FactRetrieverContext,
} from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';

export class LifecycleFactRetriever implements TechInsightsFactRetriever {
  id = 'lifecycleFactRetriever';
  version = '1.0.0';

  // match style of existing retrievers: array with kind[]
  entityFilter = [
    { kind: ['component', 'api'] },
  ];

  // This schema will become the fields you see in /fact-schemas
  schema = {
    lifecycle: {
      type: 'string',
      description: 'The lifecycle state (production, experimental, etc)',
    },
  };

  async retrieve(ctx: FactRetrieverContext) {
    const { discovery, logger } = ctx;

    const catalogClient = new CatalogClient({ discoveryApi: discovery });

    const { entities } = await catalogClient.getEntities({
      filter: this.entityFilter,
    });

    logger.info(
      `[LifecycleFactRetriever] Found ${entities.length} entities to collect lifecycle facts for`,
    );

    return entities.map(entity => ({
      entity: {
        namespace: entity.metadata.namespace ?? 'default',
        kind: entity.kind,
        name: entity.metadata.name,
      },
      facts: {
        lifecycle: (entity as any).spec?.lifecycle ?? 'unknown',
      },
    }));
  }
}

