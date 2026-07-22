'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatFGManager() {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  // State untuk Filter
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1);
  const [filterFG, setFilterFG] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [searchKlien, setSearchKlien] = useState("");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  async function fetchData() {
    const { data: dataJadwal } = await supabase.from('jadwal').select('*');
    const { data: dataBooking } = await supabase.from('Booking').select('*');
    setJadwal(dataJadwal?.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()) || []);
    setBookings(dataBooking || []);
  }

  useEffect(() => { fetchData(); }, []);

  // Logika Filter Data
  const filteredJadwal = useMemo(() => {
    return jadwal.filter(item => {
      const matchBulan = new Date(item.tanggal).getMonth() + 1 === filterBulan;
      const matchFG = filterFG === "Semua" || item.nama_fg === filterFG;
      const matchStatus = filterStatus === "Semua"
        ? true
        : (filterStatus === "Sudah Dikirim" ? item.status_chat === "Sudah Dikirim" : item.status_chat !== "Sudah Dikirim");
      const matchSearch = item.nama_klien?.toLowerCase().includes(searchKlien.toLowerCase());

      return matchBulan && matchFG && matchStatus && matchSearch;
    });
  }, [jadwal, filterBulan, filterFG, filterStatus, searchKlien]);

  const handleCopy = async (item: any) => {
    const detail = bookings.find(b => b.id === item.booking_id) || {};
    const wa = detail.whatsapp || "Tidak tersedia";
    const text = `Hallo Kak ${item.nama_klien || 'Kak'} 🙌🏼✨\n\nPerkenalkan, saya ${item.nama_fg || '-'} dari tim VividLens Graduation 📸🎓\nIzin konfirmasi kembali untuk jadwal sesi foto Kakak ya:\n\n🗓️ Tanggal : ${formatDate(item.tanggal)}\n⏰ Jam : ${item.jam?.substring(0, 5)}\n📍 Lokasi : ${detail.lokasi || '-'}\n🎓 Kampus : ${detail.kampus || '-'}\n📦 Paket : ${detail.paket || '-'}\n📞 WhatsApp : ${wa}\n\nApakah sudah sesuai, Kak? Untuk meeting point-nya di mana ya, Kak? Jika ada request pose atau moodboard yang ingin direferensikan, boleh dikirimkan juga ya 😊✨\n\nTerima kasih 🙏🏼📸🎓`;

    navigator.clipboard.writeText(text);
    await supabase.from('jadwal').update({ status_chat: 'Sudah Dikirim' }).eq('id', item.id);
    fetchData();
  };

  return (
    <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-100 shadow-sm">
      <h2 className="text-xl font-bold text-[#0F2573] mb-6">Chat Konfirmasi Fotografer</h2>

      {/* Baris Filter */}
      <div className="flex flex-wrap gap-3 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <select
          value={filterBulan}
          onChange={(e) => setFilterBulan(Number(e.target.value))}
          className="p-2 rounded-lg border text-sm text-slate-700 bg-white"
        >
          {[...new Set(jadwal.map(j => new Date(j.tanggal).getMonth() + 1))].sort((a, b) => a - b).map(m => (
            <option key={m} value={m}>
              {new Date(2026, m - 1).toLocaleDateString('id-ID', { month: 'long' })} 2026
            </option>
          ))}
        </select>

        <select value={filterFG} onChange={(e) => setFilterFG(e.target.value)} className="p-2 rounded-lg border text-sm text-slate-700 bg-white">
          <option value="Semua">Semua Fotografer</option>
          {[...new Set(jadwal.map(j => j.nama_fg).filter(Boolean))].map(fg => <option key={fg} value={fg}>{fg}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 rounded-lg border text-sm text-slate-700 bg-white">
          <option value="Semua">Semua Status</option>
          <option value="Belum Dikirim">Belum Dikirim</option>
          <option value="Sudah Dikirim">Sudah Dikirim</option>
        </select>

        <input
          type="text"
          placeholder="Cari Klien..."
          value={searchKlien}
          onChange={(e) => setSearchKlien(e.target.value)}
          className="p-2 rounded-lg border text-sm flex-grow min-w-[200px] text-slate-800 placeholder:text-slate-400 bg-white"
        />
      </div>

      <div className="grid gap-4">
        {filteredJadwal.length > 0 ? filteredJadwal.map((item) => {
          const detail = bookings.find(b => b.id === item.booking_id) || {};
          const isSent = item.status_chat === 'Sudah Dikirim';

          return (
            <div 
              key={item.id} 
              className={`p-4 sm:p-6 border rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition ${isSent ? 'bg-green-50 border-green-200' : 'bg-[#F0F7FF]/30 border-[#ADE1FB]/30'}`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 w-full">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Fotografer</p>
                  <p className="font-bold text-[#0F2573] text-sm sm:text-base">{item.nama_fg || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Klien</p>
                  <p className="font-medium text-slate-700 text-sm sm:text-base">{item.nama_klien || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Jadwal</p>
                  <p className="font-medium text-slate-700 text-xs sm:text-sm">{formatDate(item.tanggal)} - {item.jam?.substring(0, 5)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Detail</p>
                  <p className="font-medium text-slate-700 text-xs sm:text-sm">{detail.kampus || '-'} / {detail.paket || '-'}</p>
                </div>
              </div>

              <button
                onClick={() => handleCopy(item)}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${isSent ? 'bg-green-500 text-white' : 'bg-[#266CA9] text-white hover:bg-[#0F2573]'}`}
              >
                {isSent ? '✅ Sudah Dikirim' : '📋 Copy Chat'}
              </button>
            </div>
          );
        }) : <p className="text-center text-slate-400 py-10">Tidak ada data ditemukan.</p>}
      </div>
    </div>
  );
}
