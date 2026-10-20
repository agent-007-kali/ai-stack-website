// Ten-question intake for the £75 AI audit (issue #25). Plain form POST to
// /api/audit-intake - no JS needed; the API validates and 303-redirects to
// /audit/thanks?intake=1. Linked from the post-checkout thanks page.
export default function AuditStartPage() {
  const input = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 16,
    borderRadius: 8,
    border: '1px solid #1d3a4d',
    background: '#0c1722',
    color: '#e8f1f5',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  } as const;
  const label = { display: 'flex', flexDirection: 'column', gap: 6 } as const;
  const caption = { fontSize: 14, color: '#9bb' } as const;

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 36, lineHeight: 1.15, marginTop: 0 }}>Your ten questions</h1>
      <p style={{ color: '#9bb', marginTop: 12 }}>
        Five minutes, honest answers. I spend the next hour inside these answers and your website, then
        email your written report within 24 hours.
      </p>
      <form method="post" action="/api/audit-intake" style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28 }}>
        <label style={label}>
          <span style={caption}>1. Business name + website</span>
          <input type="text" name="business" required maxLength={200} style={input} />
        </label>
        <label style={label}>
          <span style={caption}>2. What does the business do, in one sentence?</span>
          <input type="text" name="what" required maxLength={500} style={input} />
        </label>
        <label style={label}>
          <span style={caption}>3. How many people work in it?</span>
          <input type="text" name="people" maxLength={100} style={input} />
        </label>
        <label style={label}>
          <span style={caption}>4. What eats the most hours each week?</span>
          <select name="timeeater" defaultValue="" style={input}>
            <option value="" disabled>Pick one</option>
            <option value="Enquiries/quotes">Enquiries/quotes</option>
            <option value="Social media">Social media</option>
            <option value="Paperwork/admin">Paperwork/admin</option>
            <option value="Chasing payments">Chasing payments</option>
            <option value="Bookings/diary">Bookings/diary</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label style={label}>
          <span style={caption}>5. Which tools do you already use? (email, spreadsheets, accounting software, social accounts)</span>
          <textarea name="tools" rows={3} maxLength={1000} style={input} />
        </label>
        <label style={label}>
          <span style={caption}>6. What have you tried with AI, if anything?</span>
          <textarea name="aitried" rows={3} maxLength={1000} style={input} />
        </label>
        <label style={label}>
          <span style={caption}>7. What would you automate tomorrow if you could?</span>
          <textarea name="automate" rows={3} maxLength={1000} style={input} />
        </label>
        <label style={label}>
          <span style={caption}>8. Anything you do NOT want AI to touch?</span>
          <textarea name="donttouch" rows={3} maxLength={1000} style={input} />
        </label>
        <label style={label}>
          <span style={caption}>9. Best email for the report</span>
          <input type="email" name="email" required maxLength={200} autoComplete="email" style={input} />
        </label>
        <label style={label}>
          <span style={caption}>10. Anything else I should know?</span>
          <textarea name="other" rows={3} maxLength={1000} style={input} />
        </label>
        {/* Honeypot: hidden from humans, bots tend to fill it. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
        <button type="submit" style={{ padding: '14px 28px', fontSize: 18, borderRadius: 8, border: 0, background: '#38d6e6', color: '#06223a', fontWeight: 700, cursor: 'pointer' }}>
          Send my answers
        </button>
      </form>
      <p style={{ fontSize: 13, color: '#9bb', marginTop: 24 }}>
        Your answers go to the AI audit team only, and are used to write your report. We never sell or
        share your details. — Jarvis
      </p>
    </main>
  );
}
