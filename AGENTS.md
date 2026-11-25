# New Career — Project Guidelines & Agent Rules

## Design & UI Principles (Unslop Standard)

All frontend and user interface development in this project must adhere to high-craft design principles and avoid generic "AI/vibecoded slop":

1. **No AI Slop Tells:**
   - No purple/violet-to-blue gradient backgrounds, glowing borders, or neon glow effects.
   - No floating glossy blobs, mesh gradients behind content, or radial color washes.
   - No decorative emoji in headers, badges (e.g. "New ✨"), or button labels.
   - No uppercase over-tracked microcopy or vague shouty marketing copy.

2. **Craft & Visual Restraint:**
   - **4px Spacing Grid:** All paddings, margins, gaps, and component heights adhere to multiples of 4px.
   - **Calm Chrome & Neutral Ramp:** Surfaces, navigation, cards, and borders use a clean, tinted neutral ramp. Backgrounds remain quiet.
   - **One Clear Accent:** Use a single intentional accent color for key actions, selections, or critical metrics.
   - **High Contrast & Accessibility:** Minimum 4.5:1 contrast for regular text (WCAG 2.2 AA).
   - **Rich Moments:** Richness belongs in content (real product charts, rendered assets, clear data), not smeared across chrome or borders.

3. **Workspace Skills Reference:**
   - UI audits and refactoring follow the workflow in [`.agents/skills/unslop/SKILL.md`](.agents/skills/unslop/SKILL.md).
   - Component tokens follow [`.agents/skills/ui-design-tokens/SKILL.md`](.agents/skills/ui-design-tokens/SKILL.md).

## Mandatory GitHub Sync & Auto-Deploy Workflow

Whenever **any** change or update is made to this project (code, configuration, assets, `Caddyfile`, or documentation), you **MUST** complete all of the following steps before finishing:

1. **Test & Verify:**
   - Run the backend test suite (`PYTHONPATH=. backend/.venv/bin/pytest backend/tests/ -v`) and ensure all tests pass.
2. **Rebuild & Relaunch the Website (`https://career.andydias.pt`):**
   - Run `./deploy.sh` from the repository root (`/home/ubuntu/new-career`), which:
     - Installs/updates frontend dependencies if needed and runs `npm run build` (`frontend/dist/`).
     - Syncs `Caddyfile` to `/etc/caddy/Caddyfile` (validating syntax) and reloads `caddy` when changed.
     - Restarts `new-career-backend` (`systemd`) and verifies both `http://127.0.0.1:8000/api/health` and `https://career.andydias.pt/` respond with HTTP 200.
3. **Push All Updates to GitHub (`origin main`):**
   - Never stage or commit secrets or local runtime data (`.env`, `firebase-credentials.json`, `storage/`, `*.db`).
   - Stage all project changes (`git add`), create a clear commit (`git commit -m "..."`), and push to GitHub (`git push origin main`).
   - If `git push` cannot authenticate (missing token/SSH key or git identity), stop and report the exact blocker to the user instead of skipping the push silently.
