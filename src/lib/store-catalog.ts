import { BUNDLE, GUIDES, priceLabel } from './guides';

export type CatalogItem = { id: string; title: string; description: string; price: string | null; href: string };
// Only public fields leave this boundary. No checkout, private paths or account data.
export function catalogItems(): CatalogItem[] {
  return [...GUIDES, BUNDLE].map(g => ({
    id: g.slug, title: g.title, description: g.description,
    price: priceLabel(g) || (g.slug === BUNDLE.slug ? '£35' : null),
    href: `/guide#${g.slug}`,
  }));
}
export function searchProducts(query: unknown): CatalogItem[] {
  if (typeof query !== 'string' || !query.trim() || query.length > 200) return [];
  const q = query.trim().toLowerCase();
  return catalogItems().filter(g => `${g.id} ${g.title} ${g.description}`.toLowerCase().includes(q)).slice(0, 8);
}
export function productDetails(id: unknown): CatalogItem | null {
  return typeof id === 'string' ? catalogItems().find(g => g.id === id) ?? null : null;
}
