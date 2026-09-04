import { describe, expect, it } from 'bun:test';
import { validateOpenClawArticlePayload } from '../src/modules/editor/editor.routes';

describe('[EDITOR-05] OpenClaw article payload validation', () => {
  const valid = { title: 'Panduan Top Up', slug: 'panduan-top-up', focusKeyword: 'top up game', metaDescription: 'Panduan top up game aman.', contentHtml: '<p>Isi</p>', status: 'draft' };
  it('accepts valid draft payload', () => expect(validateOpenClawArticlePayload(valid)).toBeNull());
  it('requires publishAt for scheduled payload', () => expect(validateOpenClawArticlePayload({ ...valid, status: 'scheduled' })).toContain('publishAt'));
  it('rejects invalid slug', () => expect(validateOpenClawArticlePayload({ ...valid, slug: 'Bad Slug' })).toContain('slug'));
  it('requires SEO metadata', () => expect(validateOpenClawArticlePayload({ ...valid, metaDescription: '' })).toContain('metaDescription'));
  it('validates FAQ question and answer', () => expect(validateOpenClawArticlePayload({ ...valid, faqs: [{ question: 'Q' }] })).toContain('faqs'));
});
