import React from 'react';
import { HardHat } from 'lucide-react';

export default function Header() {
  return (
    <header className="mb-8 text-center">
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="bg-yellow-400 p-2 rounded-full">
          <HardHat className="w-8 h-8 text-gray-800" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Whayland</h1>
      </div>
      <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Daily Construction Report</p>
    </header>
  );
}