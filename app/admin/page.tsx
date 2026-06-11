"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Booking = {
  id: number | string; pack_name: string; price: number; event_date: string; event_hour: string;
  address: string; customer_name: string; customer_phone: string; ambassador_slug: string; status: string;
  payment_method?: string; deposit_paid?: boolean;
  social_optin?: boolean; social_verified?: boolean; discount?: number;
  addons?: string[]; addons_total?: number; gallery?: string[];
};
type Pack = { id: string; name: string; emoji: string; price: number; desc: string; popular?: boolean };
type Amb = {
  slug: string; name: string; parent_slug: string | null; recruits: string[];
  bookings_total: number; bookings_completed: number; earned: number; paid_out: number; pending_payout: number;
};
type AvailBlock = {
  id: string;
  block_date: string | null;
  weekday: number | null;
  time_window: string | null;
  reason: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין לאישור",
  confirmed: "מאושר",
  completed_paid: "שולם והסתיים ✓",
  cancelled: "בוטל"
};

const WEEKDAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HOURS = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"];

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<"bookings" | "packages" | "ambassadors" | "availability">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [ambs, setAmbs] = useState<Amb[]>([]);
  const [blocks, setBlocks] = useState<AvailBlock[]>([]);
  const [error, setError] = useState("");
  const [newPack, setNewPack] = useState({ name: "", emoji: "🍭", price: "", desc: "" });

  // New block form state
  const [blockType, setBlockType] = useState<"date" | "weekday">("date");
  const [blockDate, setBlockDate] = useState("");
  const [blockWeekday, setBlockWeekday] = useState<number>(6); // Sat default
  const [blockHour, setBlockHour] = useState<string>(""); // empty = all day
  const [blockReason, setBlockReason] = useState("");

  const H = () => ({ "Content-Type": "application/json", "x-admin-pin": pin });

  async function loadAll(p = pin) {
    const h = { "x-admin-pin": p };
    const [b, pk, a, av] = await Promise.all([
      fetch("/api/bookings", { headers: h }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/packages").then((r) => r.json()),
      fetch("/api/ambassadors", { headers: h }).then((r) => (r.ok ? r.json() : { ambassadors: [] })),
      fetch("/api/availability/blocks", { headers: h }).then((r) => (r.ok ? r.json() : { blocks: [] }))
    ]);
    setBookings(b.bookings || []);
    setPacks(pk.packages || []);
    setAmbs(a.ambassadors || []);
    setBlocks(av.blocks || []);
  }

  async function addBlock() {
    const payload: Record<string, unknown> = { reason: blockReason, time_window: blockHour || null };
    if (blockType === "date") payload.block_date = blockDate;
    else payload.weekday = blockWeekday;
    await fetch("/api/availability", { method: "POST", headers: H(), body: JSON.stringify(payload) });
    setBlockDate(""); setBlockReason(""); setBlockHour("");
    loadAll();
  }

  async function removeBlock(id: string) {
    await fetch(`/api/availability?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: H() });
    loadAll();
  }

  async function unlock() {
    setError("");
    try {
      await loadAll();
      setUnlocked(true);
    } catch {
      setError("קוד שגוי — נסו שוב");
    }
  }

  async function setStatus(id: Booking["id"], status: string) {
    await fetch("/api/bookings", { method: "PATCH", headers: H(), body: JSON.stringify({ id, status }) });
    loadAll();
  }

  async function confirmDeposit(id: Booking["id"]) {
    await fetch("/api/bookings", { method: "PATCH", headers: H(), body: JSON.stringify({ id, deposit: true }) });
    loadAll();
  }

  async function uploadMoments(id: Booking["id"], files: FileList | null) {
    if (!files || files.length === 0) return;
    const toDataUrl = (f: File) =>
      new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(f);
      });
    const photos = await Promise.all(Array.from(files).slice(0, 10).map(toDataUrl));
    await fetch("/api/moments", { method: "POST", headers: H(), body: JSON.stringify({ id, photos }) });
    loadAll();
  }

  async function verifySocial(id: Booking["id"]) {
    await fetch("/api/bookings", { method: "PATCH", headers: H(), body: JSON.stringify({ id, social: true }) });
    loadAll();
  }

  async function addPack() {
    if (!newPack.name || !newPack.price) return;
    await fetch("/api/packages", { method: "POST", headers: H(), body: JSON.stringify({ ...newPack, price: Number(newPack.price) }) });
    setNewPack({ name: "", emoji: "🍭", price: "", desc: "" });
    loadAll();
  }

  async function removePack(id: string) {
    await fetch(`/api/packages?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: H() });
    loadAll();
  }

  async function payOut(slug: string) {
    await fetch("/api/ambassadors", { method: "PATCH", headers: H(), body: JSON.stringify({ slug }) });
    loadAll();
  }

  if (!unlocked) {
    return (
      <main className="mx-auto max-w-md p-5">
        <Link href="/" className="mb-4 inline-block text-sm text-neon-cyan">→ חזרה לדף הבית</Link>
        <div className="card mt-10 space-y-4 text-center">
          <div className="text-4xl">🔐</div>
          <h1 className="font-display text-xl font-bold">מצב הורים</h1>
          <p className="text-sm text-gray-400">הזינו קוד PIN לניהול העסק</p>
          <input className="input text-center tracking-widest" inputMode="numeric" maxLength={6} placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value)} />
          {error && <p className="rounded-xl bg-neon-pink/15 p-2 text-sm text-neon-pink">{error}</p>}
          <button onClick={unlock} className="btn-primary w-full">כניסה</button>
        </div>
      </main>
    );
  }

  const completed = bookings.filter((b) => b.status === "completed_paid");
  const bookingTotal = (b: Booking) => (b.price || 0) + (b.addons_total || 0) - (b.discount || 0);
  const revenue = completed.reduce((s, b) => s + bookingTotal(b), 0);
  const platformFees = completed.reduce((s, b) => s + Math.round((b.addons_total || 0) * 0.15), 0);
  const pendingCommissions = ambs.reduce((s, a) => s + a.pending_payout, 0);

  return (
    <main className="mx-auto max-w-md p-5 pb-16">
      <h1 className="font-display text-2xl font-bold">לוח בקרה 📊</h1>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="card"><p className="font-black text-neon-cyan">{bookings.length}</p><p className="text-xs text-gray-400">הזמנות</p></div>
        <div className="card"><p className="font-black text-neon-lime">₪{revenue.toLocaleString()}</p><p className="text-xs text-gray-400">הכנסות ששולמו</p></div>
        <div className="card"><p className="font-black text-neon-amber">₪{pendingCommissions}</p><p className="text-xs text-gray-400">עמלות שגרירים</p></div>
      </div>
      <div className="card mt-3 text-center"><p className="font-black text-neon-purple">₪{platformFees}</p><p className="text-xs text-gray-400">הכנסות פלטפורמה משותפים (15% מתוספות שהושלמו) 🤝</p></div>

      <div className="mt-5 grid grid-cols-4 gap-1">
        <button onClick={() => setTab("bookings")} className={`chip text-xs ${tab === "bookings" ? "chip-on" : "chip-off"}`}>📅 הזמנות</button>
        <button onClick={() => setTab("packages")} className={`chip text-xs ${tab === "packages" ? "chip-on" : "chip-off"}`}>🍭 חבילות</button>
        <button onClick={() => setTab("ambassadors")} className={`chip text-xs ${tab === "ambassadors" ? "chip-on" : "chip-off"}`}>🏆 שגרירים</button>
        <button onClick={() => setTab("availability")} className={`chip text-xs ${tab === "availability" ? "chip-on" : "chip-off"}`}>🗓️ זמינות</button>
      </div>

      {tab === "bookings" && (
        <div className="mt-4 space-y-3">
          {bookings.length === 0 && <div className="card text-gray-400">אין הזמנות עדיין — שתפו את הלינק והתחילו! 🚀</div>}
          {bookings.map((b) => (
            <div key={b.id} className="card">
              <div className="flex items-center justify-between">
                <span className="font-bold">{b.customer_name}</span>
                <span className="price-tag">₪{bookingTotal(b)}</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">{b.pack_name} · {b.event_date} {b.event_hour}</p>
              <p className="text-sm text-gray-400">{b.address} · {b.customer_phone}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`badge ${b.status === "completed_paid" ? "bg-neon-lime/15 text-neon-lime" : b.status === "confirmed" ? "bg-neon-cyan/15 text-neon-cyan" : b.status === "cancelled" ? "bg-gray-500/15 text-gray-400" : "bg-neon-amber/15 text-neon-amber"}`}>
                  {STATUS_LABEL[b.status] || b.status}
                </span>
                {b.ambassador_slug && <span className="badge bg-neon-purple/15 text-neon-purple">שגריר: {b.ambassador_slug}</span>}
                <span className="badge bg-surface2 text-gray-300">
                  {b.payment_method === "cash" ? "מזומן 💵" : b.payment_method === "kashcash" ? "KashCash 🟣" : "Bit 💙"}
                </span>
                {b.deposit_paid ? (
                  <span className="badge bg-neon-lime/15 text-neon-lime">מקדמה ₪100 ✓</span>
                ) : (
                  <span className="badge bg-neon-pink/15 text-neon-pink">מקדמה לא שולמה</span>
                )}
                {b.social_verified ? (
                  <span className="badge bg-neon-lime/15 text-neon-lime">📸 תיוג אומת · 30₪- הנחה</span>
                ) : b.social_optin ? (
                  <span className="badge bg-neon-amber/15 text-neon-amber">📸 הבטיח/ה לתייג</span>
                ) : null}
              </div>
              {(b.addons?.length || 0) > 0 && (
                <p className="mt-2 rounded-xl bg-surface2 p-2 text-xs text-gray-300">
                  🤝 שותפים: {b.addons!.join(", ")} · ₪{b.addons_total} ·{" "}
                  <span className="text-neon-cyan">עמלת פלטפורמה (15%): ₪{Math.round((b.addons_total || 0) * 0.15)}</span>
                </p>
              )}
              {b.status === "completed_paid" && (
                <div className="mt-3 space-y-2">
                  {(b.gallery?.length || 0) === 0 ? (
                    <label className="btn-cyan w-full cursor-pointer py-2 text-sm">
                      📸 העלאת עד 10 תמונות מהאירוע → גלריית Moments
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadMoments(b.id, e.target.files)} />
                    </label>
                  ) : (
                    <div className="flex gap-2">
                      <a href={`/moments/${b.id}`} target="_blank" rel="noreferrer" className="btn-ghost flex-1 py-2 text-sm">צפייה בגלריה ({b.gallery!.length}) 🖼️</a>
                      <a
                        href={`https://wa.me/972${b.customer_phone.replace(/[^0-9]/g, "").replace(/^0/, "")}?text=${encodeURIComponent(`היי ${b.customer_name}! 🍭 התמונות מהאירוע שלכם מוכנות + קופון 10% לאירוע הבא: ${typeof window !== "undefined" ? window.location.origin : ""}/moments/${b.id}`)}`}
                        target="_blank" rel="noreferrer" className="btn-whatsapp flex-1 py-2 text-sm"
                      >שליחה להורים 💬</a>
                    </div>
                  )}
                </div>
              )}
              {b.social_optin && !b.social_verified && b.status !== "cancelled" && (
                <button onClick={() => verifySocial(b.id)} className="btn-ghost mt-3 w-full py-2 text-sm">ראיתי את התיוג ברשתות — אישור 30₪ הנחה 📸</button>
              )}
              {!b.deposit_paid && b.status !== "cancelled" && (
                <button onClick={() => confirmDeposit(b.id)} className="btn-ghost mt-3 w-full py-2 text-sm">המקדמה התקבלה (Bit/מזומן/KashCash) ✓</button>
              )}
              {b.status === "pending" && (
                <button onClick={() => setStatus(b.id, "confirmed")} className="btn-cyan mt-3 w-full py-2 text-sm">אישור הזמנה ✓</button>
              )}
              {b.status === "confirmed" && (
                <button onClick={() => setStatus(b.id, "completed_paid")} className="btn-primary mt-3 w-full py-2 text-sm">
                  הלקוח שילם והאירוע הסתיים — שחרור עמלות 💸
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "packages" && (
        <div className="mt-4 space-y-3">
          <div className="card-glow space-y-3">
            <h2 className="font-display font-bold">הוספת חבילה חדשה ➕</h2>
            <div className="grid grid-cols-[1fr_72px] gap-2">
              <input className="input" placeholder="שם החבילה" value={newPack.name} onChange={(e) => setNewPack({ ...newPack, name: e.target.value })} />
              <input className="input text-center" placeholder="🍭" value={newPack.emoji} onChange={(e) => setNewPack({ ...newPack, emoji: e.target.value })} />
            </div>
            <input className="input" inputMode="numeric" placeholder="מחיר ב-₪" value={newPack.price} onChange={(e) => setNewPack({ ...newPack, price: e.target.value })} />
            <input className="input" placeholder="תיאור קצר (משך, כמות, מה כלול)" value={newPack.desc} onChange={(e) => setNewPack({ ...newPack, desc: e.target.value })} />
            <button onClick={addPack} disabled={!newPack.name || !newPack.price} className="btn-primary w-full disabled:opacity-40">הוסיפו חבילה — תופיע מיד באתר ⚡</button>
          </div>
          {packs.map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-bold">{p.emoji} {p.name} <span className="text-neon-cyan">₪{p.price}</span></p>
                <p className="text-sm text-gray-400">{p.desc}</p>
              </div>
              <button onClick={() => removePack(p.id)} className="btn-ghost px-3 py-2 text-sm">הסרה 🗑️</button>
            </div>
          ))}
        </div>
      )}

      {tab === "ambassadors" && (
        <div className="mt-4 space-y-3">
          {ambs.length === 0 && <div className="card text-gray-400">אין שגרירים עדיין — שלחו לחברים את /ambassador 🚀</div>}
          {ambs.map((a) => (
            <div key={a.slug} className="card">
              <div className="flex items-center justify-between">
                <p className="font-bold">🧑‍🚀 {a.name} <span className="text-sm text-gray-400">/{a.slug}</span></p>
                <span className="price-tag text-neon-lime">₪{a.pending_payout}</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                {a.bookings_total} הזמנות · {a.bookings_completed} הושלמו · שולם עד כה ₪{a.paid_out}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.parent_slug && <span className="badge bg-neon-cyan/15 text-neon-cyan">גויס ע״י: {a.parent_slug}</span>}
                {a.recruits.length > 0 && <span className="badge bg-neon-purple/15 text-neon-purple">גייס {a.recruits.length} שגרירים: {a.recruits.join(", ")}</span>}
              </div>
              {a.pending_payout > 0 && (
                <button onClick={() => payOut(a.slug)} className="btn-cyan mt-3 w-full py-2 text-sm">סימון ₪{a.pending_payout} כשולם לשגריר ✓</button>
              )}
            </div>
          ))}
          <p className="text-center text-xs text-gray-500">💡 עמלות נוצרות אוטומטית רק כשמסמנים הזמנה כ"שולם והסתיים"</p>
        </div>
      )}

      {tab === "availability" && (
        <div className="mt-4 space-y-4">
          {/* Add new block */}
          <div className="card-glow space-y-3">
            <h2 className="font-display font-bold">חסימת תאריך / שעה ➕</h2>

            {/* Block type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setBlockType("date")}
                className={`chip flex-1 text-sm ${blockType === "date" ? "chip-on" : "chip-off"}`}
              >
                📅 תאריך ספציפי
              </button>
              <button
                onClick={() => setBlockType("weekday")}
                className={`chip flex-1 text-sm ${blockType === "weekday" ? "chip-on" : "chip-off"}`}
              >
                🔁 יום שבועי קבוע
              </button>
            </div>

            {blockType === "date" ? (
              <input
                type="date"
                className="input"
                min={new Date().toISOString().split("T")[0]}
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
              />
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {WEEKDAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setBlockWeekday(i)}
                    className={`chip text-xs ${blockWeekday === i ? "chip-on" : "chip-off"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Hour selector — empty = all day */}
            <div>
              <p className="mb-1 text-xs text-gray-400">שעה ספציפית (ריק = חסימת כל היום)</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setBlockHour("")}
                  className={`chip text-xs ${blockHour === "" ? "chip-on" : "chip-off"}`}
                >
                  כל היום
                </button>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setBlockHour(h)}
                    className={`chip text-xs ${blockHour === h ? "chip-on" : "chip-off"}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <input
              className="input"
              placeholder="סיבה (אופציונלי) — חג, תחזוקה..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />

            <button
              onClick={addBlock}
              disabled={blockType === "date" && !blockDate}
              className="btn-primary w-full disabled:opacity-40"
            >
              חסום {blockType === "weekday" ? `כל יום ${WEEKDAY_LABELS[blockWeekday]}` : blockDate} {blockHour ? `בשעה ${blockHour}` : "— כל היום"} 🔒
            </button>
          </div>

          {/* Existing blocks list */}
          {blocks.length === 0 ? (
            <div className="card text-center text-sm text-gray-400">
              אין חסימות פעילות — כל הלוח פתוח להזמנות 🟢
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-300">חסימות פעילות ({blocks.length})</h3>
              {blocks.map((bl) => (
                <div key={bl.id} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm">
                      {bl.weekday !== null
                        ? <span className="text-neon-amber">🔁 כל יום {WEEKDAY_LABELS[bl.weekday]}</span>
                        : <span className="text-neon-cyan">📅 {bl.block_date}</span>
                      }
                      {bl.time_window
                        ? <span className="text-gray-300"> · {bl.time_window}</span>
                        : <span className="text-gray-400"> · כל היום</span>
                      }
                    </p>
                    {bl.reason && <p className="mt-0.5 text-xs text-gray-400">{bl.reason}</p>}
                  </div>
                  <button
                    onClick={() => removeBlock(bl.id)}
                    className="btn-ghost shrink-0 px-3 py-1 text-xs text-neon-pink"
                  >
                    הסרה 🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-500">
            💡 חסימה שבועית חוסמת כל שבוע את אותו יום (למשל — כל שישי). חסימת תאריך — פעם אחת בלבד.
          </p>
        </div>
      )}
    </main>
  );
}
