import { html, svg, type TemplateResult } from "lit";

export type IconName =
  | "shield"
  | "link"
  | "refresh"
  | "sun"
  | "moon"
  | "alert"
  | "key"
  | "spark"
  | "activity"
  | "messageSquare"
  | "barChart"
  | "radio"
  | "fileText"
  | "loader"
  | "folder"
  | "zap"
  | "monitor"
  | "settings"
  | "bug"
  | "scrollText"
  | "menu"
  | "book"
  | "chevronDown"
  | "chevronRight"
  | "clock"
  | "server"
  | "externalLink"
  | "layoutGrid"
  | "panelLeftClose"
  | "panelLeftOpen"
  | "send"
  | "stop"
  | "brain"
  | "terminal"
  | "copy"
  | "chevronUp"
  | "paperclip"
  | "bot"
  | "search"
  | "plus"
  | "check"
  | "pin"
  | "pinOff"
  | "download"
  | "edit"
  | "mic"
  | "micOff"
  | "x"
  | "arrowDown"
  | "bookmark"
  | "hammer"
  | "listChecks";

type IconOptions = {
  className?: string;
  title?: string;
};

function wrap(inner: TemplateResult, opts?: IconOptions): TemplateResult {
  return html`
    <svg
      class="icon ${opts?.className ?? ""}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      aria-hidden=${opts?.title ? "false" : "true"}
      role="img"
    >
      ${opts?.title ? html`<title>${opts.title}</title>` : null}
      ${inner}
    </svg>
  `;
}

const ICONS: Record<IconName, (opts?: IconOptions) => TemplateResult> = {
  shield: (opts) =>
    wrap(
      svg`<path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" stroke-linejoin="round"/>`,
      opts,
    ),
  link: (opts) =>
    wrap(
      svg`
        <path d="M10.5 13.5l3-3" stroke-linecap="round"/>
        <path d="M8.2 15.8l-1.8 1.8a3.2 3.2 0 104.5 4.5l1.8-1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15.8 8.2l1.8-1.8a3.2 3.2 0 10-4.5-4.5l-1.8 1.8" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  refresh: (opts) =>
    wrap(
      svg`
        <path d="M20 5v5h-5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 19v-5h5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.7 9.2A7 7 0 0118.8 7M17.3 14.8A7 7 0 015.2 17" stroke-linecap="round"/>
      `,
      opts,
    ),
  sun: (opts) =>
    wrap(
      svg`
        <circle cx="12" cy="12" r="3.4"/>
        <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" stroke-linecap="round"/>
      `,
      opts,
    ),
  moon: (opts) =>
    wrap(
      svg`<path d="M19.2 14.7A8.4 8.4 0 119.3 4.8a6.7 6.7 0 009.9 9.9z" stroke-linejoin="round"/>`,
      opts,
    ),
  alert: (opts) =>
    wrap(
      svg`
        <path d="M12 3l9 16H3L12 3z" stroke-linejoin="round"/>
        <path d="M12 9v4.8" stroke-linecap="round"/>
        <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/>
      `,
      opts,
    ),
  key: (opts) =>
    wrap(
      svg`
        <circle cx="8" cy="12" r="3"/>
        <path d="M11 12h10M17 12v2M20 12v2" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  spark: (opts) =>
    wrap(
      svg`<path d="M12 2l1.8 4.8L19 8.6l-4 3.1 1.2 5.3L12 14.2 7.8 17l1.2-5.3-4-3.1 5.2-1.8L12 2z" stroke-width="1.5" stroke-linejoin="round"/>`,
      opts,
    ),
  activity: (opts) =>
    wrap(
      svg`<path d="M3 12h4l2-4 4 8 2-4h6" stroke-linecap="round" stroke-linejoin="round"/>`,
      opts,
    ),
  messageSquare: (opts) =>
    wrap(
      svg`<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/>`,
      opts,
    ),
  barChart: (opts) =>
    wrap(
      svg`<path d="M18 20V10M12 20V4M6 20v-6" stroke-linecap="round" stroke-linejoin="round"/>`,
      opts,
    ),
  radio: (opts) =>
    wrap(
      svg`
        <circle cx="12" cy="12" r="2"/>
        <path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49" stroke-linecap="round"/>
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 19.07a10 10 0 010-14.14" stroke-linecap="round"/>
      `,
      opts,
    ),
  fileText: (opts) =>
    wrap(
      svg`
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linejoin="round"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  loader: (opts) =>
    wrap(
      svg`<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke-linecap="round"/>`,
      opts,
    ),
  folder: (opts) =>
    wrap(
      svg`<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke-linejoin="round"/>`,
      opts,
    ),
  zap: (opts) =>
    wrap(
      svg`<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linejoin="round" stroke-linecap="round"/>`,
      opts,
    ),
  monitor: (opts) =>
    wrap(
      svg`
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  settings: (opts) =>
    wrap(
      svg`
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke-linejoin="round"/>
      `,
      opts,
    ),
  bug: (opts) =>
    wrap(
      svg`
        <path d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 7.13v-1a3 3 0 116 0v1" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0112 0v3c0 3.3-2.7 6-6 6z"/>
        <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17l-4 1M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h4M18 17l4 1" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  scrollText: (opts) =>
    wrap(
      svg`
        <path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 00-2-2H2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19 17V5a2 2 0 00-2-2H4a2 2 0 012 2v14" stroke-linejoin="round"/>
        <path d="M10 9h6M10 13h4" stroke-linecap="round"/>
      `,
      opts,
    ),
  menu: (opts) => wrap(svg`<path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/>`, opts),
  book: (opts) =>
    wrap(
      svg`
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke-linejoin="round"/>
      `,
      opts,
    ),
  chevronDown: (opts) =>
    wrap(svg`<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>`, opts),
  chevronRight: (opts) =>
    wrap(svg`<path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>`, opts),
  clock: (opts) =>
    wrap(
      svg`
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  server: (opts) =>
    wrap(
      svg`
        <rect x="2" y="2" width="20" height="8" rx="2"/>
        <rect x="2" y="14" width="20" height="8" rx="2"/>
        <path d="M6 6h.01M6 18h.01" stroke-width="2" stroke-linecap="round"/>
      `,
      opts,
    ),
  externalLink: (opts) =>
    wrap(
      svg`
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15 3h6v6M10 14L21 3" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  layoutGrid: (opts) =>
    wrap(
      svg`
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      `,
      opts,
    ),
  panelLeftClose: (opts) =>
    wrap(
      svg`
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18" stroke-linecap="round"/>
        <path d="M16 10l-3 2 3 2" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  panelLeftOpen: (opts) =>
    wrap(
      svg`
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18" stroke-linecap="round"/>
        <path d="M14 10l3 2-3 2" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  send: (opts) =>
    wrap(
      svg`<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round"/>`,
      opts,
    ),
  stop: (opts) =>
    wrap(
      svg`<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>`,
      opts,
    ),
  brain: (opts) =>
    wrap(
      svg`
        <path d="M12 2a5 5 0 00-4.78 3.5A4 4 0 004 9.5a4 4 0 001.1 2.75A4.5 4.5 0 004 15a4.5 4.5 0 003.53 4.39A3.5 3.5 0 0011 22h2a3.5 3.5 0 003.47-2.61A4.5 4.5 0 0020 15a4.5 4.5 0 00-1.1-2.75A4 4 0 0020 9.5a4 4 0 00-3.22-3.93A5 5 0 0012 2z" stroke-linejoin="round"/>
        <path d="M12 2v20" stroke-linecap="round"/>
      `,
      opts,
    ),
  terminal: (opts) =>
    wrap(
      svg`
        <path d="M4 17l6-5-6-5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 19h8" stroke-linecap="round"/>
      `,
      opts,
    ),
  copy: (opts) =>
    wrap(
      svg`
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  chevronUp: (opts) =>
    wrap(svg`<path d="M18 15l-6-6-6 6" stroke-linecap="round" stroke-linejoin="round"/>`, opts),
  paperclip: (opts) =>
    wrap(
      svg`<path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke-linecap="round" stroke-linejoin="round"/>`,
      opts,
    ),
  bot: (opts) =>
    wrap(
      svg`
        <path d="M12 8V4H8" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="4" y="8" width="16" height="12" rx="2"/>
        <path d="M2 14h2M20 14h2" stroke-linecap="round"/>
        <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/>
      `,
      opts,
    ),
  search: (opts) =>
    wrap(
      svg`
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35" stroke-linecap="round"/>
      `,
      opts,
    ),
  plus: (opts) => wrap(svg`<path d="M12 5v14M5 12h14" stroke-linecap="round"/>`, opts),
  check: (opts) =>
    wrap(svg`<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>`, opts),
  pin: (opts) =>
    wrap(
      svg`
        <path d="M12 17v5" stroke-linecap="round"/>
        <path d="M5 17h14" stroke-linecap="round"/>
        <path d="M15 3.5L9 9l-1.5 6L14 11.5l5.5-2.5L15 3.5z" stroke-linejoin="round"/>
      `,
      opts,
    ),
  pinOff: (opts) =>
    wrap(
      svg`
        <path d="M12 17v5" stroke-linecap="round"/>
        <path d="M5 17h14" stroke-linecap="round"/>
        <path d="M15 3.5L9 9l-1.5 6L14 11.5l5.5-2.5L15 3.5z" stroke-linejoin="round"/>
        <path d="M2 2l20 20" stroke-linecap="round"/>
      `,
      opts,
    ),
  download: (opts) =>
    wrap(
      svg`
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 10l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 15V3" stroke-linecap="round"/>
      `,
      opts,
    ),
  edit: (opts) =>
    wrap(
      svg`
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linejoin="round"/>
      `,
      opts,
    ),
  mic: (opts) =>
    wrap(
      svg`
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
        <path d="M19 10v2a7 7 0 01-14 0v-2" stroke-linecap="round"/>
        <path d="M12 19v4M8 23h8" stroke-linecap="round"/>
      `,
      opts,
    ),
  micOff: (opts) =>
    wrap(
      svg`
        <path d="M1 1l22 22" stroke-linecap="round"/>
        <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke-linecap="round"/>
        <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .87-.16 1.71-.46 2.49" stroke-linecap="round"/>
        <path d="M12 19v4M8 23h8" stroke-linecap="round"/>
      `,
      opts,
    ),
  x: (opts) => wrap(svg`<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>`, opts),
  arrowDown: (opts) =>
    wrap(
      svg`
        <path d="M12 5v14" stroke-linecap="round"/>
        <path d="M19 12l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/>
      `,
      opts,
    ),
  bookmark: (opts) =>
    wrap(
      svg`<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke-linejoin="round"/>`,
      opts,
    ),
  hammer: (opts) =>
    wrap(
      svg`
        <path d="M15 12l-8.5 8.5a2.12 2.12 0 01-3-3L12 9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17.64 2.36a2.12 2.12 0 013 3L14 12l-3-3 6.64-6.64z" stroke-linejoin="round"/>
      `,
      opts,
    ),
  listChecks: (opts) =>
    wrap(
      svg`
        <path d="M10 6h11M10 12h11M10 18h11" stroke-linecap="round"/>
        <path d="M3 6l2 2 4-4M3 18l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 12h4" stroke-linecap="round"/>
      `,
      opts,
    ),
};

export function icon(name: IconName, opts?: IconOptions): TemplateResult {
  return ICONS[name](opts);
}
