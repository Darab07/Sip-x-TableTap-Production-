import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTableUrl, useTableConfig } from '@/hooks/useTableConfig';

export default function Admin() {
  const {
    tables,
    addTable,
    removeTable,
    toggleTableActive,
  } = useTableConfig();

  const buildTableUrl = (tableId: number) => {
    const table = tables.find((entry) => entry.id === tableId);
    if (!table) {
      return null;
    }

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${getTableUrl(table)}`;
  };

  const copyUrl = (tableId: number) => {
    const url = buildTableUrl(tableId);
    if (!url) {
      return;
    }
    navigator.clipboard.writeText(url);
  };

  const openUrl = (tableId: number) => {
    const url = buildTableUrl(tableId);
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
                    <Button
                      size="icon"
                      variant="outline"
                      className={`w-5 h-5 p-0 rounded ${table.isActive ? 'text-green-600 border-green-200' : 'text-gray-400 border-gray-200'}`}
                      onClick={() => toggleTableActive(table.id)}
                      aria-label={table.isActive ? 'Deactivate table' : 'Activate table'}
                    >
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </Button>
                    <span className={`font-medium text-sm ${table.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {table.name}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mb-3 break-all">
                  {buildTableUrl(table.id) || 'Unavailable'}
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
            <p className="mt-2 font-medium">Note: URLs now use /menu?table=TableX</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
