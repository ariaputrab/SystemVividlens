'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';

export default function RescheduleModal({ booking, onClose, onSave }: any) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    tanggal_baru: '',
    jam_baru: '',
    alasan: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.tanggal_baru || !formData.jam_baru) {
      alert("Harap isi tanggal dan jam baru!");
      return;
    }
    
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
        alert("Sesi login berakhir. Silakan login ulang.");
        return;
    }

    setLoading(true);

    try {
      let durasiMenit = 60;
      const paket = booking.paket || "";
      if (paket.includes("30")) durasiMenit = 30;
      else if (paket.includes("90") || paket.includes("Group Package") || paket.includes("Gold") || paket.includes("Premium")) durasiMenit = 90;

      const durasiMilidetik = durasiMenit * 60 * 1000;
      const startDateTime = new Date(`${formData.tanggal_baru}T${formData.jam_baru}:00`);
      const endDateTime = new Date(startDateTime.getTime() + durasiMilidetik);

      const targetBookingId = booking.id || booking.booking_id;

      // 1. Sinkronisasi ke Google Calendar terlebih dahulu
      const res = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          booking_id: targetBookingId,
          new_start: startDateTime.toISOString(),
          new_end: endDateTime.toISOString(),
          accessToken: accessToken
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || result.details || "Gagal sync ke Google Calendar");
      }

      // 2. Update tabel Booking di Supabase
      await supabase.from('Booking')
        .update({ 
          tanggal_foto: formData.tanggal_baru, 
          jam_foto: formData.jam_baru,
          is_rescheduled: true 
        })
        .eq('id', targetBookingId);

      // 3. Update tabel Jadwal di Supabase
      await supabase.from('jadwal')
        .update({ 
          tanggal: formData.tanggal_baru, 
          jam: formData.jam_baru 
        })
        .eq('booking_id', targetBookingId);

      onSave();
    } catch (err: any) {
      console.error("ERROR DETAIL RESCHEDULE:", err);
      alert("Gagal melakukan update: " + (err.message || "Terjadi kesalahan sistem"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Ubah Jadwal</h2>
            <p className="text-xs text-slate-500 mt-1">Ganti jadwal photoshoot</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {/* Current Schedule Info */}
        <div className="px-6 pt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Jadwal Saat Ini</p>
            <div className="flex items-center gap-2 text-slate-900 font-medium">
              <span>📅</span>
              <span>
                {booking?.tanggal ? new Date(booking.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : (booking?.tanggal_foto || '-')} 
                {booking?.jam ? ` • ${booking.jam.substring(0, 5)}` : (booking?.jam_foto ? ` • ${booking.jam_foto.substring(0, 5)}` : '')}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-5">
          <div>
            <label className="block text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Tanggal Baru</label>
            <input 
              type="date" 
              onChange={e => setFormData({...formData, tanggal_baru: e.target.value})}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Jam Baru</label>
            <input 
              type="time" 
              onChange={e => setFormData({...formData, jam_baru: e.target.value})}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Alasan Reschedule (Optional)</label>
            <textarea 
              placeholder="Jelaskan alasan perubahan jadwal..."
              onChange={e => setFormData({...formData, alasan: e.target.value})}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none h-24"
            />
          </div>
        </div>

        {/* New Schedule Preview */}
        {formData.tanggal_baru && formData.jam_baru && (
          <div className="px-6 pb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-2">Jadwal Baru</p>
              <div className="flex items-center gap-2 text-blue-900 font-medium">
                <span>✓</span>
                <span>{formData.tanggal_baru} • {formData.jam_baru}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 border border-slate-300 hover:border-slate-400 text-slate-700 font-medium py-2 rounded-lg text-sm transition"
          >
            Batal
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading || !formData.tanggal_baru || !formData.jam_baru}
            className={`flex-1 font-medium py-2 rounded-lg text-sm transition ${
              loading || !formData.tanggal_baru || !formData.jam_baru
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-black text-white'
            }`}
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
