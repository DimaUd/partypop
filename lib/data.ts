export type Pack = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  desc: string;
  popular?: boolean;
};

export const PACKAGES: Pack[] = [
  { id: "basic", name: "צמר גפן בסיסי", emoji: "🍭", price: 350, desc: "שעה אחת · עד 25 מנות · מפעיל מקצועי" },
  { id: "party", name: "מסיבה מתוקה", emoji: "🎉", price: 550, desc: "שעתיים · עד 50 מנות · צבעים וטעמים", popular: true },
  { id: "mega", name: "מגה אירוע", emoji: "👑", price: 850, desc: "3 שעות · ללא הגבלה · עמדה מעוצבת + תאורה" }
];

export const HOURS = ["10:00", "12:00", "14:00", "16:00", "18:00"];

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
