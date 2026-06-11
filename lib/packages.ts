import { getServerSupabase } from "@/lib/supabase";
import { store, StorePackage } from "@/lib/store";

export async function getActivePackages(): Promise<StorePackage[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { data } = await supabase.from("packages").select("*").eq("active", true).order("price");
    if (data && data.length) return data as StorePackage[];
  }
  return store.packages.filter((p) => p.active);
}
