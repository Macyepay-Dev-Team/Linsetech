export type ProjectCategory = "software" | "web" | "systems" | "design" | "hardware";
export type CardShape = "landscape" | "portrait" | "kiosk";

export type Screen = { src: string | null; caption: string };

export type Project = {
  slug: string;
  title: string;
  client: string;
  /** where it runs (case-study meta row) */
  place?: string;
  tag: string;
  category: ProjectCategory;
  year: string;
  blurb: string;
  summary: string;
  shape: CardShape;
  cover: string | null;
  accent: string;
  result: { value: string; label: string };
  stats: { value: string; label: string }[];
  meta: { scope: string; period: string; role: string; stack: string[] };
  delivered: string[];
  screens: Screen[];
  /** a 3D model (GLB in public/models) shown on the Work floor instead of the cover panel */
  model?: string;
  /** a device in 3D, scrubbed by scroll after the overview (clip key in src/content/clips.ts) */
  device?: { clip: "posTill"; label: string; title: string; text: string; beats: { title: string; text: string }[]; marks?: number[] };
  /** a second, mobile part shown as its own section (screens are wide composites of several phone screens) */
  phone?: { title: string; text: string; screens: Screen[] };
  journey: { title: string; text: string }[];
  engineering: { title: string; text: string }[];
  /** Sample entry to show the layout until a real case study replaces it. */
  placeholder?: boolean;
  featured?: boolean;
  url?: string;
};

export const projects: Project[] = [
  {
    slug: "macyepay",
    title: "MacyePay",
    client: "MacyePay Ltd",
    place: "Kigali, Rwanda · merchants nationwide",
    tag: "Fintech · Published product",
    category: "software",
    year: "2024 — ongoing",
    blurb: "Installment payments for Rwandan businesses, backed by notarised agreements, automated enforcement and credit-bureau integration.",
    summary:
      "MacyePay lets retailers and lenders sell on installments without giving up their revenue. Every plan is a legally binding, notary-verified agreement; reminders, penalties and escalation run automatically; and payment history builds a trust score for each customer. We designed, built and now operate the platform: a merchant web portal, a customer mobile app and the notary workflow behind them.",
    shape: "landscape",
    cover: "/work/macyepay/dashboard.webp",
    accent: "#16a34a",
    result: { value: "98%", label: "Recovery rate on active agreements" },
    stats: [
      { value: "RWF 500M+", label: "Transactions processed" },
      { value: "5,000+", label: "Active agreements" },
      { value: "200+", label: "Registered businesses" },
    ],
    meta: {
      scope: "Product design · Merchant web portal · Customer mobile app · Notary workflow · Backend & integrations",
      period: "2024 — ongoing",
      role: "Owner, designer and publisher",
      stack: ["Next.js", "Flutter", "Node.js", "PostgreSQL", "Mobile money APIs", "Credit bureau (CRB)", "PDF signing"],
    },
    delivered: [
      "Merchant portal: product catalogue, client verification, agreement creation, payment tracking, analytics and reports.",
      "Customer app: clear payment schedules, multiple payment methods, reminders, trust score and document access.",
      "Notary workflow: digital verification, secure signing, document management and a full audit trail.",
      "Automated enforcement: reminders, penalty calculation, escalation and credit-bureau reporting.",
    ],
    screens: [
      { src: "/work/macyepay/dashboard.webp", caption: "Merchant dashboard: collections, recovery rate and plan length at a glance" },
      { src: "/work/macyepay/overview.webp", caption: "Agreement overview with schedule, signatures and notarisation status" },
      { src: "/work/macyepay/approvals.webp", caption: "Approvals queue for new installment plans" },
      { src: "/work/macyepay/enforcement.webp", caption: "Enforcement: reminders, penalties and escalation steps" },
    ],
    phone: {
      title: "Business wallet app",
      text: "Collections land in a business wallet. Owners check the balance and card details, request withdrawals to mobile money, and a teammate with approval rights signs them off.",
      screens: [
        { src: "/work/macyepay/app-wallet.png", caption: "Wallet: balance, card details and recent withdrawals" },
        { src: "/work/macyepay/app-withdraw.png", caption: "Withdrawal: amount, confirmation and approval status" },
      ],
    },
    journey: [
      { title: "Create", text: "The merchant picks a product, verifies the customer and sets a weekly, bi-weekly or monthly schedule." },
      { title: "Sign & notarise", text: "Both parties sign digitally; a licensed notary verifies the agreement and it becomes enforceable." },
      { title: "Pay", text: "The customer pays by mobile money or card; reminders go out before each due date." },
      { title: "Recover", text: "Late payments trigger penalties and escalation automatically; history feeds the trust score." },
    ],
    engineering: [
      { title: "Three portals, one API", text: "Merchant, customer and notary experiences share a single backend with role-based access and a common agreement model." },
      { title: "Signatures embedded in PDF", text: "Customer and merchant signatures are embedded into the agreement PDF server-side, so the notarised document carries both." },
      { title: "Payment reconciliation", text: "Provider webhooks can land after the user returns; deposits are polled and reconciled so the success state is never stale." },
      { title: "Mobile first", text: "The customer app is built with Flutter for Android and iOS, sharing the design system with the web portal." },
    ],
    featured: true,
    url: "https://macyepay.com",
  },
  {
    slug: "retail-rollout",
    title: "Retail POS rollout",
    client: "Sample client",
    place: "Kigali, Rwanda · 38 branches",
    tag: "Hardware · Distribution",
    category: "hardware",
    year: "2025",
    blurb: "Point-of-sale terminals, networking and on-site support for a multi-branch retailer.",
    summary:
      "A sample case study that shows how a hardware project is presented here: sourcing, delivery, installation and support of point-of-sale terminals and networking across a branch network. It stands in for a real project until one is published from the Studio.",
    shape: "kiosk",
    cover: "/work/retail-rollout/cover.jpg",
    model: "/models/linse-pos.glb",
    accent: "#22c55e",
    result: { value: "38", label: "Branches equipped (sample figure)" },
    stats: [
      { value: "210", label: "Devices delivered" },
      { value: "6 wks", label: "Rollout" },
      { value: "2 yrs", label: "Warranty & support" },
    ],
    meta: { scope: "Sourcing · Delivery · Installation · Support", period: "2025", role: "Supplier & integrator", stack: ["POS terminals", "Ubiquiti", "MikroTik", "Windows / Android"] },
    delivered: [
      "Sourcing: terminals, printers and scanners from authorised distributors, with warranty.",
      "Installation: cabling, Wi-Fi and a configured terminal at every till, branch by branch.",
      "Support: a help desk and spare devices so a broken till is replaced the same day.",
    ],
    screens: [
      { src: "/work/retail-rollout/cover.jpg", caption: "Checkout terminal (sample screen)" },
      { src: null, caption: "Branch network" },
      { src: null, caption: "On-site support" },
    ],
    device: {
      clip: "posTill",
      // where each beat starts in the clip: assembly, the till screen lights up (frame ~108), the customer side (~165),
      // the receipt (~255 of 300)
      marks: [0, 0.36, 0.55, 0.85],
      label: "The terminal",
      title: "A checkout, piece by piece",
      text: "A terminal in Linse's design language: a thin screen on one folded chrome stand, a lower display for the customer, and a base that holds the printer and the tap-to-pay ring.",
      beats: [
        { title: "Assembled and configured", text: "Screen, stand, printer and base come together, set up before they reach the branch." },
        { title: "One screen for the till", text: "Items, totals and VAT at a glance; cash, card or mobile money." },
        { title: "A screen for the customer", text: "The lower display shows the total and a code to pay with MoMo." },
        { title: "A receipt for every sale", text: "The sale closes with a printed receipt." },
      ],
    },
    journey: [
      { title: "Audit", text: "Each branch is surveyed: tills, power, network and staff." },
      { title: "Deliver", text: "Devices arrive configured, are installed and tested on site." },
      { title: "Support", text: "Faults go to one help desk; spares keep every till running." },
    ],
    engineering: [
      { title: "Configured before delivery", text: "Terminals are imaged and enrolled centrally, so a branch goes live in hours." },
      { title: "Managed network", text: "Branch routers and access points are monitored from one dashboard." },
    ],
    placeholder: true,
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
