import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  const getTableIdentifier = () => {
    if (typeof window === "undefined") {
      return "Table1";
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("table") ?? "Table1";
  };

  const tableIdentifier = getTableIdentifier();
  const tableNumberMatch = tableIdentifier.match(/(\d+)/);
  const tableNumber = tableNumberMatch ? tableNumberMatch[1] : tableIdentifier.replace(/[^0-9]/g, "") || '1';
  const tableQuery = tableIdentifier ? `?table=${encodeURIComponent(tableIdentifier)}` : "";

  const handleOrderNow = () => {
    setLocation(`/sip/menu${tableQuery}`); // Use dynamic table identifier
  };

  return (
    <motion.div
      initial={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }} // Slide out to left
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-[100dvh] w-screen flex flex-col overflow-hidden"
    >
      {/* Background Hero Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/HeroImage.jpg')"
        }}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      {/* Top Navigation Bar */}
      <div className="relative z-10 flex justify-end items-start p-4 pt-12">
        {/* Sip Logo */}
        <div className="absolute top-5 right-2 z-20">
          <img
            src="/logo.png"
            alt="Sip Logo"
            className="w-[90px] h-[90px] object-contain"
          />
        </div>
      </div>
      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6">
        <div className="max-w-sm">
          <h1 className="text-white text-4xl md:text-5xl font-bold leading-tight mb-4">
            Crack Open <br />the Box Together
          </h1>
          
          <p className="text-white text-base font-normal opacity-90 leading-relaxed mb-2">
            Start your order -
          </p>
          <p className="text-white text-base font-normal opacity-90 leading-relaxed mb-8">
            everyone's invited.
          </p>
        </div>
      </div>
      {/* Bottom Info Section */}
      <div className="relative z-10 bg-white rounded-t-3xl mt-auto pt-6 px-6 pb-safe">
        {/* Store Timings */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-black text-sm font-semibold mb-1">Store Timings:</h3>
            <p className="text-gray-600 text-xs">MONDAY - SATURDAY</p>
            <p className="text-gray-800 text-xs mt-1">Table Number: {tableNumber}</p>
          </div>
          
          <div className="text-right">
            <p className="text-black text-sm font-semibold">F-8/3, Islamabad</p>
            <p className="text-gray-600 text-xs">8 AM - 1 AM</p>
          </div>
        </div>
        
        {/* Order Button */}
        <Button 
          onClick={handleOrderNow}
          className="w-full bg-black hover:bg-gray-800 active:bg-gray-900 text-white py-4 rounded-2xl font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg mb-2"
        >
          <span>Order Now</span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        
        {/* Powered by TableTap */}
        <p className="text-gray-400 text-xs text-left">Powered by TableTap</p>
      </div>
    </motion.div>
  );
}

