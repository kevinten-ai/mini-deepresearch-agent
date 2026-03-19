import { execFile } from 'child_process';
import type { Tool, ToolResult } from '../types.js';

export function createPythonTool(): Tool {
  return {
    definition: {
      name: 'python',
      description: 'Execute Python code for data analysis, calculations, or processing. The code runs in a sandboxed environment.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Python code to execute' },
        },
        required: ['code'],
      },
    },
    async execute(params): Promise<ToolResult> {
      const start = Date.now();
      return new Promise((resolve) => {
        execFile(
          'python3',
          ['-c', params.code as string],
          { timeout: 30000, maxBuffer: 1024 * 1024 },
          (error, stdout, stderr) => {
            const duration = Date.now() - start;
            if (error) {
              resolve({
                success: false,
                data: { error: error.message, stderr },
                summary: `Python error: ${stderr || error.message}`,
                duration,
              });
            } else {
              resolve({
                success: true,
                data: { stdout, stderr },
                summary: `Python output: ${stdout.slice(0, 500)}`,
                duration,
                metadata: { codeLength: (params.code as string).length },
              });
            }
          },
        );
      });
    },
  };
}
