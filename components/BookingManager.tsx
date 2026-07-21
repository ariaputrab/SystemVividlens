'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';

export default function BookingManager() {
  const [pricelist, setPricelist] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const [formData, setFormData] = useState({
    nama: '', tanggal: '', jam: '', lokasi: '', kampus: '',
    paket: '', ig: '', mua: '', dress: '', dp: 0, whatsapp: ''
  });
  const [paketData, setPaketData] = useState<any>(null);

  useEffect(() => {
    supabase.from('pricelist').select('*').then(({ data }) => setPricelist(data || []));
  }, []);

  const total = (paketData?.harga || 0);
  const sisa = total - formData.dp;

  const handleKlikSimpan = () => {
    if (!formData.nama || !formData.paket || !formData.tanggal) {
      alert("Nama, Paket, dan Tanggal wajib diisi!");
      return;
    }
    setShowModal(true);
  };

  const prosesSimpan = async () => {
    setShowModal(false);

    // 1. Simpan ke tabel Booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('Booking')
      .insert([{
        nama: formData.nama,
        whatsapp: formData.whatsapp,
        tanggal_foto: formData.tanggal,
        jam_foto: formData.jam,
        lokasi: formData.lokasi,
        kampus: formData.kampus,
        paket: formData.paket,
        instagram_tiktok: formData.ig,
        mua: formData.mua,
        dress: formData.dress,
        total_price: total,
        dp_amount: Number(formData.dp),
        remaining_balance: sisa,
        status: 'pending'
      }])
      .select('id');

    if (bookingError) {
      alert("Gagal simpan ke Booking: " + bookingError.message);
      return;
    }

    // 2. Simpan ke tabel Jadwal
    await supabase.from('jadwal').insert([{
        booking_id: bookingData[0].id,
        nama_klien: formData.nama,
        tanggal: formData.tanggal,
        jam: formData.jam,
        keterangan: `Paket: ${formData.paket}`
    }]);

    // 3. Simpan ke tabel clients untuk Laporan Keuangan
    await supabase.from('clients').insert([{
        name: formData.nama,
        nominal: total,
        is_done: false
    }]);

    setSuccessModal(true);
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm w-full text-slate-800">
      <h2 className="text-xl font-bold mb-8 text-slate-900">Tambah Booking Baru</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nama Klien</label>
          <input className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, nama: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">WhatsApp</label>
          <input className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tanggal</label>
          <input type="date" className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, tanggal: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jam</label>
          <input type="time" className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, jam: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lokasi</label>
          <input className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, lokasi: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kampus</label>
          <input className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, kampus: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Paket</label>
          <select className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => {
            const p = pricelist.find(x => x.nama_paket === e.target.value);
            setPaketData(p);
            setFormData({ ...formData, paket: e.target.value });
          }}>
            <option value="">Pilih Paket...</option>
            {pricelist.map(p => <option key={p.id} value={p.nama_paket}>{p.nama_paket}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Instagram / TikTok</label>
          <input className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, ig: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">MUA</label>
          <input className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, mua: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dress</label>
          <input className="border border-slate-200 p-3 rounded-lg outline-none" onChange={e => setFormData({ ...formData, dress: e.target.value })} />
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl mt-8 border border-slate-100">
        <p className="text-sm text-slate-500 font-medium">Total Harga</p>
        <p className="text-2xl font-bold text-slate-900 mb-4">Rp {total.toLocaleString()}</p>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Input DP</label>
          <input type="number" className="w-full border border-slate-200 p-3 rounded-lg outline-none bg-white" onChange={e => setFormData({ ...formData, dp: Number(e.target.value) })} />
        </div>
        <p className="text-lg mt-4 font-bold text-slate-900">Sisa Pembayaran: <span className="text-indigo-600">Rp {sisa.toLocaleString()}</span></p>
      </div>

      <button onClick={handleKlikSimpan} className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition">
        Simpan Booking
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={prosesSimpan}
        title="Konfirmasi Booking"
        message="Apakah kamu yakin ingin menyimpan data booking baru ini?"
      />

      <Modal
        isOpen={successModal}
        onConfirm={() => {
          setSuccessModal(false);
          window.location.reload();
        }}
        title="Berhasil"
        message="Booking dan Data Keuangan berhasil disimpan!"
        isSuccess={true}
      />
    </div>
  );
}