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

    const targetBookingId = booking_id || item?.booking_id || detail?.id;
    const targetJadwalId = item?.id;

    // 1. Aksi RESCHEDULE
    if (action === 'reschedule') {
      const { data: booking, error: dbError } = await supabase
        .from('Booking')
        .select('google_event_id, calendar_event_id')
        .eq('id', targetBookingId)
        .single();

      const eventIdToUpdate = booking?.google_event_id || booking?.calendar_event_id;

      if (dbError || !booking || !eventIdToUpdate) {
        throw new Error("Google Event ID tidak ditemukan di database. Lakukan sync/set done terlebih dahulu.");
      }

      await calendar.events.patch({
        calendarId: 'primary',
        eventId: eventIdToUpdate,
        requestBody: {
          start: { dateTime: new_start },
          end: { dateTime: new_end }
        },
      });

      console.log("DEBUG: Reschedule sukses ke Google Calendar.");
      return NextResponse.json({ success: true, message: "Kalender berhasil diperbarui" });
    }

    // 2. Aksi SYNC / CEK APAKAH SUDAH PERNAH ADA EVENT ID-NYA
    // Cek di tabel jadwal & booking apakah sudah ada event ID sebelumnya
    let existingEventId = item?.google_event_id || item?.calendar_event_id;

    if (!existingEventId && targetJadwalId) {
      const { data: jadwalData } = await supabase
        .from('jadwal')
        .select('google_event_id, calendar_event_id')
        .eq('id', targetJadwalId)
        .single();
      existingEventId = jadwalData?.google_event_id || jadwalData?.calendar_event_id;
    }

    if (!existingEventId && targetBookingId) {
      const { data: bookingData } = await supabase
        .from('Booking')
        .select('google_event_id, calendar_event_id')
        .eq('id', targetBookingId)
        .single();
      existingEventId = bookingData?.google_event_id || bookingData?.calendar_event_id;
    }

    let finalEventId = existingEventId;

    if (existingEventId) {
      // Jika event sudah pernah dibuat sebelumnya, CUKUP UPDATE (PATCH) agar tidak double!
      try {
        await calendar.events.patch({
          calendarId: 'primary',
          eventId: existingEventId,
          requestBody: {
            summary: `Foto: ${item.nama_klien}`,
            description: `Lokasi: ${detail?.lokasi || '-'}\nPaket: ${detail?.paket || '-'}\nFG: ${item.nama_fg || '-'}`,
            start: { dateTime: item.startTime },
            end: { dateTime: item.endTime },
          },
        });
        console.log("DEBUG: Event sudah ada, berhasil di-update (tanpa double):", existingEventId);
      } catch (patchErr) {
        // Jika event aslinya sudah terhapus di Google Calendar, buat baru (insert)
        console.warn("Event lama tidak ditemukan di Google Calendar, membuat baru...", patchErr);
        const resNew = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `Foto: ${item.nama_klien}`,
            description: `Lokasi: ${detail?.lokasi || '-'}\nPaket: ${detail?.paket || '-'}\nFG: ${item.nama_fg || '-'}`,
            start: { dateTime: item.startTime },
            end: { dateTime: item.endTime },
          },
        });
        finalEventId = resNew.data.id;
      }
    } else {
      // Jika benar-benar belum pernah sync, buat baru (insert)
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `Foto: ${item.nama_klien}`,
          description: `Lokasi: ${detail?.lokasi || '-'}\nPaket: ${detail?.paket || '-'}\nFG: ${item.nama_fg || '-'}`,
          start: { dateTime: item.startTime },
          end: { dateTime: item.endTime },
        },
      });
      finalEventId = res.data.id;
    }

    // Update status dan event ID ke database Supabase
    const updatePromises = [];

    if (targetBookingId) {
      updatePromises.push(
        supabase
          .from('Booking')
          .update({ 
            google_event_id: finalEventId, 
            calendar_event_id: finalEventId,
            calendar_synced: true 
          })
          .eq('id', targetBookingId)
      );
    }

    if (targetJadwalId) {
      updatePromises.push(
        supabase
          .from('jadwal')
          .update({ 
            google_event_id: finalEventId, 
            calendar_event_id: finalEventId,
            calendar_synced: true 
          })
          .eq('id', targetJadwalId)
      );
    }

    await Promise.all(updatePromises);

    console.log("DEBUG: Sync aman, Event ID:", finalEventId);
    return NextResponse.json({ success: true, eventId: finalEventId });
    
  } catch (error: any) {
    console.error("DEBUG ERROR LENGKAP:", error);
    return NextResponse.json({ 
      error: "Gagal memproses kalender", 
      details: error.message 
    }, { status: 500 });
  }
}
