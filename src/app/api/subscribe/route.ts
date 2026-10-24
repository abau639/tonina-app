import { NextResponse } from "next/server";
import { env } from "~/env";

// Email signup. Forwards the address to whichever newsletter tool is configured:
//   NEWSLETTER_PROVIDER=beehiiv  + BEEHIIV_API_KEY + BEEHIIV_PUBLICATION_ID
//   NEWSLETTER_PROVIDER=kit      + KIT_API_KEY + KIT_FORM_ID (form optional with a v4 key)
// Kit v4 keys start with "kit_"; anything else is treated as a v3 API key (the public one, never the secret).
// With no provider configured it answers 503 so the form can say signups open soon.

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

async function subscribeKitV3(email: string) {
  if (!env.KIT_FORM_ID) return false;
  const res = await fetch(`https://api.convertkit.com/v3/forms/${env.KIT_FORM_ID}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: env.KIT_API_KEY, email }),
  });
  return res.ok;
}

async function subscribeKit(email: string) {
  if (!env.KIT_API_KEY?.startsWith("kit_")) return subscribeKitV3(email);
  const headers = { "X-Kit-Api-Key": env.KIT_API_KEY ?? "", "Content-Type": "application/json" };
  const created = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email }),
  });
  if (!created.ok) return false;
  if (!env.KIT_FORM_ID) return true;
  const added = await fetch(`https://api.kit.com/v4/forms/${env.KIT_FORM_ID}/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email }),
  });
  return added.ok;
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

  const provider = env.NEWSLETTER_PROVIDER;
  if (!provider) {
    return NextResponse.json({ error: "Signups open soon. Please check back in a few days." }, { status: 503 });
  }

  try {
    const ok = provider === "beehiiv" ? await subscribeBeehiiv(email, source) : await subscribeKit(email);
    if (!ok) throw new Error(`${provider} rejected the signup`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Newsletter signup failed", error);
    return NextResponse.json({ error: "We couldn't sign you up just now. Please try again later." }, { status: 502 });
  }
}
