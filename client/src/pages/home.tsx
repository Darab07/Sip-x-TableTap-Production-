import { useState } from 'react';
import { Menu, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [customerName, setCustomerName] = useState('ALEX');
  const [restaurantName] = useState('TableTap Kitchen');
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
      <div className="relative z-10 flex justify-between items-center p-4 pt-12">
        {/* Hamburger Menu */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMenuToggle}
          className="w-8 h-8 hover:bg-white/10 transition-colors duration-200"
        >
          <Menu className="w-6 h-6 text-white" />
        </Button>
        
        {/* Earn Button */}
        <Button
          onClick={handleEarnPoints}
          className="bg-earn-green hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
        >
          Earn 3₵
        </Button>
      </div>
      
      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6">
        <div className="max-w-sm">
          <h1 className="text-white text-4xl md:text-5xl font-bold leading-tight mb-4">
            HEY, {customerName}.
          </h1>
          
          <p className="text-white text-base font-normal opacity-90 leading-relaxed mb-2">
            Introducing our
          </p>
          <p className="text-white text-base font-normal opacity-90 leading-relaxed mb-8">
            new spring menu.
          </p>
        </div>
      </div>
      
      {/* Bottom Info Section */}
      <div className="relative z-10 bg-white rounded-t-3xl mt-auto pt-6 px-6 pb-8">
        {/* Restaurant Categories */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center">
              <div className="w-3 h-1.5 bg-white rounded-sm" />
            </div>
            <span className="text-black text-sm font-medium">Honest People</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-earn-green rounded-full flex items-center justify-center">
              <div className="w-3 h-1.5 bg-white rounded-sm" />
            </div>
            <span className="text-black text-sm font-medium">{categoryTag}</span>
          </div>
        </div>
        
        {/* Order Button */}
        <Button 
          onClick={handleOrderNow}
          className="w-full bg-black hover:bg-gray-800 active:bg-gray-900 text-white py-4 rounded-2xl font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          <span>Order now</span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
