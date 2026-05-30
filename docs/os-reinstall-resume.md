# OS Reinstall — Resume Guide

> **Read this first when you sit down at the freshly-installed OS.**
> Written 2026-05-26 during the catalog-multi-image-test session. After
> a clean OS install, follow this top-to-bottom to get back to exactly
> where we stopped, even if the literal Claude Code chat transcript was
> lost.

---

## Status snapshot (where we stopped, 2026-05-26 ~19:30 IST)

- **Last commit on `main`**: `1f4f0e9` — `feat(demo): swap furniture demo to modular study desk (multi-image proof)`
- **Pushed to `origin/main`**: yes, branch up to date.
- **Working tree**: clean except for one untracked file `server/scripts/recent-ar-events.mjs` (a diagnostic script, leave alone).
- **Production health**: api + worker + Railway Redis + Neon + S3 all green. demo.rekaman.io live.
- **Catalog state**:

  | URL | Product | Source | Quality |
  |---|---|---|---|
  | `/furniture-armchair` | Modular Study Desk + Tall Shelf (Northbeam Studio) | brand multi-image (3 angles) | **good — Coimbatore-ready** |
  | `/decor-pendant-lamp` | Heritage Table Lamp (Lumina Home) | single Pexels, model matches photo | acceptable |
  | `/eyewear-aviator` | Iconic Square Frame (Lens Atelier) | 2-angle Pexels multi-image | imperfect, dark frame |
  | `/jewelry-ring` | Gold Eternity Bangle (Aurora Fine Jewelry) | 3-angle Pexels multi-image | imperfect, still dark |
  | `/watches-chronograph` | Meridian Chronograph (Meridian Watches) | single Pexels | good |
  | `/footwear-sneaker` | Studio Court Sneaker (Sole Studio) | single Pexels | good |

- **Total Meshy credits spent in this sprint**: ~390 (~₹500-1,040).
- **Founder phone QA on the new modular-desk furniture page**: **NOT DONE YET** — first thing to verify after resume.

---

## Pre-wipe BACKUP checklist (do this BEFORE wiping the laptop)

Copy each path to an external drive / cloud / second machine. Total size ~50-300 MB.

| Path | Size | Why it matters | What's lost without it |
|---|---|---|---|
| `~/.claude/` | ~48 MB | Claude Code conversation history + memory + auth | Today's full chat transcript; your Claude account session |
| `~/.aws/credentials` | <1 KB | `rekaman-deploy-cli` IAM user keys for S3 + CloudFront | SDK + S3 deploys (rotateable — IAM Console can issue new keys) |
| `~/.railway/` | <5 MB | Railway CLI auth token | Have to re-run `railway login` (browser flow, easy) |
| `~/.ssh/` | <100 KB | GitHub SSH keys | Have to re-add a new key to GitHub |
| `~/.gitconfig` | <1 KB | git user.email / user.name | Have to re-set (trivial) |
| `/home/sivasankari/code/rekaman/server/.env` | <2 KB | DATABASE_URL, JWT_SECRET, MESHY_API_KEY, AWS keys, REDIS_URL, etc. | **CRITICAL — all local ops break without this. Cannot regenerate fully.** |
| `/home/sivasankari/code/rekaman/server/scripts/.demo-catalog-key` | <100 B | Cached demo catalog API key (`rk_live_u5dKB3Zm...`) | Re-running seed-demo-catalog.mjs would mint a new key + churn HTML |
| Password manager export | varies | Founder Rekaman password, vendor account passwords | Cannot mint local JWTs without password (workaround exists — use Railway JWT_SECRET) |

**Quick one-shot backup command** (run from terminal, change `/media/usb` to your USB mount):

```bash
TARGET=/media/usb/rekaman-backup-$(date +%F)
mkdir -p "$TARGET"
cp -a ~/.claude "$TARGET/claude/"
cp -a ~/.aws "$TARGET/aws/"
cp -a ~/.railway "$TARGET/railway/" 2>/dev/null || true
cp -a ~/.ssh "$TARGET/ssh/"
cp -a ~/.gitconfig "$TARGET/gitconfig"
cp -a /home/sivasankari/code/rekaman/server/.env "$TARGET/server.env"
cp -a /home/sivasankari/code/rekaman/server/scripts/.demo-catalog-key "$TARGET/demo-catalog-key" 2>/dev/null || true
echo "─── backup contents ───" && ls -la "$TARGET"
```

---

## Post-install — tools to reinstall

In order. Skip steps you already have.

```bash
# 1. Node 22 LTS via nvm (project requires Node 22)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm alias default 22

# 2. pnpm 9 (project uses pnpm workspaces)
npm install -g pnpm@9

# 3. git (probably already there)
sudo apt install git -y

# 4. Claude Code CLI
npm install -g @anthropic-ai/claude-code
# OR follow https://claude.com/code installer if a desktop version is preferred

# 5. Railway CLI
curl -fsSL https://railway.com/install.sh | sh

# 6. AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
rm -rf aws awscliv2.zip

# 7. Python 3 + Pillow (used for image cropping in ops scripts)
sudo apt install python3 python3-pip -y
pip3 install Pillow

# 8. Your editor (VS Code in current setup based on the IDE-opened tag we saw)
# Download from https://code.visualstudio.com/

# 9. Browser with WebXR support (Chrome for Android testing if you also test desktop)
sudo apt install chromium-browser -y
```

---

## Restore checklist

After tools are installed, restore the backed-up files:

```bash
BACKUP=/media/usb/rekaman-backup-<DATE>
cp -a "$BACKUP/claude/" ~/.claude
cp -a "$BACKUP/aws/" ~/.aws
cp -a "$BACKUP/railway/" ~/.railway 2>/dev/null
cp -a "$BACKUP/ssh/" ~/.ssh
chmod 700 ~/.ssh && chmod 600 ~/.ssh/*
cp -a "$BACKUP/gitconfig" ~/.gitconfig

# Clone the repo fresh from GitHub
mkdir -p ~/code && cd ~/code
git clone git@github.com:Sivasankari-E/rekaman.git
cd rekaman
pnpm install

# Restore env files (not in git)
cp "$BACKUP/server.env" server/.env
cp "$BACKUP/demo-catalog-key" server/scripts/.demo-catalog-key
chmod 600 server/scripts/.demo-catalog-key

# Re-link Railway CLI to the project (if ~/.railway restore didn't preserve linking)
cd server
railway link
# pick: sivasankari-e's Projects → romantic-heart → production → api
```

---

## Verification (10-minute smoke test after restore)

Run these in order. If all pass, you're back to a working state.

```bash
# 1. tools present
node --version           # → v22.x
pnpm --version           # → 9.x or 10.x
git --version
claude --version 2>/dev/null || which claude
railway --version
aws --version
python3 --version

# 2. local repo works
cd /home/sivasankari/code/rekaman
git log --oneline -3     # should show 1f4f0e9 at top
git status               # should be clean

# 3. AWS IAM still works (uses ~/.aws/credentials rekaman profile)
aws sts get-caller-identity --profile rekaman
# expected ARN: arn:aws:iam::975050270919:user/rekaman-deploy-cli

# 4. Railway CLI still works
cd server && railway whoami
railway variables --service api --kv 2>/dev/null | grep -c "^JWT_SECRET=" # should be 1

# 5. production stack health
curl -sI https://api.rekaman.io/health | head -1                      # → HTTP/2 200
curl -sI https://cdn.rekaman.io/v1/sdk.js | head -1                   # → HTTP/2 200
curl -sI https://demo.rekaman.io/ | head -1                           # → HTTP/2 200
curl -sI https://demo.rekaman.io/furniture-armchair | head -1         # → HTTP/2 200
curl -sI https://rekaman.io | head -1                                 # → HTTP/2 200

# 6. catalog products are still all 6 READY
for slug in cat-furniture-modular-desk cat-decor-lamp cat-eyewear-aviator cat-jewelry-ring cat-watch-chrono cat-footwear-sneaker; do
  echo -n "$slug: "
  curl -s "https://api.rekaman.io/v1/ar/rk_live_u5dKB3ZmNrlrDsNFNk1zT8pA0Yu3cPax/$slug" \
    | python3 -c "import sys,json;p=json.load(sys.stdin);print('READY' if p.get('glbUrl') else p.get('error','?'))"
done

# 7. local DB connectivity (Neon may not be reachable from your laptop's network — known intermittent per CLAUDE.md v5.16 Gotcha)
cd server && node --env-file=.env -e "
import('@prisma/client').then(async ({PrismaClient}) => {
  const p = new PrismaClient();
  try { console.log('product count:', await p.product.count()); }
  catch(e) { console.error('Neon unreachable from this network — fall back to API for ops'); }
  await p.\$disconnect();
});
"

# 8. Claude Code can find prior sessions (if ~/.claude was restored)
claude --resume   # should show today's session in the list
```

---

## What's pending — pick up from here

In priority order:

### 1. FOUNDER: phone QA the new furniture demo (the unblocker)

The modular study desk was shipped in commit `1f4f0e9` but NOT yet verified on a real phone. This blocks all Coimbatore confidence.

- Open `https://demo.rekaman.io/furniture-armchair` on Android Chrome
- Tap "View in your room"
- Tap floor → desk should appear
- Verify scale: the desk should be ~76 cm tall (knee-to-thigh height when standing next to it)
- Walk around it: should stay anchored, not follow camera (placement-engine v11)
- If broken: capture screenshot + tell next-session Claude what happened
- If correct: cross off as Coimbatore-ready furniture demo

### 2. Test other categories with brand-supplied multi-angle photos

Same workflow as the furniture test (this session, ~30 min per category):

a. Drop 3-4 clean multi-angle photos in `/tmp/rk-photos/<category>/`
b. Tell Claude to upload to S3, create new product, trigger multi-image gen, show thumbnail preview
c. Decide ship/iterate based on the preview
d. If shipping: replace the current product page + hub tile

Priority order (categories where the current model is weakest):
- **Jewelry** — current "Gold Eternity Bangle" still too dark. Photos welcome: a bangle / bracelet / pendant on white background, 2-4 angles from the SAME shoot.
- **Eyewear** — current "Iconic Square Frame" is OK-ish but could be better. Photos welcome.
- **Decor** — the "Heritage Table Lamp" model matches its photo OK, but it's a single-photo gen. Multi-image could be cleaner. Photos welcome: a lamp / vase / decor item.

(Watch + footwear current quality is acceptable; only revisit if you want all-six to be brand-supplied for consistency.)

### 3. Two code bugs filed for Week 8 (NOT urgent for Coimbatore)

**Bug A — `regen-from-READY` atomic-guard mismatch** (`server/src/modules/generation/generation.service.ts` + `generation.repository.ts`)

Symptom: POSTing `/v1/products/:id/generate` with `config: {}` on a READY product is supposed to trigger regen (per service-layer doc string), but it always returns 409 "Generation already in progress (race detected)" — AND charges a fresh Meshy task (~30 credits) that gets orphaned.

Root cause: `markProductProcessing` repository function has `where: { status: { in: [PENDING, FAILED] } }`. READY → PROCESSING is rejected by the atomic update.

Fix: extend the `in` list to include READY when the caller explicitly opts in via `input.config`. Pattern:

```typescript
// in generation.repository.ts markProductProcessing
const allowedFromStatuses: ProductStatus[] = ['PENDING', 'FAILED'];
if (allowRegenFromReady) allowedFromStatuses.push('READY');
await prisma.product.updateMany({
  where: { id, brandId, status: { in: allowedFromStatuses } },
  data: { /* ... */ },
});
```

Plumb a new arg through from the service. Add a tenant-isolation test that verifies regen-from-READY only works when config is passed.

**Workaround currently in place**: PATCH product status to FAILED via API, then POST /generate. Used for the bangle + frames regen today.

**Bug B — Worker mis-reports Meshy FAILED as "Generation timed out after 300s"** (`server/src/workers/generation.worker.ts`)

Symptom: When Meshy returns `status: FAILED` with `task_error.message` (e.g. `service_unavailable`), our worker waits its full 300s timeout budget and then reports `reason: "Generation timed out after 300s"` instead of surfacing Meshy's actual error text.

Root cause (likely): the worker's poll loop doesn't break on FAILED status — only on SUCCEEDED. Need to add early-exit on FAILED + plumb `task_error.message` into the failure metadata.

Fix: in the polling loop, treat FAILED as a terminal state. Pass `meshy_task_error` field through `markProductFailed`. Set `failure_class: 'meshy_terminal'` in Sentry tag (already exists for actual Meshy terminals; this is just missing the FAILED-from-poll path).

This bug was caught during the armchair retry attempt 2 today (`019e6338-5c5f-71c5-82e1-6bd7f3dff027`) — Meshy returned `service_unavailable` at the 164s mark, our worker kept polling, hit 300s, and reported timeout.

### 4. Day 3 environment isolation (the deferred mandatory gate)

Still NOT done. Per CLAUDE.md v5.18, this is the gate before customer #1: Railway `staging` env + Neon `staging` branch + GitHub Actions branch deploy (`main` → prod, `dev` → staging). Local `.env` points at staging branch — local laptop never touches prod DB.

Has been deferred since Week 7 Day 2 because Coimbatore-credibility items kept jumping the queue. Still mandatory before the first paying brand.

### 5. Pvt Ltd registration (paperwork, parallel stream)

Per CLAUDE.md v5.18: PAN card received May 18; Razorpay Rize KYC video call unblockable. Continue in parallel — zero engineering-time cost.

---

## Resuming Claude Code work after restore

Two scenarios:

**Scenario A: `~/.claude/` was backed up + restored**

```bash
cd /home/sivasankari/code/rekaman
claude --resume
# Pick the session from 2026-05-26 (today). Full chat transcript loads.
# Tell Claude: "we just came back from an OS reinstall. Verify the
# 10-step smoke test from docs/os-reinstall-resume.md still passes."
```

**Scenario B: `~/.claude/` was NOT backed up** (or only partially restored)

```bash
cd /home/sivasankari/code/rekaman
claude
# Fresh session — Claude auto-loads CLAUDE.md from the repo.
# Tell Claude:
#   "Read docs/os-reinstall-resume.md first. We just came back from an
#    OS reinstall. Help me verify the 10-step smoke test passes, then
#    continue from the 'pending' section."
```

Either way, the new Claude session will have full project context via CLAUDE.md and can continue from the pending list above.

---

## Session memory worth preserving as Claude memory entries

If you want to seed the memory system on the new install, tell next-Claude to write these as memory entries:

- **Feedback**: "Use multi-image Meshy with brand-supplied photos, never single-image with random Pexels for demo products. Quality matters because demos are sales artifacts." (Validated 2026-05-26 with the furniture multi-image test.)
- **Feedback**: "Never use Sketchfab/fake 3D for demos — when real customers come and their actual photos produce lower quality, trust breaks. Honest per-category testing is the path." (Founder said this 2026-05-26.)
- **Feedback**: "When pulling Railway env vars, MUST `cd server` first — `railway` only works in the linked directory." (Surfaced 2026-05-26 when MESHY_API_KEY came back empty from wrong cwd.)
- **Project**: "Meshy real-world ceiling: works on furniture/decor/footwear/watches with clean multi-angle photos; fundamentally weak on jewelry (gems, thin metal) and eyewear (transparent lenses, thin frames). For those categories, brands need to provide CAD files OR we accept the limitation." (Established 2026-05-26.)
- **Project**: "Demo brand owner password is unknown. For ops, use Railway JWT_SECRET to mint JWTs locally via `node -e \"jwt.sign(...)\"` with hardcoded founder user/brand IDs from CLAUDE.md." (Pattern used 2026-05-26.)

---

*Written 2026-05-26 ~19:30 IST after the modular-desk multi-image furniture-replacement ship.*
