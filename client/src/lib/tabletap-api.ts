// Shared types mirrored from server
export type TableSessionStatus = "active" | "finished";
export type GroupOrderStatus = "active" | "closed";
export type PersonalCartStatus = "open" | "migrated";

export interface TableSession {
  id: string;
  tableId: string;
  status: TableSessionStatus;
  startedAt: number;
  endedAt?: number;
}

export interface Person {
  id: string;
  tableSessionId: string;
  deviceFingerprint: string;
  lastSeenAt: number;
}

export interface PersonalCart {
  id: string;
  tableSessionId: string;
  personId: string;
  status: PersonalCartStatus;
  createdAt: number;
  updatedAt: number;
}

export interface PersonalCartItem {
  id: string;
  personalCartId: string;
  menuItemId: string;
  qty: number;
  price: number;
  notes?: string;
  addedAt: number;
}

export interface GroupOrder {
  id: string;
  tableSessionId: string;
  status: GroupOrderStatus;
  createdByPersonId: string;
  createdAt: number;
  closedAt?: number;
}

export interface GroupOrderMember {
  id: string;
  groupOrderId: string;
  personId: string;
  joinedAt: number;
}

export interface GroupOrderItem {
  id: string;
  groupOrderId: string;
  fromPersonId: string;
  menuItemId: string;
  qty: number;
  price: number;
  notes?: string;
  addedAt: number;
}

export interface AttachResponse {
  tableSession: TableSession;
  person: Person;
  personalCart: PersonalCart;
  personalCartItems: PersonalCartItem[];
  activeGroupOrder?: GroupOrder;
  groupOrderItems: GroupOrderItem[];
  groupOrderMembers: GroupOrderMember[];
}

const API_BASE = "/api";

export const getDeviceFingerprint = () => {
  const key = "tabletapp_device_fingerprint";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  // Falls back to crypto.randomUUID when available, else a timestamp + random suffix.
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, id);
  return id;
};

const handleJson = async (res: Response) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with ${res.status}`);
  }
  return res.json();
};

export const attachToTableSession = async (
  tableId: string,
  deviceFingerprint: string,
): Promise<AttachResponse> => {
  const res = await fetch(`${API_BASE}/table-session/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableId, deviceFingerprint }),
  });
  return handleJson(res);
};

export const addItemsForPerson = async (input: {
  tableSessionId: string;
  personId: string;
  items: Array<{ menuItemId: string; qty: number; price: number; notes?: string }>;
}) => {
  const res = await fetch(`${API_BASE}/orders/add-item`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson(res) as Promise<
    | { destination: "personal"; cartItems: PersonalCartItem[] }
    | { destination: "group"; groupItems: GroupOrderItem[] }
  >;
};

export const removePersonalItem = async (input: {
  tableSessionId: string;
  personId: string;
  menuItemId: string;
}) => {
  const res = await fetch(`${API_BASE}/orders/remove-item`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson(res) as Promise<{ removed: PersonalCartItem | null }>;
};

export const createGroupOrder = async (tableSessionId: string, personId: string) => {
  const res = await fetch(`${API_BASE}/group-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableSessionId, personId }),
  });
  return handleJson(res) as Promise<{
    groupOrder: GroupOrder;
    members: GroupOrderMember[];
    items: GroupOrderItem[];
  }>;
};

export const joinGroupOrder = async (groupOrderId: string, personId: string) => {
  const res = await fetch(`${API_BASE}/group-orders/${groupOrderId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId }),
  });
  return handleJson(res) as Promise<{
    groupOrder: GroupOrder;
    members: GroupOrderMember[];
    items: GroupOrderItem[];
  }>;
};

export const closeGroupOrder = async (groupOrderId: string) => {
  const res = await fetch(`${API_BASE}/group-orders/${groupOrderId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleJson(res) as Promise<{ groupOrder: GroupOrder }>;
};

export const finishTableSession = async (tableSessionId: string) => {
  const res = await fetch(`${API_BASE}/table-session/${tableSessionId}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleJson(res) as Promise<{ tableSession: TableSession }>;
};

export const fetchSessionState = async (tableSessionId: string, personId: string) => {
  const res = await fetch(
    `${API_BASE}/table-session/${tableSessionId}/state?personId=${encodeURIComponent(personId)}`,
  );
  return handleJson(res) as Promise<AttachResponse>;
};
