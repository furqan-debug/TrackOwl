import { Menu } from 'lucide-react';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-16 glass border-b border-slate-200/60 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 transition-all duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
          <span>TrackOwl</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Management Portal</span>
        </div>
      </div>

    </header>
  );
}
