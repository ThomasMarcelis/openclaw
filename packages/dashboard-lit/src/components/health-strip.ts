import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { icon } from "./icons.js";

export type HealthStripData = {
  connected: boolean;
  uptimeMs: number | null;
  errorCount: number;
  sessionCount: number | null;
  cronNextLabel: string | null;
  cronEnabled: boolean | null;
};

function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) {
    return `${s}s`;
  }
  const m = Math.floor(s / 60);
  if (m < 60) {
    return `${m}m`;
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    return `${h}h ${m % 60}m`;
  }
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

@customElement("health-strip")
export class HealthStrip extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Object }) data: HealthStripData = {
    connected: false,
    uptimeMs: null,
    errorCount: 0,
    sessionCount: null,
    cronNextLabel: null,
    cronEnabled: null,
  };

  override render() {
    const d = this.data;

    return html`
      <div class="health-strip" role="status" aria-label="System health overview">
        <span class="health-strip__chip ${d.connected ? "health-strip__chip--ok" : "health-strip__chip--error"}">
          <span class="health-strip__dot" aria-hidden="true"></span>
          ${d.connected ? "Connected" : "Offline"}
        </span>

        ${
          d.uptimeMs != null
            ? html`<span class="health-strip__chip" aria-label="Uptime: ${fmtUptime(d.uptimeMs)}">
              ${icon("clock", { className: "icon-xs" })}
              <span class="health-strip__label">Up</span>
              ${fmtUptime(d.uptimeMs)}
            </span>`
            : nothing
        }

        ${
          d.errorCount > 0
            ? html`<span class="health-strip__chip health-strip__chip--error" aria-label="${d.errorCount} error${d.errorCount !== 1 ? "s" : ""}">
              ${icon("alert", { className: "icon-xs" })}
              ${d.errorCount} error${d.errorCount !== 1 ? "s" : ""}
            </span>`
            : nothing
        }

        ${
          d.sessionCount != null
            ? html`<span class="health-strip__chip" aria-label="${d.sessionCount} session${d.sessionCount !== 1 ? "s" : ""}">
              ${icon("messageSquare", { className: "icon-xs" })}
              ${d.sessionCount} session${d.sessionCount !== 1 ? "s" : ""}
            </span>`
            : nothing
        }

        ${
          d.cronEnabled && d.cronNextLabel
            ? html`<span class="health-strip__chip" aria-label="Next cron run: ${d.cronNextLabel}">
              ${icon("zap", { className: "icon-xs" })}
              <span class="health-strip__label">Next</span>
              ${d.cronNextLabel}
            </span>`
            : nothing
        }
      </div>
    `;
  }
}
