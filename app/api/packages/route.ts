import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { store, ADDONS } from "@/lib/store";
import { checkAdminPin } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest) {
  const { ok, locked } = checkAdminPin(req);
  if (locked) return false;
  return ok;
}

// Public: list active packages
export async function GET() {
  const supabase = getServerSupabase();
  if (supabase) {
    const { data } = await supabase.from("packages").select("*").eq("active", true).order("price");
    if (data && data.length) return NextResponse.json({ packages: data, addons: ADDONS });
  }
  return NextResponse.json({ packages: store.packages.filter((p) => p.active), addons: ADDONS });
}

// Admin: add a package
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.name || !b?.price) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  const pack = {
    id: String(b.id || b.name).trim().replace(/\s+/g, "-").toLowerCase() + "-" + Date.now().toString(36),
    name: String(b.name),
    emoji: String(b.emoji || "🍭"),
    price: Number(b.price),
    desc: String(b.desc || ""),
    popular: !!b.popular,
    active: true
  };
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("packages").insert(pack);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    store.packages.push(pack);
  }
  return NextResponse.json({ ok: true, package: pack });
}

// Admin: deactivate a package
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("packages").update({ active: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const p = store.packages.find((x) => x.id === id);
    if (p) p.active = false;
  }
  return NextResponse.json({ ok: true });
}
