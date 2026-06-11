"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket, Trophy, Users, Sparkles } from "lucide-react";

type Stats = {
  mission_target: number;
  parties_completed: number;
  progress_pct: number;
  total_guests: number;
  total_aura: number;
  ambassadors_count: number;
  leaderboard: { slug: string; name: string; aura: number }[];
};

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

export default function LivePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = () => fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
    load();
    const id = setInterval(() => {
      load();
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="mx-auto max-w-md p-5 pb-28">
      <Link href="/" className="mb-4 inline-block text-sm text-neon-cyan">→ חזרה לדף הבית</Link>

      <div className="text-center">
        <div className="mx-auto w-fit animate-float text-5xl">🚀</div>
        <h1 className="font-display text-3xl font-black">
          <span className="bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text text-transparent">
            Mission Control
          </span>
        </h1>
        <p className="mt-1 text-gray-300">המשימה: {stats?.mission_target ?? 100} מסיבות במעלה אדומים 🍭</p>
        <p className="text-xs text-gray-500">מתעדכן חי · עדכון אחרון לפני {(tick * 10) % 60} שניות</p>
      </div>

      <div className="card-glow mt-5">
        <div className="flex items-end justify-between">
          <p className="font-display text-5xl font-black text-neon-lime">{stats?.parties_completed ?? 0}</p>
          <p className="text-sm text-gray-400">/ {stats?.mission_target ?? 100} מסיבות הושלמו</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan transition-all duration-1000"
            style={{ width: `${stats?.progress_pct ?? 0}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">כל הזמנה מקרבת את כל העיר ליעד 🤝</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="card">
          <Users className="mx-auto mb-1 h-5 w-5 text-neon-cyan" />
          <p className="font-black text-neon-cyan">{stats?.total_guests ?? 0}</p>
          <p className="text-xs text-gray-400">ילדים שמחים</p>
        </div>
        <div className="card">
          <Sparkles className="mx-auto mb-1 h-5 w-5 text-neon-purple" />
          <p className="font-black text-neon-purple">{(stats?.total_aura ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400">אאורה עירונית ✨</p>
        </div>
        <div className="card">
          <Rocket className="mx-auto mb-1 h-5 w-5 text-neon-pink" />
          <p className="font-black text-neon-pink">{stats?.ambassadors_count ?? 0}</p>
          <p className="text-xs text-gray-400">שגרירים פעילים</p>
        </div>
      </div>

      <div className="card mt-4">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-neon-amber" />
          <h2 className="font-display font-bold">לוח האאורה של מעלה אדומים</h2>
        </div>
        {(!stats || stats.leaderboard.length === 0) && (
          <p className="text-sm text-gray-400">הפודיום ריק... מי יהיה הראשון? 👀</p>
        )}
        <div className="space-y-2">
          {stats?.leaderboard.map((a, i) => (
            <div key={a.slug} className={`flex items-center justify-between rounded-xl p-3 ${i === 0 ? "bg-neon-amber/10 ring-1 ring-neon-amber/40" : "bg-surface2"}`}>
              <span className="font-bold">{MEDALS[i]} {a.name}</span>
              <span className="font-black text-neon-purple">{a.aura.toLocaleString()} ✨</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg/90 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          <Link href="/ambassador" className="btn-ghost flex-1">לעלות ללוח ✨</Link>
          <Link href="/book" className="btn-primary flex-[2]">להוסיף מסיבה למשימה 🚀</Link>
        </div>
      </div>
    </main>
  );
}
