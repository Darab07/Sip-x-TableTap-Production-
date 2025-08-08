// client/src/lib/userId.ts

const USER_ID_KEY = "tempUserId";

function generateUserId(): string {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  const numbers = Math.floor(100 + Math.random() * 900); // ensures 3 digits
  return `${letters}${numbers}`;
}

export function getOrCreateUserID(): string {
  let userId = sessionStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUserId();
    sessionStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}
