// Shared in-memory store — demo mode only (used when Supabase env vars are missing).
// In production with Supabase configured, all data lives in PostgreSQL.

export type StorePackage = { id: string; name: string; emoji: string; price: number; desc: string; popular?: boolean; active: boolean };
export type StoreAmbassador = { slug: string; name: string; phone?: string; parent_slug?: string | null; created_at: string };
export type StoreBooking = {
  id: number; pack_id: string; pack_name: string; price: number; event_date: string; event_hour: string;
  address: string; guests: number; customer_name: string; customer_phone: string; has_power: boolean;
  has_parking: boolean; notes: string; ambassador_slug: string; status: string; payment_method: string; deposit_paid: boolean;
  social_optin: boolean; social_verified: boolean; discount: number;
  addons: string[]; addons_total: number; gallery: string[]; created_at: string;
};
export type StoreReward = { id: number; ambassador_slug: string; booking_id: number; amount: number; level: 1 | 2; approved: boolean; paid: boolean; created_at: string };

type Store = {
  packages: StorePackage[];
  ambassadors: StoreAmbassador[];
  bookings: StoreBooking[];
  rewards: StoreReward[];
  seq: number;
};

const g = globalThis as any;

if (!g.__PP_STORE__) {
  g.__PP_STORE__ = {
    packages: [
      { id: "basic", name: "צמר גפן בסיסי", emoji: "🍭", price: 350, desc: "שעה אחת · עד 25 מנות · מפעיל מקצועי", active: true },
      { id: "party", name: "מסיבה מתוקה", emoji: "🎉", price: 550, desc: "שעתיים · עד 50 מנות · צבעים וטעמים", popular: true, active: true },
      { id: "mega", name: "מגה אירוע", emoji: "👑", price: 850, desc: "3 שעות · ללא הגבלה · עמדה מעוצבת + תאורה", active: true }
    ],
    ambassadors: [],
    bookings: [],
    rewards: [],
    seq: 1
  } satisfies Store;
}

export const store: Store = g.__PP_STORE__;

export const SOCIAL_DISCOUNT = 30;   // ₪ off when the customer films + tags the operator on social
export const PLATFORM_FEE_PCT = 15;  // % platform commission on partner-operator add-ons

// Partner add-ons — other operators who join the event (collaborations).
// In production this becomes an `addons` table per city/operator.
export type StoreAddon = { id: string; name: string; emoji: string; price: number; partner: string };
export const ADDONS: StoreAddon[] = [
  { id: "popcorn", name: "דוכן פופקורן", emoji: "🍿", price: 300, partner: "תומר" },
  { id: "slush", name: "מכונת ברד", emoji: "🧊", price: 350, partner: "נועה" },
  { id: "balloons", name: "אומן בלונים", emoji: "🎈", price: 400, partner: "עידן" }
];

export const COMMISSION_L1 = 30; // ₪ to the direct ambassador
export const COMMISSION_L2 = 10; // ₪ to the ambassador who recruited them

export function nextId() {
  return store.seq++;
}

// Creates commissions for a booking — called ONLY when the event is paid + completed.
export function createCommissions(booking: StoreBooking) {
  if (!booking.ambassador_slug) return [];
  const created: StoreReward[] = [];
  const direct = store.ambassadors.find((a) => a.slug === booking.ambassador_slug);
  const already = store.rewards.some((r) => r.booking_id === booking.id);
  if (already) return [];
  created.push({ id: nextId(), ambassador_slug: booking.ambassador_slug, booking_id: booking.id, amount: COMMISSION_L1, level: 1, approved: true, paid: false, created_at: new Date().toISOString() });
  if (direct?.parent_slug) {
    created.push({ id: nextId(), ambassador_slug: direct.parent_slug, booking_id: booking.id, amount: COMMISSION_L2, level: 2, approved: true, paid: false, created_at: new Date().toISOString() });
  }
  store.rewards.push(...created);
  return created;
}
