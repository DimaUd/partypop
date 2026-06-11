import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { store, nextId, createCommissions, COMMISSION_L1, COMMISSION_L2, ADDONS, SOCIAL_DISCOUNT } from "@/lib/store";
import { rateLimit, clientIp, checkAdminPin, ISRAELI_PHONE, cap } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest) {
  const { ok, locked } = checkAdminPin(req);
  if (locked) return false;
  return ok;
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`book:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (!body || !body.name || !body.phone || !body.date || !body.address) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!ISRAELI_PHONE.test(String(body.phone).trim())) {
    return NextResponse.json({ error: "invalid phone" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date))) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  const record = {
    pack_id: String(body.packId || ""),
    pack_name: String(body.packName || ""),
    price: Number(body.price) || 0,
    event_date: String(body.date),
    event_hour: String(body.hour || ""),
    address: cap(body.address, 120),
    guests: Number(body.guests) || 0,
    customer_name: cap(body.name, 60),
    customer_phone: cap(body.phone, 15),
    has_power: !!body.power,
    has_parking: !!body.parking,
    notes: cap(body.notes, 300),
    ambassador_slug: cap(body.ref, 40).toLowerCase(),
    payment_method: ["bit", "cash", "kashcash"].includes(body.payMethod) ? String(body.payMethod) : "bit",
    deposit_paid: false,
    social_optin: !!body.social,
    social_verified: false,
    discount: 0,
    addons: Array.isArray(body.addons) ? body.addons.filter((a: string) => ADDONS.some((x) => x.id === a)) : [],
    addons_total: Array.isArray(body.addons)
      ? ADDONS.filter((x) => body.addons.includes(x.id)).reduce((s, x) => s + x.price, 0)
      : 0,
    gallery: [] as string[],
    status: "pending" // pending → confirmed → completed_paid
  };

  const supabase = getServerSupabase();
  if (supabase) {
    // Double-booking check: is this date+hour already taken?
    if (record.event_hour) {
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("event_date", record.event_date)
        .eq("event_hour", record.event_hour)
        .neq("status", "cancelled")
        .limit(1);
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: "השעה הזו כבר תפוסה — בחרו שעה אחרת", code: "hour_taken" }, { status: 409 });
      }
    }

    // Check availability blocks (admin-blocked slots)
    const dateObj = new Date(record.event_date);
    const weekday = dateObj.getUTCDay(); // 0=Sun...6=Sat
    const { data: blocks } = await supabase
      .from("availability_blocks")
      .select("id, time_window")
      .or(
        `and(block_date.eq.${record.event_date},time_window.is.null),` +
        `and(block_date.eq.${record.event_date},time_window.eq.${record.event_hour}),` +
        `and(weekday.eq.${weekday},time_window.is.null),` +
        `and(weekday.eq.${weekday},time_window.eq.${record.event_hour})`
      )
      .limit(1);
    if (blocks && blocks.length > 0) {
      return NextResponse.json({ error: "התאריך או השעה חסומים — בחרו מועד אחר", code: "blocked" }, { status: 409 });
    }

    const { error } = await supabase.from("bookings").insert(record);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // In-memory double-booking check
    if (record.event_hour) {
      const clash = store.bookings.find(
        (b) => b.event_date === record.event_date && b.event_hour === record.event_hour && b.status !== "cancelled"
      );
      if (clash) {
        return NextResponse.json({ error: "השעה הזו כבר תפוסה — בחרו שעה אחרת", code: "hour_taken" }, { status: 409 });
      }
    }
    store.bookings.push({ ...record, id: nextId(), created_at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data });
  }
  return NextResponse.json({ bookings: store.bookings.slice().reverse() });
}

// Admin: advance booking status.
// Commissions are created ONLY here, ONLY on transition to completed_paid —
// i.e. the customer actually paid and the event is over.
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.id) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  // Social-tag verified → apply discount (independent of status flow)
  if (b.social === true) {
    const sb = getServerSupabase();
    if (sb) {
      const { error } = await sb.from("bookings").update({ social_verified: true, discount: SOCIAL_DISCOUNT }).eq("id", b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const bk = store.bookings.find((x) => x.id === Number(b.id));
      if (!bk) return NextResponse.json({ error: "not found" }, { status: 404 });
      bk.social_verified = true;
      bk.discount = SOCIAL_DISCOUNT;
    }
    return NextResponse.json({ ok: true });
  }

  // Deposit confirmation (independent of status flow)
  if (b.deposit === true) {
    const sb = getServerSupabase();
    if (sb) {
      const { error } = await sb.from("bookings").update({ deposit_paid: true }).eq("id", b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const bk = store.bookings.find((x) => x.id === Number(b.id));
      if (!bk) return NextResponse.json({ error: "not found" }, { status: 404 });
      bk.deposit_paid = true;
    }
    return NextResponse.json({ ok: true });
  }

  if (!b?.status) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  const allowed = ["pending", "confirmed", "completed_paid", "cancelled"];
  if (!allowed.includes(b.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });

  const supabase = getServerSupabase();
  if (supabase) {
    const { data: booking, error } = await supabase.from("bookings").update({ status: b.status }).eq("id", b.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (b.status === "completed_paid" && booking?.ambassador_slug) {
      const { data: existing } = await supabase.from("rewards").select("id").eq("booking_id", booking.id).limit(1);
      if (!existing || existing.length === 0) {
        const rows = [{ ambassador_slug: booking.ambassador_slug, booking_id: booking.id, amount: COMMISSION_L1, level: 1, approved: true, paid: false }];
        const { data: amb } = await supabase.from("ambassadors").select("parent_slug").eq("slug", booking.ambassador_slug).single();
        if (amb?.parent_slug) rows.push({ ambassador_slug: amb.parent_slug, booking_id: booking.id, amount: COMMISSION_L2, level: 2, approved: true, paid: false });
        await supabase.from("rewards").insert(rows);
      }
    }
    return NextResponse.json({ ok: true });
  }

  const booking = store.bookings.find((x) => x.id === Number(b.id));
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });
  booking.status = b.status;
  if (b.status === "completed_paid") createCommissions(booking);
  return NextResponse.json({ ok: true });
}
