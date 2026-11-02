import { NextResponse } from 'next/server';
import { BUNDLE, GUIDES } from '@/lib/guides';

// GET /api/bot/catalogue - machine-readable list of the PDF guide range,
// read straight from the same table the /guide page uses. Scope is the guide
// range only: Boxes, Bow Bot and Whop-listed editions are not included.
// Free reading; purchase happens on the page, human-authorised.
export async function GET() {
  const label = (env: string, fallback: string) => process.env[env] || fallback;
  const items = [
    ...GUIDES.map((g) => ({
      slug: g.slug,
      kind: 'guide',
      title: g.title,
      description: g.description,
      url: '/guide',
      price_label: g.whopPrice || label(g.labelEnv, 'see site'),
    })),
    {
      slug: BUNDLE.slug,
      kind: 'bundle',
      title: BUNDLE.title,
      description: BUNDLE.description,
      url: '/guide',
      price_label: BUNDLE.whopPrice || label(BUNDLE.labelEnv, 'see site'),
    },
  ];
  return NextResponse.json({
    updated: '2026-11-02',
    scope: 'PDF guide range only - Boxes, Bow Bot and Whop-listed editions are not included.',
    note: 'Buying is a human-authorised action through the page; this endpoint only lists what exists.',
    items,
  });
}
