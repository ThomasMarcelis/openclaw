import { consume } from "@lit/context";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { gatewayContext, type GatewayState } from "../context/gateway-context.js";
import { privacyContext, privacyService, type PrivacyState } from "../context/privacy-context.js";
import { parseOverviewSnapshot } from "../controllers/overview.js";
import {
  TAB_GROUPS,
  iconForTab,
  pathForTab,
  titleForTab,
  titleForGroup,
  IMPLEMENTED_TABS,
  type Tab,
  type TabGroup,
} from "../lib/navigation.js";
import { icon } from "./icons.js";

@customElement("sidebar-nav")
export class SidebarNav extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @consume({ context: gatewayContext, subscribe: true })
  gateway!: GatewayState;

  @consume({ context: privacyContext, subscribe: true })
  privacy!: PrivacyState;

  @property({ type: String }) activeTab: Tab = "overview";
  @property({ type: String }) basePath = "";
  @property({ type: Boolean }) collapsed = false;

  @state() private collapsedGroups: Record<string, boolean> = {};

  private toggleGroup(group: TabGroup) {
    this.collapsedGroups = {
      ...this.collapsedGroups,
      [group]: !this.collapsedGroups[group],
    };
  }

  private onTabClick(e: MouseEvent, tab: Tab) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent("tab-change", { detail: tab, bubbles: true, composed: true }),
    );
  }

  private onToggleCollapse() {
    this.dispatchEvent(new CustomEvent("toggle-collapse", { bubbles: true, composed: true }));
  }

  override render() {
    const faviconSrc = this.basePath ? `${this.basePath}/favicon.svg` : "/favicon.svg";
    const version = parseOverviewSnapshot(this.gateway?.hello ?? null).gatewayVersion ?? "";

    return html`
      <aside class="sidebar ${this.collapsed ? "sidebar--collapsed" : ""}">
        <div class="sidebar-header">
          <img class="sidebar-logo" src=${faviconSrc} alt="OpenClaw" width="24" height="24" />
          ${
            !this.collapsed
              ? html`
                  <span class="sidebar-title">OpenClaw</span>
                `
              : nothing
          }
          <button
            class="sidebar-collapse-btn"
            @click=${() => this.onToggleCollapse()}
            title=${this.collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label=${this.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            ${icon(this.collapsed ? "panelLeftOpen" : "panelLeftClose", { className: "icon-sm" })}
          </button>
        </div>

        <nav class="sidebar-nav">
          ${TAB_GROUPS.map((group) => {
            const isGroupCollapsed = this.collapsedGroups[group.label] ?? false;
            const hasActiveTab = group.tabs.some((tab) => tab === this.activeTab);
            const showItems = hasActiveTab || !isGroupCollapsed;

            return html`
              <div class="nav-group ${!showItems ? "nav-group--collapsed" : ""}">
                ${
                  !this.collapsed
                    ? html`
                  <button
                    class="nav-group__label"
                    @click=${() => this.toggleGroup(group.label)}
                    aria-expanded=${showItems}
                  >
                    <span class="nav-group__label-text">${titleForGroup(group.label)}</span>
                    <span class="nav-group__chevron">
                      ${icon(showItems ? "chevronDown" : "chevronRight", { className: "icon-xs" })}
                    </span>
                  </button>
                `
                    : nothing
                }
                <div class="nav-group__items">
                  ${group.tabs.map((tab) => {
                    const isActive = this.activeTab === tab;
                    const isImplemented = IMPLEMENTED_TABS.has(tab);
                    return html`
                      <a
                        href=${pathForTab(tab, this.basePath)}
                        class="nav-item ${isActive ? "nav-item--active" : ""} ${!isImplemented ? "nav-item--placeholder" : ""}"
                        @click=${(e: MouseEvent) => this.onTabClick(e, tab)}
                        title=${titleForTab(tab)}
                      >
                        <span class="nav-item__icon">${icon(iconForTab(tab))}</span>
                        ${!this.collapsed ? html`<span class="nav-item__text">${titleForTab(tab)}</span>` : nothing}
                      </a>
                    `;
                  })}
                </div>
              </div>
            `;
          })}
        </nav>

        <div class="sidebar-footer">
          <button
            class="nav-item nav-item--stream-toggle ${this.privacy?.streamMode ? "nav-item--stream-active" : ""}"
            @click=${() => privacyService.toggle()}
            title=${this.privacy?.streamMode ? "Stream mode ON — click to show data" : "Hide sensitive data"}
          >
            <span class="nav-item__icon">${icon(this.privacy?.streamMode ? "eyeOff" : "eye")}</span>
            ${
              !this.collapsed
                ? html`<span class="nav-item__text">${this.privacy?.streamMode ? "Stream Mode ON" : "Stream Mode"}</span>`
                : nothing
            }
          </button>
          <a
            class="nav-item nav-item--external"
            href="https://docs.openclaw.ai"
            target="_blank"
            rel="noreferrer"
            title="Documentation (opens in new tab)"
          >
            <span class="nav-item__icon">${icon("book")}</span>
            ${
              !this.collapsed
                ? html`
              <span class="nav-item__text">Docs</span>
              <span class="nav-item__external-icon">${icon("externalLink", { className: "icon-xs" })}</span>
            `
                : nothing
            }
          </a>
          ${
            version
              ? html`
            <div class="sidebar-version" title=${`v${version}`}>
              ${
                !this.collapsed
                  ? html`<span class="sidebar-version__text">v${version}</span>`
                  : html`
                      <span class="sidebar-version__dot"></span>
                    `
              }
            </div>
          `
              : nothing
          }
        </div>
      </aside>
    `;
  }
}
