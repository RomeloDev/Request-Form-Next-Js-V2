import type { ReactNode, SVGProps } from "react";

const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="4" rx="1.5" /><rect x="14" y="11" width="7" height="10" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /><circle cx="9" cy="7" r="4" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a21 21 0 0 0 18 0M10 12v3h4v-3" /></>,
  building: <><path d="M4 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M2 21h20M8 7h2M14 7h0M8 11h2M14 11h0M9 21v-5h4v5" /></>,
  userCheck: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2m0-11 2 2 4-4" /></>,
  team: <><circle cx="12" cy="6" r="3" /><path d="M6 21v-3a6 6 0 0 1 12 0v3M4 7a3 3 0 0 0 0 6M20 7a3 3 0 0 1 0 6M1 21v-2a5 5 0 0 1 3-4.6M23 21v-2a5 5 0 0 0-3-4.6" /></>,
  location: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  contact: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="9" r="2.5" /><path d="M8 17a4 4 0 0 1 8 0M2 7h3M2 12h3M2 17h3" /></>,
  feedback: <><path d="M21 11a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8" transform="translate(0 -3)" /><path d="M8 9h8M8 13h5" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  chart: <><path d="M4 3v18h17M9 16v-5M14 16V7M19 16v-8" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M8 12h8M8 16h5" /></>,
  filePlus: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M12 12v6M9 15h6" /></>,
  clipboard: <><rect x="7" y="2" width="10" height="4" rx="1" /><path d="M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2m-9 9 3 3 5-6" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5M21 12H9" /></>,
  profile: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="3" /><path d="M5.5 18a7 7 0 0 1 13 0" /></>,
  settings: <><path d="m9 3-.7 2.1-2 .9-2-.4-2 3.4 1.4 1.7v2.6L2.3 15l2 3.4 2-.4 2 .9L9 21h4l.7-2.1 2-.9 2 .4 2-3.4-1.4-1.7v-2.6L19.7 9l-2-3.4-2 .4-2-.9L13 3H9Z" /><circle cx="11" cy="12" r="3" /></>,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  firstPage: <><path d="M5 5v14m13-13-6 6 6 6" /></>,
  lastPage: <><path d="M19 5v14M6 6l6 6-6 6" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 6.1A8 8 0 0 1 20 12M17.9 17.9A8 8 0 0 1 4 12" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  pencil: <><path d="m16 3 5 5M4 20l4-1L21 6a2.1 2.1 0 0 0-5-3L3 16l-1 6 6-2Z" /></>,
  trash: <><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7" /></>,
  shieldCheck: <><path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z" /><path d="m8 12 3 3 5-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  xCircle: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
  progress: <><path d="M12 3a9 9 0 1 1-9 9M3 3v6h6M3 9a9 9 0 0 1 4-4.5" /><path d="M12 7v5l3 2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export default function Icon({ name, className = "size-5", ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`} {...props}>{paths[name]}</svg>;
}
