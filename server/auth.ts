import type { Request, RequestHandler } from "express";
import { HttpError } from "./errors.js";
import { assertSupabaseAdmin } from "./supabase-admin.js";

export type StaffRole = "manager" | "owner" | "admin";

type RoleRank = Record<StaffRole, number>;

const roleRank: RoleRank = {
  manager: 1,
  owner: 2,
  admin: 3,
};

const STAFF_CACHE_TTL_MS = 15_000;
const DEFAULT_BRANCH_CODE = String(process.env.DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad";

const getDisplayOutletName = (branchCode: string, fallbackName: string) => {
  const normalizedBranchCode = String(branchCode ?? "").trim().toLowerCase();
  if (normalizedBranchCode.startsWith("karo")) {
    return "Káro Coffee Bar";
  }
  return fallbackName;
};

type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
};

type StaffOutletAccess = {
  outletId: string;
  branchCode: string;
  outletName: string;
  role: StaffRole;
};

export type StaffAccessContext = {
  user: AuthenticatedUser;
  roles: StaffRole[];
  highestRole: StaffRole | null;
  outlets: StaffOutletAccess[];
};

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
      staffAccess?: StaffAccessContext;
    }
  }
}

type StaffMembershipRow = {
  role: string | null;
  outlet_id: string | null;
  is_active: boolean | null;
  outlets:
    | {
        branch_code?: string | null;
        name?: string | null;
      }
    | Array<{
        branch_code?: string | null;
        name?: string | null;
      }>
    | null;
};

const staffContextCache = new Map<
  string,
  { expiresAt: number; value: StaffAccessContext }
>();

const normalizeRole = (value: string | null | undefined): StaffRole | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "manager" || normalized === "owner" || normalized === "admin") {
    return normalized;
  }
  return null;
};

const pickHighestRole = (roles: StaffRole[]): StaffRole | null => {
  if (!roles.length) {
    return null;
  }
  return [...roles].sort((a, b) => roleRank[b] - roleRank[a])[0];
};

const extractBearerToken = (req: Request) => {
  const rawAuth = String(req.headers.authorization ?? "").trim();
  if (!rawAuth.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return rawAuth.slice(7).trim();
};

const getBranchCodeFromRequest = (req: Request) => {
  const fromQuery = typeof req.query.branchCode === "string" ? req.query.branchCode.trim() : "";
  if (fromQuery) return fromQuery;

  const body = req.body as { branchCode?: unknown } | undefined;
  const fromBody = typeof body?.branchCode === "string" ? body.branchCode.trim() : "";
  if (fromBody) return fromBody;

  return DEFAULT_BRANCH_CODE;
};

const resolveAuthenticatedUser = async (req: Request): Promise<AuthenticatedUser> => {
  if (req.authenticatedUser) {
    return req.authenticatedUser;
  }

  const token = extractBearerToken(req);
  if (!token) {
    throw new HttpError(401, "Missing Authorization bearer token");
  }

  const supabase = assertSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) {
    throw new HttpError(401, "Invalid or expired authentication token");
  }

  const user = data.user;
  const email = String(user.email ?? "").trim().toLowerCase();
  if (!email) {
    throw new HttpError(401, "Authenticated user does not have an email");
  }

  const displayName =
    String(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "").trim() ||
    email.split("@")[0] ||
    "User";

  req.authenticatedUser = {
    id: user.id,
    email,
    displayName,
  };

  return req.authenticatedUser;
};

const resolveStaffContext = async (req: Request): Promise<StaffAccessContext> => {
  if (req.staffAccess) {
    return req.staffAccess;
  }

  const user = await resolveAuthenticatedUser(req);
  const now = Date.now();
  const cached = staffContextCache.get(user.id);
  if (cached && cached.expiresAt > now) {
    req.staffAccess = cached.value;
    return cached.value;
  }

  const supabase = assertSupabaseAdmin();
  const { data, error } = await supabase
    .from("staff_memberships")
    .select("role,outlet_id,is_active,outlets(branch_code,name)")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  if (error) {
    throw new HttpError(500, error.message);
  }

  const seen = new Set<string>();
  const outlets: StaffOutletAccess[] = [];
  const rolesSet = new Set<StaffRole>();

  for (const rawRow of (data ?? []) as StaffMembershipRow[]) {
    const role = normalizeRole(rawRow.role);
    if (!role) continue;

    const outletRelation = Array.isArray(rawRow.outlets)
      ? rawRow.outlets[0]
      : rawRow.outlets;

    const outletId = String(rawRow.outlet_id ?? "").trim();
    const branchCode = String(outletRelation?.branch_code ?? "").trim();
    const outletName = getDisplayOutletName(
      branchCode,
      String(outletRelation?.name ?? "").trim() || branchCode,
    );
    if (!outletId || !branchCode) {
      continue;
    }

    const dedupeKey = `${outletId}:${role}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    rolesSet.add(role);
    outlets.push({
      outletId,
      branchCode,
      outletName,
      role,
    });
  }

  const roles = Array.from(rolesSet).sort((a: StaffRole, b: StaffRole) => roleRank[b] - roleRank[a]);
  const context: StaffAccessContext = {
    user,
    roles,
    highestRole: pickHighestRole(roles),
    outlets,
  };

  staffContextCache.set(user.id, {
    expiresAt: now + STAFF_CACHE_TTL_MS,
    value: context,
  });
  req.staffAccess = context;
  req.authenticatedUser = user;
  return context;
};

export const requireAuthenticatedUser = (): RequestHandler => {
  return async (req, _res, next) => {
    try {
      await resolveAuthenticatedUser(req);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireStaffRole = (
  minimumRole: StaffRole,
  options?: { skipBranchCheck?: boolean },
): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const staff = await resolveStaffContext(req);
      if (!staff.highestRole) {
        throw new HttpError(403, "Staff access is required for this action");
      }

      if (roleRank[staff.highestRole] < roleRank[minimumRole]) {
        throw new HttpError(403, `Requires ${minimumRole} access`);
      }

      if (options?.skipBranchCheck) {
        next();
        return;
      }

      if (staff.highestRole === "admin") {
        next();
        return;
      }

      const branchCode = getBranchCodeFromRequest(req);
      const membershipForBranch = staff.outlets
        .filter((entry) => entry.branchCode === branchCode)
        .some((entry) => roleRank[entry.role] >= roleRank[minimumRole]);

      if (!membershipForBranch) {
        throw new HttpError(403, `No ${minimumRole} access for branch ${branchCode}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const getStaffAccessFromRequest = (req: Request) => req.staffAccess ?? null;

