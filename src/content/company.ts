import { site } from "./site";

/**
 * About-page structure. Every visible string lives in the About messages (src/messages/pages/about/*.json, namespace
 * `aboutPage`) under the same ids, so the three locales stay in step; this file only holds what is not language:
 * ids, years, file types, links. Team material is a placeholder until photos / bios are supplied (Q11): names render
 * as "Team member" and portraits as LS-mark tiles.
 */
export const leadership = [
  { id: "ceo" },
  { id: "engineering" },
  { id: "hardware" },
  { id: "design" },
] as const;

export const team = (["engineer", "designer", "support", "sales", "engineer", "engineer", "support", "sales"] as const).map((role, i) => ({ id: `t${i + 1}`, role }));

/** The long-form story (Sharplink's about-ethereum rows), in reading order. */
export const storyRows = ["story", "scope", "serve"] as const;

export const pillars = ["software", "publishing", "hardware", "services"] as const;

export const milestones = ["2022", "2024", "2025", "2026"] as const;

export const certifications = ["rdb", "rra"] as const;

export const documents = [
  { id: "profile", type: "PDF", href: null },
  { id: "incorporation", type: "PDF", href: null },
  { id: "press", type: "ZIP", href: "/brand/linse-logo-pack.zip" },
] as const;

/** Company contacts (the office address and phone come from site.ts too). */
export const contacts = [
  { id: "sales", email: site.email },
  { id: "support", email: site.supportEmail },
  { id: "media", email: "press@linsetech.com" },
  { id: "careers", email: site.careersEmail },
] as const;

export const openRoles = [
  { title: "Full-stack engineer (Next.js / Node)", type: "Full-time · Kigali", slug: "fullstack-engineer" },
  { title: "Field technician (hardware & networks)", type: "Full-time · Kigali", slug: "field-technician" },
];

export const perks = [
  { title: "Real products", text: "Ship software that businesses run on, and see it used." },
  { title: "Wide scope", text: "Web, mobile, systems, hardware: learn across the stack." },
  { title: "Small team", text: "Short decisions, direct access to clients and founders." },
  { title: "Tools", text: "Business-grade laptop, licences and training budget." },
];

export const supportChannels = [
  { title: "Help desk", text: "support@linsetech.com", note: "Tickets, tracked with an SLA" },
  { title: "Phone / WhatsApp", text: "+250 785 258 161", note: "Mon–Fri 08:00–18:00, Sat 09:00–13:00" },
  { title: "On-site", text: "Kigali and nationwide", note: "Scheduled or emergency visits" },
];

export const sla = [
  { level: "Critical", response: "< 1 hour", resolution: "4 hours" },
  { level: "High", response: "4 hours", resolution: "1 business day" },
  { level: "Normal", response: "1 business day", resolution: "3 business days" },
];
