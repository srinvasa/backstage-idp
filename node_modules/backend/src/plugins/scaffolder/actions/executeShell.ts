import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { executeShellCommand } from '@backstage/plugin-scaffolder-backend'; // Helper if avail, otherwise standard child_process below
import { SpawnOptions, spawn } from 'child_process';
import { exec } from 'child_process';
import { InputError } from '@backstage/errors';

export const createExecuteShellAction = () => {
  return createTemplateAction({
    id: 'execute:shell',
    description: 'Run a shell command with arguments',
    schema: {
      input: {
        type: 'object',
        required: ['command'],
        properties: {
          command: {
            type: 'string',
            title: 'Command',
            description: 'The command to run (e.g. python3, /bin/bash)',
          },
          args: {
            type: 'array',
            items: { type: 'string' },
            title: 'Arguments',
            description: 'Arguments to pass to the command',
          },
          options: {
            type: 'object',
            title: 'Options',
            properties: {
              cwd: { type: 'string', title: 'Working Directory' },
            },
          },
        },
      },
    },

    async handler(ctx) {
      const { command, args, options } = ctx.input;
      const cwd = options?.cwd ?? ctx.workspacePath;

      // Construct the full command string
      // This handles arguments much better than spawn for shell scripts
      const fullCommand = `${command} ${args?.join(' ') ?? ''}`;

      ctx.logger.info(`Running command: ${fullCommand}`);

      let stderrOutput = '';

      await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args ?? [], {
          cwd,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
          // shell: true, // KEEP THIS DELETED/COMMENTED OUT
        });

        child.stdout?.on('data', stream => {
          ctx.logStream.write(stream.toString('utf8'));
        });

        child.stderr?.on('data', stream => {
          const chunk = stream.toString('utf8');
          
          // 2. Append the chunk to our variable
          stderrOutput += chunk;
          
          // Still write to the UI stream live
          ctx.logStream.write(chunk);
        });

        child.on('close', code => {
          if (code === 0) {
            ctx.logger.info(`Command finished successfully.`);
            resolve();
          } else {
            // 3. Include the captured text in the final Error message
            // We use .trim() to remove extra whitespace/newlines
            reject(new Error(`Command failed with exit code ${code}. Error: ${stderrOutput.trim()}`));
          }
        });
      });
    },
  });
};
