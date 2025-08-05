import { useState } from 'react';
import { Menu, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [customerName, setCustomerName] = useState('ALEX');
  const [restaurantName] = useState('Crusteez');
  const [categoryTag] = useState('Starter');

  const handleMenuToggle = () => {
    console.log('Toggle navigation menu');
  };

  const handleEarnPoints = () => {
    console.log('Navigate to rewards section');
  };

  const handleOrderNow = () => {
    console.log('Navigate to menu/order page');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Background Hero Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=1200')"
        }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      
      {/* Top Navigation Bar */}
      <div className="relative z-10 flex justify-end items-start p-4 pt-12">
        {/* Crusteez Logo */}
        <div className="w-12 h-12 flex items-center justify-center">
          <img 
            src="/attached_assets/ChatGPT_1754391471062.png" 
            alt="Crusteez Logo" 
            className="w-10 h-10 object-contain"
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
            Start your order —
          </p>
          <p className="text-white text-base font-normal opacity-90 leading-relaxed mb-8">
            everyone's invited.
          </p>
        </div>
      </div>
      
      {/* Bottom Info Section */}
      <div className="relative z-10 bg-white rounded-t-3xl mt-auto pt-6 px-6 pb-8">
        {/* Store Timings */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-black text-sm font-semibold mb-1">Store Timings:</h3>
            <p className="text-gray-600 text-xs">MONDAY - SATURDAY</p>
          </div>
          
          <div className="text-right">
            <p className="text-black text-sm font-semibold">DHA 2 Crusteez</p>
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
    </div>
  );
}
