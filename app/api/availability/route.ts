import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { checkAdminPin } from "@/lib/ratelimit";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns: booked hours per date + admin-blocked slots
// Used by booking wizard to show available dates/hours
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to") || from;

  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json({ error: "invalid from date" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  if (supabase) {
    // Get confirmed/pending bookings in range (not cancelled)
    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("event_date, event_hour")
      .gte("event_date", from)
      .lte("event_date", to || from)
      .neq("status", "cancelled");

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    // Get admin-blocked slots (specific dates in range, or recurring weekdays)
    // Parse the date range to figure out which weekdays to include
    const fromDate = new Date(from);
    const toDate = new Date(to || from);
    const weekdaysInRange: number[] = [];
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      weekdaysInRange.push(d.getDay());
    }
    const uniqueWeekdays = Array.from(new Set(weekdaysInRange));

    const { data: blocks, error: blErr } = await supabase
      .from("availability_blocks")
      .select("block_date, weekday, time_window, reason")
      .or(
        `and(block_date.gte.${from},block_date.lte.${to || from}),weekday.in.(${uniqueWeekdays.join(",")})`
      );

    // If availability_blocks table doesn't exist yet, just skip blocks (don't crash)
    if (blErr) {
      console.error("[availability] blocks query error (table may not exist):", blErr.message);
    }

    // Build response: per-date info
    const bookedByDate: Record<string, string[]> = {};
    for (const b of bookings || []) {
      if (!bookedByDate[b.event_date]) bookedByDate[b.event_date] = [];
      if (b.event_hour) bookedByDate[b.event_date].push(b.event_hour);
    }

    const blockedByDate: Record<string, { hours: string[]; allDay: boolean; reason: string }> = {};
    for (const bl of blocks || []) {
      // recurring weekday block — apply to each date in range that matches
      if (bl.weekday !== null && bl.weekday !== undefined) {
        for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === bl.weekday) {
            const dateStr = d.toISOString().slice(0, 10);
            if (!blockedByDate[dateStr]) blockedByDate[dateStr] = { hours: [], allDay: false, reason: bl.reason || "" };
            if (bl.time_window) {
              blockedByDate[dateStr].hours.push(bl.time_window);
            } else {
              blockedByDate[dateStr].allDay = true;
            }
          }
        }
      }
      // specific date block
      if (bl.block_date) {
        const dateStr = bl.block_date;
        if (!blockedByDate[dateStr]) blockedByDate[dateStr] = { hours: [], allDay: false, reason: bl.reason || "" };
        if (bl.time_window) {
          blockedByDate[dateStr].hours.push(bl.time_window);
        } else {
          blockedByDate[dateStr].allDay = true;
        }
      }
    }

    return NextResponse.json({ bookedByDate, blockedByDate });
  }

  // Fallback: in-memory store
  const bookedByDate: Record<string, string[]> = {};
  for (const b of store.bookings) {
    if (b.status === "cancelled") continue;
    if (b.event_date < from || b.event_date > (to || from)) continue;
    if (!bookedByDate[b.event_date]) bookedByDate[b.event_date] = [];
    if (b.event_hour) bookedByDate[b.event_date].push(b.event_hour as string);
  }
  return NextResponse.json({ bookedByDate, blockedByDate: {} });
}

// POST /api/availability — admin: add a block
// DELETE /api/availability?id=UUID — admin: remove a block
function isAdmin(req: NextRequest) {
  const { ok, locked } = checkAdminPin(req);
  return !locked && ok;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "missing body" }, { status: 400 });

  // Must have either block_date or weekday
  if (!body.block_date && body.weekday === undefined) {
    return NextResponse.json({ error: "block_date or weekday required" }, { status: 400 });
  }

  const record: Record<string, unknown> = {
    reason: String(body.reason || "").slice(0, 100),
    time_window: body.time_window ? String(body.time_window) : null,
  };
  if (body.block_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.block_date))) {
      return NextResponse.json({ error: "invalid block_date" }, { status: 400 });
    }
    record.block_date = String(body.block_date);
  }
  if (body.weekday !== undefined) {
    const wd = Number(body.weekday);
    if (wd < 0 || wd > 6) return NextResponse.json({ error: "weekday must be 0-6" }, { status: 400 });
    record.weekday = wd;
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  const { data, error } = await supabase.from("availability_blocks").insert(record).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, block: data });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  const { error } = await supabase.from("availability_blocks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
