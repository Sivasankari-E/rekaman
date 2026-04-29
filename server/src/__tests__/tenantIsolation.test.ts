import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

interface AuthCreds {
  token: string;
  brandId: string;
  brandSlug: string;
  userId: string;
}

async function signupBrand(label: string): Promise<AuthCreds> {
  const res = await request(app)
    .post('/auth/signup')
    .send({
      email: `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@rekaman.test`,
      password: 'test12345',
      companyName: `Test ${label}`,
    });

  expect(res.status).toBe(201);
  return {
    token: res.body.token,
    brandId: res.body.brand.id,
    brandSlug: res.body.brand.slug,
    userId: res.body.user.id,
  };
}

describe('Tenant Isolation (CRITICAL)', () => {
  let brandA: AuthCreds;
  let brandB: AuthCreds;

  beforeEach(async () => {
    brandA = await signupBrand('A');
    brandB = await signupBrand('B');
  });

  it('Brand B cannot see Brand A’s products via list', async () => {
    await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Oslo Sofa', slug: 'oslo-sofa' })
      .expect(201);

    const res = await request(app)
      .get('/products')
      .set('Authorization', `Bearer ${brandB.token}`)
      .expect(200);

    expect(res.body.products).toEqual([]);
  });

  it('Brand B cannot read Brand A’s product by ID', async () => {
    const created = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Berlin Chair', slug: 'berlin-chair' });

    const productId = created.body.product.id;

    const res = await request(app)
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${brandB.token}`)
      .expect(404);

    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('Brand B cannot update Brand A’s product', async () => {
    const created = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Tokyo Lamp', slug: 'tokyo-lamp' });

    const productId = created.body.product.id;

    await request(app)
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${brandB.token}`)
      .send({ name: 'HACKED' })
      .expect(404);

    const verify = await request(app)
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .expect(200);

    expect(verify.body.product.name).toBe('Tokyo Lamp');
  });

  it('Brand B cannot delete Brand A’s product', async () => {
    const created = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Paris Bed', slug: 'paris-bed' });

    const productId = created.body.product.id;

    await request(app)
      .delete(`/products/${productId}`)
      .set('Authorization', `Bearer ${brandB.token}`)
      .expect(404);

    await request(app)
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .expect(200);
  });

  it('Both brands can have a product with the same slug (DB-level isolation)', async () => {
    await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'A’s Sofa', slug: 'oslo-sofa' })
      .expect(201);

    await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${brandB.token}`)
      .send({ name: 'B’s Sofa', slug: 'oslo-sofa' })
      .expect(201);
  });

  it('Requests without auth token are rejected', async () => {
    await request(app).get('/products').expect(401);
    await request(app).post('/products').send({}).expect(401);
  });

  it('Requests with tampered tokens are rejected', async () => {
    const tampered = brandA.token.slice(0, -5) + 'XXXXX';
    await request(app)
      .get('/products')
      .set('Authorization', `Bearer ${tampered}`)
      .expect(401);
  });
});
