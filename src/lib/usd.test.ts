// Tests for the fixed GBP->USD display table (issue #37).
// Run: npm run test:usd.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { usdFor, withUsd } from './usd.ts';

describe('usdFor', () => {
  it('covers exactly the eight fixed conversions', () => {
    assert.equal(usdFor(9), '$12');
    assert.equal(usdFor(12), '$15');
    assert.equal(usdFor(14), '$18');
    assert.equal(usdFor(25), '$32');
    assert.equal(usdFor(35), '$44');
    assert.equal(usdFor(75), '$95');
    assert.equal(usdFor(300), '$380');
    assert.equal(usdFor(1000), '$1,250');
  });
  it('returns null outside the table or for non-integers', () => {
    assert.equal(usdFor(750), null);
    assert.equal(usdFor(51), null);
    assert.equal(usdFor(2995), null);
    assert.equal(usdFor(75.5), null);
  });
});

describe('withUsd', () => {
  it('appends the USD equivalent to table prices', () => {
    assert.equal(withUsd('£14'), '£14 (~$18)');
    assert.equal(withUsd('Buy now - £35'), 'Buy now - £35 (~$44)');
    assert.equal(withUsd('Pay £75 (secure checkout by Stripe)'), 'Pay £75 (~$95) (secure checkout by Stripe)');
  });
  it('handles decimal and comma-free forms', () => {
    assert.equal(withUsd('One-off £75.00 GBP'), 'One-off £75.00 (~$95) GBP');
    assert.equal(withUsd('£1,250'), '£1,250'); // GBP-side comma amount not in table format
  });
  it('leaves out-of-table amounts alone', () => {
    assert.equal(withUsd('£750'), '£750');
    assert.equal(withUsd('£51 bought separately, £35 as a bundle'), '£51 bought separately, £35 (~$44) as a bundle');
    assert.equal(withUsd('£49 setup + £20/month'), '£49 setup + £20/month');
    assert.equal(withUsd('£2,995'), '£2,995');
  });
  it('handles multiple in-table amounts in one string', () => {
    assert.equal(withUsd('£14 and £75'), '£14 (~$18) and £75 (~$95)');
  });
  it('does not match "GBP 75" or empty strings', () => {
    assert.equal(withUsd('GBP 75'), 'GBP 75');
    assert.equal(withUsd(''), '');
  });
  it('is idempotent: applying twice does not double-append', () => {
    assert.equal(withUsd('£9'), '£9 (~$12)');
    assert.equal(withUsd(withUsd('£9')), '£9 (~$12)');
    assert.equal(withUsd('£14 and £75'), withUsd(withUsd('£14 and £75')));
    assert.equal(withUsd('£1,250 is USD'), '£1,250 is USD');
  });
});
