'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import Modal from '../components/Modal';
import RescheduleModal from '../components/RescheduleModal';

export default function JadwalManager() {
  const { data: session, status } = useSession();
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [searchKlien, setSearchKlien] = useState("");
  const [modalConfig, setModalConfig] = useState<any>({
    isOpen: false, type: 'FG', id: '', value: '', field: '', data: null
  });
  const [detailModalConfig, setDetailModalConfig] = useState<any>({
    isOpen: false, item: null, detail: null, activeTab: 'details'
  });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      const [{ data: dataJadwal, error: errJadwal }, { data: dataBooking, error: errBooking }] = await Promise.all([
        supabase.from('jadwal').select('*'),
        supabase.from('Booking').select('*')
      ]);
      if (errJadwal || errBooking) {
        console.error("Gagal mengambil data:", errJadwal?.message || errBooking?.message);
        return;
      }
      set(data || []);
      setBookings(dataBooking || []);
    } catch (err) {
      console.error("Kesalahan jaringan saat fetch data:", err);
    }
  }, []);

  useEffect(() => { 
    fetchAllData(); 
  }, [fetchAllData]);

  // Sinkronisasi data real-time saat modal detail terbuka
  useEffect(() => {
    if (detailModalConfig.isOpen && detailModalConfig.item) {
      const refreshDetailData = async () => {
        const { data: latestBooking } = await supabase
          .from('Booking')
          .select('*')
          .eq('id', detailModalConfig.item.booking_id)
          .single();
        
        const { data: latestItem } = await supabase
          .from('')
          .select('*')
          .eq('id', detailModalConfig.item.id)
          .single();
        if (latestBooking || latestItem) {
          setDetailModalConfig((prev: any) => ({
            ...prev,
            item: latestItem || prev.item,
            detail: latestBooking || prev.detail
          }));
        }
      };
      refreshDetailData();
    }
  }, [detailModalConfig.isOpen, detailModalConfig.item?.id]);

  const updateBookingField = async (bookingId: string | undefined, field: string, value: any) => {
    if (!bookingId) return;
    const cleanValue = value === '' ? null : value;
    const payload = { [field]: cleanValue };
    const { error } = await supabase.from('Booking').update(payload).eq('id', bookingId);
    if (error) {
      setAlertModal({ isOpen: true, message: `Gagal menyimpan ${field.replace(/_/g, ' ')}: ${error.message}` });
      return;
    }
    setBookings((prev) => prev.map(b => b.id === bookingId ? { ...b, [field]: cleanValue } : b));
    if (detailModalConfig.detail?.id === bookingId) {
      setDetailModalConfig((prev: any) => ({
        ...prev,
        detail: { ...prev.detail, [field]: cleanValue }
      }));
    }
  };

  const updateFreelanceFee = async (bookingId: string | undefined, rawValue: string) => {
    const numericValue = rawValue === '' ? null : Number(rawValue);
    await updateBookingField(bookingId, 'freelance_fee', isNaN(numericValue as number) ? null : numericValue);
  };

  const syncToGoogle = async (item: any, detail: any) => {
    if (status !== "authenticated") {
      setAlertModal({ isOpen: true, message: "Sesi tidak ditemukan atau belum login. Silakan login kembali." });
      return;
    }
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      setAlertModal({ isOpen: true, message: "Token akses kalender tidak ditemukan. Silakan login ulang dengan akses kalender." });
      return;
    }
    const paket = detail?.paket || "";
    let durasiMenit = 60;
    if (paket.includes("30")) {
      durasiMenit = 30;
    } else if (
      paket.includes("90") || 
      paket.includes("Plaosan B 2") || 
      paket.includes("Group Package 2") || 
      paket.includes("Group Package 3") || 
      paket.includes("Gold") || 
      paket.includes("Premium")
    ) {
      durasiMenit = 90;
    }
    const durasiMilidetik = durasiMenit * 60 * 1000;
    const rawDate = item.tanggal?.split('T')[0];
    if (!rawDate) {
      setAlertModal({ isOpen: true, message: "Tanggal  belum diatur!" });
      return;
    }
    const timePart = item.jam?.substring(0, 5) || "09:00";
    const startDateTime = new Date(`${rawDate}T${timePart}:00`).toISOString();
    const endDateTime = new Date(new Date(`${rawDate}T${timePart}:00`).getTime() + durasiMilidetik).toISOString();
    try {
      setIsCalendarLoading(true);
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { ...item, startTime: startDateTime, endTime: endDateTime }, detail, accessToken }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        const eventIdVal = result.eventId || 'synced_true';
        
        const updatePromises = [];
        if (detail?.id) {
          updatePromises.push(
            supabase.from('Booking').update({ calendar_synced: true, calendar_event_id: eventIdVal }).eq('id', detail.id)
          );
        }
        if (item?.id) {
          updatePromises.push(
            supabase.from('jadwal').update({ calendar_synced: true, calendar_event_id: eventIdVal }).eq('id', item.id)
          );
        }
        await Promise.all(updatePromises);
        
        await fetchAllData();
        
        const updatedItem = { ...item, calendar_synced: true, calendar_event_id: eventIdVal };
        const updatedDetail = detail ? { ...detail, calendar_synced: true, calendar_event_id: eventIdVal } : null;
        
        setDetailModalConfig((prev: any) => ({
          ...prev,
          item: updatedItem,
          detail: updatedDetail
        }));
        
        setAlertModal({ isOpen: true, message: `Jadwal berhasil diset ke kalender dengan durasi ${durasiMenit} menit!` });
      } else {
        setAlertModal({ isOpen: true, message: "Gagal sync ke kalender: " + (result.details || result.error || "Terjadi kesalahan server") });
      }
    } catch (err) {
      setAlertModal({ isOpen: true, message: "Gagal koneksi ke server kalender. Pastikan koneksi internet stabil." });
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const updateStatus = async (id: string, field: string, value: any) => {
    const item = jadwal.find(j => j.id === id);
    const { error: jadwalError } = await supabase.from('jadwal').update({ [field]: value }).eq('id', id);
    if (!jadwalError) {
      if (field === 'payment_status' && item?.booking_id) {
        await supabase.from('Booking').update({ status: value }).eq('id', item.booking_id);
      }
      if (field === 'payment_status' && value === 'LUNAS' && item?.nama_klien) {
        await supabase.from('clients').update({ is_done: true }).eq('name', item.nama_klien);
      }
      
      await fetchAllData();
      
      if (detailModalConfig.isOpen && item) {
        const { data: latestJadwal } = await supabase.from('jadwal').select('*').eq('id', id).single();
        const { data: latestBooking } = item.booking_id 
          ? await supabase.from('Booking').select('*').eq('id', item.booking_id).single()
          : { data: null };
        if (latestJadwal) {
          setDetailModalConfig((prev: any) => ({
            ...prev,
            item: latestJadwal,
            detail: latestBooking || prev.detail
          }));
        }
      }
      setModalConfig({ ...modalConfig, isOpen: false });
    } else {
      setAlertModal({ isOpen: true, message: "Gagal menyimpan ke database: " + jadwalError.message });
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredJadwal.map(item => {
      const detail = bookings.find(b => b.id === item.booking_id) || {};
      return {
        Klien: item.nama_klien,
        FG: item.nama_fg || 'BELUM DISET',
        Tanggal: item.tanggal ? item.tanggal : 'BELUM DISET',
        Jam: item.jam?.substring(0, 5) || '-',
        Kampus: detail.kampus || '-',
        Lokasi: detail.lokasi || '-',
        Paket: detail.paket || '-',
        MUA: detail.mua || '-',
        Dress: detail.dress || '-',
        IG_TikTok: detail.instagram_tiktok || '-',
        DP: detail.dp_amount || 0,
        Sisa: detail.remaining_balance || 0,
        Status_Bayar: item.payment_status || 'DP',
        Selesai: item.is_done ? 'Ya' : 'Tidak'
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, `Jadwal_VividLens_Bulan_${selectedMonth}.xlsx`);
  };

  const filteredJadwal = jadwal
    .filter(item => {
      if (!item.tanggal) return true;
      return new Date(item.tanggal).getMonth() + 1 === selectedMonth;
    })
    .filter(item => item.nama_klien?.toLowerCase().includes(searchKlien.toLowerCase()))
    .sort((a, b) => {
      if (!a.tanggal) return 1;
      if (!b.tanggal) return -1;
      return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
    });

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const currentModalItem = jadwal.find(j => j.id === detailModalConfig.item?.id) || detailModalConfig.item;
  const currentBookingDetail = bookings.find(b => b.id === currentModalItem?.booking_id) || detailModalConfig.detail;
  
  const checkIsSynced = (targetItem: any, targetDetail: any) => {
    const itemSynced = targetItem?.calendar_synced === true || 
                       targetItem?.calendar_synced === 'true' || 
                       (targetItem?.calendar_event_id && targetItem?.calendar_event_id !== '' && targetItem?.calendar_event_id !== 'false' && targetItem?.calendar_event_id !== null);
    
    const detailSynced = targetDetail?.calendar_synced === true || 
                         targetDetail?.calendar_synced === 'true' || 
                         (targetDetail?.calendar_event_id && targetDetail?.calendar_event_id !== '' && targetDetail?.calendar_event_id !== 'false' && targetDetail?.calendar_event_id !== null);
    
    return Boolean(itemSynced || detailSynced);
  };

  const isModalCalendarSynced = checkIsSynced(currentModalItem, currentBookingDetail);

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm w-full text-slate-800">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Jadwal & Detail Booking</h2>
          <p className="text-sm text-indigo-600 font-bold mt-1">JADWAL BULAN {monthNames[selectedMonth - 1].toUpperCase()}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Cari klien..."
            value={searchKlien}
            onChange={(e) => setSearchKlien(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={exportToExcel} className="bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-bold hover:bg-green-700 transition">Export Excel</button>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none">
            {monthNames.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left border-collapse text-sm sm:text-base">
          <thead>
            <tr className="text-slate-500 uppercase text-[10px] sm:text-[11px] tracking-widest border-b border-slate-100">
              <th className="px-3 py-2 sm:px-4 sm:py-3">Klien</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">FG</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Tanggal</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Jam</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Kampus</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Lokasi</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Paket</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">DP</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Sisa</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Fee Freelance</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Status Foto</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Status Bayar</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredJadwal.map((item) => {
              const detail = bookings.find(b => b.id === item.booking_id) || {};
              const isFgEmpty = !item.nama_fg || item.nama_fg.trim() === "";
              const isScheduleEmptyRow = !item.tanggal;
              
              const isRowCalendarSynced = checkIsSynced(item, detail);

              return (
                <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50 transition ${item.is_done ? 'bg-green-50/30' : ''}`}>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 font-semibold text-slate-900 cursor-pointer hover:text-indigo-600 flex items-center gap-2" onClick={() => setDetailModalConfig({ isOpen: true, item, detail, activeTab: 'details' })}>
                    <span>{item.nama_klien}</span>
                    {isRowCalendarSynced && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium" title="Sudah Diset di Kalender">📅 Done</span>
                    )}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 relative">
                    <input 
                      type="text" 
                      value={item.nama_fg || ''}
                      placeholder="Belum diset"
                      onChange={(e) => { 
                        const updatedJadwal = jadwal.map(j => j.id === item.id ? { ...j, nama_fg: e.target.value } : j); 
                        setJadwal(updatedJadwal); 
                      }}
                      onBlur={(e) => setModalConfig({ isOpen: true, type: 'FG', id: item.id, value: e.target.value, field: 'nama_fg' })}
                      className={`border rounded-lg px-2 py-1 text-xs w-28 focus:ring-1 focus:ring-indigo-500 outline-none ${
                        isFgEmpty ? 'bg-amber-50 border-amber-300 text-amber-900 placeholder-amber-400 font-semibold' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm font-medium text-slate-900">
                    {isScheduleEmptyRow ? (
                      <button
                        onClick={() => setSelectedBooking({ id: detail.id, booking_id: item.booking_id, tanggal_foto: item.tanggal, jam_foto: item.jam })}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-md transition shadow-sm"
                      >
                        Set Jadwal
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {detail.is_rescheduled && (
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm font-medium text-slate-900">
                    {isScheduleEmptyRow ? '-' : (item.jam?.substring(0, 5) || '-')}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-slate-600">{detail.kampus || '-'}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-slate-600">{detail.lokasi || '-'}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-slate-600">{detail.paket || '-'}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm font-bold text-[#266CA9]">Rp {(detail.dp_amount || 0).toLocaleString('id-ID')}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm font-bold text-rose-600">Rp {(detail.remaining_balance || 0).toLocaleString('id-ID')}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <input
                      type="number"
                      value={detail.freelance_fee ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBookings((prev) => prev.map(b => b.id === detail.id ? { ...b, freelance_fee: value === '' ? null : Number(value) } : b));
                      }}
                      onBlur={(e) => updateFreelanceFee(detail.id, e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs w-28 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <select
                      value={detail.workflow_status || 'Belum Foto'}
                      onChange={(e) => updateBookingField(detail.id, 'workflow_status', e.target.value)}
                      className="bg-transparent border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="Belum Foto">Belum Foto</option>
                      <option value="Sedang Diedit">Sedang Diedit</option>
                      <option value="Preview Dikirim">Preview Dikirim</option>
                      <option value="File Final Siap">File Final Siap</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <select value={item.payment_status || 'DP'} onChange={(e) => updateStatus(item.id, 'payment_status', e.target.value)} className="bg-transparent border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none">
                      <option value="DP">DP</option>
                      <option value="LUNAS">LUNAS</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <button onClick={() => setDetailModalConfig({ isOpen: true, item, detail, activeTab: 'details' })} className="text-indigo-600 hover:text-indigo-700 font-bold text-sm underline">
                      Detail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedBooking && (
        <RescheduleModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onSave={() => { setSelectedBooking(null); fetchAllData(); }}
        />
      )}

      {detailModalConfig.isOpen && currentModalItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-start z-10">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{currentModalItem.nama_klien}</h2>
                <p className="text-xs text-slate-500 mt-1">Detail Jadwal & Booking</p>
              </div>
              <button onClick={() => setDetailModalConfig({ ...detailModalConfig, isOpen: false })} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            
            <div className="border-b border-slate-100 px-6">
              <div className="flex gap-6">
                {['details', 'payment', 'chat'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailModalConfig({ ...detailModalConfig, activeTab: tab })}
                    className={`py-4 text-sm font-medium border-b-2 transition capitalize ${
                      detailModalConfig.activeTab === tab
                        ? 'text-slate-900 border-slate-900'
                        : 'text-slate-500 border-transparent hover:text-slate-700'
                    }`}
                  >
                    {tab === 'details' ? 'Detail' : tab === 'payment' ? 'Pembayaran' : 'Chat'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {detailModalConfig.activeTab === 'details' && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Google Calendar Sync</p>
                      <p className="text-sm font-semibold text-slate-800 mt-1">
                        {isModalCalendarSynced ? '✅ Sudah masuk Google Calendar' : '⚠️ Belum disinkronkan'}
                      </p>
                    </div>
                    <button
                      onClick={() => syncToGoogle(currentModalItem, currentBookingDetail)}
                      disabled={isCalendarLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition flex items-center gap-2 shadow-sm"
                    >
                      {isCalendarLoading ? 'Sedang Sync...' : (isModalCalendarSynced ? '🔄 Sync Ulang Kalender' : '📅 Sync ke Kalender')}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kampus</p>
                      <p className="text-sm text-slate-900 font-medium mt-2">{detailModalConfig.detail?.kampus || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Lokasi</p>
                      <p className="text-sm text-slate-900 font-medium mt-2">{detailModalConfig.detail?.lokasi || '-'}</p>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100"></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Paket</p>
                    <p className="text-sm text-slate-900 font-medium mt-2">{detailModalConfig.detail?.paket || '-'}</p>
                  </div>
                  <div className="h-px bg-slate-100"></div>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">MUA</p>
                      <p className="text-sm text-slate-900 font-medium mt-2">{detailModalConfig.detail?.mua || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Dress</p>
                      <p className="text-sm text-slate-900 font-medium mt-2">{detailModalConfig.detail?.dress || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">IG/TikTok</p>
                      <p className="text-sm text-slate-900 font-medium mt-2">{detailModalConfig.detail?.instagram_tiktok || '-'}</p>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100"></div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">WhatsApp</p>
                      <p className="text-sm text-slate-900 font-medium mt-2">{detailModalConfig.detail?.whatsapp || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">FG</p>
                      <p className="text-sm text-slate-900 font-medium mt-2">{currentModalItem.nama_fg || '-'}</p>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100"></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Fee Freelance</p>
                    <input
                      type="number"
                      value={detailModalConfig.detail?.freelance_fee ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDetailModalConfig((prev: any) => ({
                          ...prev,
                          detail: { ...prev.detail, freelance_fee: value === '' ? null : Number(value) }
                        }));
                      }}
                      onBlur={(e) => detailModalConfig.detail?.id && updateFreelanceFee(detailModalConfig.detail.id, e.target.value)}
                      className="mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-2">Rp {Number(detailModalConfig.detail?.freelance_fee || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="h-px bg-slate-100"></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Status Foto</p>
                    <select
                      value={detailModalConfig.detail?.workflow_status || 'Belum Foto'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDetailModalConfig((prev: any) => ({
                          ...prev,
                          detail: { ...prev.detail, workflow_status: value }
                        }));
                        if (detailModalConfig.detail?.id) {
                          updateBookingField(detailModalConfig.detail.id, 'workflow_status', value);
                        }
                      }}
                      className="mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Belum Foto">Belum Foto</option>
                      <option value="Sedang Diedit">Sedang Diedit</option>
                      <option value="Preview Dikirim">Preview Dikirim</option>
                      <option value="File Final Siap">File Final Siap</option>
                    </select>
                  </div>
                </div>
              )}

              {detailModalConfig.activeTab === 'payment' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="border border-slate-200 rounded-lg p-4">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">DP</p>
                      <p className="text-lg font-semibold text-slate-900 mt-3">Rp {(detailModalConfig.detail?.dp_amount || 0).toLocaleString()}</p>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-4">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sisa</p>
                      <p className="text-lg font-semibold text-slate-900 mt-3">Rp {(detailModalConfig.detail?.remaining_balance || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded text-xs font-medium ${
                        detailModalConfig.detail?.status?.toUpperCase() === 'LUNAS'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {detailModalConfig.detail?.status || 'DP'}
                      </span>
                      {currentModalItem.is_done && (
                        <span className="px-3 py-1.5 rounded text-xs font-medium bg-slate-200 text-slate-700">Selesai</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => updateStatus(currentModalItem.id, 'payment_status', 'DP')}
                      className="w-full bg-slate-900 hover:bg-black text-white font-medium py-2.5 rounded-lg transition text-sm"
                    >
                      Set DP
                    </button>
                    <button
                      onClick={() => updateStatus(currentModalItem.id, 'payment_status', 'LUNAS')}
                      className="w-full bg-slate-900 hover:bg-black text-white font-medium py-2.5 rounded-lg transition text-sm"
                    >
                      Set LUNAS
                    </button>
                  </div>
                </div>
              )}

              {detailModalConfig.activeTab === 'chat' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap text-xs text-slate-600 max-h-96 overflow-y-auto font-mono">
                    {`Halo Kak ${currentModalItem.nama_klien} 😊
Mengingatkan untuk jadwal photoshoot ya 📸✨
🗓 Tanggal : ${currentModalItem.tanggal ? new Date(currentModalItem.tanggal).toLocaleDateString('id-ID') : 'Belum diset'}
⏰ Jam : ${currentModalItem.jam?.substring(0, 5) || 'Belum diset'}
📍 Lokasi : ${detailModalConfig.detail?.lokasi || '-'}
🏫 Kampus : ${detailModalConfig.detail?.kampus || '-'}
📌 Paket : ${detailModalConfig.detail?.paket || '-'}
📞 WhatsApp : ${detailModalConfig.detail?.whatsapp || 'Tidak tersedia'}
Untuk pelunasan bisa dilakukan sebelum sesi dimulai ya Kak 🙏
📌 DP : Rp ${(detailModalConfig.detail?.dp_amount || 0).toLocaleString()}
📌 Sisa pembayaran : Rp ${(detailModalConfig.detail?.remaining_balance || 0).toLocaleString()}
💳 Pembayaran via QRIS (scan seperti saat DP ya Kak)
Setelah melakukan pelunasan, mohon kirimkan bukti transfernya ya 😊
📩 Nanti untuk teknis di lapangan, fotografer (FG) kami akan menghubungi Kak ${currentModalItem.nama_klien} di nomor ${detailModalConfig.detail?.whatsapp || 'Tidak tersedia'} sebelum sesi dimulai ya.
Terima kasih, sampai jumpa di hari H ✨📸🎓`}
                  </div>
                  <button
                    onClick={() => {
                      const tglStr = currentModalItem.tanggal ? new Date(currentModalItem.tanggal).toLocaleDateString('id-ID') : 'Belum diset';
                      const jamStr = currentModalItem.jam?.substring(0, 5) || 'Belum diset';
                      const text = `Halo Kak ${currentModalItem.nama_klien} 😊
Mengingatkan untuk jadwal photoshoot ya 📸✨
🗓 Tanggal : ${tglStr}
⏰ Jam : ${jamStr}
📍 Lokasi : ${detailModalConfig.detail?.lokasi || '-'}
🏫 Kampus : ${detailModalConfig.detail?.kampus || '-'}
📌 Paket : ${detailModalConfig.detail?.paket || '-'}
📞 WhatsApp : ${detailModalConfig.detail?.whatsapp || 'Tidak tersedia'}
Untuk pelunasan bisa dilakukan sebelum sesi dimulai ya Kak 🙏
📌 DP : Rp ${(detailModalConfig.detail?.dp_amount || 0).toLocaleString()}
📌 Sisa pembayaran : Rp ${(detailModalConfig.detail?.remaining_balance || 0).toLocaleString()}
💳 Pembayaran via QRIS (scan seperti saat DP ya Kak)
Setelah melakukan pelunasan, mohon kirimkan bukti transfernya ya 😊
📩 Nanti untuk teknis di lapangan, fotografer (FG) kami akan menghubungi Kak ${currentModalItem.nama_klien} di nomor ${detailModalConfig.detail?.whatsapp || 'Tidak tersedia'} sebelum sesi dimulai ya.
Terima kasih, sampai jumpa di hari H ✨📸🎓`;
                      navigator.clipboard.writeText(text);
                      setAlertModal({ isOpen: true, message: "Pesan WhatsApp berhasil disalin!" });
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2"
                  >
                    <span>📋 Salin Pesan WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalConfig.isOpen && (
        <Modal
          config={modalConfig}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
          onSave={(value: any) => updateStatus(modalConfig.id, modalConfig.field, value)}
        />
      )}

      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 text-center space-y-4">
            <p className="text-slate-800 text-sm">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal({ isOpen: false, message: '' })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
