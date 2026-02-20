import React from 'react';

export default function Header() {
  return (
    <header className="mb-8 text-center">
      <div className="flex items-center justify-center mb-2">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69986966442e93bb8f52d310/2d6e79006_6671BlueandGrayLogo.png"
          alt="Whayland Logo"
          className="h-16 w-auto"
        />
      </div>
      <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Daily Construction Report</p>
    </header>
  );
}