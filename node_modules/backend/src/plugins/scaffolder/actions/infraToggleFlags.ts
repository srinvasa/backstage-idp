import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import fs from 'fs/promises';
import path from 'path';

export const infraToggleFlagsAction = () =>
  createTemplateAction({
    id: 'infra:toggle-flags',
    description: 'Toggle specific infra flags in infra-config.json',
    schema: {
      input: {
        type: 'object',
        required: ['environment', 'features'],
        properties: {
          environment: {
            type: 'string',
            enum: ['stage', 'prod', 'both'],
          },
          filePath: {
            type: 'string',
            default: './infra/infra-config.json',
          },
          // New: An object containing boolean flags for each component
          features: {
            type: 'object',
            properties: {
              eks: { type: 'boolean' },
              database: { type: 'boolean' },
              messaging: { type: 'boolean' },
              elastiCache: { type: 'boolean' },
              s3: { type: 'boolean' },
              lambda: { type: 'boolean' },
            },
          },
        },
      },
    },

    async handler(ctx) {
      const { 
        environment, 
        features, 
        filePath = './infra/infra-config.json' 
      } = ctx.input as {
        environment: 'stage' | 'prod' | 'both';
        filePath?: string;
        features: Record<string, boolean>; // e.g. { eks: true, s3: false }
      };

      const fullPath = path.join(ctx.workspacePath, filePath);
      ctx.logger.info(`Reading infra config from ${fullPath}`);

      // 1. Read and Parse
      let config: any;
      try {
        const raw = await fs.readFile(fullPath, 'utf8');
        config = JSON.parse(raw);
      } catch (e: any) {
        throw new Error(`Failed to process ${filePath}: ${e.message}`);
      }

      // 2. Define the mapping: Feature Key -> JSON Path in infra-config.json
      const pathMap: Record<string, string[]> = {
        eks: ['infrastructure', 'eks'],
        database: ['infrastructure', 'database'],
        messaging: ['infrastructure', 'messaging'],
        elastiCache: ['infrastructure', 'elastiCache'],
        s3: ['infrastructure', 'cdktfInfraStack', 's3'],
        lambda: ['infrastructure', 'cdktfInfraStack', 'lambda'],
      };

      // 3. Helper to safely navigate/create object paths
      const ensurePath = (obj: any, keys: string[]): any => {
        let node = obj;
        for (const key of keys) {
          if (node[key] === undefined || node[key] === null) {
            node[key] = {};
          }
          node = node[key];
        }
        return node;
      };

      // 4. Iterate through the User's selection and apply changes
      for (const [featureKey, isEnabled] of Object.entries(features)) {
        // If the template didn't provide a value for this key, skip it
        if (typeof isEnabled !== 'boolean') continue;

        const jsonPath = pathMap[featureKey];
        if (!jsonPath) {
          ctx.logger.warn(`No path mapping found for feature: ${featureKey}`);
          continue;
        }

        const node = ensurePath(config, jsonPath);

        // Logic: Update the flags based on the selected Environment
        if (environment === 'stage' || environment === 'both') {
          node.stage_enabled = isEnabled;
        }
        if (environment === 'prod' || environment === 'both') {
          node.prod_enabled = isEnabled;
        }
        
        ctx.logger.info(`Set ${featureKey} to ${isEnabled} for ${environment}`);
      }

      // 5. Write back
      const updated = JSON.stringify(config, null, 2) + '\n';
      await fs.writeFile(fullPath, updated, 'utf8');
    },
  });
