import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useRef, useEffect } from "react";
import {
  Check,
  BellRing,
  ChevronLeft,
  ChevronDown,
  ClipboardList,
  LogOut,
  Plus,
  Minus,
  X,
  ShoppingCart,
  Clock,
  MapPin,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrCreateUserID } from "@/lib/userID";

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

const BRAND_PRIMARY = "#91bda6";

type CartItem = {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  details?: string;
  addedBy: string;
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
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    image?: string;
    details?: string;
  }>;
};

type MenuItemAddOn = {
  label: string;
  price: number;
};

type MenuItemData = {
  name: string;
  image?: string;
  description?: string;
  price?: number;
  eggOptions?: string[];
  temperatureOptions?: string[];
  temperaturePrices?: Record<string, number>;
  addOnOptions?: MenuItemAddOn[];
};

const PRICE_MAP: Record<string, number> = {
  "plain chocolate": 150,
  "plain glaze": 150,
  "strawberry sprinkle": 150,
  "after eight": 240,
  "coconut truffle": 240,
  "cookies and cream": 240,
  "ferrero rocher": 240,
  "nutella bon": 240,
  "oreo chocolate": 240,
  "salted caramel": 240,
  "bagelish": 300,
  "bavarian cream": 300,
  "benoffee": 300,
  "blueberry cream cheese": 300,
  "choco fudge": 300,
  "chocolate malt": 300,
  "hazelnutty": 300,
  "jammie": 300,
  "jelly donut": 300,
  "kinder bueno": 300,
  "lemon curd": 300,
  "lotus": 300,
  "peanut caramel": 300,
  "pistachio delight": 300,
  "rabri": 300,
  "red velvet": 300,
  "grilled chicken pesto": 1795,
  "mexi beef focaccia": 1995,
  "sun kissed chicken": 1895,
  "classic club": 1545,
  "focaccia fillet": 1595,
  "beef melt": 1895,
  "mediteranian salad": 350,
  "asian satay salad": 350,
  "peach iced tea": 180,
  "mix tea karak": 180,
  "earl grey tea": 180,
  "masala tea": 200,
  "rose hibiscus": 200,
  "cold chocolate milk": 200,
  "cold coffee": 220,
  "hot coffee": 200,
};

const SUGGESTED_ITEMS = [
  { name: "Turkish Eggs", price: 1395, image: "/Breakfast/Turkish Eggs.jpg" },
  { name: "Golden Crunch", price: 1295, image: "/Salads/Mediteranian Salad.png" },
  { name: "Classic Club", price: 1545, image: "/Sandwiches/Club Sandwich.png" },
  { name: "Cold Coffee", price: 220, image: "/Drinks/Drink.png" },
];

const BREAKFAST_ITEMS: MenuItemData[] = [
  {
    name: "Turkish Eggs",
    image: "/Breakfast/Turkish Eggs.jpg",
    description: "Creamy garlic yogurt topped with soft poached eggs, finished with spiced chili butter, fresh herbs, and served alongside warm, crusty sourdough.",
    price: 1395,
    eggOptions: ["Poached Egg", "Scrambled Egg", "Sunny Egg"],
  },
  {
    name: "Sunny Hummus Bowl",
    image: "/Breakfast/Hummus Bowl.avif",
    description: "Creamy hummus topped with roasted cherry tomatoes, perfectly cooked eggs, and a drizzle of signature cream sauce.",
    price: 1695,
    eggOptions: ["Poached Egg", "Scrambled Egg", "Sunny Egg"],
  },
  {
    name: "Avocado Toast",
    image: "/Breakfast/Avocado Toast.jpg",
    description: "Creamy smashed avocado layered on warm, toasted ciabatta, topped with eggs, finished with olive oil, lemon, and a sprinkle of chili flakes.",
    price: 1595,
    eggOptions: ["Poached Egg", "Scrambled Egg", "Sunny Egg"],
  },
  {
    name: "French Toast",
    image: "/Breakfast/French Toast.jpg",
    description: "Fluffy brioche slices soaked in rich custard, golden fried, and served with maple syrup, Nutella, or Lotus Biscoff.",
    price: 1295,
  },
  {
    name: "Steak & Eggs",
    image: "/Breakfast/Steak and Eggs.avif",
    description: "Seared beef or tender chicken paired with eggs your way and bread bites drenched in our signature cream sauce.",
    price: 2395,
    eggOptions: ["Poached Egg", "Scrambled Egg", "Sunny Egg"],
  },
];

const SALAD_ADD_ONS: MenuItemAddOn[] = [
  { label: "Fries", price: 695 },
  { label: "Cheese", price: 75 },
];

const DRINK_ADD_ONS: MenuItemAddOn[] = [
  { label: "Upsize", price: 275 },
  { label: "Extra Shot/ Decaf", price: 245 },
  { label: "Extra Flavour", price: 195 },
  { label: "Extra Matcha", price: 145 },
  { label: "Lactose Free", price: 145 },
];

const SALAD_ITEMS: MenuItemData[] = [
  {
    name: "Golden Crunch",
    image: "/Salads/Mediteranian Salad.png",
    description: "A hearty blend of crisp greens and golden, crunchy bites, finished with a savory touch of parmesan for perfect balance and flavor.",
    price: 1295,
    addOnOptions: SALAD_ADD_ONS,
  },
  {
    name: "Ceaser salad",
    image: "/Salads/Asian Satay Salad.png",
    description: "A fresh, crisp take on the classic Caesar with tender chicken, vibrant greens, a rich parmesan finish, and our signature creamy dressing.",
    price: 1695,
    addOnOptions: SALAD_ADD_ONS,
  },
];

const SANDWICH_ITEMS: MenuItemData[] = [
  {
    name: "Grilled Chicken Pesto",
    image: "/Sandwiches/Chicken Malai Boti.png",
    description: "Grilled chicken with house-made pesto and melted cheese on sourdough. Served with crisp green salad and golden potato wedges.",
    price: 1795,
  },
  {
    name: "Mexi Beef Focaccia",
    image: "/Sandwiches/Cubano.png",
    description: "Flavor-packed beef with Mexican spices in warm focaccia. Served with golden fries and crisp green salad.",
    price: 1995,
  },
  {
    name: "Sun Kissed Chicken",
    image: "/Sandwiches/Chicken Malai Boti.png",
    description: "Tender grilled chicken with creamy avocado and tangy sun-dried tomatoes on fresh sourdough. Served with crisp green salad and golden potato wedges.",
    price: 1895,
  },
  {
    name: "Classic Club",
    image: "/Sandwiches/Club Sandwich.png",
    description: "Triple-layer delight with chicken, egg, cheese and crisp veggies. Served with fries and creamy coleslaw.",
    price: 1545,
  },
  {
    name: "Focaccia Fillet",
    image: "/Sandwiches/Cubano.png",
    description: "Crispy fried chicken in warm focaccia with fresh greens and signature sauce. Served with fries and crisp green salad.",
    price: 1595,
  },
  {
    name: "Beef Melt",
    image: "/Sandwiches/Club Sandwich.png",
    description: "Succulent beef, melted cheese, and a touch of seasoning on rustic sourdough bread. Served with potato wedges and crunchy green salad.",
    price: 1895,
  },
];

const COFFEE_ITEMS: MenuItemData[] = [
  {
    name: "Espresso",
    image: "/Drinks/Drink.png",
    description: "Rich espresso shot served hot.",
    price: 200,
  },
  {
    name: "Cappuccino",
    image: "/Drinks/Drink.png",
    description: "Classic cappuccino served hot with a velvety finish.",
    price: 220,
  },
  {
    name: "Macchiato",
    image: "/Drinks/Drink.png",
    description: "Bold macchiato served hot.",
    price: 200,
  },
  {
    name: "Cortado",
    image: "/Drinks/Drink.png",
    description: "Balanced cortado served hot.",
    price: 220,
  },
  {
    name: "Flat White",
    image: "/Drinks/Drink.png",
    description: "Smooth flat white served hot.",
    price: 220,
  },
  {
    name: "Latte",
    image: "/Drinks/Drink.png",
    description: "Creamy latte with your choice of hot or iced.",
    price: 240,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Spanish Latte",
    image: "/Drinks/Drink.png",
    description: "Sweet Spanish latte with your choice of hot or iced.",
    price: 260,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "French Vanilla Gingerbread",
    image: "/Drinks/Drink.png",
    description: "French vanilla gingerbread coffee with your choice of hot or iced.",
    price: 280,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Caramel Cinnamon",
    image: "/Drinks/Drink.png",
    description: "Caramel cinnamon coffee with your choice of hot or iced.",
    price: 280,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Hazelnut",
    image: "/Drinks/Drink.png",
    description: "Hazelnut coffee with your choice of hot or iced.",
    price: 280,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Butter Scotch",
    image: "/Drinks/Drink.png",
    description: "Butterscotch coffee with your choice of hot or iced.",
    price: 280,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Tiramisu",
    image: "/Drinks/Drink.png",
    description: "Tiramisu coffee with your choice of hot or iced.",
    price: 280,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Coconut",
    image: "/Drinks/Drink.png",
    description: "Coconut coffee with your choice of hot or iced.",
    price: 280,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Mocha",
    image: "/Drinks/Drink.png",
    description: "Chocolate mocha with your choice of hot or iced.",
    price: 260,
    temperatureOptions: ["Hot", "Iced"],
  },
].map((item) => ({ ...item, addOnOptions: DRINK_ADD_ONS }));

const SLOW_BAR_ITEMS: MenuItemData[] = [
  {
    name: "Tier 1",
    image: "/Drinks/Drink.png",
    description: "Ask the barista for the current slow bar selection.",
  },
  {
    name: "Tier 2",
    image: "/Drinks/Drink.png",
    description: "Available hot or cold.",
    temperatureOptions: ["Hot", "Cold"],
    temperaturePrices: {
      Hot: 1395,
      Cold: 1395,
    },
  },
  {
    name: "Tier 3",
    image: "/Drinks/Drink.png",
    description: "Available hot or cold.",
    temperatureOptions: ["Hot", "Cold"],
    temperaturePrices: {
      Hot: 975,
      Cold: 975,
    },
  },
].map((item) => ({ ...item, addOnOptions: DRINK_ADD_ONS }));

const NOT_COFFEE_ITEMS: MenuItemData[] = [
  {
    name: "Hot/Iced Chocolate",
    image: "/Drinks/Drink.png",
    description: "Hot or iced chocolate.",
    price: 795,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Sip Signature Chocolate",
    image: "/Drinks/Drink.png",
    description: "Sip signature chocolate, available hot or iced.",
    price: 1195,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Apple Mojito",
    image: "/Drinks/Drink.png",
    description: "Classic apple mojito.",
    price: 645,
  },
  {
    name: "Raspberry Mojito",
    image: "/Drinks/Drink.png",
    description: "Raspberry mojito.",
    price: 645,
  },
  {
    name: "Pina Coco and Green Apple Mojito",
    image: "/Drinks/Drink.png",
    description: "Pina coco and green apple mojito.",
    price: 645,
  },
  {
    name: "Passion Fruit Mojito",
    image: "/Drinks/Drink.png",
    description: "Passion fruit mojito.",
    price: 645,
  },
  {
    name: "Lemon Iced Tea",
    image: "/Drinks/Drink.png",
    description: "Lemon iced tea.",
    price: 625,
  },
  {
    name: "Peach Iced Tea",
    image: "/Drinks/Drink.png",
    description: "Peach iced tea.",
    price: 625,
  },
].map((item) => ({ ...item, addOnOptions: DRINK_ADD_ONS }));

const MATCHA_ITEMS: MenuItemData[] = [
  {
    name: "Matcha",
    image: "/Drinks/Drink.png",
    description: "Classic matcha, available hot or iced.",
    price: 795,
    temperatureOptions: ["Hot", "Iced"],
  },
  {
    name: "Spanish Matcha",
    image: "/Drinks/Drink.png",
    description: "Spanish-style matcha.",
    price: 895,
  },
  {
    name: "Stawberry Matcha",
    image: "/Drinks/Drink.png",
    description: "Strawberry matcha.",
    price: 1295,
  },
  {
    name: "Coconut Matcha",
    image: "/Drinks/Drink.png",
    description: "Coconut matcha.",
    price: 1395,
  },
].map((item) => ({ ...item, addOnOptions: DRINK_ADD_ONS }));

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

// Modal Smart Counter Component
function ModalSmartCounter({ 
  donutName, 
  price, 
  count, 
  onAdd, 
  onRemove 
}: { 
  donutName: string; 
  price: number; 
  count: number; 
  onAdd: () => void; 
  onRemove: () => void; 
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAddToOrder = () => {
    setIsAnimating(true);
    onAdd();
  };

  const handleIncrement = () => {
    onAdd();
  };

  const handleDecrement = () => {
    if (count <= 1) {
      setIsAnimating(false);
      onRemove();
    } else {
      onRemove();
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
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Add to Cart
        </motion.button>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="flex items-center justify-center space-x-2 bg-black text-white px-4 py-2 rounded text-sm font-medium w-[110px]"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDecrement}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
          >
            <Minus size={12} />
          </motion.button>
          
          <motion.span
            key={count}
            initial={{ scale: 1.2, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            className="font-bold text-xs min-w-[16px] text-center"
          >
            {count}
          </motion.span>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleIncrement}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
          >
            <Plus size={12} />
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
const tableNumberMatch = tableIdentifier.match(/(\d+)/);
const tableNumber =
  tableNumberMatch ? tableNumberMatch[1] : tableIdentifier.replace(/[^0-9]/g, "") || "1";
const tableQuery = tableIdentifier ? `?table=${encodeURIComponent(tableIdentifier)}` : "";
  
  const [activeTab, setActiveTab] = useState("Breakfast");
  const [showDonutModal, setShowDonutModal] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<{
    type: string;
    limit: number;
    freeCount: number;
    title: string;
  } | null>(null);
  
  // Refs for scrolling to sections
  const breakfastRef = useRef<HTMLDivElement>(null);
  const sandwichesRef = useRef<HTMLDivElement>(null);
  const saladsRef = useRef<HTMLDivElement>(null);
  const coffeeRef = useRef<HTMLDivElement>(null);
  const slowBarRef = useRef<HTMLDivElement>(null);
  const notCoffeeRef = useRef<HTMLDivElement>(null);
  const matchaRef = useRef<HTMLDivElement>(null);

  // Donut data for the modal
  const donutOptions = [
    // Classic Donuts
    { name: "Plain Chocolate", image: "/Classic/Plain Chocolate.png", category: "Classic", price: 150 },
    { name: "Plain Glaze", image: "/Classic/Plain Glaze.png", category: "Classic", price: 150 },
    { name: "Strawberry Sprinkle", image: "/Classic/Strawberry Sprinkle.png", category: "Classic", price: 150 },
    
    // Delights Donuts
    { name: "After Eight", image: "/Delights/After Eight.png", category: "Delights", price: 240 },
    { name: "Coconut Truffle", image: "/Delights/Coconut Truffle.png", category: "Delights", price: 240 },
    { name: "Cookies and Cream", image: "/Delights/Cookies and Cream.png", category: "Delights", price: 240 },
    { name: "Ferrero Rocher", image: "/Delights/Ferrero Rocher.png", category: "Delights", price: 240 },
    { name: "Nutella Bon", image: "/Delights/Nutella Bon.png", category: "Delights", price: 240 },
    { name: "Oreo Chocolate", image: "/Delights/Oreo Chocolate.png", category: "Delights", price: 240 },
    { name: "Salted Caramel", image: "/Delights/Salted Caramel.png", category: "Delights", price: 240 },
    
    // Premium Donuts
    { name: "Bagelish", image: "/Premium/Bagelish.png", category: "Premium", price: 300 },
    { name: "Bavarian Cream", image: "/Premium/Bavarian Cream.png", category: "Premium", price: 300 },
    { name: "Benoffee", image: "/Premium/benoffee.png", category: "Premium", price: 300 },
    { name: "Blueberry Cream Cheese", image: "/Premium/Blueberry Cream Cheese.png", category: "Premium", price: 300 },
    { name: "Choco Fudge", image: "/Premium/Choco Fudge.png", category: "Premium", price: 300 },
    { name: "Chocolate Malt", image: "/Premium/Chocolate Malt.png", category: "Premium", price: 300 },
    { name: "Hazelnutty", image: "/Premium/Hazelnutty.png", category: "Premium", price: 300 },
    { name: "Jammie", image: "/Premium/Jammie.png", category: "Premium", price: 300 },
    { name: "Jelly Donut", image: "/Premium/Jelly Donut.png", category: "Premium", price: 300 },
    { name: "Kinder Bueno", image: "/Premium/Kinder Bueno.png", category: "Premium", price: 300 },
    { name: "Lemon Curd", image: "/Premium/Lemon Curd.png", category: "Premium", price: 300 },
    { name: "Lotus", image: "/Premium/Lotus.png", category: "Premium", price: 300 },
    { name: "Peanut Caramel", image: "/Premium/Peanut Caramel.png", category: "Premium", price: 300 },
    { name: "Pistachio Delight", image: "/Premium/Pistachio Delight.png", category: "Premium", price: 300 },
    { name: "Rabri", image: "/Premium/Rabri.png", category: "Premium", price: 300 },
    { name: "Red Velvet", image: "/Premium/Red velvet Donut.png", category: "Premium", price: 300 }
  ];

  // State for selected donuts and total - now deal-specific
  const [dealSelections, setDealSelections] = useState<{
    [dealKey: string]: {
      selectedDonuts: {[key: string]: number};
      totalAmount: number;
      freeDonutsSelected: string[];
    }
  }>({});
  const [showFreeDonutModal, setShowFreeDonutModal] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Scroll-based active tab detection
  const [scrollActiveTab, setScrollActiveTab] = useState("Breakfast");
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [serviceType, setServiceType] = useState<"table" | "takeaway">("table");
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
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isCollaborativeSession, setIsCollaborativeSession] = useState(false);
  const [collaborativeUserId, setCollaborativeUserId] = useState<string | null>(null);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastOrder, setLastOrder] = useState<StoredOrder | null>(() => {
    const savedOrder = localStorage.getItem(`lastOrder_${userId}`);
    if (!savedOrder) return null;
    try {
      return JSON.parse(savedOrder);
    } catch {
      return null;
    }
  });
  const [showOrderTracker, setShowOrderTracker] = useState(() => {
    return Boolean(localStorage.getItem(`lastOrder_${userId}`));
  });
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showPastOrdersModal, setShowPastOrdersModal] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const handleCallWaiter = () => {
    setNotification({
      type: "success",
      message: "A waiter has been notified.",
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const dismissActiveOrder = () => {
    setShowOrderTracker(false);
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
    console.log('Initializing cart state for userId:', userId);
    const savedCart = localStorage.getItem(`cart_${userId}`);
    console.log('Initial saved cart from localStorage:', savedCart);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        console.log('Initial parsed cart:', parsedCart);
        return parsedCart;
      } catch (error) {
        console.error('Error parsing saved cart:', error);
        return {};
      }
    }
    console.log('No initial cart found, starting with empty cart');
    return {};
  });
  
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
    
    const requestData = {
      fromUserId: userId,
      fromUserName: `User ${userId}`,
      targetUserId: targetUserId,
      timestamp: Date.now()
    };
    
    // Store the join request in localStorage for the target user
    const existingRequests = JSON.parse(localStorage.getItem('joinRequests') || '[]');
    existingRequests.push(requestData);
    localStorage.setItem('joinRequests', JSON.stringify(existingRequests));
    
    console.log('Stored join request:', requestData);
    console.log('All join requests:', existingRequests);
    
    // Store a pending request for the sender (not a full session yet)
    const pendingRequest = {
      targetUserId: targetUserId,
      timestamp: Date.now(),
      status: 'pending'
    };
    localStorage.setItem(`pendingJoinRequest_${userId}`, JSON.stringify(pendingRequest));
    
    // Show success notification
    setNotification({
      type: 'success',
      message: `Join request sent to User ${targetUserId}. Waiting for response...`
    });
    setTimeout(() => setNotification(null), 3000);
    
    console.log('Join request sent to:', targetUserId);
  };

  const checkForJoinRequests = () => {
    const requests = JSON.parse(localStorage.getItem('joinRequests') || '[]');
    console.log('Checking for join requests. Current userId:', userId);
    console.log('All join requests:', requests);
    
    const pendingRequest = requests.find((req: any) => req.targetUserId === userId);
    console.log('Found pending request:', pendingRequest);
    
    if (pendingRequest) {
      setJoinRequestData({
        fromUserId: pendingRequest.fromUserId,
        fromUserName: pendingRequest.fromUserName
      });
      setShowJoinRequest(true);
      
      // Remove the processed request
      const updatedRequests = requests.filter((req: any) => req.targetUserId !== userId);
      localStorage.setItem('joinRequests', JSON.stringify(updatedRequests));
      console.log('Processed join request, remaining requests:', updatedRequests);
    }
  };

  const checkForJoinRequestResponses = () => {
    const response = localStorage.getItem(`joinRequestResponse_${userId}`);
    if (response) {
      try {
        const responseData = JSON.parse(response);
        console.log('Received join request response:', responseData);
        
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
        
        // Clear the response
        localStorage.removeItem(`joinRequestResponse_${userId}`);
      } catch (error) {
        console.error('Error processing join request response:', error);
        localStorage.removeItem(`joinRequestResponse_${userId}`);
      }
    }
    
    // Check for expired pending requests (older than 30 seconds)
    const pendingRequest = localStorage.getItem(`pendingJoinRequest_${userId}`);
    if (pendingRequest) {
      try {
        const pendingData = JSON.parse(pendingRequest);
        const timeSinceRequest = Date.now() - pendingData.timestamp;
        
        if (timeSinceRequest > 30000) { // 30 seconds timeout
          console.log('Pending join request expired');
          localStorage.removeItem(`pendingJoinRequest_${userId}`);
          
          setNotification({
            type: 'error',
            message: `Join request to User ${pendingData.targetUserId} timed out`
          });
          setTimeout(() => setNotification(null), 3000);
        }
      } catch (error) {
        console.error('Error processing pending request:', error);
        localStorage.removeItem(`pendingJoinRequest_${userId}`);
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

    console.log('Exited collaborative session, kept only my items');
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
      const yOffset = -100; // Offset for sticky header
      const element = targetRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({top: y, behavior: 'smooth'});
    }
  };

  // Helper functions for cart management
  const getCurrentDealKey = () => {
    return currentDeal ? `${currentDeal.type}-${currentDeal.limit}-${currentDeal.freeCount}` : '';
  };

  const getCurrentDealSelection = () => {
    const dealKey = getCurrentDealKey();
    return dealSelections[dealKey] || {
      selectedDonuts: {},
      totalAmount: 0,
      freeDonutsSelected: []
    };
  };

  const addToCart = (donutName: string, price: number) => {
    const dealKey = getCurrentDealKey();
    if (!dealKey) return;

    setDealSelections(prev => {
      const currentSelection = prev[dealKey] || {
        selectedDonuts: {},
        totalAmount: 0,
        freeDonutsSelected: []
      };
      
      const currentTotal = Object.values(currentSelection.selectedDonuts).reduce((sum: number, count: number) => sum + count, 0);
      const limit = currentDeal?.limit || 7;
      
      if (currentTotal >= limit) {
        return prev; // Don't add more than the limit
      }
      
      const newSelectedDonuts = { 
        ...currentSelection.selectedDonuts, 
        [donutName]: (currentSelection.selectedDonuts[donutName] || 0) + 1 
      };
      
      const newTotal = updateTotalForSelection(newSelectedDonuts);
      
      return {
        ...prev,
        [dealKey]: {
          ...currentSelection,
          selectedDonuts: newSelectedDonuts,
          totalAmount: newTotal
        }
      };
    });
  };

  const removeFromCart = (donutName: string, price: number) => {
    const dealKey = getCurrentDealKey();
    if (!dealKey) return;

    setDealSelections(prev => {
      const currentSelection = prev[dealKey] || {
        selectedDonuts: {},
        totalAmount: 0,
        freeDonutsSelected: []
      };
      
      const currentCount = currentSelection.selectedDonuts[donutName] || 0;
      let newSelectedDonuts = { ...currentSelection.selectedDonuts };
      
      if (currentCount <= 1) {
        delete newSelectedDonuts[donutName];
      } else {
        newSelectedDonuts[donutName] = currentCount - 1;
      }
      
      const newTotal = updateTotalForSelection(newSelectedDonuts);
      
      return {
        ...prev,
        [dealKey]: {
          ...currentSelection,
          selectedDonuts: newSelectedDonuts,
          totalAmount: newTotal
        }
      };
    });
  };

  const updateTotalForSelection = (selected: {[key: string]: number}) => {
    let total = 0;
    Object.keys(selected).forEach(donutName => {
      const donut = donutOptions.find(d => d.name === donutName);
      if (donut) {
        total += donut.price * selected[donutName];
      }
    });
    return total;
  };

  const getTotalSelectedCount = () => {
    const currentSelection = getCurrentDealSelection();
    return Object.values(currentSelection.selectedDonuts).reduce((sum: number, count: number) => sum + count, 0);
  };

  const getCurrentTotalAmount = () => {
    const currentSelection = getCurrentDealSelection();
    return currentSelection.totalAmount;
  };

  const getCurrentFreeDonuts = () => {
    const currentSelection = getCurrentDealSelection();
    return currentSelection.freeDonutsSelected;
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

  const isOrderableItem = (item: MenuItemData) => getBaseItemPrice(item, item.temperatureOptions?.[0] ?? null) > 0;

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

      const uniquePrices = [...new Set(priceEntries.map((entry) => entry.price))];
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

  const getSuggestedSelectionTotal = () =>
    selectedSuggestedItems.reduce((total, itemName) => {
      const suggestion = SUGGESTED_ITEMS.find((item) => item.name === itemName);
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

  const setCurrentFreeDonuts = (freeDonuts: string[]) => {
    const dealKey = getCurrentDealKey();
    if (!dealKey) return;

    setDealSelections(prev => ({
      ...prev,
      [dealKey]: {
        ...getCurrentDealSelection(),
        freeDonutsSelected: freeDonuts
      }
    }));
  };

  // Cart functions
  const addItemToCart = (itemName: string, price: number, image?: string, details?: string) => {
    if (isSessionLocked) {
      console.log('Session is locked, cannot add items');
      return;
    }

    console.log('Adding item to cart:', { itemName, price, image, details });

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
          addedBy: userId
        }
      };
      console.log('New cart item:', newCart[uniqueKey]);
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
      console.log('Session is locked, cannot remove items');
      return;
    }

    // Check if user can modify this item
    if (!canModifyItem(itemKey)) {
      console.log('Cannot modify item added by another user');
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

  const getCartQuantityByName = (itemName: string) => {
    const item = Object.values(cart).find(entry => entry.name === itemName);
    return item?.quantity || 0;
  };

  const resolvePrice = (name: string, fallback?: number) => {
    const numericFallback = typeof fallback === "number" ? fallback : 0;
    const key = name.toLowerCase();
    const mapped = PRICE_MAP[key];
    if (mapped) return mapped;
    if (numericFallback > 0) return numericFallback;
    const suggested = SUGGESTED_ITEMS.find(item => item.name.toLowerCase() === key);
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

  // Drag handlers for modal
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const offset = clientY - dragStartY;
    if (offset > 0) {
      setDragOffset(offset);
    }
  };

  const handleDragEnd = () => {
    if (dragOffset > 50) {
      // Close modal if dragged down more than 50px (easier threshold)
      setShowDonutModal(false);
      setShowFreeDonutModal(false);
      setDragOffset(0);
    }
    setIsDragging(false);
    setDragOffset(0);
  };

  // Scroll-based active tab detection
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollPosition = window.scrollY + 200; // Offset for sticky header
          
          // Show sticky header after scrolling past hero
          setShowStickyHeader(window.scrollY > 200);
          
          const sections = [
            { name: "Breakfast", ref: breakfastRef },
            { name: "Salads", ref: saladsRef },
            { name: "Sandwiches", ref: sandwichesRef },
            { name: "Coffee", ref: coffeeRef },
            { name: "Slow Bar", ref: slowBarRef },
            { name: "Not Coffee", ref: notCoffeeRef },
            { name: "Matcha", ref: matchaRef },
          ];

          for (let i = sections.length - 1; i >= 0; i--) {
            const section = sections[i];
            if (section.ref.current) {
              const element = section.ref.current;
              const elementTop = element.offsetTop;
              const elementBottom = elementTop + element.offsetHeight;
              
              if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
                setScrollActiveTab(section.name);
                // Auto-scroll the sticky menu to show the active tab
                setTimeout(() => {
                  const activeTabElement = document.querySelector(`[data-tab="${section.name}"]`);
                  if (activeTabElement) {
                    activeTabElement.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                      inline: 'center'
                    });
                  }
                }, 100);
                break;
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
    const cartName = getSelectedCartName(selectedItem, selectedEggType, selectedTemperature, selectedAddOns);
    const itemPrice = getSelectedItemPrice(selectedItem, selectedEggType, selectedTemperature, selectedAddOns);
    const itemDetails = getSelectedItemDetails(selectedItem, selectedEggType, selectedTemperature, selectedAddOns);
    const currentQty = getCartQuantityByName(cartName);
    const diff = itemQuantity - currentQty;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        addItemToCart(cartName, itemPrice, selectedItem.image, itemDetails);
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        removeItemByName(cartName);
      }
    }

    selectedSuggestedItems.forEach((itemName) => {
      const suggestion = SUGGESTED_ITEMS.find((item) => item.name === itemName);
      if (!suggestion) return;
      addItemToCart(
        suggestion.name,
        resolvePrice(suggestion.name, suggestion.price),
        suggestion.image,
        "Frequently bought together",
      );
    });

    handleCloseItemModal();
  };

  const handleAddSuggestedItem = (item: MenuItemData) => {
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
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (showItemModal || showCart) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showItemModal, showCart]);

  const getSuggestedItems = (currentName: string) => {
    const filtered = SUGGESTED_ITEMS.filter(item => item.name.toLowerCase() !== currentName.toLowerCase());
    return (filtered.length ? filtered : SUGGESTED_ITEMS).slice(0, 2);
  };

  // Check for join requests and responses periodically
  useEffect(() => {
    const checkRequests = () => {
      checkForJoinRequests();
      checkForJoinRequestResponses();
    };

    // Check immediately and then every 2 seconds
    checkRequests();
    const interval = setInterval(checkRequests, 2000);

    return () => clearInterval(interval);
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
    console.log('Cart loading useEffect triggered, userId:', userId);
    const savedCart = localStorage.getItem(`cart_${userId}`);
    console.log('Saved cart from localStorage:', savedCart);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        console.log('Parsed cart:', parsedCart);
        setCart(parsedCart);
        console.log('Cart loaded from localStorage:', parsedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    } else {
      console.log('No saved cart found for userId:', userId);
    }
  }, [userId]);

  // Additional cart loading on page visibility change (mobile-specific)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible again, check for cart data
        console.log('Page became visible, checking for cart data');
        const savedCart = localStorage.getItem(`cart_${userId}`);
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart);
            console.log('Cart loaded on visibility change:', parsedCart);
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
    console.log('Cart saving useEffect triggered, cart:', cart);
    if (Object.keys(cart).length > 0) {
      localStorage.setItem(getCartKey(), JSON.stringify(cart));
      console.log('Cart saved to localStorage:', cart);
    } else {
      console.log('Cart is empty, not saving to localStorage');
    }
  }, [cart]);

  // Periodic cart validation for mobile browsers
  useEffect(() => {
    const checkCartIntegrity = () => {
      // If we have items in state but nothing in localStorage, restore from localStorage
      const savedCart = localStorage.getItem(`cart_${userId}`);
      if (Object.keys(cart).length > 0 && !savedCart) {
        console.log('Cart integrity check: state has items but localStorage is empty, saving to localStorage');
        localStorage.setItem(getCartKey(), JSON.stringify(cart));
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkCartIntegrity, 5000);
    return () => clearInterval(interval);
  }, [cart, userId]);

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
        
        // If no heartbeat for more than 10 seconds, consider user disconnected
        if (timeSinceHeartbeat > 10000) {
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
    const interval = setInterval(syncSession, 3000);

    return () => clearInterval(interval);
    }, [isCollaborativeSession, collaborativeUserId, userId]);



  // Real-time cart sync for collaborative sessions
  useEffect(() => {
    const checkForCartChanges = () => {
      // Check for sync events from the other user
      const syncEvent = localStorage.getItem(`cart_sync_${userId}`);
      if (syncEvent) {
        try {
          const syncData = JSON.parse(syncEvent);
          const currentTime = Date.now();
          
          // Only process recent sync events (within last 5 seconds)
          if (currentTime - syncData.timestamp < 5000) {
            // Handle session start event
            if (syncData.sessionStart) {
              setIsCollaborativeSession(true);
              setCollaborativeUserId(syncData.fromUserId || '');
              console.log('Session started via sync');
            }
            
            setIsSyncing(true);
            setCart(syncData.cart);
            console.log('Real-time cart sync received');
            
            // Hide syncing indicator after a short delay
            setTimeout(() => setIsSyncing(false), 1000);
          }
          
          // Clear the sync event after processing
          localStorage.removeItem(`cart_sync_${userId}`);
        } catch (error) {
          console.error('Error processing cart sync:', error);
          localStorage.removeItem(`cart_sync_${userId}`);
        }
      }
    };

    // Check for cart changes more frequently (every 500ms for real-time feel)
    const interval = setInterval(checkForCartChanges, 500);

    return () => clearInterval(interval);
  }, [userId]);

  // Heartbeat system to track user activity
  useEffect(() => {
    const updateHeartbeat = () => {
      const heartbeat = {
        userId: userId,
        timestamp: Date.now()
      };
      localStorage.setItem(`heartbeat_${userId}`, JSON.stringify(heartbeat));
    };

    // Update heartbeat every 2 seconds
    updateHeartbeat();
    const heartbeatInterval = setInterval(updateHeartbeat, 2000);

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
        console.log('Page hidden, saving cart to localStorage');
        localStorage.setItem(getCartKey(), JSON.stringify(cart));
      }
    };

    const handlePageHide = () => {
      // Save cart when page is hidden (mobile browser behavior)
      if (Object.keys(cart).length > 0) {
        console.log('Page hide event, saving cart to localStorage');
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

  const cartListScrollable = Object.keys(cart).length > 2;
  const renderAccountMenu = (avatarSizeClass: string) => (
    <div ref={accountMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setShowAccountMenu((value) => !value)}
        className="rounded-full transition-transform hover:scale-[1.02]"
      >
        <img
          src="/Avatar.avif"
          alt="User avatar"
          className={`${avatarSizeClass} rounded-full object-cover border border-gray-200 shadow-sm`}
        />
      </button>

      {showAccountMenu && (
        <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-4">
            <p className="text-sm font-semibold text-gray-900 heading-font">Signed in</p>
            <p className="mt-1 text-xs text-gray-500 subtext-font">User ID {userId}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowPastOrdersModal(true);
              setShowAccountMenu(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
          >
            <ClipboardList size={17} />
            <span className="heading-font">View past order</span>
          </button>

          {lastOrder ? (
            <button
              type="button"
              onClick={() => {
                setShowOrderTracker(true);
                setShowAccountMenu(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
            >
              <BellRing size={17} />
              <span className="heading-font">Track current order</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={17} />
            <span className="heading-font">Log out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
      className="bg-[#faf9f6] pb-safe pb-2"
    >
      <style>{`
        .menu-image-surface {
          background-color: ${BRAND_PRIMARY};
        }

        .item-image {
          background-color: ${BRAND_PRIMARY};
        }
      `}</style>

      {/* Notification Banner */}
      {notification && (
        <div className="fixed top-4 left-4 z-50 animate-in slide-in-from-left duration-300">
          <div className={`px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="bg-white px-4 py-0 flex items-center justify-between border-b border-b-gray-200"
        style={{ minHeight: "2rem" }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/TableTap.png"
            alt="Table Tap"
            className="shrink-0"
            style={{ height: "6rem", width: "auto", display: "block" }}
          />
        </div>
        <div className="flex items-center gap-2">
          {renderAccountMenu("h-11 w-11")}
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
            <div className="text-lg font-semibold text-gray-900 heading-font">{RESTAURANT.name}</div>
            <div className="flex items-center gap-2">
              {renderAccountMenu("h-10 w-10")}
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

      {showOrderTracker && lastOrder && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-4 pb-[1.1rem] pt-3 backdrop-blur">
          <div className="rounded-3xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((step) => (
                step === 0 ? (
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
                ) : (
                  <div key={step} className="h-1.5 rounded-full bg-gray-200" />
                )
              ))}
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900 heading-font">Your order is being prepared</p>
                <p className="mt-1 text-xs text-gray-500 subtext-font">
                  Order #{lastOrder.orderNumber} will be served to {lastOrder.tableLabel}.
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
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleCallWaiter}
        className={`fixed right-4 z-40 flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-gray-900 heading-font ${
          showOrderTracker && lastOrder && getCartItemCount() > 0
            ? "bottom-40"
            : showOrderTracker && lastOrder
              ? "bottom-28"
              : getCartItemCount() > 0
                ? "bottom-24"
                : "bottom-6"
        }`}
      >
        <BellRing size={18} />
        <span>Call waiter</span>
      </button>

      {/* Sticky View Cart Bar */}
      {getCartItemCount() > 0 && (
        <div
          className={`fixed inset-x-0 z-30 px-4 pb-[1.1rem] pt-2 bg-white/95 backdrop-blur border-t border-gray-200 ${
            showOrderTracker && lastOrder ? "bottom-24" : "bottom-0"
          }`}
        >
          <button
            onClick={() => setShowCart(true)}
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

          <div className="mt-5 space-y-3 text-sm font-medium">
            <div className="flex items-center bg-gray-100 rounded-full px-1 py-1 shadow-inner heading-font border border-gray-200 w-full max-w-[360px]">
              <button
                onClick={() => setServiceType("table")}
                className={`flex-1 px-4 py-1.5 rounded-full transition-all text-sm font-semibold ${
                  serviceType === "table"
                    ? "bg-white shadow text-black"
                    : "text-gray-600"
                }`}
              >
                Table service
              </button>
              <button
                onClick={() => setServiceType("takeaway")}
                className={`flex-1 px-4 py-1.5 rounded-full transition-all text-sm font-semibold ${
                  serviceType === "takeaway"
                    ? "bg-white shadow text-black"
                    : "text-gray-600"
                }`}
              >
                Take-away
              </button>
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
             {BREAKFAST_ITEMS.map((item) => (
               <div
                 key={item.name}
                 className="bg-white rounded-lg shadow w-56 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow"
                 onClick={() => openItemDetailFromData(item)}
               >
                 <img
                   src={item.image}
                   alt={item.name}
                   className="menu-image-surface w-full h-32 object-cover rounded-t-lg"
                 />
                 <div className="p-3">
                   <div className="font-bold text-xs mb-1 item-title">{item.name}</div>
                   <div className="text-xs text-gray-500 mb-2 item-description">{item.description}</div>
                   <div className="font-bold text-sm item-price">Rs.{item.price}/-</div>
                 </div>
               </div>
             ))}
           </div>
         </div>

         {/* Salads Section */}
         <div ref={saladsRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">SALADS.</h2>
           <div className="flex space-x-4 overflow-x-auto">
             {SALAD_ITEMS.map((item) => (
               <div
                 key={item.name}
                 className="bg-white rounded-lg shadow w-56 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow"
                 onClick={() => openItemDetailFromData(item)}
               >
                 <img
                   src={item.image}
                   alt={item.name}
                   className="menu-image-surface w-full h-32 object-cover rounded-t-lg"
                 />
                 <div className="p-3">
                   <div className="font-bold text-xs mb-1 item-title">{item.name}</div>
                   <div className="text-xs text-gray-500 mb-2 item-description">{item.description}</div>
                   <div className="font-bold text-sm item-price">Rs.{item.price}/-</div>
                 </div>
               </div>
             ))}
           </div>
         </div>

         {/* Sandwiches Section */}
         <div ref={sandwichesRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">SANDWICHES.</h2>
           <div className="flex space-x-4 overflow-x-auto">
             {SANDWICH_ITEMS.map((item) => (
               <div
                 key={item.name}
                 className="bg-white rounded-lg shadow w-56 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow"
                 onClick={() => openItemDetailFromData(item)}
               >
                 <img
                   src={item.image}
                   alt={item.name}
                   className="menu-image-surface w-full h-32 object-cover rounded-t-lg"
                 />
                 <div className="p-3">
                   <div className="font-bold text-xs mb-1 item-title">{item.name}</div>
                   <div className="text-xs text-gray-500 mb-2 item-description">{item.description}</div>
                   <div className="font-bold text-sm item-price">Rs.{item.price}/-</div>
                 </div>
               </div>
             ))}
           </div>
         </div>

         {/* Coffee Section */}
         <div ref={coffeeRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">COFFEE.</h2>
           <div className="space-y-3">
             {COFFEE_ITEMS.map((item) => {
               const priceLabel = getItemPriceLabel(item);
               return (
                 <div
                   key={item.name}
                   className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-row-reverse items-start justify-between gap-4 p-4 bg-white cursor-pointer"
                   onClick={() => openItemDetailFromData(item)}
                 >
                   <img
                     src={item.image}
                     alt={item.name}
                     className="w-24 h-24 object-cover rounded-xl flex-shrink-0 item-image"
                   />
                   <div className="flex flex-col flex-1 gap-1">
                     <div className="text-lg font-semibold text-gray-900 heading-font normal-case line-clamp-2 item-title">{item.name}</div>
                     <div className="text-sm text-gray-600 subtext-font line-clamp-1 item-description">{item.description}</div>
                     {priceLabel ? (
                       <div className="mt-auto text-base font-semibold text-gray-900 heading-font item-price">{priceLabel}</div>
                     ) : null}
                   </div>
                 </div>
               );
             })}
           </div>
         </div>

         {/* Slow Bar Section */}
         <div ref={slowBarRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">SLOW BAR.</h2>
           <div className="space-y-3">
             {SLOW_BAR_ITEMS.map((item) => {
               const priceLabel = getItemPriceLabel(item);
               const itemIsOrderable = isOrderableItem(item);
               return (
                 <div
                   key={item.name}
                   className={`rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-row-reverse items-start justify-between gap-4 p-4 ${
                     itemIsOrderable ? "bg-white cursor-pointer" : "bg-gray-50 cursor-default"
                   }`}
                   onClick={() => openItemDetailFromData(item)}
                 >
                   <img
                     src={item.image}
                     alt={item.name}
                     className="w-24 h-24 object-cover rounded-xl flex-shrink-0 item-image"
                   />
                   <div className="flex flex-col flex-1 gap-1">
                     <div className="text-lg font-semibold text-gray-900 heading-font normal-case line-clamp-2 item-title">{item.name}</div>
                     <div className="text-sm text-gray-600 subtext-font line-clamp-2 item-description">{item.description}</div>
                     {priceLabel ? (
                       <div className="mt-auto text-base font-semibold text-gray-900 heading-font item-price">{priceLabel}</div>
                     ) : null}
                   </div>
                 </div>
               );
             })}
           </div>
         </div>

         {/* Not Coffee Section */}
         <div ref={notCoffeeRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">NOT COFFEE.</h2>
           <div className="space-y-3">
             {NOT_COFFEE_ITEMS.map((item) => {
               const priceLabel = getItemPriceLabel(item);
               return (
                 <div
                   key={item.name}
                   className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-row-reverse items-start justify-between gap-4 p-4 bg-white cursor-pointer"
                   onClick={() => openItemDetailFromData(item)}
                 >
                   <img
                     src={item.image}
                     alt={item.name}
                     className="w-24 h-24 object-cover rounded-xl flex-shrink-0 item-image"
                   />
                   <div className="flex flex-col flex-1 gap-1">
                     <div className="text-lg font-semibold text-gray-900 heading-font normal-case line-clamp-2 item-title">{item.name}</div>
                     <div className="text-sm text-gray-600 subtext-font line-clamp-2 item-description">{item.description}</div>
                     {priceLabel ? (
                       <div className="mt-auto text-base font-semibold text-gray-900 heading-font item-price">{priceLabel}</div>
                     ) : null}
                   </div>
                 </div>
               );
             })}
           </div>
         </div>

         {/* Matcha Section */}
         <div ref={matchaRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">MATCHA.</h2>
           <div className="space-y-3">
             {MATCHA_ITEMS.map((item) => {
               const priceLabel = getItemPriceLabel(item);
               return (
                 <div
                   key={item.name}
                   className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-row-reverse items-start justify-between gap-4 p-4 bg-white cursor-pointer"
                   onClick={() => openItemDetailFromData(item)}
                 >
                   <img
                     src={item.image}
                     alt={item.name}
                     className="w-24 h-24 object-cover rounded-xl flex-shrink-0 item-image"
                   />
                   <div className="flex flex-col flex-1 gap-1">
                     <div className="text-lg font-semibold text-gray-900 heading-font normal-case line-clamp-2 item-title">{item.name}</div>
                     <div className="text-sm text-gray-600 subtext-font line-clamp-2 item-description">{item.description}</div>
                     {priceLabel ? (
                       <div className="mt-auto text-base font-semibold text-gray-900 heading-font item-price">{priceLabel}</div>
                     ) : null}
                   </div>
                 </div>
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
              <div className="flex-1 overflow-y-auto">
                <div className="relative">
                  {selectedItem.image && (
                    <img
                      src={selectedItem.image}
                      alt={selectedItem.name}
                      className="menu-image-surface w-full h-56 object-cover"
                    />
                  )}
                  <button
                    onClick={handleCloseItemModal}
                    className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center"
                  >
                    <X size={22} className="text-gray-800" />
                  </button>
                </div>
                <div className="p-5 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-2xl font-semibold text-gray-900 heading-font normal-case">
                        {selectedItem.name}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 heading-font mt-1">
                        {getItemPriceLabel(selectedItem, selectedTemperature)}
                      </p>
                    </div>
                  </div>

                  {selectedItem.description && (
                    <p className="text-sm text-gray-600 subtext-font">{selectedItem.description}</p>
                  )}

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

                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-full bg-gray-100 px-3 py-2">
                      <button
                        onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 flex items-center justify-center text-gray-700"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="mx-3 text-base font-semibold heading-font">{itemQuantity}</span>
                      <button
                        onClick={() => setItemQuantity((q) => q + 1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-700"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-lg font-semibold text-gray-900 heading-font mb-3">
                      Frequently bought together
                    </p>
                    <div className="flex space-x-4 overflow-x-auto pb-1">
                      {getSuggestedItems(selectedItem.name).map(suggestion => {
                        const isSelected = selectedSuggestedItems.includes(suggestion.name);
                        return (
                          <div
                            key={suggestion.name}
                            className={`relative rounded-lg shadow w-56 flex-shrink-0 cursor-pointer transition-all ${
                              isSelected
                                ? "bg-black text-white shadow-lg"
                                : "bg-white hover:shadow-lg"
                            }`}
                            onClick={() => handleAddSuggestedItem(suggestion)}
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAddSuggestedItem(suggestion);
                              }}
                              className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow ${
                                isSelected
                                  ? "bg-white text-black"
                                  : "bg-white/95 text-gray-900"
                              }`}
                            >
                              {isSelected ? <Check size={16} /> : <Plus size={16} />}
                            </button>
                            <img
                              src={suggestion.image}
                              alt={suggestion.name}
                              className="menu-image-surface w-full h-32 object-cover rounded-t-lg"
                            />
                            <div className="p-3">
                              <p className="font-bold text-xs mb-1 item-title">
                                {suggestion.name}
                              </p>
                              <p
                                className={`text-xs mb-2 item-description line-clamp-2 ${
                                  isSelected ? "text-white/75" : "text-gray-500"
                                }`}
                              >
                                {isSelected ? "Included in this order." : "Add this to your order with one tap."}
                              </p>
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

              <div className="bg-white border-t p-4">
                <button
                  onClick={handleAddSelectedItem}
                  className="w-full bg-black text-white py-3 rounded-full text-base font-semibold heading-font"
                >
                  Add {itemQuantity + selectedSuggestedItems.length} to order • Rs.{((getSelectedItemPrice(selectedItem, selectedEggType, selectedTemperature, selectedAddOns) * itemQuantity) + getSuggestedSelectionTotal()).toLocaleString()}/-
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Donut Selection Modal */}
      <AnimatePresence>
        {showDonutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
            onClick={() => setShowDonutModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: dragOffset }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ transform: `translateY(${dragOffset}px)` }}
            >
              {/* Drag Indicator */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Modal Header */}
              <div 
                className="flex items-center justify-between p-4 border-b cursor-grab active:cursor-grabbing"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <h2 className="text-xl font-bold">{currentDeal?.title || "Select Your Donuts"}</h2>
                <button
                  onClick={() => setShowDonutModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 max-h-[55vh] overflow-y-auto pb-20">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {currentDeal?.freeCount ? 
                      `Choose exactly ${currentDeal.limit} donuts and get ${currentDeal.freeCount} classic donut${currentDeal.freeCount > 1 ? 's' : ''} free! (Maximum ${currentDeal.limit} donuts allowed)` :
                      `Choose exactly ${currentDeal?.limit || 4} donuts for your combo! (Maximum ${currentDeal?.limit || 4} donuts allowed)`
                    }
                  </p>
                </div>

                {/* Donut Grid */}
                <div className="space-y-3">
                  {donutOptions.map((donut, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow min-h-[180px] flex flex-col"
                    >
                      <img
                        src={donut.image}
                        alt={donut.name}
                        className="menu-image-surface w-full h-20 object-contain mb-2 flex-shrink-0 rounded-xl"
                      />
                      <div className="text-center flex flex-col flex-1">
                        <h3 className="font-semibold text-sm mb-1">{donut.name}</h3>
                        <div className="text-xs text-gray-600 mb-2">Rs.{donut.price}/-</div>
                        <div className="mt-auto">
                          <ModalSmartCounter
                            donutName={donut.name}
                            price={donut.price}
                            count={getCurrentDealSelection().selectedDonuts[donut.name] || 0}
                            onAdd={() => addToCart(donut.name, donut.price)}
                            onRemove={() => removeFromCart(donut.name, donut.price)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Selected: <span className="font-semibold">{getTotalSelectedCount()}/{currentDeal?.limit || 7}</span> donuts
                    <br />
                    <span className="text-xs">Total: Rs.{getCurrentTotalAmount()}/-</span>
                  </div>
                  <button
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      getTotalSelectedCount() >= (currentDeal?.limit || 7)
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      const limit = currentDeal?.limit || 7;
                      if (getTotalSelectedCount() >= limit) {
                        if (currentDeal?.type === "deal" && currentDeal?.freeCount) {
                          // Show free donut selection modal only for deals with free donuts
                          setShowFreeDonutModal(true);
                        } else {
                          // For combos, add the entire combo as one item to cart
                          const selectedDonuts = getCurrentDealSelection().selectedDonuts;
                          const comboName = currentDeal?.title || `Box of ${currentDeal?.limit}`;
                          const comboPrice = getCurrentTotalAmount();
                          
                          // Create combo details
                          const comboDetails = Object.keys(selectedDonuts).map(donutName => 
                            `${donutName} (${selectedDonuts[donutName]})`
                          ).join(', ');
                          
                          addItemToCart(comboName, comboPrice, undefined, comboDetails);
                          setShowDonutModal(false);
                          // Clear the current deal selection
                          const dealKey = getCurrentDealKey();
                          if (dealKey) {
                            setDealSelections(prev => {
                              const newSelections = { ...prev };
                              delete newSelections[dealKey];
                              return newSelections;
                            });
                          }
                        }
                      }
                    }}
                  >
                    {currentDeal?.type === "deal" && currentDeal?.freeCount 
                      ? `Select ${currentDeal.freeCount} Free Donut${currentDeal.freeCount > 1 ? 's' : ''}` 
                      : 'Complete Order'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free Donut Selection Modal */}
      <AnimatePresence>
        {showFreeDonutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setShowFreeDonutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: dragOffset }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ transform: `translateY(${dragOffset}px)` }}
            >
              {/* Modal Header */}
              <div 
                className="flex items-center justify-between p-4 border-b cursor-grab active:cursor-grabbing"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <h2 className="text-xl font-bold">Choose Your Free Classic Donut</h2>
                <button
                  onClick={() => setShowFreeDonutModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    You've selected {currentDeal?.limit || 7} donuts! Choose {currentDeal?.freeCount || 1} classic donut{(currentDeal?.freeCount || 1) > 1 ? 's' : ''} for free:
                  </p>
                </div>

                {/* Classic Donut Options */}
                <div className="space-y-3">
                  {donutOptions.filter(donut => donut.category === "Classic").map((donut, index) => (
                    <div
                      key={index}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        getCurrentFreeDonuts().includes(donut.name)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        const currentFreeDonuts = getCurrentFreeDonuts();
                        if (currentFreeDonuts.includes(donut.name)) {
                          setCurrentFreeDonuts(currentFreeDonuts.filter(name => name !== donut.name));
                        } else {
                          const maxFree = currentDeal?.freeCount || 1;
                          if (currentFreeDonuts.length < maxFree) {
                            setCurrentFreeDonuts([...currentFreeDonuts, donut.name]);
                          }
                        }
                      }}
                    >
                      <img
                        src={donut.image}
                        alt={donut.name}
                        className="menu-image-surface w-16 h-16 object-contain mr-3 rounded-xl"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{donut.name}</h3>
                        <p className="text-xs text-gray-500">Classic Donut</p>
                      </div>
                      <div className="text-sm font-bold text-green-600">
                        FREE
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    <div>Selected: <span className="font-semibold">{getTotalSelectedCount()}</span> donuts</div>
                    <div>Total: <span className="font-semibold">Rs.{getCurrentTotalAmount()}/-</span></div>
                    {getCurrentFreeDonuts().length > 0 && (
                      <div className="text-green-600 text-xs">
                        + {getCurrentFreeDonuts().length} free: {getCurrentFreeDonuts().join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      getCurrentFreeDonuts().length === (currentDeal?.freeCount || 1)
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      const requiredFree = currentDeal?.freeCount || 1;
                      if (getCurrentFreeDonuts().length === requiredFree) {
                        // Add the entire deal as one item to cart
                        const selectedDonuts = getCurrentDealSelection().selectedDonuts;
                        const dealName = currentDeal?.title || `Deal`;
                        const dealPrice = getCurrentTotalAmount();
                        
                        // Create deal details
                        const dealDetails = Object.keys(selectedDonuts).map(donutName => 
                          `${donutName} (${selectedDonuts[donutName]})`
                        ).join(', ');
                        
                        // Add free donuts to details
                        const freeDonuts = getCurrentFreeDonuts();
                        const freeDetails = freeDonuts.length > 0 ? 
                          ` + FREE: ${freeDonuts.join(', ')}` : '';
                        
                        const fullDetails = dealDetails + freeDetails;
                        
                        addItemToCart(dealName, dealPrice, undefined, fullDetails);
                        
                        setShowFreeDonutModal(false);
                        setShowDonutModal(false);
                        // Clear the current deal selection
                        const dealKey = getCurrentDealKey();
                        if (dealKey) {
                          setDealSelections(prev => {
                            const newSelections = { ...prev };
                            delete newSelections[dealKey];
                            return newSelections;
                          });
                        }
                      }
                    }}
                  >
                    Complete Order
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
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
                    {Object.entries(cart).map(([key, item]) => (
                      <div key={key} className="flex items-center justify-between pb-4 border-b">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
                          )}
                          <div>
                            <p className="text-lg font-semibold text-gray-900 heading-font">{item.name}</p>
                            <p className="text-base text-gray-700 subtext-font">Rs.{item.price}/-</p>
                            {item.details ? (
                              <p className="mt-1 text-xs text-gray-500 subtext-font line-clamp-2">{item.details}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                          <button onClick={() => removeItemFromCart(key)} className="p-1">
                            <Minus size={16} />
                          </button>
                          <span className="text-base font-semibold heading-font">{item.quantity}</span>
                          <button
                            onClick={() => addItemToCart(item.name, item.price, item.image, item.details)}
                            className="p-1"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

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
                onClick={() => {
                  setShowCart(false);
                  window.location.href = `/checkout/pay-fully${tableQuery}`;
                }}
                className="w-full bg-black text-white py-3 rounded-full text-base font-semibold heading-font"
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
                  <p className="mt-1 text-sm text-gray-500 subtext-font">Your most recent order details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPastOrdersModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              {lastOrder ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900 heading-font">Order #{lastOrder.orderNumber}</p>
                    <p className="mt-1 text-sm text-gray-500 subtext-font">{lastOrder.tableLabel}</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900 heading-font">
                      Rs.{lastOrder.total.toLocaleString()}
                    </p>
                  </div>

                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {lastOrder.items.map((item) => (
                      <div key={`${item.name}-${item.details || "base"}`} className="flex items-start justify-between gap-4">
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
              ) : (
                <div className="mt-5 rounded-2xl bg-gray-50 p-5 text-center">
                  <p className="text-sm font-semibold text-gray-900 heading-font">No past orders yet</p>
                  <p className="mt-1 text-sm text-gray-500 subtext-font">
                    Your most recent order will show up here after checkout.
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

































