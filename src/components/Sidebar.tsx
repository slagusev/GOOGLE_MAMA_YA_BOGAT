import React, { useState } from 'react';
import { 
  Dices, 
  BookOpen, 
  FileText, 
  Calculator, 
  Settings2, 
  LogOut, 
  Menu, 
  X, 
  Home, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isAdmin: boolean;
  logout: () => void;
  footerText: string;
  onCloseMobile?: () => void;
  calculatorUrl?: string;
  cardUrl?: string;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  isAdmin,
  logout,
  footerText,
  onCloseMobile,
  calculatorUrl,
  cardUrl
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'game', label: 'Игра', icon: Dices },
    { id: 'rules', label: 'Правила', icon: BookOpen },
    { id: 'card', label: 'Карточка', icon: FileText },
    { id: 'calculator', label: 'Калькулятор', icon: Calculator },
  ];

  return (
    <div className={`flex flex-col h-full bg-white border-r border-slate-100 shadow-sm transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} min-h-screen relative`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-50">
        {!collapsed && (
          <span className="font-extrabold text-lg tracking-tight bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
            <Dices className="h-5 w-5 text-emerald-600 animate-spin-slow" />
            <span>Мама, я богат!</span>
          </span>
        )}
        {collapsed && (
          <Dices className="h-6 w-6 text-emerald-600 mx-auto animate-spin-slow" />
        )}
        
        {/* Collapse Button (Desktop) */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all absolute -right-3 top-5 bg-white border border-slate-100 shadow-xs cursor-pointer"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Profile/Auth Status Indication */}
      {isAdmin && !collapsed && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-emerald-900 truncate">Администратор</p>
            <p className="text-[10px] text-emerald-600 truncate">Режим управления</p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          
          let isExternalLink = false;
          let externalUrl = "";
          if (item.id === 'calculator' && calculatorUrl) {
            isExternalLink = true;
            externalUrl = calculatorUrl;
          } else if (item.id === 'card' && cardUrl) {
            isExternalLink = true;
            externalUrl = cardUrl;
          }

          const className = `w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            isActive
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`;

          if (isExternalLink) {
            return (
              <a
                key={item.id}
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                }}
                className={className}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span>{item.label}</span>}
              </a>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={className}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}

        {/* Separator */}
        {isAdmin && <div className="my-4 border-t border-slate-100" />}

        {/* Admin Navigation */}
        {isAdmin && (
          <button
            onClick={() => {
              setCurrentTab('admin');
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              currentTab === 'admin'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Settings2 className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Админка</span>}
          </button>
        )}
      </nav>

      {/* Sidebar Footer with Logout & copyright */}
      <div className="p-4 border-t border-slate-50">
        {isAdmin && (
          <button
            onClick={() => {
              logout();
              setCurrentTab('home');
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer mb-2"
          >
            <LogOut size={16} />
            {!collapsed && <span>Выйти из админки</span>}
          </button>
        )}
        
        {!collapsed && (
          <p className="text-[10px] text-slate-400 leading-normal text-center select-none truncate max-w-full">
            {footerText || '© 2026 Мама, я богат!'}
          </p>
        )}
      </div>
    </div>
  );
}
