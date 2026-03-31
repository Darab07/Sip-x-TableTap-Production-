// client/src/lib/userId.ts

const USER_ID_KEY = "tabletapDeviceUserId";

function generateUserId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 4 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

export function getOrCreateUserID(): string {
  const hasWindow = typeof window !== "undefined";
  if (!hasWindow) {
    return generateUserId();
  }

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = sessionStorage.getItem(USER_ID_KEY);
  }

  if (!userId) {
    userId = generateUserId();
  }

  localStorage.setItem(USER_ID_KEY, userId);
  sessionStorage.setItem(USER_ID_KEY, userId);
  return userId;
}
