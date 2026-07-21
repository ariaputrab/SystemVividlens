'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Phone, Calendar, Clock, MapPin, GraduationCap, Camera, Wallet } from 'lucide-react';

type Booking = {
  id?: string;
  nama?: string;
  whatsapp?: string;
  tanggal_foto?: string;
  created_at?: string;
  status?: string;
  total_price?: number;
  dp_amount?: number;
  remaining_balance?: number;
  instagram_tiktok?: string;
  nama_fg?: string;
  jam_foto?: string;
  kampus?: string;
  lokasi?: string;
  paket?: string;
  mua?: string;
  dress?: string;
  workflow_status?: string;
};

type ClientSummary = {
  nama: string;
  whatsapp?: string;
  booking: number;
  total: number;
  latestBookingDate: Date;
  latestStatus: string;
};

export default function DataKlien() {
  const [dataKlien, setDataKlien] = useState<ClientSummary[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedKlien, setSelectedKlien] = useState<ClientSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const formatMoney = (value: number | string | undefined) => `Rp ${Number(value || 0).toLocaleString()}`;

  const statusBadgeClasses = (status: string) => {
    const key = (status || '').toLowerCase();
    if (key.includes('lunas')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (key.includes('dp')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (key.includes('pending') || key.includes('belum') || key.includes('dibatalkan')) return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.from('Booking').select('*');
      if (data) {
        setAllBookings(data);
        const grouped = data.reduce<Record<string, ClientSummary>>((acc, curr) => {
          const nama = curr.nama || 'Tanpa Nama';
          const bookingDate = new Date(curr.tanggal_foto || curr.created_at || 0);
          if (!acc[nama]) {
            acc[nama] = {
              nama,
              whatsapp: curr.whatsapp,
              booking: 0,
              total: 0,
              latestBookingDate: bookingDate,
              latestStatus: curr.status || ''
            };
          }
          acc[nama].booking += 1;
          acc[nama].total += Number(curr.total_price || 0);
          if (bookingDate.getTime() > new Date(acc[nama].latestBookingDate).getTime()) {
            acc[nama].latestBookingDate = bookingDate;
            acc[nama].latestStatus = curr.status || acc[nama].latestStatus;
          }
          return acc;
        }, {});
        setDataKlien(Object.values(grouped));
      }
    };
    loadData();
  }, []);

  const clientBookings = selectedKlien ? allBookings.filter(b => b.nama === selectedKlien.nama) : [];
  const latestBooking = clientBookings.length 
    ? clientBookings.reduce((latest, current) => {
        const latestTime = new Date(latest.tanggal_foto || latest.created_at || '').getTime();
        const currentTime = new Date(current.tanggal_foto || current.created_at || '').getTime();
        return currentTime > latestTime ? current : latest;
      }, clientBookings[0])
    : null;

  const filteredDataKlien = dataKlien.filter((k) => {
    const queryMatch = k.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || k.whatsapp?.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === 'All' || (k.latestStatus || '').toLowerCase() === statusFilter.toLowerCase();
    return queryMatch && statusMatch;
  });

  if (selectedKlien) return (
    <div className="space-y-6">
      <div className="w-full rounded-2xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => setSelectedKlien(null)} className="text-slate-600 hover:text-slate-900 font-medium">← Kembali</button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">Detail Klien</p>
            <h1 className="text-3xl font-semibold text-slate-900">{selectedKlien.nama}</h1>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Informasi Klien</h2>
                <p className="text-sm text-slate-500 mt-1">Data kontak dan akun sosial.</p>
              </div>
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><User className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Nama Klien</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{selectedKlien.nama}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Phone className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">WhatsApp</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.whatsapp || selectedKlien.whatsapp || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Camera className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Instagram / TikTok</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.instagram_tiktok || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Informasi Booking</h2>
                <p className="text-sm text-slate-500 mt-1">Ringkasan booking terbaru.</p>
              </div>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Calendar className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Tanggal</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.tanggal_foto ? new Date(latestBooking.tanggal_foto).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Clock className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Jam</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.jam_foto || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><GraduationCap className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Kampus</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.kampus || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><MapPin className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Lokasi</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.lokasi || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Camera className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Paket</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.paket || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Camera className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">MUA</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.mua || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Camera className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dress</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{latestBooking?.dress || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pembayaran</h2>
              <p className="text-sm text-slate-500 mt-1">Ringkasan pembayaran terakhir.</p>
            </div>
            <Wallet className="w-5 h-5 text-slate-400" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total Harga</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{formatMoney(latestBooking?.total_price || selectedKlien.total)}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">DP</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{formatMoney(latestBooking?.dp_amount || 0)}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sisa Pembayaran</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{formatMoney(latestBooking?.remaining_balance || 0)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Riwayat Booking</h2>
              <p className="text-sm text-slate-500 mt-1">Semua booking untuk klien ini.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-left text-sm sm:text-base border-separate border-spacing-y-3">
              <thead className="text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 sm:px-5 font-medium">Tanggal</th>
                  <th className="py-3 px-3 sm:px-5 font-medium">Paket</th>
                  <th className="py-3 px-3 sm:px-5 font-medium">Lokasi</th>
                  <th className="py-3 px-3 sm:px-5 font-medium">Total Harga</th>
                  <th className="py-3 px-3 sm:px-5 font-medium">Status</th>
                  <th className="py-3 px-3 sm:px-5 font-medium">Status Foto</th>
                </tr>
              </thead>
              <tbody>
                {clientBookings.sort((a, b) => new Date(b.tanggal_foto || '').getTime() - new Date(a.tanggal_foto || '').getTime()).map((b, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 px-3 sm:px-5 text-slate-900">{b.tanggal_foto ? new Date(b.tanggal_foto).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="py-3 px-3 sm:px-5 text-slate-900">{b.paket || '-'}</td>
                    <td className="py-3 px-3 sm:px-5 text-slate-900">{b.lokasi || '-'}</td>
                    <td className="py-3 px-3 sm:px-5 text-slate-900">{formatMoney(b.total_price)}</td>
                    <td className="py-3 px-3 sm:px-5">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClasses(b.status || '')}`}>
                        {b.status || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-5 text-slate-900">{b.workflow_status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="w-full rounded-2xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500 mb-2">Data Klien</p>
          <h1 className="text-3xl font-semibold text-slate-900">Daftar Klien VividLens</h1>
          <p className="text-sm text-slate-500 mt-1">Cari cepat, lihat status terbaru, dan buka detail klien.</p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-[minmax(240px,_1fr)_auto] lg:grid-cols-[minmax(280px,_1fr)_auto] w-full">
            <input
                type="text"
                placeholder="Cari nama atau WA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                <option value="All">Semua Status</option>
                <option value="Lunas">Lunas</option>
                <option value="DP">DP</option>
                <option value="Pending">Pending</option>
                <option value="Belum Bayar">Belum Bayar</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>
          </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full min-w-full table-fixed text-left text-sm sm:text-base border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
              <tr className="text-slate-500 uppercase text-[10px] tracking-[0.18em]">
                <th className="py-3 px-3 sm:px-5 w-[28%]">Nama</th>
                <th className="py-3 px-3 sm:px-5 w-[20%]">WA</th>
                <th className="py-3 px-3 sm:px-5 w-[10%]">Booking</th>
                <th className="py-3 px-3 sm:px-5 w-[16%]">Total</th>
                <th className="py-3 px-3 sm:px-5 w-[16%]">Status</th>
                <th className="py-3 px-3 sm:px-5 w-[10%]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredDataKlien.map((k, i) => (
                <tr key={i} className="border-b border-slate-100 bg-transparent hover:bg-slate-50 transition duration-150" style={{ height: '64px' }}>
                  <td className="py-3 px-3 sm:px-5 text-slate-900">{k.nama}</td>
                  <td className="py-3 px-3 sm:px-5 text-slate-700">{k.whatsapp || '-'}</td>
                  <td className="py-3 px-3 sm:px-5 text-slate-700">{k.booking}x</td>
                  <td className="py-3 px-3 sm:px-5 text-slate-700">Rp {(k.total / 1000).toLocaleString()} rb</td>
                  <td className="py-3 px-3 sm:px-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClasses(k.latestStatus)}`}>
                      {k.latestStatus || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-5">
                    <button onClick={() => setSelectedKlien(k)} className="text-indigo-600 hover:text-indigo-900 font-semibold">Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}