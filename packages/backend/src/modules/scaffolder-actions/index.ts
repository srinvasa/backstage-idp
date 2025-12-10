import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';

import {
  scaffolderActionsExtensionPoint,
} from '@backstage/plugin-scaffolder-node';

import { harnessRunPipelineAction } from '../../plugins/scaffolder/actions/harnessRunPipeline';
import { infraToggleFlagsAction } from '../../plugins/scaffolder/actions/infraToggleFlags';
import { createExecuteShellAction } from '../../plugins/scaffolder/actions/executeShell';

export default createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'harness-actions',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        scaffolder: scaffolderActionsExtensionPoint,
      },
      async init({ logger, scaffolder }) {
        logger.info('Registering REAL Harness SelfServe action');

        const action = harnessRunPipelineAction();
        const infraAction = infraToggleFlagsAction();
        const shellAction = createExecuteShellAction();

        logger.info(`Harness action id = ${action.id}`);
        logger.info(`Registered action: ${infraAction.id}`);
        logger.info(`Registered action: ${shellAction.id}`);

        scaffolder.addActions(action, infraAction, shellAction);
      },
    });
  },
});

