// Tests for the /win analyzer and SSRF IP guard (issue #32).
// Run: npm run test:wins. No Next server needed.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeSite, detectTrade, findGaps, pickWins, TEASER, type Gap } from './wins.ts';
import { ipBlocked } from './win-fetch.ts';

describe('ipBlocked', () => {
  for (const ip of [
    '127.0.0.1',
    '10.1.2.3',
    '172.16.5.5',
    '192.168.1.10',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '255.255.255.255',
    '224.0.0.1',
    '::1',
    '::',
    'fc00::1',
    'fd12::1',
    'fe80::1',
    '::ffff:192.168.0.1',
    'not-an-ip',
  ]) {
    it(`blocks ${ip}`, () => assert.equal(ipBlocked(ip), true));
  }
  for (const ip of ['8.8.8.8', '93.184.216.34', '1.1.1.1', '2606:4700:4700::1111']) {
    it(`allows ${ip}`, () => assert.equal(ipBlocked(ip), false));
  }
});

describe('detectTrade', () => {
  it('detects from the URL', () => {
    assert.equal(detectTrade('https://tokyobantsu-ramen.co.uk/menu', ''), 'restaurant');
    assert.equal(detectTrade('https://brightsmiles-salon.co.uk/', ''), 'salon');
    assert.equal(detectTrade('https://honestplumbing.co.uk/', ''), 'trades');
    assert.equal(detectTrade('https://northgate-estate.co.uk/', ''), 'estate');
    assert.equal(detectTrade('https://prestigemotors.co.uk/', ''), 'dealer');
    assert.equal(detectTrade('https://ironhouse-gym.co.uk/', ''), 'gym');
    assert.equal(detectTrade('https://beanhouse-coffee.co.uk/', ''), 'cafe');
  });
  it('falls back to page text, then other', () => {
    assert.equal(detectTrade('https://x.example', '<h1>The Rusty Fork Restaurant</h1>'), 'restaurant');
    assert.equal(detectTrade('https://x.example', '<h1>Consulting</h1>'), 'other');
    assert.equal(detectTrade('', ''), 'other');
  });
});

describe('findGaps', () => {
  it('an empty page exposes every applicable gap in impact order', () => {
    const gaps = findGaps('', 'restaurant');
    assert.deepEqual(gaps.slice(0, 3), ['booking', 'form', 'reviews']);
    assert.ok(gaps.includes('menu'));
    assert.ok(gaps.includes('ecommerce'));
  });
  it('never suggests a menu or order gap for an estate agency', () => {
    const gaps = findGaps('', 'estate');
    assert.ok(!gaps.includes('menu'));
    assert.ok(!gaps.includes('ecommerce'));
  });
  it('a fully-featured page has no gaps', () => {
    const html = `
      <meta name="viewport" content="width=device-width" />
      <a href="/book">Book now</a>
      <form action="/contact"><input type="email" name="e" /></form>
      <a href="https://trustpilot.com/reviews/us">Reviews</a>
      <a href="/menu">Menu</a>
      <a href="/cart">Cart</a>
      <a href="/blog/post">Post</a>
      <a href="https://instagram.com/us">IG</a>
      <a href="https://wa.me/44123">WhatsApp</a>
      <p>Live chat</p>
      <p>Opening hours: Mon-Sat 9-5</p>`;
    assert.deepEqual(findGaps(html, 'restaurant'), []);
  });
});

describe('pickWins / analyzeSite', () => {
  it('always returns exactly three wins', () => {
    const wins = pickWins('other', []);
    assert.equal(wins.length, 3);
    const titles = new Set(wins.map((w) => w.title));
    assert.equal(titles.size, 3);
  });
  it('uses the trade-specific override when the gap matches', () => {
    const wins = pickWins('restaurant', ['booking']);
    assert.equal(wins[0].title, 'Take table bookings while you sleep');
  });
  it('uses the generic template when no trade override exists', () => {
    const wins = pickWins('trades', ['reviews' as Gap]);
    assert.equal(wins[0].title, 'Put your best reviews where buyers decide');
  });
  it('unreadable site still returns three wins and flags fallback', () => {
    const a = analyzeSite('https://some-gym.example', null);
    assert.equal(a.unreadable, true);
    assert.equal(a.wins.length, 3);
    assert.equal(a.trade, 'gym');
    const b = analyzeSite('https://x.example', '   ');
    assert.equal(b.unreadable, true);
  });
  it('readable site keeps the teaser exact', () => {
    assert.equal(TEASER, 'The full audit finds every win, in priority order.');
    const a = analyzeSite('https://x.example', '<html><meta name="viewport"></html>');
    assert.equal(a.unreadable, false);
    assert.ok(a.wins.length === 3);
  });
});
