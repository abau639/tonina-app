import { type MetadataRoute } from "next";
import { SITE_URL } from "~/lib/site";

const ROUTES = [
  "",
  "/concept-explorer",
  "/concept-explorer/cac",
  "/concept-explorer/doordash",
  "/concept-explorer/saas",
  "/concept-explorer/snapchat",
  "/wealth",
  "/wealth/advisor",
  "/wealth/archetype",
  "/money",
  "/money/lottery",
  "/about",
  "/blog",
  "/blog/debt-freedom",
  "/terms",
  "/privacy",
  "/refunds",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({ url: `${SITE_URL}${route}` }));
}
