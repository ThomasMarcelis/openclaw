type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export type ChatContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

export type ChatMessage = {
  role: "user" | "assistant" | "tool";
  content: ChatContentBlock[] | string;
  timestamp?: number;
  toolCallId?: string;
  toolName?: string;
  stopReason?: string;
};

export type ChatHistoryResult = {
  sessionKey: string;
  sessionId?: string;
  messages: ChatMessage[];
  thinkingLevel?: string;
  verboseLevel?: string;
};

export type ChatSendResult = {
  runId: string;
  status: "started" | "ok" | "error" | "in_flight";
  summary?: string;
};

export type ChatAbortResult = {
  ok: true;
  aborted: boolean;
  runIds: string[];
};

export type ChatAttachment = {
  mimeType: string;
  fileName: string;
  content: string; // base64
};

export async function loadHistory(
  request: GatewayRequest,
  sessionKey: string,
  limit = 200,
): Promise<ChatHistoryResult> {
  const result = await request<ChatHistoryResult>("chat.history", {
    sessionKey,
    limit,
  });
  return result ?? { sessionKey, messages: [] };
}

export async function sendMessage(
  request: GatewayRequest,
  sessionKey: string,
  message: string,
  attachments?: ChatAttachment[],
): Promise<ChatSendResult> {
  const idempotencyKey = `dash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return request<ChatSendResult>("chat.send", {
    sessionKey,
    message,
    idempotencyKey,
    ...(attachments?.length ? { attachments } : {}),
  });
}

export async function abortRun(
  request: GatewayRequest,
  sessionKey: string,
  runId?: string,
): Promise<ChatAbortResult> {
  return request<ChatAbortResult>("chat.abort", { sessionKey, runId });
}

/** Extract plain text from a message's content (which may be a string or block array). */
export function extractText(msg: ChatMessage): string {
  if (typeof msg.content === "string") {
    return msg.content;
  }
  return msg.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Extract thinking blocks from a message. */
export function extractThinking(msg: ChatMessage): string[] {
  if (typeof msg.content === "string") {
    return [];
  }
  return msg.content
    .filter((b): b is { type: "thinking"; thinking: string } => b.type === "thinking")
    .map((b) => b.thinking);
}

/** Extract tool-use blocks from an assistant message. */
export function extractToolUses(
  msg: ChatMessage,
): Array<{ id: string; name: string; input: unknown }> {
  if (typeof msg.content === "string") {
    return [];
  }
  return msg.content.filter(
    (b): b is { type: "tool_use"; id: string; name: string; input: unknown } =>
      b.type === "tool_use",
  );
}

/** Extract tool-result blocks from a tool message. */
export function extractToolResults(
  msg: ChatMessage,
): Array<{ toolUseId: string; content: string }> {
  if (typeof msg.content === "string") {
    return [];
  }
  return msg.content
    .filter(
      (b): b is { type: "tool_result"; tool_use_id: string; content: string } =>
        b.type === "tool_result",
    )
    .map((b) => ({ toolUseId: b.tool_use_id, content: b.content }));
}

export async function updateSession(
  request: GatewayRequest,
  sessionKey: string,
  model: string,
): Promise<void> {
  await request("sessions.update", { sessionKey, model });
}

/** Format a session key into a human-readable display name. */
export function formatSessionName(key: string): string {
  if (!key || key === "main" || key === "agent:main:main") {
    return "Main";
  }
  const channelMatch = key.match(/^(\w+):(.+)/);
  if (channelMatch) {
    const channel = channelMatch[1].charAt(0).toUpperCase() + channelMatch[1].slice(1);
    return `${channel} · ${channelMatch[2]}`;
  }
  return key;
}
