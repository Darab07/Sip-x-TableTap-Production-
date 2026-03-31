import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Info, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { getOrCreateUserID } from "@/lib/userID";
import {
  ensurePushSubscription,
  startServerOrderPushTracking,
} from "@/lib/push-notifications";
import { placeOrder } from "@/lib/tabletap-supabase-api";
import { getDeviceFingerprint } from "@/lib/tabletap-api";

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  details?: string;
  menuItemId?: string;
}

interface StoredOrder {
  orderNumber: string;
  total: number;
  subtotal: number;
  tipAmount: number;
  serviceFee: number;
  gstAmount: number;
  tableLabel: string;
  notes: string;
  status: "placed" | "confirmed" | "preparing" | "served";
  statusHistory: Array<{
    status: string;
    timestamp: number;
    message: string;
  }>;
  items: CartItem[];
}

const userId = getOrCreateUserID();
const getStoredOrderKey = () => `lastOrder_${userId}`;

type CardChoice = "saved" | "debit" | "jazzcash" | "easypaisa";

const SAVED_CARD = {
  label: "4242 ****",
  last4: "4242",
  expiry: "08/28",
};

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [selectedTip, setSelectedTip] = useState(0);
  const [selectedCardChoice, setSelectedCardChoice] =
    useState<CardChoice>("saved");
  const [showNewCardForm, setShowNewCardForm] = useState(false);
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

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${userId}`);
    const savedTip = localStorage.getItem(`selectedTip_${userId}`);

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    if (savedTip) {
      setSelectedTip(parseInt(savedTip, 10));
    }
  }, []);

  const subtotal = useMemo(
    () =>
      Object.values(cart).reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      ),
    [cart],
  );
  const tipAmount = useMemo(
    () => Math.round((subtotal * selectedTip) / 100),
    [subtotal, selectedTip],
  );
  const gstAmount = useMemo(() => Math.round(subtotal * 0.05), [subtotal]);
  const serviceFee = useMemo(
    () => Math.round((subtotal + gstAmount) * 0.01),
    [subtotal, gstAmount],
  );
  const total = subtotal + tipAmount + gstAmount + serviceFee;
  const paymentLabel =
    selectedCardChoice === "saved"
      ? "Pay with saved card"
      : selectedCardChoice === "debit"
        ? "Pay with debit card"
        : selectedCardChoice === "jazzcash"
          ? "Pay with JazzCash"
          : "Pay with Easypaisa";
  const tableLabel = useMemo(() => {
    if (typeof window === "undefined") return "Table 1";
    const params = new URLSearchParams(window.location.search);
    const table = params.get("table");
    if (!table) return "Table 1";
    const numberMatch = table.match(/(\d+)/);
    return `Table ${numberMatch ? numberMatch[1] : table}`;
  }, []);

  const validateCardholderName = (name: string) => {
    if (!name.trim()) return "Cardholder name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    return "";
  };

  const validateCardNumber = (number: string) => {
    const cleanNumber = number.replace(/\s/g, "");
    if (!cleanNumber) return "Card number is required";
    if (!/^\d{13,19}$/.test(cleanNumber))
      return "Card number must be 13-19 digits";
    return "";
  };

  const validateExpiration = (value: string) => {
    if (!value) return "Expiry is required";
    if (!/^\d{2}\/\d{2}$/.test(value)) return "Use MM/YY format";
    return "";
  };

  const validateCvc = (value: string) => {
    if (!value) return "CVC is required";
    if (!/^\d{3,4}$/.test(value)) return "CVC must be 3-4 digits";
    return "";
  };

  const validateCardForm = () => {
    const nextErrors = {
      cardholderName: validateCardholderName(cardholderName),
      cardNumber: validateCardNumber(cardNumber),
      expiration: validateExpiration(expiration),
      cvc: validateCvc(cvc),
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 19);
    const groups = cleanValue.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleanValue;
  };

  const formatExpiration = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 4);
    if (cleanValue.length <= 2) return cleanValue;
    return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2)}`;
  };

  const handleBack = () => {
    setLocation("/menu");
  };

  const handlePayment = async () => {
    if (selectedCardChoice === "debit" && !validateCardForm()) {
      return;
    }

    const search = typeof window !== "undefined" ? window.location.search : "";

    const tableNumberMatch = tableLabel.match(/(\d+)/);
    const tableNumber = tableNumberMatch ? Number(tableNumberMatch[1]) : 1;
    const notes = localStorage.getItem(`orderNotes_${userId}`) || "";
    const cartItems = Object.values(cart);
    const deviceFingerprint = getDeviceFingerprint();

    let orderData: StoredOrder;
    try {
      const placed = await placeOrder({
        tableNumber,
        deviceFingerprint,
        notes,
        subtotal,
        total,
        tipAmount,
        serviceFee,
        gstAmount,
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          details: item.details,
        })),
      });

      orderData = {
        orderNumber: placed.order.orderNumber,
        total: placed.order.total,
        subtotal: placed.order.subtotal,
        tipAmount: placed.order.tipAmount,
        serviceFee: placed.order.serviceFee,
        gstAmount: placed.order.gstAmount,
        tableLabel: placed.order.tableLabel,
        notes: placed.order.notes,
        status: "placed",
        statusHistory: [
          {
            status: "placed",
            timestamp: Date.now(),
            message: "Order has been placed successfully",
          },
        ],
        items: placed.order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          details: item.details,
        })),
      };
    } catch (error) {
      console.error("Order placement failed:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to place order right now. Please try again.",
      );
      return;
    }

    localStorage.setItem(getStoredOrderKey(), JSON.stringify(orderData));

    localStorage.removeItem(`cart_${userId}`);
    localStorage.removeItem(`selectedTip_${userId}`);
    localStorage.removeItem(`orderNotes_${userId}`);
    localStorage.removeItem("splitType");

    const event = new CustomEvent("orderPlaced", { detail: orderData });
    window.dispatchEvent(event);

    try {
      const pushResult = await ensurePushSubscription(userId);
      if (pushResult.subscribed) {
        await startServerOrderPushTracking({
          userId,
          orderNumber: orderData.orderNumber,
          tableLabel: orderData.tableLabel,
        });
        sessionStorage.setItem(
          "pushSetupMessage",
          "Order notifications are enabled for this device.",
        );
      } else if (pushResult.reason) {
        sessionStorage.setItem("pushSetupMessage", pushResult.reason);
      }
    } catch (error) {
      console.error("Push notifications could not be enabled:", error);
      sessionStorage.setItem(
        "pushSetupMessage",
        "Could not enable push notifications due to a setup error.",
      );
    }

    setLocation(`/menu${search}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#f3f2ef]"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5">
        <div className="flex items-center justify-between pb-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white/80"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 heading-font">
            Payment methods
          </h1>
          <div className="w-10" />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600 subtext-font">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900 heading-font">
                Rs.{subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 subtext-font">
              <span>Tips</span>
              <span className="font-semibold text-gray-900 heading-font">
                Rs.{tipAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 subtext-font">
              <span className="flex items-center gap-1">
                Platform fee
                <Info size={14} className="text-gray-500" />
              </span>
              <span className="font-semibold text-gray-900 heading-font">
                Rs.{serviceFee.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 subtext-font">
              <span className="flex items-center gap-1">
                Taxes
                <Info size={14} className="text-gray-500" />
              </span>
              <span className="font-semibold text-gray-900 heading-font">
                Rs.{gstAmount.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-gray-300 pt-4">
              <div className="flex items-center justify-between text-lg font-semibold text-gray-900 heading-font">
                <span>Total</span>
                <span>Rs.{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-full bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 heading-font"
            >
              Add promo code
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 heading-font">
              Pay with
            </h2>

            <button
              type="button"
              onClick={() => {
                setSelectedCardChoice("saved");
                setShowNewCardForm(false);
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                selectedCardChoice === "saved"
                  ? "border-black bg-white"
                  : "border-gray-300 bg-[#f5f5f4]"
              }`}
            >
              <p className="text-base font-semibold text-gray-900 heading-font">
                {SAVED_CARD.label}
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-[#1a3db7]">
                  VISA
                </span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                    selectedCardChoice === "saved"
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {selectedCardChoice === "saved" ? <Check size={15} /> : null}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCardChoice("debit");
                setShowNewCardForm(
                  (prev) => !prev || selectedCardChoice !== "debit",
                );
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                selectedCardChoice === "debit"
                  ? "border-black bg-white"
                  : "border-gray-300 bg-[#f5f5f4]"
              }`}
            >
              <p className="text-base font-semibold text-gray-900 heading-font">
                Debit Card
              </p>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-gray-100 px-1.5 py-1 text-[10px] font-semibold text-[#1a3db7]">
                  VISA
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-1 text-[10px] font-semibold text-[#cc4f00]">
                  MC
                </span>
                <span
                  className={`ml-1 flex h-7 w-7 items-center justify-center rounded-md border ${
                    selectedCardChoice === "debit"
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {selectedCardChoice === "debit" ? <Check size={15} /> : null}
                </span>
              </div>
            </button>

            {showNewCardForm && selectedCardChoice === "debit" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-gray-300 bg-white p-4 space-y-4"
              >
                <div>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(event) => {
                      setCardholderName(event.target.value);
                      if (errors.cardholderName) {
                        setErrors((prev) => ({
                          ...prev,
                          cardholderName: undefined,
                        }));
                      }
                    }}
                    placeholder="Cardholder name"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${
                      errors.cardholderName
                        ? "border-red-500"
                        : "border-gray-200 focus:border-black"
                    }`}
                  />
                  {errors.cardholderName ? (
                    <p className="mt-1 text-xs text-red-500 subtext-font">
                      {errors.cardholderName}
                    </p>
                  ) : null}
                </div>

                <div>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(event) => {
                      setCardNumber(formatCardNumber(event.target.value));
                      if (errors.cardNumber) {
                        setErrors((prev) => ({
                          ...prev,
                          cardNumber: undefined,
                        }));
                      }
                    }}
                    placeholder="Card number"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${
                      errors.cardNumber
                        ? "border-red-500"
                        : "border-gray-200 focus:border-black"
                    }`}
                  />
                  {errors.cardNumber ? (
                    <p className="mt-1 text-xs text-red-500 subtext-font">
                      {errors.cardNumber}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={expiration}
                      onChange={(event) => {
                        setExpiration(formatExpiration(event.target.value));
                        if (errors.expiration) {
                          setErrors((prev) => ({
                            ...prev,
                            expiration: undefined,
                          }));
                        }
                      }}
                      placeholder="MM/YY"
                      className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${
                        errors.expiration
                          ? "border-red-500"
                          : "border-gray-200 focus:border-black"
                      }`}
                    />
                    {errors.expiration ? (
                      <p className="mt-1 text-xs text-red-500 subtext-font">
                        {errors.expiration}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(event) => {
                        setCvc(event.target.value.replace(/\D/g, "").slice(0, 4));
                        if (errors.cvc) {
                          setErrors((prev) => ({ ...prev, cvc: undefined }));
                        }
                      }}
                      placeholder="CVC"
                      className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${
                        errors.cvc
                          ? "border-red-500"
                          : "border-gray-200 focus:border-black"
                      }`}
                    />
                    {errors.cvc ? (
                      <p className="mt-1 text-xs text-red-500 subtext-font">
                        {errors.cvc}
                      </p>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedCardChoice("jazzcash");
                setShowNewCardForm(false);
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                selectedCardChoice === "jazzcash"
                  ? "border-black bg-white"
                  : "border-gray-300 bg-[#f5f5f4]"
              }`}
            >
              <p className="text-base font-semibold text-gray-900 heading-font">
                JazzCash
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold text-[#b30059]">
                  JAZZCASH
                </span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                    selectedCardChoice === "jazzcash"
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {selectedCardChoice === "jazzcash" ? <Check size={15} /> : null}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCardChoice("easypaisa");
                setShowNewCardForm(false);
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                selectedCardChoice === "easypaisa"
                  ? "border-black bg-white"
                  : "border-gray-300 bg-[#f5f5f4]"
              }`}
            >
              <p className="text-base font-semibold text-gray-900 heading-font">
                Easypaisa
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold text-[#008a4a]">
                  EASYPAISA
                </span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                    selectedCardChoice === "easypaisa"
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {selectedCardChoice === "easypaisa" ? <Check size={15} /> : null}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-auto pt-7 pb-2">
          <button
            type="button"
            onClick={handlePayment}
            className="w-full rounded-full bg-black px-5 py-3.5 text-base font-semibold text-white heading-font transition-colors hover:bg-gray-900"
          >
            {paymentLabel}
          </button>

          <p className="mt-4 text-center text-xs text-gray-500 subtext-font">
            By continuing, I agree to the <span className="underline">User Terms</span> and{" "}
            <span className="underline">Privacy Policy</span>.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 subtext-font">
            <Lock size={12} />
            <span>secure payments with TableTap</span>
          </div>

          <div className="mt-6 border-t border-gray-300 pt-4 text-center text-xs text-gray-400 subtext-font">
            {location.includes("split-bill") ? "Split checkout" : "Checkout"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

