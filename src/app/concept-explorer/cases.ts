// Single list of case studies, shared by the homepage and the Case Studies library.
// Add new cases here; an industry with no case yet still shows as a filter that invites a request.

export const INDUSTRIES = [
  "Food & Delivery",
  "Consumer Tech & Social",
  "Software & SaaS",
  "Retail & E-commerce",
  "Travel & Leisure",
  "Manufacturing",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export type CaseStudy = {
  href: string;
  title: string;
  industry: Industry;
  format: string;
  summary: string;
};

export const CASES: CaseStudy[] = [
  {
    href: "/concept-explorer/doordash",
    title: "Deconstructing DoorDash",
    industry: "Food & Delivery",
    format: "Guided teardown",
    summary: "How a company reports GAAP losses while generating cash, step by step.",
  },
  {
    href: "/concept-explorer/snapchat",
    title: "Project: Family Center",
    industry: "Consumer Tech & Social",
    format: "Role-playing simulation",
    summary: "A crisis simulation. Pick a role, gather data under pressure, and make the call.",
  },
  {
    href: "/concept-explorer/saas",
    title: "The Language of SaaS",
    industry: "Software & SaaS",
    format: "Interactive dictionary",
    summary: "ARR, NDR, CAC, LTV and payback: the metrics that drive software valuation.",
  },
  {
    href: "/concept-explorer/cac",
    title: "The Channel That Looked Fine",
    industry: "Retail & E-commerce",
    format: "CFO case study",
    summary: "Blended LTV:CAC holds at 3.2x for six quarters. Channel-level data tells a different story.",
  },
];
