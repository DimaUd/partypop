import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { store } from "@/lib/store";
import { checkAdminPin, rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
const MAX_PHOTOS = 10;
const MAX_PHOTO_CHARS = 1_200_000; // ~0.9MB per base64 image

// Operator (PIN) uploads up to 10 event photos → creates the public Moments gallery
export async function POST(req: NextRequest) {
  const { ok, locked } = checkAdminPin(req);
  if (!ok || locked) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.id || !Array.isArray(b.photos)) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  const photos: string[] = b.photos
    .filter((p: unknown) => typeof p === "string" && p.startsWith("data:image/") && p.length <= MAX_PHOTO_CHARS)
    .slice(0, MAX_PHOTOS);
  if (photos.length === 0) return NextResponse.json({ error: "no valid photos" }, { status: 400 });

  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("bookings").update({ gallery: photos }).eq("id", b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const bk = store.bookings.find((x) => x.id === Number(b.id));
    if (!bk) return NextResponse.json({ error: "not found" }, { status: 404 });
    bk.gallery = photos;
  }
  return NextResponse.json({ ok: true, count: photos.length });
}

// Public gallery — exposes ONLY safe fields (no names, phones or addresses)
export async function GET(req: NextRequest) {
  if (!rateLimit(`moments:${clientIp(req)}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = getServerSupabase();
  let bk: any = null;
  if (supabase) {
    bk = (await supabase.from("bookings").select("id,pack_name,event_date,ambassador_slug,gallery").eq("id", id).single()).data;
  } else {
    bk = store.bookings.find((x) => String(x.id) === String(id));
  }
  if (!bk || !bk.gallery || bk.gallery.length === 0) return NextResponse.json({ moment: null });

  return NextResponse.json({
    moment: {
      id: bk.id,
      pack_name: bk.pack_name,
      event_date: bk.event_date,
      ambassador_slug: bk.ambassador_slug || "",
      coupon: `POP-${bk.id}`,
      photos: bk.gallery
    }
  });
}
