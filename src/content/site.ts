export const site = {
  name: "Linse",
  legalName: "Linsetech Ltd",
  footerWord: "LINSETECH",
  email: "hello@linsetech.com",
  supportEmail: "support@linsetech.com",
  careersEmail: "careers@linsetech.com",
  phone: "+250 785 258 161",
  address: ["KG 7 Ave, Kigali Heights", "Kigali, Rwanda"],
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/linsetech" },
    { label: "X", href: "https://x.com/linsetech" },
    { label: "Instagram", href: "https://instagram.com/linsetech" },
    { label: "GitHub", href: "https://github.com/linsetech" },
  ],
  nav: [
    { key: "home", href: "/" },
    { key: "about", href: "/about" },
    { key: "work", href: "/work" },
    { key: "services", href: "/services" },
    { key: "news", href: "/news" },
  ] as const,
};
