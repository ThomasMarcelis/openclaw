import { ContextProvider } from "@lit/context";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { agentContext } from "../context/agent-context.js";
import { AgentProfileStore } from "../lib/agent-profiles.js";

@customElement("agent-profile-provider")
export class AgentProfileProvider extends LitElement {
  private store = new AgentProfileStore();
  private provider: ContextProvider<typeof agentContext> | null = null;
  private unsub: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.provider = new ContextProvider(this, {
      context: agentContext,
      initialValue: this.store,
    });
    this.store.startSync();
    this.unsub = this.store.subscribe(() => {
      this.provider?.setValue(this.store, true);
    });
  }

  override disconnectedCallback(): void {
    this.unsub?.();
    this.store.stopSync();
    this.provider = null;
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <slot></slot>
    `;
  }
}
