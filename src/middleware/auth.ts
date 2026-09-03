import { Elysia, InternalServerError } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { adminAuth } from '../lib/firebase-admin';

class UnauthorizedError extends Error {
  status = 401;
  constructor(msg: string) { super(msg); this.name = 'UnauthorizedError'; }
}

class ForbiddenError extends Error {
  status = 403;
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError'; }
}

async function resolveToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) throw new UnauthorizedError('Missing Authorization header');

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) throw new UnauthorizedError('Invalid Authorization format. Use: Bearer <idToken>');

  if (!adminAuth) throw new InternalServerError('Firebase Admin not initialized on server');

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired Firebase ID token');
  }
}

async function resolveDbUser(uid: string) {
  return db.query.users.findFirst({
    where: eq(users.id, uid),
    columns: { role: true, status: true },
  });
}

async function resolveDbRole(uid: string): Promise<'admin' | 'user'> {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, uid),
    columns: { role: true },
  });
  return dbUser?.role === 'admin' ? 'admin' : 'user';
}

/** Authenticate plugin — injects Firebase identity + DB-backed role into scoped context. */
export const authenticate = new Elysia({ name: 'authenticate' })
  .error({ UnauthorizedError, ForbiddenError })
  .onError(({ error, set }) => {
    if (error instanceof UnauthorizedError) { set.status = 401; return { message: error.message }; }
    if (error instanceof ForbiddenError)    { set.status = 403; return { message: error.message }; }
  })
  .derive({ as: 'scoped' }, async ({ request }) => {
    const decoded = await resolveToken(request);
    const dbUser = await resolveDbUser(decoded.uid);
    const role = dbUser?.role === 'admin' ? 'admin' : 'user';
    if (dbUser?.status === 'banned') throw new ForbiddenError('Account banned');
    if (dbUser?.status === 'suspended') throw new ForbiddenError('Account suspended');
    return { user: { ...decoded, role, status: dbUser?.status ?? 'active' }, role };
  });

/** requireRole plugin — throws 403 if caller role from Supabase users.role does not match. */
export function requireRole(requiredRole: 'admin' | 'user') {
  return new Elysia({ name: `requireRole:${requiredRole}` })
    .error({ UnauthorizedError, ForbiddenError })
    .onError(({ error, set }) => {
      if (error instanceof UnauthorizedError) { set.status = 401; return { message: error.message }; }
      if (error instanceof ForbiddenError)    { set.status = 403; return { message: error.message }; }
    })
    .derive({ as: 'scoped' }, async ({ request }) => {
      const decoded = await resolveToken(request);
      const dbUser = await resolveDbUser(decoded.uid);
      const role = dbUser?.role === 'admin' ? 'admin' : 'user';
      if (dbUser?.status === 'banned' || dbUser?.status === 'suspended') {
        throw new ForbiddenError(`Account ${dbUser.status}`);
      }
      if (requiredRole === 'admin' && role !== 'admin') {
        throw new ForbiddenError('Forbidden: admin role required');
      }
      return { user: { ...decoded, role, status: dbUser?.status ?? 'active' }, role };
    });
}
