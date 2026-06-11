"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { HOURS, waLink } from "@/lib/data";
import { MAALE_ADUMIM_STREETS, SERVICE_CITY } from "@/lib/streets";

type Pack = { id: string; name: string; emoji: string; price: number; desc: string; popular?: boolean };
type Addon = { id: string; name: string; emoji: string; price: number; partner: string };

type AvailData = {
  bookedByDate: Record<string, string[]>;      // date -> booked hours
  blockedByDate: Record<string, { hours: string[]; allDay: boolean; reason: string }>;
};

const MONTH_NAMES_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const DAY_NAMES_HE = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function BookingWizard() {
  const params = useSearchParams();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selAddons, setSelAddons] = useState<string[]>([]);
  const [social, setSocial] = useState(false);
  const [step, setStep] = useState(0);
  const [packId, setPackId] = useState(params.get("pack") || "");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("16:00");
  const [street, setStreet] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const address = street ? `${street} ${houseNo}, ${SERVICE_CITY}`.trim() : "";
  const [guests, setGuests] = useState(20);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [power, setPower] = useState(true);
  const [parking, setParking] = useState(true);
  const [notes, setNotes] = useState("");
  const [ref, setRef] = useState("");
  const coupon = params.get("coupon") || "";
  const [payMethod, setPayMethod] = useState<"bit" | "cash" | "kashcash">("bit");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error" | "taken" | "blocked">("idle");

  // Availability calendar state
  const [avail, setAvail] = useState<AvailData>({ bookedByDate: {}, blockedByDate: {} });
  const [calMonth, setCalMonth] = useState(() => {
    const t = new Date(); t.setDate(1); return t;
  });

  const fetchAvail = useCallback(() => {
    const today = new Date();
    const from = toDateStr(today);
    const to = toDateStr(addMonths(today, 2));
    fetch(`/api/availability?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => setAvail(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((d) => {
        setPacks(d.packages || []);
        setAddons(d.addons || []);
        if (!packId && d.packages?.length) setPackId(d.packages.find((p: Pack) => p.popular)?.id || d.packages[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch availability when entering step 1
  useEffect(() => {
    if (step === 1) fetchAvail();
  }, [step, fetchAvail]);

  useEffect(() => {
    const fromUrl = params.get("ref");
    const saved = typeof window !== "undefined" ? localStorage.getItem("pp_ref") : null;
    if (fromUrl) {
      localStorage.setItem("pp_ref", fromUrl);
      setRef(fromUrl);
    } else if (saved) setRef(saved);
  }, [params]);

  const pack = useMemo(() => packs.find((p) => p.id === packId) || packs[0], [packs, packId]);
  const addonsTotal = useMemo(() => addons.filter((a) => selAddons.includes(a.id)).reduce((s, a) => s + a.price, 0), [addons, selAddons]);
  const total = (pack?.price || 0) + addonsTotal - (social ? 30 : 0);

  // Calendar grid helpers
  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [calMonth]);

  const today = useMemo(() => toDateStr(new Date()), []);

  function getDayStatus(d: Date): 'past' | 'blocked' | 'booked' | 'available' {
    const ds = toDateStr(d);
    if (ds < today) return 'past';
    const bl = avail.blockedByDate[ds];
    if (bl?.allDay) return 'blocked';
    const booked = avail.bookedByDate[ds] || [];
    // Check if ALL hours are taken (booked + blocked specific hours)
    const blockedHours = bl?.hours || [];
    const takenHours = new Set([...booked, ...blockedHours]);
    const allTaken = HOURS.every((h) => takenHours.has(h));
    if (allTaken) return 'booked';
    return 'available';
  }

  // Available hours for selected date
  const availHours = useMemo(() => {
    if (!date) return HOURS;
    const booked = avail.bookedByDate[date] || [];
    const bl = avail.blockedByDate[date];
    if (bl?.allDay) return [];
    const blocked = bl?.hours || [];
    const taken = new Set([...booked, ...blocked]);
    return HOURS.filter((h) => !taken.has(h));
  }, [date, avail]);

  function toggleAddon(id: string) {
    setSelAddons((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  const canNext = step === 0 ? !!pack : step === 1 ? !!date && !!hour && availHours.includes(hour) && availHours.length > 0 : !!street && !!houseNo && !!name && phone.length >= 9;

  async function submit() {
    if (!pack) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id, packName: pack.name, price: pack.price, date, hour, address, guests, name, phone, power, parking, notes: coupon ? `[קופון ${coupon}] ${notes}` : notes, ref, payMethod, addons: selAddons, social })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.code === "hour_taken") { setStatus("taken"); return; }
        if (body?.code === "blocked") { setStatus("blocked"); return; }
        throw new Error("bad status");
      }
      localStorage.setItem("pp_amb_name", name); // every customer becomes an ambassador in one tap
      setStatus("done");
      fetchAvail(); // refresh availability after booking
    } catch {
      setStatus("error");
    }
  }

  if (status === "done" && pack) {
    const opPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "972500000000";
    const bitLink = process.env.NEXT_PUBLIC_BIT_LINK || "";
    const kashLink = process.env.NEXT_PUBLIC_KASHCASH_LINK || "https://www.kashcash.co.il/";
    const msg = `היי! הזמנתי ${pack.name} ל-${date} בשעה ${hour} בכתובת ${address}. שם: ${name}. מקדמה: ${payMethod === "bit" ? "Bit" : payMethod === "kashcash" ? "KashCash" : "מזומן ביום האירוע"}`;
    return (
      <div className="card-glow space-y-4 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="font-display text-2xl font-bold text-neon-lime">ההזמנה התקבלה!</h2>
        <p className="badge mx-auto w-fit bg-neon-purple/15 text-neon-purple">+1000 אאורה ✨</p>

        {payMethod === "bit" && (
          <div className="space-y-2">
            <p className="text-gray-300">מקדמה ₪100 ב-Bit למספר <span dir="ltr" className="font-bold text-neon-cyan">{`0${opPhone.slice(3)}`}</span> 💙</p>
            {bitLink ? (
              <a href={bitLink} target="_blank" rel="noreferrer" className="btn-cyan w-full">פתיחת Bit לתשלום ⚡</a>
            ) : (
              <p className="text-xs text-gray-500">פותחים את אפליקציית Bit ← שולחים למספר למעלה</p>
            )}
          </div>
        )}
        {payMethod === "kashcash" && (
          <div className="space-y-2">
            <p className="text-gray-300">מקדמה ₪100 ב-KashCash 🟣</p>
            <a href={kashLink} target="_blank" rel="noreferrer" className="btn-cyan w-full">פתיחת KashCash ⚡</a>
          </div>
        )}
        {payMethod === "cash" && (
          <p className="text-gray-300">בחרתם מזומן 💵 — המקדמה ₪100 תשולם ביום האירוע. ההזמנה תאושר סופית בוואטסאפ.</p>
        )}

        {social && (
          <p className="rounded-xl bg-neon-lime/10 p-3 text-sm text-neon-lime">📸 אל תשכחו: צלמו, העלו לרשתות ותייגו אותנו — ואחרי אימות 30₪ חוזרים אליכם!</p>
        )}
        <p className="text-xs text-gray-500">🔒 לעולם לא נבקש פרטי אשראי ב-SMS — תשלום רק דרך האפליקציות הרשמיות</p>
        <a href={waLink(opPhone, msg)} className="btn-whatsapp w-full">שלחו לנו אישור בוואטסאפ 💬</a>
        <Link href="/ambassador" className="btn-primary w-full">הפכו לשגרירים עכשיו — הלינק שלכם מוכן 🏆</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-neon-pink" : "bg-surface2"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">בחרו חבילה 🍭</h2>
          {packs.length === 0 && <div className="card text-gray-400">טוען חבילות...</div>}
          {packs.map((p) => (
            <button key={p.id} onClick={() => setPackId(p.id)} className={`${p.id === packId ? "card-glow" : "card"} w-full text-right`}>
              <div className="flex items-center justify-between">
                <span className="font-bold">{p.emoji} {p.name}</span>
                <span className="price-tag">₪{p.price}</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">{p.desc}</p>
            </button>
          ))}

          {addons.length > 0 && (
            <div className="card space-y-2">
              <h3 className="font-display font-bold">תוספות ממפעילים שותפים 🤝</h3>
              <p className="text-xs text-gray-400">מחיר אחד, אירוע אחד — אנחנו מתאמים הכל יחד</p>
              {addons.map((a) => (
                <button key={a.id} onClick={() => toggleAddon(a.id)} className={`chip w-full justify-between ${selAddons.includes(a.id) ? "chip-on" : "chip-off"} flex`}>
                  <span>{a.emoji} {a.name} <span className="opacity-70">· {a.partner}</span></span>
                  <span>₪{a.price}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-display text-xl font-bold">מתי חוגגים? 🎂</h2>

            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCalMonth((m) => addMonths(m, -1))}
                disabled={calMonth <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
                className="chip chip-off px-3 disabled:opacity-30"
              >‹</button>
              <span className="font-bold text-neon-cyan">
                {MONTH_NAMES_HE[calMonth.getMonth()]} {calMonth.getFullYear()}
              </span>
              <button
                onClick={() => setCalMonth((m) => addMonths(m, 1))}
                className="chip chip-off px-3"
              >›</button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
              {DAY_NAMES_HE.map((d) => <div key={d}>{d}</div>)}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((d, i) => {
                if (!d) return <div key={`e${i}`} />;
                const ds = toDateStr(d);
                const status = getDayStatus(d);
                const isSelected = ds === date;
                const isToday = ds === today;

                let cls = "relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ";
                if (isSelected) cls += "bg-neon-pink text-white shadow-lg shadow-neon-pink/40 ";
                else if (status === 'past') cls += "text-gray-600 cursor-not-allowed ";
                else if (status === 'blocked') cls += "bg-red-900/40 text-red-400 cursor-not-allowed ";
                else if (status === 'booked') cls += "bg-orange-900/40 text-orange-400 cursor-not-allowed ";
                else cls += "bg-surface2 text-white hover:bg-neon-pink/20 cursor-pointer ";

                return (
                  <button
                    key={ds}
                    disabled={status === 'past' || status === 'blocked' || status === 'booked'}
                    onClick={() => {
                      setDate(ds);
                      // Auto-select first available hour
                      const todayAvailHours = (() => {
                        const booked = avail.bookedByDate[ds] || [];
                        const bl = avail.blockedByDate[ds];
                        if (bl?.allDay) return [];
                        const blocked = bl?.hours || [];
                        const taken = new Set([...booked, ...blocked]);
                        return HOURS.filter((h) => !taken.has(h));
                      })();
                      if (todayAvailHours.length > 0 && !todayAvailHours.includes(hour)) {
                        setHour(todayAvailHours[0]);
                      }
                    }}
                    className={cls}
                  >
                    {d.getDate()}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-neon-cyan" />
                    )}
                    {status === 'blocked' && (
                      <span className="absolute -top-0.5 -right-0.5 text-[8px]">🚫</span>
                    )}
                    {status === 'booked' && (
                      <span className="absolute -top-0.5 -right-0.5 text-[8px]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-surface2 border border-white/10" />זמין</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-orange-900/40" />תפוס</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-900/40" />חסום</span>
            </div>
          </div>

          {date && (
            <div className="card space-y-3">
              <label className="label">
                שעה ל-{new Date(date + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </label>
              {availHours.length === 0 ? (
                <p className="rounded-xl bg-red-900/30 p-3 text-sm text-red-400 text-center">
                  😔 אין שעות פנויות בתאריך הזה — בחרו תאריך אחר
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {HOURS.map((h) => {
                    const isAvail = availHours.includes(h);
                    return (
                      <button
                        key={h}
                        disabled={!isAvail}
                        onClick={() => setHour(h)}
                        className={`chip ${!isAvail ? "chip-off opacity-30 cursor-not-allowed line-through" : h === hour ? "chip-on" : "chip-off"}`}
                      >{h}</button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="card">
            <label className="label">כמה אורחים? ({guests})</label>
            <input type="range" min={5} max={100} step={5} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full accent-[#FF007A]" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="font-display text-xl font-bold">פרטים אחרונים ⚡</h2>
          <div>
            <label className="label">כתובת האירוע 📍 <span className="badge bg-neon-cyan/15 text-neon-cyan">פועלים כרגע במעלה אדומים בלבד</span></label>
            <div className="grid grid-cols-[1fr_84px] gap-2">
              <input className="input" list="ma-streets" placeholder="התחילו להקליד רחוב..." value={street} onChange={(e) => setStreet(e.target.value)} />
              <input className="input text-center" inputMode="numeric" placeholder="מס׳" value={houseNo} onChange={(e) => setHouseNo(e.target.value)} />
            </div>
            <datalist id="ma-streets">
              {MAALE_ADUMIM_STREETS.map((st) => (
                <option key={st} value={st} />
              ))}
            </datalist>
            {street && !MAALE_ADUMIM_STREETS.includes(street) && (
              <p className="mt-1 text-xs text-neon-amber">⚠️ לא מצאנו רחוב כזה במעלה אדומים — בדקו את האיות</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">שם</label>
              <input className="input" placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">טלפון</label>
              <input className="input" inputMode="tel" placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPower(!power)} className={`chip ${power ? "chip-on" : "chip-off"}`}>⚡ יש חשמל</button>
            <button onClick={() => setParking(!parking)} className={`chip ${parking ? "chip-on" : "chip-off"}`}>🅿️ יש חניה</button>
          </div>
          <button onClick={() => setSocial(!social)} className={`chip w-full text-right ${social ? "chip-on" : "chip-off"}`}>
            📸 אצלם את המסיבה, אעלה לרשתות ואתייג אתכם → <span className="font-black">30₪ הנחה!</span>
          </button>
          <div>
            <label className="label">איך תשלמו את המקדמה (₪100)?</label>
            <div className="flex gap-2">
              <button onClick={() => setPayMethod("bit")} className={`chip flex-1 ${payMethod === "bit" ? "chip-on" : "chip-off"}`}>Bit 💙</button>
              <button onClick={() => setPayMethod("cash")} className={`chip flex-1 ${payMethod === "cash" ? "chip-on" : "chip-off"}`}>מזומן 💵</button>
              <button onClick={() => setPayMethod("kashcash")} className={`chip flex-1 ${payMethod === "kashcash" ? "chip-on" : "chip-off"}`}>KashCash 🟣</button>
            </div>
          </div>
          <div>
            <label className="label">הערות (לא חובה)</label>
            <input className="input" placeholder="קומה, קוד שער, אלרגיות..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {coupon && <p className="badge w-fit bg-neon-lime/15 text-neon-lime">קופון {coupon} — 10% הנחה מגלריית Moments 🎁</p>}
          {ref && <p className="badge w-fit bg-neon-purple/15 text-neon-purple">הוזמנתם ע״י שגריר: {ref} 🎁</p>}
          {status === "error" && <p className="rounded-xl bg-neon-pink/15 p-3 text-sm text-neon-pink">משהו השתבש — נסו שוב או שלחו לנו וואטסאפ.</p>}
          {status === "taken" && <p className="rounded-xl bg-orange-500/15 p-3 text-sm text-orange-400">😔 השעה הזו כבר תפוסה — חזרו לשלב הקודם ובחרו שעה אחרת.</p>}
          {status === "blocked" && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-400">🚫 התאריך/שעה חסומים — חזרו לשלב הקודם ובחרו מועד אחר.</p>}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg/90 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          {step > 0 && <button onClick={() => setStep(step - 1)} className="btn-ghost">חזרה</button>}
          {step < 2 ? (
            <button disabled={!canNext} onClick={() => setStep(step + 1)} className="btn-primary flex-1 disabled:opacity-40">המשך ⚡</button>
          ) : (
            <button disabled={!canNext || status === "sending"} onClick={submit} className="btn-primary flex-1 disabled:opacity-40">
              {status === "sending" ? "שולחים..." : pack ? `אישור הזמנה · ₪${total}` : "אישור הזמנה"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function BookPage() {
  return (
    <main className="mx-auto max-w-md p-5 pb-28">
      <Link href="/" className="mb-4 inline-block text-sm text-neon-cyan">→ חזרה לדף הבית</Link>
      <Suspense fallback={<div className="card">טוען...</div>}>
        <BookingWizard />
      </Suspense>
    </main>
  );
}
