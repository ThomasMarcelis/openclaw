#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const staged = args.includes("--staged");
const fileArgs = args.filter((arg) => arg !== "--staged");

if (fileArgs.length === 0) {
  process.exit(0);
}

const IPV4_PRIVATE_RE =
  /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])(?:\.\d{1,3}){2})\b/g;
const IPV6_PRIVATE_RE = /\b(?:fd|fc)[0-9a-f]{2}:[0-9a-f:]+\b/gi;
const IPV6_LINK_LOCAL_RE = /\bfe80:[0-9a-f:]+\b/gi;

const ALLOWED_PATH_PREFIXES = ["node_modules/", "packages/dashboard-lit/dist/", "dist/"];

const isPlaceholder = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  return (
    trimmed.includes("REDACTED") ||
    trimmed.includes("__OPENCLAW_REDACTED__") ||
    trimmed.startsWith("<") ||
    trimmed.includes("${") ||
    trimmed.startsWith("$")
  );
};

const readFileContent = (filePath) => {
  if (staged) {
    try {
      return execFileSync("git", ["show", `:${filePath}`], { encoding: "utf8" });
    } catch {
      return null;
    }
  }

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};

const offsetToLine = (content, offset) => {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i += 1) {
    if (content[i] === "\n") {
      line += 1;
    }
  }
  return line;
};

const violations = [];

const pushViolation = (file, line, message) => {
  violations.push(`${file}:${line}: ${message}`);
};

for (const filePath of fileArgs) {
  const normalizedPath = filePath.split(path.sep).join("/");
  if (ALLOWED_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    continue;
  }

  const content = readFileContent(filePath);
  if (!content || content.includes("\0")) {
    continue;
  }

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const envSecret = line.match(/\bOPENCLAW_GATEWAY_(PASSWORD|TOKEN)\s*=\s*([^#\s]+)/i);
    if (envSecret && !isPlaceholder(envSecret[2])) {
      pushViolation(
        filePath,
        i + 1,
        "gateway secret assignment detected (OPENCLAW_GATEWAY_PASSWORD/TOKEN)",
      );
    }

    const cliSecret = line.match(
      /\bopenclaw\s+config\s+set\s+gateway\.auth\.(password|token)\s+(.+)$/i,
    );
    if (cliSecret && !isPlaceholder(cliSecret[2])) {
      pushViolation(filePath, i + 1, "gateway auth secret literal detected in command");
    }

    let ipv4Match = IPV4_PRIVATE_RE.exec(line);
    while (ipv4Match) {
      pushViolation(filePath, i + 1, `private IP detected: ${ipv4Match[0]}`);
      ipv4Match = IPV4_PRIVATE_RE.exec(line);
    }
    IPV4_PRIVATE_RE.lastIndex = 0;

    let ipv6Private = IPV6_PRIVATE_RE.exec(line);
    while (ipv6Private) {
      pushViolation(filePath, i + 1, `private IPv6 detected: ${ipv6Private[0]}`);
      ipv6Private = IPV6_PRIVATE_RE.exec(line);
    }
    IPV6_PRIVATE_RE.lastIndex = 0;

    let ipv6LinkLocal = IPV6_LINK_LOCAL_RE.exec(line);
    while (ipv6LinkLocal) {
      pushViolation(filePath, i + 1, `link-local IPv6 detected: ${ipv6LinkLocal[0]}`);
      ipv6LinkLocal = IPV6_LINK_LOCAL_RE.exec(line);
    }
    IPV6_LINK_LOCAL_RE.lastIndex = 0;
  }

  const nestedGatewaySecretRe = /["'](password|token)["']\s*:\s*["']([^"'\n]+)["']/g;
  let nestedMatch = nestedGatewaySecretRe.exec(content);
  while (nestedMatch) {
    const context = content
      .slice(Math.max(0, nestedMatch.index - 220), nestedMatch.index)
      .toLowerCase();
    if (context.includes("gateway") && context.includes("auth") && !isPlaceholder(nestedMatch[2])) {
      const line = offsetToLine(content, nestedMatch.index);
      pushViolation(filePath, line, `gateway auth ${nestedMatch[1]} literal detected`);
    }
    nestedMatch = nestedGatewaySecretRe.exec(content);
  }
}

if (violations.length > 0) {
  process.stderr.write("Sensitive content check failed:\n");
  for (const violation of violations) {
    process.stderr.write(`- ${violation}\n`);
  }
  process.stderr.write(
    "\nUse placeholders for secrets and localhost/test-net addresses in committed files.\n",
  );
  process.exit(1);
}
