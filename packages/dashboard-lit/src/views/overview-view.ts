import { consume } from "@lit/context";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { HealthStripData } from "../components/health-strip.js";
import "../components/health-strip.js";
import "../components/log-panel.js";
import { icon } from "../components/icons.js";
import { gatewayContext, type GatewayState } from "../context/gateway-context.js";
import {
  parseOverviewSnapshot,
  formatDuration,
  formatRelativeTime,
  type OverviewSnapshot,
} from "../controllers/overview.js";
import { loadPresence, type PresenceEntry } from "../controllers/presence.js";
import { loadSessions, type SessionsListResult } from "../controllers/sessions.js";
import { storeGatewayUrl, storeToken } from "../lib/local-settings.js";

// ── Cron types (inline to avoid adding a controller just for one RPC) ──

type CronStatus = {
  enabled: boolean;
  jobs: number;
  nextWakeAtMs?: number | null;
};

// ── Helpers ────────────────────────────────────────────

function formatNextRun(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) {
    return "—";
  }
  const diff = ts - Date.now();
  if (diff <= 0) {
    return "now";
  }
  const sec = Math.round(diff / 1000);
  if (sec < 60) {
    return `in ${sec}s`;
  }
  const min = Math.round(sec / 60);
  if (min < 60) {
    return `in ${min}m`;
  }
  const hr = Math.round(min / 60);
  if (hr < 24) {
    return `in ${hr}h`;
  }
  return `in ${Math.round(hr / 24)}d`;
}

// ────────────────────────────────────────────────────────

@customElement("overview-view")
export class OverviewView extends LitElement {
  @consume({ context: gatewayContext, subscribe: true })
  gateway!: GatewayState;

  override createRenderRoot() {
    return this;
  }

  @state() gatewayUrlInput = "";
  @state() sharedSecretInput = "";
  @state() presenceEntries: PresenceEntry[] = [];
  @state() sessionsResult: SessionsListResult | null = null;
  @state() cronStatus: CronStatus | null = null;
  @state() loadingStats = false;
  @state() lastRefreshedAt: number | null = null;

  private lastConnectedState: boolean | null = null;

  override updated(): void {
    if (this.gateway && !this.gatewayUrlInput) {
      this.gatewayUrlInput = this.gateway.gatewayUrl;
    }

    const connected = this.gateway?.connected ?? false;
    if (connected && this.lastConnectedState !== true) {
      void this.refreshStats();
    }
    this.lastConnectedState = connected;
  }

  private async refreshStats(): Promise<void> {
    if (!this.gateway?.connected || this.loadingStats) {
      return;
    }
    this.loadingStats = true;
    try {
      const [presence, sessions, cron] = await Promise.allSettled([
        loadPresence(this.gateway.request),
        loadSessions(this.gateway.request, { limit: 0 }),
        this.gateway.request<CronStatus>("cron.status", {}),
      ]);
      this.presenceEntries = presence.status === "fulfilled" ? presence.value : [];
      this.sessionsResult = sessions.status === "fulfilled" ? sessions.value : null;
      this.cronStatus = cron.status === "fulfilled" && cron.value ? cron.value : null;
      this.lastRefreshedAt = Date.now();
    } finally {
      this.loadingStats = false;
    }
  }

  private onReconnect(): void {
    const url = this.gatewayUrlInput.trim();
    const secret = this.sharedSecretInput.trim();
    if (url) {
      storeGatewayUrl(url);
    }
    if (secret) {
      storeToken(secret);
    }
    this.gateway.reconnect({
      gatewayUrl: url || "ws://127.0.0.1:18789",
      token: secret,
      password: secret,
    });
  }

  private handleReconnectKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      this.onReconnect();
    }
  };

  private navigateTo(tab: string): void {
    this.dispatchEvent(
      new CustomEvent("tab-change", { detail: tab, bubbles: true, composed: true }),
    );
  }

  override render() {
    const g = this.gateway;
    if (!g) {
      return html`
        <p class="muted">Loading...</p>
      `;
    }

    const snapshot = parseOverviewSnapshot(g.hello);
    const connected = g.connected;

    return html`
      <div class="overview-grid">
        ${this.renderHealthStrip(connected, snapshot)}
        ${this.renderQuickActions()}
        ${this.renderHealthSection(connected, snapshot)}
        ${this.renderStatsSection()}
        ${this.renderConnectionSection(g)}
        ${this.renderLogPanel(g)}
      </div>
    `;
  }

  /* ── Health Strip (compact status bar) ─────────── */

  private renderHealthStrip(connected: boolean, snapshot: OverviewSnapshot) {
    const data: HealthStripData = {
      connected,
      uptimeMs: snapshot.uptimeMs,
      errorCount: this.gateway?.lastError ? 1 : 0,
      sessionCount: this.sessionsResult?.count ?? null,
      cronNextLabel: this.cronStatus?.nextWakeAtMs
        ? formatNextRun(this.cronStatus.nextWakeAtMs)
        : null,
      cronEnabled: this.cronStatus?.enabled ?? null,
    };

    return html`<health-strip .data=${data}></health-strip>`;
  }

  /* ── Quick Actions ─────────────────────────────── */

  private renderQuickActions() {
    return html`
      <div class="quick-actions-row" role="toolbar" aria-label="Quick actions">
        <button
          class="quick-action-btn"
          @click=${() => this.navigateTo("chat")}
          aria-label="Open Chat"
        >
          ${icon("messageSquare", { className: "icon-xs" })}
          Chat
          <kbd class="quick-action-kbd" aria-hidden="true">C</kbd>
        </button>
        <button
          class="quick-action-btn"
          @click=${() => this.navigateTo("sessions")}
          aria-label="View Sessions"
        >
          ${icon("terminal", { className: "icon-xs" })}
          Sessions
          <kbd class="quick-action-kbd" aria-hidden="true">S</kbd>
        </button>
        <button
          class="quick-action-btn"
          @click=${() => this.navigateTo("cron")}
          aria-label="View Automation"
        >
          ${icon("zap", { className: "icon-xs" })}
          Automation
          <kbd class="quick-action-kbd" aria-hidden="true">A</kbd>
        </button>
        <button
          class="quick-action-btn"
          @click=${() => void this.refreshStats()}
          ?disabled=${this.loadingStats}
          aria-label="Refresh all statistics"
        >
          ${
            this.loadingStats
              ? icon("loader", { className: "icon-xs icon-spin" })
              : icon("refresh", { className: "icon-xs" })
          }
          Refresh
          <kbd class="quick-action-kbd" aria-hidden="true">R</kbd>
        </button>
      </div>
    `;
  }

  /* ── Gateway Health ─────────────────────────────── */

  private renderHealthSection(connected: boolean, snapshot: OverviewSnapshot) {
    return html`
      <section class="panel panel--primary overview-panel overview-card-enter" aria-label="Gateway Health">
        <h3 class="panel-title">
          ${icon("activity", { className: "icon-sm" })}
          Gateway Health
        </h3>
        <div class="stats-row">
          <div class="stat-card" role="status" aria-label="Status: ${connected ? "Connected" : "Offline"}">
            <div class="stat-label">
              ${icon("activity", { className: "icon-xs" })}
              Status
            </div>
            <div class="stat-value ${connected ? "stat-value--ok" : "stat-value--warn"}">
              ${connected ? "Connected" : "Offline"}
            </div>
          </div>
          <div class="stat-card" role="status" aria-label="Uptime: ${snapshot.uptimeMs != null ? formatDuration(snapshot.uptimeMs) : "unknown"}">
            <div class="stat-label">
              ${icon("clock", { className: "icon-xs" })}
              Uptime
            </div>
            <div class="stat-value">
              ${snapshot.uptimeMs != null ? formatDuration(snapshot.uptimeMs) : "—"}
            </div>
          </div>
          <div class="stat-card" role="status" aria-label="Tick Interval: ${snapshot.tickIntervalMs != null ? `${snapshot.tickIntervalMs}ms` : "unknown"}">
            <div class="stat-label">
              ${icon("refresh", { className: "icon-xs" })}
              Tick Interval
            </div>
            <div class="stat-value">
              ${snapshot.tickIntervalMs != null ? `${snapshot.tickIntervalMs}ms` : "—"}
            </div>
          </div>
          <div class="stat-card" role="status" aria-label="Auth Mode: ${snapshot.authMode ?? "unknown"}">
            <div class="stat-label">
              ${icon("shield", { className: "icon-xs" })}
              Auth Mode
            </div>
            <div class="stat-value">${snapshot.authMode ?? "—"}</div>
          </div>
        </div>
        ${
          snapshot.gatewayVersion
            ? html`
            <div class="overview-version-hint">
              Gateway v${snapshot.gatewayVersion} · Protocol
              ${snapshot.protocolVersion ?? "?"}
            </div>
          `
            : nothing
        }
      </section>
    `;
  }

  /* ── Quick Stats ────────────────────────────────── */

  private renderStatsSection() {
    const refreshHint = this.lastRefreshedAt ? formatRelativeTime(this.lastRefreshedAt) : null;

    return html`
      <section class="panel panel--primary overview-panel overview-card-enter" aria-label="Quick Statistics">
        <div class="panel-title-row">
          <h3 class="panel-title">
            ${icon("barChart", { className: "icon-sm" })}
            Quick Stats
          </h3>
          <div class="panel-title-actions">
            ${
              refreshHint
                ? html`<span class="overview-refresh-hint">Updated ${refreshHint}</span>`
                : nothing
            }
            <button
              class="btn-ghost"
              @click=${() => void this.refreshStats()}
              title="Refresh stats"
              aria-label="Refresh statistics"
              ?disabled=${this.loadingStats}
            >
              ${
                this.loadingStats
                  ? icon("loader", { className: "icon-sm icon-spin" })
                  : icon("refresh", { className: "icon-sm" })
              }
            </button>
          </div>
        </div>
        <div class="stats-row">
          <div class="stat-card" role="status" aria-label="Instances: ${this.presenceEntries.length}">
            <div class="stat-label">
              ${icon("radio", { className: "icon-xs" })}
              Instances
            </div>
            <div class="stat-value">${this.presenceEntries.length}</div>
            <div class="stat-hint">Connected clients</div>
          </div>
          <div class="stat-card" role="status" aria-label="Sessions: ${this.sessionsResult?.count ?? "unknown"}">
            <div class="stat-label">
              ${icon("fileText", { className: "icon-xs" })}
              Sessions
            </div>
            <div class="stat-value">
              ${this.sessionsResult?.count ?? "—"}
            </div>
            <div class="stat-hint">Active sessions</div>
          </div>
          <div class="stat-card" role="status" aria-label="Cron: ${this.cronStatus == null ? "unknown" : this.cronStatus.enabled ? "Enabled" : "Disabled"}">
            <div class="stat-label">
              ${icon("zap", { className: "icon-xs" })}
              Cron
            </div>
            <div class="stat-value ${this.cronStatus?.enabled ? "stat-value--ok" : ""}">
              ${this.cronStatus == null ? "—" : this.cronStatus.enabled ? "Enabled" : "Disabled"}
            </div>
            <div class="stat-hint">
              ${
                this.cronStatus
                  ? html`${this.cronStatus.jobs} job${this.cronStatus.jobs !== 1 ? "s" : ""}
                  · Next ${formatNextRun(this.cronStatus.nextWakeAtMs)}`
                  : "Schedule recurring runs"
              }
            </div>
          </div>
        </div>

        ${this.renderEmptyStatsHint()}
      </section>
    `;
  }

  private renderEmptyStatsHint() {
    if (this.loadingStats || this.sessionsResult != null || this.cronStatus != null) {
      return nothing;
    }
    if (this.gateway?.connected) {
      return nothing;
    }

    return html`
      <div class="empty-state">
        ${icon("loader", { className: "icon-sm" })}
        <span>Connect to a gateway to view live statistics</span>
      </div>
    `;
  }

  /* ── Connection Form ────────────────────────────── */

  private renderConnectionSection(g: GatewayState) {
    const isAuthIssue =
      g.lastError?.toLowerCase().includes("auth") ||
      g.lastError?.toLowerCase().includes("password") ||
      g.lastError?.toLowerCase().includes("unauthorized");

    const isInsecureContext =
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      g.lastError?.toLowerCase().includes("secure context");

    return html`
      <section class="panel panel--primary overview-panel overview-card-enter" aria-label="Connection">
        <h3 class="panel-title">
          ${icon("link", { className: "icon-sm" })}
          Connection
        </h3>

        ${
          g.retryStalled
            ? html`
            <div class="alert-card" role="alert">
              <strong class="title-with-icon">
                ${icon("alert", { className: "icon-sm" })}
                Connection stalled
              </strong>
              <p>
                Multiple reconnect attempts failed. Check the gateway URL and
                credentials below.
              </p>
              <button
                class="btn-ghost alert-card__retry"
                @click=${() => g.retryNow()}
                aria-label="Retry connection now"
              >
                ${icon("refresh", { className: "icon-xs" })}
                Retry now
              </button>
            </div>
          `
            : nothing
        }

        ${
          isAuthIssue && g.lastError
            ? html`
            <div class="alert-card" role="alert">
              <strong class="title-with-icon">
                ${icon("key", { className: "icon-sm" })}
                Authentication issue
              </strong>
              <ol>
                <li>Run <code>openclaw config get gateway.auth.password</code></li>
                <li>If empty, run <code>openclaw config get gateway.auth.token</code></li>
                <li>Paste it below, then click <b>Connect</b></li>
              </ol>
              <div class="alert-card__docs">
                Or launch with
                <code>openclaw dashboard --no-open</code> for a tokenized URL.
                <a
                  href="https://docs.openclaw.ai/web/dashboard"
                  target="_blank"
                  rel="noreferrer"
                >
                  Docs ${icon("externalLink", { className: "icon-xs" })}
                </a>
              </div>
            </div>
          `
            : nothing
        }

        ${
          isInsecureContext
            ? html`
            <div class="alert-card" role="alert">
              <strong class="title-with-icon">
                ${icon("alert", { className: "icon-sm" })}
                Insecure context
              </strong>
              <p>
                This page is served over plain HTTP. Some authentication methods
                require a secure context (HTTPS or localhost).
              </p>
              <div class="alert-card__docs">
                Try accessing via <code>http://127.0.0.1:18789</code> or
                enable
                <code>gateway.controlUi.allowInsecureAuth: true</code>.
              </div>
            </div>
          `
            : nothing
        }

        ${
          g.lastError && !isAuthIssue && !isInsecureContext
            ? html`
            <div class="alert-card" role="alert">
              <strong>${g.lastError}</strong>
            </div>
          `
            : nothing
        }

        <div class="connect-form">
          <label>
            Gateway URL
            <input
              .value=${this.gatewayUrlInput}
              @input=${(e: Event) => {
                this.gatewayUrlInput = (e.target as HTMLInputElement).value;
              }}
              @keydown=${this.handleReconnectKeyDown}
              placeholder="ws://127.0.0.1:18789"
              aria-label="Gateway URL"
            />
          </label>
          <label>
            Shared secret
            <div class="input-row">
              <input
                type="password"
                .value=${this.sharedSecretInput}
                @input=${(e: Event) => {
                  this.sharedSecretInput = (e.target as HTMLInputElement).value;
                }}
                @keydown=${this.handleReconnectKeyDown}
                placeholder="Gateway shared secret (password/token)"
                aria-label="Shared secret"
              />
              <button type="button" @click=${() => this.onReconnect()}>
                ${icon("spark", { className: "icon-xs" })}
                Connect
              </button>
            </div>
          </label>
        </div>
      </section>
    `;
  }

  /* ── Log Panel (tabbed: Snapshot | Event) ───────── */

  private renderLogPanel(g: GatewayState) {
    return html`
      <log-panel
        class="overview-card-enter"
        .helloSnapshot=${g.hello}
        .lastEvent=${g.lastEvent}
      ></log-panel>
    `;
  }
}
