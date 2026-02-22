import { createContext } from "@lit/context";
import type { AgentProfileStore } from "../lib/agent-profiles.js";

export const agentContext = createContext<AgentProfileStore>("agent-profiles");
