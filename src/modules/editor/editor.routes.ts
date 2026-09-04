import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { uploadArticleImageToCloudinary } from '../../lib/cloudinary';
import { createEditorArticle, deleteEditorArticle, getEditorArticle, listEditorArticles, updateEditorArticle } from './editor.service';

const slugOk = (slug: unknown) => typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 160;
const validStatus = ['draft', 'scheduled', 'published', 'archived'];

export function validateOpenClawArticlePayload(input: any): string | null {
  if (!input || typeof input !== 'object') return 'payload must be an object';
  if (!input.title || typeof input.title !== 'string' || input.title.length > 160) return 'title is required and must be <= 160 characters';
  if (!slugOk(input.slug)) return 'slug must be lowercase kebab-case';
  if (!input.contentHtml || typeof input.contentHtml !== 'string') return 'contentHtml is required';
  if (input.status !== undefined && !['draft', 'scheduled'].includes(input.status)) return 'OpenClaw status must be draft or scheduled';
  if (input.status === 'scheduled' && !input.publishAt) return 'publishAt is required for scheduled articles';
  if (!input.metaDescription || typeof input.metaDescription !== 'string' || input.metaDescription.length > 160) return 'metaDescription is required and must be <= 160 characters';
  if (!input.focusKeyword || typeof input.focusKeyword !== 'string') return 'focusKeyword is required';
  if (input.faqs !== undefined && (!Array.isArray(input.faqs) || input.faqs.some((faq: any) => !faq?.question || !faq?.answer))) return 'faqs must contain question and answer';
  return null;
}

export const editorRoutes = new Elysia({ prefix: '/api/v1/edt-school' })
  .use(requireRole(['editor', 'admin']))
  .get('/ping', ({ role }) => ({ ok: true, scope: 'edt-school', role }))
  .get('/articles', async ({ query }) => ({ ok: true, articles: await listEditorArticles((query as any).search, (query as any).status) }))
  .get('/articles/:id', async ({ params, set }) => {
    const article = await getEditorArticle(params.id);
    if (!article) { set.status = 404; return { ok: false, message: 'Article not found' }; }
    return { ok: true, article };
  })
  .post('/articles', async ({ body, user, set }) => {
    const input = body as any;
    if (!input.title || !slugOk(input.slug) || !input.contentHtml || !validStatus.includes(input.status || 'draft')) {
      set.status = 400; return { ok: false, message: 'title, valid slug, contentHtml, and status are required' };
    }
    try { return { ok: true, article: await createEditorArticle(input, { id: user.uid, name: user.name || user.email || user.uid }) }; }
    catch { set.status = 409; return { ok: false, message: 'Slug already exists or payload conflicts' }; }
  })
  .patch('/articles/:id', async ({ params, body, set }) => {
    const input = body as any;
    if (input.slug !== undefined && !slugOk(input.slug)) { set.status = 400; return { ok: false, message: 'Invalid slug' }; }
    if (input.status !== undefined && !validStatus.includes(input.status)) { set.status = 400; return { ok: false, message: 'Invalid status' }; }
    try {
      const article = await updateEditorArticle(params.id, input);
      if (!article) { set.status = 404; return { ok: false, message: 'Article not found' }; }
      return { ok: true, article };
    } catch { set.status = 409; return { ok: false, message: 'Slug already exists or payload conflicts' }; }
  })
  .delete('/articles/:id', async ({ params, set }) => {
    const article = await deleteEditorArticle(params.id);
    if (!article) { set.status = 404; return { ok: false, message: 'Article not found' }; }
    return { ok: true, article };
  })
  .post('/upload-image', async ({ body, set }) => {
    const input = body as { image?: string; publicId?: string };
    if (!input.image?.startsWith('data:image/')) { set.status = 400; return { ok: false, message: 'image data URL is required' }; }
    try { return { ok: true, url: await uploadArticleImageToCloudinary(input.image, input.publicId) }; }
    catch { set.status = 502; return { ok: false, message: 'Cloudinary upload failed' }; }
  })
  .post('/automated-publish', async ({ body, user, set }) => {
    const input = { ...(body as any), generatedBy: 'openclaw', status: (body as any).status || 'draft' };
    const validationError = validateOpenClawArticlePayload(input);
    if (validationError) {
      set.status = 400; return { ok: false, message: validationError };
    }
    try { return { ok: true, article: await createEditorArticle(input, { id: user.uid, name: user.name || user.email || user.uid }) }; }
    catch { set.status = 409; return { ok: false, message: 'Slug already exists or payload conflicts' }; }
  });
