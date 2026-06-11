import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

const MISSION_TARGET = 100; // 🚀 Mission: 100 parties in Ma'ale Adumim

// Public mission-control stats — no secrets, no phone numbers.
export async function GET() {
  const supabase = getServerSupabase();
  let bookings: any[] = [];
  let ambassadors: any[] = [];
  let rewards: any[] = [];

  if (supabase) {
    bookings = (await supabase.from("bookings").select("id,status,ambassador_slug,guests")).data || [];
    ambassadors = (await supabase.from("ambassadors").select("slug,name,parent_slug")).data || [];
    rewards = (await supabase.from("rewards").select("ambassador_slug,amount")).data || [];
  } else {
    bookings = store.bookings;
    ambassadors = store.ambassadors;
    rewards = store.rewards;
  }

  const completed = bookings.filter((b) => b.status === "completed_paid").length;
  const totalGuests = bookings.filter((b) => b.status === "completed_paid").reduce((s, b) => s + (b.guests || 0), 0);

  const leaderboard = ambassadors
    .map((a) => {
      const myBookings = bookings.filter((b) => b.ambassador_slug === a.slug).length;
      const recruits = ambassadors.filter((x) => x.parent_slug === a.slug).length;
      const earned = rewards.filter((r) => r.ambassador_slug === a.slug).reduce((s, r) => s + Number(r.amount || 0), 0);
      return { slug: a.slug, name: a.name, aura: myBookings * 1000 + recruits * 500 + earned * 10 };
    })
    .sort((x, y) => y.aura - x.aura)
    .slice(0, 5);

  const totalAura = leaderboard.reduce((s, a) => s + a.aura, 0) + completed * 1000;

  return NextResponse.json({
    mission_target: MISSION_TARGET,
    parties_completed: completed,
    progress_pct: Math.min(100, Math.round((completed / MISSION_TARGET) * 100)),
    total_guests: totalGuests,
    total_aura: totalAura,
    ambassadors_count: ambassadors.length,
    leaderboard
  });
}
