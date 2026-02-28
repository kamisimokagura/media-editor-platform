import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface PackageResponseItem {
  id: string;
  name: string;
  credits: number;
  priceJpy: number;
  stripePriceId: string | null;
}

const FALLBACK_PACKAGES: PackageResponseItem[] = [
  {
    id: "pack-s",
    name: "Pack S",
    credits: 200,
    priceJpy: 1980,
    stripePriceId: process.env.STRIPE_PRICE_PACK_S ?? null,
  },
  {
    id: "pack-m",
    name: "Pack M",
    credits: 600,
    priceJpy: 4980,
    stripePriceId: process.env.STRIPE_PRICE_PACK_M ?? null,
  },
  {
    id: "pack-l",
    name: "Pack L",
    credits: 1500,
    priceJpy: 9800,
    stripePriceId: process.env.STRIPE_PRICE_PACK_L ?? null,
  },
  {
    id: "lifetime",
    name: "Lifetime",
    credits: -1,
    priceJpy: 14800,
    stripePriceId: process.env.STRIPE_PRICE_LIFETIME ?? null,
  },
];

function getPackStripePriceId(name: string): string | null {
  const mapping: Record<string, string | undefined> = {
    "Pack S": process.env.STRIPE_PRICE_PACK_S,
    "Pack M": process.env.STRIPE_PRICE_PACK_M,
    "Pack L": process.env.STRIPE_PRICE_PACK_L,
    "Lifetime": process.env.STRIPE_PRICE_LIFETIME,
  };
  return mapping[name] ?? null;
}

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function GET() {
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  if (!hasSupabaseConfig()) {
    return NextResponse.json({
      source: "fallback",
      stripeConfigured,
      packages: FALLBACK_PACKAGES,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("ai_credit_packages")
      .select("id,name,credits,price_jpy,stripe_price_id,is_active")
      .eq("is_active", true)
      .order("price_jpy", { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        source: "fallback",
        stripeConfigured,
        packages: FALLBACK_PACKAGES,
      });
    }

    const packages: PackageResponseItem[] = data.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      priceJpy: pkg.price_jpy,
      stripePriceId: getPackStripePriceId(pkg.name) ?? pkg.stripe_price_id,
    }));

    return NextResponse.json({
      source: "supabase",
      stripeConfigured,
      packages,
    });
  } catch {
    return NextResponse.json({
      source: "fallback",
      stripeConfigured,
      packages: FALLBACK_PACKAGES,
    });
  }
}
