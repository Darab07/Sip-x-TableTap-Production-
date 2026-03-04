import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Banknote, Check, ChevronRight, CreditCard, Info, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { getOrCreateUserID } from "@/lib/userID";

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  details?: string;
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
  items: CartItem[];
}

type PaymentMethod = "card" | "cash";
type CardChoice = "saved" | "new";

const userId = getOrCreateUserID();
const getStoredOrderKey = () => `lastOrder_${userId}`;

const SAVED_CARD = {
  label: "Saved card",
  last4: "4242",
  expiry: "08/28",
};

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [selectedTip, setSelectedTip] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [selectedCardChoice, setSelectedCardChoice] = useState<CardChoice>("saved");
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
    () => Object.values(cart).reduce((total, item) => total + item.price * item.quantity, 0),
    [cart],
  );
  const tipAmount = useMemo(() => Math.round((subtotal * selectedTip) / 100), [subtotal, selectedTip]);
  const gstAmount = useMemo(() => Math.round(subtotal * 0.05), [subtotal]);
  const serviceFee = useMemo(() => Math.round((subtotal + gstAmount) * 0.01), [subtotal, gstAmount]);
  const total = subtotal + tipAmount + gstAmount + serviceFee;
  const paymentLabel = selectedMethod === "cash" ? "Confirm cash payment" : "Pay by card";
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
    if (!/^\d{13,19}$/.test(cleanNumber)) return "Card number must be 13-19 digits";
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

  const handlePayment = () => {
    if (selectedMethod === "card" && selectedCardChoice === "new" && !validateCardForm()) {
      return;
    }

    const search = typeof window !== "undefined" ? window.location.search : "";

    if (selectedMethod === "card") {
      const orderData: StoredOrder = {
        orderNumber: (100 + Math.floor(Math.random() * 900)).toString(),
        total,
        subtotal,
        tipAmount,
        serviceFee,
        gstAmount,
        tableLabel,
        notes: localStorage.getItem(`orderNotes_${userId}`) || "",
        items: Object.values(cart),
      };

      localStorage.setItem(getStoredOrderKey(), JSON.stringify(orderData));
    }

    localStorage.removeItem(`cart_${userId}`);
    localStorage.removeItem(`selectedTip_${userId}`);
    localStorage.removeItem(`orderNotes_${userId}`);
    localStorage.removeItem("splitType");
    setLocation(`/menu${search}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#f3f2ef]"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
        <div className="flex items-center justify-between pb-8">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 heading-font">Your order</h1>
          <div className="w-10" />
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 heading-font">Pay securely</h2>
            <p className="mt-1 text-sm text-gray-500 subtext-font">
              All transactions are private and encrypted.
            </p>
          </div>

          <div className="space-y-3">
            <div
              className={`rounded-3xl border bg-white p-4 shadow-sm transition-colors ${
                selectedMethod === "card" ? "border-black" : "border-gray-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedMethod("card")}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-medium text-gray-900 heading-font">Pay by card</span>
                <div className="flex items-center gap-3">
                  <img src="/Visa.png" alt="Visa" className="h-5 w-auto" />
                  <img src="/MasterCard.png" alt="MasterCard" className="h-5 w-auto" />
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      selectedMethod === "card"
                        ? "border-black bg-black text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedMethod === "card" ? <Check size={14} /> : null}
                  </span>
                </div>
              </button>

              {selectedMethod === "card" ? (
                <div className="space-y-3 pt-4">
                  <div className="border-t border-gray-100" />
                  <div className="space-y-3">
                    <p className="text-base font-semibold text-gray-900 heading-font">Card details</p>

                    <button
                      type="button"
                      onClick={() => setSelectedCardChoice("saved")}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                        selectedCardChoice === "saved"
                          ? "border-black bg-gray-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 heading-font">{SAVED_CARD.label}</p>
                          <p className="text-sm text-gray-500 subtext-font">
                            •••• {SAVED_CARD.last4} · Expires {SAVED_CARD.expiry}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          selectedCardChoice === "saved"
                            ? "border-black bg-black text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedCardChoice === "saved" ? <Check size={14} /> : null}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCardChoice("new")}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                        selectedCardChoice === "new"
                          ? "border-black bg-gray-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 heading-font">Use a different card</p>
                        <p className="text-sm text-gray-500 subtext-font">Enter your card information manually.</p>
                      </div>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          selectedCardChoice === "new"
                            ? "border-black bg-black text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedCardChoice === "new" ? <Check size={14} /> : null}
                      </span>
                    </button>

                    {selectedCardChoice === "new" ? (
                      <div className="space-y-3 pt-2">
                        <div>
                          <input
                            type="text"
                            value={cardholderName}
                            onChange={(event) => {
                              setCardholderName(event.target.value);
                              if (errors.cardholderName) {
                                setErrors((prev) => ({ ...prev, cardholderName: undefined }));
                              }
                            }}
                            placeholder="Cardholder name"
                            className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${
                              errors.cardholderName ? "border-red-500" : "border-gray-200 focus:border-black"
                            }`}
                          />
                          {errors.cardholderName ? (
                            <p className="mt-1 text-xs text-red-500 subtext-font">{errors.cardholderName}</p>
                          ) : null}
                        </div>

                        <div>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(event) => {
                              setCardNumber(formatCardNumber(event.target.value));
                              if (errors.cardNumber) {
                                setErrors((prev) => ({ ...prev, cardNumber: undefined }));
                              }
                            }}
                            placeholder="Card number"
                            className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${
                              errors.cardNumber ? "border-red-500" : "border-gray-200 focus:border-black"
                            }`}
                          />
                          {errors.cardNumber ? (
                            <p className="mt-1 text-xs text-red-500 subtext-font">{errors.cardNumber}</p>
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
                                  setErrors((prev) => ({ ...prev, expiration: undefined }));
                                }
                              }}
                              placeholder="MM/YY"
                              className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${
                                errors.expiration ? "border-red-500" : "border-gray-200 focus:border-black"
                              }`}
                            />
                            {errors.expiration ? (
                              <p className="mt-1 text-xs text-red-500 subtext-font">{errors.expiration}</p>
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
                                errors.cvc ? "border-red-500" : "border-gray-200 focus:border-black"
                              }`}
                            />
                            {errors.cvc ? (
                              <p className="mt-1 text-xs text-red-500 subtext-font">{errors.cvc}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setSelectedMethod("cash")}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                selectedMethod === "cash"
                  ? "border-black bg-white shadow-sm"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span className="text-base font-medium text-gray-900 heading-font">Pay by cash</span>
              <div className="flex items-center gap-3">
                <Banknote size={18} className="text-gray-700" />
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                    selectedMethod === "cash"
                      ? "border-black bg-black text-white"
                      : "border-gray-300"
                  }`}
                >
                  {selectedMethod === "cash" ? <Check size={14} /> : null}
                </span>
              </div>
            </button>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-white px-1 py-2 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                <span className="text-sm font-semibold">%</span>
              </div>
              <span className="text-base font-medium text-gray-900 heading-font">Add a promo code</span>
            </div>
            <ChevronRight size={18} className="text-gray-500" />
          </button>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="space-y-3 text-sm text-gray-600 subtext-font">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="text-gray-900">Rs.{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tips ({selectedTip}%)</span>
                <span className="text-gray-900">Rs.{tipAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  Service fee
                  <Info size={14} className="text-gray-400" />
                </span>
                <span className="text-gray-900">Rs.{serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>GST</span>
                <span className="text-gray-900">Rs.{gstAmount.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-3" />
              <div className="flex items-center justify-between text-base font-semibold text-gray-900 heading-font">
                <span>Total</span>
                <span>Rs.{total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={handlePayment}
            className="w-full rounded-full bg-black px-5 py-4 text-base font-semibold text-white heading-font transition-colors hover:bg-gray-900"
          >
            {paymentLabel}
          </button>

          <p className="mt-4 text-center text-xs text-gray-500 subtext-font">
            By continuing, I agree to the <span className="underline">User Terms</span> and{" "}
            <span className="underline">Privacy Policy</span>.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 subtext-font">
            <Lock size={12} />
            <span>Secure payments with TableTap</span>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4 text-center text-xs text-gray-400 subtext-font">
            {location.includes("split-bill") ? "Split checkout" : "Checkout"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
