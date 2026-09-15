import type { VerifierTestCase } from '../content/verifier-manifest.js';

export interface ExecuteCodeInput {
  readonly code: string;
  readonly testCases: readonly VerifierTestCase[];
}

export type CodeExecutionReason =
  | 'passed'
  | 'failed'
  | 'syntax-error'
  | 'runtime-error'
  | 'timeout';

export interface CodeExecutionResult {
  readonly passed: boolean;
  readonly reason: CodeExecutionReason;
}

export interface CodeExecutionService {
  execute(input: ExecuteCodeInput): Promise<CodeExecutionResult>;
}

export class CodeExecutionUnavailableError extends Error {
  public constructor(message = 'Code execution is unavailable') {
    super(message);
    this.name = 'CodeExecutionUnavailableError';
  }
}
