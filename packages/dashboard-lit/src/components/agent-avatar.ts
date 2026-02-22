import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { AgentProfile } from "../lib/agent-profiles.js";

const PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function agentColor(agent: { id: string; avatarColor?: string }): string {
  if (agent.avatarColor) {
    return agent.avatarColor;
  }
  return PALETTE[hashString(agent.id) % PALETTE.length];
}

@customElement("agent-avatar")
export class AgentAvatar extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: 600;
      text-transform: uppercase;
      user-select: none;
      line-height: 1;
    }
  `;

  @property({ type: Object }) agent!: AgentProfile;
  @property({ type: Number }) size = 32;

  override render() {
    if (!this.agent) {
      return html``;
    }
    const color = agentColor(this.agent);
    const initial = this.agent.name.charAt(0);
    const fontSize = Math.round(this.size * 0.44);
    return html`
      <div
        class="avatar"
        style="
          width: ${this.size}px;
          height: ${this.size}px;
          font-size: ${fontSize}px;
          background: ${color}20;
          color: ${color};
        "
      >${initial}</div>
    `;
  }
}
