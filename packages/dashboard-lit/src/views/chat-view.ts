import { consume } from "@lit/context";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { BubbleActions } from "../components/chat-bubble.js";
import "../components/agent-avatar.js";
import "../components/chat-bubble.js";
import { icon } from "../components/icons.js";
import { gatewayContext, type GatewayState } from "../context/gateway-context.js";
import {
  loadHistory,
  sendMessage,
  abortRun,
  updateSession,
  extractText,
  type ChatMessage,
  type ChatContentBlock,
  type ChatAttachment,
} from "../controllers/chat.js";
import type { AgentProfile } from "../lib/agent-profiles.js";
import { modelTag } from "../lib/agent-theme.js";
import { InputHistory } from "../lib/input-history.js";
import { renderMarkdown } from "../lib/markdown.js";
import { PinnedMessages } from "../lib/pinned-messages.js";
import { getSlashCommandCompletions, type SlashCommandDef } from "../lib/slash-commands.js";

type ChatEventPayload = {
  runId?: string;
  sessionKey?: string;
  seq?: number;
  state?: "delta" | "final" | "aborted" | "error";
  message?: {
    role: "assistant";
    content: ChatContentBlock[] | Array<{ type: string; text?: string; thinking?: string }>;
    timestamp?: number;
  };
  model?: string;
  senderName?: string;
  errorMessage?: string;
};

const DUTY_PROMPTS: Record<string, string> = {
  "Answer questions": "What can you help me with?",
  "Brainstorm ideas": "Help me brainstorm.",
  "Draft content": "Draft a blog post.",
  "Explain concepts": "Explain how something works.",
  "Write code": "Write a function that...",
  "Debug issues": "Help me debug this error:",
  "Review pull requests": "Review this code change:",
  "Explain architecture": "Explain the architecture of...",
  "Research topics": "Research the latest on...",
  "Analyze data": "Analyze this data set:",
  "Summarize findings": "Summarize the key findings from...",
  "Compare alternatives": "Compare these options:",
  "Design agent profiles": "Design an agent for...",
  "Configure tools": "Set up tools for...",
  "Execute task lists": "Run these tasks:",
  "Monitor progress": "What's the status of...",
  "Analyze conversations": "Analyze our recent conversations",
  "Identify patterns": "What patterns do you notice?",
  "Write copy": "Write marketing copy for...",
  "Plan campaigns": "Plan a campaign for...",
  "Review tone": "Review the tone of this content:",
  "Check brand alignment": "Does this align with our brand?",
};

const OUTLINE_SECTIONS =
  "\n\n**Goal:** \n**Context / background:** \n**Key questions to cover:** \n**Scope or constraints:** \n**What I need at the end:**";

function getOutlineTemplate(duty: string): string {
  const prompt = DUTY_PROMPTS[duty];
  if (!prompt) {
    return "";
  }
  return prompt + OUTLINE_SECTIONS;
}

const SAFETY_TIMEOUT_MS = 60_000;

@customElement("agent-chat")
export class AgentChat extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @consume({ context: gatewayContext, subscribe: true })
  gateway!: GatewayState;

  @property({ type: Object }) agent!: AgentProfile;

  @state() private messages: ChatMessage[] = [];
  @state() private streamingText = "";
  @state() private streamingReasoning = "";
  @state() private streamingRunId: string | null = null;
  @state() private message = "";
  @state() private submitting = false;
  @state() private loading = false;
  @state() private errorText = "";
  @state() private historyCount = 0;
  @state() private streamElapsed = 0;

  // Slash commands
  @state() private slashMenuOpen = false;
  @state() private slashMenuItems: SlashCommandDef[] = [];
  @state() private slashMenuIndex = 0;

  // Attachments
  @state() private attachments: ChatAttachment[] = [];

  // Search
  @state() private searchOpen = false;
  @state() private searchQuery = "";

  // Pinned
  @state() private pinnedExpanded = false;

  // Voice
  @state() private voiceActive = false;

  // Scroll
  @state() private showScrollPill = false;

  // Duty outline expansion (empty state)
  @state() private expandedDuty: string | null = null;
  @state() private outlineDraft = "";

  private prevEventSeq = -1;
  private scrollEl: HTMLElement | null = null;
  private shouldAutoScroll = true;
  private inputHistory = new InputHistory();
  private pinnedMessages!: PinnedMessages;
  private streamTimer: ReturnType<typeof setInterval> | null = null;
  private streamStartedAt = 0;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;

  private get sessionKey(): string {
    return this.agent?.id ?? "agent:main:main";
  }

  private get suggestedDuties(): { duty: string; prompt: string }[] {
    if (!this.agent?.duties) {
      return [];
    }
    const out: { duty: string; prompt: string }[] = [];
    for (const duty of this.agent.duties) {
      const prompt = DUTY_PROMPTS[duty];
      if (prompt && out.length < 4) {
        out.push({ duty, prompt });
      }
    }
    return out;
  }

  private get filteredMessages(): ChatMessage[] {
    if (!this.searchQuery.trim()) {
      return this.messages;
    }
    const q = this.searchQuery.toLowerCase();
    return this.messages.filter((m) => extractText(m).toLowerCase().includes(q));
  }

  /* ── Lifecycle ─────────────────────────────────────── */

  override connectedCallback(): void {
    super.connectedCallback();
    this.pinnedMessages = new PinnedMessages(this.sessionKey);
    void this.loadData();
  }

  override disconnectedCallback(): void {
    this.clearTimers();
    this.stopVoice();
    super.disconnectedCallback();
  }

  override updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    if (!this.scrollEl) {
      this.scrollEl = this.querySelector(".agent-chat__thread");
    }

    this.handleChatEvent();

    if (changed.has("messages") || changed.has("streamingText")) {
      this.autoScroll();
    }
  }

  /* ── Data loading ──────────────────────────────────── */

  private async loadData(): Promise<void> {
    if (!this.gateway?.connected) {
      return;
    }
    this.loading = true;
    try {
      const result = await loadHistory(this.gateway.request, this.sessionKey);
      this.messages = result.messages;
      this.historyCount = result.messages.length;
      this.errorText = "";

      if (this.agent?.model) {
        updateSession(this.gateway.request, this.sessionKey, this.agent.model).catch(() => {});
      }
    } catch (err) {
      this.errorText = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  /* ── Chat event handling ───────────────────────────── */

  private handleChatEvent(): void {
    const ev = this.gateway?.lastEvent;
    if (!ev || ev.event !== "chat") {
      return;
    }

    const payload = ev.payload as ChatEventPayload | undefined;
    if (!payload || payload.sessionKey !== this.sessionKey) {
      return;
    }

    const seq = payload.seq ?? -1;
    if (seq <= this.prevEventSeq) {
      return;
    }
    this.prevEventSeq = seq;

    const contentBlocks = payload.message?.content as Array<Record<string, unknown>> | undefined;

    switch (payload.state) {
      case "delta": {
        this.streamingRunId = payload.runId ?? null;
        const deltaText =
          contentBlocks
            ?.filter((b) => b.type === "text" && b.text)
            .map((b) => b.text as string)
            .join("") ?? "";
        const deltaThinking =
          contentBlocks
            ?.filter((b) => b.type === "thinking" && b.thinking)
            .map((b) => b.thinking as string)
            .join("") ?? "";
        this.streamingText = deltaText;
        if (deltaThinking) {
          this.streamingReasoning = deltaThinking;
        }
        if (!this.streamTimer) {
          this.startStreamTimer();
        }
        break;
      }
      case "final": {
        const finalText =
          contentBlocks
            ?.filter((b) => b.type === "text" && b.text)
            .map((b) => b.text as string)
            .join("") ?? "";

        if (finalText) {
          this.messages = [
            ...this.messages,
            {
              role: "assistant",
              content: (payload.message?.content as ChatContentBlock[] | undefined) ?? finalText,
              timestamp: payload.message?.timestamp ?? Date.now(),
            },
          ];
        }
        this.clearStreamState();
        break;
      }
      case "error": {
        this.errorText = payload.errorMessage ?? "Unknown error";
        this.clearStreamState();
        break;
      }
      case "aborted": {
        this.clearStreamState();
        break;
      }
    }
  }

  private clearStreamState(): void {
    this.streamingText = "";
    this.streamingReasoning = "";
    this.streamingRunId = null;
    this.submitting = false;
    this.streamElapsed = 0;
    this.clearTimers();
  }

  private startStreamTimer(): void {
    this.streamStartedAt = Date.now();
    this.streamTimer = setInterval(() => {
      this.streamElapsed = Math.floor((Date.now() - this.streamStartedAt) / 1000);
    }, 1000);
  }

  private clearTimers(): void {
    if (this.streamTimer) {
      clearInterval(this.streamTimer);
      this.streamTimer = null;
    }
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }

  /* ── Send / Abort ──────────────────────────────────── */

  private async onSend(overrideMsg?: string): Promise<void> {
    const trimmed = (overrideMsg ?? this.message).trim();
    if (
      (!trimmed && this.attachments.length === 0) ||
      this.submitting ||
      !this.gateway?.connected
    ) {
      return;
    }

    this.submitting = true;
    this.errorText = "";
    this.inputHistory.push(trimmed);

    const pendingAttachments = [...this.attachments];
    this.messages = [...this.messages, { role: "user", content: trimmed, timestamp: Date.now() }];
    this.message = "";
    this.attachments = [];

    this.safetyTimer = setTimeout(() => {
      if (this.submitting) {
        this.submitting = false;
        this.errorText = "Request timed out after 60 seconds";
        this.clearStreamState();
      }
    }, SAFETY_TIMEOUT_MS);

    try {
      const result = await sendMessage(
        this.gateway.request,
        this.sessionKey,
        trimmed,
        pendingAttachments.length > 0 ? pendingAttachments : undefined,
      );
      if (result.status === "error") {
        this.errorText = result.summary ?? "Send failed";
        this.submitting = false;
        this.clearTimers();
      } else {
        this.streamingRunId = result.runId;
      }
    } catch (err) {
      this.errorText = err instanceof Error ? err.message : String(err);
      this.submitting = false;
      this.clearTimers();
    }
  }

  private async onAbort(): Promise<void> {
    if (!this.gateway?.connected) {
      return;
    }
    try {
      await abortRun(this.gateway.request, this.sessionKey, this.streamingRunId ?? undefined);
    } catch {
      // best-effort
    }
  }

  /* ── Duty outline (empty state) ────────────────────── */

  private expandDuty(duty: string): void {
    const template = getOutlineTemplate(duty);
    if (!template) {
      const prompt = DUTY_PROMPTS[duty];
      if (prompt) {
        void this.onSend(prompt);
      }
      return;
    }
    this.expandedDuty = duty;
    this.outlineDraft = template;
  }

  private collapseDuty(): void {
    this.expandedDuty = null;
    this.outlineDraft = "";
  }

  private startDiscussionFromOutline(): void {
    const trimmed = this.outlineDraft.trim();
    if (!trimmed || this.submitting || !this.gateway?.connected) {
      return;
    }
    this.collapseDuty();
    void this.onSend(trimmed);
  }

  /* ── Input handling ────────────────────────────────── */

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Slash menu navigation
    if (this.slashMenuOpen && this.slashMenuItems.length > 0) {
      const len = this.slashMenuItems.length;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.slashMenuIndex = (this.slashMenuIndex + 1) % len;
          return;
        case "ArrowUp":
          e.preventDefault();
          this.slashMenuIndex = (this.slashMenuIndex - 1 + len) % len;
          return;
        case "Enter":
        case "Tab":
          e.preventDefault();
          this.selectSlashCommand(this.slashMenuItems[this.slashMenuIndex]);
          return;
        case "Escape":
          e.preventDefault();
          this.slashMenuOpen = false;
          return;
      }
    }

    // Input history
    if (!this.message.trim()) {
      if (e.key === "ArrowUp") {
        const prev = this.inputHistory.up();
        if (prev !== null) {
          e.preventDefault();
          this.message = prev;
          this.syncTextarea();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        const next = this.inputHistory.down();
        e.preventDefault();
        this.message = next ?? "";
        this.syncTextarea();
        return;
      }
    }

    // Markdown shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const ta = e.target as HTMLTextAreaElement;
      if (e.key === "b") {
        e.preventDefault();
        this.wrapSelection(ta, "**");
        return;
      }
      if (e.key === "i") {
        e.preventDefault();
        this.wrapSelection(ta, "_");
        return;
      }
      if (e.key === "e") {
        e.preventDefault();
        this.wrapSelection(ta, "`");
        return;
      }
      if (e.key === "f") {
        e.preventDefault();
        this.searchOpen = !this.searchOpen;
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void this.onSend();
    }
  };

  private wrapSelection(ta: HTMLTextAreaElement, marker: string): void {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.slice(start, end);
    const wrapped = `${marker}${selected}${marker}`;
    this.message = text.slice(0, start) + wrapped + text.slice(end);
    requestAnimationFrame(() => {
      ta.value = this.message;
      ta.setSelectionRange(start + marker.length, end + marker.length);
      ta.focus();
    });
  }

  private handleInput = (e: Event): void => {
    const ta = e.target as HTMLTextAreaElement;
    this.message = ta.value;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 150)}px`;
    this.updateSlashMenu(ta.value);
    this.inputHistory.reset();
  };

  private syncTextarea(): void {
    requestAnimationFrame(() => {
      const ta = this.querySelector<HTMLTextAreaElement>(".agent-chat__input textarea");
      if (ta) {
        ta.value = this.message;
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, 150)}px`;
      }
    });
  }

  private updateSlashMenu(value: string): void {
    const match = value.match(/^\/(\S*)$/);
    if (match) {
      const items = getSlashCommandCompletions(match[1]);
      this.slashMenuItems = items;
      this.slashMenuOpen = items.length > 0;
      this.slashMenuIndex = 0;
    } else {
      this.slashMenuOpen = false;
      this.slashMenuItems = [];
    }
  }

  private selectSlashCommand(cmd: SlashCommandDef): void {
    this.message = `/${cmd.name} `;
    this.slashMenuOpen = false;
    this.slashMenuItems = [];
    requestAnimationFrame(() => {
      const ta = this.querySelector<HTMLTextAreaElement>(".agent-chat__input textarea");
      if (ta) {
        ta.value = this.message;
        ta.focus();
        ta.setSelectionRange(this.message.length, this.message.length);
      }
    });
  }

  /* ── Attachments ────────────────────────────────────── */

  private handlePaste = (e: ClipboardEvent): void => {
    const items = e.clipboardData?.items;
    if (!items) {
      return;
    }
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          this.readFileAsAttachment(file);
        }
      }
    }
  };

  private handleFileSelect = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    if (!input.files) {
      return;
    }
    for (const file of input.files) {
      this.readFileAsAttachment(file);
    }
    input.value = "";
  };

  private handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) {
      return;
    }
    for (const file of files) {
      this.readFileAsAttachment(file);
    }
  };

  private handleDragOver = (e: DragEvent): void => {
    e.preventDefault();
  };

  private readFileAsAttachment(file: File): void {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      if (base64) {
        this.attachments = [
          ...this.attachments,
          { mimeType: file.type, fileName: file.name, content: base64 },
        ];
      }
    });
    reader.readAsDataURL(file);
  }

  private removeAttachment(index: number): void {
    this.attachments = this.attachments.filter((_, i) => i !== index);
  }

  private triggerFileInput(): void {
    this.querySelector<HTMLInputElement>(".agent-chat__file-input")?.click();
  }

  /* ── Voice ──────────────────────────────────────────── */

  private toggleVoice(): void {
    if (this.voiceActive) {
      this.stopVoice();
    } else {
      this.startVoice();
    }
  }

  private startVoice(): void {
    const SR =
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition ??
      (window as unknown as Record<string, unknown>).SpeechRecognition;
    if (!SR) {
      return;
    }

    // Web Speech API types not in all TS configs
    const recognition = new (SR as new () => Record<string, unknown>)();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: Record<string, unknown>) => {
      let transcript = "";
      const results = (
        event as { results: { length: number; [i: number]: { 0: { transcript: string } } } }
      ).results;
      for (let i = 0; i < results.length; i++) {
        transcript += results[i][0].transcript;
      }
      this.message = transcript;
      this.syncTextarea();
    };

    recognition.addEventListener("end", () => {
      this.voiceActive = false;
      this.recognition = null;
    });

    recognition.addEventListener("error", () => {
      this.voiceActive = false;
      this.recognition = null;
    });

    (recognition as { start: () => void }).start();
    this.recognition = recognition;
    this.voiceActive = true;
  }

  private stopVoice(): void {
    if (this.recognition && typeof this.recognition.stop === "function") {
      this.recognition.stop();
    }
    this.recognition = null;
    this.voiceActive = false;
  }

  /* ── Search ─────────────────────────────────────────── */

  private toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) {
      this.searchQuery = "";
    }
  }

  /* ── Export ─────────────────────────────────────────── */

  private exportMarkdown(): void {
    const lines: string[] = [`# Chat with ${this.agent?.name ?? "Agent"}`, ""];
    for (const msg of this.messages) {
      const role =
        msg.role === "user"
          ? "You"
          : msg.role === "assistant"
            ? (this.agent?.name ?? "Assistant")
            : "Tool";
      const text = extractText(msg);
      const ts = msg.timestamp ? new Date(msg.timestamp).toISOString() : "";
      lines.push(`## ${role}${ts ? ` (${ts})` : ""}`, "", text, "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${this.agent?.name ?? "export"}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Pinned ─────────────────────────────────────────── */

  private get pinnedList(): Array<{ index: number; msg: ChatMessage }> {
    const result: Array<{ index: number; msg: ChatMessage }> = [];
    for (const idx of this.pinnedMessages.indices) {
      if (this.messages[idx]) {
        result.push({ index: idx, msg: this.messages[idx] });
      }
    }
    return result;
  }

  private pinMessage = (index: number): void => {
    this.pinnedMessages.pin(index);
    this.requestUpdate();
  };

  private unpinMessage = (index: number): void => {
    this.pinnedMessages.unpin(index);
    this.requestUpdate();
  };

  /* ── Scrolling ─────────────────────────────────────── */

  private autoScroll(): void {
    if (!this.shouldAutoScroll || !this.scrollEl) {
      return;
    }
    requestAnimationFrame(() => {
      if (this.scrollEl) {
        this.scrollEl.scrollTop = this.scrollEl.scrollHeight;
      }
    });
  }

  private handleScroll = (): void => {
    if (!this.scrollEl) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = this.scrollEl;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    this.shouldAutoScroll = atBottom;
    this.showScrollPill = !atBottom && this.messages.length > 5;
  };

  private scrollToBottom(): void {
    if (this.scrollEl) {
      this.scrollEl.scrollTo({ top: this.scrollEl.scrollHeight, behavior: "smooth" });
    }
    this.showScrollPill = false;
    this.shouldAutoScroll = true;
  }

  /* ── Bubble actions ─────────────────────────────────── */

  private get bubbleActions(): BubbleActions {
    return {
      onCopy: (text: string) => navigator.clipboard.writeText(text).catch(() => {}),
      onPin: this.pinMessage,
      onUnpin: this.unpinMessage,
      onRegenerate: () => {
        // resend the last user message
        const lastUser = [...this.messages].toReversed().find((m) => m.role === "user");
        if (lastUser) {
          const text = extractText(lastUser);
          void this.onSend(text);
        }
      },
      onEdit: (_index: number, text: string) => {
        this.message = text;
        this.syncTextarea();
      },
    };
  }

  /* ── Token estimate ─────────────────────────────────── */

  private get tokenEstimate(): string | null {
    if (this.message.length < 100) {
      return null;
    }
    const tokens = Math.ceil(this.message.length / 4);
    return `~${tokens} tokens`;
  }

  /* ── Render ─────────────────────────────────────────── */

  override render() {
    const g = this.gateway;
    if (!g) {
      return html`
        <div class="agent-chat"><div class="agent-chat__empty">Connecting...</div></div>
      `;
    }

    const isStreaming = this.streamingRunId !== null;
    const displayMessages = this.searchOpen ? this.filteredMessages : this.messages;
    const pinned = this.pinnedList;
    const hasVoice =
      typeof (window as unknown as Record<string, unknown>).webkitSpeechRecognition !==
        "undefined" ||
      typeof (window as unknown as Record<string, unknown>).SpeechRecognition !== "undefined";

    const placeholder = !g.connected
      ? "Disconnected..."
      : `Message ${this.agent?.name ?? "agent"} (Enter to send)`;

    return html`
      <div class="agent-chat" @drop=${this.handleDrop} @dragover=${this.handleDragOver}>

        <!-- Search overlay -->
        ${
          this.searchOpen
            ? html`
              <div class="agent-chat__search-bar">
                ${icon("search", { className: "icon-xs" })}
                <input
                  type="text"
                  placeholder="Search messages..."
                  .value=${this.searchQuery}
                  @input=${(e: Event) => {
                    this.searchQuery = (e.target as HTMLInputElement).value;
                  }}
                  autofocus
                />
                <button class="btn-ghost" @click=${() => this.toggleSearch()}>
                  ${icon("x", { className: "icon-xs" })}
                </button>
              </div>
            `
            : nothing
        }

        <!-- Pinned messages -->
        ${
          pinned.length > 0
            ? html`
              <div class="agent-chat__pinned">
                <button class="agent-chat__pinned-toggle" @click=${() => {
                  this.pinnedExpanded = !this.pinnedExpanded;
                }}>
                  ${icon("bookmark", { className: "icon-xs" })}
                  ${pinned.length} pinned
                  ${icon(this.pinnedExpanded ? "chevronUp" : "chevronDown", { className: "icon-xs" })}
                </button>
                ${
                  this.pinnedExpanded
                    ? html`
                      <div class="agent-chat__pinned-list">
                        ${pinned.map(
                          ({ index, msg }) => html`
                          <div class="agent-chat__pinned-item">
                            <span class="agent-chat__pinned-role">${msg.role === "user" ? "You" : "Assistant"}</span>
                            <span class="agent-chat__pinned-text">${extractText(msg).slice(0, 100)}${extractText(msg).length > 100 ? "..." : ""}</span>
                            <button class="btn-ghost" @click=${() => this.unpinMessage(index)} title="Unpin">
                              ${icon("x", { className: "icon-xs" })}
                            </button>
                          </div>
                        `,
                        )}
                      </div>
                    `
                    : nothing
                }
              </div>
            `
            : nothing
        }

        <!-- Message thread -->
        <div class="agent-chat__thread" @scroll=${this.handleScroll}>
          ${
            this.loading && this.messages.length === 0
              ? html`
                  <div class="agent-chat__empty">Loading history...</div>
                `
              : nothing
          }

          ${
            displayMessages.length === 0 && !this.loading && !this.searchOpen
              ? this.renderEmptyState()
              : nothing
          }

          ${
            displayMessages.length === 0 && !this.loading && this.searchOpen
              ? html`
                  <div class="agent-chat__empty">No matching messages</div>
                `
              : nothing
          }

          ${displayMessages.map((msg, i) => {
            const isHistoryMsg = i < this.historyCount;
            const showDivider =
              i === this.historyCount && this.historyCount > 0 && i < this.messages.length;
            const isLastAssistant = msg.role === "assistant" && i === displayMessages.length - 1;

            return html`
              ${
                showDivider
                  ? html`
                      <div class="agent-chat__divider"><span>New</span></div>
                    `
                  : nothing
              }
              <chat-bubble
                .message=${msg}
                .index=${i}
                .isHistory=${isHistoryMsg}
                .isLast=${isLastAssistant}
                .isPinned=${this.pinnedMessages.has(i)}
                .modelTag=${msg.role === "assistant" ? modelTag(this.agent?.model) : ""}
                .actions=${this.bubbleActions}
              ></chat-bubble>
            `;
          })}

          ${isStreaming ? this.renderStreamingIndicator() : nothing}

          ${this.errorText ? html`<div class="agent-chat__error">${this.errorText}</div>` : nothing}
        </div>

        <!-- Scroll pill -->
        ${
          this.showScrollPill
            ? html`
              <button class="agent-chat__scroll-pill" @click=${() => this.scrollToBottom()}>
                ${icon("arrowDown", { className: "icon-xs" })}
                New messages
              </button>
            `
            : nothing
        }

        <!-- Input bar -->
        <div class="agent-chat__input">
          ${
            this.slashMenuOpen && this.slashMenuItems.length > 0
              ? html`
                <div class="slash-menu">
                  ${this.slashMenuItems.map(
                    (cmd, i) => html`
                      <div
                        class="slash-menu-item ${i === this.slashMenuIndex ? "slash-menu-item--active" : ""}"
                        @click=${() => this.selectSlashCommand(cmd)}
                        @mouseenter=${() => {
                          this.slashMenuIndex = i;
                        }}
                      >
                        <span class="slash-menu-name">/${cmd.name}</span>
                        ${cmd.args ? html`<span class="slash-menu-args">${cmd.args}</span>` : nothing}
                        <span class="slash-menu-desc">${cmd.description}</span>
                      </div>
                    `,
                  )}
                </div>
              `
              : nothing
          }

          ${
            this.attachments.length > 0
              ? html`
                <div class="chat-attachments-preview">
                  ${this.attachments.map(
                    (att, i) => html`
                      <div class="chat-attachment-thumb">
                        ${
                          att.mimeType.startsWith("image/")
                            ? html`<img src="data:${att.mimeType};base64,${att.content}" alt=${att.fileName} />`
                            : html`<span class="chat-attachment-file">${icon("fileText", { className: "icon-sm" })} ${att.fileName}</span>`
                        }
                        <button class="chat-attachment-remove" @click=${() => this.removeAttachment(i)} title="Remove">&times;</button>
                      </div>
                    `,
                  )}
                </div>
              `
              : nothing
          }

          <input type="file" accept="image/*,.pdf,.txt,.md,.json,.csv" multiple class="agent-chat__file-input" style="display:none" @change=${this.handleFileSelect} />

          <div class="agent-chat__input-row">
            <button class="agent-chat__input-btn" @click=${() => this.triggerFileInput()} title="Attach file" ?disabled=${!g.connected}>
              ${icon("paperclip", { className: "icon-sm" })}
            </button>

            ${
              hasVoice
                ? html`
                  <button class="agent-chat__input-btn ${this.voiceActive ? "agent-chat__input-btn--active" : ""}" @click=${() => this.toggleVoice()} title="Voice input">
                    ${icon(this.voiceActive ? "micOff" : "mic", { className: "icon-sm" })}
                  </button>
                `
                : nothing
            }

            <textarea
              .value=${this.message}
              @input=${this.handleInput}
              @keydown=${this.handleKeyDown}
              @paste=${this.handlePaste}
              placeholder=${placeholder}
              rows="1"
              ?disabled=${!g.connected}
            ></textarea>

            ${
              this.tokenEstimate
                ? html`<span class="agent-chat__token-count">${this.tokenEstimate}</span>`
                : nothing
            }

            <div class="agent-chat__input-actions">
              <button class="btn-ghost" @click=${() => this.toggleSearch()} title="Search (Cmd+F)">
                ${icon("search", { className: "icon-xs" })}
              </button>
              <button class="btn-ghost" @click=${() => this.exportMarkdown()} title="Export" ?disabled=${this.messages.length === 0}>
                ${icon("download", { className: "icon-xs" })}
              </button>
            </div>

            ${
              isStreaming
                ? html`
                  <button class="chat-send-btn chat-send-btn--stop" @click=${() => void this.onAbort()} title="Stop">
                    ${icon("stop")}
                  </button>
                `
                : html`
                  <button
                    class="chat-send-btn"
                    @click=${() => void this.onSend()}
                    ?disabled=${this.submitting || !g.connected || (!this.message.trim() && this.attachments.length === 0)}
                    title="Send"
                  >
                    ${icon("send")}
                  </button>
                `
            }
          </div>
        </div>
      </div>
    `;
  }

  /* ── Empty state ────────────────────────────────────── */

  private renderEmptyState() {
    if (!this.agent) {
      return html`
        <div class="agent-chat__empty">No messages yet.</div>
      `;
    }

    const mt = modelTag(this.agent.model);
    const duties = this.suggestedDuties;
    const expanded = this.expandedDuty;

    return html`
      <div class="agent-chat__welcome">
        <agent-avatar .agent=${this.agent} .size=${64}></agent-avatar>
        <h2>${this.agent.name}</h2>
        <p class="agent-chat__personality">${this.agent.personality}</p>

        <div class="agent-chat__badges">
          ${this.agent.tools.length ? html`<span class="agent-chat__badge">${icon("zap", { className: "icon-xs" })} ${this.agent.tools.length} tools</span>` : nothing}
          ${mt ? html`<span class="agent-chat__badge">${icon("spark", { className: "icon-xs" })} ${mt}</span>` : nothing}
        </div>

        ${
          duties.length > 0 && !expanded
            ? html`
              <div class="agent-chat__prompts">
                ${duties.map(
                  (item) => html`
                    <button
                      class="agent-chat__prompt-card"
                      @click=${() => this.expandDuty(item.duty)}
                    >
                      ${item.prompt}
                    </button>
                  `,
                )}
              </div>
            `
            : nothing
        }

        ${
          expanded
            ? html`
              <div class="agent-chat__outline-panel">
                <h3 class="agent-chat__outline-title">Structured discussion: ${expanded}</h3>
                <textarea
                  class="agent-chat__outline-textarea"
                  .value=${this.outlineDraft}
                  @input=${(e: Event) => {
                    this.outlineDraft = (e.target as HTMLTextAreaElement).value;
                  }}
                  rows="10"
                  placeholder="Edit the outline, then start the discussion."
                ></textarea>
                <div class="agent-chat__outline-actions">
                  <button class="btn-ghost" @click=${() => this.collapseDuty()}>Back</button>
                  <button
                    class="chat-send-btn"
                    @click=${() => this.startDiscussionFromOutline()}
                    ?disabled=${this.submitting || !this.gateway?.connected || !this.outlineDraft.trim()}
                    title="Start discussion"
                  >
                    ${icon("send")}
                    <span>Start discussion</span>
                  </button>
                </div>
              </div>
            `
            : nothing
        }

        ${
          !expanded
            ? html`
                <p class="agent-chat__hint">
                  <kbd>Enter</kbd> to send &middot; <kbd>Shift+Enter</kbd> for newline &middot; <kbd>/</kbd> for
                  commands
                </p>
              `
            : nothing
        }
      </div>
    `;
  }

  /* ── Streaming indicator ────────────────────────────── */

  private renderStreamingIndicator() {
    const elapsed = this.streamElapsed;
    const label = this.streamingReasoning && !this.streamingText ? "Thinking..." : "Writing...";
    const elapsedStr = elapsed > 0 ? `${elapsed}s` : "";

    return html`
      <div class="agent-chat__streaming">
        <div class="agent-chat__streaming-header">
          <agent-avatar .agent=${this.agent} .size=${24}></agent-avatar>
          <span class="agent-chat__streaming-name">${this.agent?.name ?? "Assistant"}</span>
          <span class="agent-chat__streaming-dots"><span></span><span></span><span></span></span>
          <span class="agent-chat__streaming-label">${label}</span>
          ${elapsedStr ? html`<span class="agent-chat__streaming-timer">${elapsedStr}</span>` : nothing}
        </div>

        ${
          this.streamingReasoning
            ? html`
              <div class="reasoning-block reasoning-block--open reasoning-block--streaming">
                <div class="reasoning-block__content">${this.streamingReasoning}</div>
              </div>
            `
            : nothing
        }

        ${
          this.streamingText
            ? html`<div class="agent-chat__streaming-content chat-markdown">${unsafeHTML(renderMarkdown(this.streamingText))}<span class="agent-chat__cursor"></span></div>`
            : nothing
        }
      </div>
    `;
  }
}
