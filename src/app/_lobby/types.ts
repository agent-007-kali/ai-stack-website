export type Need = 'agent' | 'learn' | 'business';
export type LinkItem = { label: string; sub: string; href?: string; to?: string };
export type Msg = { from: 'sol' | 'me'; text?: string; links?: LinkItem[]; form?: boolean };

export const needs: [Need, string][] = [
    ['agent', 'I want to see an agent in action'],
    ['learn', 'I want to learn'],
    ['business', 'I want help with my business'],
];

export const L_TRY: LinkItem = { label: 'Try Sol', sub: 'See an agent in action', to: '/try' };
export const L_ACA: LinkItem = { label: "Ana's Academy", sub: 'Module 1 is free', to: '/learn' };
export const L_BOOK: LinkItem = { label: 'Book a 1:1', sub: 'One to one, online', href: 'mailto:tradersbooking@gmail.com?subject=Book%20a%201%3A1%20with%20AI%20Solutions' };

export const doorFor: Record<Need, LinkItem[]> = {
    agent: [L_TRY, L_BOOK],
    learn: [L_ACA, L_BOOK],
    business: [L_BOOK, L_TRY],
};