const RESTAURANT_AUTH_PERSIST_KEY = "restaurant_staff_session_persist_v3"
const RESTAURANT_AUTH_SESSION_KEY = "restaurant_staff_session_session_v3"
const RESTAURANT_AUTH_MODE_KEY = "restaurant_staff_session_mode_v3"

const hasWindow = () => typeof window !== "undefined"

export type RestaurantAuthRole = "owner" | "manager" | "admin"

export type RestaurantAuthenticatedSession = {
  user: {
    id: string
    email: string
    displayName: string
  }
  highestRole: RestaurantAuthRole
  roles: RestaurantAuthRole[]
  outlets: Array<{
    outletId: string
    branchCode: string
    outletName: string
    role: RestaurantAuthRole
  }>
}

const normalizeRole = (value: unknown): RestaurantAuthRole | null => {
  if (value === "owner" || value === "manager" || value === "admin") {
    return value
  }
  return null
}

const normalizeSession = (
  raw: unknown,
): RestaurantAuthenticatedSession | null => {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const candidate = raw as {
    user?: { id?: unknown; email?: unknown; displayName?: unknown }
    highestRole?: unknown
    roles?: unknown
    outlets?: unknown
  }

  const highestRole = normalizeRole(candidate.highestRole)
  const userId = String(candidate.user?.id ?? "").trim()
  const userEmail = String(candidate.user?.email ?? "").trim().toLowerCase()
  const displayName = String(candidate.user?.displayName ?? "").trim()

  if (!highestRole || !userId || !userEmail) {
    return null
  }

  const roles = Array.isArray(candidate.roles)
    ? candidate.roles
        .map((role) => normalizeRole(role))
        .filter((role): role is RestaurantAuthRole => role !== null)
    : [highestRole]

  const outlets = Array.isArray(candidate.outlets)
    ? candidate.outlets
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null
          }
          const row = entry as {
            outletId?: unknown
            branchCode?: unknown
            outletName?: unknown
            role?: unknown
          }
          const role = normalizeRole(row.role)
          const outletId = String(row.outletId ?? "").trim()
          const branchCode = String(row.branchCode ?? "").trim()
          const outletName = String(row.outletName ?? "").trim()
          if (!role || !outletId || !branchCode || !outletName) {
            return null
          }
          return {
            outletId,
            branchCode,
            outletName,
            role,
          }
        })
        .filter(
          (
            entry,
          ): entry is RestaurantAuthenticatedSession["outlets"][number] =>
            entry !== null,
        )
    : []

  return {
    user: {
      id: userId,
      email: userEmail,
      displayName: displayName || userEmail.split("@")[0] || "User",
    },
    highestRole,
    roles: roles.length ? roles : [highestRole],
    outlets,
  }
}

const readStoredSession = (key: string) => {
  if (!hasWindow()) {
    return null
  }

  const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    return normalizeSession(parsed)
  } catch {
    return null
  }
}

const getStoredSession = () => {
  if (!hasWindow()) {
    return null
  }

  const persistedRaw = window.localStorage.getItem(RESTAURANT_AUTH_PERSIST_KEY)
  if (persistedRaw) {
    try {
      const parsed = JSON.parse(persistedRaw)
      const normalized = normalizeSession(parsed)
      if (normalized) {
        return normalized
      }
    } catch {
      // noop
    }
  }

  const sessionRaw = window.sessionStorage.getItem(RESTAURANT_AUTH_SESSION_KEY)
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw)
      const normalized = normalizeSession(parsed)
      if (normalized) {
        return normalized
      }
    } catch {
      // noop
    }
  }

  return null
}

export const getRestaurantAuthenticatedSession = () => getStoredSession()

export const getRestaurantAuthenticatedRole = () => getStoredSession()?.highestRole ?? null

export const isRestaurantAuthenticated = (role?: RestaurantAuthRole) => {
  const session = getStoredSession()
  if (!session) {
    return false
  }

  if (!role) {
    return true
  }

  return session.highestRole === role
}

export const setRestaurantAuthenticated = (
  session: RestaurantAuthenticatedSession,
  rememberMe: boolean,
) => {
  if (!hasWindow()) {
    return
  }

  const payload = JSON.stringify(session)
  if (rememberMe) {
    window.localStorage.setItem(RESTAURANT_AUTH_PERSIST_KEY, payload)
    window.sessionStorage.removeItem(RESTAURANT_AUTH_SESSION_KEY)
    window.localStorage.setItem(RESTAURANT_AUTH_MODE_KEY, "persist")
    return
  }

  window.sessionStorage.setItem(RESTAURANT_AUTH_SESSION_KEY, payload)
  window.localStorage.removeItem(RESTAURANT_AUTH_PERSIST_KEY)
  window.localStorage.setItem(RESTAURANT_AUTH_MODE_KEY, "session")
}

export const clearRestaurantAuthentication = () => {
  if (!hasWindow()) {
    return
  }

  window.localStorage.removeItem(RESTAURANT_AUTH_PERSIST_KEY)
  window.sessionStorage.removeItem(RESTAURANT_AUTH_SESSION_KEY)
  window.localStorage.removeItem(RESTAURANT_AUTH_MODE_KEY)
}

export const getRestaurantAuthStorageMode = () => {
  if (!hasWindow()) {
    return null
  }
  const value = window.localStorage.getItem(RESTAURANT_AUTH_MODE_KEY)
  return value === "persist" || value === "session" ? value : null
}

