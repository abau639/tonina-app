import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url().optional(), // Optional to allow file: paths
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXTAUTH_SECRET: process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),
    NEXTAUTH_URL: z.preprocess((str) => process.env.VERCEL_URL ?? str, process.env.VERCEL ? z.string() : z.string().url()),
    // Newsletter signup (optional until a tool is chosen; see /api/subscribe)
    NEWSLETTER_PROVIDER: z.enum(["beehiiv", "kit"]).optional(),
    BEEHIIV_API_KEY: z.string().optional(),
    BEEHIIV_PUBLICATION_ID: z.string().optional(),
    KIT_API_KEY: z.string().optional(),
    KIT_FORM_ID: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEWSLETTER_PROVIDER: process.env.NEWSLETTER_PROVIDER,
    BEEHIIV_API_KEY: process.env.BEEHIIV_API_KEY,
    BEEHIIV_PUBLICATION_ID: process.env.BEEHIIV_PUBLICATION_ID,
    KIT_API_KEY: process.env.KIT_API_KEY,
    KIT_FORM_ID: process.env.KIT_FORM_ID,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});