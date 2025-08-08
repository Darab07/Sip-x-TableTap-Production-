import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Users, Receipt } from 'lucide-react';
import { useLocation } from 'wouter';

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  details?: string;
}

interface CheckoutProps {
  paymentType: 'pay-fully' | 'split-bill';
}

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const [cart, setCart] = useState<{[key: string]: CartItem}>({});
  const [selectedTip, setSelectedTip] = useState(5);
  const [splitCount, setSplitCount] = useState(2);
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'by-item'>('equal');
  const [customAmounts, setCustomAmounts] = useState<{[key: number]: number}>({});
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [tablematesCount, setTablematesCount] = useState(2);

  // Form validation states
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiration, setExpiration] = useState('');
  const [cvc, setCvc] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Load cart and tip from localStorage using user-specific keys
    const userId = sessionStorage.getItem('tempUserId') || 'default';
    const savedCart = localStorage.getItem(`cart_${userId}`);
    const savedTip = localStorage.getItem(`selectedTip_${userId}`);
    
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    if (savedTip) {
      setSelectedTip(parseInt(savedTip));
    }
  }, []);

  // Validation functions
  const validateCardholderName = (name: string) => {
    if (!name.trim()) return 'Cardholder name is required';
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s]+$/.test(name)) return 'Name can only contain letters and spaces';
    return '';
  };

  const validateCardNumber = (number: string) => {
    const cleanNumber = number.replace(/\s/g, '');
    if (!cleanNumber) return 'Card number is required';
    if (!/^\d{13,19}$/.test(cleanNumber)) return 'Card number must be 13-19 digits';
    return '';
  };

  const validateExpiration = (exp: string) => {
    if (!exp) return 'Expiration date is required';
    if (!/^\d{2}\/\d{2}$/.test(exp)) return 'Use MM/YY format';
    
    const [month, year] = exp.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    if (parseInt(month) < 1 || parseInt(month) > 12) return 'Invalid month';
    if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      return 'Card has expired';
    }
    return '';
  };

  const validateCvc = (cvc: string) => {
    if (!cvc) return 'CVC is required';
    if (!/^\d{3,4}$/.test(cvc)) return 'CVC must be 3-4 digits';
    return '';
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    newErrors.cardholderName = validateCardholderName(cardholderName);
    newErrors.cardNumber = validateCardNumber(cardNumber);
    newErrors.expiration = validateExpiration(expiration);
    newErrors.cvc = validateCvc(cvc);
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\s/g, '');
    const groups = cleanValue.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleanValue;
  };

  const formatExpiration = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length >= 2) {
      return cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4);
    }
    return cleanValue;
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTipAmount = () => {
    const subtotal = getCartTotal();
    return (subtotal * selectedTip) / 100;
  };

  const getTotalWithTip = () => {
    return getCartTotal() + getTipAmount();
  };

  const getSplitAmount = () => {
    const total = getTotalWithTip();
    
    switch (splitType) {
      case 'equal':
        return total / splitCount;
      case 'custom':
        const customTotal = Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
        return customTotal / splitCount; // This will be used for validation
      case 'by-item':
        // For by-item, we'll calculate based on selected items per person
        return total / splitCount; // Simplified for now
      default:
        return total / splitCount;
    }
  };

  const getCustomSplitAmounts = () => {
    const total = getTotalWithTip();
    const amounts: {[key: number]: number} = {};
    
    for (let i = 1; i <= splitCount; i++) {
      amounts[i] = customAmounts[i] || 0;
    }
    
    return amounts;
  };

  const getCustomSplitTotal = () => {
    return Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
  };

  const handleBack = () => {
    setLocation('/Crusteez/Table7/home');
  };

  const handlePayment = () => {
    // Validate form before processing payment
    if (!validateForm()) {
      return;
    }

    // Here you would implement the actual payment logic
    console.log('Processing payment:', {
      type: location.includes('pay-fully') ? 'Pay Fully' : 'Split Bill',
      cart,
      tip: selectedTip,
      total: getTotalWithTip(),
      splitAmount: location.includes('split-bill') ? getSplitAmount() : null,
      splitCount: location.includes('split-bill') ? splitCount : null,
      cardholderName,
      cardNumber: cardNumber.replace(/\s/g, ''),
      expiration,
      cvc
    });
    
    // Clear cart and redirect
    const userId = sessionStorage.getItem('tempUserId') || 'default';
    localStorage.removeItem(`cart_${userId}`);
    localStorage.removeItem(`selectedTip_${userId}`);
    setLocation('/Crusteez/Table7/home');
  };

  const isPayFully = location.includes('pay-fully');
  const isSplitBill = location.includes('split-bill');

  // Check if this is an equal split from localStorage
  const savedSplitType = localStorage.getItem('splitType');
  const isEqualSplit = savedSplitType === 'equal';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50"
    >
      {/* Header */}
      <div className="bg-white shadow-sm border-b relative overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/Background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
        <div className="flex items-center justify-between px-6 py-4 relative z-10">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center justify-center flex-1">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-xl font-bold">
            {isPayFully ? 'Pay Fully' : ''}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Equal Split Summary */}
        {isSplitBill && isEqualSplit ? (
          <div className="space-y-6">
            {/* Amount Display */}
            <div className="text-center">
              <div className="bg-gray-800 rounded-lg shadow-2xl p-8 inline-block min-w-[300px] border-2 border-gray-700 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                  Rs.{getTotalWithTip().toFixed(2)}/-
                </div>
                <div className="text-sm text-gray-300 drop-shadow-md">
                  Amount to share
                </div>
              </div>
            </div>

            {/* Split Details */}
            <div className="space-y-4">
              {/* Tablemates */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <Users size={16} className="text-pink-600" />
                  </div>
                  <span className="font-medium">Tablemates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setTablematesCount(Math.max(1, tablematesCount - 1))}
                    className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 hover:bg-pink-200 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{tablematesCount}</span>
                  <button
                    onClick={() => setTablematesCount(Math.min(10, tablematesCount + 1))}
                    className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 hover:bg-pink-200 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-gray-600 text-sm">people</span>
                </div>
              </div>

              {/* Parts to pay */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-pink-600 rounded-full"></div>
                  </div>
                  <span className="font-medium">Parts to pay</span>
                </div>
                <span className="text-gray-600">Equal split</span>
              </div>

              {/* You're paying */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">You're paying</span>
                <span className="text-lg font-bold text-green-600">
                  Rs.{(getTotalWithTip() / tablematesCount).toFixed(2)}/-
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 relative overflow-hidden">
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
                <h3 className="text-lg font-semibold mb-4 text-center">PAYMENT METHOD</h3>
                
                {/* Digital Wallets */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPaymentMethod('easypaisa')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'easypaisa'
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <img src="/Easypaisa.png" alt="easypaisa" className="h-6 w-auto" />
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('jazzcash')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'jazzcash'
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <img src="/JazzCash.png" alt="JazzCash" className="h-10 w-auto" />
                    </div>
                  </button>
                </div>
                
                {/* Card Logos */}
                <div className="flex justify-center space-x-4 mb-6">
                  <img src="/Visa.png" alt="VISA" className="h-12 w-auto" />
                  <img src="/MasterCard.png" alt="MasterCard" className="h-12 w-auto" />
                  <img src="/UnionPay.png" alt="UnionPay" className="h-12 w-auto" />
                </div>
                
                {/* Card Details Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardholderName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCardholderName(value);
                        if (value) {
                          setErrors(prev => ({ ...prev, cardholderName: validateCardholderName(value) }));
                        }
                      }}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                        errors.cardholderName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.cardholderName && (
                      <p className="text-red-500 text-sm mt-1">{errors.cardholderName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 1234 1234 1234"
                      value={cardNumber}
                      onChange={(e) => {
                        const value = formatCardNumber(e.target.value);
                        setCardNumber(value);
                        if (value) {
                          setErrors(prev => ({ ...prev, cardNumber: validateCardNumber(value) }));
                        }
                      }}
                      maxLength={19}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                        errors.cardNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.cardNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiration}
                        onChange={(e) => {
                          const value = formatExpiration(e.target.value);
                          setExpiration(value);
                          if (value) {
                            setErrors(prev => ({ ...prev, expiration: validateExpiration(value) }));
                          }
                        }}
                        maxLength={5}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                          errors.expiration ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.expiration && (
                        <p className="text-red-500 text-sm mt-1">{errors.expiration}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cvc}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setCvc(value);
                          if (value) {
                            setErrors(prev => ({ ...prev, cvc: validateCvc(value) }));
                          }
                        }}
                        maxLength={4}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                          errors.cvc ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.cvc && (
                        <p className="text-red-500 text-sm mt-1">{errors.cvc}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // Validate form before processing payment
                  if (!validateForm()) {
                    return;
                  }
                  
                  console.log('Confirming equal split payment:', {
                    splitCount,
                    totalAmount: getTotalWithTip(),
                    splitAmount: getSplitAmount(),
                    cardholderName,
                    cardNumber: cardNumber.replace(/\s/g, ''),
                    expiration,
                    cvc
                  });
                  localStorage.removeItem('cart');
                  localStorage.removeItem('selectedTip');
                  localStorage.removeItem('splitType');
                  window.location.href = '/Crusteez/Table7/home';
                }}
                disabled={Object.values(errors).some(error => error !== '')}
                className={`flex-1 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center space-x-2 ${
                  Object.values(errors).some(error => error !== '')
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-black border-2 border-black hover:bg-gray-50'
                }`}
              >
                <CreditCard size={20} />
                <span>PAY Rs.{(getTotalWithTip() / tablematesCount).toFixed(2)}/-</span>
              </button>
            </div>
            
            {/* Security Message */}
            <div className="flex items-center justify-center space-x-2 mt-6 text-sm text-gray-600">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span>100% secure payments powered by TableTap</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Type Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                {isPayFully ? (
                  <CreditCard size={24} className="text-green-600" />
                ) : (
                  <Users size={24} className="text-blue-600" />
                )}
                <h2 className="text-2xl font-bold">
                  {isPayFully ? 'Pay Full Amount' : 'Split Bill'}
                </h2>
              </div>
              <p className="text-gray-600">
                {isPayFully 
                  ? 'Complete your payment for the full order amount.'
                  : `Split the bill between ${splitCount} people.`
                }
              </p>
            </div>

            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Left to Pay</span>
                  <span className="font-bold text-lg">Rs.{getTotalWithTip().toFixed(2)}/-</span>
                </div>
                {isSplitBill && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Your Share</span>
                    <span className="font-bold text-lg text-green-600">
                      Rs.{(getTotalWithTip() / (isEqualSplit ? tablematesCount : splitCount)).toFixed(2)}/-
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Receipt size={20} className="mr-2" />
                Order Summary
              </h3>
              
              <div className="space-y-3 mb-4">
                {Object.values(cart).map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      {item.details && (
                        <div className="text-sm text-gray-500">{item.details}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">Rs.{item.price}/-</div>
                      <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs.{getCartTotal()}/-</span>
                </div>
                {selectedTip > 0 && (
                  <div className="flex justify-between">
                    <span>Tip ({selectedTip}%):</span>
                    <span>Rs.{getTipAmount()}/-</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>Rs.{getTotalWithTip()}/-</span>
                </div>
              </div>
            </div>

            {/* Split Bill Options */}
            {isSplitBill && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Split Options</h3>
                <div className="space-y-6">
                  {/* Number of People */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of People
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((count) => (
                        <button
                          key={count}
                          onClick={() => setSplitCount(count)}
                          className={`p-3 rounded-lg border transition-colors ${
                            splitCount === count
                              ? 'bg-black text-white border-black'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Split Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Split Method
                    </label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSplitType('equal')}
                        className={`w-full p-3 rounded-lg border transition-colors text-left ${
                          splitType === 'equal'
                            ? 'bg-black text-white border-black'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">Divide Equally</div>
                        <div className="text-sm opacity-75">
                          Split the total amount equally between {splitCount} people
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setSplitType('custom')}
                        className={`w-full p-3 rounded-lg border transition-colors text-left ${
                          splitType === 'custom'
                            ? 'bg-black text-white border-black'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">Custom Amount</div>
                        <div className="text-sm opacity-75">
                          Set custom amounts for each person
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setSplitType('by-item')}
                        className={`w-full p-3 rounded-lg border transition-colors text-left ${
                          splitType === 'by-item'
                            ? 'bg-black text-white border-black'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">By Item</div>
                        <div className="text-sm opacity-75">
                          Assign specific items to each person
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Custom Amount Inputs */}
                  {splitType === 'custom' && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">
                        Set amounts for each person:
                      </div>
                      {Array.from({ length: splitCount }, (_, i) => i + 1).map((person) => (
                        <div key={person} className="flex items-center space-x-3">
                          <span className="text-sm font-medium w-20">Person {person}:</span>
                          <input
                            type="number"
                            value={customAmounts[person] || ''}
                            onChange={(e) => {
                              const amount = parseFloat(e.target.value) || 0;
                              setCustomAmounts(prev => ({
                                ...prev,
                                [person]: amount
                              }));
                            }}
                            placeholder="0.00"
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          />
                          <span className="text-sm text-gray-500">Rs.</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total entered:</span>
                        <span className={`font-bold ${getCustomSplitTotal() === getTotalWithTip() ? 'text-green-600' : 'text-red-600'}`}>
                          Rs.{getCustomSplitTotal().toFixed(2)}/-
                        </span>
                      </div>
                      {getCustomSplitTotal() !== getTotalWithTip() && (
                        <div className="text-sm text-red-600">
                          Total must equal Rs.{getTotalWithTip().toFixed(2)}/-
                        </div>
                      )}
                    </div>
                  )}

                  {/* By Item Selection */}
                  {splitType === 'by-item' && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">
                        Assign items to each person:
                      </div>
                      {Array.from({ length: splitCount }, (_, i) => i + 1).map((person) => (
                        <div key={person} className="border border-gray-200 rounded-lg p-3">
                          <div className="font-medium mb-2">Person {person}</div>
                          <div className="text-sm text-gray-500">
                            Select items for this person...
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {splitType === 'equal' && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Each person pays:</span>
                        <span className="text-xl font-bold text-green-600">
                          Rs.{getSplitAmount().toFixed(2)}/-
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 relative overflow-hidden">
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
                <h3 className="text-lg font-semibold mb-4 text-center">PAYMENT METHOD</h3>
                
                {/* Digital Wallets */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPaymentMethod('easypaisa')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'easypaisa'
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <img src="/Easypaisa.png" alt="easypaisa" className="h-6 w-auto" />
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('jazzcash')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'jazzcash'
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <img src="/JazzCash.png" alt="JazzCash" className="h-10 w-auto" />
                    </div>
                  </button>
                </div>
                
                {/* Card Logos */}
                <div className="flex justify-center space-x-4 mb-6">
                  <img src="/Visa.png" alt="VISA" className="h-8 w-auto" />
                  <img src="/MasterCard.png" alt="MasterCard" className="h-8 w-auto" />
                  <img src="/UnionPay.png" alt="UnionPay" className="h-8 w-auto" />
                </div>
                
                {/* Card Details Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardholderName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCardholderName(value);
                        if (value) {
                          setErrors(prev => ({ ...prev, cardholderName: validateCardholderName(value) }));
                        }
                      }}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                        errors.cardholderName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.cardholderName && (
                      <p className="text-red-500 text-sm mt-1">{errors.cardholderName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 1234 1234 1234"
                      value={cardNumber}
                      onChange={(e) => {
                        const value = formatCardNumber(e.target.value);
                        setCardNumber(value);
                        if (value) {
                          setErrors(prev => ({ ...prev, cardNumber: validateCardNumber(value) }));
                        }
                      }}
                      maxLength={19}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                        errors.cardNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.cardNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiration}
                        onChange={(e) => {
                          const value = formatExpiration(e.target.value);
                          setExpiration(value);
                          if (value) {
                            setErrors(prev => ({ ...prev, expiration: validateExpiration(value) }));
                          }
                        }}
                        maxLength={5}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                          errors.expiration ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.expiration && (
                        <p className="text-red-500 text-sm mt-1">{errors.expiration}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cvc}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setCvc(value);
                          if (value) {
                            setErrors(prev => ({ ...prev, cvc: validateCvc(value) }));
                          }
                        }}
                        maxLength={4}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                          errors.cvc ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.cvc && (
                        <p className="text-red-500 text-sm mt-1">{errors.cvc}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePayment}
                disabled={
                  isSplitBill && splitType === 'custom' && getCustomSplitTotal() !== getTotalWithTip() ||
                  Object.values(errors).some(error => error !== '')
                }
                className={`flex-1 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center space-x-2 ${
                  isSplitBill && splitType === 'custom' && getCustomSplitTotal() !== getTotalWithTip() ||
                  Object.values(errors).some(error => error !== '')
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-black border-2 border-black hover:bg-gray-50'
                }`}
              >
                <CreditCard size={20} />
                <span>
                  {isPayFully 
                    ? `PAY Rs.${getTotalWithTip().toFixed(2)}/-`
                    : splitType === 'custom' 
                      ? `PAY CUSTOM AMOUNT`
                      : `PAY Rs.${getSplitAmount().toFixed(2)}/-`
                  }
                </span>
              </button>
            </div>
            
            {/* Security Message */}
            <div className="flex items-center justify-center space-x-2 mt-6 text-sm text-gray-600">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span>100% secure payments powered by TableTap</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
