'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';

export default function InvoiceManager() {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [pricelist, setPricelist] = useState<any[]>([]);
  const [bulan, setBulan] = useState('all');

  const fetchData = async () => {
    const { data: dataJadwal } = await supabase.from('jadwal').select('*');
    const { data: dataBooking } = await supabase.from('Booking').select('*');
    const { data: dataPricelist } = await supabase.from('pricelist').select('*');
    setJadwal(dataJadwal || []);
    setBookings(dataBooking || []);
    setPricelist(dataPricelist || []);
  };

  useEffect(() => { fetchData(); }, []);

  const generatePDF = (item: any, type: 'DP' | 'LUNAS') => {
    const detail = bookings.find(b => b.id === item.booking_id) || {};
    const paketData = pricelist.find(p => p.nama_paket === detail.paket) || {};
    const totalHarga = detail.total_price || 0;
    const dpSudahDibayar = detail.dp_amount || 0;
    const kekurangan = type === 'LUNAS' ? 0 : (totalHarga - dpSudahDibayar);
    
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("+ Vividlens", 20, 25);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Photography", 20, 31);
    doc.text("Jl Wates KM 10 Pedes Argomulyo Sedayu Bantul", 20, 40);
    doc.line(20, 43, 190, 43);
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice", 140, 60);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 140, 67);
    
    doc.text("Billed to:", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`${item.nama_klien} - ${detail.kampus || '-'}`, 20, 67);
    
    doc.setFont("helvetica", "bold");
    doc.text("RINCIAN PESANAN", 20, 85);
    doc.text("Total", 170, 85);
    doc.line(20, 88, 190, 88);
    
    doc.setFont("helvetica", "normal");
    doc.text(`${detail.paket || '-'} by VIVIDLENS`, 20, 95);
    doc.text(`Rp ${totalHarga.toLocaleString()}`, 170, 95);
    
    let y = 105;
    doc.setFontSize(11);
    if (paketData.durasi) {
        doc.setFont("helvetica", "bold");
        doc.text(`• Durasi: ${paketData.durasi}`, 25, y);
        y += 7;
        doc.setFont("helvetica", "normal");
    }
    if (paketData.fitur) {
        paketData.fitur.split(',').forEach((f: string) => {
            doc.text(`• ${f.trim()}`, 25, y);
            y += 7;
        });
    }
    
    const footerY = Math.max(y + 5, 160); 
    doc.line(20, footerY, 190, footerY);
    
    const textY = footerY + 7;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("* Pelunasan dilakukan maksimal H-1 sebelum hari pelaksanaan", 20, textY);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`DP : Rp ${dpSudahDibayar.toLocaleString()}`, 140, textY);
    doc.text(`Kekurangan : Rp ${kekurangan.toLocaleString()}`, 140, textY + 7);
    
    // --- PERBAIKAN TAMPILAN STEMPEL LUNAS ---
    if (type === 'LUNAS') {
      doc.setTextColor(22, 163, 74); // Warna hijau modern (Tailwind emerald-600)
      doc.setFontSize(18);
      // Posisi disesuaikan agar rapi di bawah kekurangan dan sedikit miring elegan
      doc.text("LUNAS", 155, textY + 18, { angle: 8 });
    }
    // ----------------------------------------

    doc.setTextColor(0, 0, 0);
    doc.save(`Invoice_${item.nama_klien}_${type}.pdf`);
  };

  // Filter dan Urutkan berdasarkan tanggal (ascending)
  const filteredJadwal = jadwal
    .filter(item => {
      if (bulan === 'all') return true;
      return new Date(item.tanggal).getMonth().toString() === bulan;
    })
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm w-full text-slate-800">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-slate-900">Manajemen Invoice</h2>
        <div className="flex gap-3">
            <select className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none" onChange={(e) => setBulan(e.target.value)}>
                <option value="all">Semua Bulan</option>
                {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((m,i) => <option value={i} key={i}>{m}</option>)}
            </select>
            <button onClick={fetchData} className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition">Refresh</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">
              <th className="p-4">Tanggal</th>
              <th className="p-4">Jam</th>
              <th className="p-4">Klien</th>
              <th className="p-4">Paket</th>
              <th className="p-4">Status</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredJadwal.map((item) => (
              <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                <td className="p-4 text-sm font-bold text-slate-900">
                    {new Date(item.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}
                </td>
                <td className="p-4 text-sm font-bold text-slate-900">
                    {item.jam?.substring(0, 5) || '-'}
                </td>
                <td className="p-4 font-semibold text-slate-900">{item.nama_klien}</td>
                <td className="p-4 text-sm text-slate-600">{bookings.find(b => b.id === item.booking_id)?.paket || '-'}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${item.payment_status === 'LUNAS' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {item.payment_status || 'DP'}
                  </span>
                </td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => generatePDF(item, 'DP')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-[11px] font-bold transition">DP</button>
                  <button onClick={() => generatePDF(item, 'LUNAS')} className="bg-slate-900 hover:bg-black text-white px-3 py-2 rounded-lg text-[11px] font-bold transition">LUNAS</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}