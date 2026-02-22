import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { icon } from "./icons.js";

type LogTab = "snapshot" | "event";

@customElement("log-panel")
export class LogPanel extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Object }) helloSnapshot: unknown = null;
  @property({ type: Object }) lastEvent: unknown = null;

  @state() private activeTab: LogTab = "snapshot";

  override render() {
    const hasEvent = this.lastEvent != null;

    return html`
      <div class="panel panel--operational overview-panel log-panel-container">
        <div class="log-panel__tabs" role="tablist" aria-label="Debug panels">
          <button
            class="log-panel__tab ${this.activeTab === "snapshot" ? "log-panel__tab--active" : ""}"
            role="tab"
            aria-selected=${this.activeTab === "snapshot"}
            aria-controls="log-panel-snapshot"
            @click=${() => {
              this.activeTab = "snapshot";
            }}
          >
            ${icon("shield", { className: "icon-xs" })}
            Hello Snapshot
          </button>
          <button
            class="log-panel__tab ${this.activeTab === "event" ? "log-panel__tab--active" : ""}"
            role="tab"
            aria-selected=${this.activeTab === "event"}
            aria-controls="log-panel-event"
            @click=${() => {
              this.activeTab = "event";
            }}
          >
            ${icon("activity", { className: "icon-xs" })}
            Latest Event
            ${
              hasEvent
                ? html`
                    <span class="log-panel__live-dot" aria-hidden="true"></span>
                  `
                : nothing
            }
          </button>
        </div>

        <div class="log-panel__body">
          ${
            this.activeTab === "snapshot"
              ? html`
              <div id="log-panel-snapshot" role="tabpanel" aria-label="Hello Snapshot">
                <pre class="log-panel__pre">${JSON.stringify(this.helloSnapshot, null, 2) || "(waiting for hello-ok)"}</pre>
              </div>`
              : html`
              <div id="log-panel-event" role="tabpanel" aria-label="Latest Event">
                <pre class="log-panel__pre">${JSON.stringify(this.lastEvent, null, 2) || "(no events yet)"}</pre>
              </div>`
          }
        </div>
      </div>
    `;
  }
}
