import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableConfig {
  id: number;
  name: string;
  isActive: boolean;
}

export default function Admin() {
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing table configuration from localStorage
  useEffect(() => {
    const savedTables = localStorage.getItem('tableConfig');
    if (savedTables) {
      setTables(JSON.parse(savedTables));
    } else {
      // Default configuration with 10 tables
      const defaultTables = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Table${i + 1}`,
        isActive: true
      }));
      setTables(defaultTables);
      localStorage.setItem('tableConfig', JSON.stringify(defaultTables));
    }
    setIsLoading(false);
  }, []);



  // Toggle table active status
  const toggleTableStatus = (id: number) => {
    const updatedTables = tables.map(table => 
      table.id === id ? { ...table, isActive: !table.isActive } : table
    );
    setTables(updatedTables);
    localStorage.setItem('tableConfig', JSON.stringify(updatedTables));
    // Reload page to update routing
    window.location.reload();
  };

  // Copy URL to clipboard
  const copyUrl = (tableId: number) => {
    const url = `${window.location.origin}/Crusteez/Table${tableId}/home`;
    navigator.clipboard.writeText(url);
  };

  // Open URL in new tab
  const openUrl = (tableId: number) => {
    const url = `${window.location.origin}/Crusteez/Table${tableId}/home`;
    window.open(url, '_blank');
  };

  // Add a new table
  const addTable = () => {
    const newId = Math.max(...tables.map(t => t.id), 0) + 1;
    const newTable: TableConfig = {
      id: newId,
      name: `Table${newId}`,
      isActive: true
    };
    const updatedTables = [...tables, newTable];
    setTables(updatedTables);
    localStorage.setItem('tableConfig', JSON.stringify(updatedTables));
    // Reload page to update routing
    window.location.reload();
  };

  // Remove a table
  const removeTable = (id: number) => {
    const updatedTables = tables.filter(table => table.id !== id);
    setTables(updatedTables);
    localStorage.setItem('tableConfig', JSON.stringify(updatedTables));
    // Reload page to update routing
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50"
    >
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
            <h1 className="text-lg font-bold">Table Management</h1>
          </div>

        </div>
      </div>

      <div className="px-4 py-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-xl font-bold text-gray-900">{tables.length}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-xl font-bold text-green-600">
              {tables.filter(t => t.isActive).length}
            </div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-xl font-bold text-red-600">
              {tables.filter(t => !t.isActive).length}
            </div>
            <div className="text-xs text-gray-600">Inactive</div>
          </div>
        </div>

        {/* Table List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Tables</h2>
              <Button 
                onClick={addTable}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm"
              >
                <Plus size={14} className="mr-1" />
                Add
              </Button>
            </div>
          </div>

          <div className="divide-y">
            {tables.map((table) => (
              <div key={table.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={table.isActive}
                      onChange={() => toggleTableStatus(table.id)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className={`font-medium text-sm ${table.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {table.name}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mb-3 break-all">
                  {window.location.origin}/Crusteez/{table.name}/home
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => copyUrl(table.id)}
                    size="sm"
                    variant="outline"
                    className="text-gray-600 hover:text-gray-900 flex-1 py-2 text-xs"
                  >
                    <Copy size={12} className="mr-1" />
                    Copy
                  </Button>
                  
                  <Button
                    onClick={() => openUrl(table.id)}
                    size="sm"
                    variant="outline"
                    className="text-blue-600 hover:text-blue-700 flex-1 py-2 text-xs"
                  >
                    <ExternalLink size={12} className="mr-1" />
                    Open
                  </Button>
                  
                  <Button
                    onClick={() => removeTable(table.id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 flex-1 py-2 text-xs"
                  >
                    <Trash2 size={12} className="mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How to Use</h3>
          <div className="text-xs text-blue-800 space-y-1">
            <p>• <strong>Add:</strong> Creates a new table URL</p>
            <p>• <strong>Remove:</strong> Removes table from configuration</p>
            <p>• <strong>Toggle:</strong> Enable/disable tables</p>
            <p>• <strong>Copy:</strong> Copy URL to clipboard</p>
            <p>• <strong>Open:</strong> Open table page</p>
            <p className="mt-2 font-medium">Note: URL structure remains fixed as /Crusteez/TableX/home</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
