import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import { supabase } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, booking_id, new_start, new_end, item, detail, accessToken } = body;

    // Log untuk debugging di terminal
    console.log("DEBUG API: Aksi:", action, "| booking_id:", booking_id);

    // Validasi accessToken (Pastikan ini dikirim dari Frontend)
    if (!accessToken) {
      console.error("DEBUG API ERROR: Token tidak ditemukan dalam request body");
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 401 });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // 1. Aksi RESCHEDULE
    if (action === 'reschedule') {
      const { data: booking, error: dbError } = await supabase
        .from('Booking')
        .select('google_event_id')
        .eq('id', booking_id)
        .single();

      if (dbError || !booking) {
        console.error("DEBUG DB ERROR:", dbError);
        throw new Error("Gagal mengambil data booking dari database");
      }

      if (!booking.google_event_id) {
        throw new Error("Event ID tidak ditemukan. Harap lakukan 'Set Done' terlebih dahulu.");
      }

      const res = await calendar.events.patch({
        calendarId: 'primary',
        eventId: booking.google_event_id,
        requestBody: {
          start: { dateTime: new_start },
          end: { dateTime: new_end }
        },
      });

      console.log("DEBUG: Reschedule sukses ke Google Calendar.");
      return NextResponse.json({ success: true, message: "Kalender berhasil diperbarui" });
    }

    // 2. Aksi SYNC PERTAMA (Set Done)
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Foto: ${item.nama_klien}`,
        description: `Lokasi: ${detail.lokasi || '-'}\nPaket: ${detail.paket || '-'}\nFG: ${item.nama_fg || '-'}`,
        start: { dateTime: item.startTime },
        end: { dateTime: item.endTime },
        extendedProperties: {
          private: { booking_id: String(item.booking_id) }
        }
      },
    });

    // Simpan google_event_id ke database
    await supabase
      .from('Booking')
      .update({ google_event_id: res.data.id })
      .eq('id', item.booking_id);

    return NextResponse.json({ success: true, eventId: res.data.id });
    
  } catch (error: any) {
    console.error("DEBUG ERROR LENGKAP:", error);
    return NextResponse.json({ 
      error: "Gagal memproses kalender", 
      details: error.message 
    }, { status: 500 });
  }
}