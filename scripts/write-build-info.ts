import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const pkgPath = path.join(rootDir, "package.json");

const readPackageVersion = () => {
  try {
    const raw = fs.readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? null;
  } catch {
    return null;
  }
};

const resolveCommit = () => {
  const envCommit = process.env.GIT_COMMIT?.trim() || process.env.GIT_SHA?.trim();
  if (envCommit) {
    return envCommit;
  }
  try {
    return execSync("git rev-parse HEAD", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
};

function parseGitHubRepo(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  if (!trimmed) {
    return null;
  }
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

const resolveSourceRepo = () => {
  const envRepo = process.env.OPENCLAW_SOURCE_REPO?.trim() || process.env.GITHUB_REPOSITORY?.trim();
  if (envRepo) {
    return envRepo;
  }
  try {
    const origin = execSync("git remote get-url origin", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return parseGitHubRepo(origin);
  } catch {
    return null;
  }
};

const version = readPackageVersion();
const commit = resolveCommit();
const sourceRepo = resolveSourceRepo();

const buildInfo = {
  version,
  commit,
  builtAt: new Date().toISOString(),
  sourceRepo,
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`);
