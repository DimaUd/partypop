import Link from "next/link";
import { getActivePackages } from "@/lib/packages";
import { Sparkles, Trophy, Share2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const packages = await getActivePackages();

  return (
    <main className="mx-auto max-w-md p-5 pb-28">
      <header className="mb-6 pt-6 text-center">
        <div className="mx-auto mb-3 w-fit animate-float text-6xl">🍭</div>
        <h1 className="font-display text-4xl font-bold">
          <span className="bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text text-transparent">
            PartyPop
          </span>
        </h1>
        <p className="mt-2 text-gray-300">אטרקציות מתוקות לאירוע שלכם — הזמנה ב-30 שניות ⚡</p>
        <Link href="/login" className="mt-2 inline-block text-sm text-neon-cyan">התחברות עם Google או SMS ←</Link>
      </header>

      <section className="space-y-4">
        {packages.map((p) => (
          <Link key={p.id} href={`/book?pack=${p.id}`} className={p.popular ? "card-glow block" : "card block"}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <h2 className="font-display text-lg font-bold">{p.name}</h2>
                  {p.popular && <span className="badge bg-neon-pink/15 text-neon-pink">הכי פופולרי</span>}
                </div>
                <p className="mt-1 text-sm text-gray-400">{p.desc}</p>
              </div>
              <span className="price-tag shrink-0">₪{p.price}</span>
            </div>
          </Link>
        ))}

        {/* Ambassador program — a first-class product on the homepage */}
        <Link href="/ambassador" className="block rounded-xl2 bg-surface p-4 ring-1 ring-neon-purple/50 shadow-glow-purple">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <h2 className="font-display text-lg font-bold text-neon-purple">תוכנית השגרירים</h2>
                <span className="badge bg-neon-lime/15 text-neon-lime">חינם!</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                שתפו חברים והרוויחו <span className="font-bold text-neon-lime">30₪</span> על כל אירוע ששולם והסתיים,
                ועוד <span className="font-bold text-neon-lime">10₪</span> מכל שגריר שתצרפו 🚀
              </p>
            </div>
            <span className="price-tag shrink-0 text-neon-lime">+₪</span>
          </div>
        </Link>
      </section>

      <section className="mt-8 grid grid-cols-3 gap-3 text-center">
        <div className="card">
          <Sparkles className="mx-auto mb-1 h-5 w-5 text-neon-cyan" />
          <p className="text-xs text-gray-300">הזמנה מהירה</p>
        </div>
        <Link href="/ambassador" className="card block">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-neon-purple" />
          <p className="text-xs text-gray-300">שגרירים מרוויחים</p>
        </Link>
        <div className="card">
          <Share2 className="mx-auto mb-1 h-5 w-5 text-neon-lime" />
          <p className="text-xs text-gray-300">שיתוף בוואטסאפ</p>
        </div>
      </section>

      <Link href="/live" className="card-glow mt-6 block text-center">
        <p className="font-display text-lg font-bold">🚀 Mission Control — שידור חי</p>
        <p className="mt-1 text-sm text-gray-400">המשימה: 100 מסיבות במעלה אדומים · לוח האאורה העירוני מתעדכן בלייב ✨</p>
      </Link>

      <Link href="/admin" className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-gray-500">
        <Users className="h-3 w-3" /> מצב הורים / ניהול
      </Link>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg/90 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          <Link href="/ambassador" className="btn-ghost flex-1">להיות שגריר 🏆</Link>
          <Link href="/book" className="btn-primary flex-[2] text-lg">הזמינו עכשיו 🚀</Link>
        </div>
      </div>
    </main>
  );
}
