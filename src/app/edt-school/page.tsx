'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogIn, ShieldAlert, Upload, Plus, X } from 'lucide-react';

type FAQ = { question: string; answer: string };
type Article = { id: string; title: string; slug: string; category: string; focusKeyword?: string; metaDescription?: string; contentHtml: string; coverImageUrl?: string; status: string; generatedBy: string; publishAt?: string | null; createdAt: string; };
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const statuses = ['draft', 'scheduled', 'published', 'archived'];

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, ''); }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('id-ID') : '-'; }

export default function EditorSchoolPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied' | 'login'>('checking');
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<Article | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  async function request(path: string, init: RequestInit = {}) {
    const token = await user?.getIdToken();
    return fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  }
  async function load() {
    if (!user) { setAccess('login'); return; }
    const probe = await request('/api/v1/edt-school/ping');
    if (probe.status === 401) { setAccess('login'); return; }
    if (probe.status === 403 || !probe.ok) { setAccess('denied'); return; }
    setAccess('allowed');
    const res = await request('/api/v1/edt-school/articles');
    const data = await res.json();
    setArticles(data.articles || []);
  }
  useEffect(() => { if (!loading) load().catch(() => setAccess('denied')); }, [loading, user]);

  const counts = useMemo(() => statuses.reduce((acc, s) => ({ ...acc, [s]: articles.filter(a => a.status === s).length }), {} as Record<string, number>), [articles]);
  const visible = articles.filter(a => !filter || a.status === filter);
  const openNew = () => { setFaqs([]); setEditor({ id: '', title: '', slug: '', category: 'General', focusKeyword: '', metaDescription: '', contentHtml: '', status: 'draft', generatedBy: 'manual', publishAt: null, createdAt: '' }); };
  const openEdit = async (id: string) => { const res = await request(`/api/v1/edt-school/articles/${id}`); const data = await res.json(); setEditor(data.article); setFaqs(data.article?.faqs || []); };
  const save = async (status?: string) => {
    if (!editor) return;
    const payload = { ...editor, title: editor.title.trim(), slug: slugify(editor.slug || editor.title), status: status || editor.status, contentHtml: contentRef.current?.innerHTML || editor.contentHtml, faqs };
    if (!payload.title || !payload.contentHtml) { setMessage('Judul dan isi artikel wajib diisi.'); return; }
    const res = await request(payload.id ? `/api/v1/edt-school/articles/${payload.id}` : '/api/v1/edt-school/articles', { method: payload.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.message || 'Gagal menyimpan artikel.'); return; }
    setMessage('Artikel tersimpan.'); setEditor(null); await load();
  };
  const action = async (id: string, status: string) => { await request(`/api/v1/edt-school/articles/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); };
  const upload = async (file: File) => { const reader = new FileReader(); reader.onload = async () => { const res = await request('/api/v1/edt-school/upload-image', { method: 'POST', body: JSON.stringify({ image: reader.result }) }); const data = await res.json(); if (res.ok) setEditor(v => v ? ({ ...v, coverImageUrl: data.url }) : v); else setMessage(data.message || 'Upload gagal.'); }; reader.readAsDataURL(file); };

  if (loading || access === 'checking') return <main className="min-h-screen bg-black text-primary p-8">Memeriksa akses editor...</main>;
  if (access === 'login') return <main className="min-h-screen bg-black text-white grid place-items-center"><button onClick={signInWithGoogle} className="px-5 py-3 rounded bg-primary text-black font-bold"><LogIn className="inline mr-2" size={16} />Login untuk Editor</button></main>;
  if (access === 'denied') return <main className="min-h-screen bg-black text-red-400 grid place-items-center"><div className="text-center"><ShieldAlert className="mx-auto mb-3" size={48} /><h1 className="text-2xl font-bold">403 — Editor access required</h1><p className="text-slate-400 mt-2">Role user tidak dapat membuka `/edt-school`.</p></div></main>;

  return <main className="min-h-screen bg-black text-white p-4 md:p-8 space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-primary text-xs font-mono">EDITOR CONTROL ROOM</p><h1 className="text-3xl font-bold">Article Publisher</h1></div><button onClick={openNew} className="px-4 py-2 rounded bg-primary text-black font-bold"><Plus className="inline mr-1" size={16} />Artikel Baru</button></header>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{['all', ...statuses].map(s => <button key={s} onClick={() => setFilter(s === 'all' ? '' : s)} className="text-left rounded border border-slate-700 bg-slate-900 p-3"><p className="text-xs text-slate-400 uppercase">{s}</p><b className="text-2xl text-primary">{s === 'all' ? articles.length : counts[s]}</b></button>)}</div>
    {message && <p className="rounded border border-primary/40 bg-primary/10 p-3 text-sm text-primary">{message}</p>}
    <section className="rounded-xl border border-slate-800 overflow-hidden"><div className="max-h-[600px] overflow-y-auto">{visible.length === 0 ? <p className="p-8 text-slate-500">Belum ada artikel.</p> : visible.map(a => <article key={a.id} className="p-4 border-b border-slate-800 flex flex-wrap gap-3 items-center justify-between"><div className="min-w-[240px] flex-1"><div className="flex gap-2 items-center"><h2 className="font-bold">{a.title}</h2><span className="text-[10px] px-2 py-1 rounded bg-slate-700 uppercase">{a.status}</span>{a.generatedBy === 'openclaw' && <span className="text-[10px] px-2 py-1 rounded bg-purple-500/20 text-purple-300">OPENCLAW</span>}</div><p className="text-xs text-slate-400 mt-1">/{a.slug} · {a.category} · Publish: {formatDate(a.publishAt)}</p></div><div className="flex gap-2"><button onClick={() => openEdit(a.id)} className="px-3 py-1 rounded bg-slate-700 text-xs">Edit</button>{a.status !== 'published' && <button onClick={() => action(a.id, 'published')} className="px-3 py-1 rounded bg-primary text-black text-xs">Publish</button>}{a.status !== 'archived' && <button onClick={() => action(a.id, 'archived')} className="px-3 py-1 rounded bg-red-500/20 text-red-300 text-xs">Archive</button>}</div></article>)}</div></section>
    {editor && <div className="fixed inset-0 z-50 bg-black/80 p-3 md:p-8 overflow-y-auto"><div className="max-w-6xl mx-auto rounded-xl border border-primary/40 bg-slate-950 p-5 space-y-4"><div className="flex justify-between"><h2 className="text-xl font-bold text-primary">{editor.id ? 'Edit Artikel' : 'Artikel Baru'}</h2><button onClick={() => setEditor(null)}><X /></button></div><div className="grid lg:grid-cols-[1fr_320px] gap-5"><div className="space-y-3"><input value={editor.title} onChange={e => setEditor({ ...editor, title: e.target.value, slug: editor.slug || slugify(e.target.value) })} placeholder="Judul artikel / H1" className="w-full rounded bg-black border border-slate-700 p-3" /><div className="grid sm:grid-cols-2 gap-2"><input value={editor.slug} onChange={e => setEditor({ ...editor, slug: slugify(e.target.value) })} placeholder="slug" className="rounded bg-black border border-slate-700 p-2" /><input value={editor.category} onChange={e => setEditor({ ...editor, category: e.target.value })} placeholder="Kategori" className="rounded bg-black border border-slate-700 p-2" /></div><div className="flex flex-wrap gap-1"><button onClick={() => document.execCommand('formatBlock', false, 'h2')} className="tool">H2</button><button onClick={() => document.execCommand('formatBlock', false, 'h3')} className="tool">H3</button><button onClick={() => document.execCommand('bold')} className="tool">B</button><button onClick={() => document.execCommand('italic')} className="tool">I</button><button onClick={() => document.execCommand('insertUnorderedList')} className="tool">List</button><button onClick={() => document.execCommand('formatBlock', false, 'blockquote')} className="tool">Quote</button><button onClick={() => document.execCommand('createLink', false, prompt('URL link') || '')} className="tool">Link</button></div><div ref={contentRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: editor.contentHtml }} className="min-h-[360px] rounded bg-white text-black p-4 focus:outline-primary" /><textarea value={editor.metaDescription || ''} onChange={e => setEditor({ ...editor, metaDescription: e.target.value })} placeholder="Meta description (150-160 karakter)" className="w-full rounded bg-black border border-slate-700 p-3" /><input value={editor.focusKeyword || ''} onChange={e => setEditor({ ...editor, focusKeyword: e.target.value })} placeholder="Focus keyword" className="w-full rounded bg-black border border-slate-700 p-2" /></div><aside className="space-y-4"><div className="rounded border border-slate-700 p-3"><b>SEO Preview</b><p className="text-blue-400 text-lg mt-2">{editor.title || 'Judul artikel'}</p><p className="text-green-500 text-xs">wetri.com/articles/{editor.slug || 'slug-artikel'}</p><p className="text-sm text-slate-400">{editor.metaDescription || 'Meta description tampil di sini.'}</p><p className="text-xs mt-2 text-slate-500">Title: {editor.title.length}/60 · Description: {(editor.metaDescription || '').length}/160</p></div><label className="block rounded border border-slate-700 p-3 text-sm">Cover image<input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} className="mt-2 text-xs" />{editor.coverImageUrl && <img src={editor.coverImageUrl} alt="Cover preview" className="mt-2 rounded w-full" />}<Upload size={15} className="inline mr-1" /></label><select value={editor.status} onChange={e => setEditor({ ...editor, status: e.target.value })} className="w-full rounded bg-black border border-slate-700 p-2">{statuses.map(s => <option key={s}>{s}</option>)}</select><input type="datetime-local" value={editor.publishAt ? editor.publishAt.slice(0, 16) : ''} onChange={e => setEditor({ ...editor, publishAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full rounded bg-black border border-slate-700 p-2" /><div className="rounded border border-slate-700 p-3"><div className="flex justify-between"><b>FAQ schema</b><button onClick={() => setFaqs([...faqs, { question: '', answer: '' }])} className="text-primary">+</button></div>{faqs.map((f, i) => <div key={i} className="mt-2 space-y-1"><input value={f.question} onChange={e => setFaqs(faqs.map((x, n) => n === i ? { ...x, question: e.target.value } : x))} placeholder="Pertanyaan" className="w-full rounded bg-black p-2 text-xs" /><textarea value={f.answer} onChange={e => setFaqs(faqs.map((x, n) => n === i ? { ...x, answer: e.target.value } : x))} placeholder="Jawaban" className="w-full rounded bg-black p-2 text-xs" /></div>)}</div></aside></div><div className="flex flex-wrap justify-end gap-2"><button onClick={() => save('draft')} className="px-4 py-2 rounded bg-slate-700">Simpan Draft</button><button onClick={() => save(editor.status === 'scheduled' ? 'scheduled' : 'published')} className="px-4 py-2 rounded bg-primary text-black font-bold">Simpan & Publish</button></div></div></div>}
  </main>;
}
