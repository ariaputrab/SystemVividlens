'use client';
import { useState, useEffect } from 'react';

// Menggunakan require agar tidak terkena strict module resolution error dari TypeScript
const { supabase } = require('../lib/supabase');

export default function DashboardStats() {
  const [stats, setStats] = useState({
    todayBookings: 0,
    monthBookings: 0,
    todayIncome: 0,
    monthIncome: 0,
    totalLunas: 0,
    totalCancel: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: bookings, error } = await supabase.from('bookings').select('*');
        
        if (error || !bookings) return;

        const today = new Date().toISOString().split('T')[0];
        const month = new Date().toISOString().slice(0, 7);

        setStats({
          todayBookings: bookings.filter((b: any) => b.booking_date === today).length,
          monthBookings: bookings.filter((b: any) => b.booking_date.startsWith(month)).length,
          todayIncome: bookings
            .filter((b: any) => b.booking_date === today && b.status === 'lunas')
            .reduce((acc: number, b: any) => acc + (Number(b.total_price) || 0), 0),
          monthIncome: bookings
            .filter((b: any) => b.booking_date.startsWith(month) && b.status === 'lunas')
            .reduce((acc: number, b: any) => acc + (Number(b.total_price) || 0), 0),
          totalLunas: bookings.filter((b: any) => b.status === 'lunas').length,
          totalCancel: bookings.filter((b: any) => b.status === 'cancel').length,
        });
      } catch (err) {
        console.error("Gagal ambil data:", err);
      }
    }
    fetchData();
  }, []);

  const items = [
    { label: 'Booking Hari Ini', value: stats.todayBookings },
    { label: 'Booking Bulan Ini', value: stats.monthBookings },
    { label: 'Pendapatan Hari Ini', value: `Rp ${stats.todayIncome.toLocaleString('id-ID')}` },
    { label: 'Pendapatan Bulan Ini', value: `Rp ${stats.monthIncome.toLocaleString('id-ID')}` },
    { label: 'Total Lunas', value: stats.totalLunas },
    { label: 'Total Cancel', value: stats.totalCancel },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">{item.label}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{item.value}</h3>
        </div>
      ))}
    </div>
  );
}