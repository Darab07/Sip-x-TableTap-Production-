import { useState } from 'react';
import { Menu, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FeaturedItem {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
}

export default function Home() {
  const [customerName, setCustomerName] = useState('ALEX');
  const [restaurantName] = useState('TableTap Kitchen');
  const [categoryTag] = useState('Starter');

  const featuredItems: FeaturedItem[] = [
    {
      id: '1',
      name: 'Signature Burger',
      description: 'With crispy fries and special sauce',
      price: '$12.99',
      image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'
    },
    {
      id: '2',
      name: 'Mediterranean Bowl',
      description: 'Fresh greens with feta and olives',
      price: '$9.99',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'
    },
    {
      id: '3',
      name: 'Truffle Pasta',
      description: 'Creamy alfredo with truffle oil',
      price: '$16.99',
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'
    }
  ];

  const handleMenuToggle = () => {
    console.log('Toggle navigation menu');
  };

  const handleEarnPoints = () => {
    console.log('Navigate to rewards section');
  };

  const handleOrderNow = () => {
    console.log('Navigate to menu/order page');
  };

  const handleAddItem = (itemId: string) => {
    console.log('Add item to cart:', itemId);
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Hero Section with Navigation */}
      <div className="relative h-screen flex flex-col">
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
            
            <p className="text-white text-lg md:text-xl font-medium opacity-90 leading-relaxed">
              Start your order. Everyone's invited.
            </p>
          </div>
        </div>
      </div>
      
      {/* Middle Section - Restaurant Info */}
      <div className="bg-white px-6 py-8 -mt-16 relative z-20 rounded-t-3xl shadow-xl">
        {/* Restaurant Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {restaurantName}
            </h2>
            <div className="w-4 h-4 bg-earn-green rounded-full flex items-center justify-center">
              <div className="w-2 h-1 bg-white rounded-sm" />
            </div>
          </div>
          
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            {categoryTag}
          </Badge>
        </div>
        
        {/* Additional Info Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">⭐</div>
            <div className="text-sm text-gray-600">4.8 Rating</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">🚗</div>
            <div className="text-sm text-gray-600">15-25 min</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">💳</div>
            <div className="text-sm text-gray-600">Free Delivery</div>
          </div>
        </div>
        
        {/* Featured Items Preview */}
        <div className="mb-20">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Items</h3>
          
          {featuredItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl mb-3 last:mb-0">
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
                <p className="text-sm font-semibold text-gray-900">{item.price}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAddItem(item.id)}
                className="text-earn-green hover:text-emerald-600 hover:bg-earn-green/10 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-2xl border-t border-gray-100 z-30">
        <Button 
          onClick={handleOrderNow}
          className="w-full bg-black hover:bg-gray-800 active:bg-gray-900 text-white py-4 rounded-2xl font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          <span>Order Now</span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
