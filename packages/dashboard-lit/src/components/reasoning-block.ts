import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { icon } from "./icons.js";

@customElement("reasoning-block")
export class ReasoningBlock extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: String }) text = "";
  @property({ type: Boolean }) isOpen = false;
  @property({ type: Boolean }) isStreaming = false;

  private toggle(): void {
    this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, composed: true }));
  }

  override render() {
    const wordCount = this.text.split(/\s+/).filter(Boolean).length;
    return html`
      <div class="reasoning-block ${this.isOpen ? "reasoning-block--open" : ""} ${this.isStreaming ? "reasoning-block--streaming" : ""}">
        <button class="reasoning-block__toggle" @click=${() => this.toggle()}>
          ${icon("brain", { className: "icon-xs" })}
          <span>Thinking</span>
          <span class="reasoning-block__count">${wordCount} words</span>
          ${icon(this.isOpen ? "chevronUp" : "chevronDown", { className: "icon-xs" })}
        </button>
        <div class="reasoning-block__content">${this.text}</div>
      </div>
    `;
  }
}
