import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCommandWithTimeout } from "../../process/exec.js";
import { defaultRuntime } from "../../runtime.js";
import { theme } from "../../terminal/theme.js";
import { pathExists } from "../../utils.js";
import { formatCliCommand } from "../command-format.js";
import type { UpdateCommandOptions } from "./shared.js";

type BuildInfo = {
  version?: string | null;
  commit?: string | null;
  builtAt?: string | null;
  sourceRepo?: string | null;
};

function parseGitHubRepoFromRemote(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  if (!trimmed) {
    return null;
  }

  // Examples:
  // - git@github.com:Owner/Repo.git
  // - https://github.com/Owner/Repo.git
  // - ssh://git@github.com/Owner/Repo.git
  const match = trimmed.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+?)(?:\.git)?$/i);
  if (!match?.groups?.owner || !match?.groups?.repo) {
    return null;
  }
  const owner = match.groups.owner.trim();
  const repo = match.groups.repo.trim().replace(/\.git$/i, "");
  if (!owner || !repo) {
    return null;
  }
  return `${owner}/${repo}`;
}

async function readBuildInfo(installedRoot: string): Promise<BuildInfo | null> {
  const buildInfoPath = path.join(installedRoot, "dist", "build-info.json");
  try {
    const raw = await fs.readFile(buildInfoPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const obj = parsed as Record<string, unknown>;
    return {
      version: typeof obj.version === "string" ? obj.version : null,
      commit: typeof obj.commit === "string" ? obj.commit : null,
      builtAt: typeof obj.builtAt === "string" ? obj.builtAt : null,
      sourceRepo: typeof obj.sourceRepo === "string" ? obj.sourceRepo : null,
    };
  } catch {
    return null;
  }
}

async function resolveForkRepoId(params: { installedRoot: string }): Promise<string | null> {
  const env = process.env.OPENCLAW_FORK_REPO?.trim();
  if (env) {
    return env;
  }
  const buildInfo = await readBuildInfo(params.installedRoot);
  const buildRepo = buildInfo?.sourceRepo?.trim();
  return buildRepo || null;
}

async function resolveForkRoot(params: {
  forkRepoId: string;
  timeoutMs: number;
}): Promise<string | null> {
  const override = process.env.OPENCLAW_FORK_ROOT?.trim();
  const candidates = [
    override ? path.resolve(override) : null,
    path.join(os.homedir(), "workspace", "openclaw"),
  ].filter((entry): entry is string => Boolean(entry));

  for (const candidate of candidates) {
    if (!(await pathExists(path.join(candidate, ".git")))) {
      continue;
    }
    const res = await runCommandWithTimeout(
      ["git", "-C", candidate, "remote", "get-url", "origin"],
      {
        timeoutMs: params.timeoutMs,
      },
    );
    if (res.code !== 0) {
      continue;
    }
    const repo = parseGitHubRepoFromRemote(res.stdout);
    if (repo && repo.toLowerCase() === params.forkRepoId.toLowerCase()) {
      return candidate;
    }
  }

  return null;
}

async function ensureUpstreamRemote(params: {
  forkRoot: string;
  timeoutMs: number;
}): Promise<void> {
  const remoteName = process.env.OPENCLAW_FORK_UPSTREAM_REMOTE?.trim() || "upstream";
  const hasRemote = await runCommandWithTimeout(
    ["git", "-C", params.forkRoot, "remote", "get-url", remoteName],
    { timeoutMs: params.timeoutMs },
  );
  if (hasRemote.code === 0) {
    return;
  }

  // Use HTTPS to avoid requiring SSH keys for this remote.
  const upstreamUrl =
    process.env.OPENCLAW_FORK_UPSTREAM_URL?.trim() || "https://github.com/openclaw/openclaw.git";
  const addRes = await runCommandWithTimeout(
    ["git", "-C", params.forkRoot, "remote", "add", remoteName, upstreamUrl],
    { timeoutMs: params.timeoutMs },
  );
  if (addRes.code !== 0) {
    throw new Error(
      `Failed to add upstream remote (${remoteName}): ${addRes.stderr || addRes.stdout}`,
    );
  }
}

async function runStep(params: {
  name: string;
  argv: string[];
  cwd: string;
  timeoutMs: number;
}): Promise<void> {
  const res = await runCommandWithTimeout(params.argv, {
    cwd: params.cwd,
    timeoutMs: params.timeoutMs,
  });
  if (res.code !== 0) {
    const detail = (res.stderr || res.stdout).trim();
    throw new Error(`${params.name} failed${detail ? `: ${detail}` : ""}`);
  }
}

async function resolvePackDestination(): Promise<string> {
  const base = process.env.OPENCLAW_PACK_DIR?.trim() || "/tmp/openclaw";
  const dest = path.join(base, "packs");
  await fs.mkdir(dest, { recursive: true }).catch(() => undefined);
  // Best-effort sanity: ensure it exists, otherwise fallback.
  if (await pathExists(dest)) {
    return dest;
  }
  const fallback = path.join(os.tmpdir(), "openclaw-packs");
  await fs.mkdir(fallback, { recursive: true }).catch(() => undefined);
  return fallback;
}

async function runForkUpdate(params: {
  forkRoot: string;
  forkRepoId: string;
  opts: UpdateCommandOptions;
  timeoutMs: number;
}): Promise<void> {
  const branch = process.env.OPENCLAW_FORK_BRANCH?.trim() || "jd-bot-effectiveness-fixes";
  const remoteName = process.env.OPENCLAW_FORK_UPSTREAM_REMOTE?.trim() || "upstream";
  const upstreamRef = process.env.OPENCLAW_FORK_UPSTREAM_REF?.trim() || `${remoteName}/main`;
  const shouldPush = (process.env.OPENCLAW_FORK_PUSH?.trim() ?? "1") !== "0";
  const shouldRestart = params.opts.restart !== false;

  defaultRuntime.log(
    theme.muted(`Fork install detected (${params.forkRepoId}). Using fork updater.`),
  );
  defaultRuntime.log(theme.muted(`Repo: ${params.forkRoot}`));
  defaultRuntime.log(theme.muted(`Branch: ${branch} → rebase onto ${upstreamRef}`));
  defaultRuntime.log("");

  // Preflight: clean tree
  const statusRes = await runCommandWithTimeout(
    ["git", "-C", params.forkRoot, "status", "--porcelain"],
    { timeoutMs: params.timeoutMs },
  );
  if (statusRes.code !== 0) {
    throw new Error(`git status failed: ${(statusRes.stderr || statusRes.stdout).trim()}`);
  }
  if (statusRes.stdout.trim().length > 0) {
    throw new Error(`Fork repo has uncommitted changes. Commit/stash first: ${params.forkRoot}`);
  }

  await ensureUpstreamRemote({ forkRoot: params.forkRoot, timeoutMs: params.timeoutMs });

  await runStep({
    name: "git fetch upstream",
    argv: ["git", "-C", params.forkRoot, "fetch", remoteName, "--prune", "--tags"],
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });

  await runStep({
    name: `git checkout ${branch}`,
    argv: ["git", "-C", params.forkRoot, "checkout", branch],
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });

  await runStep({
    name: `git rebase ${upstreamRef}`,
    argv: ["git", "-C", params.forkRoot, "rebase", upstreamRef],
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });

  if (shouldPush) {
    await runStep({
      name: "git push --force-with-lease",
      argv: ["git", "-C", params.forkRoot, "push", "--force-with-lease", "origin", branch],
      cwd: params.forkRoot,
      timeoutMs: params.timeoutMs,
    });
  }

  await runStep({
    name: "pnpm install",
    argv: ["pnpm", "install"],
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });

  await runStep({
    name: "pnpm build",
    argv: ["pnpm", "build"],
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });

  const packDest = await resolvePackDestination();
  const packRes = await runCommandWithTimeout(["npm", "pack", "--pack-destination", packDest], {
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });
  if (packRes.code !== 0) {
    const detail = (packRes.stderr || packRes.stdout).trim();
    throw new Error(`npm pack failed${detail ? `: ${detail}` : ""}`);
  }
  const tarball = packRes.stdout.trim().split("\n").filter(Boolean).slice(-1)[0];
  if (!tarball) {
    throw new Error("npm pack did not return a tarball filename");
  }
  const tarballPath = path.join(packDest, tarball);

  await runStep({
    name: "npm install -g (fork tarball)",
    argv: ["npm", "install", "-g", "--force", tarballPath],
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });

  if (shouldRestart) {
    await runStep({
      name: "openclaw gateway restart",
      argv: ["openclaw", "gateway", "restart"],
      cwd: params.forkRoot,
      timeoutMs: params.timeoutMs,
    });
  } else {
    defaultRuntime.log(
      theme.muted(
        `Tip: Run \`${formatCliCommand("openclaw gateway restart")}\` to apply updates to a running gateway.`,
      ),
    );
  }

  // Smoke tests: keep these cheap and representative.
  await runStep({
    name: "smoke: memory_search (main)",
    argv: [
      "openclaw",
      "memory",
      "search",
      "PRIIPs",
      "--agent",
      "main",
      "--json",
      "--min-score",
      "0",
      "--max-results",
      "1",
    ],
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });

  await runStep({
    name: "smoke: memory_search (treasurer)",
    argv: [
      "openclaw",
      "memory",
      "search",
      "IBKR",
      "--agent",
      "treasurer",
      "--json",
      "--min-score",
      "0",
      "--max-results",
      "1",
    ],
    cwd: params.forkRoot,
    timeoutMs: params.timeoutMs,
  });

  defaultRuntime.log("");
  defaultRuntime.log(theme.success("Fork update complete."));
}

export async function maybeRunForkUpdate(params: {
  installedRoot: string;
  opts: UpdateCommandOptions;
  timeoutMs: number;
}): Promise<boolean> {
  const forkRepoId = await resolveForkRepoId({ installedRoot: params.installedRoot });
  if (!forkRepoId) {
    return false;
  }

  const normalized = forkRepoId.trim().toLowerCase();
  if (!normalized || normalized === "openclaw/openclaw") {
    return false;
  }

  if (params.opts.channel || params.opts.tag) {
    defaultRuntime.log(
      theme.muted(
        "Note: --channel/--tag are ignored for fork installs. Use OPENCLAW_FORK_UPSTREAM_REF if you need to pin.",
      ),
    );
  }

  const forkRoot = await resolveForkRoot({ forkRepoId, timeoutMs: params.timeoutMs });
  if (!forkRoot) {
    defaultRuntime.error(
      [
        `Fork updater could not find a checkout of ${forkRepoId}.`,
        `Clone it to ~/workspace/openclaw or set OPENCLAW_FORK_ROOT.`,
      ].join("\n"),
    );
    defaultRuntime.exit(1);
    return true;
  }

  await runForkUpdate({
    forkRoot,
    forkRepoId,
    opts: params.opts,
    timeoutMs: params.timeoutMs,
  });
  return true;
}
