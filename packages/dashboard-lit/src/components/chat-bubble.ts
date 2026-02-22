import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { ChatMessage } from "../controllers/chat.js";
import {
  extractText,
  extractThinking,
  extractToolUses,
  extractToolResults,
} from "../controllers/chat.js";
import { renderMarkdown } from "../lib/markdown.js";
import { friendlyToolName } from "../lib/tool-labels.js";
import { icon } from "./icons.js";
import "./reasoning-block.js";
import "./tool-blocks.js";

export type BubbleActions = {
  onCopy?: (text: string) => void;
  onPin?: (msgIndex: number) => void;
  onUnpin?: (msgIndex: number) => void;
  onRegenerate?: () => void;
  onEdit?: (msgIndex: number, text: string) => void;
};

@customElement("chat-bubble")
export class ChatBubble extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Object }) message!: ChatMessage;
  @property({ type: Number }) index = 0;
  @property({ type: Boolean }) isHistory = false;
  @property({ type: Boolean }) isLast = false;
  @property({ type: Boolean }) isPinned = false;
  @property({ type: String }) modelTag = "";
  @property({ type: String }) senderName = "";
  @property({ type: Object }) actions: BubbleActions = {};

  @state() private expandedTools = new Set<string>();
  @state() private expandedThinking = new Set<number>();

  private toggleTool(id: string): void {
    const next = new Set(this.expandedTools);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedTools = next;
  }

  private toggleThinking(idx: number): void {
    const next = new Set(this.expandedThinking);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    this.expandedThinking = next;
  }

  private copyText(): void {
    const text = extractText(this.message);
    if (this.actions.onCopy) {
      this.actions.onCopy(text);
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  private get timestamp(): string {
    if (!this.message.timestamp) {
      return "";
    }
    return new Date(this.message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  override render() {
    const msg = this.message;
    if (!msg) {
      return nothing;
    }

    if (msg.role === "user") {
      return this.renderUser();
    }
    if (msg.role === "assistant") {
      return this.renderAssistant();
    }
    return this.renderTool();
  }

  private renderUser() {
    const text = extractText(this.message);
    const ts = this.timestamp;
    return html`
      <div class="chat-bubble chat-bubble--user ${this.isHistory ? "chat-bubble--history" : ""}">
        <div class="chat-bubble__header">
          <span class="chat-bubble__role">You</span>
          ${ts ? html`<span class="chat-bubble__ts">${ts}</span>` : nothing}
        </div>
        <div class="chat-bubble__body">${text}</div>
        <div class="chat-bubble__actions">
          <button class="chat-bubble__action" @click=${() => this.copyText()} title="Copy">
            ${icon("copy", { className: "icon-xs" })}
          </button>
          ${
            this.isPinned
              ? html`<button class="chat-bubble__action" @click=${() => this.actions.onUnpin?.(this.index)} title="Unpin">
                ${icon("pinOff", { className: "icon-xs" })}
              </button>`
              : html`<button class="chat-bubble__action" @click=${() => this.actions.onPin?.(this.index)} title="Pin">
                ${icon("pin", { className: "icon-xs" })}
              </button>`
          }
          ${
            this.actions.onEdit
              ? html`<button class="chat-bubble__action" @click=${() => this.actions.onEdit?.(this.index, extractText(this.message))} title="Edit">
                ${icon("edit", { className: "icon-xs" })}
              </button>`
              : nothing
          }
        </div>
      </div>
    `;
  }

  private renderAssistant() {
    const text = extractText(this.message);
    const ts = this.timestamp;
    const thinkingBlocks = extractThinking(this.message);
    const toolUses = extractToolUses(this.message);

    return html`
      <div class="chat-bubble chat-bubble--assistant ${this.isHistory ? "chat-bubble--history" : ""}">
        <div class="chat-bubble__header">
          <span class="chat-bubble__role">
            ${this.senderName || "Assistant"}
          </span>
          ${this.modelTag ? html`<span class="chat-bubble__model-tag">${this.modelTag}</span>` : nothing}
          ${ts ? html`<span class="chat-bubble__ts">${ts}</span>` : nothing}
        </div>

        ${thinkingBlocks.map((thinking, ti) => {
          const thinkKey = this.index * 1000 + ti;
          return html`
            <reasoning-block
              .text=${thinking}
              .isOpen=${this.expandedThinking.has(thinkKey)}
              @toggle=${() => this.toggleThinking(thinkKey)}
            ></reasoning-block>
          `;
        })}

        ${text ? html`<div class="chat-bubble__body chat-markdown">${unsafeHTML(renderMarkdown(text))}</div>` : nothing}

        ${toolUses.map(
          (tu) => html`
          <tool-call-block
            .name=${tu.name}
            .input=${tu.input}
            .isOpen=${this.expandedTools.has(tu.id)}
            @toggle=${() => this.toggleTool(tu.id)}
          ></tool-call-block>
        `,
        )}

        <div class="chat-bubble__actions">
          <button class="chat-bubble__action" @click=${() => this.copyText()} title="Copy">
            ${icon("copy", { className: "icon-xs" })}
          </button>
          ${
            this.isPinned
              ? html`<button class="chat-bubble__action" @click=${() => this.actions.onUnpin?.(this.index)} title="Unpin">
                ${icon("pinOff", { className: "icon-xs" })}
              </button>`
              : html`<button class="chat-bubble__action" @click=${() => this.actions.onPin?.(this.index)} title="Pin">
                ${icon("pin", { className: "icon-xs" })}
              </button>`
          }
          ${
            this.isLast && this.actions.onRegenerate
              ? html`<button class="chat-bubble__action" @click=${() => this.actions.onRegenerate?.()} title="Regenerate">
                ${icon("refresh", { className: "icon-xs" })}
              </button>`
              : nothing
          }
        </div>
      </div>
    `;
  }

  private renderTool() {
    const toolResults = extractToolResults(this.message);
    const toolName = this.message.toolName ?? "Tool";
    const friendly = friendlyToolName(toolName);

    if (toolResults.length > 0) {
      return html`
        ${toolResults.map(
          (tr) => html`
          <tool-result-block
            .name=${friendly}
            .content=${tr.content}
            .isOpen=${this.expandedTools.has(tr.toolUseId)}
            @toggle=${() => this.toggleTool(tr.toolUseId)}
          ></tool-result-block>
        `,
        )}
      `;
    }

    const text = extractText(this.message);
    const ts = this.timestamp;
    return html`
      <div class="chat-bubble chat-bubble--tool">
        <div class="chat-bubble__header">
          <span class="chat-bubble__role chat-bubble__role--tool">
            ${icon("terminal", { className: "icon-xs" })} ${friendly}
          </span>
          ${ts ? html`<span class="chat-bubble__ts">${ts}</span>` : nothing}
        </div>
        ${text ? html`<div class="chat-bubble__body" style="color:var(--muted)">${text}</div>` : nothing}
      </div>
    `;
  }
}
