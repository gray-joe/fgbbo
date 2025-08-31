"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/hooks/useAuth";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const mainNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Predictions", href: "/predictions", icon: "🔮" },
  { name: "Leagues", href: "/leagues", icon: "🏆" },
  { name: "Results", href: "/results", icon: "📈" },
  { name: "Participants", href: "/participants", icon: "👥" },
];

       const adminNavItems: NavItem[] = [
         { name: "Manage Participants", href: "/admin/participants", icon: "⚙️" },
         { name: "Manage Results", href: "/admin/results", icon: "📊" },
         { name: "Week Locks", href: "/admin/week-locks", icon: "🔒" },
       ];

const bottomNavItems: NavItem[] = [
  { name: "Account", href: "/account", icon: "⚙️" },
];

export default function SideNav() {
  const pathname = usePathname();
  const { isAuthenticated, isAdmin, signOut: handleSignOut } = useAuth();

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-sm border-r border-white/30 shadow-xl z-50">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pastel-pink to-pastel-blue rounded-full flex items-center justify-center">
            <span className="text-xl">🍰</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">GBBO Fantasy</h1>
            <p className="text-xs text-gray-600">League</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.href)
                  ? "bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 font-semibold shadow-lg"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
              Admin
            </h3>
            <div className="space-y-2">
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-pastel-blue to-pastel-blue-dark text-gray-800 font-semibold shadow-lg"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-4 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.href)
                  ? "bg-gradient-to-r from-pastel-blue to-pastel-blue-dark text-gray-800 font-semibold shadow-lg"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
          
          {/* Auth Section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <span className="text-lg">🚪</span>
                <span className="font-medium">Sign Out</span>
              </button>
            ) : (
              <Link
                href="/"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <span className="text-lg">🔑</span>
                <span className="font-medium">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
