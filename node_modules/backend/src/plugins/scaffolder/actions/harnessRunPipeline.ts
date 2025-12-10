import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import fetch from 'node-fetch';

export const harnessRunPipelineAction = () =>
  createTemplateAction({
    id: 'harness:SelfServePipeline',
    description: 'Trigger the Harness SelfServe pipeline from Backstage',

    schema: {
      input: {
        type: 'object',
        required: [
          'accountIdentifier',
          'orgIdentifier',
          'projectIdentifier',
          'pipelineIdentifier',
          'repo_name',
          'tech_stack',
          'apm_number',
          'action',
          'database',
          'redis',
          'kafka',
        ],
        properties: {
          accountIdentifier: {
            type: 'string',
            description: 'Harness accountIdentifier (e.g. TSJ...)',
          },
          orgIdentifier: {
            type: 'string',
            description: 'Harness orgIdentifier (e.g. TriNet)',
          },
          projectIdentifier: {
            type: 'string',
            description: 'Harness projectIdentifier (e.g. DCP)',
          },
          pipelineIdentifier: {
            type: 'string',
            description:
              'Pipeline identifier used in the execute URL (e.g. Harness_Pipeline_Creation)',
          },

          // Pipeline variables
          repo_name: { type: 'string' },
          tech_stack: { type: 'string' },
          apm_number: { type: 'string' },
          action: { type: 'string' },
          database: { type: 'string' },
          redis: { type: 'string' },
          kafka: { type: 'string' },
        },
      },

      output: {
        type: 'object',
        properties: {
          executionId: { type: 'string' },
          uiUrl: { type: 'string' },
        },
      },
    },

    async handler(ctx) {
      const {
        accountIdentifier,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        repo_name,
        tech_stack,
        apm_number,
        action,
        database,
        redis,
        kafka,
      } = ctx.input as any;

      const rawKey = process.env.HARNESS_API_KEY;
      if (!rawKey) {
        throw new Error('HARNESS_API_KEY not configured in backend environment');
      }
      const harnessApiKey = rawKey.trim();

      // Build URL exactly like your working curl:
      // https://app.harness.io/gateway/pipeline/api/pipeline/execute/Harness_Pipeline_Creation?accountIdentifier=...&orgIdentifier=...&projectIdentifier=...
      const url =
        `https://app.harness.io/gateway/pipeline/api/pipeline/execute/${encodeURIComponent(
          pipelineIdentifier,
        )}` +
        `?accountIdentifier=${encodeURIComponent(accountIdentifier)}` +
        `&orgIdentifier=${encodeURIComponent(orgIdentifier)}` +
        `&projectIdentifier=${encodeURIComponent(projectIdentifier)}`;

      // Body exactly like your curl (pipeline.variables array)
      const body = {
        pipeline: {
          variables: [
            {
              name: 'repo_name',
              type: 'String',
              value: repo_name,
            },
            {
              name: 'tech_stack',
              type: 'String',
              value: tech_stack,
            },
            {
              name: 'apm_number',
              type: 'String',
              value: apm_number,
            },
            {
              name: 'action',
              type: 'String',
              value: action,
            },
            {
              name: 'database',
              type: 'String',
              value: database,
            },
            {
              name: 'redis',
              type: 'String',
              value: redis,
            },
            {
              name: 'kafka',
              type: 'String',
              value: kafka,
            },
          ],
        },
      };

      ctx.logger.info(
        `Triggering Harness pipeline '${pipelineIdentifier}' for repo '${repo_name}' in project '${projectIdentifier}'`,
      );

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': harnessApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(
          `Harness pipeline trigger failed: [${resp.status}] ${text}`,
        );
      }

      const data = await resp.json();
      ctx.logger.info(`Harness response => ${JSON.stringify(data)}`);
      const executionId = data?.data?.planExecution?.uuid;
      
      if (!executionId) {
        throw new Error(
          `Could not determine executionId from Harness response: ${JSON.stringify(data)}`
        );
      }
      
      const connectorRef = 'account.GithubHarness';
      const repoName = 'harness-ci-cd-templates';
      const branch = 'main';
      const storeType = 'REMOTE';

      const uiUrl =
        `https://app.harness.io/ng/account/${accountIdentifier}` +
        `/module/ci/orgs/${orgIdentifier}` +
        `/projects/${projectIdentifier}` +
        `/pipelines/${pipelineIdentifier}` +
        `/executions/${executionId}/pipeline` +
        `?connectorRef=${encodeURIComponent(connectorRef)}` +
        `&repoName=${encodeURIComponent(repoName)}` +
        `&branch=${encodeURIComponent(branch)}` +
        `&storeType=${encodeURIComponent(storeType)}`;

      ctx.output('executionId', executionId);
      ctx.output('uiUrl', uiUrl);
    },
  });

