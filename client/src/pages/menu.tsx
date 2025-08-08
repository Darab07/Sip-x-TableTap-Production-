import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronDown, Plus, Minus, X, ShoppingCart, Users } from "lucide-react";
import { getOrCreateUserID } from "@/lib/userID";
import { useLocation } from "wouter";

const userId = getOrCreateUserID();

const tabs = ["Deals", "Combos", "Donuts", "Sandwiches", "Salads", "Drinks"];

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
  const [location] = useLocation();
  
  // Extract table number from URL
  const getTableNumber = () => {
    const match = location.match(/\/Crusteez\/Table(\d+)\/menu/);
    return match ? match[1] : '7'; // Default to 7 if not found
  };

  const tableNumber = getTableNumber();
  
  const [activeTab, setActiveTab] = useState("Deals");
  const [showDonutModal, setShowDonutModal] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<{
    type: string;
    limit: number;
    freeCount: number;
    title: string;
  } | null>(null);
  
  // Refs for scrolling to sections
  const recommendedRef = useRef<HTMLDivElement>(null);
  const combosRef = useRef<HTMLDivElement>(null);
  const donutsRef = useRef<HTMLDivElement>(null);
  const sandwichesRef = useRef<HTMLDivElement>(null);
  const saladsRef = useRef<HTMLDivElement>(null);
  const drinksRef = useRef<HTMLDivElement>(null);

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
  const [scrollActiveTab, setScrollActiveTab] = useState("Deals");
  const [showStickyCart, setShowStickyCart] = useState(false);
  const [selectedTip, setSelectedTip] = useState(() => {
    const savedTip = localStorage.getItem(`selectedTip_${userId}`);
    return savedTip ? parseInt(savedTip) : 5;
  });
  const [showSplitOptions, setShowSplitOptions] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'easypaisa' | 'jazzcash' | null>(null);
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
  
  // Cart state with user tracking - using unique keys for each user's items
  const [cart, setCart] = useState<{[key: string]: {name: string; price: number; quantity: number; image?: string; details?: string; addedBy: string}}>(() => {
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
  
  // Wrapper function to convert item name to proper item key for removal
  const removeItemByName = (itemName: string) => {
    const itemKey = `${itemName}_${userId}`;
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
      "Deals": recommendedRef,
      "Combos": combosRef,
      "Donuts": donutsRef,
      "Sandwiches": sandwichesRef,
      "Salads": saladsRef,
      "Drinks": drinksRef
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
      const uniqueKey = `${itemName}_${userId}`;
      
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

  const getTipAmount = () => {
    const subtotal = getCartTotal();
    return (subtotal * selectedTip) / 100;
  };

  const getTotalWithTip = () => {
    return getCartTotal() + getTipAmount();
  };

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
          
          // Show sticky cart after scrolling past header (approximately 200px)
          setShowStickyCart(window.scrollY > 200);
          
          const sections = [
            { name: "Deals", ref: recommendedRef },
            { name: "Combos", ref: combosRef },
            { name: "Donuts", ref: donutsRef },
            { name: "Sandwiches", ref: sandwichesRef },
            { name: "Salads", ref: saladsRef },
            { name: "Drinks", ref: drinksRef }
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
      className="bg-[#faf9f6] pb-safe"
    >
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

      {/* Top Bar */}
      <div className="relative px-6 py-20 text-black bg-cover bg-center" style={{ backgroundImage: 'url(/Background.png)' }}>
        {/* Session Status on the top left */}
        <div className="absolute top-4 left-6 text-xs text-black">
          {isSessionLocked && (
            <div className="text-red-600 font-medium">
              🔒 Session Locked
            </div>
          )}
          {isSyncing && (
            <div className="text-blue-600 font-medium animate-pulse">
              🔄 Syncing...
            </div>
          )}
        </div>
        
        {/* Centered Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 top-1/2 transform -translate-y-1/2">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-28 h-28"
          />
        </div>
        

        


        {/* Collaborative Session Indicator - Bottom Left */}
        {isCollaborativeSession && (
          <div className="absolute bottom-2 left-6">
            <div className="bg-green-100 border border-green-300 rounded-lg p-2 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-800">
                  Shared
                </span>
                <button
                  onClick={() => exitCollaborativeSession()}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Permanent Cart Icon */}
        <div className="fixed top-20 right-6 z-20">
          <button
            onClick={() => setShowCart(true)}
            className="p-3 bg-white shadow-lg rounded-full transition-colors hover:bg-gray-50"
          >
            <ShoppingCart size={28} className="text-black" />
            {getCartItemCount() > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {getCartItemCount()}
              </div>
            )}
          </button>
        </div>
      </div>

             {/* Scrollable Tabs */}
       <div className="flex overflow-x-auto space-x-8 px-6 py-4 bg-white border-b sticky top-0 z-20">
         {tabs.map(tab => (
           <button
             key={tab}
             data-tab={tab}
             onClick={() => handleTabClick(tab)}
             className={`text-sm font-medium pb-2 border-b-2 whitespace-nowrap ${
               scrollActiveTab === tab
                 ? "border-black text-black"
                 : "border-transparent text-gray-500"
             }`}
           >
             {tab}
           </button>
         ))}
       </div>

      {/* All Sections on One Page */}
      <div className="px-4">
        {/* Share your cart Section */}
        <div className="py-6">
          <h2 className="text-xl font-extrabold tracking-tight mb-1">SHARE YOUR CART.</h2>
          <p className="text-sm text-gray-600 mb-4">Group orders made simple — just add their UserID.</p>
          
          {/* User ID Display */}
          <div className="mb-4">
            <div className="text-sm font-bold text-gray-700">Your User ID: {userId}</div>
          </div>
          
          {/* Share Cart Input */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Share cart</label>
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Friend's ID"
                value={shareCartInput}
                onChange={(e) => setShareCartInput(e.target.value)}
                onFocus={() => {
                  document.documentElement.style.overflow = 'hidden';
                  document.body.style.overflow = 'hidden';
                }}
                onBlur={() => {
                  document.documentElement.style.overflow = '';
                  document.body.style.overflow = '';
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button 
                onClick={() => {
                  if (shareCartInput.trim()) {
                    sendJoinRequest(shareCartInput.trim());
                    setShareCartInput('');
                  }
                }}
                className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                Share
              </button>
            </div>
          </div>
        </div>

                 {/* Deals Section */}
         <div ref={recommendedRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">DEALS.</h2>
          <div className="flex space-x-4 overflow-x-auto">
            {/* Card 1 */}
            <div 
              className="bg-white rounded-lg shadow w-56 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setCurrentDeal({
                  type: "deal",
                  limit: 7,
                  freeCount: 1,
                  title: "BUY ANY 7 DONUTS AND GET 1 CLASSIC FREE"
                });
                setShowDonutModal(true);
              }}
            >
                              <img
                  src="/Deals/BuyAny7Get1Free.jpg"
                  alt="Deal 1"
                  className="w-full h-32 object-cover rounded-t-lg"
                />
              <div className="p-3">
                <div className="font-bold text-xs mb-1">BUY ANY 7 DONUTS AND GET 1 CLASSIC FREE</div>
                <div className="text-xs text-gray-500 mb-2">Pick any 7 and enjoy a classic donut on us — sweet, and simple!</div>
                <div className="font-bold text-sm">From Rs.1,050/-</div>
              </div>
            </div>
            {/* Card 2 */}
            <div 
              className="bg-white rounded-lg shadow w-56 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setCurrentDeal({
                  type: "deal",
                  limit: 12,
                  freeCount: 2,
                  title: "BUY ANY 12 DONUTS AND GET 2 CLASSIC FREE"
                });
                setShowDonutModal(true);
              }}
            >
              <img
                src="/Deals/BuyAny12Get2Free.jpg"
                alt="Deal 2"
                className="w-full h-32 object-cover rounded-t-lg"
              />
              <div className="p-3">
                <div className="font-bold text-xs mb-1">BUY ANY 12 DONUTS AND GET 2 CLASSIC FREE</div>
                <div className="text-xs text-gray-500 mb-2">Grab any 12 donuts and we'll add 2 classic favorites for free!</div>
                <div className="font-bold text-sm">From Rs.1,800/-</div>
              </div>
            </div>
          </div>
        </div>

         {/* Combos Section */}
         <div ref={combosRef} className="py-6">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">COMBOS.</h2>
           <div className="flex space-x-4 overflow-x-auto">
             {/* Combo Card 1 */}
             <div 
               className="bg-white rounded-lg shadow w-56 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow"
               onClick={() => {
                 setCurrentDeal({
                   type: "combo",
                   limit: 4,
                   freeCount: 0,
                   title: "BOX OF 4"
                 });
                 setShowDonutModal(true);
               }}
             >
               <img
                 src="/Combos/Box4.jpg"
                 alt="Box of 4"
                 className="w-full h-32 object-cover rounded-t-lg"
               />
               <div className="p-3">
                 <div className="font-bold text-xs mb-1">BOX OF 4</div>
                 <div className="text-xs text-gray-500 mb-2">Pick any 4 donuts of your choice — perfect for sharing (or not).</div>
                 <div className="font-bold text-sm">From Rs.600/-</div>
               </div>
             </div>
             {/* Combo Card 2 */}
             <div 
               className="bg-white rounded-lg shadow w-56 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow"
               onClick={() => {
                 setCurrentDeal({
                   type: "combo",
                   limit: 8,
                   freeCount: 0,
                   title: "BOX OF 8"
                 });
                 setShowDonutModal(true);
               }}
             >
               <img
                 src="/Combos/Box8.jpg"
                 alt="Box of 8"
                 className="w-full h-32 object-cover rounded-t-lg"
               />
               <div className="p-3">
                 <div className="font-bold text-xs mb-1">BOX OF 8</div>
                 <div className="text-xs text-gray-500 mb-2">Choose 8 of your favorites — more donuts, more happiness.</div>
                 <div className="font-bold text-sm">From Rs.1,200/-</div>
               </div>
             </div>
             {/* Combo Card 3 */}
             <div 
               className="bg-white rounded-lg shadow w-56 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow"
               onClick={() => {
                 setCurrentDeal({
                   type: "combo",
                   limit: 12,
                   freeCount: 0,
                   title: "BOX OF 12"
                 });
                 setShowDonutModal(true);
               }}
             >
               <img
                 src="/Combos/Box12.jpg"
                 alt="Box of 12"
                 className="w-full h-32 object-cover rounded-t-lg"
               />
               <div className="p-3">
                 <div className="font-bold text-xs mb-1">BOX OF 12</div>
                 <div className="text-xs text-gray-500 mb-2">Go all in with a dozen — ideal for parties, gifts, or cravings.</div>
                 <div className="font-bold text-sm">From Rs.1,800/-</div>
               </div>
             </div>
           </div>
         </div>

          {/* Donuts Section */}
         <div ref={donutsRef} className="py-12">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">DONUTS.</h2>
           
                       {/* Classic Donuts */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">CLASSIC</h3>
              <div className="grid grid-cols-2 gap-4">
                              {/* Classic Donut Card 1 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Classic/Plain Chocolate.png"
                   alt="Plain Chocolate"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">PLAIN CHOCOLATE</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Rich, smooth chocolate glaze on a fluffy ring — a timeless classic for chocoholics.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.150/-</div>
                     <SmartCounter 
                       itemName="Plain Chocolate" 
                       price={150} 
                       image="/Classic/Plain Chocolate.png"
                       cart={cart}
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemByName}
                     />
                   </div>
                 </div>
               </div>

                                                              {/* Classic Donut Card 2 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Classic/Plain Glaze.png"
                    alt="Plain Glaze"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">PLAIN GLAZED</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Light, airy, and melt-in-your-mouth sweet. Simplicity never tasted this good.</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.150/-</div>
                      <SmartCounter 
                        itemName="Plain Glaze" 
                        price={150} 
                        image="/Classic/Plain Glaze.png"
                        cart={cart}
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemByName}
                      />
                    </div>
                  </div>
                </div>

                {/* Classic Donut Card 3 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Classic/Strawberry Sprinkle.png"
                    alt="Strawberry Sprinkle"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">Strawberry Sprinkle</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Sweet strawberry icing topped with rainbow sprinkles — fun, fruity, and festive in every bite!</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.150/-</div>
                      <SmartCounter 
                        itemName="Strawberry Sprinkle" 
                        price={150} 
                        image="/Classic/Strawberry Sprinkle.png"
                        cart={cart}
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemByName}
                      />
                    </div>
                  </div>
                </div>
             </div>
           </div>

                       {/* Delights Donuts */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">DELIGHTS</h3>
              <div className="grid grid-cols-2 gap-4">
                                               {/* Delights Donut Card 1 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Delights/After Eight.png"
                    alt="After Eight"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">AFTER EIGHT</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Minty chocolate glaze drizzled with a fresh green swirl — the perfect post-dinner indulgence.</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.240/-</div>
                      <SmartCounter 
                        itemName="After Eight" 
                        price={240} 
                        image="/Delights/After Eight.png"
                        cart={cart}
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemFromCart}
                      />
                    </div>
                  </div>
                </div>

                                {/* Delights Donut Card 2 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Delights/Coconut Truffle.png"
                    alt="Coconut Truffle"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">COCONUT TRUFFLE</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Coated in coconut glaze, topped with toasted flakes and a truffle center.</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.240/-</div>
                      <SmartCounter 
                        itemName="Coconut Truffle" 
                        price={240} 
                        image="/Delights/Coconut Truffle.png"
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemFromCart}
                      />
                    </div>
                  </div>
                </div>

                                {/* Delights Donut Card 3 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Delights/Cookies and Cream.png"
                    alt="Cookies and Cream"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">COOKIES AND CREAM</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Loaded with crushed Oreos and finished with a white glaze — every bite is cookies and bliss.</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.240/-</div>
                      <SmartCounter 
                        itemName="Cookies and Cream" 
                        price={240} 
                        image="/Delights/Cookies and Cream.png"
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemFromCart}
                      />
                    </div>
                  </div>
                </div>

                                {/* Delights Donut Card 4 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Delights/Ferrero Rocher.png"
                    alt="Ferrero Rocher"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">FERRERO ROCHER</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">A luxurious blend of hazelnut and chocolate topped with crunchy bits.</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.240/-</div>
                      <SmartCounter 
                        itemName="Ferrero Rocher" 
                        price={240} 
                        image="/Delights/Ferrero Rocher.png"
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemFromCart}
                      />
                    </div>
                  </div>
                </div>

                {/* Delights Donut Card 5 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Delights/Nutella Bon.png"
                    alt="Nutella Bon"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">NUTELLA BON</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Luscious Nutella glaze with a chocolate swirl — rich, smooth, and utterly irresistible.</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.240/-</div>
                      <SmartCounter 
                        itemName="Nutella Bon" 
                        price={240} 
                        image="/Delights/Nutella Bon.png"
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemFromCart}
                      />
                    </div>
                  </div>
                </div>

                {/* Delights Donut Card 6 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Delights/Oreo Chocolate.png"
                    alt="Oreo Chocolate"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">OREO CHOCOLATE</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Dusted in Oreo crumbs, striped with chocolate drizzle — a dark delight for cookie lovers.</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.240/-</div>
                      <SmartCounter 
                        itemName="Oreo Chocolate" 
                        price={240} 
                        image="/Delights/Oreo Chocolate.png"
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemFromCart}
                      />
                    </div>
                  </div>
                </div>

                {/* Delights Donut Card 7 */}
                <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                  <img
                    src="/Delights/Salted Caramel.png"
                    alt="Salted Caramel"
                    className="w-full h-48 object-contain flex-shrink-0"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">SALTED CARAMEL</div>
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Golden caramel glaze with a hint of sea salt — sticky, sweet, and dangerously good.</div>
                    <div className="flex flex-col space-y-2 mt-auto">
                      <div className="font-bold text-base">Rs.240/-</div>
                      <SmartCounter 
                        itemName="Salted Caramel" 
                        price={240} 
                        image="/Delights/Salted Caramel.png"
                        onAddToCart={addItemToCart}
                        onRemoveFromCart={removeItemFromCart}
                      />
                    </div>
                  </div>
                </div>
             </div>
           </div>

           {/* Premium Donuts */}
           <div className="mb-8">
             <h3 className="text-lg font-bold text-gray-800 mb-4">PREMIUM</h3>
             <div className="grid grid-cols-2 gap-4">
               {/* Premium Donut Card 1 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Bagelish.png"
                   alt="Bagelish"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">BAGELISH</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Savory cream cheese donut topped with dill, zaatar, and white sesame seeds.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Bagelish" 
                       price={300} 
                       image="/Premium/Bagelish.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 2 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Bavarian Cream.png"
                   alt="Bavarian Cream"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">BAVARIAN CREAM</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Vanilla-salt cream filled donut topped with rich chocolate, cream, and butter.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Bavarian Cream" 
                       price={300} 
                       image="/Premium/Bavarian Cream.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 3 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/benoffee.png"
                   alt="Benoffee"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">BENOFFEE</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Fluffy dulce de leche cream with banana caramel glaze and biscuit crumb topping.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Benoffee" 
                       price={300} 
                       image="/Premium/Benoffee.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 4 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Blueberry Cream Cheese.png"
                   alt="Blueberry Cream Cheese"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">BLUEBERRY CREAM CHEESE</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Filled with white chocolate and cheese, topped with tangy blueberry and candy crumbs.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Blueberry Cream Cheese" 
                       price={300} 
                       image="/Premium/Blueberry Cream Cheese.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 5 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Choco Fudge.png"
                   alt="Choco Fudge"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">CHOCO FUDGE</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Creamy dark chocolate filled donut topped with milk, powder, and chocolate shavings.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Choco Fudge" 
                       price={300} 
                       image="/Premium/Choco Fudge.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 6 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Chocolate Malt.png"
                   alt="Chocolate Malt"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">CHOCOLATE MALT</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Malt-filled donut with dark chocolate, cream, and biscuit crumb topping.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Chocolate Malt" 
                       price={300} 
                       image="/Premium/Chocolate Malt.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 7 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Hazelnutty.png"
                   alt="Hazelnutty"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">HAZELNUTTY</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Filled with rich Nutella and topped with icing sugar for hazelnut chocolate bliss.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Hazelnutty" 
                       price={300} 
                       image="/Premium/Hazelnutty.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 8 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Jammie.png"
                   alt="Jammie"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">JAMMIE</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Filled with cream diplomat and berry jam, topped with a dusting of icing sugar.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Jammie" 
                       price={300} 
                       image="/Premium/Jammie.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 9 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Jelly Donut.png"
                   alt="Jelly Donut"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">JELLY DONUT</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Asoft, fluffy donut, filled with strawberry jelly and topped with icing sugar.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Jelly Donut" 
                       price={300} 
                       image="/Premium/Jelly Donut.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 10 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Kinder Bueno.png"
                   alt="Kinder Bueno"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">KINDER BUENO</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Long donut filled with hazelnut white chocolate cream, Bueno glaze, and chocolate drizzle.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Kinder Bueno" 
                       price={300} 
                       image="/Premium/Kinder Bueno.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 11 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Lemon Curd.png"
                   alt="Lemon Curd"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">LEMON CURD</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Tangy lemon cream filling topped with white chocolate and crunchy biscuit crumble.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Lemon Curd" 
                       price={300} 
                       image="/Premium/Lemon Curd.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 12 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Lotus.png"
                   alt="Lotus"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">LOTUS</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Filled with lotus spread, white chocolate, and cream, topped with crushed lotus and swirls.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Lotus" 
                       price={300} 
                       image="/Premium/Lotus.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 13 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Peanut Caramel.png"
                   alt="Peanut Caramel"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">PEANUT CARAMEL</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Salted caramel glaze with caramelized peanut bits, topped with chocolate drizzle.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Peanut Caramel" 
                       price={300} 
                       image="/Premium/Peanut Caramel.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 14 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Pistachio Delight.png"
                   alt="Pistachio Delight"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">PISTACHIO DELIGHT</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Brioche donut with whipped pistachio cream, chocolate ganache, pistachio glaze, and piping.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Pistachio Delight" 
                       price={300} 
                       image="/Premium/Pistachio Delight.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>

               {/* Premium Donut Card 15 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
                 <img
                   src="/Premium/Rabri.png"
                   alt="Rabri"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">RABRI</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Filled with creamy rabri, topped with cardamom glaze, nuts, and rose petals.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Rabri" 
                       price={300} 
                       image="/Premium/Rabri.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div> 

               {/* Premium Donut Card 16 */}
               <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>    
                 <img
                   src="/Premium/Red velvet Donut.png"
                   alt="Red Velvet"
                   className="w-full h-48 object-contain flex-shrink-0"
                 />
                 <div className="p-4 flex flex-col flex-1">
                   <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">RED VELVET</div>
                   <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Brioche donut topped with cream cheese frosting, red velvet cake, and icing sugar.</div>
                   <div className="flex flex-col space-y-2 mt-auto">
                     <div className="font-bold text-base">Rs.300/-</div>
                     <SmartCounter 
                       itemName="Red Velvet" 
                       price={300} 
                       image="/Premium/Red Velvet.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>

                 {/* Sandwiches Section */}
         <div ref={sandwichesRef} className="py-12">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">SANDWICHES.</h2>
           <div className="grid grid-cols-2 gap-4">
             {/* Sandwich Card 1 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Sandwiches/Chicken Malai Boti.png"
                 alt="Chicken Malai Boti"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">CHICKEN MALAI BOTI</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Smoked BBQ boti, Cream, Black olives, Good as is or Grilled.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Chicken Malai Boti" 
                       price={450} 
                       image="/Sandwiches/Chicken Malai Boti.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                 </div>
               </div>
             </div>

             {/* Sandwich Card 2 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Sandwiches/Club Sandwich.png"
                 alt="Club Sandwich"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">Club Sandwich</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Triple-layer sandwich with boiled egg, grilled chicken, lettuce, and cucumber.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Club Sandwich" 
                       price={450} 
                       image="/Sandwiches/Club Sandwich.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                 </div>
               </div>
             </div>

             {/* Sandwich Card 3 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Sandwiches/Cubano.png"
                 alt="Cubano"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">CUBANO</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Chicken pastrami, lettuce, and cheese — best enjoyed grilled.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Cubano" 
                       price={450} 
                       image="/Sandwiches/Cubano.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                 </div>
               </div>
             </div>
           </div>
         </div>

                 {/* Salads Section */}
         <div ref={saladsRef} className="py-12">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">SALADS.</h2>
           <div className="grid grid-cols-2 gap-4">
             {/* Salad Card 1 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Salads/Mediteranian Salad.png"
                 alt="Mediteranian Salad"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">MEDITERANIAN SALAD</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Fresh Mediterranean salad with cucumbers, tomatoes, olives, and a zesty dressing.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Mediteranian Salad" 
                       price={350} 
                       image="/Salads/Mediteranian Salad.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                 </div>
               </div>
             </div>

             {/* Salad Card 2 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Salads/Asian Satay Salad.png"
                 alt="Asian Satay Salad"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">ASIAN SATAY SALAD</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">MCrisp salad with grilled chicken, peanuts, veggies, and tangy satay dressing.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Asian Satay Salad" 
                       price={350} 
                       image="/Salads/Asian Satay Salad.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                 </div>
               </div>
             </div>
           </div>
         </div>

                 {/* Drinks Section */}
         <div ref={drinksRef} className="py-12">
           <h2 className="text-xl font-extrabold tracking-tight mb-4">DRINKS.</h2>
           <div className="grid grid-cols-2 gap-4">
             {/* Drink Card 1 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Drinks/Drink.png"
                 alt="Peach Iced Tea"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">PEACH ICED TEA</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Sweetened with peach syrup, steeped in tea leaves, the perfect drink for a refreshing experience.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Peach Iced Tea" 
                       price={180} 
                       image="/Drinks/Peach Iced Tea.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemByName}
                     />
                 </div>
               </div>
             </div>

             {/* Drink Card 2 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Drinks/Drink.png"
                 alt="Mix Tea Karak"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">MIX TEA KARAK</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Strong black tea with full-cream milk and sugar — rich, sweet, and bold.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Mix Tea Karak" 
                       price={180} 
                       image="/Drinks/Mix Tea Karak.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemByName}
                     />
                 </div>
               </div>
             </div>

             {/* Drink Card 3 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Drinks/Drink.png"
                 alt="Earl Grey Tea"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">EARL GREY TEA</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Smooth black tea with bergamot — light, citrusy, and perfectly fragrant.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Earl Grey Tea" 
                       price={180} 
                       image="/Drinks/Earl Grey Tea.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemByName}
                     />
                 </div>
               </div>
             </div>

             {/* Drink Card 4 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Drinks/Drink.png"
                 alt="Masala Tea"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">MASALA TEA</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Bold and creamy chai with strong tea, milk, sugar, and traditional spices.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                  <SmartCounter 
                       itemName="Masala Tea" 
                       price={180} 
                       image="/Drinks/Masala Tea.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                 </div>
               </div>
             </div>

             {/* Drink Card 5 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Drinks/Drink.png"
                 alt="Rose Hibiscus"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">ROSE HIBISCUS</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Light pink tea with rose and hibiscus, floral with a slight tang.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Rose Hibiscus" 
                       price={180} 
                       image="/Drinks/Rose Hibiscus.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                 </div>
               </div>
             </div>

             {/* Drink Card 6 */}
             <div className="bg-cover bg-center rounded-lg shadow-lg overflow-hidden flex flex-col h-full" style={{ backgroundImage: 'url(/Background.png)' }}>
               <img
                 src="/Drinks/Drink.png"
                 alt="Cold Chocolate Milk"
                 className="w-full h-48 object-contain flex-shrink-0"
               />
               <div className="p-4 flex flex-col flex-1">
                 <div className="font-bold text-base mb-2 min-h-[2.5rem] line-clamp-2">COLD CHOCOLATE MILK</div>
                 <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">Thick full-cream chocolate milk, ice cold, rich, and perfectly creamy.</div>
                 <div className="flex flex-col space-y-2 mt-auto">
                   <div className="font-bold text-base">Rs.450/-</div>
                                        <SmartCounter 
                       itemName="Cold Chocolate Milk" 
                       price={180} 
                       image="/Drinks/Cold Chocolate Milk.png"
                       onAddToCart={addItemToCart}
                       onRemoveFromCart={removeItemFromCart}
                     />
                 </div>
               </div>
             </div>
           </div>
         </div>
      </div>

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
                <div className="grid grid-cols-2 gap-4">
                  {donutOptions.map((donut, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow min-h-[180px] flex flex-col"
                    >
                      <img
                        src={donut.image}
                        alt={donut.name}
                        className="w-full h-20 object-contain mb-2 flex-shrink-0"
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
                        className="w-16 h-16 object-contain mr-3"
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
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div 
                className="flex items-center justify-between p-4 border-b flex-shrink-0 relative overflow-hidden"
                style={{
                  backgroundImage: 'url(/public/Background.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center top',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Background overlay for better text readability */}
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                
                {/* Header content */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <h2 className="text-xl font-bold text-white">Your Cart</h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  >
                    <X size={24} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Cart Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {Object.keys(cart).length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const userGroups = getCartItemsByUser();
                      return Object.entries(userGroups).map(([user, items]) => (
                        <div key={user} className="space-y-3">
                          {/* User Title */}
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${user === userId ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            <h3 className="font-semibold text-sm">
                              {user === userId ? 'Your Items' : `User ${user}`}
                            </h3>
                          </div>
                          
                          {/* Items for this user */}
                          {items.map((item, index) => (
                            <div key={`${user}-${index}`} className="flex items-center justify-between p-3 border rounded-lg ml-4">
                              <div className="flex items-center space-x-3">
                                {item.image && (
                                  <img src={item.image} alt={item.name} className="w-12 h-12 object-contain" />
                                )}
                                <div>
                                  <h3 className="font-semibold">{item.name}</h3>
                                  <p className="text-sm text-gray-600">Rs.{item.price}/-</p>
                                  {item.details && (
                                    <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => removeItemFromCart(`${item.name}_${item.addedBy}`)}
                                  disabled={!canModifyItem(`${item.name}_${item.addedBy}`)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    canModifyItem(`${item.name}_${item.addedBy}`)
                                      ? 'bg-gray-200 hover:bg-gray-300'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="font-semibold w-8 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => addItemToCart(item.name, item.price, item.image, item.details)}
                                  disabled={!canModifyItem(`${item.name}_${item.addedBy}`)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    canModifyItem(`${item.name}_${item.addedBy}`)
                                      ? 'bg-gray-200 hover:bg-gray-300'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {Object.keys(cart).length > 0 && (
                <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                  {/* Tip Selection */}
                  <div className="mb-3">
                    <h3 className="text-xs font-semibold mb-2">Add a Tip</h3>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 5, 10, 15].map((tip) => (
                        <button
                          key={tip}
                          onClick={() => {
                            setSelectedTip(tip);
                            localStorage.setItem(getTipKey(), tip.toString());
                          }}
                          className={`relative p-2 rounded border border-black transition-all duration-300 ${
                            selectedTip === tip
                              ? 'bg-black text-white'
                              : 'bg-gray-100 text-black hover:bg-gray-200'
                          }`}
                        >
                          <span className="font-semibold text-xs">{tip}%</span>
                          {selectedTip !== tip && (
                            <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-black transform rotate-45"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Bill Summary */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>Rs.{getCartTotal()}/-</span>
                    </div>
                    {selectedTip > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Tip ({selectedTip}%):</span>
                        <span>Rs.{getTipAmount()}/-</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>Rs.{getTotalWithTip()}/-</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        // Lock session if in collaborative mode
                        if (isCollaborativeSession) {
                          lockSession();
                        }
                        // Show payment method popup for Pay Fully
                        setShowPaymentMethod(true);
                      }}
                      className="bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                    >
                      Pay Fully
                    </button>
                    <button
                      onClick={() => {
                        // Show split options popup
                        setShowSplitOptions(true);
                      }}
                      className="bg-white text-black border-2 border-black py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Split Bill
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
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
                      window.location.href = `/Crusteez/Table${tableNumber}/checkout/split-bill`;
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
                      window.location.href = `/Crusteez/Table${tableNumber}/checkout/split-bill`;
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
                      window.location.href = `/Crusteez/Table${tableNumber}/checkout/split-bill`;
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

      {/* Payment Method Popup for Pay Fully */}
      <AnimatePresence>
        {showPaymentMethod && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setShowPaymentMethod(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-2xl w-full max-w-xs mx-4 overflow-hidden max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold">Payment</h2>
                <button
                  onClick={() => setShowPaymentMethod(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-3 space-y-3">
                {/* Bill Amount */}
                <div className="text-center">
                  <div className="bg-gray-800 rounded-lg shadow-2xl p-3 inline-block min-w-[180px] border-2 border-gray-700 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                    <div className="text-lg font-bold text-white mb-1 drop-shadow-lg">
                      Rs.{getTotalWithTip().toFixed(2)}/-
                    </div>
                    <div className="text-xs text-gray-300 drop-shadow-md">
                      Total Amount
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-lg shadow-sm p-3 relative overflow-hidden">
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: 'url(/Background.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  ></div>
                  <div className="relative z-10">
                    <h3 className="text-sm font-semibold mb-2 text-center">PAYMENT METHOD</h3>
                    
                    {/* Digital Wallets */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button 
                        onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'easypaisa' ? null : 'easypaisa')}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          selectedPaymentMethod === 'easypaisa'
                            ? 'border-pink-500 bg-white shadow-lg transform scale-105'
                            : 'border-black bg-white hover:border-pink-300 hover:shadow-md'
                        } ${selectedPaymentMethod !== 'easypaisa' ? '!border-black' : ''}`}
                      >
                        <div className="flex items-center justify-center">
                          <img src="/Easypaisa.png" alt="easypaisa" className="h-6 w-auto" />
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'jazzcash' ? null : 'jazzcash')}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          selectedPaymentMethod === 'jazzcash'
                            ? 'border-pink-500 bg-white shadow-lg transform scale-105'
                            : 'border-black bg-white hover:border-pink-300 hover:shadow-md'
                        } ${selectedPaymentMethod !== 'jazzcash' ? '!border-black' : ''}`}
                      >
                        <div className="flex items-center justify-center">
                          <img src="/JazzCash.png" alt="JazzCash" className="h-12 w-auto" />
                        </div>
                      </button>
                    </div>
                    
                    {/* Card Logos */}
                    <div className="flex justify-center space-x-2 mb-3">
                      <img src="/Visa.png" alt="VISA" className="h-8 w-auto" />
                      <img src="/MasterCard.png" alt="MasterCard" className="h-8 w-auto" />
                      <img src="/UnionPay.png" alt="UnionPay" className="h-8 w-auto" />
                    </div>
                    
                    {/* Card Details Form */}
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                        <input
                          type="text"
                          placeholder="1234 1234 1234 1234"
                          maxLength={19}
                          className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
                          <input
                            type="text"
                            placeholder="123"
                            maxLength={4}
                            className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Button */}
                <button
                  onClick={() => {
                    console.log('Processing payment for:', getTotalWithTip());
                    clearCart();
                    if (isCollaborativeSession) {
                      endCollaborativeSession();
                    }
                    setShowPaymentMethod(false);
                    setShowCart(false);
                  }}
                  className="w-full bg-white text-black border-2 border-black py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>PAY Rs.{getTotalWithTip().toFixed(2)}/-</span>
                </button>
                
                {/* Security Message */}
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>100% secure payments powered by TableTap</span>
                </div>
              </div>
            </motion.div>
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