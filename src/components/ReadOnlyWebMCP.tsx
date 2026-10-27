"use client";
import { useEffect } from 'react';
import { productDetails, searchProducts } from '@/lib/store-catalog';

type PublicTool = {
  name: string; description: string; inputSchema: object;
  annotations: { readOnlyHint: boolean; consequentialHint: boolean; untrustedContentHint: boolean };
  execute: (input: Record<string, unknown>) => Promise<string>;
};
type ModelContext = { registerTool: (tool: PublicTool, options: { signal: AbortSignal }) => Promise<void> };

export default function ReadOnlyWebMCP({ previewEnabled = false }: { previewEnabled?: boolean }) {
  useEffect(() => {
    // Pilot is opt-in, client-only, and harmless on browsers without WebMCP.
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context || !previewEnabled && process.env.NEXT_PUBLIC_WEBMCP_PILOT !== 'true') return;
    const controller = new AbortController();
    const annotations = { readOnlyHint: true, consequentialHint: false, untrustedContentHint: false };
    const tools: PublicTool[] = [
      { name: 'search_products', description: 'Search public PDF guides. Returns up to eight guide IDs, titles and detail links. Does not buy, sign up or send information.',
        inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 200 } }, required: ['query'], additionalProperties: false },
        annotations, execute: async ({ query }) => JSON.stringify({ results: searchProducts(query).map(({ id, title, href, price }) => ({ id, title, href, price })) }) },
      { name: 'get_product_details', description: 'Read one public PDF guide by ID. Null price means unavailable, not free. No purchase or account action.',
        inputSchema: { type: 'object', properties: { productId: { type: 'string', maxLength: 200 } }, required: ['productId'], additionalProperties: false },
        annotations, execute: async ({ productId }) => JSON.stringify({ product: productDetails(productId), note: 'Confirm displayed price at checkout. This tool does not start checkout.' }) },
    ];
    // Sequential registration keeps cleanup predictable during React remounts.
    void (async () => {
      for (const tool of tools) {
        if (controller.signal.aborted) return;
        await context.registerTool(tool, { signal: controller.signal });
      }
    })().catch(() => { controller.abort(); });
    return () => controller.abort();
  }, [previewEnabled]);
  return null;
}
