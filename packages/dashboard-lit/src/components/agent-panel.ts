import { consume } from "@lit/context";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { agentContext } from "../context/agent-context.js";
import type { AgentProfile, AgentProfileStore } from "../lib/agent-profiles.js";
import { icon } from "./icons.js";
import "./agent-dropdown-switcher.js";
import "../views/chat-view.js";

type AgentTab = "chat" | "settings" | "tasks" | "workflows" | "retrospectives";

@customElement("agent-panel")
export class AgentPanel extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @consume({ context: agentContext, subscribe: true })
  agentStore!: AgentProfileStore;

  @property({ type: String }) mode: "panel" | "fullpage" = "fullpage";

  @state() private agentTab: AgentTab = "chat";

  private handleAgentSelect(e: CustomEvent<string>): void {
    this.agentStore.selectAgent(e.detail);
    this.agentTab = "chat";
  }

  private handleCreateNew(): void {
    const agent = this.agentStore.createAgent({
      name: `Agent ${this.agentStore.agents.length + 1}`,
    });
    this.agentStore.selectAgent(agent.id);
    this.agentTab = "settings";
  }

  private setTab(tab: AgentTab): void {
    this.agentTab = tab;
  }

  override render() {
    const store = this.agentStore;
    if (!store) {
      return html`
        <div class="agent-panel">Loading...</div>
      `;
    }

    const agent = store.selectedAgent;
    const tabs = this.buildTabs(agent);

    return html`
      <div class="agent-panel agent-panel--${this.mode}">
        <div class="agent-panel__header">
          <agent-dropdown-switcher
            .agents=${store.visibleAgents}
            .selectedId=${store.selectedId}
            .compact=${this.mode === "panel"}
            @agent-select=${(e: CustomEvent<string>) => this.handleAgentSelect(e)}
            @create-new=${() => this.handleCreateNew()}
          ></agent-dropdown-switcher>

          <div class="agent-panel__tabs">
            ${tabs.map(
              (t) => html`
                <button
                  class="agent-panel__tab ${this.agentTab === t.id ? "agent-panel__tab--active" : ""}"
                  @click=${() => this.setTab(t.id)}
                  title=${t.label}
                  style=${t.accentColor ? `--tab-accent:${t.accentColor}` : ""}
                >
                  ${icon(t.icon, { className: "icon-xs" })}
                  ${this.mode === "fullpage" ? html`<span>${t.label}</span>` : nothing}
                </button>
              `,
            )}
          </div>
        </div>

        <div class="agent-panel__content">
          ${
            agent
              ? this.renderTabContent(agent)
              : html`
                  <div class="agent-panel__empty">Select an agent</div>
                `
          }
        </div>
      </div>
    `;
  }

  private renderTabContent(agent: AgentProfile) {
    switch (this.agentTab) {
      case "chat":
        return keyed(agent.id, html`<agent-chat .agent=${agent}></agent-chat>`);
      case "settings":
        return html`<div class="agent-panel__placeholder">
          ${icon("settings", { className: "icon-md" })}
          <h3>${agent.name} Settings</h3>
          <p>Agent configuration coming soon.</p>
        </div>`;
      case "tasks":
        return html`<div class="agent-panel__placeholder">
          ${icon("listChecks", { className: "icon-md" })}
          <h3>Tasks</h3>
          <p>Task management coming soon.</p>
        </div>`;
      case "workflows":
        return html`<div class="agent-panel__placeholder">
          ${icon("activity", { className: "icon-md" })}
          <h3>Workflows</h3>
          <p>Workflow orchestration coming soon.</p>
        </div>`;
      case "retrospectives":
        return html`<div class="agent-panel__placeholder">
          ${icon("brain", { className: "icon-md" })}
          <h3>Retrospectives</h3>
          <p>Retrospective analysis coming soon.</p>
        </div>`;
      default:
        return nothing;
    }
  }

  private buildTabs(agent: AgentProfile | null) {
    const tabs: Array<{
      id: AgentTab;
      label: string;
      icon: import("./icons.js").IconName;
      accentColor?: string;
    }> = [{ id: "chat", label: "Chat", icon: "messageSquare" }];

    if (agent?.isTaskRunner) {
      tabs.push({ id: "tasks", label: "Tasks", icon: "listChecks", accentColor: "#10b981" });
    }
    if (agent?.isAgentBuilder) {
      tabs.push({ id: "settings", label: "Builder", icon: "hammer", accentColor: "#f59e0b" });
    } else {
      tabs.push({ id: "settings", label: "Settings", icon: "settings" });
    }

    tabs.push({ id: "workflows", label: "Workflows", icon: "activity" });
    tabs.push({ id: "retrospectives", label: "Retros", icon: "brain" });

    return tabs;
  }
}
