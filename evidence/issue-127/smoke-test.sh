#!/usr/bin/env bash
# Local proof for issue-127 against next start on :3277 with api-stubs.cjs.
set -u
BASE=http://127.0.0.1:3277
ADMIN_KEY=$(grep '^SAMPLE_ADMIN_KEY=' .env.local | cut -d= -f2)
SECRET=$(grep '^SAMPLE_LINK_SECRET=' .env.local | cut -d= -f2)
OUT=evidence/issue-127/smoke-test.txt
rm -rf /tmp/opencode/blob-store/signups /tmp/opencode/blob-store/samples
rm -f evidence/issue-127/stripe-requests.log
exec > "$OUT" 2>&1

echo "== issue-127 local proof $(date -u +%Y-%m-%dT%H:%M:%SZ) =="
echo "== next start -p 3277, Stripe + Vercel Blob stubs via NODE_OPTIONS =="
echo

echo "-- (a) GET /guide --"
HTML=$(curl -s $BASE/guide)
echo "status=$(curl -s -o /dev/null -w '%{http_code}' $BASE/guide)"
python3 - "$HTML" <<'PY'
import sys
html = sys.argv[1]
titles = ["All four guides", "Hire Your First AI Employee", "The AI Prompt Pack for Small Business", "Automate Your Admin in a Weekend", "AI for Accountants and Bookkeepers"]
pos = [html.find(t) for t in titles]
print("5 product titles in order:", all(p >= 0 for p in pos) and pos == sorted(pos), pos)
print("Buy buttons:", html.count("Buy now"))
print("bundle line:", "£51 if bought separately, £35 as a bundle." in html)
print("bundle bullets ok:", "All four PDFs in one purchase" in html and "Instant download after payment" in html)
print("free-chapter line:", "Not sure which one? Try a free chapter" in html and 'href="/sample"' in html)
print("'Written by an AI agent' count:", html.count("Written by an AI agent"))
print("labels:", [l for l in ["Buy now - £35","Buy now - £14","Buy now - £9"] if l in html])
PY
echo

echo "-- (b) POST /api/guide/checkout {product:'bundle-all-four'} --"
curl -s -X POST $BASE/api/guide/checkout -H 'Content-Type: application/json' -d '{"product":"bundle-all-four"}'; echo
echo "-- (c) single guide {product:'prompt-pack'} (unchanged) --"
curl -s -X POST $BASE/api/guide/checkout -H 'Content-Type: application/json' -d '{"product":"prompt-pack"}'; echo
echo "-- (d) unknown product --"
curl -s -o /dev/null -w 'status=%{http_code} ' -X POST $BASE/api/guide/checkout -H 'Content-Type: application/json' -d '{"product":"nope"}'
curl -s -X POST $BASE/api/guide/checkout -H 'Content-Type: application/json' -d '{"product":"nope"}'; echo
echo

echo "-- (e) guide download, paid bundle session, four items --"
for item in hire-first-ai-employee prompt-pack admin-guide accountants-guide; do
  printf '%s: ' "$item"
  curl -s -o /dev/null -w 'status=%{http_code} type=%{content_type} size=%{size_download}\n' \
    "$BASE/api/guide/download?session_id=cs_test_paidbundle1&item=$item"
done
echo "-- (f) bundle session, item missing -> 400 --"
curl -s -o /dev/null -w 'status=%{http_code} ' "$BASE/api/guide/download?session_id=cs_test_paidbundle1"
curl -s "$BASE/api/guide/download?session_id=cs_test_paidbundle1"; echo
echo "-- (g) bundle session, bad item -> 404 --"
curl -s -o /dev/null -w 'status=%{http_code} ' "$BASE/api/guide/download?session_id=cs_test_paidbundle1&item=bundle-all-four"
curl -s "$BASE/api/guide/download?session_id=cs_test_paidbundle1&item=bundle-all-four"; echo
echo "-- (h) single-guide session unchanged (paid) --"
curl -s -o /dev/null -w 'status=%{http_code} type=%{content_type} disp=%{header_json}\n' \
  "$BASE/api/guide/download?session_id=cs_test_paidguide1" | head -c 300; echo
echo "-- (i) unpaid session -> 402 --"
curl -s -o /dev/null -w 'status=%{http_code} ' "$BASE/api/guide/download?session_id=cs_test_unpaid1"
curl -s "$BASE/api/guide/download?session_id=cs_test_unpaid1"; echo
echo "-- (j) unknown metadata.product -> 404 --"
curl -s -o /dev/null -w 'status=%{http_code} ' "$BASE/api/guide/download?session_id=cs_test_paidunknown1"
curl -s "$BASE/api/guide/download?session_id=cs_test_paidunknown1"; echo
echo "-- (k) bad session id -> 404 --"
curl -s -o /dev/null -w 'status=%{http_code}\n' "$BASE/api/guide/download?session_id=cs_fake"
echo

echo "-- (l) /guide/thanks?session_id=cs_test_paidbundle1 --"
THANKS=$(curl -s "$BASE/guide/thanks?session_id=cs_test_paidbundle1")
echo "status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/guide/thanks?session_id=cs_test_paidbundle1")"
echo "$THANKS" | grep -o 'Download: [^<]*' | sort
echo "bundle session has 4 links: $(echo "$THANKS" | grep -c 'item=')"
echo "-- (m) /guide/thanks?session_id=cs_test_paidguide1 (single) --"
curl -s "$BASE/guide/thanks?session_id=cs_test_paidguide1" | grep -o 'Download the PDF\|Hire Your First AI Employee' | sort -u
echo

echo "-- (n) GET /sample --"
S=$(curl -s $BASE/sample)
echo "status=$(curl -s -o /dev/null -w '%{http_code}' $BASE/sample)"
python3 - "$S" <<'PY'
import sys
s = sys.argv[1]
print("heading:", "Try a chapter before you buy." in s)
print("fields:", all(f in s for f in ['name="name"','name="email"','name="guide"','name="website"']))
print("button:", "Send my free chapter" in s)
print("fine print:", "No card, no account. We keep your name and email only to send this sample" in s and "We never sell or share your details." in s)
print("select has 4 guide titles:", s.count("<option") == 5)  # placeholder + 4
PY
echo

echo "-- (o) POST /api/sample, valid signup (guide=prompt-pack) --"
RESP=$(curl -s -D - -o /dev/null -X POST $BASE/api/sample \
  --data-urlencode "name=Proof Tester" --data-urlencode "email=proof@example.com" --data-urlencode "guide=prompt-pack")
LOC=$(echo "$RESP" | tr -d '\r' | grep -i '^location:' | sed 's/^[Ll]ocation: //')
echo "$RESP" | head -1
echo "location: $(echo "$LOC" | sed "s/t=[^&]*/t=<token-redacted>/")"
TOKEN=$(echo "$LOC" | sed 's/.*t=//')
TOKEN_SHAPE=$(python3 - "$TOKEN" <<'PY'
import sys,re
t=sys.argv[1]
print(bool(re.fullmatch(r'\d+\.[0-9a-f]{64}', t)))
PY
)
echo "token shape (<expiryMs>.<64-hex>): $TOKEN_SHAPE"
echo "guide param: $(echo "$LOC" | grep -o 'guide=[^&]*')"
echo "-- (p) GET /sample/thanks with the real token --"
curl -s -o /dev/null -w 'status=%{http_code}\n' "$BASE/sample/thanks?guide=prompt-pack&t=$TOKEN"
curl -s "$BASE/sample/thanks?guide=prompt-pack&t=$TOKEN" | grep -o 'Done. Here is your sample.\|Your sample chapter is on its way[^<]*\|/api/sample/download?guide=prompt-pack' | sort -u
echo "-- (q) download link shape (sample PDF not stored yet -> friendly 404) --"
curl -s -D - -o /tmp/opencode/sample-dl-body.txt "$BASE/api/sample/download?guide=prompt-pack&t=$TOKEN" | tr -d '\r' | grep -iE '^HTTP|^content-type|^content-disposition|^cache-control'
echo "body: $(cat /tmp/opencode/sample-dl-body.txt)"
echo "-- (r) drop a placeholder sample PDF into the blob store, stream it --"
mkdir -p /tmp/opencode/blob-store/samples
printf '%%PDF-1.4\n%% placeholder sample chapter for local proof\n' > /tmp/opencode/blob-store/samples/prompt-pack.pdf
curl -s -D - -o /tmp/opencode/sample-dl.pdf "$BASE/api/sample/download?guide=prompt-pack&t=$TOKEN" | tr -d '\r' | grep -iE '^HTTP|^content-type|^content-disposition|^cache-control'
echo "pdf bytes: $(wc -c < /tmp/opencode/sample-dl.pdf), magic: $(head -c 5 /tmp/opencode/sample-dl.pdf)"
rm /tmp/opencode/blob-store/samples/prompt-pack.pdf
echo "-- (s) bad token -> 403 --"
curl -s -o /dev/null -w 'status=%{http_code} ' "$BASE/api/sample/download?guide=prompt-pack&t=999.deadbeef"
curl -s "$BASE/api/sample/download?guide=prompt-pack&t=999.deadbeef"; echo
echo "-- (t) expired token -> 403 --"
EXPIRED=$(python3 - "$SECRET" <<'PY'
import sys, hmac, hashlib, time
secret=sys.argv[1].encode()
exp=str(int(time.time()*1000)-1000)
mac=hmac.new(secret, f"prompt-pack:{exp}".encode(), hashlib.sha256).hexdigest()
print(f"{exp}.{mac}")
PY
)
curl -s -o /dev/null -w 'status=%{http_code}\n' "$BASE/api/sample/download?guide=prompt-pack&t=$EXPIRED"
echo "-- (u) unknown guide with valid-shape token -> 404 --"
BADGUIDE=$(python3 - "$SECRET" <<'PY'
import sys, hmac, hashlib, time
secret=sys.argv[1].encode()
exp=str(int(time.time()*1000)+7*24*3600*1000)
mac=hmac.new(secret, f"not-a-guide:{exp}".encode(), hashlib.sha256).hexdigest()
print(f"{exp}.{mac}")
PY
)
curl -s -o /dev/null -w 'status=%{http_code} ' "$BASE/api/sample/download?guide=not-a-guide&t=$BADGUIDE"
curl -s "$BASE/api/sample/download?guide=not-a-guide&t=$BADGUIDE"; echo
echo "-- (v) POST /api/sample unknown guide -> 400 --"
curl -s -o /dev/null -w 'status=%{http_code} ' -X POST $BASE/api/sample --data-urlencode "name=X" --data-urlencode "email=x@y.co" --data-urlencode "guide=bundle-all-four"
curl -s -X POST $BASE/api/sample --data-urlencode "name=X" --data-urlencode "email=x@y.co" --data-urlencode "guide=bundle-all-four"; echo
echo "-- (w) bad email -> 400 --"
curl -s -o /dev/null -w 'status=%{http_code} ' -X POST $BASE/api/sample --data-urlencode "name=X" --data-urlencode "email=nope" --data-urlencode "guide=prompt-pack"
curl -s -X POST $BASE/api/sample --data-urlencode "name=X" --data-urlencode "email=nope" --data-urlencode "guide=prompt-pack"; echo
echo "-- (x) empty name -> 400 --"
curl -s -o /dev/null -w 'status=%{http_code}\n' -X POST $BASE/api/sample --data-urlencode "name=" --data-urlencode "email=x@y.co" --data-urlencode "guide=prompt-pack"
echo "-- (y) honeypot filled -> 303 but stores nothing --"
HP=$(curl -s -D - -o /dev/null -X POST $BASE/api/sample --data-urlencode "name=Bot" --data-urlencode "email=bot@spam.com" --data-urlencode "guide=prompt-pack" --data-urlencode "website=http://spam.example")
echo "$HP" | head -1
echo

echo "-- (z) GET /api/sample/signups without key -> 404 --"
curl -s -o /dev/null -w 'status=%{http_code} ' "$BASE/api/sample/signups"
curl -s "$BASE/api/sample/signups"; echo
echo "-- (za) with key -> lists the test signup --"
curl -s -o /dev/null -w 'status=%{http_code}\n' "$BASE/api/sample/signups?key=$ADMIN_KEY"
curl -s "$BASE/api/sample/signups?key=$ADMIN_KEY"
echo
echo "-- (zb) delete test signups from the blob store, verify list is empty --"
for f in /tmp/opencode/blob-store/signups/*; do rm -f "$f"; done
curl -s "$BASE/api/sample/signups?key=$ADMIN_KEY"; echo
echo

echo "-- (zc) Stripe request bodies captured by the stub (form-encoded, key fields) --"
python3 - <<'PY'
import urllib.parse
lines = open('evidence/issue-127/stripe-requests.log').read().splitlines()
for ln in lines:
    if 'POST /v1/checkout/sessions' not in ln: continue
    body = ln.split(' ', 3)[3] if len(ln.split(' ', 3)) > 3 else ''
    params = urllib.parse.parse_qs(body, keep_blank_values=True)
    def req(k):
        return params[k][0] if params.get(k) else ''
    parts = [
        'name=' + repr(req('line_items[0][price_data][product_data][name]')),
        'unit_amount=' + req('line_items[0][price_data][unit_amount]'),
        'currency=' + req('line_items[0][price_data][currency]'),
        'metadata.product=' + repr(req('metadata[product]')),
        'payment_method_types=' + repr(req('payment_method_types[0]')),
        'mode=' + req('mode'),
    ]
    print(' '.join(parts))
PY

echo "-- (zd) price-env refusal (second server :3278, BUNDLE_PRICE_PENCE unset) --"
env -u GITHUB_TOKEN NODE_OPTIONS="--require $(pwd)/evidence/issue-127/api-stubs.cjs" BLOB_STORE_DIR=/tmp/opencode/blob-store \
  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_mockstore01_0123456789abcdef0123456789abcdef VERCEL_BLOB_API_URL=http://127.0.0.1:4987 \
  STRIPE_SECRET_KEY=sk_test_stub BUNDLE_PRICE_PENCE= \
  nohup npx next start -p 3278 > /tmp/opencode/next3278.log 2>&1 &
PID2=$!
sleep 5
curl -s -o /dev/null -w 'bundle checkout w/o price env: status=%{http_code} ' -X POST http://127.0.0.1:3278/api/guide/checkout -H 'Content-Type: application/json' -d '{"product":"bundle-all-four"}'
curl -s -X POST http://127.0.0.1:3278/api/guide/checkout -H 'Content-Type: application/json' -d '{"product":"bundle-all-four"}'; echo
curl -s -o /dev/null -w 'control (accountants, 1400): status=%{http_code}\n' -X POST http://127.0.0.1:3278/api/guide/checkout -H 'Content-Type: application/json' -d '{"product":"accountants-guide"}'
for p in $(ss -ltnp 2>/dev/null | grep ":3278" | grep -o "pid=[0-9]*" | cut -d= -f2); do kill $p 2>/dev/null; done
echo
echo "== done =="
