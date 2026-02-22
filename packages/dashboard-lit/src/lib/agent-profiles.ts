export interface AgentProfile {
  id: string;
  name: string;
  personality: string;
  duties: string[];
  tools: string[];
  skills: string[];
  model?: string;
  thinkingLevel?: string;
  avatarColor?: string;
  isTaskRunner?: boolean;
  isAgentBuilder?: boolean;
  isRetrospective?: boolean;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

const now = () => new Date().toISOString();

export const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: "nova",
    name: "Nova",
    personality:
      "Friendly, knowledgeable general assistant. Excels at conversation, brainstorming, and everyday tasks.",
    duties: ["Answer questions", "Brainstorm ideas", "Draft content", "Explain concepts"],
    tools: ["web_search", "calculator", "file_read"],
    skills: ["general-knowledge", "writing"],
    model: "claude-sonnet",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "code-agent",
    name: "Code Agent",
    personality:
      "Expert software engineer. Writes clean, well-tested code and explains technical concepts clearly.",
    duties: ["Write code", "Debug issues", "Review pull requests", "Explain architecture"],
    tools: ["file_read", "file_write", "terminal", "web_search"],
    skills: ["coding", "debugging", "architecture"],
    model: "claude-sonnet",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "research-agent",
    name: "Research Agent",
    personality:
      "Thorough researcher who digs deep into topics. Provides well-sourced, comprehensive analysis.",
    duties: ["Research topics", "Analyze data", "Summarize findings", "Compare alternatives"],
    tools: ["web_search", "file_read", "calculator"],
    skills: ["research", "analysis"],
    model: "claude-sonnet",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "agent-builder",
    name: "Agent Builder",
    personality:
      "Meta-agent that helps design and create new agents with appropriate skills, tools, and personalities.",
    duties: ["Design agent profiles", "Configure tools", "Set up skills", "Test agent behavior"],
    tools: ["file_read", "file_write", "web_search"],
    skills: ["agent-design", "prompt-engineering"],
    model: "claude-sonnet",
    isAgentBuilder: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "task-runner",
    name: "Task Runner",
    personality:
      "Operations-focused agent that executes multi-step tasks reliably and reports progress clearly.",
    duties: ["Execute task lists", "Monitor progress", "Report status", "Handle errors"],
    tools: ["terminal", "file_read", "file_write", "web_search"],
    skills: ["task-management", "automation"],
    model: "claude-sonnet",
    isTaskRunner: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "workflow-agent",
    name: "Workflow Agent",
    personality: "Orchestrates complex workflows across multiple agents.",
    duties: ["Coordinate agents", "Manage workflows", "Route tasks"],
    tools: ["terminal", "file_read"],
    skills: ["orchestration"],
    model: "claude-sonnet",
    isHidden: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "retrospective-agent",
    name: "Retrospective Agent",
    personality:
      "Analytical agent that reviews past interactions and identifies patterns, improvements, and insights.",
    duties: [
      "Analyze conversations",
      "Identify patterns",
      "Suggest improvements",
      "Generate reports",
    ],
    tools: ["file_read", "web_search"],
    skills: ["analysis", "reporting"],
    model: "claude-sonnet",
    isRetrospective: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "marketing-agent",
    name: "Marketing Agent",
    personality:
      "Creative content strategist who crafts compelling copy, campaigns, and brand messaging.",
    duties: ["Write copy", "Plan campaigns", "Analyze audience", "Create content calendars"],
    tools: ["web_search", "file_read", "file_write"],
    skills: ["copywriting", "marketing-strategy"],
    model: "claude-sonnet",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "vibes-checker",
    name: "Vibes Checker",
    personality:
      "Brand and tone analyst who evaluates content for consistency, vibe, and audience fit.",
    duties: ["Review tone", "Check brand alignment", "Evaluate messaging", "Score content vibes"],
    tools: ["web_search", "file_read"],
    skills: ["brand-analysis", "tone-evaluation"],
    model: "claude-sonnet",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
];

const STORAGE_KEY = "claw-dash:agent-profiles:v1";

function isValidProfile(o: unknown): o is AgentProfile {
  if (!o || typeof o !== "object") {
    return false;
  }
  const p = o as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.personality === "string" &&
    Array.isArray(p.duties) &&
    Array.isArray(p.tools) &&
    Array.isArray(p.skills) &&
    typeof p.createdAt === "string" &&
    typeof p.updatedAt === "string"
  );
}

function loadFromStorage(): AgentProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidProfile);
  } catch {
    return [];
  }
}

function saveToStorage(profiles: AgentProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

/** Merge stored profiles with defaults so new defaults are seeded automatically. */
function mergeWithDefaults(stored: AgentProfile[]): AgentProfile[] {
  const byId = new Map(stored.map((p) => [p.id, p]));
  for (const def of DEFAULT_AGENTS) {
    if (!byId.has(def.id)) {
      byId.set(def.id, def);
    }
  }
  const order = DEFAULT_AGENTS.map((d) => d.id);
  const sorted = [...byId.values()].toSorted((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai >= 0 && bi >= 0) {
      return ai - bi;
    }
    if (ai >= 0) {
      return -1;
    }
    if (bi >= 0) {
      return 1;
    }
    return 0;
  });
  return sorted;
}

export type AgentStoreListener = () => void;

export class AgentProfileStore {
  private _agents: AgentProfile[] = [];
  private _selectedId: string | null = null;
  private _listeners = new Set<AgentStoreListener>();
  private _storageHandler: ((e: StorageEvent) => void) | null = null;

  get agents(): AgentProfile[] {
    return this._agents;
  }

  get visibleAgents(): AgentProfile[] {
    return this._agents.filter((a) => !a.isHidden);
  }

  get selectedId(): string | null {
    return this._selectedId;
  }

  get selectedAgent(): AgentProfile | null {
    if (!this._selectedId) {
      return null;
    }
    return this._agents.find((a) => a.id === this._selectedId) ?? null;
  }

  constructor() {
    this.load();
  }

  subscribe(fn: AgentStoreListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }

  private load(): void {
    const stored = loadFromStorage();
    this._agents = mergeWithDefaults(stored);
    saveToStorage(this._agents);
    if (!this._selectedId) {
      const first = this.visibleAgents[0];
      if (first) {
        this._selectedId = first.id;
      }
    }
  }

  startSync(): void {
    if (this._storageHandler) {
      return;
    }
    this._storageHandler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) {
        return;
      }
      this.load();
      this.notify();
    };
    window.addEventListener("storage", this._storageHandler);
  }

  stopSync(): void {
    if (this._storageHandler) {
      window.removeEventListener("storage", this._storageHandler);
      this._storageHandler = null;
    }
  }

  selectAgent(id: string): void {
    if (this._agents.some((a) => a.id === id)) {
      this._selectedId = id;
      this.notify();
    }
  }

  createAgent(partial: Partial<AgentProfile> & { name: string }): AgentProfile {
    const id = partial.id ?? `agent-${Date.now().toString(36)}`;
    const profile: AgentProfile = {
      id,
      name: partial.name,
      personality: partial.personality ?? "",
      duties: partial.duties ?? [],
      tools: partial.tools ?? [],
      skills: partial.skills ?? [],
      model: partial.model,
      thinkingLevel: partial.thinkingLevel,
      avatarColor: partial.avatarColor,
      isTaskRunner: partial.isTaskRunner,
      isAgentBuilder: partial.isAgentBuilder,
      isRetrospective: partial.isRetrospective,
      createdAt: now(),
      updatedAt: now(),
    };
    this._agents = [...this._agents, profile];
    saveToStorage(this._agents);
    this.notify();
    return profile;
  }

  updateAgent(id: string, patch: Partial<AgentProfile>): void {
    this._agents = this._agents.map((a) =>
      a.id === id ? { ...a, ...patch, id: a.id, updatedAt: now() } : a,
    );
    saveToStorage(this._agents);
    this.notify();
  }

  deleteAgent(id: string): void {
    const isDefault = DEFAULT_AGENTS.some((d) => d.id === id);
    if (isDefault) {
      return;
    }
    this._agents = this._agents.filter((a) => a.id !== id);
    if (this._selectedId === id) {
      this._selectedId = this.visibleAgents[0]?.id ?? null;
    }
    saveToStorage(this._agents);
    this.notify();
  }
}
