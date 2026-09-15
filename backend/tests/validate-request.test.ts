import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validateRequest } from '../src/middleware/validate-request.js';

const validationError = {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
  },
};

describe('validateRequest', () => {
  it('passes a valid parsed body to the next handler', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/items',
      validateRequest({ body: z.object({ name: z.string().trim().min(1) }) }),
      (request_, response) => {
        response.json({ reached: true, body: request_.body as unknown });
      },
    );

    const response = await request(app).post('/items').send({ name: '  CodeGym  ' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reached: true, body: { name: 'CodeGym' } });
  });

  it('rejects an invalid body with the stable safe contract', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/items',
      validateRequest({ body: z.object({ name: z.string().min(1) }) }),
      (_request, response) => {
        response.status(204).end();
      },
    );

    const response = await request(app).post('/items').send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(validationError);
    expect(response.text).not.toContain('issues');
    expect(response.text).not.toContain('stack');
  });

  it('passes valid parsed params to the next handler', async () => {
    const app = express();
    app.get(
      '/items/:itemId',
      validateRequest({ params: z.object({ itemId: z.coerce.number().int().positive() }) }),
      (request_, response) => {
        response.json({ params: request_.params });
      },
    );

    const response = await request(app).get('/items/42');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ params: { itemId: 42 } });
  });

  it('rejects invalid params with the stable safe contract', async () => {
    const app = express();
    app.get(
      '/items/:itemId',
      validateRequest({ params: z.object({ itemId: z.coerce.number().int().positive() }) }),
      (_request, response) => {
        response.status(204).end();
      },
    );

    const response = await request(app).get('/items/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(validationError);
  });

  it('passes a valid parsed query to the next handler under Express 5', async () => {
    const app = express();
    app.get(
      '/items',
      validateRequest({ query: z.object({ page: z.coerce.number().int().positive() }) }),
      (request_, response) => {
        response.json({ query: request_.query });
      },
    );

    const response = await request(app).get('/items').query({ page: '2' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ query: { page: 2 } });
  });

  it('rejects an invalid query with the stable safe contract', async () => {
    const app = express();
    app.get(
      '/items',
      validateRequest({ query: z.object({ page: z.coerce.number().int().positive() }) }),
      (_request, response) => {
        response.status(204).end();
      },
    );

    const response = await request(app).get('/items').query({ page: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(validationError);
  });

  it('validates body, params, and query together', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/technologies/:technologyId',
      validateRequest({
        body: z.object({ enabled: z.boolean() }),
        params: z.object({ technologyId: z.string().min(1) }),
        query: z.object({ page: z.coerce.number().int().positive() }),
      }),
      (request_, response) => {
        response.json({
          body: request_.body as unknown,
          params: request_.params,
          query: request_.query,
        });
      },
    );

    const response = await request(app)
      .post('/technologies/typescript')
      .query({ page: '3' })
      .send({ enabled: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: { enabled: true },
      params: { technologyId: 'typescript' },
      query: { page: 3 },
    });
  });

  it('replaces all request sections with sanitized Zod outputs', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/items/:itemId',
      validateRequest({
        body: z.object({ email: z.string().trim().toLowerCase() }),
        params: z.object({ itemId: z.string().transform((value) => value.toUpperCase()) }),
        query: z.object({ page: z.coerce.number().int().positive() }),
      }),
      (request_, response) => {
        response.json({
          body: request_.body as unknown,
          params: request_.params,
          query: request_.query,
        });
      },
    );

    const response = await request(app)
      .post('/items/exercise-a')
      .query({ page: '4', discardedQuery: 'remove-me' })
      .send({ email: '  USER@EXAMPLE.COM  ', discardedBody: 'remove-me' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: { email: 'user@example.com' },
      params: { itemId: 'EXERCISE-A' },
      query: { page: 4 },
    });
  });
});
