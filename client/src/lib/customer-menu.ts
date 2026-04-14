const ENV_DEFAULT_BRANCH_CODE =
  String(import.meta.env.VITE_DEFAULT_BRANCH_CODE ?? "").trim() ||
  "f7-islamabad";

const TAKEAWAY_TABLE_NUMBER_BASE = 9000;

export type MenuRestaurantProfile = {
  slug: string;
  name: string;
  address: string;
  rating: number;
  reviews: number;
  servingTime: string;
  averageLabel: string;
  hours: string;
};

const DEFAULT_RESTAURANT_PROFILE: MenuRestaurantProfile = {
  slug: "sip",
  name: "SIP",
  address: "F-8/3, Islamabad",
  rating: 4.8,
  reviews: 2729,
  servingTime: "15 - 20 min",
  averageLabel: "Average serving time",
  hours: "8 AM - 1 AM",
};

const RESTAURANT_PROFILES: Record<string, MenuRestaurantProfile> = {
  sip: DEFAULT_RESTAURANT_PROFILE,
  karo: {
    slug: "karo",
    name: "Karo Cafe",
    address: "Roman Grove II, DHA 1",
    rating: 4.8,
    reviews: 100,
    servingTime: "15 - 20 min",
    averageLabel: "Average serving time",
    hours: "11 AM - 12 AM",
  },
};

const RESTAURANT_DEFAULT_BRANCH_BY_SLUG: Record<string, string> = {
  sip: ENV_DEFAULT_BRANCH_CODE,
  karo: "karo-dha-phase-7",
};

const BRANCH_CODE_REGEX = /^[a-z0-9][a-z0-9-_]*$/i;

const normalizeSegment = (value: string) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

const normalizeBranchCode = (value: string | null | undefined) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || !BRANCH_CODE_REGEX.test(normalized)) {
    return "";
  }
  return normalized;
};

export const getRestaurantSlugFromMenuPath = (pathname: string) => {
  const match = String(pathname ?? "").match(/^\/([^/]+)\/menu(?:\/|$)/i);
  if (!match?.[1]) {
    return "sip";
  }
  return normalizeSegment(match[1]) || "sip";
};

export const getRestaurantProfileForSlug = (
  restaurantSlug: string,
): MenuRestaurantProfile => {
  const normalized = normalizeSegment(restaurantSlug);
  return RESTAURANT_PROFILES[normalized] ?? {
    ...DEFAULT_RESTAURANT_PROFILE,
    slug: normalized || DEFAULT_RESTAURANT_PROFILE.slug,
    name: normalized ? normalized.toUpperCase() : DEFAULT_RESTAURANT_PROFILE.name,
  };
};

export const getMenuBasePathForSlug = (restaurantSlug: string) => {
  const normalized = normalizeSegment(restaurantSlug) || "sip";
  return `/${normalized}/menu`;
};

export const resolveMenuBranchCode = (
  pathname: string,
  search: string,
) => {
  const params = new URLSearchParams(search || "");
  const fromQuery = normalizeBranchCode(params.get("branchCode"));
  if (fromQuery) {
    return fromQuery;
  }

  const restaurantSlug = getRestaurantSlugFromMenuPath(pathname);
  return (
    RESTAURANT_DEFAULT_BRANCH_BY_SLUG[restaurantSlug] || ENV_DEFAULT_BRANCH_CODE
  ).toLowerCase();
};

export const getMenuTableIdentifier = (search: string) => {
  const params = new URLSearchParams(search || "");
  return params.get("table") ?? "Table1";
};

export const parseTableNumberFromIdentifier = (tableIdentifier: string) => {
  const normalized = String(tableIdentifier ?? "").trim();
  const lower = normalized.toLowerCase();
  const matchedNumber = Number((normalized.match(/(\d+)/)?.[1] ?? "1").trim()) || 1;
  if (lower.startsWith("takeaway") || lower.startsWith("stand")) {
    return TAKEAWAY_TABLE_NUMBER_BASE + Math.max(1, matchedNumber) - 1;
  }
  return Math.max(1, matchedNumber);
};

export const parseTableNumberFromLabel = (label: string | null | undefined) => {
  const normalized = String(label ?? "").trim();
  if (!normalized) return 0;
  const lower = normalized.toLowerCase();
  const matchedNumber = Number((normalized.match(/(\d+)/)?.[1] ?? "0").trim()) || 0;
  if (lower.startsWith("takeaway") || lower.startsWith("stand")) {
    return TAKEAWAY_TABLE_NUMBER_BASE + Math.max(1, matchedNumber) - 1;
  }
  return matchedNumber;
};

export const buildMenuQueryString = (input: {
  tableIdentifier?: string;
  branchCode?: string;
  restaurantSlug?: string;
}) => {
  const params = new URLSearchParams();
  if (input.tableIdentifier) {
    params.set("table", input.tableIdentifier);
  }
  if (input.branchCode) {
    params.set("branchCode", input.branchCode);
  }
  if (input.restaurantSlug) {
    params.set("restaurant", normalizeSegment(input.restaurantSlug) || "sip");
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};
