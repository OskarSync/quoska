export type Plan = "free" | "team" | "business" | "pro";

export type Bundesland =
  | "baden-wuerttemberg"
  | "bayern"
  | "berlin"
  | "brandenburg"
  | "bremen"
  | "hamburg"
  | "hessen"
  | "mecklenburg-vorpommern"
  | "niedersachsen"
  | "nordrhein-westfalen"
  | "rheinland-pfalz"
  | "saarland"
  | "sachsen"
  | "sachsen-anhalt"
  | "schleswig-holstein"
  | "thueringen";

export const BUNDESLAENDER: readonly Bundesland[] = [
  "baden-wuerttemberg",
  "bayern",
  "berlin",
  "brandenburg",
  "bremen",
  "hamburg",
  "hessen",
  "mecklenburg-vorpommern",
  "niedersachsen",
  "nordrhein-westfalen",
  "rheinland-pfalz",
  "saarland",
  "sachsen",
  "sachsen-anhalt",
  "schleswig-holstein",
  "thueringen",
] as const;

export const BUNDESLAND_LABELS: Record<Bundesland, string> = {
  "baden-wuerttemberg": "Baden-Württemberg",
  bayern: "Bayern",
  berlin: "Berlin",
  brandenburg: "Brandenburg",
  bremen: "Bremen",
  hamburg: "Hamburg",
  hessen: "Hessen",
  "mecklenburg-vorpommern": "Mecklenburg-Vorpommern",
  niedersachsen: "Niedersachsen",
  "nordrhein-westfalen": "Nordrhein-Westfalen",
  "rheinland-pfalz": "Rheinland-Pfalz",
  saarland: "Saarland",
  sachsen: "Sachsen",
  "sachsen-anhalt": "Sachsen-Anhalt",
  "schleswig-holstein": "Schleswig-Holstein",
  thueringen: "Thüringen",
};

export type TenantInsert = Pick<
  import("./database").Tenant,
  "name" | "plan"
> & {
  plan?: Plan;
};

export type TenantUpdate = Partial<
  Pick<
    import("./database").Tenant,
    "name" | "plan" | "bundesland" | "setup_complete" | "stripe_customer_id"
  >
>;
