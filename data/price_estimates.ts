export const PRICE_ESTIMATES_USD: Record<string, number> = {
  "red lentils": 1.8,
  "black beans": 1.2,
  "tortillas": 2.5,
  "onion": 0.6,
  "garlic": 0.5,
  "tomatoes": 1.5,
  "spinach": 2.0,
  "lime": 0.7,
  "salsa": 3.0,
  "oil": 0.2,
  "salt": 0.05,
};

export function estimateItemCost(name: string): number {
  const key = (name || "").toLowerCase().trim();
  return PRICE_ESTIMATES_USD[key] ?? 1.5; // default guess
}
