import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { store } from "@/lib/store";
import { rateLimit, clientIp, checkAdminPin, cap } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest) {
  const { ok, locked } = checkAdminPin(req);
  if (locked) return false;
  return ok;
}

// Public: register as ambassador (optionally recruited by ?parent= another ambassador)
export async function POST(req: NextRequest) {
  if (!rateLimit(`amb:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const b = await req.json().catch(() => null);
  if (!b?.slug || !b?.name) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  const slug = cap(b.slug, 40).trim().replace(/\s+/g, "-").toLowerCase();
  if (!/^[\u0590-\u05FFa-z0-9-]{2,40}$/.test(slug)) return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  const parent = b.parent ? String(b.parent).trim().toLowerCase() : null;
  const rec = { slug, name: cap(b.name, 60), phone: cap(b.phone, 15), parent_slug: parent && parent !== slug ? parent : null, created_at: new Date().toISOString() };

  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("ambassadors").upsert(rec, { onConflict: "slug" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const existing = store.ambassadors.find((a) => a.slug === slug);
    if (existing) {
      existing.name = rec.name;
      if (!existing.parent_slug && rec.parent_slug) existing.parent_slug = rec.parent_slug;
    } else {
      store.ambassadors.push(rec);
    }
  }
  return NextResponse.json({ ok: true, ambassador: rec });
}

// Stats: public per-slug (?slug=dani), or full admin list with PIN
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  const supabase = getServerSupabase();
  let ambassadors: any[] = [];
  let bookings: any[] = [];
  let rewards: any[] = [];

  if (supabase) {
    ambassadors = (await supabase.from("ambassadors").select("*")).data || [];
    bookings = (await supabase.from("bookings").select("*")).data || [];
    rewards = (await supabase.from("rewards").select("*")).data || [];
  } else {
    ambassadors = store.ambassadors;
    bookings = store.bookings;
    rewards = store.rewards;
  }

  const enrich = (a: any) => {
    const myBookings = bookings.filter((bk) => bk.ambassador_slug === a.slug);
    const myRewards = rewards.filter((r) => r.ambassador_slug === a.slug);
    const recruits = ambassadors.filter((x) => x.parent_slug === a.slug).map((x) => x.slug);
    return {
      slug: a.slug,
      name: a.name,
      phone: a.phone,
      parent_slug: a.parent_slug || null,
      recruits,
      bookings_total: myBookings.length,
      bookings_completed: myBookings.filter((bk) => bk.status === "completed_paid").length,
      earned: myRewards.reduce((s, r) => s + Number(r.amount || 0), 0),
      paid_out: myRewards.filter((r) => r.paid).reduce((s, r) => s + Number(r.amount || 0), 0),
      pending_payout: myRewards.filter((r) => !r.paid).reduce((s, r) => s + Number(r.amount || 0), 0)
    };
  };

  if (slug) {
    const a = ambassadors.find((x) => x.slug === slug.toLowerCase());
    if (!a) return NextResponse.json({ ambassador: null });
    return NextResponse.json({ ambassador: enrich(a) });
  }

  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ambassadors: ambassadors.map(enrich) });
}

// Admin: mark an ambassador's pending rewards as paid out
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("rewards").update({ paid: true }).eq("ambassador_slug", b.slug).eq("paid", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    store.rewards.filter((r) => r.ambassador_slug === b.slug && !r.paid).forEach((r) => (r.paid = true));
  }
  return NextResponse.json({ ok: true });
}
