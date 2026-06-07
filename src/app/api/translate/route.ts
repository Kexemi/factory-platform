// Translation API — Spanish/English for booking sites
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const biz = searchParams.get('business_id');
  const locale = searchParams.get('locale') || 'es';
  if (!biz) return NextResponse.json({ error: 'business_id required' }, { status: 400 });

  const { data } = await getDb().from('translations').select('*').eq('business_id', biz).eq('locale', locale);
  const translations: Record<string, string> = {};
  for (const t of data || []) translations[t.key] = t.value;
  return NextResponse.json({ locale, translations });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { business_id, locale, translations } = body;
  if (!business_id || !locale || !translations) {
    return NextResponse.json({ error: 'business_id, locale, translations required' }, { status: 400 });
  }

  // Auto-translate using AI if OpenAI is configured
  if (process.env.OPENAI_API_KEY && !body.skip_ai) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const keys = Object.keys(translations);
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Translate these website strings to ${locale === 'es' ? 'Spanish' : locale}. Return JSON with same keys.\n${JSON.stringify(translations, null, 2)}`
        }],
        response_format: { type: 'json_object' },
      });
      const translated = JSON.parse(response.choices?.[0]?.message?.content || '{}');
      // Store each translation
      for (const [key, value] of Object.entries(translated)) {
        await getDb().from('translations').upsert({ business_id, locale, key, value: value as string }, { onConflict: 'business_id,locale,key' });
      }
      return NextResponse.json({ locale, translations: translated });
    } catch (e: any) {
      return NextResponse.json({ error: 'AI translation failed: ' + e.message }, { status: 500 });
    }
  }

  // Manual translations
  for (const [key, value] of Object.entries(translations)) {
    await getDb().from('translations').upsert({ business_id, locale, key, value: value as string }, { onConflict: 'business_id,locale,key' });
  }
  return NextResponse.json({ ok: true });
}
