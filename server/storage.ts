import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

// --- Domain types for TableTap multi-user table sessions and carts ---
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

// --- Storage interface ---
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getOrCreateActiveTableSession(tableId: string): Promise<TableSession>;
  finishTableSession(tableSessionId: string): Promise<TableSession>;

  attachPerson(tableSessionId: string, deviceFingerprint: string): Promise<{
    person: Person;
    cart: PersonalCart;
  }>;

  addItemsForPerson(input: {
    tableSessionId: string;
    personId: string;
    items: Array<{ menuItemId: string; qty: number; price: number; notes?: string }>;
  }): Promise<{ destination: "personal" | "group"; cartItems?: PersonalCartItem[]; groupItems?: GroupOrderItem[] }>;

  createGroupOrder(tableSessionId: string, creatorPersonId: string): Promise<{
    groupOrder: GroupOrder;
    members: GroupOrderMember[];
    items: GroupOrderItem[];
  }>;

  removePersonalItem(input: {
    tableSessionId: string;
    personId: string;
    menuItemId: string;
  }): Promise<PersonalCartItem | null>;

  joinGroupOrder(groupOrderId: string, personId: string): Promise<{
    groupOrder: GroupOrder;
    members: GroupOrderMember[];
    items: GroupOrderItem[];
  }>;

  closeGroupOrder(groupOrderId: string): Promise<GroupOrder>;

  getStateForSession(tableSessionId: string, personId: string): Promise<{
    tableSession: TableSession;
    person: Person;
    personalCart: PersonalCart | undefined;
    personalCartItems: PersonalCartItem[];
    activeGroupOrder?: GroupOrder;
    groupOrderItems: GroupOrderItem[];
    groupOrderMembers: GroupOrderMember[];
  }>;
}

// --- In-memory implementation (replace with DB-backed storage later) ---
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tableSessions: Map<string, TableSession> = new Map();
  private persons: Map<string, Person> = new Map();
  private personalCarts: Map<string, PersonalCart> = new Map();
  private personalCartItems: Map<string, PersonalCartItem> = new Map();
  private groupOrders: Map<string, GroupOrder> = new Map();
  private groupOrderMembers: Map<string, GroupOrderMember> = new Map();
  private groupOrderItems: Map<string, GroupOrderItem> = new Map();

  // --- User CRUD (existing) ---
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // --- Table sessions ---
  async getOrCreateActiveTableSession(tableId: string): Promise<TableSession> {
    const existing = Array.from(this.tableSessions.values()).find(
      (session) => session.tableId === tableId && session.status === "active",
    );
    if (existing) return existing;

    const newSession: TableSession = {
      id: randomUUID(),
      tableId,
      status: "active",
      startedAt: Date.now(),
    };
    this.tableSessions.set(newSession.id, newSession);
    return newSession;
  }

  async finishTableSession(tableSessionId: string): Promise<TableSession> {
    const session = this.tableSessions.get(tableSessionId);
    if (!session) throw new Error("Table session not found");
    session.status = "finished";
    session.endedAt = Date.now();
    return session;
  }

  // --- Persons and carts ---
  async attachPerson(tableSessionId: string, deviceFingerprint: string) {
    const now = Date.now();
    let person = Array.from(this.persons.values()).find(
      (p) =>
        p.tableSessionId === tableSessionId &&
        p.deviceFingerprint === deviceFingerprint,
    );

    if (!person) {
      person = {
        id: randomUUID(),
        tableSessionId,
        deviceFingerprint,
        lastSeenAt: now,
      };
      this.persons.set(person.id, person);
    } else {
      person.lastSeenAt = now;
    }

    let cart = Array.from(this.personalCarts.values()).find(
      (c) => c.personId === person!.id && c.tableSessionId === tableSessionId && c.status === "open",
    );

    if (!cart) {
      cart = {
        id: randomUUID(),
        personId: person.id,
        tableSessionId,
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      this.personalCarts.set(cart.id, cart);
    }

    return { person, cart };
  }

  private getOpenPersonalCart(personId: string, tableSessionId: string): PersonalCart | undefined {
    return Array.from(this.personalCarts.values()).find(
      (c) => c.personId === personId && c.tableSessionId === tableSessionId && c.status === "open",
    );
  }

  private getActiveGroupOrder(tableSessionId: string): GroupOrder | undefined {
    return Array.from(this.groupOrders.values()).find(
      (g) => g.tableSessionId === tableSessionId && g.status === "active",
    );
  }

  private isPersonInGroup(groupOrderId: string, personId: string): boolean {
    return Array.from(this.groupOrderMembers.values()).some(
      (m) => m.groupOrderId === groupOrderId && m.personId === personId,
    );
  }

  private getPersonalCartItems(cartId: string): PersonalCartItem[] {
    return Array.from(this.personalCartItems.values()).filter(
      (item) => item.personalCartId === cartId,
    );
  }

  private removePersonalCartItems(cartId: string) {
    for (const [id, item] of this.personalCartItems.entries()) {
      if (item.personalCartId === cartId) {
        this.personalCartItems.delete(id);
      }
    }
  }

  async addItemsForPerson(input: {
    tableSessionId: string;
    personId: string;
    items: Array<{ menuItemId: string; qty: number; price: number; notes?: string }>;
  }): Promise<{ destination: "personal" | "group"; cartItems?: PersonalCartItem[]; groupItems?: GroupOrderItem[] }> {
    const activeGroup = this.getActiveGroupOrder(input.tableSessionId);
    const now = Date.now();

    if (activeGroup && this.isPersonInGroup(activeGroup.id, input.personId)) {
      const groupItems: GroupOrderItem[] = input.items.map((payload) => {
        const item: GroupOrderItem = {
          id: randomUUID(),
          groupOrderId: activeGroup.id,
          fromPersonId: input.personId,
          menuItemId: payload.menuItemId,
          qty: payload.qty,
          price: payload.price,
          notes: payload.notes,
          addedAt: now,
        };
        this.groupOrderItems.set(item.id, item);
        return item;
      });

      return { destination: "group", groupItems };
    }

    const cart = this.getOpenPersonalCart(input.personId, input.tableSessionId);
    if (!cart) throw new Error("Open personal cart not found for person");

    const cartItems: PersonalCartItem[] = input.items.map((payload) => {
      const item: PersonalCartItem = {
        id: randomUUID(),
        personalCartId: cart.id,
        menuItemId: payload.menuItemId,
        qty: payload.qty,
        price: payload.price,
        notes: payload.notes,
        addedAt: now,
      };
      this.personalCartItems.set(item.id, item);
      cart.updatedAt = now;
      return item;
    });

    return { destination: "personal", cartItems };
  }

  async removePersonalItem(input: {
    tableSessionId: string;
    personId: string;
    menuItemId: string;
  }): Promise<PersonalCartItem | null> {
    const cart = this.getOpenPersonalCart(input.personId, input.tableSessionId);
    if (!cart) return null;

    const target = this.getPersonalCartItems(cart.id).find(
      (item) => item.menuItemId === input.menuItemId,
    );
    if (!target) return null;

    if (target.qty > 1) {
      target.qty -= 1;
      cart.updatedAt = Date.now();
      return target;
    }

    this.personalCartItems.delete(target.id);
    cart.updatedAt = Date.now();
    return target;
  }

  private migratePersonalCartToGroup(groupOrder: GroupOrder, personId: string) {
    const cart = this.getOpenPersonalCart(personId, groupOrder.tableSessionId);
    if (!cart) return;
    const items = this.getPersonalCartItems(cart.id);
    const now = Date.now();

    for (const personalItem of items) {
      const groupItem: GroupOrderItem = {
        id: randomUUID(),
        groupOrderId: groupOrder.id,
        fromPersonId: personId,
        menuItemId: personalItem.menuItemId,
        qty: personalItem.qty,
        price: personalItem.price,
        notes: personalItem.notes,
        addedAt: now,
      };
      this.groupOrderItems.set(groupItem.id, groupItem);
    }

    cart.status = "migrated";
    cart.updatedAt = now;
    this.removePersonalCartItems(cart.id);

    // Create a fresh empty cart for future non-group additions.
    const newCart: PersonalCart = {
      id: randomUUID(),
      personId,
      tableSessionId: groupOrder.tableSessionId,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    this.personalCarts.set(newCart.id, newCart);
  }

  async createGroupOrder(tableSessionId: string, creatorPersonId: string) {
    const existingActive = this.getActiveGroupOrder(tableSessionId);
    if (existingActive) {
      throw new Error("Active group order already exists for this table session");
    }

    const groupOrder: GroupOrder = {
      id: randomUUID(),
      tableSessionId,
      status: "active",
      createdByPersonId: creatorPersonId,
      createdAt: Date.now(),
    };
    this.groupOrders.set(groupOrder.id, groupOrder);

    const member: GroupOrderMember = {
      id: randomUUID(),
      groupOrderId: groupOrder.id,
      personId: creatorPersonId,
      joinedAt: Date.now(),
    };
    this.groupOrderMembers.set(member.id, member);

    this.migratePersonalCartToGroup(groupOrder, creatorPersonId);

    const items = Array.from(this.groupOrderItems.values()).filter(
      (item) => item.groupOrderId === groupOrder.id,
    );
    const members = Array.from(this.groupOrderMembers.values()).filter(
      (m) => m.groupOrderId === groupOrder.id,
    );

    return { groupOrder, members, items };
  }

  async joinGroupOrder(groupOrderId: string, personId: string) {
    const groupOrder = this.groupOrders.get(groupOrderId);
    if (!groupOrder || groupOrder.status !== "active") {
      throw new Error("Active group order not found");
    }

    if (!this.isPersonInGroup(groupOrderId, personId)) {
      const member: GroupOrderMember = {
        id: randomUUID(),
        groupOrderId,
        personId,
        joinedAt: Date.now(),
      };
      this.groupOrderMembers.set(member.id, member);
    }

    this.migratePersonalCartToGroup(groupOrder, personId);

    const items = Array.from(this.groupOrderItems.values()).filter(
      (item) => item.groupOrderId === groupOrder.id,
    );
    const members = Array.from(this.groupOrderMembers.values()).filter(
      (m) => m.groupOrderId === groupOrder.id,
    );

    return { groupOrder, members, items };
  }

  async closeGroupOrder(groupOrderId: string) {
    const groupOrder = this.groupOrders.get(groupOrderId);
    if (!groupOrder) throw new Error("Group order not found");
    groupOrder.status = "closed";
    groupOrder.closedAt = Date.now();
    return groupOrder;
  }

  async getStateForSession(tableSessionId: string, personId: string) {
    const tableSession = this.tableSessions.get(tableSessionId);
    if (!tableSession) throw new Error("Table session not found");

    const person = this.persons.get(personId);
    if (!person || person.tableSessionId !== tableSessionId) {
      throw new Error("Person not found for table session");
    }

    const personalCart = this.getOpenPersonalCart(personId, tableSessionId);
    const personalCartItems = personalCart
      ? this.getPersonalCartItems(personalCart.id)
      : [];
    const activeGroupOrder = this.getActiveGroupOrder(tableSessionId);
    const groupOrderItems = activeGroupOrder
      ? Array.from(this.groupOrderItems.values()).filter(
          (item) => item.groupOrderId === activeGroupOrder.id,
        )
      : [];
    const groupOrderMembers = activeGroupOrder
      ? Array.from(this.groupOrderMembers.values()).filter(
          (m) => m.groupOrderId === activeGroupOrder.id,
        )
      : [];

    return {
      tableSession,
      person,
      personalCart,
      personalCartItems,
      activeGroupOrder,
      groupOrderItems,
      groupOrderMembers,
    };
  }
}

export const storage = new MemStorage();
