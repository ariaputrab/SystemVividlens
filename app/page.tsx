'use client';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Clock, 
  FileText, 
  MessageSquare, 
  Calendar, 
  Image as ImageIcon, 
  Users, 
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import DashboardStats from '../components/DashboardStats';
import BookingManager from '../components/BookingManager';
import JadwalManager from '../components/JadwalManager'; 
import InvoiceManager from '../components/InvoiceManager'; 
import ChatFGManager from '../components/ChatFGManager';
import CalendarManager from '../components/CalendarManager';
import Laporan from '../components/Laporan';
import DataKlien from '../components/DataKlien';

const menuConfig: Record<string, any> = {
  'Dashboard': LayoutDashboard,
  'Booking': CalendarDays,
  'Jadwal': Clock,
  'Invoice': FileText,
  'Chat FG': MessageSquare,
  'Calendar': Calendar,
  'Gallery': ImageIcon,
  'Data Klien': Users,
  'Laporan': BarChart3,
};

export default function VividLensERP() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menu = ['Dashboard', 'Booking', 'Jadwal', 'Invoice', 'Chat FG', 'Calendar', 'Gallery', 'Data Klien', 'Laporan'];

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <DashboardStats />;
      case 'Booking': return <BookingManager />;
      case 'Jadwal': return <JadwalManager />;
      case 'Invoice': return <InvoiceManager />;
      case 'Chat FG': return <ChatFGManager />;
      case 'Calendar': return <CalendarManager />;
      case 'Laporan': return <Laporan />;
      case 'Data Klien': return <DataKlien />;
      
      case 'Gallery': 
        return (
          <div className="w-full h-[calc(100vh-140px)] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <iframe 
              src="https://vividlens-gallery2026.vercel.app/admin" 
              className="w-full h-full"
              title="Gallery Portal"
            />
          </div>
        );
      
      default: return <div className="p-10 text-slate-500">Konten {activeTab} sedang dalam pengembangan...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#F0F7FF] relative overflow-hidden">
      {/* Overlay hitam transparan saat menu HP dibuka */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar (Desktop: Hover-to-expand, Mobile: Drawer slide-in) */}
      <aside className={`group peer fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-[#ADE1FB]/30 p-3 transition-all duration-300 ease-in-out shadow-sm overflow-hidden ${
        isMobileMenuOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 w-20 hover:w-64'
      }`}>
        
        {/* Header / Logo */}
        <div className="flex h-20 items-center justify-between px-1 mb-2 whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-3 w-full">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#266CA9] text-white font-bold text-lg shadow-sm">
              V
            </div>
            <span className={`text-xl font-bold text-[#266CA9] tracking-tight transition-opacity duration-300 ${
              isMobileMenuOpen ? 'opacity-150' : 'opacity-0 group-hover:opacity-100'
            }`}>
              VividLens
            </span>
          </div>
          {/* Tombol close khusus HP */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {menu.map((item) => {
            const Icon = menuConfig[item] || LayoutDashboard;
            const isActive = activeTab === item;

            return (
              <button 
                key={item} 
                onClick={() => {
                  setActiveTab(item);
                  setIsMobileMenuOpen(false); // Tutup menu di HP saat diklik
                }}
                className={`w-full flex items-center gap-3 px-1.5 py-1.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive 
                    ? 'text-white' 
                    : 'text-[#0F2573] hover:bg-[#ADE1FB]/20 hover:text-[#266CA9]'
                }`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all shadow-sm ${
                  isActive ? 'bg-[#266CA9] text-white' : 'bg-transparent text-[#0F2573]'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`transition-opacity duration-300 ${
                  isMobileMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                } ${isActive ? 'text-[#0F2573] font-bold' : ''}`}>
                  {item}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pl-20 transition-all duration-300 ease-in-out w-full">
        <header className="sticky top-0 z-20 py-4 px-6 lg:px-10 bg-[#F0F7FF]/80 backdrop-blur-sm flex items-center justify-between border-b border-[#ADE1FB]/20 lg:border-none">
          <div className="flex items-center gap-4">
            {/* Tombol Hamburger untuk memunculkan menu di HP */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-white border border-[#ADE1FB]/40 text-[#266CA9] shadow-xs active:scale-95 transition"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-lg text-[#0F2573]">{activeTab}</h1>
          </div>
        </header>
        <div className="p-4 lg:px-10 lg:pb-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}