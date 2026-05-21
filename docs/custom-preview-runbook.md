# Custom-Preview Runbook — free AR preview for serious Coimbatore leads

> **Keep this open on your phone during in-person demos.** When a seriously
> interested brand owner asks "can you show me MY actual product?", this is
> the highest-converting moment in the whole sales motion. This runbook is
> how you turn "I'm interested" into "I'll sign."

---

## What this is

After the category demo (you showed them AR on a stock product), a genuinely
engaged owner often asks the natural next question: *"Can you do this with
one of MY products?"* Saying **yes, free, by tomorrow morning** is a closing
mechanism — the close rate after a custom preview is dramatically higher than
after a stock demo alone.

You photograph ONE of their products on the spot, generate it that evening,
and send them a private link the next morning that opens AR of *their own
product* on *their own phone* in *their own showroom*.

---

## The policy (don't skip this — it keeps the cost bounded)

| Rule | Why |
|---|---|
| **One** free preview per brand, per lifetime | It's a closing tool, not a free service. More than one = they're using you. |
| Only for a **serious lead** — someone who's asked detailed questions, compared to their current photos, asked about price/timeline, and agreed to a follow-up | Don't burn credits on someone who chatted for 5 minutes and left. |
| Cost: **~30 Meshy credits ≈ ₹40-80** per preview | Trivial vs the LTV of a ₹3,999/mo brand — one close pays it back 50×. |
| Turnaround: **same evening if photos taken by ~5pm, else next morning 9am** | Under-promise. Hotel WiFi + Meshy queue are real. |
| Output: a **private demo URL** + a **15-second screen recording** | The recording forwards to family/co-owners and often closes the deal without a second meeting. |

---

## When to OFFER it — read the room first

Offer the preview **only** if the owner is visibly engaged:
- asking detailed questions ("does it work on iPhone?", "how long to set up?")
- comparing the AR to their current product photos
- asking about pricing or timeline

If they're at that level, say:

> *"If you'd like, I can take 3 photos of one of your actual products right
> now and have an AR version on your phone by tomorrow morning — no charge.
> Just so you can see exactly what your customers would see."*

If they say yes → run the 6 steps below.
If they're **not** at that level of engagement → **don't offer.** The preview
is a closing move, not a brochure.

---

## One-time setup (do this ONCE, before the Coimbatore trip)

You need a brand + API key to host preview products under. Use the **founder
brand** (`founder@rekaman.io`) — you can authenticate to it; the legacy demo
brand's password is unknown.

```bash
cd /home/sivasankari/code/rekaman/server

# 1. Mint a founder JWT (or use /v1/auth/login if mint-jwt's JWT_SECRET drifts)
TOKEN=$(node --env-file=.env scripts/mint-jwt.mjs founder@rekaman.io 2>/dev/null)

# 2. Create a reusable API key for preview pages (one time — save the output)
curl -s -X POST https://api.rekaman.io/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Coimbatore previews"}' | python3 -m json.tool
```

Save the `key.key` value (starts `rk_live_…`) somewhere on your phone — call
it **`PREVIEW_API_KEY`**. Every preview page reuses it.

---

## The 6-step runbook

### ON-SITE (with the owner watching) — ~10 minutes

**Step 1 — Photograph the product.** 3-4 angles of ONE product: front, side,
3/4-angle, (optional) a detail shot. Plain background where possible, even
showroom light (no flash), phone vertical, hold steady ~8 seconds per shot.
Take one extra "scale reference" shot with a 30 cm measuring tape beside the
product — insurance if you mis-note a dimension.

> Multi-image is live (Meshy multi-image-to-3d) — 3 angles genuinely produce
> a better model than 1. Use 3. Never more than 4 (Meshy's hard cap).

**Step 2 — Measure with the tape.** Width × Height × Depth in cm. Write it
into your phone notes with the product name. ~2 minutes.

**Step 3 — Tell the owner what happens next.**

> *"I'll have this ready by tomorrow morning around 9. You'll get a WhatsApp
> message with a link — open it on your phone, tap 'View in your room', and
> you'll see this exact piece in your showroom. Free to keep, free to share."*

### THAT EVENING (at the hotel) — ~15 minutes

**Step 4 — Upload photos + create the product + generate.**

Upload the 3 photos somewhere public — Google Drive (each set to "Anyone with
the link") or the products S3 bucket. Get the 3 public URLs.

```bash
cd /home/sivasankari/code/rekaman/server
TOKEN=$(node --env-file=.env scripts/mint-jwt.mjs founder@rekaman.io 2>/dev/null)

# Create the preview product. Slug MUST start with `preview-` so it's
# obvious in the DB + never confused with a real customer product.
# Use the dimensions you measured on-site.
PID=$(curl -s -X POST https://api.rekaman.io/v1/products \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "<Product Name>",
    "slug": "preview-<brand-slug>-<product-slug>",
    "arMode": "placement",
    "category": "furniture",
    "widthCm": <W>, "heightCm": <H>, "depthCm": <D>
  }' | python3 -c "import sys,json;print(json.load(sys.stdin)['product']['id'])")
echo "PID=$PID"

# Generate from the 3 angle photos → routes to Meshy multi-image endpoint.
curl -s -X POST "https://api.rekaman.io/v1/products/$PID/generate" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"photoUrls":["<URL1>","<URL2>","<URL3>"]}' | python3 -m json.tool

# Poll until READY (~2-3 min).
while true; do
  S=$(curl -s "https://api.rekaman.io/v1/products/$PID/generation-status" -H "Authorization: Bearer $TOKEN")
  echo "$S" | grep -oE '"status":"[A-Z]+"'
  echo "$S" | grep -q '"status":"READY"' && { echo "READY"; break; }
  echo "$S" | grep -q '"status":"FAILED"' && { echo "FAILED — check Meshy / reshoot photos"; break; }
  sleep 15
done
```

If it **FAILS** (rare — usually bad reference photos): reshoot with a cleaner
background / better light, or fall back to a single best photo (still works,
just less back/side detail). Don't send a bad model.

**Step 5 — Build + deploy the preview page.**

```bash
cd /home/sivasankari/code/rekaman/apps/demo/public
# Clone the demo template (until the Item-4 category templates exist, the
# Oslo armchair page is the cleanest base).
cp oslo-sofa.html preview-<brand-slug>-<product-slug>.html
```

Edit the new file:
- product title, price, short description → the owner's product
- product photo → one of the 3 photos you took
- the `<div data-rk-product="..." data-rk-key="...">` → set
  `data-rk-product` to the `preview-…` slug, `data-rk-key` to your
  saved `PREVIEW_API_KEY`
- (optional) if you snapped their logo, set their brand colour via the
  theme — or just leave the Rekaman default

```bash
cd /home/sivasankari/code/rekaman
git add apps/demo/public/preview-<brand-slug>-<product-slug>.html
git commit -m "shiva | chore(demo): custom preview page for <Brand>"
git push origin main   # Vercel auto-deploys in ~30s
```

Test the URL yourself on **both** your Android and iPhone before you sleep:
`https://demo.rekaman.io/preview-<brand-slug>-<product-slug>.html`

### NEXT MORNING — ~5 minutes

**Step 6 — Send the preview on WhatsApp.**

```
Good morning [Name]! Here's your [Product Name] in AR:
https://demo.rekaman.io/preview-<brand-slug>-<product-slug>.html

Open on your phone → tap "View in your room" → point at the floor.
Real-world size. Save the link to share with anyone. Talk soon!
```

Then **record a 15-second screen capture** of yourself opening the link and
placing the product in your room, and send that as a follow-up. It forwards
naturally to family/business partners — that's often what closes the deal.

---

## Track every preview in your CRM Sheet

Add these columns to the inbound-leads Sheet:

`Preview offered? · Preview delivered? · Preview product · Preview link opened? · Closed after preview?`

After 5-10 Coimbatore previews you'll know whether the preview is the
close-mechanism it should be — or whether you can save the credits.

---

## Cost ceiling

Even if every Coimbatore prospect (~15-25 over the month) takes a free
preview: 25 × ~30 credits ≈ 750 credits ≈ **₹600-1,200 total**. One ₹3,999/mo
close pays that back 3-6× in the first month. Don't agonise over it — but
do honour the one-per-brand rule.

---

## What you do NOT do

- **No preview for non-serious leads.** Someone who didn't agree to a
  follow-up doesn't get one.
- **No more than 1 product per prospect** at preview stage. Want more? They
  sign up — that's the close.
- **Don't promise faster than next morning.** Hotel WiFi and the Meshy queue
  are real. Under-promise, over-deliver.
- **Don't link the preview page from the demo hub or anywhere public.** The
  `preview-…` slug is prospect-specific, unlisted, not indexed.
- **Don't skip the device test.** Never send a link you haven't opened
  yourself on a real phone first.

---

*Companion docs: `week6-outreach-playbook.md` (cold email / LinkedIn / video
script). Created Week 7 — Item 5 of the Coimbatore-readiness sprint.*
