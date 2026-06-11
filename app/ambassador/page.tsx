"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Trophy, Gift, Sparkles, Users } from "lucide-react";
import { waLink } from "@/lib/data";

const AURA_TITLES = [
  { min: 0, title: "NPC 😴" },
  { min: 1000, title: "Main Character ⭐" },
  { min: 5000, title: "Aura Farmer 🌾✨" },
  { min: 15000, title: "Sigma 🗿" },
  { min: 30000, title: "אגדה מהלכת 👑" }
];

const TIERS = [
  { name: "ברונזה", emoji: "🥉", min: 0 },
  { name: "כסף", emoji: "🥈", min: 3 },
  { name: "זהב", emoji: "🥇", min: 7 },
  { name: "יהלום", emoji: "💎", min: 15 }
];

type Stats = {
  slug: string; name: string; parent_slug: string | null; recruits: string[];
  bookings_total: number; bookings_completed: number;
  earned: number; paid_out: number; pending_payout: number;
};

function AmbassadorInner() {
  const params = useSearchParams();
  const parentRef = params.get("ref") || "";
  const [name, setName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const slug = useMemo(() => name.trim().replace(/\s+/g, "-").toLowerCase(), [name]);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://partypop.vercel.app";
  const link = slug ? `${origin}/a/${slug}` : "";
  const recruitLink = slug ? `${origin}/ambassador?ref=${slug}` : "";
  const shareText = `🍭✨ POV: הזמנתם צמר גפן והאאורה של המסיבה עלתה ב-1000. הכי ASMR שיש, הזמנה ב-30 שניות. ההטבה שלי בפנים 👉 ${link}`;
  const recruitText = `🚀 בואו להרוויח כסף בכיף! הצטרפו כשגרירים של PartyPop דרכי: ${recruitLink}`;
  const qr = link ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=FF007A&bgcolor=161632&data=${encodeURIComponent(link)}` : "";

  useEffect(() => {
    const saved = localStorage.getItem("pp_amb_name");
    if (saved) setName(saved);
  }, []);

  async function register() {
    if (!slug) return;
    localStorage.setItem("pp_amb_name", name);
    await fetch("/api/ambassadors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, parent: parentRef })
    }).catch(() => {});
    setRegistered(true);
    refreshStats();
  }

  async function refreshStats() {
    if (!slug) return;
    const d = await fetch(`/api/ambassadors?slug=${encodeURIComponent(slug)}`).then((r) => r.json()).catch(() => null);
    if (d?.ambassador) setStats(d.ambassador);
  }

  const completed = stats?.bookings_completed ?? 0;
  const aura = (stats?.bookings_total ?? 0) * 1000 + (stats?.recruits.length ?? 0) * 500 + (stats?.earned ?? 0) * 10;
  const auraTitle = AURA_TITLES.filter((t) => aura >= t.min).slice(-1)[0].title;
  const tier = TIERS.filter((t) => completed >= t.min).slice(-1)[0];
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];

  return (
    <main className="mx-auto max-w-md p-5 pb-28">
      <Link href="/" className="mb-4 inline-block text-sm text-neon-cyan">→ חזרה לדף הבית</Link>
      <h1 className="font-display text-2xl font-bold">מועדון השגרירים 🏆</h1>
      <p className="mt-1 text-gray-300">
        30₪ על כל אירוע <span className="font-bold text-neon-lime">ששולם והסתיים</span> דרככם · 10₪ מכל אירוע של שגריר שצירפתם 🤝
      </p>
      <Link href="/login?next=/ambassador" className="mt-1 inline-block text-sm text-neon-cyan">התחברות עם Google / SMS ←</Link>

      {parentRef && !registered && (
        <p className="badge mt-3 w-fit bg-neon-purple/15 text-neon-purple">מצטרפים דרך השגריר: {parentRef} 🤝</p>
      )}

      <div className="card mt-4 space-y-3">
        <label className="label">איך קוראים לך?</label>
        <input className="input" placeholder="למשל: דני" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={register} disabled={!slug} className="btn-primary w-full disabled:opacity-40">
          {registered ? "מעודכן! ✓" : "צרו לי לינק שגריר ⚡"}
        </button>
        {link && registered && (
          <div className="rounded-xl bg-surface2 p-3 text-center">
            <p className="text-xs text-gray-400">הלינק האישי שלך:</p>
            <p className="break-all font-bold text-neon-cyan">{link}</p>
          </div>
        )}
      </div>

      {registered && link && (
        <>
          <div className="card mt-4 flex flex-col items-center gap-3">
            {qr && <img src={qr} alt="קוד QR אישי" width={160} height={160} className="rounded-xl" />}
            <p className="text-sm text-gray-400">סרקו אותי במסיבה 📱</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <a href={waLink("", shareText)} className="btn-whatsapp" target="_blank" rel="noreferrer">שיתוף ללקוחות 💬</a>
            <button onClick={() => navigator.clipboard?.writeText(shareText)} className="btn-cyan">העתקת לינק 🔗</button>
          </div>

          <div className="card mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-neon-purple" />
              <p className="font-bold">גייסו שגרירים — הרוויחו גם מהם! 🤝</p>
            </div>
            <p className="text-sm text-gray-400">כל שגריר שמצטרף דרככם מזכה אתכם ב-10₪ על כל אירוע שלו ששולם והסתיים.</p>
            <a href={waLink("", recruitText)} className="btn-ghost w-full" target="_blank" rel="noreferrer">הזמינו חבר להיות שגריר 🚀</a>
            {stats && stats.recruits.length > 0 && (
              <p className="badge w-fit bg-neon-purple/15 text-neon-purple">השגרירים שלך: {stats.recruits.join(", ")}</p>
            )}
          </div>

          <div className="card mt-4 text-center">
            <p className="text-xs text-gray-400">האאורה שלך ✨</p>
            <p className="bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text font-display text-4xl font-black text-transparent">{aura.toLocaleString()}</p>
            <p className="mt-1 font-bold text-neon-purple">{auraTitle}</p>
            <p className="mt-1 text-xs text-gray-500">כל הזמנה +1000 · כל שגריר שגייסת +500 · כל ₪ שהרווחת +10</p>
          </div>

          <div className="card-glow mt-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-neon-amber" />
              <div>
                <p className="font-bold">הדרגה שלך: {tier.emoji} שגריר {tier.name}</p>
                <p className="text-sm text-gray-400">
                  {completed} אירועים שהושלמו{nextTier ? ` · עוד ${nextTier.min - completed} לדרגת ${nextTier.name} ${nextTier.emoji}` : " · הדרגה הגבוהה ביותר! 👑"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="card text-center">
              <Gift className="mx-auto mb-1 h-5 w-5 text-neon-lime" />
              <p className="font-black text-neon-lime">₪{stats?.pending_payout ?? 0}</p>
              <p className="text-xs text-gray-400">ממתין לתשלום</p>
            </div>
            <div className="card text-center">
              <Sparkles className="mx-auto mb-1 h-5 w-5 text-neon-cyan" />
              <p className="font-black text-neon-cyan">₪{stats?.paid_out ?? 0}</p>
              <p className="text-xs text-gray-400">שולם לך</p>
            </div>
            <div className="card text-center">
              <Trophy className="mx-auto mb-1 h-5 w-5 text-neon-purple" />
              <p className="font-black text-neon-purple">{stats?.bookings_total ?? 0}</p>
              <p className="text-xs text-gray-400">הזמנות דרכך</p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">💡 העמלה נכנסת רק אחרי שהלקוח שילם והאירוע הסתיים</p>
          <button onClick={refreshStats} className="btn-ghost mt-3 w-full">רענון נתונים 🔄</button>
        </>
      )}
    </main>
  );
}

export default function AmbassadorPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md p-5"><div className="card">טוען...</div></main>}>
      <AmbassadorInner />
    </Suspense>
  );
}
