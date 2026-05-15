'use client';

import { Heart } from 'lucide-react';

export function AdminFooter() {
  const currentYear = new Date().getFullYear();
  const version = 'v1.0.0';

  return (
    <footer className="bg-white border-t border-gray-200 mt-8">
      <div className="px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Copyright */}
          <div className="text-xs text-gray-500">
            © {currentYear} FoodDelivery Admin Panel. All rights reserved.
          </div>

          {/* Made with love */}
          <div className="text-xs text-gray-500 flex items-center gap-1">
            Made with
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            by FoodDelivery Team
          </div>

          {/* Version */}
          <div className="text-xs text-gray-400">
            Version {version}
          </div>
        </div>
      </div>
    </footer>
  );
}