import { and, desc, eq, ilike } from 'drizzle-orm';
import { db } from '../../db';
import { articleFaqs, articles, auditTrails } from '../../db/schema';

const articleColumns = {
  id: articles.id, title: articles.title, slug: articles.slug, category: articles.category,
  focusKeyword: articles.focusKeyword, metaDescription: articles.metaDescription,
  contentHtml: articles.contentHtml, coverImageUrl: articles.coverImageUrl,
  authorId: articles.authorId, authorName: articles.authorName, status: articles.status,
  generatedBy: articles.generatedBy, associatedGameId: articles.associatedGameId,
  viewCount: articles.viewCount, publishAt: articles.publishAt,
  createdAt: articles.createdAt, updatedAt: articles.updatedAt,
};

export async function listEditorArticles(search?: string, status?: string) {
  return db.select(articleColumns).from(articles)
    .where(and(search ? ilike(articles.title, `%${search}%`) : undefined, status ? eq(articles.status, status as any) : undefined))
    .orderBy(desc(articles.updatedAt)).limit(200);
}

export async function getEditorArticle(id: string) {
  const [article] = await db.select(articleColumns).from(articles).where(eq(articles.id, id));
  if (!article) return null;
  const faqs = await db.select().from(articleFaqs).where(eq(articleFaqs.articleId, id)).orderBy(articleFaqs.sortOrder);
  return { ...article, faqs };
}

export async function createEditorArticle(input: any, author: { id: string; name: string }) {
  const [article] = await db.insert(articles).values({
    title: input.title, slug: input.slug, category: input.category || 'General',
    focusKeyword: input.focusKeyword || null, metaDescription: input.metaDescription || null,
    contentHtml: input.contentHtml || '', coverImageUrl: input.coverImageUrl || null,
    authorId: author.id, authorName: author.name, status: input.status || 'draft',
    generatedBy: input.generatedBy || 'manual', associatedGameId: input.associatedGameId || null,
    publishAt: input.publishAt ? new Date(input.publishAt) : null,
  }).returning(articleColumns);
  if (input.faqs?.length) await db.insert(articleFaqs).values(input.faqs.map((faq: any, i: number) => ({ articleId: article.id, question: faq.question, answer: faq.answer, sortOrder: faq.sortOrder ?? i })));
  await db.insert(auditTrails).values({ eventType: 'ARTICLE_CHANGE', referenceId: article.id, rawRequest: input });
  return getEditorArticle(article.id);
}

export async function updateEditorArticle(id: string, input: any) {
  const patch: any = { updatedAt: new Date() };
  for (const key of ['title', 'slug', 'category', 'focusKeyword', 'metaDescription', 'contentHtml', 'coverImageUrl', 'status', 'generatedBy', 'associatedGameId']) if (input[key] !== undefined) patch[key] = input[key] || null;
  if (input.publishAt !== undefined) patch.publishAt = input.publishAt ? new Date(input.publishAt) : null;
  const [article] = await db.update(articles).set(patch).where(eq(articles.id, id)).returning(articleColumns);
  if (!article) return null;
  if (input.faqs) {
    await db.delete(articleFaqs).where(eq(articleFaqs.articleId, id));
    if (input.faqs.length) await db.insert(articleFaqs).values(input.faqs.map((faq: any, i: number) => ({ articleId: id, question: faq.question, answer: faq.answer, sortOrder: faq.sortOrder ?? i })));
  }
  await db.insert(auditTrails).values({ eventType: 'ARTICLE_CHANGE', referenceId: id, rawRequest: input });
  return getEditorArticle(id);
}

export async function deleteEditorArticle(id: string) {
  const [article] = await db.update(articles).set({ status: 'archived', updatedAt: new Date() }).where(eq(articles.id, id)).returning(articleColumns);
  if (article) await db.insert(auditTrails).values({ eventType: 'ARTICLE_CHANGE', referenceId: id, rawRequest: { status: 'archived' } });
  return article || null;
}
