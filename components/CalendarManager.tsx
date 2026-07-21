'use client';
import { useSession, signIn } from "next-auth/react";

export default function CalendarManager() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="p-8 text-slate-500">Memeriksa sesi login...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Login diperlukan untuk melihat kalender</h2>
        <button 
          onClick={() => signIn('google')} 
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md"
        >
          Login dengan Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Kalender VividLens</h2>
        <span className="text-xs text-slate-400">Terhubung ke: {session?.user?.email}</span>
      </div>
      
      <div className="w-full h-[600px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <iframe 
          src="https://calendar.google.com/calendar/embed?src=vividlensgraduation%40gmail.com&ctz=Asia/Jakarta" 
          style={{ border: 0 }} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no"
        />
      </div>
    </div>
  );
}