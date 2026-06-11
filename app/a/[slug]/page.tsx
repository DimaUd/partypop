import Link from "next/link";
import { PACKAGES } from "@/lib/data";

export default function AmbassadorLanding({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  return (
    <main className="mx-auto max-w-md p-5 pb-28 text-center">
      <div className="mx-auto mt-8 flex h-20 w-20 animate-pulseRing items-center justify-center rounded-full bg-neon-purple/20 text-4xl shadow-glow-purple">🧑‍🚀</div>
      <h1 className="mt-4 font-display text-2xl font-bold">
        {slug} הזמין/ה אתכם ל-
        <span className="bg-gradient-to-r from-neon-pink to-neon-cyan bg-clip-text text-transparent"> PartyPop</span>
      </h1>
      <p className="mt-2 text-gray-300">צמר גפן ואטרקציות מתוקות לאירוע שלכם 🍭 קוד החבר שלכם כבר שמור!</p>

      <div className="mt-6 space-y-3 text-right">
        {PACKAGES.map((p) => (
          <div key={p.id} className="card flex items-center justify-between">
            <span className="font-bold">{p.emoji} {p.name}</span>
            <span className="price-tag">₪{p.price}</span>
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg/90 p-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Link href={`/book?ref=${encodeURIComponent(slug)}`} className="btn-primary w-full text-lg">הזמינו עם ההטבה של {slug} 🎁</Link>
        </div>
      </div>
    </main>
  );
}
