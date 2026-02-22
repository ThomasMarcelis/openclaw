import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { friendlyToolName } from "../lib/tool-labels.js";
import { icon } from "./icons.js";

@customElement("tool-call-block")
export class ToolCallBlock extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: String }) name = "";
  @property({ type: Object }) input: unknown = null;
  @property({ type: Boolean }) isOpen = false;

  private toggle(): void {
    this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, composed: true }));
  }

  override render() {
    const friendly = friendlyToolName(this.name);
    const inputStr =
      typeof this.input === "string" ? this.input : JSON.stringify(this.input, null, 2);
    const chars = inputStr?.length ?? 0;

    return html`
      <div class="tool-block ${this.isOpen ? "tool-block--open" : ""}" style="margin-top:6px">
        <div class="tool-block__header" @click=${() => this.toggle()}>
          <span class="tool-block__name">
            ${icon("zap", { className: "icon-xs" })}
            ${friendly}
          </span>
          <span class="tool-block__meta">
            <span class="tool-block__badge">${chars} chars</span>
            <span class="tool-block__chevron">
              ${icon("chevronDown", { className: "icon-xs" })}
            </span>
          </span>
        </div>
        <div class="tool-block__body">
          <pre class="tool-block__output">${inputStr}</pre>
        </div>
      </div>
    `;
  }
}

@customElement("tool-result-block")
export class ToolResultBlock extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: String }) name = "";
  @property({ type: String }) content = "";
  @property({ type: Boolean }) isOpen = false;

  private toggle(): void {
    this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, composed: true }));
  }

  override render() {
    const chars = this.content.length;
    return html`
      <div class="tool-block ${this.isOpen ? "tool-block--open" : ""}">
        <div class="tool-block__header" @click=${() => this.toggle()}>
          <span class="tool-block__name">
            ${icon("terminal", { className: "icon-xs" })}
            ${this.name}
          </span>
          <span class="tool-block__meta">
            <span class="tool-block__badge">${chars} chars</span>
            <span class="tool-block__chevron">
              ${icon("chevronDown", { className: "icon-xs" })}
            </span>
          </span>
        </div>
        <div class="tool-block__body">
          <pre class="tool-block__output">${this.content}</pre>
        </div>
      </div>
    `;
  }
}
