// packages/backend/src/modules/tech-insights/index.ts

import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { techInsightsFactRetrieversExtensionPoint } from '@backstage-community/plugin-tech-insights-node';
import { LifecycleFactRetriever } from './LifecycleFactRetriever';

export default createBackendModule({
  pluginId: 'tech-insights',
  moduleId: 'custom-fact-retrievers',
  register(env) {
    env.registerInit({
      deps: {
        providers: techInsightsFactRetrieversExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ providers, config }) {
        console.log('!!! 🚨 REGISTERING LIFECYCLE RETRIEVER NOW 🚨 !!!');
        const keys = config.getOptionalConfig('techInsights.factRetrievers')?.keys();
        console.log('==================================================');
        console.log('🚨 ACTUAL RUNTIME CONFIG KEYS:', keys);
        console.log('==================================================');

        const retriever = new LifecycleFactRetriever();
        console.log(
          'Schema keys for lifecycleFactRetriever:',
          Object.keys(retriever.schema),
        );

        providers.addFactRetrievers(retriever);
      },
    });
  },
});

