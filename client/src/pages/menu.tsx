import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Check,
  BellRing,
  ChevronLeft,
  ClipboardList,
  LifeBuoy,
  Pencil,
  Plus,
  Minus,
  X,
  ShoppingCart,
  Clock,
  MapPin,
  Menu as MenuIcon,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getOrCreateUserID } from "@/lib/userID";
import {
  checkInTableFromQrApi,
  callWaiterApi,
  fetchCustomerOrderHistory,
  fetchOrderStatus,
  fetchMenuCatalog,
  fetchTablePublicAccess,
  upsertCustomerProfile,
  type MenuCatalogApiResponse,
} from "@/lib/tabletap-supabase-api";
import { supabaseBrowser } from "@/lib/supabase";
import { getDeviceFingerprint } from "@/lib/tabletap-api";

const userId = getOrCreateUserID();

const tabs = ["Breakfast", "Salads", "Sandwiches", "Coffee", "Slow Bar", "Not Coffee", "Matcha"];

const RESTAURANT = {
  name: "SIP",
  address: "F-8/3, Islamabad",
  rating: 4.8,
  reviews: 2729,
  servingTime: "15 - 20 min",
  averageLabel: "Average serving time",
  hours: "8 AM - 1 AM",
};

const DISPLAY_NAME_KEY = "tabletap_display_name";
const ACCOUNT_EMAIL_KEY = "tabletap_account_email";
const MENU_AUTH_KEY = "tabletap_menu_authenticated";
const DAILY_PROMO_SEEN_KEY = `tabletap_daily_promo_seen_${userId}`;

const getDefaultDisplayName = (id: string) => {
  const compact = id.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const suffix = compact.length >= 4 ? compact.slice(-4) : compact.padEnd(4, "0");
  return `User ${suffix}`;
};

const getLocalDateStamp = () =>
  new Intl.DateTimeFormat("en-CA").format(new Date());

const PROMO_SLIDES = [
  {
    title: "Save TableTap to your Home Screen",
    description:
      "Get order tracking notifications on your phone when your order is confirmed, being prepared, and served.",
    cta: "Add to Home Screen",
    image: "/Sip%20Homescreen.png",
  },
];

type CartItem = {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  details?: string;
  addedBy: string;
  menuItemId?: string;
  baseItemName?: string;
};

type StoredOrder = {
  orderNumber: string;
  total: number;
  subtotal: number;
  tipAmount: number;
  serviceFee: number;
  gstAmount: number;
  tableLabel: string;
  notes: string;
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'served';
  statusHistory: Array<{
    status: string;
    timestamp: number;
    message: string;
  }>;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    image?: string;
    details?: string;
  }>;
  placedAt?: string;
};

const isCompletedPastOrderStatus = (status: StoredOrder["status"]) =>
  status === "ready" || status === "served";

const TRACKABLE_ORDER_WINDOW_MS = 24 * 60 * 60 * 1000;

const normalizeTrackedStatus = (rawStatus: unknown): StoredOrder["status"] => {
  const normalized = String(rawStatus ?? "").trim().toLowerCase();
  if (normalized === "confirmed" || normalized === "accepted") return "confirmed";
  if (normalized === "preparing" || normalized === "in_progress") return "preparing";
  if (normalized === "ready" || normalized === "ready_to_serve") return "ready";
  if (normalized === "served" || normalized === "completed" || normalized === "done") return "served";
  return "placed";
};

const getOrderPlacedAtMs = (
  order: Pick<StoredOrder, "placedAt" | "statusHistory">,
) => {
  const placedAtMs = order.placedAt ? new Date(order.placedAt).getTime() : NaN;
  if (Number.isFinite(placedAtMs)) return placedAtMs;
  const fallbackHistoryTs = order.statusHistory?.[0]?.timestamp ?? Date.now();
  return Number.isFinite(fallbackHistoryTs) ? fallbackHistoryTs : Date.now();
};

const isOrderWithinTrackWindow = (
  order: Pick<StoredOrder, "placedAt" | "statusHistory">,
) => Date.now() - getOrderPlacedAtMs(order) <= TRACKABLE_ORDER_WINDOW_MS;

type MenuItemAddOn = {
  label: string;
  price: number;
};

type MenuItemData = {
  menuItemId?: string;
  name: string;
  image?: string;
  description?: string;
  price?: number;
  isAvailable?: boolean;
  eggOptions?: string[];
  temperatureOptions?: string[];
  temperaturePrices?: Record<string, number>;
  addOnOptions?: MenuItemAddOn[];
};

type JoinRequest = {
  fromUserId: string;
  fromUserName: string;
  targetUserId: string;
  timestamp: number;
};

type JoinRequestResponse = {
  targetUserId: string;
  status: "accepted" | "declined";
  timestamp: number;
};

type PendingJoinRequest = {
  targetUserId: string;
  timestamp: number;
  status: "pending";
};

const normalizeItemBaseName = (value: string) =>
  value.trim().toLowerCase().split(/\s\(|\s\+/)[0]?.trim() || value.trim().toLowerCase();

const mapCatalogItemToMenuItemData = (
  item: MenuCatalogApiResponse["items"][number],
): MenuItemData => {
  const eggGroup = item.optionGroups.find(
    (group) => group.name.toLowerCase() === "egg type",
  );
  const temperatureGroup = item.optionGroups.find(
    (group) => group.name.toLowerCase() === "temperature",
  );
  const addOnsGroup = item.optionGroups.find(
    (group) => group.name.toLowerCase() === "add-ons",
  );

  const temperaturePrices =
    temperatureGroup?.pricingMode === "absolute"
      ? Object.fromEntries(
          temperatureGroup.values.map((value) => [
            value.label,
            Number(value.priceOverride ?? value.priceDelta ?? 0),
          ]),
        )
      : undefined;

  const hasAbsoluteTemperaturePrice =
    Boolean(temperaturePrices) &&
    Object.keys(temperaturePrices ?? {}).length > 0;

  const basePrice =
    item.isPriceOnRequest || (hasAbsoluteTemperaturePrice && item.basePrice <= 0)
      ? undefined
      : item.basePrice;

  return {
    menuItemId: item.id,
    name: item.name,
    image: item.imageUrl ?? undefined,
    description: item.description ?? undefined,
    price: basePrice,
    isAvailable: item.isAvailable,
    eggOptions: eggGroup?.values.map((value) => value.label) ?? undefined,
    temperatureOptions:
      temperatureGroup?.values.map((value) => value.label) ?? undefined,
    temperaturePrices,
    addOnOptions:
      addOnsGroup?.values.map((value) => ({
        label: value.label,
        price: Number(value.priceOverride ?? value.priceDelta ?? 0),
      })) ?? undefined,
  };
};

const OFFERED_MENU_ITEM_NAMES_BY_CATEGORY = {
  breakfast: [
    "Turkish Eggs",
    "Sunny Hummus Bowl",
    "Avocado Toast",
    "French Toast",
    "Steak & Eggs",
  ],
  salads: ["Golden Crunch", "Ceaser salad"],
  sandwiches: [
    "Grilled Chicken Pesto",
    "Mexi Beef Focaccia",
    "Sun Kissed Chicken",
    "Classic Club",
    "Focaccia Fillet",
    "Beef Melt",
  ],
  coffee: [
    "Espresso",
    "Cappuccino",
    "Macchiato",
    "Cortado",
    "Flat White",
    "Latte",
    "Spanish Latte",
    "French Vanilla Gingerbread",
    "Caramel Cinnamon",
    "Hazelnut",
    "Butter Scotch",
    "Tiramisu",
    "Coconut",
    "Mocha",
  ],
  "slow-bar": ["Tier 1", "Tier 2", "Tier 3"],
  "not-coffee": [
    "Hot/Iced Chocolate",
    "Sip Signature Chocolate",
    "Apple Mojito",
    "Raspberry Mojito",
    "Pina Coco and Green Apple Mojito",
    "Passion Fruit Mojito",
    "Lemon Iced Tea",
    "Peach Iced Tea",
  ],
  matcha: ["Matcha", "Spanish Matcha", "Stawberry Matcha", "Coconut Matcha"],
} as const;

const OFFERED_MENU_CATEGORY_SLUGS = new Set(
  Object.keys(OFFERED_MENU_ITEM_NAMES_BY_CATEGORY),
);

const OFFERED_MENU_ITEM_NAME_LOOKUP = new Map<string, Set<string>>(
  Object.entries(OFFERED_MENU_ITEM_NAMES_BY_CATEGORY).map(([slug, names]) => [
    slug,
    new Set(names.map((name) => name.toLowerCase())),
  ]),
);

const SUGGESTED_ITEMS: MenuItemData[] = [
  {
    name: "Turkish Eggs",
    price: 1395,
    description: "Creamy garlic yogurt with poached eggs and chili butter.",
  },
  {
    name: "Golden Crunch",
    price: 1295,
    description: "Fresh mixed greens with crunchy toppings and house dressing.",
  },
  {
    name: "Classic Club",
    price: 1545,
    description: "Triple-layer toasted sandwich with chicken, egg, and greens.",
  },
  {
    name: "Latte",
    price: 240,
    description: "Silky espresso and steamed milk.",
  },
];

const ITEM_SMART_SUGGESTIONS: Record<string, string[]> = {
  "turkish eggs": ["Latte", "Golden Crunch", "Classic Club"],
  "sunny hummus bowl": ["Cappuccino", "Golden Crunch", "Classic Club"],
  "avocado toast": ["Spanish Latte", "Golden Crunch", "Classic Club"],
  "french toast": ["Latte", "Cappuccino", "Golden Crunch"],
  "steak & eggs": ["Flat White", "Classic Club", "Golden Crunch"],
  "golden crunch": ["Classic Club", "Latte", "Spanish Latte"],
  "ceaser salad": ["Classic Club", "Flat White", "Peach Iced Tea"],
  "grilled chicken pesto": ["Golden Crunch", "Latte", "Peach Iced Tea"],
  "mexi beef focaccia": ["Flat White", "Golden Crunch", "Lemon Iced Tea"],
  "sun kissed chicken": ["Cappuccino", "Golden Crunch", "Apple Mojito"],
  "classic club": ["Golden Crunch", "Latte", "Peach Iced Tea"],
  "focaccia fillet": ["Spanish Latte", "Golden Crunch", "Lemon Iced Tea"],
  "beef melt": ["Cortado", "Golden Crunch", "Peach Iced Tea"],
  "espresso": ["French Toast", "Classic Club", "Golden Crunch"],
  "cappuccino": ["French Toast", "Classic Club", "Golden Crunch"],
  "latte": ["French Toast", "Classic Club", "Golden Crunch"],
  "spanish latte": ["French Toast", "Classic Club", "Golden Crunch"],
  "matcha": ["French Toast", "Golden Crunch", "Classic Club"],
  "spanish matcha": ["French Toast", "Golden Crunch", "Classic Club"],
};

const DEFAULT_SUGGESTIONS_BY_CATEGORY: Record<string, string[]> = {
  breakfast: ["Latte", "Golden Crunch", "Classic Club"],
  salads: ["Classic Club", "Spanish Latte", "Peach Iced Tea"],
  sandwiches: ["Golden Crunch", "Latte", "Peach Iced Tea"],
  coffee: ["French Toast", "Classic Club", "Golden Crunch"],
  "slow-bar": ["Classic Club", "Golden Crunch", "Avocado Toast"],
  "not-coffee": ["Classic Club", "French Toast", "Golden Crunch"],
  matcha: ["French Toast", "Golden Crunch", "Classic Club"],
};

// Smart Counter Component
function SmartCounter({ 
  itemName, 
  price, 
  image, 
  cart,
  onAddToCart, 
  onRemoveFromCart 
}: { 
  itemName: string; 
  price: number; 
  image?: string; 
  cart?: {[key: string]: {name: string; price: number; quantity: number; image?: string; details?: string; addedBy: string}};
  onAddToCart: (itemName: string, price: number, image?: string) => void; 
  onRemoveFromCart: (itemKey: string) => void; 
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Calculate count from cart state
  const getCartCount = () => {
    if (!cart) return 0;
    // Find the item in cart by matching the name
    const cartItem = Object.values(cart).find(item => item.name === itemName);
    return cartItem?.quantity || 0;
  };
  
  const count = getCartCount();



  const handleAddToOrder = () => {
    setIsAnimating(true);
    onAddToCart(itemName, price, image);
  };

  const handleIncrement = () => {
    onAddToCart(itemName, price, image);
  };

  const handleDecrement = () => {
    if (count <= 1) {
      setIsAnimating(false);
      onRemoveFromCart(itemName);
    } else {
      onRemoveFromCart(itemName);
    }
  };

  return (
    <motion.div
      layout
      className="flex items-center justify-center"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {count === 0 ? (
        <motion.button
          initial={{ scale: 1 }}
          animate={{ scale: isAnimating ? 0.9 : 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddToOrder}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
        >
          Add to Order
        </motion.button>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="flex items-center justify-center space-x-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold w-[110px]"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDecrement}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
          >
            <Minus size={14} />
          </motion.button>
          
          <motion.span
            key={count}
            initial={{ scale: 1.2, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            className="font-bold text-sm min-w-[20px] text-center"
          >
            {count}
          </motion.span>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleIncrement}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
          >
            <Plus size={14} />
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function Menu() {

  const getTableIdentifier = () => {
    if (typeof window === "undefined") {
      return "Table1";
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("table") ?? "Table1";
  };

const tableIdentifier = getTableIdentifier();
const deviceFingerprint = getDeviceFingerprint();
const tableNumberMatch = tableIdentifier.match(/(\d+)/);
const tableNumber =
  tableNumberMatch ? tableNumberMatch[1] : tableIdentifier.replace(/[^0-9]/g, "") || "1";
const tableNumberNumeric = Number(tableNumber) || 1;
const tableQuery = tableIdentifier ? `?table=${encodeURIComponent(tableIdentifier)}` : "";

  const getTableNumberFromLabel = (label?: string) => {
    if (!label) return "";
    const match = label.match(/(\d+)/);
    return match ? match[1] : "";
  };

    const getStoredOrderForCurrentTable = () => {
    const savedOrder = localStorage.getItem(`lastOrder_${userId}`);
    if (!savedOrder) return null;
    try {
      const parsed = JSON.parse(savedOrder) as StoredOrder;
      const normalizedStatus = normalizeTrackedStatus(
        (parsed as { status?: unknown }).status,
      );
      if (normalizedStatus === "served") {
        localStorage.removeItem(`lastOrder_${userId}`);
        return null;
      }
      const savedTableNumber = getTableNumberFromLabel(parsed.tableLabel);
      if (savedTableNumber !== tableNumber) {
        return null;
      }
      const normalizedOrder: StoredOrder = {
        ...parsed,
        status: normalizedStatus,
        placedAt:
          parsed.placedAt ||
          new Date(parsed.statusHistory?.[0]?.timestamp ?? Date.now()).toISOString(),
      };
      if (!isOrderWithinTrackWindow(normalizedOrder)) {
        localStorage.removeItem(`lastOrder_${userId}`);
        return null;
      }
      return normalizedOrder;
    } catch {
      return null;
    }
  };
  
  const [activeTab, setActiveTab] = useState("Breakfast");
  
  // Refs for scrolling to sections
  const breakfastRef = useRef<HTMLDivElement>(null);
  const sandwichesRef = useRef<HTMLDivElement>(null);
  const saladsRef = useRef<HTMLDivElement>(null);
  const coffeeRef = useRef<HTMLDivElement>(null);
  const slowBarRef = useRef<HTMLDivElement>(null);
  const notCoffeeRef = useRef<HTMLDivElement>(null);
  const matchaRef = useRef<HTMLDivElement>(null);

  // Scroll-based active tab detection
  const [scrollActiveTab, setScrollActiveTab] = useState("Breakfast");
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [selectedItem, setSelectedItem] = useState<(MenuItemData & { description: string; price: number }) | null>(null);
  const [selectedEggType, setSelectedEggType] = useState<string | null>(null);
  const [selectedTemperature, setSelectedTemperature] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedSuggestedItems, setSelectedSuggestedItems] = useState<string[]>([]);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedTip, setSelectedTip] = useState(() => {
    const savedTip = localStorage.getItem(`selectedTip_${userId}`);
    return savedTip ? parseInt(savedTip) : 5;
  });
  const [orderNotes, setOrderNotes] = useState(() => {
    return localStorage.getItem(`orderNotes_${userId}`) || "";
  });

  const [showSplitOptions, setShowSplitOptions] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'easypaisa' | 'jazzcash' | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvc, setCvc] = useState("");
  const [errors, setErrors] = useState<{
    cardholderName?: string;
    cardNumber?: string;
    expiration?: string;
    cvc?: string;
  }>({});
  const [splitCount, setSplitCount] = useState(2);
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'by-item'>('equal');
  const [customAmounts, setCustomAmounts] = useState<{[key: number]: number}>({});
  const [shareCartInput, setShareCartInput] = useState('');
  const [showJoinRequest, setShowJoinRequest] = useState(false);
  const [joinRequestData, setJoinRequestData] = useState<{fromUserId: string, fromUserName: string} | null>(null);
  const [, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string, title?: string} | null>(null);
  const [isCollaborativeSession, setIsCollaborativeSession] = useState(false);
  const [collaborativeUserId, setCollaborativeUserId] = useState<string | null>(null);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastOrder, setLastOrder] = useState<StoredOrder | null>(() => getStoredOrderForCurrentTable());
  const [showOrderTracker, setShowOrderTracker] = useState(() => {
    return Boolean(getStoredOrderForCurrentTable());
  });
  const [trackedOrders, setTrackedOrders] = useState<StoredOrder[]>(() => {
    if (typeof window === "undefined") return [];
    const fallbackOrder = getStoredOrderForCurrentTable();
    try {
      const raw = localStorage.getItem(`tracked_orders_${userId}`);
      if (!raw) return fallbackOrder ? [fallbackOrder] : [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return fallbackOrder ? [fallbackOrder] : [];
      const normalized = parsed
        .map((entry) => ({
          ...(entry as StoredOrder),
          status: normalizeTrackedStatus((entry as { status?: unknown }).status),
          placedAt:
            (entry as StoredOrder).placedAt ||
            new Date((entry as StoredOrder).statusHistory?.[0]?.timestamp ?? Date.now()).toISOString(),
        }))
        .filter((entry) => normalizeTrackedStatus(entry.status) !== "served")
        .filter((entry) => isOrderWithinTrackWindow(entry));

      if (normalized.length === 0 && fallbackOrder) {
        return [fallbackOrder];
      }
      return normalized;
    } catch {
      return fallbackOrder ? [fallbackOrder] : [];
    }
  });
  const [trackerPageIndex, setTrackerPageIndex] = useState(0);
  const [showAuthDrawer, setShowAuthDrawer] = useState(false);
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authStep, setAuthStep] = useState<"credentials" | "verify-signup">("credentials");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isMenuAuthenticated, setIsMenuAuthenticated] = useState(
    () => localStorage.getItem(MENU_AUTH_KEY) === "true",
  );
  const [showPastOrdersModal, setShowPastOrdersModal] = useState(false);
  const [pastOrders, setPastOrders] = useState<StoredOrder[]>([]);
  const [pastOrdersLoading, setPastOrdersLoading] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [showFirstVisitPromo, setShowFirstVisitPromo] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const today = getLocalDateStamp();
    const seenOn = localStorage.getItem(DAILY_PROMO_SEEN_KEY);
    const shouldShow = seenOn !== today;
    if (shouldShow) {
      localStorage.setItem(DAILY_PROMO_SEEN_KEY, today);
    }
    return shouldShow;
  });
  const [promoSlideIndex, setPromoSlideIndex] = useState(0);
  const [displayName, setDisplayName] = useState(() => {
    const storedName = localStorage.getItem(DISPLAY_NAME_KEY);
    return storedName?.trim() || getDefaultDisplayName(userId);
  });
  const [displayNameDraft, setDisplayNameDraft] = useState(() => {
    const storedName = localStorage.getItem(DISPLAY_NAME_KEY);
    return storedName?.trim() || getDefaultDisplayName(userId);
  });
  const [accountEmail, setAccountEmail] = useState(() => {
    return localStorage.getItem(ACCOUNT_EMAIL_KEY)?.trim().toLowerCase() || "";
  });
  const [accountEmailDraft, setAccountEmailDraft] = useState(() => {
    return localStorage.getItem(ACCOUNT_EMAIL_KEY)?.trim().toLowerCase() || "";
  });
  const [accountSaveError, setAccountSaveError] = useState<string | null>(null);
  const [pendingCartOpenAfterProfile, setPendingCartOpenAfterProfile] = useState(false);
  const [remoteCatalog, setRemoteCatalog] =
    useState<MenuCatalogApiResponse | null>(null);
  const [tableAccess, setTableAccess] = useState<{
    tableNumber: number;
    tableLabel: string;
    tableStatus: string;
    hasQrCode: boolean;
    orderingEnabled: boolean;
    message: string;
  } | null>(null);
  const [showWaiterBanner, setShowWaiterBanner] = useState(false);
  const [waiterBannerProgress, setWaiterBannerProgress] = useState(100);
  const lastOrderRef = useRef<StoredOrder | null>(lastOrder);
  const waiterBannerIntervalRef = useRef<number | null>(null);
  const waiterBannerTimeoutRef = useRef<number | null>(null);
  const pendingJoinTimeoutRef = useRef<number | null>(null);
  const orderTrackerBarRef = useRef<HTMLDivElement | null>(null);
  const cartBarRef = useRef<HTMLDivElement | null>(null);
  const [callWaiterBottomOffset, setCallWaiterBottomOffset] = useState(24);
  const trackableOrders = useMemo(() => {
    return trackedOrders
      .map((order) => ({
        ...order,
        status: normalizeTrackedStatus(order.status),
        placedAt:
          order.placedAt ||
          new Date(order.statusHistory?.[0]?.timestamp ?? Date.now()).toISOString(),
      }))
      .filter((order) => normalizeTrackedStatus(order.status) !== "served")
      .filter((order) => isOrderWithinTrackWindow(order))
      .filter((order) => getTableNumberFromLabel(order.tableLabel) === tableNumber)
      .sort((a, b) => getOrderPlacedAtMs(b) - getOrderPlacedAtMs(a));
  }, [trackedOrders, tableNumber]);

  const currentTrackedOrder = trackableOrders[trackerPageIndex] ?? null;
  const hasTrackableOrders = trackableOrders.length > 0;

  const openTrackerPanel = () => {
    if (!hasTrackableOrders) return;
    if (!trackableOrders[trackerPageIndex]) {
      setTrackerPageIndex(0);
    }
    setShowOrderTracker(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`tracked_orders_${userId}`, JSON.stringify(trackedOrders.slice(0, 30)));
  }, [trackedOrders]);

  useEffect(() => {
    if (trackerPageIndex < trackableOrders.length) return;
    setTrackerPageIndex(Math.max(trackableOrders.length - 1, 0));
  }, [trackableOrders.length, trackerPageIndex]);

  useEffect(() => {
    if (!currentTrackedOrder) {
      if (showOrderTracker) {
        setShowOrderTracker(false);
      }
      return;
    }
    if (!lastOrder || lastOrder.orderNumber !== currentTrackedOrder.orderNumber || lastOrder.status !== currentTrackedOrder.status) {
      setLastOrder(currentTrackedOrder);
    }
  }, [currentTrackedOrder, showOrderTracker, lastOrder]);



  const remoteItemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItemData[]>();
    for (const item of remoteCatalog?.items ?? []) {
      const key = item.categorySlug.toLowerCase();
      if (!OFFERED_MENU_CATEGORY_SLUGS.has(key)) {
        continue;
      }
      const allowedItemNames = OFFERED_MENU_ITEM_NAME_LOOKUP.get(key);
      if (allowedItemNames && !allowedItemNames.has(item.name.toLowerCase())) {
        continue;
      }
      const current = map.get(key) ?? [];
      current.push(mapCatalogItemToMenuItemData(item));
      map.set(key, current);
    }
    map.forEach((values, key) => {
      values.sort((a: MenuItemData, b: MenuItemData) =>
        a.name.localeCompare(b.name),
      );
      map.set(key, values);
    });
    return map;
  }, [remoteCatalog]);

  const BREAKFAST_SOURCE = remoteItemsByCategory.get("breakfast") ?? [];
  const SALAD_SOURCE = remoteItemsByCategory.get("salads") ?? [];
  const SANDWICH_SOURCE = remoteItemsByCategory.get("sandwiches") ?? [];
  const COFFEE_SOURCE = remoteItemsByCategory.get("coffee") ?? [];
  const SLOW_BAR_SOURCE = remoteItemsByCategory.get("slow-bar") ?? [];
  const NOT_COFFEE_SOURCE = remoteItemsByCategory.get("not-coffee") ?? [];
  const MATCHA_SOURCE = remoteItemsByCategory.get("matcha") ?? [];

  const menuItemLookupByName = useMemo(() => {
    const lookup = new Map<string, MenuItemData>();
    const allSourceItems = [
      ...BREAKFAST_SOURCE,
      ...SALAD_SOURCE,
      ...SANDWICH_SOURCE,
      ...COFFEE_SOURCE,
      ...SLOW_BAR_SOURCE,
      ...NOT_COFFEE_SOURCE,
      ...MATCHA_SOURCE,
    ];
    allSourceItems.forEach((item) => {
      lookup.set(item.name.toLowerCase(), item);
    });
    return lookup;
  }, [
    BREAKFAST_SOURCE,
    SALAD_SOURCE,
    SANDWICH_SOURCE,
    COFFEE_SOURCE,
    SLOW_BAR_SOURCE,
    NOT_COFFEE_SOURCE,
    MATCHA_SOURCE,
  ]);

  const menuItemCategoryByName = useMemo(() => {
    const lookup = new Map<string, string>();
    const registerCategory = (items: MenuItemData[], category: string) => {
      items.forEach((item) => {
        lookup.set(item.name.toLowerCase(), category);
      });
    };

    registerCategory(BREAKFAST_SOURCE, "breakfast");
    registerCategory(SALAD_SOURCE, "salads");
    registerCategory(SANDWICH_SOURCE, "sandwiches");
    registerCategory(COFFEE_SOURCE, "coffee");
    registerCategory(SLOW_BAR_SOURCE, "slow-bar");
    registerCategory(NOT_COFFEE_SOURCE, "not-coffee");
    registerCategory(MATCHA_SOURCE, "matcha");

    return lookup;
  }, [
    BREAKFAST_SOURCE,
    SALAD_SOURCE,
    SANDWICH_SOURCE,
    COFFEE_SOURCE,
    SLOW_BAR_SOURCE,
    NOT_COFFEE_SOURCE,
    MATCHA_SOURCE,
  ]);

  useEffect(() => {
    lastOrderRef.current = lastOrder;
  }, [lastOrder]);

  useEffect(() => {
    return () => {
      if (waiterBannerIntervalRef.current !== null) {
        window.clearInterval(waiterBannerIntervalRef.current);
      }
      if (waiterBannerTimeoutRef.current !== null) {
        window.clearTimeout(waiterBannerTimeoutRef.current);
      }
      if (pendingJoinTimeoutRef.current !== null) {
        window.clearTimeout(pendingJoinTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let inFlight = false;

    const syncCatalog = async (force = false) => {
      if (!isMounted || inFlight) return;
      if (!force && typeof document !== "undefined" && document.hidden) return;
      inFlight = true;
      try {
        const catalog = await fetchMenuCatalog();
        if (!isMounted) return;
        setRemoteCatalog(catalog);
      } catch (error) {
        if (!isMounted) return;
        console.warn("Menu catalog sync failed:", error);
      } finally {
        inFlight = false;
      }
    };

    void syncCatalog(true);
    const timer = window.setInterval(() => {
      void syncCatalog(false);
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void syncCatalog(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const supabaseClient = supabaseBrowser;
    const channel = supabaseClient
      ? supabaseClient
          .channel("menu-catalog-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "menu_items" },
            () => {
              void syncCatalog(true);
            },
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "menu_option_groups" },
            () => {
              void syncCatalog(true);
            },
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "menu_option_values" },
            () => {
              void syncCatalog(true);
            },
          )
          .subscribe()
      : null;

    return () => {
      isMounted = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel && supabaseClient) {
        void supabaseClient.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let inFlight = false;

    const syncTableAccess = async (force = false) => {
      if (!isMounted || inFlight) return;
      if (!force && typeof document !== "undefined" && document.hidden) return;
      inFlight = true;
      try {
        const access = await fetchTablePublicAccess(tableNumberNumeric);
        if (!isMounted) return;
        setTableAccess(access);
      } catch (error) {
        if (!isMounted) return;
        console.warn("Table access sync failed:", error);
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "Unknown error while verifying table access.";
        setTableAccess({
          tableNumber: tableNumberNumeric,
          tableLabel: `Table${tableNumberNumeric}`,
          tableStatus: "unknown",
          hasQrCode: false,
          orderingEnabled: false,
          message: `Unable to verify table access: ${reason}`,
        });
      } finally {
        inFlight = false;
      }
    };

    void syncTableAccess(true);
    const timer = window.setInterval(() => {
      void syncTableAccess(false);
    }, 12000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void syncTableAccess(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const supabaseClient = supabaseBrowser;
    const channel = supabaseClient
      ? supabaseClient
          .channel(`table-access-${tableNumberNumeric}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "restaurant_tables",
              filter: `table_number=eq.${tableNumberNumeric}`,
            },
            () => {
              void syncTableAccess(true);
            },
          )
          .subscribe()
      : null;

    return () => {
      isMounted = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel && supabaseClient) {
        void supabaseClient.removeChannel(channel);
      }
    };
  }, [tableNumberNumeric]);

  useEffect(() => {
    if (!tableAccess?.orderingEnabled) return;
    void checkInTableFromQrApi(tableNumberNumeric).catch((error) => {
      console.warn("Table check-in failed:", error);
    });
  }, [tableAccess?.orderingEnabled, tableNumberNumeric]);

  const ensureOrderingEnabled = () => {
    if (tableAccess?.orderingEnabled) return true;
    window.alert(
      tableAccess?.message ||
        "This table cannot be used to place an order right now.",
    );
    return false;
  };

  const ensureCartAuth = () => {
    return true;
  };

  const isProfileCompleteForCart = () => {
    const normalizedName = displayName.trim();
    const normalizedEmail = accountEmail.trim().toLowerCase();
    const defaultName = getDefaultDisplayName(userId).trim().toLowerCase();
    const hasCustomName =
      normalizedName.length > 0 && normalizedName.toLowerCase() !== defaultName;
    const hasValidEmail =
      normalizedEmail.length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    return hasCustomName && hasValidEmail;
  };

  const showCustomerWaiterBanner = () => {
    if (waiterBannerIntervalRef.current !== null) {
      window.clearInterval(waiterBannerIntervalRef.current);
      waiterBannerIntervalRef.current = null;
    }
    if (waiterBannerTimeoutRef.current !== null) {
      window.clearTimeout(waiterBannerTimeoutRef.current);
      waiterBannerTimeoutRef.current = null;
    }

    const durationMs = 6000;
    const startedAt = Date.now();
    setWaiterBannerProgress(100);
    setShowWaiterBanner(true);

    waiterBannerIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setWaiterBannerProgress(nextProgress);
    }, 100);

    waiterBannerTimeoutRef.current = window.setTimeout(() => {
      if (waiterBannerIntervalRef.current !== null) {
        window.clearInterval(waiterBannerIntervalRef.current);
        waiterBannerIntervalRef.current = null;
      }
      setWaiterBannerProgress(0);
      setShowWaiterBanner(false);
      waiterBannerTimeoutRef.current = null;
    }, durationMs);
  };

  const handleCallWaiter = async () => {
    if (!ensureOrderingEnabled()) return;

    try {
      await callWaiterApi({
        tableNumber: tableNumberNumeric,
        tableLabel: `Table ${tableNumberNumeric}`,
      });
      showCustomerWaiterBanner();
    } catch (error) {
      console.warn("Call waiter failed:", error);
      window.alert("Unable to call waiter right now. Please try again.");
    }
  };

  const dismissActiveOrder = () => {
    setShowOrderTracker(false);
  };

    // Order status update system
  const updateOrderStatus = (
    newStatus: StoredOrder['status'],
    message: string,
    targetOrderNumber?: string,
  ) => {
    const currentOrder = lastOrderRef.current;
    if (!currentOrder) return;
    if (targetOrderNumber && currentOrder.orderNumber !== targetOrderNumber) return;
    if (normalizeTrackedStatus(currentOrder.status) === "served") return;

    const statusRank: Record<StoredOrder["status"], number> = {
      placed: 0,
      confirmed: 1,
      preparing: 2,
      ready: 3,
      served: 4,
    };

    const normalizedNextStatus = normalizeTrackedStatus(newStatus);
    if (statusRank[normalizedNextStatus] <= statusRank[normalizeTrackedStatus(currentOrder.status)]) return;

    const updatedOrder: StoredOrder = {
      ...currentOrder,
      status: normalizedNextStatus,
      placedAt:
        currentOrder.placedAt ||
        new Date(currentOrder.statusHistory?.[0]?.timestamp ?? Date.now()).toISOString(),
      statusHistory: [
        ...currentOrder.statusHistory,
        {
          status: normalizedNextStatus,
          timestamp: Date.now(),
          message,
        },
      ],
    };

    lastOrderRef.current = updatedOrder;
    setLastOrder(updatedOrder);
    setTrackedOrders((current) => {
      const withoutCurrent = current.filter((entry) => entry.orderNumber !== updatedOrder.orderNumber);
      if (updatedOrder.status === "served" || !isOrderWithinTrackWindow(updatedOrder)) {
        return withoutCurrent;
      }
      return [updatedOrder, ...withoutCurrent]
        .sort((a, b) => getOrderPlacedAtMs(b) - getOrderPlacedAtMs(a))
        .slice(0, 30);
    });

    if (updatedOrder.status === "served") {
      localStorage.removeItem(getStoredOrderKey());
      setShowOrderTracker(false);
    } else {
      localStorage.setItem(getStoredOrderKey(), JSON.stringify(updatedOrder));
    }

    if (isCompletedPastOrderStatus(updatedOrder.status)) {
      setPastOrders((current) => {
        const withoutCurrent = current.filter(
          (entry) => entry.orderNumber !== updatedOrder.orderNumber,
        );
        return [updatedOrder, ...withoutCurrent].sort(
          (a, b) => getOrderPlacedAtMs(b) - getOrderPlacedAtMs(a),
        );
      });
    }

    setNotification({
      type: 'info',
      title: 'Order Update',
      message,
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const getOrderStatusMessage = (status: StoredOrder["status"]) => {
    if (status === "confirmed") return "Your order has been confirmed!";
    if (status === "preparing") return "Your order is being prepared!";
    if (status === "ready") return "Your order is ready!";
    if (status === "served") return "Your order has been served. Enjoy your meal!";
    return "Order placed successfully.";
  };

  const handleLogout = () => {
    localStorage.removeItem(getCartKey());
    localStorage.removeItem(getTipKey());
    localStorage.removeItem(getOrderNotesKey());
    localStorage.removeItem(getStoredOrderKey());
    sessionStorage.removeItem("tempUserId");
    window.location.href = "/menu";
  };

  const validateCardholderName = (name: string) => {
    if (!name.trim()) return "Cardholder name is required";
    if (name.length < 2) return "Name must be at least 2 characters";
    if (!/^[a-zA-Z\s]+$/.test(name)) return "Name can only contain letters and spaces";
    return "";
  };

  const validateCardNumber = (number: string) => {
    const cleanNumber = number.replace(/\s/g, "");
    if (!cleanNumber) return "Card number is required";
    if (!/^\d{13,19}$/.test(cleanNumber)) return "Card number must be 13-19 digits";
    return "";
  };

  const validateExpiration = (exp: string) => {
    if (!exp) return "Expiration date is required";
    if (!/^\d{2}\/\d{2}$/.test(exp)) return "Use MM/YY format";
    const [month, year] = exp.split("/");
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    if (parseInt(month, 10) < 1 || parseInt(month, 10) > 12) return "Invalid month";
    if (
      parseInt(year, 10) < currentYear ||
      (parseInt(year, 10) === currentYear && parseInt(month, 10) < currentMonth)
    ) {
      return "Card has expired";
    }
    return "";
  };

  const validateCvc = (value: string) => {
    if (!value) return "CVC is required";
    if (!/^\d{3,4}$/.test(value)) return "CVC must be 3-4 digits";
    return "";
  };

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\s/g, "");
    const groups = cleanValue.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleanValue;
  };

  const formatExpiration = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length >= 2) {
      return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2, 4)}`;
    }
    return cleanValue;
  };
  
  // Cart state with user tracking - using unique keys for each user's items
  const [cart, setCart] = useState<Record<string, CartItem>>(() => {
    const savedCart = localStorage.getItem(`cart_${userId}`);
    if (savedCart) {
      try {
        return JSON.parse(savedCart);
      } catch (error) {
        console.error('Error parsing saved cart:', error);
        return {};
      }
    }
    return {};
  });

  const unavailableMenuItemIds = useMemo(
    () =>
      new Set(
        (remoteCatalog?.items ?? [])
          .filter((item) => !item.isAvailable)
          .map((item) => item.id),
      ),
    [remoteCatalog],
  );

  const unavailableItemBaseNames = useMemo(
    () =>
      new Set(
        (remoteCatalog?.items ?? [])
          .filter((item) => !item.isAvailable)
          .map((item) => normalizeItemBaseName(item.name)),
      ),
    [remoteCatalog],
  );

  const isMenuItemOutOfStock = (menuItemId?: string, itemName?: string) => {
    if (menuItemId && unavailableMenuItemIds.has(menuItemId)) {
      return true;
    }
    if (!itemName) {
      return false;
    }
    return unavailableItemBaseNames.has(normalizeItemBaseName(itemName));
  };

  const isCartItemOutOfStock = (item: CartItem) => {
    return isMenuItemOutOfStock(item.menuItemId, item.baseItemName || item.name);
  };

  const hasOutOfStockItemsInCart = useMemo(
    () => Object.values(cart).some((item) => isCartItemOutOfStock(item)),
    [cart, unavailableMenuItemIds, unavailableItemBaseNames],
  );

  const ensureCartHasNoOutOfStockItems = () => {
    if (!hasOutOfStockItemsInCart) return true;
    window.alert(
      "One or more items in your cart are now out of stock. Remove them before checkout.",
    );
    return false;
  };
  
  // Get user-specific keys
  const getCartKey = () => `cart_${userId}`;
  const getTipKey = () => `selectedTip_${userId}`;
  const getOrderNotesKey = () => `orderNotes_${userId}`;
  const getStoredOrderKey = () => `lastOrder_${userId}`;
  const getCartItemKey = (itemName: string) => `${itemName}_${userId}`;
  
  // Wrapper function to convert item name to proper item key for removal
  const removeItemByName = (itemName: string) => {
    const itemKey = getCartItemKey(itemName);
    removeItemFromCart(itemKey);
  };
  const [showCart, setShowCart] = useState(false);

  // Collaborative cart functions
  const sendJoinRequest = (targetUserId: string) => {
    // Check if user ID is valid (not empty and not the same as current user)
    if (!targetUserId.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid User ID'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (targetUserId === userId) {
      setNotification({
        type: 'error',
        message: 'Cannot share cart with yourself'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Validate user ID format (should be 3 letters + 3 digits like ABC123)
    const userIdPattern = /^[A-Z]{3}\d{3}$/;
    if (!userIdPattern.test(targetUserId)) {
      setNotification({
        type: 'error',
        message: 'Invalid User ID format. Should be 3 letters followed by 3 digits (e.g., ABC123)'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Check if already in a collaborative session with this user
    if (isCollaborativeSession && collaborativeUserId === targetUserId) {
      setNotification({
        type: 'error',
        message: `You are already sharing cart with User ${targetUserId}`
      });
      setTimeout(() => setNotification(null), 3000);
      // Prevent scroll interference by not clearing input
      return;
    }
    
    const requestData: JoinRequest = {
      fromUserId: userId,
      fromUserName: displayName,
      targetUserId: targetUserId,
      timestamp: Date.now()
    };
    
    // Store the join request in localStorage for the target user
    const existingRequests = JSON.parse(
      localStorage.getItem('joinRequests') || '[]',
    ) as JoinRequest[];
    existingRequests.push(requestData);
    localStorage.setItem('joinRequests', JSON.stringify(existingRequests));
    
    // Store a pending request for the sender (not a full session yet)
    const pendingRequest: PendingJoinRequest = {
      targetUserId: targetUserId,
      timestamp: Date.now(),
      status: 'pending'
    };
    localStorage.setItem(`pendingJoinRequest_${userId}`, JSON.stringify(pendingRequest));
    if (pendingJoinTimeoutRef.current !== null) {
      window.clearTimeout(pendingJoinTimeoutRef.current);
    }
    pendingJoinTimeoutRef.current = window.setTimeout(() => {
      const pendingRaw = localStorage.getItem(`pendingJoinRequest_${userId}`);
      if (!pendingRaw) return;
      try {
        const pendingData = JSON.parse(pendingRaw) as PendingJoinRequest;
        if (pendingData.targetUserId !== targetUserId) return;
        localStorage.removeItem(`pendingJoinRequest_${userId}`);
        setNotification({
          type: 'error',
          message: `Join request to User ${pendingData.targetUserId} timed out`
        });
        setTimeout(() => setNotification(null), 3000);
      } catch {
        localStorage.removeItem(`pendingJoinRequest_${userId}`);
      }
    }, 30000);
    
    // Show success notification
    setNotification({
      type: 'success',
      message: `Join request sent to User ${targetUserId}. Waiting for response...`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const checkForJoinRequests = () => {
    const requests = JSON.parse(
      localStorage.getItem('joinRequests') || '[]',
    ) as JoinRequest[];
    
    const pendingRequest = requests.find((req) => req.targetUserId === userId);
    
    if (pendingRequest) {
      setJoinRequestData({
        fromUserId: pendingRequest.fromUserId,
        fromUserName: pendingRequest.fromUserName
      });
      setShowJoinRequest(true);
      
      // Remove the processed request
      const updatedRequests = requests.filter((req) => req.targetUserId !== userId);
      localStorage.setItem('joinRequests', JSON.stringify(updatedRequests));
    }
  };

  const checkForJoinRequestResponses = () => {
    const response = localStorage.getItem(`joinRequestResponse_${userId}`);
    if (response) {
      try {
        const responseData = JSON.parse(response) as JoinRequestResponse;
        
        if (responseData.status === 'accepted') {
          // The target user accepted our request, set up collaborative session
          setIsCollaborativeSession(true);
          setCollaborativeUserId(responseData.targetUserId);
          
          setNotification({
            type: 'success',
            message: `User ${responseData.targetUserId} accepted your join request!`
          });
          setTimeout(() => setNotification(null), 3000);
        } else if (responseData.status === 'declined') {
          // The target user declined our request
          setNotification({
            type: 'error',
            message: `User ${responseData.targetUserId} declined your join request`
          });
          setTimeout(() => setNotification(null), 3000);
        }
        localStorage.removeItem(`pendingJoinRequest_${userId}`);
        if (pendingJoinTimeoutRef.current !== null) {
          window.clearTimeout(pendingJoinTimeoutRef.current);
          pendingJoinTimeoutRef.current = null;
        }
        
        // Clear the response
        localStorage.removeItem(`joinRequestResponse_${userId}`);
      } catch (error) {
        console.error('Error processing join request response:', error);
        localStorage.removeItem(`joinRequestResponse_${userId}`);
      }
    }
  };

  const acceptJoinRequest = () => {
    const otherUserId = joinRequestData?.fromUserId;
    if (!otherUserId) return;

    // Check if either user has items in cart
    const myCart = JSON.parse(localStorage.getItem(`cart_${userId}`) || '{}');
    const otherCart = JSON.parse(localStorage.getItem(`cart_${otherUserId}`) || '{}');
    
    const hasMyItems = Object.keys(myCart).length > 0;
    const hasOtherItems = Object.keys(otherCart).length > 0;

    let finalCart = {};
    if (hasMyItems || hasOtherItems) {
      // Merge carts if either has items
      const mergedCart = { ...myCart };
      Object.keys(otherCart).forEach(itemName => {
        if (mergedCart[itemName]) {
          mergedCart[itemName].quantity += otherCart[itemName].quantity;
          // Preserve the original addedBy field
          if (!mergedCart[itemName].addedBy) {
            mergedCart[itemName].addedBy = otherCart[itemName].addedBy;
          }
        } else {
          mergedCart[itemName] = otherCart[itemName];
        }
      });
      
      finalCart = mergedCart;
      // Save merged cart to both users
      localStorage.setItem(`cart_${userId}`, JSON.stringify(mergedCart));
      localStorage.setItem(`cart_${otherUserId}`, JSON.stringify(mergedCart));
      setCart(mergedCart);
    }

    // Set up collaborative session for both users immediately
    setIsCollaborativeSession(true);
    setCollaborativeUserId(otherUserId);
    
    // Store collaborative session info for both users
    const sessionData = {
      userId1: userId,
      userId2: otherUserId,
      isActive: true,
      isLocked: false
    };
    localStorage.setItem(`collaborativeSession_${userId}`, JSON.stringify(sessionData));
    localStorage.setItem(`collaborativeSession_${otherUserId}`, JSON.stringify(sessionData));
    
    // Send immediate sync to the other user
    localStorage.setItem(`cart_sync_${otherUserId}`, JSON.stringify({
      timestamp: Date.now(),
      cart: finalCart,
      sessionStart: true,
      fromUserId: userId
    }));
    
    setShowJoinRequest(false);
    setJoinRequestData(null);
    
    // Notify the sender that their request was accepted
    localStorage.setItem(`joinRequestResponse_${otherUserId}`, JSON.stringify({
      targetUserId: userId,
      status: 'accepted',
      timestamp: Date.now()
    }));
    
    // Clear the pending request for the sender
    localStorage.removeItem(`pendingJoinRequest_${otherUserId}`);
  };

  const declineJoinRequest = () => {
    const otherUserId = joinRequestData?.fromUserId;
    if (otherUserId) {
      // Notify the sender that their request was declined
      localStorage.setItem(`joinRequestResponse_${otherUserId}`, JSON.stringify({
        targetUserId: userId,
        status: 'declined',
        timestamp: Date.now()
      }));
    }
    
    setShowJoinRequest(false);
    setJoinRequestData(null);
  };

  const lockSession = () => {
    setIsSessionLocked(true);
    if (collaborativeUserId) {
      const sessionData = JSON.parse(localStorage.getItem(`collaborativeSession_${userId}`) || '{}');
      sessionData.isLocked = true;
      localStorage.setItem(`collaborativeSession_${userId}`, JSON.stringify(sessionData));
      localStorage.setItem(`collaborativeSession_${collaborativeUserId}`, JSON.stringify(sessionData));
    }
  };

  const endCollaborativeSession = () => {
    if (collaborativeUserId) {
      const sessionData = {
        userId1: userId,
        userId2: collaborativeUserId,
        isActive: false,
        isLocked: false
      };
      localStorage.setItem(`collaborativeSession_${userId}`, JSON.stringify(sessionData));
      localStorage.setItem(`collaborativeSession_${collaborativeUserId}`, JSON.stringify(sessionData));
    }
    
    setIsCollaborativeSession(false);
    setCollaborativeUserId(null);
    setIsSessionLocked(false);
  };

  const exitCollaborativeSession = () => {
    if (!collaborativeUserId) return;

    // Filter cart to keep only items added by current user
    const myItems = Object.entries(cart).reduce((acc, [itemName, item]) => {
      if (item.addedBy === userId) {
        acc[itemName] = item;
      }
      return acc;
    }, {} as typeof cart);

    // Update cart with only my items
    setCart(myItems);
    localStorage.setItem(getCartKey(), JSON.stringify(myItems));

    // Notify the other user about the session end
    if (collaborativeUserId) {
      const sessionData = {
        userId1: userId,
        userId2: collaborativeUserId,
        isActive: false,
        isLocked: false
      };
      localStorage.setItem(`collaborativeSession_${userId}`, JSON.stringify(sessionData));
      localStorage.setItem(`collaborativeSession_${collaborativeUserId}`, JSON.stringify(sessionData));
      
      // Clear the other user's cart of items added by this user
      const otherUserCart = JSON.parse(localStorage.getItem(`cart_${collaborativeUserId}`) || '{}');
      const otherUserItems = Object.entries(otherUserCart).reduce((acc, [itemName, item]) => {
        if (item && typeof item === 'object' && 'addedBy' in item && item.addedBy !== userId) {
          acc[itemName] = item as {name: string; price: number; quantity: number; image?: string; details?: string; addedBy: string};
        }
        return acc;
      }, {} as typeof cart);
      
      localStorage.setItem(`cart_${collaborativeUserId}`, JSON.stringify(otherUserItems));
    }

    // Reset collaborative session state
    setIsCollaborativeSession(false);
    setCollaborativeUserId(null);
    setIsSessionLocked(false);
    setIsSyncing(false);

  };

  // Check if current user can modify an item
  const canModifyItem = (itemKey: string) => {
    const item = cart[itemKey];
    if (!item) return false;
    
    // If not in collaborative session, user can modify their own items
    if (!isCollaborativeSession) return true;
    
    // In collaborative session, user can only modify items they added
    return item.addedBy === userId;
  };

  // Group cart items by user and sort so current user's items come first
  const getCartItemsByUser = () => {
    const userGroups: {[userId: string]: Array<{name: string; price: number; quantity: number; image?: string; details?: string; addedBy: string}>} = {};
    
    Object.values(cart).forEach(item => {
      const user = item.addedBy;
      if (!userGroups[user]) {
        userGroups[user] = [];
      }
      userGroups[user].push(item);
    });
    
    // Convert to array and sort so current user's items come first
    const sortedEntries = Object.entries(userGroups).sort(([userA], [userB]) => {
      // Current user should always come first
      if (userA === userId) return -1;
      if (userB === userId) return 1;
      // For other users, maintain alphabetical order
      return userA.localeCompare(userB);
    });
    
    // Convert back to object with sorted order
    const sortedUserGroups: {[userId: string]: Array<{name: string; price: number; quantity: number; image?: string; details?: string; addedBy: string}>} = {};
    sortedEntries.forEach(([user, items]) => {
      sortedUserGroups[user] = items;
    });
    
    return sortedUserGroups;
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setScrollActiveTab(tab); // Sync the scroll active tab state

    // Scroll to the corresponding section
    const refs = {
      "Breakfast": breakfastRef,
      "Salads": saladsRef,
      "Sandwiches": sandwichesRef,
      "Coffee": coffeeRef,
      "Slow Bar": slowBarRef,
      "Not Coffee": notCoffeeRef,
      "Matcha": matchaRef,
    };

    const targetRef = refs[tab as keyof typeof refs];
    if (targetRef?.current) {
      // Simple scroll to element with offset
      const yOffset = -120; // Offset for sticky header
      const element = targetRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({top: y, behavior: 'smooth'});
    }
  };

  const getSelectedAddOnTotal = (item: MenuItemData, addOns: string[] = []) => {
    if (!item.addOnOptions?.length) return 0;
    return item.addOnOptions
      .filter((option) => addOns.includes(option.label))
      .reduce((total, option) => total + option.price, 0);
  };

  const getBaseItemPrice = (item: MenuItemData, temperature?: string | null) => {
    if (temperature && typeof item.temperaturePrices?.[temperature] === "number") {
      return item.temperaturePrices[temperature];
    }

    if (item.temperaturePrices) {
      if (item.temperatureOptions?.length) {
        const firstAvailablePrice = item.temperatureOptions
          .map((option) => item.temperaturePrices?.[option])
          .find((price): price is number => typeof price === "number");
        if (typeof firstAvailablePrice === "number") {
          return firstAvailablePrice;
        }
      }

      const firstDefinedPrice = Object.values(item.temperaturePrices).find(
        (price): price is number => typeof price === "number",
      );
      if (typeof firstDefinedPrice === "number") {
        return firstDefinedPrice;
      }
    }

    return resolvePrice(item.name, item.price);
  };

  const isOrderableItem = (item: MenuItemData) =>
    item.isAvailable !== false &&
    getBaseItemPrice(item, item.temperatureOptions?.[0] ?? null) > 0;

  const getItemPriceLabel = (item: MenuItemData, temperature?: string | null) => {
    if (temperature) {
      const selectedPrice = getBaseItemPrice(item, temperature);
      return selectedPrice > 0 ? `Rs.${selectedPrice.toLocaleString()}/-` : null;
    }

    if (item.temperaturePrices && item.temperatureOptions?.length) {
      const priceEntries = item.temperatureOptions
        .map((option) => ({ option, price: item.temperaturePrices?.[option] }))
        .filter((entry): entry is { option: string; price: number } => typeof entry.price === "number");

      if (!priceEntries.length) {
        return null;
      }

      const uniquePrices = Array.from(new Set(priceEntries.map((entry) => entry.price)));
      if (uniquePrices.length === 1) {
        return `Rs.${uniquePrices[0].toLocaleString()}/-`;
      }

      return priceEntries
        .map((entry) => `${entry.option} Rs.${entry.price.toLocaleString()}/-`)
        .join(" • ");
    }

    const basePrice = getBaseItemPrice(item, null);
    return basePrice > 0 ? `Rs.${basePrice.toLocaleString()}/-` : null;
  };

  const getSuggestedItemByName = (itemName: string) => {
    const key = itemName.toLowerCase();
    return (
      menuItemLookupByName.get(key) ??
      SUGGESTED_ITEMS.find((item) => item.name.toLowerCase() === key)
    );
  };

  const getSuggestedSelectionTotal = () =>
    selectedSuggestedItems.reduce((total, itemName) => {
      const suggestion = getSuggestedItemByName(itemName);
      if (!suggestion) return total;
      return total + resolvePrice(suggestion.name, suggestion.price);
    }, 0);

  const getSelectedItemPrice = (
    item: MenuItemData,
    eggType?: string | null,
    temperature?: string | null,
    addOns: string[] = [],
  ) => {
    return getBaseItemPrice(item, temperature) + getSelectedAddOnTotal(item, addOns);
  };

  const getSelectedCartName = (
    item: MenuItemData,
    eggType?: string | null,
    temperature?: string | null,
    addOns: string[] = [],
  ) => {
    const segments = [item.name];
    if (item.eggOptions?.length && eggType) {
      segments[0] = `${segments[0]} (${eggType})`;
    }
    if (item.temperatureOptions?.length && temperature) {
      segments[0] = `${segments[0]} (${temperature})`;
    }
    if (addOns.length) {
      segments[0] = `${segments[0]} + ${addOns.join(" + ")}`;
    }
    return segments[0];
  };

  const getSelectedItemDetails = (
    item: MenuItemData,
    eggType?: string | null,
    temperature?: string | null,
    addOns: string[] = [],
  ) => {
    const details: string[] = [];
    if (item.eggOptions?.length && eggType) {
      details.push(`Eggs: ${eggType}`);
    }
    if (item.temperatureOptions?.length && temperature) {
      details.push(`Temperature: ${temperature}`);
    }
    if (addOns.length) {
      details.push(`Extras: ${addOns.join(", ")}`);
    }
    return details.length ? `${item.description || ""} ${details.join(" | ")}`.trim() : item.description;
  };

  // Cart functions
  const addItemToCart = (
    itemName: string,
    price: number,
    image?: string,
    details?: string,
    meta?: { menuItemId?: string; baseItemName?: string },
  ) => {
    if (!ensureCartAuth()) {
      return;
    }

    if (!ensureOrderingEnabled()) {
      return;
    }

    if (isMenuItemOutOfStock(meta?.menuItemId, meta?.baseItemName || itemName)) {
      window.alert(`${itemName} is currently out of stock.`);
      return;
    }

    if (isSessionLocked) {
      return;
    }

    setCart(prev => {
      // Create unique key for this user's item
      const uniqueKey = getCartItemKey(itemName);
      
      const newCart = {
        ...prev,
        [uniqueKey]: {
          name: itemName,
          price: price,
          quantity: (prev[uniqueKey]?.quantity || 0) + 1,
          image: image,
          details: details,
          addedBy: userId,
          menuItemId: meta?.menuItemId ?? prev[uniqueKey]?.menuItemId,
          baseItemName: meta?.baseItemName ?? prev[uniqueKey]?.baseItemName,
        }
      };
      localStorage.setItem(getCartKey(), JSON.stringify(newCart));
      
      // If in collaborative session, sync with other user immediately
      if (isCollaborativeSession && collaborativeUserId) {
        // Trigger a sync event for the other user
        localStorage.setItem(`cart_sync_${collaborativeUserId}`, JSON.stringify({
          timestamp: Date.now(),
          cart: newCart
        }));
        // Show syncing indicator briefly
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 1000);
      }
      
      return newCart;
    });
  };

  const removeItemFromCart = (itemKey: string) => {
    if (isSessionLocked) {
      return;
    }

    // Check if user can modify this item
    if (!canModifyItem(itemKey)) {
      return;
    }

    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemKey]) {
        if (newCart[itemKey].quantity <= 1) {
          delete newCart[itemKey];
        } else {
          newCart[itemKey].quantity -= 1;
        }
      }
      localStorage.setItem(getCartKey(), JSON.stringify(newCart));
      
      // If in collaborative session, sync with other user immediately
      if (isCollaborativeSession && collaborativeUserId) {
        // Trigger a sync event for the other user
        localStorage.setItem(`cart_sync_${collaborativeUserId}`, JSON.stringify({
          timestamp: Date.now(),
          cart: newCart
        }));
        // Show syncing indicator briefly
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 1000);
      }
      
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
  };

useEffect(() => {
    const updateCallWaiterOffset = () => {
      const trackerHeight =
        showOrderTracker && currentTrackedOrder && orderTrackerBarRef.current
          ? orderTrackerBarRef.current.offsetHeight
          : 0;
      const cartHeight =
        getCartItemCount() > 0 && cartBarRef.current
          ? cartBarRef.current.offsetHeight
          : 0;

      // Keep the button above any fixed bottom bars.
      setCallWaiterBottomOffset(Math.max(24, trackerHeight + cartHeight + 16));
    };

    updateCallWaiterOffset();
    window.addEventListener("resize", updateCallWaiterOffset);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateCallWaiterOffset)
        : null;

    if (observer && orderTrackerBarRef.current) observer.observe(orderTrackerBarRef.current);
    if (observer && cartBarRef.current) observer.observe(cartBarRef.current);

    return () => {
      window.removeEventListener("resize", updateCallWaiterOffset);
      observer?.disconnect();
    };
  }, [showOrderTracker, currentTrackedOrder, cart, trackableOrders.length, trackerPageIndex]);

  const getCartQuantityByName = (itemName: string) => {
    const item = Object.values(cart).find(entry => entry.name === itemName);
    return item?.quantity || 0;
  };

  const resolvePrice = (name: string, fallback?: number) => {
    const numericFallback = typeof fallback === "number" ? fallback : 0;
    if (numericFallback > 0) return numericFallback;
    const key = name.toLowerCase();
    const menuItem = menuItemLookupByName.get(key);
    if (menuItem) {
      if (typeof menuItem.price === "number" && menuItem.price > 0) {
        return menuItem.price;
      }

      const temperatureFromOptions = menuItem.temperatureOptions
        ?.map((option) => menuItem.temperaturePrices?.[option])
        .find((price): price is number => typeof price === "number");
      if (typeof temperatureFromOptions === "number") {
        return temperatureFromOptions;
      }

      const firstTemperaturePrice = Object.values(menuItem.temperaturePrices ?? {}).find(
        (price): price is number => typeof price === "number",
      );
      if (typeof firstTemperaturePrice === "number") {
        return firstTemperaturePrice;
      }
    }

    const suggested = SUGGESTED_ITEMS.find(
      (item) => item.name.toLowerCase() === key,
    );
    return suggested?.price ?? 0;
  };

  const getTipAmount = () => {
    const subtotal = getCartTotal();
    return Math.round((subtotal * selectedTip) / 100);
  };

  const getGstAmount = () => Math.round(getCartTotal() * 0.05);
  const getServiceFee = () => Math.round((getCartTotal() + getGstAmount()) * 0.01);

  const getTotalWithTip = () => {
    return getCartTotal() + getTipAmount();
  };

  const getGrandTotal = () =>
    getCartTotal() + getGstAmount() + getServiceFee() + getTipAmount();

  const clearCart = () => {
    setCart({});
    localStorage.removeItem(getCartKey());
    
    // If in collaborative session, also clear the other user's cart and end session
    if (isCollaborativeSession && collaborativeUserId) {
      localStorage.removeItem(`cart_${collaborativeUserId}`);
      
      // End the collaborative session
      const sessionData = {
        userId1: userId,
        userId2: collaborativeUserId,
        isActive: false,
        isLocked: false
      };
      localStorage.setItem(`collaborativeSession_${userId}`, JSON.stringify(sessionData));
      localStorage.setItem(`collaborativeSession_${collaborativeUserId}`, JSON.stringify(sessionData));
      
      // Reset collaborative session state
      setIsCollaborativeSession(false);
      setCollaborativeUserId(null);
      setIsSessionLocked(false);
    }
  };

  const getSplitAmount = () => {
    const total = getCartTotal() + getTipAmount();
    
    switch (splitType) {
      case 'equal':
        return total / splitCount;
      case 'custom':
        const customTotal = Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
        return customTotal / splitCount;
      case 'by-item':
        return total / splitCount;
      default:
        return total / splitCount;
    }
  };

  const getCustomSplitTotal = () => {
    return Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
  };

  // Auto-scroll active tab into view when it changes
  useEffect(() => {
    const scrollActiveTabIntoView = () => {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const activeTabElement = document.querySelector(`[data-tab="${scrollActiveTab}"]`);
        if (activeTabElement) {
          activeTabElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }, 50);
    };

    scrollActiveTabIntoView();
  }, [scrollActiveTab]);

  // Handle sticky header visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyHeader(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-based active tab detection using IntersectionObserver
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -50% 0px', // Trigger when section is 100px from top and 50% visible
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          setScrollActiveTab(sectionId);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    const sections = [
      { id: "Breakfast", ref: breakfastRef },
      { id: "Salads", ref: saladsRef },
      { id: "Sandwiches", ref: sandwichesRef },
      { id: "Coffee", ref: coffeeRef },
      { id: "Slow Bar", ref: slowBarRef },
      { id: "Not Coffee", ref: notCoffeeRef },
      { id: "Matcha", ref: matchaRef },
    ];

    sections.forEach(({ id, ref }) => {
      if (ref.current) {
        ref.current.id = id; // Set id for intersection observer
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  const openItemDetailFromCard = (cardEl: HTMLDivElement) => {
    const name = cardEl.querySelector('.item-title')?.textContent?.trim();
    if (!name) return;
    const description = cardEl.querySelector('.item-description')?.textContent?.trim() || "";
    const priceText = cardEl.querySelector('.item-price')?.textContent || "";
    const numeric = priceText.replace(/[^\d]/g, "");
    const price = resolvePrice(name, numeric ? parseInt(numeric, 10) : undefined);
    const image = (cardEl.querySelector('img') as HTMLImageElement | null)?.getAttribute('src') || "";
    const currentQty = getCartQuantityByName(name);
    setSelectedItem({ name, description, price, image });
    setSelectedEggType(null);
    setSelectedTemperature(null);
    setSelectedAddOns([]);
    setItemQuantity(currentQty > 0 ? currentQty : 1);
    setShowItemModal(true);
  };

  const openItemDetailFromData = (item: MenuItemData) => {
    if (isMenuItemOutOfStock(item.menuItemId, item.name)) {
      window.alert(`${item.name} is currently out of stock.`);
      return;
    }
    if (!isOrderableItem(item)) return;
    const defaultTemperature = item.temperatureOptions?.[0] ?? null;
    const price = getBaseItemPrice(item, defaultTemperature);
    const image = item.image || "";
    const description = item.description || "";
    const defaultEggType = item.eggOptions?.[0] ?? null;
    const currentQty = getCartQuantityByName(getSelectedCartName(item, defaultEggType, defaultTemperature, []));
    setSelectedItem({ ...item, name: item.name, description, price, image });
    setSelectedEggType(defaultEggType);
    setSelectedTemperature(defaultTemperature);
    setSelectedAddOns([]);
    setSelectedSuggestedItems([]);
    setItemQuantity(currentQty > 0 ? currentQty : 1);
    setShowItemModal(true);
  };

  const handleCloseItemModal = () => {
    setShowItemModal(false);
    setSelectedItem(null);
    setSelectedEggType(null);
    setSelectedTemperature(null);
    setSelectedAddOns([]);
    setSelectedSuggestedItems([]);
    setItemQuantity(1);
  };

  const handleAddSelectedItem = () => {
    if (!selectedItem) return;
    if (!ensureCartAuth()) return;
    if (!ensureOrderingEnabled()) return;
    if (isMenuItemOutOfStock(selectedItem.menuItemId, selectedItem.name)) {
      window.alert(`${selectedItem.name} is currently out of stock.`);
      return;
    }
    const cartName = getSelectedCartName(selectedItem, selectedEggType, selectedTemperature, selectedAddOns);
    const itemPrice = getSelectedItemPrice(selectedItem, selectedEggType, selectedTemperature, selectedAddOns);
    const itemDetails = getSelectedItemDetails(selectedItem, selectedEggType, selectedTemperature, selectedAddOns);
    const currentQty = getCartQuantityByName(cartName);
    const diff = itemQuantity - currentQty;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        addItemToCart(cartName, itemPrice, selectedItem.image, itemDetails, {
          menuItemId: selectedItem.menuItemId,
          baseItemName: selectedItem.name,
        });
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        removeItemByName(cartName);
      }
    }

    const unavailableSuggestedItems = selectedSuggestedItems.filter((itemName) =>
      isMenuItemOutOfStock(undefined, itemName),
    );
    if (unavailableSuggestedItems.length > 0) {
      window.alert(
        `These suggested items are out of stock and were not added: ${unavailableSuggestedItems.join(", ")}`,
      );
    }

    selectedSuggestedItems
      .filter((itemName) => {
        const suggestion = getSuggestedItemByName(itemName);
        return !isMenuItemOutOfStock(suggestion?.menuItemId, itemName);
      })
      .forEach((itemName) => {
      const suggestion = getSuggestedItemByName(itemName);
      if (!suggestion) return;
      addItemToCart(
        suggestion.name,
        resolvePrice(suggestion.name, suggestion.price),
        undefined,
        suggestion.description || "Frequently bought together",
        { menuItemId: suggestion.menuItemId, baseItemName: suggestion.name },
      );
      });

    handleCloseItemModal();
  };

  const handleAddSuggestedItem = (item: MenuItemData) => {
    if (!ensureOrderingEnabled()) return;
    if (isMenuItemOutOfStock(item.menuItemId, item.name)) {
      window.alert(`${item.name} is currently out of stock.`);
      return;
    }
    const price = getBaseItemPrice(item, item.temperatureOptions?.[0] ?? null);
    if (price <= 0) return;
    setSelectedSuggestedItems((prev) =>
      prev.includes(item.name)
        ? prev.filter((name) => name !== item.name)
        : [...prev, item.name],
    );
  };

  useEffect(() => {
    if (!selectedItem || !showItemModal) return;
    const cartName = getSelectedCartName(selectedItem, selectedEggType, selectedTemperature, selectedAddOns);
    const currentQty = getCartQuantityByName(cartName);
    setItemQuantity(currentQty > 0 ? currentQty : 1);
  }, [selectedItem, selectedEggType, selectedTemperature, selectedAddOns, showItemModal, cart]);

  useEffect(() => {
    localStorage.setItem(getTipKey(), selectedTip.toString());
  }, [selectedTip]);

  useEffect(() => {
    localStorage.setItem(getOrderNotesKey(), orderNotes);
  }, [orderNotes]);

  useEffect(() => {
    const pushSetupMessage = sessionStorage.getItem("pushSetupMessage");
    if (!pushSetupMessage) return;

    setNotification({
      type: "info",
      title: "Notifications",
      message: pushSetupMessage,
    });
    sessionStorage.removeItem("pushSetupMessage");
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const closeFirstVisitPromo = () => {
    setShowFirstVisitPromo(false);
  };

  const handleAddToHomeScreen = async () => {
    if (typeof window === "undefined") {
      closeFirstVisitPromo();
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: "TableTap",
          text: "Save TableTap to your Home Screen",
          url: window.location.href,
        });
      } else {
        setNotification({
          type: "success",
          title: "Add to Home Screen",
          message: "Use your browser Share menu and choose 'Add to Home Screen'.",
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch {
      // User cancelled the share sheet or share failed.
    } finally {
      closeFirstVisitPromo();
    }
  };

  const goToNextPromoSlide = () => {
    setPromoSlideIndex((current) => (current + 1) % PROMO_SLIDES.length);
  };

  const goToPreviousPromoSlide = () => {
    setPromoSlideIndex((current) => (current - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  };

  useEffect(() => {
    if (showItemModal || showCart || showSidebarMenu || showAuthDrawer || showAccountDrawer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showItemModal, showCart, showSidebarMenu, showAuthDrawer, showAccountDrawer]);

  useEffect(() => {
    if (!showAccountDrawer) return;
    setDisplayNameDraft(displayName);
    setAccountEmailDraft(accountEmail);
    setAccountSaveError(null);
  }, [showAccountDrawer, displayName, accountEmail]);

  useEffect(() => {
    if (!supabaseBrowser) {
      return;
    }

    let mounted = true;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      const session = data.session;
      const isAuthenticated = Boolean(session);
      setIsMenuAuthenticated(isAuthenticated);
      if (isAuthenticated) {
        localStorage.setItem(MENU_AUTH_KEY, "true");
      } else {
        localStorage.removeItem(MENU_AUTH_KEY);
      }
      const email = session?.user?.email ?? "";
      if (email) {
        setAuthEmail(email);
        if (!localStorage.getItem(ACCOUNT_EMAIL_KEY)) {
          const normalized = email.trim().toLowerCase();
          setAccountEmail(normalized);
          setAccountEmailDraft(normalized);
          localStorage.setItem(ACCOUNT_EMAIL_KEY, normalized);
        }
      }
      const nameFromProfile = String(session?.user?.user_metadata?.display_name ?? "").trim();
      if (nameFromProfile) {
        setDisplayName(nameFromProfile);
        setDisplayNameDraft(nameFromProfile);
        localStorage.setItem(DISPLAY_NAME_KEY, nameFromProfile);
      }
    });

    const { data } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      const isAuthenticated = Boolean(session);
      setIsMenuAuthenticated(isAuthenticated);
      if (isAuthenticated) {
        localStorage.setItem(MENU_AUTH_KEY, "true");
      } else {
        localStorage.removeItem(MENU_AUTH_KEY);
      }

      const email = session?.user?.email ?? "";
      if (email) {
        setAuthEmail(email);
        if (!localStorage.getItem(ACCOUNT_EMAIL_KEY)) {
          const normalized = email.trim().toLowerCase();
          setAccountEmail(normalized);
          setAccountEmailDraft(normalized);
          localStorage.setItem(ACCOUNT_EMAIL_KEY, normalized);
        }
      }
      const nameFromProfile = String(session?.user?.user_metadata?.display_name ?? "").trim();
      if (nameFromProfile) {
        setDisplayName(nameFromProfile);
        setDisplayNameDraft(nameFromProfile);
        localStorage.setItem(DISPLAY_NAME_KEY, nameFromProfile);
      }

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecoveryMode(true);
        setShowAuthDrawer(true);
        setAuthError(null);
        setAuthMessage("Set a new password for your account.");
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const saveDisplayName = () => {
    const normalizedName = displayNameDraft.trim().slice(0, 32);
    const finalName = normalizedName || getDefaultDisplayName(userId);
    setDisplayName(finalName);
    setDisplayNameDraft(finalName);
    localStorage.setItem(DISPLAY_NAME_KEY, finalName);
  };

  const loadPastOrdersFromServer = async () => {
    try {
      setPastOrdersLoading(true);
      const response = await fetchCustomerOrderHistory({
        deviceFingerprint,
        branchCode: "f7-islamabad",
        limit: 1000,
      });

      const mapped = response.orders
        .map((order): StoredOrder => {
          const normalizedStatus = normalizeTrackedStatus(order.status);
          const placedAtMs = new Date(order.placedAt).getTime();
          return {
            orderNumber: order.orderNumber,
            total: Number(order.total ?? 0),
            subtotal: Number(order.subtotal ?? 0),
            tipAmount: Number(order.tipAmount ?? 0),
            serviceFee: Number(order.serviceFee ?? 0),
            gstAmount: Number(order.gstAmount ?? 0),
            tableLabel: order.tableLabel,
            notes: order.notes ?? "",
            status: normalizedStatus,
            statusHistory: [
              {
                status: normalizedStatus,
                timestamp: Number.isFinite(placedAtMs) ? placedAtMs : Date.now(),
                message: "Order placed",
              },
            ],
            placedAt: order.placedAt,
            items: (order.items ?? []).map((item) => ({
              name: item.name,
              quantity: Number(item.quantity ?? 1),
              price: Number(item.price ?? 0),
              details: item.details ?? "",
            })),
          };
        })
        .filter((order) => isCompletedPastOrderStatus(order.status))
        .sort((a, b) => getOrderPlacedAtMs(b) - getOrderPlacedAtMs(a));

      const deduped: StoredOrder[] = [];
      const seen = new Set<string>();
      for (const order of mapped) {
        if (seen.has(order.orderNumber)) continue;
        seen.add(order.orderNumber);
        deduped.push(order);
      }

      setPastOrders(deduped);
    } catch (error) {
      console.warn("Past orders sync failed:", error);
    } finally {
      setPastOrdersLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPastOrdersFromServer();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showPastOrdersModal) return;
    void loadPastOrdersFromServer();
  }, [showPastOrdersModal]);
  const openAccountDrawer = (
    options?: { errorMessage?: string | null; keepPendingCartOpen?: boolean },
  ) => {
    setDisplayNameDraft(displayName);
    setAccountEmailDraft(accountEmail);
    setAccountSaveError(options?.errorMessage ?? null);
    if (!options?.keepPendingCartOpen) {
      setPendingCartOpenAfterProfile(false);
    }
    setShowAccountDrawer(true);
  };

  const closeAccountDrawer = () => {
    setShowAccountDrawer(false);
    setPendingCartOpenAfterProfile(false);
  };

  const openCartWithProfileGuard = () => {
    if (!ensureOrderingEnabled()) return;

    if (isProfileCompleteForCart()) {
      setShowCart(true);
      return;
    }

    setPendingCartOpenAfterProfile(true);
    openAccountDrawer({
      errorMessage: "Please add your name and email before viewing cart.",
      keepPendingCartOpen: true,
    });
  };

  const handleSaveAccountProfile = async () => {
    const normalizedName = displayNameDraft.trim().slice(0, 32);
    const normalizedEmail = accountEmailDraft.trim().toLowerCase();

    if (!normalizedName) {
      setAccountSaveError("Please enter your name.");
      return;
    }
    if (!normalizedEmail) {
      setAccountSaveError("Please enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAccountSaveError("Please enter a valid email address.");
      return;
    }

    setAccountSaveError(null);
    setDisplayName(normalizedName);
    setDisplayNameDraft(normalizedName);
    setAccountEmail(normalizedEmail);
    setAccountEmailDraft(normalizedEmail);
    localStorage.setItem(DISPLAY_NAME_KEY, normalizedName);
    localStorage.setItem(ACCOUNT_EMAIL_KEY, normalizedEmail);

    try {
      const response = await upsertCustomerProfile({
        deviceFingerprint,
        name: normalizedName,
        email: normalizedEmail,
      });
      if (!response.profile.savedToDatabase && response.profile.warning) {
        setAccountSaveError(response.profile.warning);
        return;
      }
      setShowAccountDrawer(false);
      if (pendingCartOpenAfterProfile) {
        setPendingCartOpenAfterProfile(false);
        setShowCart(true);
      }
    } catch (error) {
      setAccountSaveError(
        error instanceof Error
          ? error.message
          : "Could not save account details to database. Please try again.",
      );
    }
  };

  // Listen for order placed events from checkout
  useEffect(() => {
    const handleOrderPlaced = (event: CustomEvent<StoredOrder>) => {
      const order = event.detail;
      const normalizedOrder: StoredOrder = {
        ...order,
        status: normalizeTrackedStatus(order.status),
        placedAt:
          order.placedAt ||
          new Date(order.statusHistory?.[0]?.timestamp ?? Date.now()).toISOString(),
      };
      const orderTableNumber = getTableNumberFromLabel(normalizedOrder.tableLabel);
      if (orderTableNumber !== tableNumber) {
        return;
      }
      setLastOrder(normalizedOrder);
      setTrackedOrders((current) => {
        const withoutCurrent = current.filter(
          (entry) => entry.orderNumber !== normalizedOrder.orderNumber,
        );
        return [normalizedOrder, ...withoutCurrent]
          .filter((entry) => normalizeTrackedStatus(entry.status) !== "served")
          .filter((entry) => isOrderWithinTrackWindow(entry))
          .sort((a, b) => getOrderPlacedAtMs(b) - getOrderPlacedAtMs(a))
          .slice(0, 30);
      });
      setTrackerPageIndex(0);
      setShowOrderTracker(true);
      localStorage.setItem(getStoredOrderKey(), JSON.stringify(normalizedOrder));

      // Show initial order placed notification
      setNotification({
        type: 'success',
        title: 'Order Placed!',
        message: `Order #${normalizedOrder.orderNumber} has been placed successfully.`
      });
      setTimeout(() => setNotification(null), 5000);
    };

    window.addEventListener('orderPlaced', handleOrderPlaced as EventListener);
    return () => window.removeEventListener('orderPlaced', handleOrderPlaced as EventListener);
  }, []);

  useEffect(() => {
    if (!lastOrder?.orderNumber || !supabaseBrowser) {
      return;
    }
    const supabaseClient = supabaseBrowser;

    const channel = supabaseClient
      .channel(`order-tracker-${lastOrder.orderNumber}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_number=eq.${lastOrder.orderNumber}`,
        },
        (payload) => {
          const nextStatus = normalizeTrackedStatus(payload.new?.status);

          updateOrderStatus(
            nextStatus,
            getOrderStatusMessage(nextStatus),
            lastOrder.orderNumber,
          );
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [lastOrder?.orderNumber]);

  useEffect(() => {
    if (!lastOrder?.orderNumber || lastOrder.status === "served") {
      return;
    }

    let cancelled = false;
    const orderNumber = lastOrder.orderNumber;

    const syncOrderStatus = async () => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      try {
        const response = await fetchOrderStatus(orderNumber);
        const nextStatus = normalizeTrackedStatus(response.order.status);
        if (!cancelled) {
          updateOrderStatus(nextStatus, getOrderStatusMessage(nextStatus), orderNumber);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Order tracker poll fallback failed:", error);
        }
      }
    };

    void syncOrderStatus();
    const interval = window.setInterval(() => {
      void syncOrderStatus();
    }, 9000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [lastOrder?.orderNumber, lastOrder?.status]);

  const getSuggestedItems = (currentName?: string) => {
    const currentKey = (currentName || "").toLowerCase().trim();
    const byItem = ITEM_SMART_SUGGESTIONS[currentKey] ?? [];
    const currentCategory = menuItemCategoryByName.get(currentKey);
    const byCategory = currentCategory
      ? DEFAULT_SUGGESTIONS_BY_CATEGORY[currentCategory] ?? []
      : [];
    const fallbackNames = SUGGESTED_ITEMS.map((item) => item.name);

    const candidateNames = [...byItem, ...byCategory, ...fallbackNames];
    const suggestions: MenuItemData[] = [];

    for (const candidateName of candidateNames) {
      const candidate = getSuggestedItemByName(candidateName);
      if (!candidate) continue;
      const candidateKey = candidate.name.toLowerCase();
      if (candidateKey === currentKey) continue;
      if (resolvePrice(candidate.name, candidate.price) <= 0) continue;
      if (suggestions.some((item) => item.name.toLowerCase() === candidateKey)) {
        continue;
      }
      suggestions.push(candidate);
      if (suggestions.length >= 3) {
        break;
      }
    }

    return suggestions;
  };

  const processCartSyncEvent = () => {
    const syncEvent = localStorage.getItem(`cart_sync_${userId}`);
    if (!syncEvent) return;
    try {
      const syncData = JSON.parse(syncEvent) as {
        timestamp?: number;
        cart?: Record<string, CartItem>;
        sessionStart?: boolean;
        fromUserId?: string;
      };
      const currentTime = Date.now();
      if (currentTime - Number(syncData.timestamp ?? 0) < 5000) {
        if (syncData.sessionStart) {
          setIsCollaborativeSession(true);
          setCollaborativeUserId(syncData.fromUserId || '');
        }
        setIsSyncing(true);
        setCart(syncData.cart ?? {});
        setTimeout(() => setIsSyncing(false), 1000);
      }
      localStorage.removeItem(`cart_sync_${userId}`);
    } catch (error) {
      console.error('Error processing cart sync:', error);
      localStorage.removeItem(`cart_sync_${userId}`);
    }
  };

  useEffect(() => {
    checkForJoinRequests();
    checkForJoinRequestResponses();
    processCartSyncEvent();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'joinRequests') {
        checkForJoinRequests();
      }
      if (event.key === `joinRequestResponse_${userId}`) {
        checkForJoinRequestResponses();
      }
      if (event.key === `cart_sync_${userId}`) {
        processCartSyncEvent();
      }
      if (event.key === `collaborativeSession_${userId}`) {
        const raw = localStorage.getItem(`collaborativeSession_${userId}`);
        if (!raw) return;
        try {
          const session = JSON.parse(raw) as {
            userId1?: string;
            userId2?: string;
            isActive?: boolean;
            isLocked?: boolean;
          };
          if (!session.isActive) {
            setIsCollaborativeSession(false);
            setCollaborativeUserId(null);
            setIsSessionLocked(false);
            return;
          }
          setIsCollaborativeSession(true);
          const otherUserId =
            session.userId1 === userId ? session.userId2 : session.userId1;
          setCollaborativeUserId(otherUserId || null);
          setIsSessionLocked(Boolean(session.isLocked));
        } catch (error) {
          console.error('Error processing collaborative session update:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId]);

  // Load collaborative session state from localStorage
  useEffect(() => {
    const sessionData = localStorage.getItem(`collaborativeSession_${userId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session.isActive) {
        setIsCollaborativeSession(true);
        // Set the collaborative user ID (the other user in the session)
        const otherUserId = session.userId1 === userId ? session.userId2 : session.userId1;
        setCollaborativeUserId(otherUserId);
        setIsSessionLocked(session.isLocked);
      }
    }
  }, [userId]);

  // Ensure cart is loaded from localStorage on component mount and userId change
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${userId}`);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, [userId]);

  // Additional cart loading on page visibility change (mobile-specific)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible again, check for cart data
        const savedCart = localStorage.getItem(`cart_${userId}`);
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart);
            setCart(parsedCart);
          } catch (error) {
            console.error('Error loading cart on visibility change:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(cart).length > 0) {
      localStorage.setItem(getCartKey(), JSON.stringify(cart));
    }
  }, [cart]);

  // Sync collaborative session state and cart periodically
  useEffect(() => {
    if (!isCollaborativeSession || !collaborativeUserId) return;

    const syncSession = () => {
      // Check if session is still active
      const sessionData = localStorage.getItem(`collaborativeSession_${userId}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (!session.isActive) {
          // Session ended, filter cart to keep only my items
          const myItems: typeof cart = {};
          Object.entries(cart).forEach(([itemName, item]) => {
            const typedItem = item as {name: string; price: number; quantity: number; image?: string; details?: string; addedBy: string};
            if (typedItem.addedBy === userId) {
              myItems[itemName] = typedItem;
            }
          });
          
          setCart(myItems);
          localStorage.setItem(getCartKey(), JSON.stringify(myItems));
          
          // Clear collaborative session state
          setIsCollaborativeSession(false);
          setCollaborativeUserId(null);
          setIsSessionLocked(false);
          
          // Show notification that session ended
          setNotification({
            type: 'error',
            message: `Session ended - User ${collaborativeUserId} disconnected`
          });
          setTimeout(() => setNotification(null), 3000);
        }
      }
      
      // Check if the other user is still active by looking for their heartbeat
      const otherUserHeartbeat = localStorage.getItem(`heartbeat_${collaborativeUserId}`);
      if (otherUserHeartbeat) {
        const heartbeat = JSON.parse(otherUserHeartbeat);
        const timeSinceHeartbeat = Date.now() - heartbeat.timestamp;
        
        // If no heartbeat for more than 20 seconds, consider user disconnected
        if (timeSinceHeartbeat > 20000) {
          // End the session
          const sessionData = localStorage.getItem(`collaborativeSession_${userId}`);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            session.isActive = false;
            localStorage.setItem(`collaborativeSession_${userId}`, JSON.stringify(session));
          }
          
          // Filter cart to keep only my items
          const myItems: typeof cart = {};
          Object.entries(cart).forEach(([itemName, item]) => {
            if (item && typeof item === 'object' && 'addedBy' in item) {
              const typedItem = item as {name: string; price: number; quantity: number; image?: string; details?: string; addedBy: string};
              if (typedItem.addedBy === userId) {
                myItems[itemName] = typedItem;
              }
            }
          });
          
          setCart(myItems);
          localStorage.setItem(getCartKey(), JSON.stringify(myItems));
          
          // Clear collaborative session state
          setIsCollaborativeSession(false);
          setCollaborativeUserId(null);
          setIsSessionLocked(false);
          
          // Show notification that user disconnected
          setNotification({
            type: 'error',
            message: `User ${collaborativeUserId} disconnected - session ended`
          });
          setTimeout(() => setNotification(null), 3000);
        }
      }
    };

    // Sync immediately and then every 3 seconds
    syncSession();
    const interval = setInterval(syncSession, 6000);

    return () => clearInterval(interval);
    }, [isCollaborativeSession, collaborativeUserId, userId]);



  // Heartbeat system to track user activity
  useEffect(() => {
    const updateHeartbeat = () => {
      const heartbeat = {
        userId: userId,
        timestamp: Date.now()
      };
      localStorage.setItem(`heartbeat_${userId}`, JSON.stringify(heartbeat));
    };

    // Update heartbeat every 5 seconds
    updateHeartbeat();
    const heartbeatInterval = setInterval(updateHeartbeat, 5000);

    return () => clearInterval(heartbeatInterval);
  }, [userId]);

  // Handle page unload and mobile-specific events to maintain session and cart
  useEffect(() => {
    const handleBeforeUnload = () => {
      // End collaborative session if active when user closes tab
      if (isCollaborativeSession && collaborativeUserId) {
        const sessionData = localStorage.getItem(`collaborativeSession_${userId}`);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          session.isActive = false;
          localStorage.setItem(`collaborativeSession_${userId}`, JSON.stringify(session));
        }
        
        // Also end session for the other user
        const otherSessionData = localStorage.getItem(`collaborativeSession_${collaborativeUserId}`);
        if (otherSessionData) {
          const otherSession = JSON.parse(otherSessionData);
          otherSession.isActive = false;
          localStorage.setItem(`collaborativeSession_${collaborativeUserId}`, JSON.stringify(otherSession));
        }
      }
    };

    const handleVisibilityChange = () => {
      // Save cart when page becomes hidden (mobile browser behavior)
      if (document.hidden && Object.keys(cart).length > 0) {
        localStorage.setItem(getCartKey(), JSON.stringify(cart));
      }
    };

    const handlePageHide = () => {
      // Save cart when page is hidden (mobile browser behavior)
      if (Object.keys(cart).length > 0) {
        localStorage.setItem(getCartKey(), JSON.stringify(cart));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isCollaborativeSession, collaborativeUserId, cart]);

  const openAuthDrawer = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthStep("credentials");
    setIsPasswordRecoveryMode(false);
    setAuthOtp("");
    setAuthError(null);
    setAuthMessage(null);
    setShowAuthDrawer(true);
  };

  const closeAuthDrawer = () => {
    setShowAuthDrawer(false);
    setAuthPassword("");
    setAuthOtp("");
    setAuthStep("credentials");
    setAuthError(null);
    setAuthMessage(null);
    setIsPasswordRecoveryMode(false);
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const normalizeAuthErrorMessage = (
    error: unknown,
    fallback = "Authentication request failed. Please try again.",
  ) => {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }
    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }
    if (error && typeof error === "object") {
      const maybeStatus = (error as { status?: number }).status;
      if (maybeStatus === 504) {
        return "Signup request timed out (504). Please try again in a moment.";
      }
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === "string" && maybeMessage.trim()) {
        return maybeMessage.trim();
      }
      try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== "{}") {
          return serialized;
        }
      } catch {
        // No-op
      }
    }
    return fallback;
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabaseBrowser) {
      setAuthError("Supabase auth is not configured yet.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      if (isPasswordRecoveryMode) {
        const nextPassword = newPassword.trim();
        if (!nextPassword || nextPassword.length < 6) {
          setAuthError("Password must be at least 6 characters.");
          return;
        }
        if (nextPassword !== confirmNewPassword.trim()) {
          setAuthError("Passwords do not match.");
          return;
        }
        const { error } = await supabaseBrowser.auth.updateUser({
          password: nextPassword,
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        setAuthMessage("Password updated. You can now log in.");
        setIsPasswordRecoveryMode(false);
        setAuthMode("login");
        setNewPassword("");
        setConfirmNewPassword("");
        return;
      }

      if (authMode === "signup" && authStep === "verify-signup") {
        const token = authOtp.trim();
        if (!token) {
          setAuthError("Enter the OTP code sent to your email.");
          return;
        }
        const { error } = await supabaseBrowser.auth.verifyOtp({
          email: authEmail.trim(),
          token,
          type: "signup",
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        saveDisplayName();
        setIsMenuAuthenticated(true);
        localStorage.setItem(MENU_AUTH_KEY, "true");
        closeAuthDrawer();
        return;
      }

      if (authMode === "signup") {
        const nameValue = displayNameDraft.trim().slice(0, 32);
        const { data, error } = await supabaseBrowser.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              display_name: nameValue || `User ${userId}`,
            },
            emailRedirectTo: `${window.location.origin}/menu`,
          },
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        if (data.session) {
          saveDisplayName();
          setIsMenuAuthenticated(true);
          localStorage.setItem(MENU_AUTH_KEY, "true");
          closeAuthDrawer();
          return;
        }
        setAuthStep("verify-signup");
        setAuthMessage(
          "A verification code/email has been sent. Enter OTP below, or use the email link."
        );
        return;
      }

      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      if (data.session) {
        setIsMenuAuthenticated(true);
        localStorage.setItem(MENU_AUTH_KEY, "true");
        closeAuthDrawer();
      }
    } catch (error) {
      setAuthError(
        normalizeAuthErrorMessage(
          error,
          "Could not complete authentication right now. Please try again.",
        ),
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!supabaseBrowser) {
      setAuthError("Supabase auth is not configured yet.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/menu`,
        },
      });
      if (error) {
        setAuthError(error.message);
      }
    } catch (error) {
      setAuthError(
        normalizeAuthErrorMessage(
          error,
          "Google sign-in failed. Please try again.",
        ),
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!supabaseBrowser) {
      setAuthError("Supabase auth is not configured yet.");
      return;
    }
    const email = authEmail.trim();
    if (!email) {
      setAuthError("Enter your email first.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);
    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/menu`,
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setAuthMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
      setAuthError(
        normalizeAuthErrorMessage(
          error,
          "Could not send password reset email right now.",
        ),
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const renderAuthControls = (compact = false) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full border border-gray-200 bg-white p-0.5 transition-colors hover:bg-gray-50"
            aria-label="Open account menu"
          >
            <Avatar className={compact ? "h-8 w-8" : "h-10 w-10"}>
              <AvatarImage src="/Avatar.avif" alt={`${displayName} avatar`} />
              <AvatarFallback className="overflow-hidden">
                <img src="/Avatar.avif" alt="Avatar icon" className="h-full w-full object-cover" />
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl">
          <DropdownMenuLabel className="py-2">
            <p className="text-sm font-semibold text-gray-900 heading-font">{displayName}</p>
            <p className="text-xs text-gray-500 subtext-font">{accountEmail || "Add name and email"}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openAccountDrawer()} className="cursor-pointer">
            <Pencil size={16} />
            <span className="heading-font">Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowPastOrdersModal(true)}
            className="cursor-pointer"
          >
            <ClipboardList size={16} />
            <span className="heading-font">View past order</span>
          </DropdownMenuItem>
          {hasTrackableOrders ? (
            <DropdownMenuItem
              onClick={openTrackerPanel}
              className="cursor-pointer"
            >
              <BellRing size={16} />
              <span className="heading-font">Track current order</span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() =>
              window.open("mailto:support@tabletap.app?subject=TableTap%20Support", "_blank")
            }
            className="cursor-pointer"
          >
            <LifeBuoy size={16} />
            <span className="heading-font">Support</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
      className="bg-[#faf9f6] pb-safe pb-2"
    >
      <AnimatePresence>
        {showWaiterBanner ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="fixed left-4 right-4 top-24 z-[95]"
          >
            <Card className="overflow-hidden border-[#91bda6] bg-[#eaf4ef] shadow-xl">
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-gray-900 heading-font">
                  Waiter called
                </p>
                <p className="mt-1 text-xs text-gray-700 subtext-font">
                  A waiter has been notified for your table.
                </p>
              </div>
              <div className="h-1 w-full bg-[#d6e7de]">
                <div
                  className="h-full bg-[#91bda6] transition-[width] duration-100"
                  style={{ width: `${waiterBannerProgress}%` }}
                />
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showFirstVisitPromo && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeFirstVisitPromo}
            />
            <motion.div
              className="fixed inset-0 z-[80] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-full max-w-md rounded-[30px] bg-white p-3 shadow-2xl">
                <div className="relative overflow-hidden rounded-[26px]">
                  <img
                    src={PROMO_SLIDES[promoSlideIndex].image}
                    alt={PROMO_SLIDES[promoSlideIndex].title}
                    className="h-[280px] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={closeFirstVisitPromo}
                    className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="px-4 pb-3 pt-6 text-center">
                  <h3 className="text-base font-semibold leading-[1.1] text-gray-900 heading-font">
                    {PROMO_SLIDES[promoSlideIndex].title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600 subtext-font">
                    {PROMO_SLIDES[promoSlideIndex].description}
                  </p>

                  <Button
                    type="button"
                    onClick={handleAddToHomeScreen}
                    className="mt-6 h-14 w-full rounded-2xl bg-black text-base font-semibold text-white heading-font hover:bg-gray-900"
                  >
                    {PROMO_SLIDES[promoSlideIndex].cta}
                  </Button>

                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={goToPreviousPromoSlide}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                    >
                      <ChevronLeft size={24} />
                    </button>

                    <div className="flex items-center gap-2">
                      {PROMO_SLIDES.map((_, index) => (
                        <button
                          key={`promo-dot-${index}`}
                          type="button"
                          onClick={() => setPromoSlideIndex(index)}
                          className={`h-3 rounded-full transition-all ${
                            promoSlideIndex === index
                              ? "w-12 bg-gray-500"
                              : "w-3 bg-gray-300"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={goToNextPromoSlide}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                    >
                      <ChevronLeft size={24} className="rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSidebarMenu && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[55] bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebarMenu(false)}
              aria-label="Close menu sidebar"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed inset-y-0 left-0 z-[60] flex w-[84vw] max-w-sm flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900 heading-font">Menu</p>
                  <p className="text-xs text-gray-500 subtext-font">Hi, {displayName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSidebarMenu(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                  aria-label="Close menu sidebar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="border-b border-gray-100 px-4 py-4">
                <p className="text-sm font-semibold text-gray-900 heading-font">{RESTAURANT.name}</p>
                <p className="mt-1 text-xs text-gray-500 subtext-font">{RESTAURANT.address}</p>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 subtext-font">
                  Categories
                </p>
                <div className="mt-2 space-y-1">
                  {tabs.map((tab) => {
                    const isCurrent = activeTab === tab || scrollActiveTab === tab;
                    return (
                      <button
                        key={`sidebar-tab-${tab}`}
                        type="button"
                        onClick={() => {
                          handleTabClick(tab);
                          setShowSidebarMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                          isCurrent
                            ? "bg-black text-white heading-font"
                            : "text-gray-700 hover:bg-gray-100 subtext-font"
                        }`}
                      >
                        <span>{tab}</span>
                        {isCurrent ? <Check size={14} /> : null}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-6 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 subtext-font">
                  Quick Actions
                </p>
                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSidebarMenu(false);
                      openCartWithProfileGuard();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <ShoppingCart size={16} />
                    <span className="heading-font">View cart ({getCartItemCount()})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSidebarMenu(false);
                      setShowPastOrdersModal(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <ClipboardList size={16} />
                    <span className="heading-font">View past order</span>
                  </button>
                  {hasTrackableOrders ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSidebarMenu(false);
                        openTrackerPanel();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      <BellRing size={16} />
                      <span className="heading-font">Track current order</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSidebarMenu(false);
                      window.open(
                        "mailto:support@tabletap.app?subject=TableTap%20Support",
                        "_blank"
                      );
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <LifeBuoy size={16} />
                    <span className="heading-font">Support</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAccountDrawer && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[70] bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAccountDrawer}
              aria-label="Close account drawer"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 250, damping: 28 }}
              className="fixed inset-x-0 bottom-0 z-[80] rounded-t-[30px] bg-white shadow-2xl"
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-semibold text-gray-900 heading-font">Account</p>
                    <p className="mt-1 text-sm text-gray-500 subtext-font">
                      Save your name and email on this device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeAccountDrawer}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                    aria-label="Close account drawer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form
                  className="mt-5 space-y-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSaveAccountProfile();
                  }}
                >
                  {accountSaveError ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 subtext-font">
                      {accountSaveError}
                    </p>
                  ) : null}

                  <div>
                    <label className="text-sm font-medium text-gray-700 subtext-font">Name</label>
                    <input
                      type="text"
                      value={displayNameDraft}
                      onChange={(event) => setDisplayNameDraft(event.target.value)}
                      maxLength={32}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 subtext-font">Email</label>
                    <input
                      type="email"
                      value={accountEmailDraft}
                      onChange={(event) => setAccountEmailDraft(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                      placeholder="you@example.com"
                    />
                  </div>

                  <p className="text-xs text-gray-500 subtext-font">
                    This information is saved on this device.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeAccountDrawer}
                      className="w-1/2 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 heading-font"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900 heading-font"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthDrawer && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[70] bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAuthDrawer}
              aria-label="Close auth drawer"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 250, damping: 28 }}
              className={`fixed inset-x-0 bottom-0 z-[80] rounded-t-[30px] bg-white shadow-2xl ${
                isPasswordRecoveryMode ? "h-[62vh]" : authMode === "signup" ? "h-[75vh]" : "h-[66vh]"
              }`}
            >
              <div className="flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-semibold text-gray-900 heading-font">
                      {isPasswordRecoveryMode
                        ? "Reset password"
                        : authMode === "signup"
                          ? "Create account"
                          : "Log in"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 subtext-font">
                      {isPasswordRecoveryMode
                        ? "Set a new password for your account."
                        : authMode === "signup"
                          ? "Sign up to save your details and track orders faster."
                          : "Log in to access your account features."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeAuthDrawer}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                    aria-label="Close auth drawer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {!isPasswordRecoveryMode ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthStep("credentials");
                        setAuthError(null);
                        setAuthMessage(null);
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        authMode === "login"
                          ? "bg-white text-gray-900 shadow-sm heading-font"
                          : "text-gray-600 subtext-font"
                      }`}
                    >
                      Log in
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signup");
                        setAuthStep("credentials");
                        setAuthError(null);
                        setAuthMessage(null);
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        authMode === "signup"
                          ? "bg-white text-gray-900 shadow-sm heading-font"
                          : "text-gray-600 subtext-font"
                      }`}
                    >
                      Sign up
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 flex-1 overflow-y-auto pr-1 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {!isPasswordRecoveryMode && authStep === "credentials" ? (
                      <>
                        <button
                          type="button"
                          onClick={handleGoogleAuth}
                          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 heading-font disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={authLoading}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-xs font-bold">
                            G
                          </span>
                          {authMode === "signup" ? "Sign up with Google" : "Log in with Google"}
                        </button>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-white px-3 text-xs text-gray-400 subtext-font">
                              or continue with email
                            </span>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {authError ? (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {authError}
                      </p>
                    ) : null}
                    {authMessage ? (
                      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {authMessage}
                      </p>
                    ) : null}

                    {isPasswordRecoveryMode ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-700 subtext-font">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                            placeholder="At least 6 characters"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 subtext-font">Confirm Password</label>
                          <input
                            type="password"
                            value={confirmNewPassword}
                            onChange={(event) => setConfirmNewPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                            placeholder="Re-enter your new password"
                            required
                          />
                        </div>
                      </>
                    ) : authMode === "signup" && authStep === "verify-signup" ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-700 subtext-font">Email</label>
                          <input
                            type="email"
                            value={authEmail}
                            onChange={(event) => setAuthEmail(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                            placeholder="you@example.com"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 subtext-font">OTP Code</label>
                          <input
                            type="text"
                            value={authOtp}
                            onChange={(event) => setAuthOtp(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                            placeholder="Enter OTP from email"
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {authMode === "signup" ? (
                          <div>
                            <label className="text-sm font-medium text-gray-700 subtext-font">Name</label>
                            <input
                              type="text"
                              value={displayNameDraft}
                              onChange={(event) => setDisplayNameDraft(event.target.value)}
                              maxLength={32}
                              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                              placeholder="Enter your name"
                            />
                          </div>
                        ) : null}
                        <div>
                          <label className="text-sm font-medium text-gray-700 subtext-font">Email</label>
                          <input
                            type="email"
                            value={authEmail}
                            onChange={(event) => setAuthEmail(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                            placeholder="you@example.com"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 subtext-font">Password</label>
                          <input
                            type="password"
                            value={authPassword}
                            onChange={(event) => setAuthPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-black"
                            placeholder="Enter password"
                            required
                          />
                        </div>
                        {authMode === "login" ? (
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-sm font-medium text-gray-700 underline-offset-4 transition-colors hover:text-black hover:underline subtext-font"
                            disabled={authLoading}
                          >
                            Forgot password?
                          </button>
                        ) : null}
                      </>
                    )}

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-black px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-gray-900 heading-font disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={authLoading}
                    >
                      {authLoading
                        ? "Please wait..."
                        : isPasswordRecoveryMode
                          ? "Update password"
                          : authMode === "signup" && authStep === "verify-signup"
                            ? "Verify OTP"
                            : authMode === "signup"
                              ? "Sign up"
                              : "Log in"}
                    </button>
                  </form>

                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-400 subtext-font">Quick actions</p>
                    <div className="space-y-2">
                      {isMenuAuthenticated ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowPastOrdersModal(true);
                            closeAuthDrawer();
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                        >
                          <ClipboardList size={16} />
                          <span className="heading-font">View past order</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          window.open("mailto:support@tabletap.app?subject=TableTap%20Support", "_blank");
                          closeAuthDrawer();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                      >
                        <LifeBuoy size={16} />
                        <span className="heading-font">Support</span>
                      </button>
                      {hasTrackableOrders ? (
                        <button
                          type="button"
                          onClick={() => {
                            openTrackerPanel();
                            closeAuthDrawer();
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                        >
                          <BellRing size={16} />
                          <span className="heading-font">Track current order</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div
        className="bg-white px-4 py-0 flex items-center justify-between border-b border-b-gray-200"
        style={{ minHeight: "2rem" }}
      >
        <div className="flex items-center gap-0">
          <button
            type="button"
            onClick={() => setShowSidebarMenu(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700"
            aria-label="Open menu sidebar"
          >
            <MenuIcon size={18} />
          </button>
          <img
            src="/TableTap.png"
            alt="Table Tap"
            className="shrink-0"
            style={{ height: "6rem", width: "auto", display: "block" }}
          />
        </div>
        <div className="flex items-center gap-2">
          {renderAuthControls(false)}
        </div>
      </div>

      {/* Menu Hero */}
      <div className="relative">
        <div className="h-[160px] w-full">
          <img
            src="/HeroImage.jpg"
            alt="SIP hero"
            className="h-full w-full object-cover object-bottom"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-transparent" />
        </div>

        <div className="absolute top-4 left-4 text-xs text-white space-y-1">
          {isSessionLocked && (
            <span className="px-3 py-1 bg-red-600/80 rounded-full font-semibold uppercase tracking-wide">
              Session locked
            </span>
          )}
          {isSyncing && (
            <span className="px-3 py-1 bg-blue-600/80 rounded-full font-semibold uppercase tracking-wide animate-pulse">
              Syncing...
            </span>
          )}
        </div>

        {isCollaborativeSession && (
          <div className="absolute bottom-4 left-4">
            <div className="bg-black/60 backdrop-blur rounded-full px-3 py-1 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-white">Shared Cart</span>
              <button
                onClick={exitCollaborativeSession}
                className="text-xs text-white/80 underline hover:text-white"
              >
                Exit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky header on scroll */}
      {showStickyHeader && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSidebarMenu(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700"
                aria-label="Open menu sidebar"
              >
                <MenuIcon size={17} />
              </button>
              <div className="text-lg font-semibold text-gray-900 heading-font">{RESTAURANT.name}</div>
            </div>
            <div className="flex items-center gap-2">
              {renderAuthControls(true)}
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 py-2">
                <input
                  type="text"
                  placeholder="Search menu"
                  className="bg-transparent text-sm w-full focus:outline-none subtext-font placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
          <div className="flex overflow-x-auto space-x-8 px-4 pb-3">
            {tabs.map(tab => (
              <button
                key={tab}
                data-tab={tab}
                onClick={() => handleTabClick(tab)}
                className={`text-sm font-medium pb-2 border-b-2 whitespace-nowrap ${
                  scrollActiveTab === tab
                    ? "border-black text-black heading-font"
                    : "border-transparent text-gray-500 subtext-font"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      )}

      {showOrderTracker && currentTrackedOrder && (
        <div ref={orderTrackerBarRef} className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-4 pb-[1.1rem] pt-3 backdrop-blur">
          <div className="rounded-3xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((step) => {
                const statusStepMap: Record<StoredOrder["status"], number> = {
                  placed: 0,
                  confirmed: 1,
                  preparing: 2,
                  ready: 3,
                  served: 3,
                };
                const currentStep = statusStepMap[currentTrackedOrder.status];
                const isTerminalStep =
                  currentTrackedOrder.status === "ready" ||
                  currentTrackedOrder.status === "served";
                const isCompletedStep = step < currentStep;
                const isCurrentAnimatedStep = !isTerminalStep && step === currentStep;
                const isFilledStep = isCompletedStep || (isTerminalStep && step <= currentStep);

                if (isCurrentAnimatedStep) {
                  return (
                    <div key={step} className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <motion.div
                        className="h-full origin-left rounded-full bg-black"
                        animate={{ scaleX: [0, 1, 1, 0] }}
                        transition={{
                          duration: 1.8,
                          repeat: Infinity,
                          ease: "linear",
                          times: [0, 0.75, 0.9, 1],
                        }}
                      />
                    </div>
                  );
                }

                return isFilledStep ? (
                  <div key={step} className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-black" />
                  </div>
                ) : (
                  <div key={step} className="h-1.5 rounded-full bg-gray-200" />
                );
              })}
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900 heading-font">
                  {currentTrackedOrder.status === 'placed' && 'Order placed'}
                  {currentTrackedOrder.status === 'confirmed' && 'Order confirmed'}
                  {currentTrackedOrder.status === 'preparing' && 'Your order is being prepared'}
                  {currentTrackedOrder.status === 'ready' && 'Your order is ready'}
                  {currentTrackedOrder.status === 'served' && 'Order served - Enjoy your meal!'}
                </p>
                <p className="mt-1 text-xs text-gray-500 subtext-font">
                  Order #{currentTrackedOrder.orderNumber} will be served to {currentTrackedOrder.tableLabel}.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissActiveOrder}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                Dismiss
              </button>
            </div>
            {trackableOrders.length > 1 ? (
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTrackerPageIndex((current) => Math.max(0, current - 1))}
                  disabled={trackerPageIndex === 0}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500 subtext-font">
                  {trackerPageIndex + 1} / {trackableOrders.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTrackerPageIndex((current) =>
                      Math.min(trackableOrders.length - 1, current + 1),
                    )
                  }
                  disabled={trackerPageIndex >= trackableOrders.length - 1}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleCallWaiter}
        className="fixed right-4 z-40 flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-gray-900 heading-font"
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${callWaiterBottomOffset}px)` }}
      >
        <BellRing size={18} />
        <span>Call waiter</span>
      </button>

      {/* Sticky View Cart Bar */}
      {getCartItemCount() > 0 && (
        <div
          ref={cartBarRef}
          className={`fixed inset-x-0 z-30 px-4 pb-[1.1rem] pt-2 bg-white/95 backdrop-blur border-t border-gray-200 ${
            showOrderTracker && currentTrackedOrder ? "bottom-24" : "bottom-0"
          }`}
        >
          <button
            onClick={() => {
              openCartWithProfileGuard();
            }}
            className="w-full flex items-center justify-between rounded-full bg-black text-white px-5 py-3 shadow-lg transition-colors hover:bg-gray-900 heading-font"
          >
            <div className="flex flex-col items-start leading-tight">
              <span className="text-base heading-font">View cart ({getCartItemCount()})</span>
              <span className="text-xs text-white/80 subtext-font">Tap to review your order</span>
            </div>
            <span className="text-base heading-font">Rs.{getCartTotal().toLocaleString()}</span>
          </button>
        </div>
      )}

      <div className="relative z-10">
        <div className="relative bg-white pt-16 pb-8 px-4 sm:px-8 border-b border-gray-200">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white shadow-xl border border-gray-100 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="SIP logo"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover"
              />
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 subtext-font">Table Tap</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900 heading-font">{RESTAURANT.name}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 subtext-font">
            <div className="flex items-center gap-1">
              <Star size={16} className="text-yellow-500" />
              <span>
                {RESTAURANT.rating} {"\u00B7"} {RESTAURANT.reviews.toLocaleString()}+ guests
              </span>
            </div>
            <span className="text-gray-300">{"\u00B7"}</span>
            <div className="flex items-center gap-1">
              <MapPin size={16} className="text-gray-400" />
              <span>{RESTAURANT.address}</span>
            </div>
            <span className="text-gray-300">{"\u00B7"}</span>
            <div className="flex items-center gap-1">
              <Clock size={16} className="text-gray-500" />
              <span>House service: {RESTAURANT.hours}</span>
            </div>
          </div>

          <div className="mt-6 text-sm subtext-font text-gray-700">
            <div className="grid grid-cols-2 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm divide-x divide-gray-200">
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-base font-semibold text-gray-900 heading-font">#{tableNumber}</p>
                <p className="text-xs text-gray-500 mt-1">Current table</p>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <p className="text-base font-semibold text-gray-900 heading-font">{RESTAURANT.servingTime}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">Average service time</p>
              </div>
            </div>
            {tableAccess && !tableAccess.orderingEnabled ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {tableAccess.message}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Scrollable Tabs (visible before sticky header takes over) */}
      {!showStickyHeader && (
        <div className="flex overflow-x-auto space-x-8 px-6 py-4 bg-white border-b">
          {tabs.map(tab => (
            <button
              key={tab}
              data-tab={tab}
              onClick={() => handleTabClick(tab)}
              className={`text-sm font-medium pb-2 border-b-2 whitespace-nowrap ${
                scrollActiveTab === tab
                  ? "border-black text-black heading-font"
                  : "border-transparent text-gray-500 subtext-font"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* All Sections on One Page */}
      <div className="px-4 pb-6">
        {/* Breakfast Section */}
         <div ref={breakfastRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">BREAKFAST AT SIP.</h2>
           <div className="flex space-x-4 overflow-x-auto">
             {BREAKFAST_SOURCE.map((item) => (
               (() => {
                 const unavailable = item.isAvailable === false;
                 return (
               <div
                 key={item.name}
                 className={`relative bg-white rounded-lg shadow w-56 flex-shrink-0 transition-shadow ${
                   unavailable
                     ? "cursor-not-allowed opacity-65"
                     : "cursor-pointer hover:shadow-lg"
                 }`}
                 onClick={() => !unavailable && openItemDetailFromData(item)}
                >
                  {unavailable ? (
                    <div className="absolute right-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                      Out of stock
                    </div>
                  ) : null}
                  <div className="p-3">
                    <div className="font-bold text-xs mb-1 item-title">{item.name}</div>
                    <div className="text-xs text-gray-500 mb-2 item-description">{item.description}</div>
                    <div className="font-bold text-sm item-price">Rs.{item.price}/-</div>
                  </div>
               </div>
                 );
               })()
             ))}
           </div>
         </div>

         {/* Salads Section */}
         <div ref={saladsRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">SALADS.</h2>
           <div className="flex space-x-4 overflow-x-auto">
             {SALAD_SOURCE.map((item) => (
               (() => {
                 const unavailable = item.isAvailable === false;
                 return (
               <div
                 key={item.name}
                 className={`relative bg-white rounded-lg shadow w-56 flex-shrink-0 transition-shadow ${
                   unavailable
                     ? "cursor-not-allowed opacity-65"
                     : "cursor-pointer hover:shadow-lg"
                 }`}
                 onClick={() => !unavailable && openItemDetailFromData(item)}
                >
                  {unavailable ? (
                    <div className="absolute right-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                      Out of stock
                    </div>
                  ) : null}
                  <div className="p-3">
                    <div className="font-bold text-xs mb-1 item-title">{item.name}</div>
                    <div className="text-xs text-gray-500 mb-2 item-description">{item.description}</div>
                    <div className="font-bold text-sm item-price">Rs.{item.price}/-</div>
                  </div>
               </div>
                 );
               })()
             ))}
           </div>
         </div>

         {/* Sandwiches Section */}
         <div ref={sandwichesRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">SANDWICHES.</h2>
           <div className="flex space-x-4 overflow-x-auto">
             {SANDWICH_SOURCE.map((item) => (
               (() => {
                 const unavailable = item.isAvailable === false;
                 return (
               <div
                 key={item.name}
                 className={`relative bg-white rounded-lg shadow w-56 flex-shrink-0 transition-shadow ${
                   unavailable
                     ? "cursor-not-allowed opacity-65"
                     : "cursor-pointer hover:shadow-lg"
                 }`}
                 onClick={() => !unavailable && openItemDetailFromData(item)}
                >
                  {unavailable ? (
                    <div className="absolute right-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                      Out of stock
                    </div>
                  ) : null}
                  <div className="p-3">
                    <div className="font-bold text-xs mb-1 item-title">{item.name}</div>
                    <div className="text-xs text-gray-500 mb-2 item-description">{item.description}</div>
                    <div className="font-bold text-sm item-price">Rs.{item.price}/-</div>
                  </div>
               </div>
                 );
               })()
             ))}
           </div>
         </div>

         {/* Coffee Section */}
         <div ref={coffeeRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">COFFEE.</h2>
           <div className="space-y-2">
             {COFFEE_SOURCE.map((item) => {
               const priceLabel = getItemPriceLabel(item);
               const unavailable = item.isAvailable === false;

               return (
                 <button
                   key={item.name}
                   type="button"
                   onClick={() => openItemDetailFromData(item)}
                   disabled={unavailable}
                   className={`w-full text-left transition ${
                     unavailable ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"
                   }`}
                 >
                   <div className="flex w-full items-start justify-between gap-3 border-b border-gray-200 py-3">
                     <div className="flex-1">
                       <div className="text-base font-semibold text-gray-900 heading-font">{item.name}</div>
                       <div className="text-sm text-gray-600 subtext-font line-clamp-2">{item.description}</div>
                       {unavailable ? (
                         <div className="mt-1 inline-flex rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                           Out of stock
                         </div>
                       ) : null}
                       {priceLabel ? <div className="mt-1 text-sm font-bold text-gray-900">{priceLabel}</div> : null}
                     </div>
                     <div
                       className={`flex h-8 w-8 items-center justify-center rounded-full ${
                         unavailable ? "bg-gray-300 text-gray-500" : "bg-black text-white"
                       }`}
                     >
                       <Plus size={14} />
                     </div>
                   </div>
                 </button>
               );
             })}
           </div>
         </div>

         {/* Slow Bar Section */}
         <div ref={slowBarRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">SLOW BAR.</h2>
           <div className="space-y-2">
             {SLOW_BAR_SOURCE.map((item) => {
               const priceLabel = getItemPriceLabel(item);
               const unavailable = item.isAvailable === false;
               return (
                 <button
                   key={item.name}
                   type="button"
                   onClick={() => openItemDetailFromData(item)}
                   disabled={unavailable}
                   className={`w-full text-left transition ${
                     unavailable ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"
                   }`}
                 >
                   <div className="flex w-full items-start justify-between gap-3 border-b border-gray-200 py-3">
                     <div className="flex-1">
                       <div className="text-base font-semibold text-gray-900 heading-font">{item.name}</div>
                       <div className="text-sm text-gray-600 subtext-font line-clamp-2">{item.description}</div>
                       {unavailable ? (
                         <div className="mt-1 inline-flex rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                           Out of stock
                         </div>
                       ) : null}
                       {priceLabel ? <div className="mt-1 text-sm font-bold text-gray-900">{priceLabel}</div> : null}
                     </div>
                     <div
                       className={`flex h-8 w-8 items-center justify-center rounded-full ${
                         unavailable ? "bg-gray-300 text-gray-500" : "bg-black text-white"
                       }`}
                     >
                       <Plus size={14} />
                     </div>
                   </div>
                 </button>
               );
             })}
           </div>
         </div>

         {/* Not Coffee Section */}
         <div ref={notCoffeeRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">NOT COFFEE.</h2>
           <div className="space-y-2">
             {NOT_COFFEE_SOURCE.map((item) => {
               const priceLabel = getItemPriceLabel(item);
               const unavailable = item.isAvailable === false;
               return (
                 <button
                   key={item.name}
                   type="button"
                   onClick={() => openItemDetailFromData(item)}
                   disabled={unavailable}
                   className={`w-full text-left transition ${
                     unavailable ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"
                   }`}
                 >
                   <div className="flex w-full items-start justify-between gap-3 border-b border-gray-200 py-3">
                     <div className="flex-1">
                       <div className="text-base font-semibold text-gray-900 heading-font">{item.name}</div>
                       <div className="text-sm text-gray-600 subtext-font line-clamp-2">{item.description}</div>
                       {unavailable ? (
                         <div className="mt-1 inline-flex rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                           Out of stock
                         </div>
                       ) : null}
                       {priceLabel ? <div className="mt-1 text-sm font-bold text-gray-900">{priceLabel}</div> : null}
                     </div>
                     <div
                       className={`flex h-8 w-8 items-center justify-center rounded-full ${
                         unavailable ? "bg-gray-300 text-gray-500" : "bg-black text-white"
                       }`}
                     >
                       <Plus size={14} />
                     </div>
                   </div>
                 </button>
               );
             })}
           </div>
         </div>

         {/* Matcha Section */}
         <div ref={matchaRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">MATCHA.</h2>
           <div className="space-y-2">
             {MATCHA_SOURCE.map((item) => {
               const priceLabel = getItemPriceLabel(item);
               const unavailable = item.isAvailable === false;
               return (
                 <button
                   key={item.name}
                   type="button"
                   onClick={() => openItemDetailFromData(item)}
                   disabled={unavailable}
                   className={`w-full text-left transition ${
                     unavailable ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"
                   }`}
                 >
                   <div className="flex w-full items-start justify-between gap-3 border-b border-gray-200 py-3">
                     <div className="flex-1">
                       <div className="text-base font-semibold text-gray-900 heading-font">{item.name}</div>
                       <div className="text-sm text-gray-600 subtext-font line-clamp-2">{item.description}</div>
                       {unavailable ? (
                         <div className="mt-1 inline-flex rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                           Out of stock
                         </div>
                       ) : null}
                       {priceLabel ? <div className="mt-1 text-sm font-bold text-gray-900">{priceLabel}</div> : null}
                     </div>
                     <div
                       className={`flex h-8 w-8 items-center justify-center rounded-full ${
                         unavailable ? "bg-gray-300 text-gray-500" : "bg-black text-white"
                       }`}
                     >
                       <Plus size={14} />
                     </div>
                   </div>
                 </button>
               );
             })}
           </div>
         </div>
      </div>
      {/* Item Detail Modal */}
      <AnimatePresence>
        {showItemModal && selectedItem && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseItemModal}
            />
            <motion.div
              className="fixed inset-0 z-50 bg-white flex flex-col shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <div className="flex-1 overflow-y-auto pb-28">
                <div className="relative h-16 bg-white">
                  <button
                    onClick={handleCloseItemModal}
                    className="absolute left-4 top-4 h-12 w-12 rounded-full bg-white/95 shadow-md flex items-center justify-center"
                  >
                    <X size={22} className="text-gray-700" />
                  </button>
                </div>

                <div className="px-5 pt-5">
                  <p className="text-2xl font-semibold text-gray-900 heading-font normal-case">
                    {selectedItem.name}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 heading-font mt-1">
                    {getItemPriceLabel(selectedItem, selectedTemperature)}
                  </p>
                </div>

                {selectedItem.description && (
                  <p className="mt-3 px-5 text-sm text-gray-600 leading-relaxed subtext-font">
                    {selectedItem.description}
                  </p>
                )}
                {isMenuItemOutOfStock(selectedItem.menuItemId, selectedItem.name) ? (
                  <div className="mx-5 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    This item is currently out of stock.
                  </div>
                ) : null}

                <div className="mt-5 space-y-4 px-5">

                  {selectedItem.eggOptions?.length ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900 heading-font">Type of eggs</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.eggOptions.map((eggOption) => (
                          <button
                            key={eggOption}
                            type="button"
                            onClick={() => setSelectedEggType(eggOption)}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                              selectedEggType === eggOption
                                ? "border-black bg-black text-white"
                                : "border-gray-200 bg-gray-50 text-gray-700"
                            }`}
                          >
                            {eggOption}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedItem.temperatureOptions?.length ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900 heading-font">Temperature</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.temperatureOptions.map((temperatureOption) => (
                          <button
                            key={temperatureOption}
                            type="button"
                            onClick={() => setSelectedTemperature(temperatureOption)}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                              selectedTemperature === temperatureOption
                                ? "border-black bg-black text-white"
                                : "border-gray-200 bg-gray-50 text-gray-700"
                            }`}
                          >
                            {temperatureOption}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedItem.addOnOptions?.length ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900 heading-font">Extra options</p>
                      <div className="space-y-2">
                        {selectedItem.addOnOptions.map((option) => {
                          const isSelected = selectedAddOns.includes(option.label);
                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() =>
                                setSelectedAddOns((prev) =>
                                  prev.includes(option.label)
                                    ? prev.filter((label) => label !== option.label)
                                    : [...prev, option.label],
                                )
                              }
                              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                                isSelected
                                  ? "border-black bg-black text-white"
                                  : "border-gray-200 bg-gray-50 text-gray-800"
                              }`}
                            >
                              <span className="text-sm font-medium">{option.label}</span>
                              <span className="text-sm font-semibold">+ Rs.{option.price}/-</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2 border-t">
                    <p className="text-lg font-semibold text-gray-900 heading-font mb-3">
                      Frequently bought together
                    </p>
                    <div className="flex space-x-4 overflow-x-auto pb-1">
                      {getSuggestedItems(selectedItem.name).map(suggestion => {
                        const isSelected = selectedSuggestedItems.includes(suggestion.name);
                        const unavailable = isMenuItemOutOfStock(
                          suggestion.menuItemId,
                          suggestion.name,
                        );
                        return (
                          <div
                            key={suggestion.name}
                            className={`relative rounded-lg shadow w-64 flex-shrink-0 cursor-pointer transition-all ${
                              isSelected
                                ? "bg-black text-white shadow-lg"
                                : unavailable
                                  ? "bg-white opacity-65 cursor-not-allowed"
                                  : "bg-white hover:shadow-lg"
                            }`}
                            onClick={() => handleAddSuggestedItem(suggestion)}
                          >
                            {unavailable ? (
                              <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                                Out of stock
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAddSuggestedItem(suggestion);
                              }}
                              disabled={unavailable}
                              className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow ${
                                isSelected
                                  ? "bg-white text-black"
                                  : unavailable
                                    ? "bg-gray-200 text-gray-500"
                                    : "bg-white/95 text-gray-900"
                              }`}
                            >
                              {isSelected ? <Check size={16} /> : <Plus size={16} />}
                            </button>
                            <div className="min-h-[150px] p-4">
                              <p className="font-bold text-xs mb-1 item-title">
                                {suggestion.name}
                              </p>
                              <p
                                className={`text-xs mb-3 leading-relaxed item-description line-clamp-4 ${
                                  isSelected ? "text-white/75" : "text-gray-500"
                                }`}
                              >
                                {(suggestion.description || "Popular pairing for this item.").trim()}
                              </p>
                              {isSelected ? (
                                <p className="mb-2 text-[11px] font-medium text-white/80">
                                  Included in this order.
                                </p>
                              ) : null}
                              <p className="font-bold text-sm item-price">
                                Rs.{(resolvePrice(suggestion.name, suggestion.price) || 0).toLocaleString()}/-
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border-t p-4 fixed bottom-0 left-0 right-0 z-50">
                <div className="flex gap-3">
                  <div className="w-1/3 flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
                    <button
                      onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 flex items-center justify-center text-gray-700"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="text-base font-semibold heading-font">{itemQuantity}</span>
                    <button
                      onClick={() => setItemQuantity((q) => q + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-700"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <button
                    onClick={handleAddSelectedItem}
                    disabled={isMenuItemOutOfStock(selectedItem.menuItemId, selectedItem.name)}
                    className={`w-2/3 py-3 rounded-xl text-base font-semibold heading-font ${
                      isMenuItemOutOfStock(selectedItem.menuItemId, selectedItem.name)
                        ? "cursor-not-allowed bg-gray-300 text-gray-500"
                        : "bg-black text-white"
                    }`}
                  >
                    Add {itemQuantity + selectedSuggestedItems.length} to order • Rs.{((getSelectedItemPrice(selectedItem, selectedEggType, selectedTemperature, selectedAddOns) * itemQuantity) + getSuggestedSelectionTotal()).toLocaleString()}/-
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-white"
          >
            <div className="p-4 flex items-center justify-between">
              <button onClick={() => setShowCart(false)} className="p-2 rounded-full bg-gray-100">
                <X size={20} />
              </button>
              <div className="text-lg font-semibold heading-font">{RESTAURANT.name}</div>
              <div className="w-10" />
            </div>

            <div className="px-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <p className="text-2xl font-bold heading-font">{RESTAURANT.name}</p>
                <p className="text-lg text-gray-600 subtext-font">Table {tableNumber}</p>
              </div>

              <div className="space-y-4">
                {Object.keys(cart).length === 0 ? (
                  <p className="text-center text-gray-500 py-10">Your cart is empty</p>
                ) : (
                  <>
                    {hasOutOfStockItemsInCart ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-sm font-semibold text-red-700 heading-font">
                          Out-of-stock items in cart
                        </p>
                        <p className="mt-1 text-xs text-red-700 subtext-font">
                          Remove unavailable items to continue to checkout.
                        </p>
                      </div>
                    ) : null}
                    {Object.entries(cart).map(([key, item]) => (
                      <div key={key} className="flex items-center justify-between pb-4 border-b">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-lg font-semibold text-gray-900 heading-font">{item.name}</p>
                            <p className="text-base text-gray-700 subtext-font">Rs.{item.price}/-</p>
                            {item.details ? (
                              <p className="mt-1 text-xs text-gray-500 subtext-font line-clamp-2">{item.details}</p>
                            ) : null}
                            {isCartItemOutOfStock(item) ? (
                              <div className="mt-1 inline-flex rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                                Out of stock
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                          <button onClick={() => removeItemFromCart(key)} className="p-1">
                            <Minus size={16} />
                          </button>
                          <span className="text-base font-semibold heading-font">{item.quantity}</span>
                          <button
                            onClick={() =>
                              addItemToCart(item.name, item.price, item.image, item.details, {
                                menuItemId: item.menuItemId,
                                baseItemName: item.baseItemName || item.name,
                              })
                            }
                            disabled={isCartItemOutOfStock(item)}
                            className={`p-1 ${isCartItemOutOfStock(item) ? "cursor-not-allowed text-gray-400" : ""}`}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Frequently Bought Together Section */}
                    {Object.keys(cart).length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-lg font-semibold text-gray-900 heading-font mb-3">
                          Frequently bought together
                        </p>
                        <div className="flex space-x-4 overflow-x-auto pb-1">
                          {getSuggestedItems(
                            Object.values(cart)[0]?.baseItemName ||
                              Object.values(cart)[0]?.name ||
                              "",
                          ).map((item) => {
                            const isInCart = Object.values(cart).some(
                              (cartItem) =>
                                (cartItem.baseItemName || cartItem.name).toLowerCase() ===
                                item.name.toLowerCase(),
                            );
                            const unavailable = isMenuItemOutOfStock(
                              item.menuItemId,
                              item.name,
                            );
                            return (
                              <div
                                key={item.name}
                                className={`relative rounded-lg shadow w-64 flex-shrink-0 cursor-pointer transition-all ${
                                  isInCart
                                    ? "bg-black text-white shadow-lg"
                                    : unavailable
                                      ? "bg-white opacity-65 cursor-not-allowed"
                                      : "bg-white hover:shadow-lg"
                                }`}
                                onClick={() => {
                                  if (!isInCart && !unavailable) {
                                    addItemToCart(
                                      item.name,
                                      resolvePrice(item.name, item.price),
                                      undefined,
                                      item.description,
                                      {
                                        menuItemId: item.menuItemId,
                                        baseItemName: item.name,
                                      },
                                    );
                                  }
                                }}
                              >
                                {unavailable ? (
                                  <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
                                    Out of stock
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (!isInCart && !unavailable) {
                                      addItemToCart(
                                        item.name,
                                        resolvePrice(item.name, item.price),
                                        undefined,
                                        item.description,
                                        {
                                          menuItemId: item.menuItemId,
                                          baseItemName: item.name,
                                        },
                                      );
                                    }
                                  }}
                                  disabled={unavailable}
                                  className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow ${
                                    isInCart
                                      ? "bg-white text-black"
                                      : unavailable
                                        ? "bg-gray-200 text-gray-500"
                                        : "bg-white/95 text-gray-900"
                                  }`}
                                >
                                  {isInCart ? <Check size={16} /> : <Plus size={16} />}
                                </button>
                                <div className="min-h-[150px] p-4">
                                  <p className="font-bold text-xs mb-1 item-title">
                                    {item.name}
                                  </p>
                                  <p
                                    className={`text-xs mb-3 leading-relaxed item-description line-clamp-4 ${
                                      isInCart ? "text-white/75" : "text-gray-500"
                                    }`}
                                  >
                                    {(item.description || "Popular pairing for your cart.").trim()}
                                  </p>
                                  {isInCart ? (
                                    <p className="mb-2 text-[11px] font-medium text-white/80">
                                      Included in this order.
                                    </p>
                                  ) : null}
                                  <p className="font-bold text-sm item-price">
                                    Rs.{resolvePrice(item.name, item.price).toLocaleString()}/-
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 heading-font">Add a tip</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[0, 5, 10, 15].map((tip) => (
                            <button
                              key={tip}
                              type="button"
                              onClick={() => setSelectedTip(tip)}
                              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                selectedTip === tip
                                  ? "border-black bg-black text-white"
                                  : "border-gray-200 bg-white text-gray-700"
                              }`}
                            >
                              {tip === 0 ? "No tip" : `${tip}%`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="order-notes" className="text-sm font-semibold text-gray-900 heading-font">
                          Order notes
                        </label>
                        <textarea
                          id="order-notes"
                          value={orderNotes}
                          onChange={(event) => setOrderNotes(event.target.value)}
                          rows={3}
                          placeholder="Add any notes for your order"
                          className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-black subtext-font"
                        />
                      </div>
                    </div>
                  </>
                )}
                <button
                  onClick={() => setShowCart(false)}
                  className="flex items-center gap-2 text-black font-semibold heading-font"
                >
                  <Plus size={18} /> Add items
                </button>
              </div>
            </div>

            <div className="mt-auto border-t px-5 py-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-700 subtext-font">
                <span>Service fee (1%)</span>
                <span className="font-semibold text-gray-900 heading-font">Rs.{getServiceFee()}/-</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-700 subtext-font">
                <span>GST (5%)</span>
                <span className="font-semibold text-gray-900 heading-font">Rs.{getGstAmount()}/-</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-gray-900 heading-font pt-2">
                <span>Total</span>
                <span>Rs.{getGrandTotal().toLocaleString()}/-</span>
              </div>
            </div>

            <div className="bg-white border-t p-4">
              <button
                disabled={hasOutOfStockItemsInCart}
                onClick={() => {
                  if (!ensureOrderingEnabled()) return;
                  if (!ensureCartHasNoOutOfStockItems()) return;
                  setShowCart(false);
                  window.location.href = `/checkout/pay-fully${tableQuery}`;
                }}
                className={`w-full py-3 rounded-full text-base font-semibold heading-font ${
                  hasOutOfStockItemsInCart
                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                    : "bg-black text-white"
                }`}
              >
                Go to checkout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPastOrdersModal && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPastOrdersModal(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-md rounded-t-[32px] bg-white p-5 shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-gray-900 heading-font">Past order</p>
                  <p className="mt-1 text-sm text-gray-500 subtext-font">Your completed orders for this device.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPastOrdersModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

                            {pastOrdersLoading ? (
                <div className="mt-5 rounded-2xl bg-gray-50 p-5 text-center">
                  <p className="text-sm font-semibold text-gray-900 heading-font">Loading orders...</p>
                </div>
              ) : pastOrders.length > 0 ? (
                <div className="mt-5 max-h-[68vh] space-y-4 overflow-y-auto pr-1">
                  {pastOrders.map((order) => (
                    <div key={order.orderNumber} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 heading-font">
                            Order #{order.orderNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 subtext-font">
                            {order.tableLabel}
                            {order.placedAt
                              ? ` • ${new Date(order.placedAt).toLocaleString()}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900 heading-font">
                            Rs.{order.total.toLocaleString()}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-gray-500 subtext-font">
                            {order.status === "ready" ? "Ready" : "Served"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {order.items.map((item, index) => (
                          <div
                            key={`${order.orderNumber}-${item.name}-${index}`}
                            className="flex items-start justify-between gap-4"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900 heading-font">{item.name}</p>
                              {item.details ? (
                                <p className="mt-1 text-xs text-gray-500 subtext-font">{item.details}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-gray-400 subtext-font">Qty {item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 heading-font">
                              Rs.{(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-gray-50 p-5 text-center">
                  <p className="text-sm font-semibold text-gray-900 heading-font">No past orders yet</p>
                  <p className="mt-1 text-sm text-gray-500 subtext-font">
                    Your completed orders for this device will show up here.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Split Bill Options Popup */}
      <AnimatePresence>
        {showSplitOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setShowSplitOptions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold">Split Bill</h2>
                <button
                  onClick={() => setShowSplitOptions(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Split Options */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (!ensureOrderingEnabled()) return;
                      if (!ensureCartHasNoOutOfStockItems()) return;
                      // Lock session if in collaborative mode
                      if (isCollaborativeSession) {
                        lockSession();
                      }
                      setSplitType('equal');
                      localStorage.setItem('splitType', 'equal');
                      setShowSplitOptions(false);
                      setShowCart(false);
                      window.location.href = `/checkout/split-bill${tableQuery}`;
                    }}
                    className="w-full p-4 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="font-medium">Divide the Bill Equally</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Each person pays Rs.{getSplitAmount().toFixed(2)}/-
                    </div>
                  </button>
                  
                  <div className="border-t"></div>
                  
                  <button
                    onClick={() => {
                      if (!ensureOrderingEnabled()) return;
                      if (!ensureCartHasNoOutOfStockItems()) return;
                      // Lock session if in collaborative mode
                      if (isCollaborativeSession) {
                        lockSession();
                      }
                      setSplitType('custom');
                      setShowSplitOptions(false);
                      setShowCart(false);
                      window.location.href = `/checkout/split-bill${tableQuery}`;
                    }}
                    className="w-full p-4 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="font-medium">Pay a Custom Amount</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Set individual amounts for each person
                    </div>
                  </button>
                  
                  <div className="border-t"></div>
                  
                  <button
                    onClick={() => {
                      if (!ensureOrderingEnabled()) return;
                      if (!ensureCartHasNoOutOfStockItems()) return;
                      setSplitType('by-item');
                      setShowSplitOptions(false);
                      setShowCart(false);
                      window.location.href = `/checkout/split-bill${tableQuery}`;
                    }}
                    className="w-full p-4 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="font-medium">Pay by Item</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Assign specific items to each person
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Method Page for Pay Fully */}
      <AnimatePresence>
        {showPaymentMethod && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-white"
          >
            <div className="relative h-48 bg-cover bg-center" style={{ backgroundImage: "url(/HeroImage.jpg)" }}>
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10 flex flex-col justify-between h-full p-6 text-white">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setShowPaymentMethod(false);
                      setShowCart(true);
                    }}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Back to cart"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-white/70">Table {tableNumber}</p>
                    <p className="text-lg font-semibold">SIP Checkout</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-white/70">Total due</p>
                    <p className="text-4xl font-bold">Rs.{getGrandTotal().toFixed(2)}/-</p>
                  </div>
                  <div className="text-right text-sm text-white/80">
                    <p>{getCartItemCount()} items</p>
                    <p>Includes GST, service fee & tip</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gray-50">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Order summary</h3>
                <div className="space-y-3">
                  {Object.values(cart).map((item) => (
                    <div
                      key={`${item.name}-${item.addedBy}`}
                      className="flex items-center justify-between text-sm text-gray-700 border-b pb-2 last:border-b-0"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          Qty {item.quantity} {"\u00B7"} Rs.{item.price}/- each
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900">
                        Rs.{(item.price * item.quantity).toFixed(2)}/-
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm text-gray-600 mt-4">
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span className="font-semibold text-gray-900">Rs.{getCartTotal()}/-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service fee (1%)</span>
                    <span className="font-semibold text-gray-900">Rs.{getServiceFee()}/-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="font-semibold text-gray-900">Rs.{getGstAmount()}/-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tip ({selectedTip}%)</span>
                    <span className="font-semibold text-gray-900">Rs.{getTipAmount()}/-</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total</span>
                    <span>Rs.{getGrandTotal()}/-</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Choose payment method</h3>
                  <span className="text-xs uppercase tracking-wide text-gray-400">secure</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'easypaisa', label: 'Easypaisa', logo: '/Easypaisa.png' },
                    { id: 'jazzcash', label: 'JazzCash', logo: '/JazzCash.png' },
                  ].map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() =>
                        setSelectedPaymentMethod(
                          selectedPaymentMethod === wallet.id ? null : (wallet.id as 'easypaisa' | 'jazzcash')
                        )
                      }
                      className={`p-4 border rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                        selectedPaymentMethod === wallet.id
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <img src={wallet.logo} alt={wallet.label} className="h-6 w-auto" />
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-3">
                  <img src="/Visa.png" alt="Visa" className="h-8" />
                  <img src="/MasterCard.png" alt="MasterCard" className="h-8" />
                  <img src="/UnionPay.png" alt="UnionPay" className="h-8" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <label className="text-gray-500">Cardholder name</label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => {
                        setCardholderName(e.target.value);
                        setErrors((prev) => ({ ...prev, cardholderName: validateCardholderName(e.target.value) }));
                      }}
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="ALEX CRUSTEEZ"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-500">Card number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => {
                        const formatted = formatCardNumber(e.target.value);
                        setCardNumber(formatted);
                        setErrors((prev) => ({ ...prev, cardNumber: validateCardNumber(formatted) }));
                      }}
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <label className="text-gray-500">Expiry</label>
                    <input
                      type="text"
                      value={expiration}
                      onChange={(e) => {
                        const formatted = formatExpiration(e.target.value);
                        setExpiration(formatted);
                        setErrors((prev) => ({ ...prev, expiration: validateExpiration(formatted) }));
                      }}
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="text-gray-500">CVC</label>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(e) => {
                        setCvc(e.target.value);
                        setErrors((prev) => ({ ...prev, cvc: validateCvc(e.target.value) }));
                      }}
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-white">
              <button
                onClick={() => {
                  clearCart();
                  if (isCollaborativeSession) {
                    endCollaborativeSession();
                  }
                  setShowPaymentMethod(false);
                }}
                className="w-full bg-black text-white py-4 rounded-xl font-semibold text-lg hover:bg-gray-900 transition-colors"
              >
                Pay Rs.{getGrandTotal().toFixed(2)}/-
              </button>
              <p className="text-center text-xs text-gray-500 mt-3">
                100% secure payments powered by TableTap
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Request Popup */}
      <AnimatePresence>
        {showJoinRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setShowJoinRequest(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold">Cart Join Request</h2>
                <button
                  onClick={() => setShowJoinRequest(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">
                    User ID {joinRequestData?.fromUserId} wants to join your cart.
                  </div>
                  <div className="text-gray-600">
                    Do you want to allow them to collaborate on this order?
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={acceptJoinRequest}
                    className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={declineJoinRequest}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
