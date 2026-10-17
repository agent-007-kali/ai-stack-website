// Single source of truth for the honest "no live reply" chat label.
//
// Both chat surfaces (/sales Bow Sales Customer Advisor and /try Bow Chat)
// must show this exact label whenever no live Groq/relay reply is available,
// so the two pages cannot drift apart. When a live reply IS served, each page
// keeps its own live wording.

export const SCRIPTED_DEMO_LABEL = 'scripted demo, not live';
