/**
 * Source executed in a dedicated Node child process.
 *
 * Untrusted JavaScript is evaluated only inside QuickJS/WASM.
 * Node capabilities are not exposed to guest code.
 */
export const QUICKJS_RUNNER_SOURCE = String.raw`
import {
  getQuickJS,
  shouldInterruptAfterDeadline,
} from 'quickjs-emscripten';

const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_CODE_BYTES = 64 * 1024;
const MAX_TEST_CASES = 64;

const MEMORY_LIMIT_BYTES = 32 * 1024 * 1024;
const STACK_LIMIT_BYTES = 512 * 1024;

let raw = '';

for await (const chunk of process.stdin) {
  raw += chunk;

  if (Buffer.byteLength(raw, 'utf8') > MAX_REQUEST_BYTES) {
    write({
      ok: false,
      infrastructureError: 'request-too-large',
    });

    process.exit(0);
  }
}

try {
  const request = JSON.parse(raw);

  validateRequest(request);

  const result = await execute(request);

  write({
    ok: true,
    result,
  });
} catch (error) {
  write({
    ok: false,
    infrastructureError:
      error instanceof Error
        ? error.message
        : 'runner-failed',
  });
}

function validateRequest(request) {
  if (
    !request
    || typeof request !== 'object'
  ) {
    throw new Error('invalid-request');
  }

  if (
    typeof request.code !== 'string'
    || request.code.trim() === ''
  ) {
    throw new Error('invalid-code');
  }

  if (
    Buffer.byteLength(
      request.code,
      'utf8',
    ) > MAX_CODE_BYTES
  ) {
    throw new Error('code-too-large');
  }

  if (
    !Array.isArray(request.testCases)
    || request.testCases.length === 0
    || request.testCases.length > MAX_TEST_CASES
  ) {
    throw new Error('invalid-test-cases');
  }

  if (
    !Number.isSafeInteger(request.timeoutMs)
    || request.timeoutMs < 50
    || request.timeoutMs > 10_000
  ) {
    throw new Error('invalid-timeout');
  }
}

async function execute(request) {
  const QuickJS = await getQuickJS();

  const runtime =
    QuickJS.newRuntime();

  runtime.setMemoryLimit(
    MEMORY_LIMIT_BYTES,
  );

  runtime.setMaxStackSize(
    STACK_LIMIT_BYTES,
  );

  runtime.setInterruptHandler(
    shouldInterruptAfterDeadline(
      Date.now()
        + request.timeoutMs,
    ),
  );

  const vm =
    runtime.newContext();

  try {
    const program =
      buildProgram(
        request.code,
        request.testCases,
      );

    const evaluated =
      vm.evalCode(program);

    if (evaluated.error) {
      const detail =
        safeDump(
          vm,
          evaluated.error,
        );

      evaluated.error.dispose();

      return {
        passed: false,
        reason:
          classifyError(detail),
      };
    }

    const promiseHandle =
      evaluated.value;

    try {
      const settled =
        vm.resolvePromise(
          promiseHandle,
        );

      /*
       * QuickJS promises only progress when
       * pending jobs are explicitly executed.
       *
       * Do not await the settled promise before pumping
       * the QuickJS job queue.
       */
      while (
        runtime.hasPendingJob()
      ) {
        const jobResult =
          runtime.executePendingJobs();

        if (
          jobResult
          && typeof jobResult === 'object'
          && 'error' in jobResult
        ) {
          const detail =
            safeDump(
              jobResult.context,
              jobResult.error,
            );

          jobResult.error.dispose();

          return {
            passed: false,
            reason:
              classifyError(
                detail,
              ),
          };
        }
      }

      const resolved =
        await settled;

      if (resolved.error) {
        const detail =
          safeDump(
            vm,
            resolved.error,
          );

        resolved.error.dispose();

        return {
          passed: false,
          reason:
            classifyError(detail),
        };
      }

      try {
        const dumped =
          vm.dump(
            resolved.value,
          );

        if (
          !dumped
          || typeof dumped
            !== 'object'
          || typeof dumped.passed
            !== 'boolean'
        ) {
          throw new Error(
            'invalid-guest-result',
          );
        }

        return {
          passed:
            dumped.passed,
          reason:
            dumped.passed
              ? 'passed'
              : normalizeReason(
                  dumped.reason,
                ),
        };
      } finally {
        resolved.value.dispose();
      }
    } finally {
      promiseHandle.dispose();
    }
  } finally {
    vm.dispose();
    runtime.dispose();
  }
}

function buildProgram(
  code,
  testCases,
) {
  const codeLiteral =
    JSON.stringify(code);

  const testsLiteral =
    JSON.stringify(testCases);

  return [
    '(async () => {',
    'const __tests = ' + testsLiteral + ';',
    'try {',
    '(0, eval)(' + codeLiteral + ');',
    '} catch (error) {',
    'return {',
    'passed: false,',
    "reason: error instanceof SyntaxError ? 'syntax-error' : 'runtime-error',",
    '};',
    '}',

    'for (const __test of __tests) {',
    'try {',
    'globalThis.input = __test.input;',
    'const __actual = await (0, eval)(__test.call);',

    'if (!__deepEqual(__actual, __test.expected)) {',
    "return { passed: false, reason: 'failed' };",
    '}',

    '} catch {',
    "return { passed: false, reason: 'runtime-error' };",
    '} finally {',
    'try { delete globalThis.input; } catch {}',
    '}',
    '}',

    "return { passed: true, reason: 'passed' };",

    'function __deepEqual(a, b) {',
    'if (Object.is(a, b)) return true;',
    'if (typeof a !== typeof b) return false;',
    'if (a === null || b === null) return false;',
    "if (typeof a !== 'object') return false;",
    'if (Array.isArray(a) !== Array.isArray(b)) return false;',

    'const aKeys = Object.keys(a).sort();',
    'const bKeys = Object.keys(b).sort();',

    'if (aKeys.length !== bKeys.length) return false;',

    'for (let i = 0; i < aKeys.length; i += 1) {',
    'if (aKeys[i] !== bKeys[i]) return false;',
    'if (!__deepEqual(a[aKeys[i]], b[bKeys[i]])) return false;',
    '}',

    'return true;',
    '}',

    '})()',
  ].join('\n');
}

function safeDump(
  context,
  handle,
) {
  try {
    return context.dump(
      handle,
    );
  } catch {
    return null;
  }
}

function classifyError(
  detail,
) {
  const text =
    JSON.stringify(
      detail ?? '',
    ).toLowerCase();

  if (
    text.includes(
      'interrupted',
    )
    || text.includes(
      'interrupt',
    )
  ) {
    return 'timeout';
  }

  if (
    text.includes('syntax')
  ) {
    return 'syntax-error';
  }

  return 'runtime-error';
}

function normalizeReason(
  reason,
) {
  return [
    'failed',
    'syntax-error',
    'runtime-error',
    'timeout',
  ].includes(reason)
    ? reason
    : 'runtime-error';
}

function write(value) {
  process.stdout.write(
    JSON.stringify(value),
  );
}
`;
