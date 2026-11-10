export type Service = {
  slug: string;
  key: "design" | "web" | "systems" | "software" | "hardware" | "it";
  title: string;
  headline: string;
  intro: string;
  bullets: string[];
  stats: { value: string; label: string }[];
  related: string[];
  faqs: { q: string; a: string }[];
  /** How the tile set rearranges for this chapter */
  formation: "grid" | "ring" | "stack" | "wave" | "cube" | "line";
};

export const services: Service[] = [
  {
    slug: "design",
    key: "design",
    title: "Design",
    headline: "Products people actually enjoy using.",
    intro: "Brand identity, UX research and UI design for web, mobile and internal tools. We design in the open, with your team and your users, and hand over systems, not just screens.",
    bullets: ["Brand identity & guidelines", "UX research, flows & prototypes", "UI design systems (Figma)", "Design for accessibility (WCAG AA)"],
    stats: [
      { value: "2 wks", label: "To a clickable prototype" },
      { value: "AA", label: "Accessibility baseline" },
      { value: "1", label: "Design system per product" },
    ],
    related: ["macyepay"],
    faqs: [
      { q: "Do you design for products you do not build?", a: "Yes. Design is a stand-alone service; we hand over Figma files, a design system and specifications your team can build from." },
      { q: "Can you refresh an existing brand?", a: "Yes, from a light refresh to a full identity, including logo, typography, colour and templates." },
    ],
    formation: "wave",
  },
  {
    slug: "websites-and-apps",
    key: "web",
    title: "Websites & apps",
    headline: "Fast, accessible, built to last.",
    intro: "Marketing sites, e-commerce, web applications and mobile apps on modern stacks: Next.js and React on the web, Flutter for Android and iOS. Hosted, monitored and maintained.",
    bullets: ["Marketing & corporate websites", "E-commerce and customer portals", "Mobile apps (Flutter, Android & iOS)", "Headless CMS, SEO and analytics"],
    stats: [
      { value: "95+", label: "Lighthouse performance target" },
      { value: "3", label: "Languages out of the box" },
      { value: "99.9%", label: "Hosting uptime" },
    ],
    related: ["macyepay"],
    faqs: [
      { q: "Who owns the code?", a: "You do. Every project is delivered in a repository you own, with documentation and a hand-over session." },
      { q: "Can we edit the content ourselves?", a: "Yes. We set up a CMS (Sanity by default) so your team can edit pages, news and products without a developer." },
    ],
    formation: "grid",
  },
  {
    slug: "systems-and-integration",
    key: "systems",
    title: "Systems & integration",
    headline: "Systems that talk to each other.",
    intro: "ERP, HMIS, payments, e-government and custom platforms, built or integrated. We specialise in making existing systems share data reliably, with audit trails and reporting on top.",
    bullets: ["Custom platforms & internal tools", "ERP / HMIS implementation & integration", "Payment, mobile money and bank integrations", "Data migration, reporting and dashboards"],
    stats: [
      { value: "12+", label: "Integrations shipped" },
      { value: "0", label: "Lost records in migrations" },
      { value: "24/7", label: "Monitoring" },
    ],
    related: ["macyepay"],
    faqs: [
      { q: "Do you work with government systems?", a: "Yes, including IremboGov, RRA and mobile-money APIs, within their compliance requirements." },
      { q: "Can you take over a system someone else built?", a: "Yes. We start with an audit, stabilise what is in production, then plan improvements." },
    ],
    formation: "cube",
  },
  {
    slug: "software-we-publish",
    key: "software",
    title: "Software we publish & own",
    headline: "Products we build, own and operate.",
    intro: "Linse invests in its own products and licenses them to the market. MacyePay, our installment-payment platform, is the first; more are in development.",
    bullets: ["MacyePay — installment payments with legal recovery", "Licensing or managed service", "Roadmap driven by customers", "Support and SLAs included"],
    stats: [
      { value: "1", label: "Product live" },
      { value: "5,000+", label: "Active agreements on MacyePay" },
      { value: "98%", label: "Recovery rate" },
    ],
    related: ["macyepay"],
    faqs: [
      { q: "How is MacyePay licensed?", a: "As a managed service with a monthly fee per business, or as a licence for banks and large retailers. Ask for a demo." },
      { q: "Will you build a product with us?", a: "Yes. We co-develop and co-own products with partners who bring the market; talk to us." },
    ],
    formation: "stack",
  },
  {
    slug: "hardware-and-distribution",
    key: "hardware",
    title: "Hardware sales & distribution",
    headline: "Business-grade devices, delivered and supported.",
    intro: "Laptops, desktops, servers, networking, printers, security cameras and point-of-sale terminals from trusted brands. Sourced, delivered and installed across Rwanda, with warranty handled locally.",
    bullets: ["Laptops, desktops & workstations", "Servers, storage & networking", "Printers, scanners, cameras & POS", "Warranty, repairs & on-site support"],
    stats: [
      { value: "12", label: "Brands distributed" },
      { value: "48 h", label: "Delivery in Kigali" },
      { value: "2 yrs", label: "Standard warranty" },
    ],
    related: ["retail-rollout"],
    faqs: [
      { q: "Do you sell to individuals?", a: "Our focus is businesses, schools and institutions, but we do serve individuals for selected products." },
      { q: "Can you quote a full office setup?", a: "Yes: devices, networking, security and installation in one quote. Request the catalogue." },
    ],
    formation: "line",
  },
  {
    slug: "it-services",
    key: "it",
    title: "IT services",
    headline: "Run, monitor, secure.",
    intro: "Managed IT for teams of any size: help desk, networks, cloud, backups and security. One contract, one contact, agreed response times.",
    bullets: ["Help desk & on-site support", "Networks, Wi-Fi & structured cabling", "Cloud, Microsoft 365 / Google Workspace, backups", "Security: endpoints, cameras, access control"],
    stats: [
      { value: "< 1 h", label: "Critical response time" },
      { value: "99.9%", label: "Managed uptime" },
      { value: "1", label: "Contract for everything" },
    ],
    related: ["retail-rollout"],
    faqs: [
      { q: "Do you offer retainers?", a: "Yes. Monthly retainers with a fixed number of hours and agreed response times, scaled to your team." },
      { q: "Do you support hardware you did not sell?", a: "Yes, after a quick audit of what you have." },
    ],
    formation: "ring",
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);

/** Dotted line drawing (components/sections/services/LineArt) for each "what's included" item, in bullet order. */
export const ART_FOR: Record<Service["key"], [string, string, string, string]> = {
  design: ["brand", "flow", "system", "a11y"],
  web: ["browser", "cart", "phone", "cms"],
  systems: ["platform", "erp", "payment", "data"],
  software: ["product", "licence", "roadmap", "support"],
  hardware: ["laptop", "server", "printer", "warranty"],
  it: ["helpdesk", "network", "cloud", "security"],
};

/** The drawing on each service's row in the /services transformation list. */
export const ROW_ART: Record<Service["key"], string> = { design: "brand", web: "browser", systems: "erp", software: "product", hardware: "server", it: "network" };

/** Line drawings for the four engagement models (Project, Retainer & support, Product licence, Co-development). */
export const MODEL_ART = ["project", "retainer", "licence", "partner"] as const;

export const engagementModels = [
  { title: "Project", text: "Fixed scope, fixed price, fixed timeline. Best for a new website, app or system.", includes: ["Discovery & proposal", "Design & build", "Hand-over & training", "30-day warranty"] },
  { title: "Retainer / support", text: "A monthly block of hours and agreed response times for running and improving what you have.", includes: ["Help desk", "Monitoring & updates", "Hardware support", "Monthly report"] },
  { title: "Product licence", text: "Use software we publish, as a managed service or an enterprise licence.", includes: ["Onboarding", "Hosting & upgrades", "SLA", "Roadmap input"] },
];
