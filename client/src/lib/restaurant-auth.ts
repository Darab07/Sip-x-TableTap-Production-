const RESTAURANT_AUTH_PERSIST_KEY = "restaurant_auth_persist_v2"
const RESTAURANT_AUTH_SESSION_KEY = "restaurant_auth_session_v2"

const hasWindow = () => typeof window !== "undefined"

export type RestaurantAuthRole = "owner" | "manager" | "admin"

const normalizeRole = (value: string | null): RestaurantAuthRole | null => {
  if (value === "owner" || value === "manager" || value === "admin") {
    return value
  }

  // Backward compatibility with v1 boolean auth state.
  if (value === "1") {
    return "owner"
  }

  return null
}

const getStoredRole = () => {
  if (!hasWindow()) {
    return null
  }

  return (
    normalizeRole(localStorage.getItem(RESTAURANT_AUTH_PERSIST_KEY)) ??
    normalizeRole(sessionStorage.getItem(RESTAURANT_AUTH_SESSION_KEY))
  )
}

export const getRestaurantAuthenticatedRole = () => getStoredRole()

export const isRestaurantAuthenticated = (role?: RestaurantAuthRole) => {
  const storedRole = getStoredRole()
  if (!storedRole) {
    return false
  }

  if (!role) {
    return true
  }

  return storedRole === role
}

export const setRestaurantAuthenticated = (
  role: RestaurantAuthRole,
  rememberMe: boolean
) => {
  if (!hasWindow()) {
    return
  }

  if (rememberMe) {
    localStorage.setItem(RESTAURANT_AUTH_PERSIST_KEY, role)
    sessionStorage.removeItem(RESTAURANT_AUTH_SESSION_KEY)
    return
  }

  sessionStorage.setItem(RESTAURANT_AUTH_SESSION_KEY, role)
  localStorage.removeItem(RESTAURANT_AUTH_PERSIST_KEY)
}

export const clearRestaurantAuthentication = () => {
  if (!hasWindow()) {
    return
  }

  localStorage.removeItem(RESTAURANT_AUTH_PERSIST_KEY)
  sessionStorage.removeItem(RESTAURANT_AUTH_SESSION_KEY)
}
