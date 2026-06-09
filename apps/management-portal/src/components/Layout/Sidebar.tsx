import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  BarChart3, 
  Activity, 
  LifeBuoy, 
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'Billing & Plans', href: '/billing', icon: CreditCard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Platform Health', href: '/platform', icon: Activity },
  { name: 'Support', href: '/support', icon: LifeBuoy },
];

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <img src="/src/assets/branding/icon.svg" alt="TrackOwl" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold tracking-tight text-slate-900">TrackOwl<span className="text-primary">Admin</span></span>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-slate-50 text-primary" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-slate-400")} />
                      {item.name}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                SA
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">Super Admin</span>
                <span className="text-xs text-slate-500">admin@trackowl.io</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
