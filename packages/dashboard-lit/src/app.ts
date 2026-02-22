import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { icon, type IconName } from "./components/icons.js";
import "./components/connection-status.js";
import {
  normalizeBasePath,
  pathForTab,
  tabFromPath,
  titleForTab,
  type Tab,
} from "./lib/navigation.js";
import "./components/gateway-provider.js";
import "./components/sidebar-nav.js";
import "./components/agent-profile-provider.js";
import "./components/agent-panel.js";
import "./views/overview-view.js";
import "./views/chat-view.js";
import "./views/placeholder-view.js";

declare global {
  interface Window {
    __OPENCLAW_CONTROL_UI_BASE_PATH__?: string;
  }
}

type ThemeMode = "landingTheme" | "light" | "docsTheme";
const THEME_KEY = "openclaw.dashboard.theme";

type ThemeOption = { id: ThemeMode; label: string; icon: string };
const THEME_OPTIONS: ThemeOption[] = [
  { id: "landingTheme", label: "Landing theme", icon: "layoutGrid" },
  { id: "light", label: "Light theme", icon: "sun" },
  { id: "docsTheme", label: "Docs theme", icon: "moon" },
];
const NAV_COLLAPSED_KEY = "openclaw.dashboard.navCollapsed";

function resolveBasePath(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const overrideBase = window.__OPENCLAW_CONTROL_UI_BASE_PATH__;
  if (overrideBase !== undefined && overrideBase !== null) {
    return normalizeBasePath(String(overrideBase));
  }
  const viteBase = String(import.meta.env?.BASE_URL ?? "").trim();
  if (!viteBase || viteBase === "/" || viteBase === "." || viteBase === "./") {
    return "";
  }
  return normalizeBasePath(viteBase);
}

@customElement("dashboard-app")
export class DashboardApp extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @state() tab: Tab = "overview";
  @state() basePath = "";
  @state() theme: ThemeMode = "docsTheme";
  @state() navCollapsed = false;
  @state() private isMobile = false;
  /** Button order — only updates when the toggle collapses, so the active
   *  button doesn't jump while the picker is still open. */
  @state() private themeOrder: ThemeMode[] = ["docsTheme", "landingTheme", "light"];

  /* ── Lifecycle ───────────────────────────────────── */

  override connectedCallback(): void {
    super.connectedCallback();
    this.basePath = resolveBasePath();
    this.syncTabFromUrl();
    this.initTheme();
    this.navCollapsed = localStorage.getItem(NAV_COLLAPSED_KEY) === "true";
    this.isMobile = window.innerWidth < 768;
    window.addEventListener("popstate", this.handlePopState);
    window.addEventListener("resize", this.handleResize);
  }

  override disconnectedCallback(): void {
    window.removeEventListener("popstate", this.handlePopState);
    window.removeEventListener("resize", this.handleResize);
    super.disconnectedCallback();
  }

  /* ── Routing ─────────────────────────────────────── */

  private handlePopState = (): void => {
    this.syncTabFromUrl();
  };

  private syncTabFromUrl(): void {
    const tab = tabFromPath(window.location.pathname, this.basePath);
    if (tab) {
      this.tab = tab;
    }
  }

  private setTab(tab: Tab): void {
    if (this.tab === tab) {
      return;
    }
    this.tab = tab;
    const path = pathForTab(tab, this.basePath);
    window.history.pushState({}, "", path);
  }

  private handleTabChange = (e: CustomEvent<Tab>): void => {
    this.setTab(e.detail);
    this.scrollToContent(true);
  };

  /* ── Sidebar ─────────────────────────────────────── */

  override firstUpdated(): void {
    if (this.isMobile) {
      this.scrollToContent();
    }
  }

  private scrollToContent(smooth = false): void {
    if (!this.isMobile) {
      return;
    }
    const shell = this.querySelector(".shell");
    if (!shell) {
      return;
    }
    shell.scrollTo({ left: shell.scrollWidth, behavior: smooth ? "smooth" : "instant" });
  }

  private toggleNav(): void {
    if (this.isMobile) {
      this.scrollToContent(true);
      return;
    }
    this.navCollapsed = !this.navCollapsed;
    localStorage.setItem(NAV_COLLAPSED_KEY, String(this.navCollapsed));
  }

  private handleResize = (): void => {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile && !wasMobile) {
      requestAnimationFrame(() => this.scrollToContent());
    }
  };

  /* ── Theme ───────────────────────────────────────── */

  private initTheme(): void {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "landingTheme" || saved === "light" || saved === "docsTheme") {
      this.theme = saved;
    } else {
      this.theme = "docsTheme";
    }
    this.themeOrder = this.buildThemeOrder(this.theme);
    this.applyTheme(this.theme);
  }

  private setTheme(next: ThemeMode): void {
    this.theme = next;
    localStorage.setItem(THEME_KEY, next);
    this.applyTheme(next);
    // Don't update themeOrder here — wait until the toggle collapses
  }

  /** Reorder: active first, then the rest in their natural order. */
  private buildThemeOrder(active: ThemeMode): ThemeMode[] {
    const rest = THEME_OPTIONS.map((o) => o.id).filter((id) => id !== active);
    return [active, ...rest];
  }

  /** Called when the theme toggle loses hover/focus (collapses).
   *  Reorders buttons so the active one is in the visible slot. */
  private handleThemeToggleCollapse = (): void => {
    // Small delay so the collapse animation starts before reorder
    setTimeout(() => {
      this.themeOrder = this.buildThemeOrder(this.theme);
    }, 80);
  };

  private applyTheme(theme: ThemeMode): void {
    document.documentElement.setAttribute("data-theme", theme);
  }

  /* ── View routing ────────────────────────────────── */

  private renderMainContent() {
    switch (this.tab) {
      case "overview":
        return html`
          <overview-view></overview-view>
        `;
      case "chat":
        return html`
          <agent-panel mode="fullpage"></agent-panel>
        `;
      default:
        return html`<placeholder-view .tab=${this.tab}></placeholder-view>`;
    }
  }

  /* ── Render ──────────────────────────────────────── */

  override render() {
    const isChat = this.tab === "chat";

    return html`
      <agent-profile-provider>
      <gateway-provider>
        <div class="shell ${this.navCollapsed ? "shell--nav-collapsed" : ""} ${isChat ? "shell--chat" : ""}">

          <!-- ─── Topbar ───────────────────────────── -->
          <header class="topbar">
            <div class="topbar-left">
              <div class="page-title">${titleForTab(this.tab)}</div>
            </div>
            <div class="topbar-status">
              <connection-status></connection-status>
              <div
                class="theme-toggle"
                @mouseleave=${this.handleThemeToggleCollapse}
                @focusout=${(e: FocusEvent) => {
                  const toggle = e.currentTarget as HTMLElement;
                  // Only collapse if focus left the toggle entirely
                  requestAnimationFrame(() => {
                    if (!toggle.contains(document.activeElement)) {
                      this.handleThemeToggleCollapse();
                    }
                  });
                }}
              >
                ${this.themeOrder.map((id) => {
                  const opt = THEME_OPTIONS.find((o) => o.id === id)!;
                  return html`
                    <button
                      class="theme-btn ${this.theme === id ? "active" : ""}"
                      @click=${() => this.setTheme(id)}
                      aria-pressed=${this.theme === id}
                      title=${opt.label}
                    >
                      ${icon(opt.icon as IconName, { className: "icon-xs" })}
                    </button>
                  `;
                })}
              </div>
            </div>
          </header>

          <!-- ─── Sidebar ──────────────────────────── -->
          <sidebar-nav
            .activeTab=${this.tab}
            .basePath=${this.basePath}
            .collapsed=${this.navCollapsed && !this.isMobile}

            @tab-change=${this.handleTabChange}
            @toggle-collapse=${() => this.toggleNav()}
          ></sidebar-nav>

          <!-- ─── Main Content ─────────────────────── -->
          <main class="content ${isChat ? "content--chat" : ""}">

            ${this.renderMainContent()}
          </main>
        </div>
      </gateway-provider>
      </agent-profile-provider>
    `;
  }
}
