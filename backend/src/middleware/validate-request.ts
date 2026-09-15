import type { Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

type RequestSection = 'body' | 'params' | 'query';
type ObjectSchema = ZodType<Record<string, unknown>>;

export interface RequestValidationSchemas {
  readonly body?: ZodType;
  readonly params?: ObjectSchema;
  readonly query?: ObjectSchema;
}

interface ParsedSection {
  readonly section: RequestSection;
  readonly value: unknown;
}

function requestSectionValue(request: Request, section: RequestSection): unknown {
  if (section === 'body') {
    return request.body as unknown;
  }

  return request[section];
}

function replaceRequestSection(request: Request, { section, value }: ParsedSection): void {
  // Express 5 exposes query through a configurable getter without a setter.
  // Defining an own property also gives every section the same replacement semantics.
  Object.defineProperty(request, section, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function respondWithValidationError(response: Response): void {
  response.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
    },
  });
}

export function validateRequest(schemas: RequestValidationSchemas): RequestHandler {
  return (request, response, next) => {
    const parsedSections: ParsedSection[] = [];
    const sections = Object.keys(schemas) as RequestSection[];

    for (const section of sections) {
      const schema = schemas[section];
      if (schema === undefined) {
        continue;
      }

      const result = schema.safeParse(requestSectionValue(request, section));
      if (!result.success) {
        respondWithValidationError(response);
        return;
      }

      parsedSections.push({ section, value: result.data });
    }

    for (const parsedSection of parsedSections) {
      replaceRequestSection(request, parsedSection);
    }

    next();
  };
}
