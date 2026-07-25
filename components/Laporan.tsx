'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Laporan() {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: jadwalData } = await supabase.from('jadwal').select('*');
    const { data: bookingData } = await supabase.from('Booking').select('*');

    if (jadwalData && bookingData) {
      const combined = jadwalData.map(j => {
        const booking = bookingData.find(b => b.id === j.booking_id || b.id === j.id_booking);
        const bookingId = booking?.id || j.booking_id || j.id;

        return { 
          ...j, 
          booking_id: bookingId,
          total_price: booking?.total_price || j.total_price || 0,
          freelance_fee: booking?.freelance_fee || j.freelance_fee || 0,
          nama_fg: booking?.nama_fg || j.nama_fg || '-',
          is_freelance_paid: booking?.is_freelance_paid || false,
          payment_status: booking?.payment_status || j.payment_status || 'DP'
        };
      });
      setData(combined);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = data.filter(item => {
      const tanggalItem = item.tanggal || item.created_at;
      if (!tanggalItem) return false;
      const itemMonth = new Date(tanggalItem).getMonth() + 1;
      return itemMonth === Number(selectedMonth);
    });

    const sorted = filtered.sort((a, b) => {
      const tA = new Date(a.tanggal || a.created_at).getTime();
      const tB = new Date(b.tanggal || b.created_at).getTime();
      return tA - tB;
    });

    setFilteredData(sorted);
  }, [data, selectedMonth]);

  const toggleFreelancePaid = async (bookingId: string, currentStatus: boolean) => {
    if (!bookingId) return;
    const newStatus = !currentStatus;

    const { error } = await supabase
      .from('Booking')
      .update({ is_freelance_paid: newStatus })
      .eq('id', bookingId);

    if (error) {
      alert("Gagal memperbarui status: " + error.message);
      return;
    }

    setData(prev => prev.map(item => item.booking_id === bookingId ? { ...item, is_freelance_paid: newStatus } : item));
  };

  const totalOmzet = filteredData.reduce((sum, item) => sum + (Number(item.total_price || 0)), 0);
  const totalFreelance = filteredData.reduce((sum, item) => sum + (Number(item.freelance_fee || 0)), 0);
  const omzetBersih = totalOmzet - totalFreelance;

  const sudahLunas = filteredData.filter(item => item.payment_status === 'LUNAS')
                              .reduce((sum, item) => sum + (Number(item.total_price || 0)), 0);
  const sisaTagihan = totalOmzet - sudahLunas;

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat data laporan...</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="font-bold text-slate-800 text-lg">Laporan Keuangan</h2>
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="border border-slate-200 rounded-lg p-2 text-sm font-semibold text-slate-700 cursor-pointer bg-white"
        >
          {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((nama, i) => (
            <option key={i + 1} value={i + 1}>{nama}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold">Total Omzet (Kotor)</p>
          <p className="text-xl font-black text-[#0F2573] mt-1">Rp {totalOmzet.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100">
          <p className="text-rose-600 text-xs font-semibold">Total Bayar FG</p>
          <p className="text-xl font-black text-rose-700 mt-1">Rp {totalFreelance.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100">
          <p className="text-indigo-600 text-xs font-semibold">Omzet Bersih (Profit)</p>
          <p className="text-xl font-black text-indigo-700 mt-1">Rp {omzetBersih.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-green-50 p-5 rounded-3xl border border-green-100">
          <p className="text-green-600 text-xs font-semibold">Sudah Lunas</p>
          <p className="text-xl font-black text-green-700 mt-1">Rp {sudahLunas.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-red-50 p-5 rounded-3xl border border-red-100 sm:col-span-2 md:col-span-1">
          <p className="text-red-600 text-xs font-semibold">Sisa Tagihan</p>
          <p className="text-xl font-black text-red-700 mt-1">Rp {sisaTagihan.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredData.length > 0 ? (
          <>
            {/* Tampilan Mobile (Card View) */}
            <div className="block md:hidden divide-y divide-slate-100 p-4 space-y-4">
              {filteredData.map((item) => {
                const harga = Number(item.total_price || 0);
                const feeFreelance = Number(item.freelance_fee || 0);
                const bersih = harga - feeFreelance;

                return (
                  <div key={item.id} className="pt-4 first:pt-0 pb-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-slate-400">{item.tanggal || '-'}</span>
                        <h3 className="font-bold text-slate-900 text-base">{item.nama_klien || '-'}</h3>
                        <p className="text-xs text-slate-400 italic">{item.keterangan || '-'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                        item.payment_status === 'LUNAS' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {item.payment_status || 'DP'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Fotografer</span>
                        <span className="font-semibold text-slate-800">{item.nama_fg || '-'}</span>
                        <span className="block text-rose-600 font-medium">Bayar: Rp {feeFreelance.toLocaleString('id-ID')}</span>
                        
                        <button
                          onClick={() => toggleFreelancePaid(item.booking_id, item.is_freelance_paid)}
                          className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm ${
                            item.is_freelance_paid 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.is_freelance_paid ? '✓ Sudah Dibayar' : '○ Belum Dibayar'}
                        </button>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Keuangan</span>
                        <span className="font-black text-slate-900">Rp {harga.toLocaleString('id-ID')}</span>
                        <span className="block font-bold text-emerald-600">Bersih: Rp {bersih.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tampilan Desktop (Table View) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-sm font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Nama Klien</th>
                    <th className="p-4">Info FG & Fee Freelance</th>
                    <th className="p-4">Harga / Bersih</th>
                    <th className="p-4 text-center">Status Bayar FG</th>
                    <th className="p-4 text-center">Status Klien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item) => {
                    const harga = Number(item.total_price || 0);
                    const feeFreelance = Number(item.freelance_fee || 0);
                    const bersih = harga - feeFreelance;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-medium text-slate-600">{item.tanggal || '-'}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-base">{item.nama_klien || '-'}</p>
                          <p className="text-xs text-slate-400 italic">{item.keterangan || '-'}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-semibold text-slate-800">{item.nama_fg || '-'}</p>
                          <p className="text-xs text-rose-600 font-medium">Bayar: Rp {feeFreelance.toLocaleString('id-ID')}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-black text-slate-950 text-base">
                            Rp {harga.toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs font-bold text-emerald-600">
                            Bersih: Rp {bersih.toLocaleString('id-ID')}
                          </p>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleFreelancePaid(item.booking_id, item.is_freelance_paid)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 ${
                              item.is_freelance_paid 
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {item.is_freelance_paid ? '✓ Sudah Dibayar' : '○ Belum Dibayar'}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest ${
                            item.payment_status === 'LUNAS' 
                              ? 'bg-green-500 text-white shadow-sm' 
                              : 'bg-red-500 text-white shadow-sm'
                          }`}>
                            {item.payment_status || 'DP'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="p-10 text-center text-slate-400">Tidak ada data untuk bulan ini.</p>
        )}
      </div>
    </div>
  );
}
