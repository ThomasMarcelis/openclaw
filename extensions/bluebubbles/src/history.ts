import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { resolveBlueBubblesServerAccount } from "./account-resolve.js";
import { blueBubblesFetchWithTimeout, buildBlueBubblesApiUrl } from "./types.js";

export type BlueBubblesHistoryEntry = {
  sender: string;
  body: string;
  timestamp?: number;
  messageId?: string;
};

export type BlueBubblesMessageData = {
  guid?: string;
  text?: string;
  handle_id?: string;
  is_from_me?: boolean;
  date_created?: number;
  date_delivered?: number;
  associated_message_guid?: string;
  sender?: {
    address?: string;
    display_name?: string;
  };
};

export type BlueBubblesChatOpts = {
  serverUrl?: string;
  password?: string;
  accountId?: string;
  timeoutMs?: number;
  cfg?: OpenClawConfig;
};

function resolveAccount(params: BlueBubblesChatOpts) {
  return resolveBlueBubblesServerAccount(params);
}

/**
 * Fetch message history from BlueBubbles API for a specific chat.
 * This provides the initial backfill for both group chats and DMs.
 */
export async function fetchBlueBubblesHistory(
  chatIdentifier: string,
  limit: number,
  opts: BlueBubblesChatOpts = {},
): Promise<BlueBubblesHistoryEntry[]> {
  if (!chatIdentifier.trim() || limit <= 0) {
    return [];
  }

  const { baseUrl, password, accountId } = resolveAccount(opts);
  if (!baseUrl || !password) {
    return [];
  }

  // Try different common API patterns for fetching messages
  const possiblePaths = [
    `/api/v1/chat/${encodeURIComponent(chatIdentifier)}/messages?limit=${limit}&sort=DESC`,
    `/api/v1/messages?chatGuid=${encodeURIComponent(chatIdentifier)}&limit=${limit}`,
    `/api/v1/chat/${encodeURIComponent(chatIdentifier)}/message?limit=${limit}`,
  ];

  for (const path of possiblePaths) {
    try {
      const url = buildBlueBubblesApiUrl({ baseUrl, path, password });
      const res = await blueBubblesFetchWithTimeout(
        url,
        { method: "GET" },
        opts.timeoutMs ?? 10000,
      );

      if (!res.ok) {
        continue; // Try next path
      }

      const data = await res.json().catch(() => null);
      if (!data) {
        continue;
      }

      // Handle different response structures
      let messages: unknown[] = [];
      if (Array.isArray(data)) {
        messages = data;
      } else if (data.data && Array.isArray(data.data)) {
        messages = data.data;
      } else if (data.messages && Array.isArray(data.messages)) {
        messages = data.messages;
      } else {
        continue;
      }

      const historyEntries: BlueBubblesHistoryEntry[] = [];

      for (const item of messages) {
        const msg = item as BlueBubblesMessageData;

        // Skip messages without text content
        const text = msg.text?.trim();
        if (!text) {
          continue;
        }

        // Skip from-me messages to avoid duplication
        if (msg.is_from_me) {
          continue;
        }

        const sender =
          msg.sender?.display_name || msg.sender?.address || msg.handle_id || "Unknown";
        const timestamp = msg.date_created || msg.date_delivered;

        historyEntries.push({
          sender,
          body: text,
          timestamp,
          messageId: msg.guid,
        });
      }

      // Sort by timestamp (oldest first for context)
      historyEntries.sort((a, b) => {
        const aTime = a.timestamp || 0;
        const bTime = b.timestamp || 0;
        return aTime - bTime;
      });

      return historyEntries.slice(0, limit); // Ensure we don't exceed the requested limit
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  // If none of the API paths worked, return empty history
  return [];
}

/**
 * Build inbound history array for finalizeInboundContext from history entries.
 */
export function buildInboundHistoryFromEntries(
  entries: BlueBubblesHistoryEntry[],
): Array<{ sender: string; body: string; timestamp?: number }> {
  return entries.map((entry) => ({
    sender: entry.sender,
    body: entry.body,
    timestamp: entry.timestamp,
  }));
}
