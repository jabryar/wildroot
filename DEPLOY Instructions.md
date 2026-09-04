# Wildroot Village deployment runbook for Codex

Wildroot is deployed as a Cloudflare Worker with static assets and a Durable Object. The Durable Object stores the view-only snapshots used by village visit codes, so no separate database or KV namespace needs to be created.

## Default deployment path — use this first

Codex should deploy from the repository directory:

```sh
cd "/Users/43024@immanuel.qld.edu.au/projects/My Games/Ecosystem Village"
```

Before committing, run:

```sh
git diff --check
git status --short
```

After the user asks to deploy or push, commit only the intended files and run:

```sh
git push origin main
```

Pushing to `main` runs `.github/workflows/deploy-cloudflare.yml`. That workflow uses the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then runs `wrangler deploy`. Never print, edit, or ask the user to paste either secret.

Check the GitHub Actions run after pushing. A successful deployment is the completion of the **Deploy Wildroot** job. The deployed Worker is named `wildroot`.

## First-time Cloudflare setup

1. Create a Cloudflare API token with permission to edit Workers and Durable Objects for the account.
2. Add that token to the repository as `CLOUDFLARE_API_TOKEN`.
3. Add the numeric Cloudflare account ID as `CLOUDFLARE_ACCOUNT_ID`.
4. Push to `main` or run the **Deploy to Cloudflare** workflow manually from GitHub Actions.

The first deployment applies the `v1` Durable Object migration automatically. Do not remove the migration entry in `wrangler.toml`; future Durable Object schema changes need a new migration tag.

## Manual deployment — only if the user requests it

From the repository root, with Node.js and Wrangler authenticated to the correct Cloudflare account:

```sh
npx wrangler deploy
```

No `dist` folder or build command is required. `wrangler.toml` serves the root game files and excludes tests, presentations, documentation, and Worker source from public static assets.

If Wrangler reports that it is not authenticated, do not try to work around authentication. Ask the user to authenticate the intended Cloudflare account, then retry the same command.

## Pre-push checks for Codex

Use the browser smoke test when JavaScript, HTML, CSS, or Worker routing changes:

```sh
git diff --check
```

The normal local game smoke test is `tests/smoke.html`. Run it with the repository’s approved headless-browser command when available. The static game can be tested from `file://`; the shared-village API needs the deployed Worker URL to be tested online.

Do not create a `dist` folder or copy game files by hand. Earlier deployments failed because `wrangler.toml` pointed at `./dist` while Cloudflare had no build command. The Worker now publishes the repository root directly, with explicit exclusions.

## Village visit feature

The Worker serves the game normally and handles only `/api/villages/<CODE>` itself. A six-character code is public and lets someone view a saved image and summary of the village. A separate private owner token, stored only in the owner's local save, is required to update or stop sharing that code.

Each shared snapshot expires from its **online** status after 90 seconds without an update. It remains viewable, but it never simulates or changes on the server.
