'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalBooking: 0, totalDP: 0, totalSisa: 0, totalOmset: 0,
    totalLunas: 0, totalDPBooking: 0,
    jadwalHariIni: [] as any[],
    chartData: [0, 0, 0, 0, 0, 0, 0] as number[]
  });

  // State untuk kontrol tampilan "Lihat Semua"
  const [showAll, setShowAll] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  useEffect(() => {
    async function fetchStats() {
      const hariIniStr = new Date().toISOString().split('T')[0];
      const { data: bookings } = await supabase.from('Booking').select('*');
      const { data: jadwal } = await supabase.from('jadwal').select('*');
      
      if (bookings && jadwal) {
        const totalOmset = bookings.reduce((acc, curr) => acc + (curr.total_price || curr.total_harga || 0), 0);
        const totalDP = bookings.reduce((acc, curr) => acc + (curr.dp_amount || curr.dp || 0), 0);
        const totalLunas = bookings.filter((b: any) => (b.status || '').toString().toLowerCase() === 'lunas').length;
        const totalDPBooking = bookings.filter((b: any) => (b.status || '').toString().toLowerCase() === 'dp').length;
        
        const jadwalList = jadwal
          .filter(j => j.tanggal === hariIniStr)
          .map(j => ({
            ...j,
            detailBooking: bookings.find(b => b.id === j.booking_id) || {}
          }))
          .sort((a, b) => a.jam.localeCompare(b.jam));

        // Kalkulasi Grafik 7 Hari Terakhir Berdasarkan Data Asli
        const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
        const today = new Date();

        bookings.forEach((item: any) => {
          const harga = Number(item.total_price || item.total_harga || 0);
          const tanggalItem = item.created_at || item.tanggal;
          
          if (tanggalItem) {
            const itemDate = new Date(tanggalItem);
            const diffTime = today.getTime() - itemDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < 7) {
              const index = 6 - diffDays; // Urut dari 6 hari lalu ke hari ini
              dailyTotals[index] += harga;
            }
          }
        });

        setStats({
          totalBooking: bookings.length,
          totalDP: totalDP,
          totalSisa: totalOmset - totalDP,
          totalOmset: totalOmset,
          totalLunas,
          totalDPBooking,
          jadwalHariIni: jadwalList,
          chartData: dailyTotals
        });
      }
    }
    fetchStats();
  }, []);

  // Logika menentukan jadwal yang tampil berdasarkan state showAll
  const displayedJadwal = showAll ? stats.jadwalHariIni : stats.jadwalHariIni.slice(0, 3);
  
  // Mencari nilai tertinggi untuk persentase tinggi batang grafik
  const maxChartValue = Math.max(...stats.chartData, 1);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-[#0F2573]">{getGreeting()}, Raihan 👋</h1>
        <p className="text-slate-500 mt-1">Semoga operasional VividLens hari ini berjalan lancar.</p>
      </section>

      {/* Bagian Jadwal Hari Ini - PADAT & MODERN */}
      <section className="rounded-3xl border border-[#ADE1FB] bg-[#F0F7FF] p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="font-bold text-[#0F2573] text-lg flex items-center gap-2">
                    📅 Jadwal Hari Ini ({stats.jadwalHariIni.length})
                </h2>
                <p className="text-xs font-bold text-[#266CA9] opacity-70">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-[#ADE1FB]/30 p-4">
            {stats.jadwalHariIni.length > 0 ? (
                <>
                    {displayedJadwal.map((item, i) => (
                        <div key={item.id || i}>
                            <div className="flex justify-between items-start py-3">
                                <div>
                                    <p className="font-bold text-[#0F2573]">{item.jam?.substring(0,5)}</p>
                                    <p className="font-bold text-slate-800">{item.nama_klien}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        📦 {item.detailBooking.paket || '-'} • 📍 {item.detailBooking.lokasi || '-'} • 📸 {item.nama_fg || '-'}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${item.status_chat === 'Sudah Dikirim' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {item.status_chat === 'Sudah Dikirim' ? '🟢 Terkirim' : '🟡 Belum Chat'}
                                </span>
                            </div>
                            {i < displayedJadwal.length - 1 && <div className="border-t border-slate-100 my-1"></div>}
                        </div>
                    ))}
                    
                    {/* Tombol Toggle yang Berfungsi */}
                    {stats.jadwalHariIni.length > 3 && (
                        <button 
                            onClick={() => setShowAll(!showAll)}
                            className="w-full mt-3 text-[10px] font-bold text-[#266CA9] uppercase hover:underline"
                        >
                            {showAll ? "Sembunyikan Jadwal" : "Lihat Semua"}
                        </button>
                    )}
                </>
            ) : <p className="text-slate-400 text-sm italic py-2">Tidak ada jadwal hari ini.</p>}
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
                { label: 'Total Omset', val: `Rp ${stats.totalOmset.toLocaleString('id-ID')}` },
                { label: 'Booking Aktif', val: stats.totalBooking },
                { label: 'Sudah LUNAS', val: stats.totalLunas + ' Booking' },
                { label: 'Masih DP', val: stats.totalDPBooking + ' Booking' },
                { label: 'Total DP Masuk', val: `Rp ${stats.totalDP.toLocaleString('id-ID')}` },
                { label: 'Sisa Pelunasan', val: `Rp ${stats.totalSisa.toLocaleString('id-ID')}` },
            ].map((item, i) => (
                <div key={i} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#266CA9]">{item.label}</p>
                    <p className="mt-4 text-xl font-bold text-[#0F2573]">{item.val}</p>
                </div>
            ))}
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#266CA9]">Pendapatan 7 Hari Terakhir</p>
            <div className="flex items-end gap-2 h-24 mt-4">
                {stats.chartData.map((val, i) => {
                    const heightPercent = Math.max((val / maxChartValue) * 100, 10);
                    return (
                        <div 
                            key={i} 
                            style={{ height: `${heightPercent}%` }} 
                            className="w-full bg-[#266CA9] rounded-t-lg transition-all hover:bg-[#0F2573]"
                            title={`Rp ${val.toLocaleString('id-ID')}`}
                        ></div>
                    );
                })}
            </div>
            <p className="text-[10px] text-slate-500 mt-4 text-center italic">
                {stats.totalOmset > 0 ? 'Tren pendapatan aktif bergerak' : 'Belum ada data transaksi'}
            </p>
        </div>
      </section>
    </div>
  );
}