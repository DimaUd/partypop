"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { waLink } from "@/lib/data";

type Moment = {
  id: string | number;
  pack_name: string;
  event_date: string;
  ambassador_slug: string;
  coupon: string;
  photos: string[];
};

export default function MomentsPage() {
  const params = useParams<{ id: string }>();
  const [moment, setMoment] = useState<Moment | null | "loading">("loading");

  useEffect(() => {
    fetch(`/api/moments?id=${encodeURIComponent(params.id)}`)
      .then((r) => r.json())
      .then((d) => setMoment(d.moment))
      .catch(() => setMoment(null));
  }, [params.id]);

  if (moment === "loading") {
    return <main className="mx-auto max-w-md p-5"><div className="card">טוען רגעים מתוקים... 🍭</div></main>;
  }
  if (!moment) {
    return (
      <main className="mx-auto max-w-md p-5 text-center">
        <div className="card mt-10">
          <p className="text-4xl">🤷</p>
          <p className="mt-2 text-gray-300">הגלריה הזו עדיין לא קיימת</p>
          <Link href="/" className="btn-primary mt-4 w-full">לדף הבית</Link>
        </div>
      </main>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pageUrl = `${origin}/moments/${moment.id}`;
  const shareText = `🍭✨ תראו איזה אירוע היה לנו! ${moment.pack_name} עם PartyPop. כל התמונות כאן + קופון 10% הנחה לאירוע שלכם 👉 ${pageUrl}`;
  const bookHref = `/book?coupon=${moment.coupon}${moment.ambassador_slug ? `&ref=${moment.ambassador_slug}` : ""}`;

  return (
    <main className="mx-auto max-w-md p-5 pb-32">
      <div className="text-center">
        <div className="mx-auto w-fit animate-float text-4xl">🍭</div>
        <h1 className="font-display text-2xl font-bold">
          <span className="bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text text-transparent">PartyPop Moments</span>
        </h1>
        <p className="mt-1 text-gray-300">{moment.pack_name} · {moment.event_date} 🎉</p>
        {moment.ambassador_slug && (
          <p className="badge mx-auto mt-2 w-fit bg-neon-purple/15 text-neon-purple">האירוע הגיע בזכות השגריר/ה {moment.ambassador_slug} ✨</p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {moment.photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p} alt={`תמונה ${i + 1} מהאירוע`} className={`w-full rounded-xl2 object-cover ${i === 0 ? "col-span-2 aspect-video" : "aspect-square"}`} />
        ))}
      </div>

      <div className="card-glow mt-5 text-center">
        <p className="text-sm text-gray-300">🎁 מתנה לכל מי שצופה בגלריה:</p>
        <p className="font-display text-2xl font-black text-neon-lime">10% הנחה לאירוע הבא</p>
        <p className="price-tag mx-auto mt-2 w-fit">קוד: {moment.coupon}</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg/90 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          <a href={waLink("", shareText)} target="_blank" rel="noreferrer" className="btn-whatsapp flex-1">שיתוף למשפחה 💬</a>
          <Link href={bookHref} className="btn-primary flex-1">גם אנחנו רוצים! 🚀</Link>
        </div>
      </div>
    </main>
  );
}
