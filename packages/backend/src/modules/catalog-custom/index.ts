import { createBackendModule } from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { SwaggerFetcherProcessor } from './SwaggerFetcher';

export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'custom-swagger-fetcher',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
      },
      async init({ catalog }) {
        // Add the processor to the catalog loop
        catalog.addProcessor(new SwaggerFetcherProcessor());
      },
    });
  },
});
