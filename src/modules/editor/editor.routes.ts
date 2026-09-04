import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { uploadArticleImageToCloudinary } from '../../lib/cloudinary';
import { createEditorArticle, deleteEditorArticle, getEditorArticle, listEditorArticles, updateEditorArticle } from './editor.service';

const slugOk = (slug: unknown) => typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 160;
const validStatus = ['draft', 'scheduled', 'published', 'archived'];

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
    if (!input.title || !slugOk(input.slug) || !input.contentHtml || !validStatus.includes(input.status)) {
      set.status = 400; return { ok: false, message: 'Invalid OpenClaw article payload' };
    }
    try { return { ok: true, article: await createEditorArticle(input, { id: user.uid, name: user.name || user.email || user.uid }) }; }
    catch { set.status = 409; return { ok: false, message: 'Slug already exists or payload conflicts' }; }
  });
