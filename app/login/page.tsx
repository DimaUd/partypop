"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabaseClient";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/ambassador";
  const supabase = getBrowserSupabase();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"choose" | "sms-code">("choose");
  const [msg, setMsg] = useState("");

  async function googleLogin() {
    if (!supabase) {
      setMsg("מצב דמו: התחברות Google תופעל אחרי חיבור Supabase (דקה אחת בהגדרות). ממשיכים בינתיים בלי התחברות 👍");
      setTimeout(() => router.push(next), 1500);
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` }
    });
  }

  async function sendSms() {
    const intl = phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    if (intl.length < 11) {
      setMsg("מספר טלפון לא תקין");
      return;
    }
    if (!supabase) {
      setMsg("מצב דמו: קוד SMS יישלח באמת אחרי חיבור Supabase. הקלידו 1234 להמשך 😉");
      setStage("sms-code");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ phone: `+${intl}` });
    if (error) setMsg(error.message);
    else {
      setMsg("שלחנו קוד ב-SMS 📲");
      setStage("sms-code");
    }
  }

  async function verifySms() {
    if (!supabase) {
      if (code === "1234") router.push(next);
      else setMsg("במצב דמו הקוד הוא 1234");
      return;
    }
    const intl = phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const { error } = await supabase.auth.verifyOtp({ phone: `+${intl}`, token: code, type: "sms" });
    if (error) setMsg("קוד שגוי — נסו שוב");
    else router.push(next);
  }

  return (
    <main className="mx-auto max-w-md p-5">
      <Link href="/" className="mb-4 inline-block text-sm text-neon-cyan">→ חזרה לדף הבית</Link>
      <div className="card-glow mt-8 space-y-4 text-center">
        <div className="animate-float text-5xl">🧑‍🚀</div>
        <h1 className="font-display text-2xl font-bold">התחברות מהירה</h1>
        <p className="text-sm text-gray-400">בלי סיסמאות. שתי שניות ואתם בפנים ⚡</p>

        {stage === "choose" && (
          <>
            <button onClick={googleLogin} className="btn-ghost w-full">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.66l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.5.75 3.6 3.33 1.71 7.1l3.66 2.84C6.27 7.2 8.91 5.04 12 5.04z"/><path fill="#4285F4" d="M23.25 12.27c0-.92-.08-1.6-.26-2.31H12v4.37h6.44c-.13 1.08-.83 2.7-2.39 3.79l3.57 2.77c2.14-1.97 3.63-4.88 3.63-8.62z"/><path fill="#FBBC05" d="M5.37 14.06A6.9 6.9 0 0 1 5 12c0-.72.13-1.41.35-2.06L1.71 7.1A11.2 11.2 0 0 0 .75 12c0 1.81.43 3.52 1.2 5.04l3.42-2.98z"/><path fill="#34A853" d="M12 23.25c3.04 0 5.59-1 7.45-2.72l-3.57-2.77c-.95.66-2.23 1.12-3.88 1.12-3.09 0-5.73-2.16-6.63-5.1l-3.4 2.97C3.84 20.67 7.62 23.25 12 23.25z"/></svg>
              המשך עם Google
            </button>
            <div className="flex items-center gap-3 text-xs text-gray-500"><span className="h-px flex-1 bg-white/10" />או<span className="h-px flex-1 bg-white/10" /></div>
            <div className="text-right">
              <label className="label">התחברות עם SMS 📱</label>
              <input className="input" inputMode="tel" placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <button onClick={sendSms} className="btn-primary w-full">שלחו לי קוד</button>
          </>
        )}

        {stage === "sms-code" && (
          <>
            <div className="text-right">
              <label className="label">הקוד שקיבלתם ב-SMS</label>
              <input className="input text-center text-xl tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="••••" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <button onClick={verifySms} className="btn-primary w-full">אישור והתחברות ⚡</button>
            <button onClick={() => setStage("choose")} className="btn-ghost w-full">חזרה</button>
          </>
        )}

        {msg && <p className="rounded-xl bg-neon-cyan/10 p-3 text-sm text-neon-cyan">{msg}</p>}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md p-5"><div className="card">טוען...</div></main>}>
      <LoginInner />
    </Suspense>
  );
}
