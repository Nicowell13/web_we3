import { Elysia } from 'elysia';
import { getPublishedArticle, listPublishedArticles } from './editor.service';

export const publicArticleRoutes = new Elysia({ prefix: '/api/v1/articles' })
  .get('/', async ({ query }) => ({ ok: true, articles: await listPublishedArticles((query as { search?: string }).search) }))
  .get('/:slug', async ({ params, set }) => {
    const article = await getPublishedArticle(params.slug);
    if (!article) { set.status = 404; return { ok: false, message: 'Article not found' }; }
    return { ok: true, article };
  });
