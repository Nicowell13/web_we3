import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const dynamic = 'force-dynamic';

async function getArticles() {
  const res = await fetch(`${API}/api/v1/articles`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return (await res.json()).articles || [];
}

export default async function ArticlesPage() {
  const articles = await getArticles();
  return <main className="min-h-screen bg-black text-white p-5 md:p-10"><div className="max-w-6xl mx-auto"><p className="text-primary text-xs font-mono">WETRI KNOWLEDGE BASE</p><h1 className="text-4xl font-bold mt-2">Artikel & Panduan</h1><p className="text-slate-400 mt-2">Tips game, top up, promo, dan panduan terbaru.</p><div className="grid md:grid-cols-3 gap-5 mt-8">{articles.map((a: any) => <Link href={`/articles/${a.slug}`} key={a.id} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden hover:border-primary"><>{a.coverImageUrl && <img src={a.coverImageUrl} alt={a.title} className="w-full aspect-video object-cover" />}<div className="p-4"><span className="text-xs text-primary">{a.category}</span><h2 className="font-bold text-lg mt-1">{a.title}</h2><p className="text-sm text-slate-400 mt-2">{a.metaDescription}</p><p className="text-xs text-slate-500 mt-3">{a.authorName} · {a.publishAt ? new Date(a.publishAt).toLocaleDateString('id-ID') : ''}</p></div></></Link>)}</div>{articles.length === 0 && <p className="mt-8 text-slate-500">Belum ada artikel published.</p>}</div></main>;
}
