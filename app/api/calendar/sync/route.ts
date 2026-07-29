import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import { supabase } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, booking_id, new_start, new_end, item, detail, accessToken } = body;

    console.log("DEBUG API: Aksi:", action, "| booking_id:", booking_id || item?.booking_id);

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
      const targetId = booking_id || item?.booking_id;
      const { data: booking, error: dbError } = await supabase
        .from('Booking')
        .select('google_event_id')
        .eq('id', targetId)
        .single();

      if (dbError || !booking || !booking.google_event_id) {
        console.error("DEBUG DB ERROR:", dbError);
        throw new Error("Google Event ID tidak ditemukan di database untuk reschedule.");
      }

      await calendar.events.patch({
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

    // 2. Aksi SYNC PERTAMA (Insert Event Baru)
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Foto: ${item.nama_klien}`,
        description: `Lokasi: ${detail?.lokasi || '-'}\nPaket: ${detail?.paket || '-'}\nFG: ${item.nama_fg || '-'}`,
        start: { dateTime: item.startTime },
        end: { dateTime: item.endTime },
        extendedProperties: {
          private: { booking_id: String(item.booking_id || detail?.id) }
        }
      },
    });

    const eventId = res.data.id;
    const targetBookingId = item.booking_id || detail?.id;
    const targetJadwalId = item.id;

    // SIMPAN KE KEDUA TABEL AGAR TIDAK HANCUR LAGI
    const updatePromises = [];

    if (targetBookingId) {
      updatePromises.push(
        supabase
          .from('Booking')
          .update({ 
            google_event_id: eventId, 
            calendar_synced: true, 
            calendar_event_id: eventId 
          })
          .eq('id', targetBookingId)
      );
    }

    if (targetJadwalId) {
      updatePromises.push(
        supabase
          .from('jadwal')
          .update({ 
            google_event_id: eventId, 
            calendar_synced: true, 
            calendar_event_id: eventId 
          })
          .eq('id', targetJadwalId)
      );
    }

    await Promise.all(updatePromises);

    console.log("DEBUG: Sync sukses, Event ID:", eventId);
    return NextResponse.json({ success: true, eventId: eventId });
    
  } catch (error: any) {
    console.error("DEBUG ERROR LENGKAP:", error);
    return NextResponse.json({ 
      error: "Gagal memproses kalender", 
      details: error.message 
    }, { status: 500 });
  }
}
