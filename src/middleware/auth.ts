import { Elysia, InternalServerError } from 'elysia';
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

/** Authenticate plugin — injects user + role into scoped context. */
export const authenticate = new Elysia({ name: 'authenticate' })
  .error({ UnauthorizedError, ForbiddenError })
  .onError(({ error, set }) => {
    if (error instanceof UnauthorizedError) { set.status = 401; return { message: error.message }; }
    if (error instanceof ForbiddenError)    { set.status = 403; return { message: error.message }; }
  })
  .derive({ as: 'scoped' }, async ({ request }) => {
    const decoded = await resolveToken(request);
    return { user: decoded, role: ((decoded as any).role ?? 'user') as string };
  });

/** requireRole plugin — throws 403 if caller role does not match. */
export function requireRole(requiredRole: 'admin' | 'user') {
  return new Elysia({ name: `requireRole:${requiredRole}` })
    .error({ UnauthorizedError, ForbiddenError })
    .onError(({ error, set }) => {
      if (error instanceof UnauthorizedError) { set.status = 401; return { message: error.message }; }
      if (error instanceof ForbiddenError)    { set.status = 403; return { message: error.message }; }
    })
    .derive({ as: 'scoped' }, async ({ request }) => {
      const decoded = await resolveToken(request);
      const role = ((decoded as any).role ?? 'user') as string;
      if (requiredRole === 'admin' && role !== 'admin') {
        throw new ForbiddenError('Forbidden: admin role required');
      }
      return { user: decoded, role };
    });
}
