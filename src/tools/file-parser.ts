import { readFile } from 'fs/promises';
import type { Tool, ToolResult } from '../types.js';

type PdfParseResult = {
  numpages: number;
  text: string;
};

type PdfParse = (dataBuffer: Buffer | Uint8Array | ArrayBuffer) => Promise<PdfParseResult>;

export function createFileParserTool(): Tool {
  return {
    definition: {
      name: 'file_parser',
      description: 'Parse and extract text from uploaded files (PDF, TXT, Markdown).',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file' },
        },
        required: ['filePath'],
      },
    },
    async execute(params): Promise<ToolResult> {
      const start = Date.now();
      const filePath = params.filePath as string;
      try {
        if (filePath.endsWith('.pdf')) {
          const pdfParse = (await import('pdf-parse')).default as PdfParse;
          const buffer = await readFile(filePath);
          const pdf = await pdfParse(buffer);
          return {
            success: true,
            data: pdf.text.slice(0, 10000),
            summary: `Parsed PDF: ${pdf.numpages} pages, ${pdf.text.length} chars`,
            duration: Date.now() - start,
            metadata: { pages: pdf.numpages, charCount: pdf.text.length },
          };
        } else {
          const text = await readFile(filePath, 'utf-8');
          return {
            success: true,
            data: text.slice(0, 10000),
            summary: `Read file: ${text.length} chars`,
            duration: Date.now() - start,
            metadata: { charCount: text.length },
          };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, data: null, summary: `File parse failed: ${message}`, duration: Date.now() - start };
      }
    },
  };
}
