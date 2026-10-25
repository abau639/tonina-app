import { NextResponse } from "next/server";
import { env } from "~/env";
import { KIT_PUBLIC_FORM_ID } from "~/lib/newsletter";

// Email signup. Forwards the address to whichever newsletter tool is configured:
//   NEWSLETTER_PROVIDER=beehiiv  + BEEHIIV_API_KEY + BEEHIIV_PUBLICATION_ID
//   NEWSLETTER_PROVIDER=kit      + KIT_API_KEY + KIT_FORM_ID (form optional with a v4 key)
// Kit v4 keys start with "kit_"; anything else is treated as a v3 API key (the public one, never the secret).
// With no Kit key at all, signups go through the Kit form's public endpoint, which needs only the form number
// (KIT_FORM_ID, or KIT_PUBLIC_FORM_ID in src/lib/newsletter.ts). That is the setup tonina.me uses.
// With no provider configured it answers 503 so the form can say signups open soon.

// The setup check below must read settings at request time, not at build time.
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = { email?: unknown; website?: unknown; source?: unknown };

async function subscribeBeehiiv(email: string, source: string) {
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env.BEEHIIV_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, send_welcome_email: true, utm_source: "tonina.me", utm_medium: source }),
    },
  );
  return res.ok;
}

const kitFormId = () => env.KIT_FORM_ID ?? (KIT_PUBLIC_FORM_ID || undefined);

// Same request Kit's own embedded form sends.
async function subscribeKitForm(email: string) {
  const formId = kitFormId();
  if (!formId) return false;
  const res = await fetch(`https://app.kit.com/forms/${formId}/subscriptions`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email_address: email }).toString(),
  });
  // Kit can answer 200 with a failure inside, so only a "success" status counts.
  const text = await res.text();
  let status: unknown;
  try {
    status = (JSON.parse(text) as { status?: unknown }).status;
  } catch {
    status = undefined;
  }
  if (res.ok && status === "success") return true;
  throw new Error(`Kit form answered ${res.status}: ${text.slice(0, 200)}`);
}

async function subscribeKitV3(email: string) {
  const formId = kitFormId();
  if (!formId) return false;
  const res = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: env.KIT_API_KEY, email }),
  });
  if (!res.ok) console.error("Kit v3 signup failed", res.status, await res.text());
  return res.ok;
}

async function subscribeKit(email: string) {
  if (!env.KIT_API_KEY) return subscribeKitForm(email);
  if (!env.KIT_API_KEY?.startsWith("kit_")) return subscribeKitV3(email);
  const headers = { "X-Kit-Api-Key": env.KIT_API_KEY ?? "", "Content-Type": "application/json" };
  const created = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email }),
  });
  if (!created.ok) {
    console.error("Kit v4 signup failed", created.status, await created.text());
    return false;
  }
  const formId = kitFormId();
  if (!formId) return true;
  const added = await fetch(`https://api.kit.com/v4/forms/${formId}/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email }),
  });
  return added.ok;
}

// Setup check: open /api/subscribe in a browser to see which settings this deployment can see.
// Shows only whether each one is set, never the key itself.
export function GET() {
  const key = env.KIT_API_KEY ?? env.BEEHIIV_API_KEY;
  const formId = kitFormId();
  return NextResponse.json({
    provider: newsletterProvider() ?? "not set",
    apiKey: key ? (env.KIT_API_KEY?.startsWith("kit_") ? "set (Kit v4)" : "set") : "not needed for a Kit form",
    kitFormId: formId ? (/^\d+$/.test(formId) ? "set" : "set, but not just digits") : "not set",
  });
}

// A Kit form number alone is enough, so it turns signups on even with no NEWSLETTER_PROVIDER.
function newsletterProvider() {
  return env.NEWSLETTER_PROVIDER ?? (kitFormId() ? "kit" : undefined);
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }

  // Honeypot: real visitors never fill the hidden "website" field.
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "That email doesn't look right. Check it and try again." }, { status: 400 });
  }
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "site";

  const provider = newsletterProvider();
  if (!provider) {
    return NextResponse.json({ error: "Signups open soon. Please check back in a few days." }, { status: 503 });
  }

  try {
    const ok = provider === "beehiiv" ? await subscribeBeehiiv(email, source) : await subscribeKit(email);
    if (!ok) throw new Error(`${provider} rejected the signup`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Newsletter signup failed", error);
    // detail helps diagnose setup from the browser's network tab; it never includes keys.
    const detail = error instanceof Error ? error.message.slice(0, 240) : undefined;
    return NextResponse.json({ error: "We couldn't sign you up just now. Please try again later.", detail }, { status: 502 });
  }
}
