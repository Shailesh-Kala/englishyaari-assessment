import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from '../setup/test-app.js';
import { useTestDb } from '../setup/test-db.js';

const validUser = { fullName: 'Asha Rao', email: 'Asha@Example.com', phone: '+919876543210' };

describe('POST /users', () => {
  useTestDb();
  const app = testApp();

  it('creates a user and returns 201 with the email lowercased', async () => {
    const res = await request(app).post('/users').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      _id: expect.stringMatching(/^[a-f\d]{24}$/),
      fullName: 'Asha Rao',
      email: 'asha@example.com',
      phone: '+919876543210',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('ignores fields the client is not allowed to set', async () => {
    const res = await request(app)
      .post('/users')
      .send({ ...validUser, _id: '000000000000000000000001', createdAt: '2000-01-01' });

    expect(res.status).toBe(201);
    expect(res.body._id).not.toBe('000000000000000000000001');
    expect(res.body.createdAt).not.toContain('2000');
  });

  it('returns 400 VALIDATION_ERROR listing every missing field', async () => {
    const res = await request(app).post('/users').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual([
      'email',
      'fullName',
      'phone',
    ]);
  });

  it.each([
    ['email', { email: 'not-an-email' }],
    ['phone', { phone: '12ab' }],
    ['fullName', { fullName: '   ' }],
  ])('returns 400 for an invalid %s', async (field, override) => {
    const res = await request(app)
      .post('/users')
      .send({ ...validUser, ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ path: field, message: expect.any(String) }]);
  });

  it('returns 409 EMAIL_ALREADY_EXISTS for a duplicate email in a different case', async () => {
    await request(app).post('/users').send(validUser);

    const res = await request(app)
      .post('/users')
      .send({ ...validUser, email: 'asha@example.COM', phone: '+919876543211' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});
