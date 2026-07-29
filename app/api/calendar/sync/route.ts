import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import { supabase } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, booking_id, new_start, new_end, item, detail, accessToken } = body;

    if (!accessToken) {
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

    // Tentukan durasi berdasarkan paket (dicek dari detail maupun item untuk mencegah undefined)
    const teksPaket = `${detail?.paket || ""} ${item?.paket || ""}`;
    let durasiMenit = 60;

    if (teksPaket.includes("30")) {
      durasiMenit = 30;
    } else if (
      teksPaket.includes("90") || 
      teksPaket.includes("Plaosan B") || 
      teksPaket.includes("Group Package 2") || 
      teksPaket.includes("Group Package 3") || 
      teksPaket.includes("Gold") || 
      teksPaket.includes("Premium")
    ) {
      durasiMenit = 90;
    }

    // Helper untuk menghitung waktu selesai (end time) otomatis
    const startTimeStr = item?.startTime;
    let endTimeStr = item?.endTime;
    if (startTimeStr) {
      const startObj = new Date(startTimeStr);
      const endObj = new Date(startObj.getTime() + durasiMenit * 60 * 1000);
      endTimeStr = endObj.toISOString();
    }

    if (action === 'reschedule') {
      const { data: booking } = await supabase
        .from('Booking')
        .select('google_event_id, calendar_event_id')
        .eq('id', targetBookingId)
        .single();

      const eventIdToUpdate = booking?.google_event_id || booking?.calendar_event_id;
      if (!eventIdToUpdate) {
        throw new Error("Event ID tidak ditemukan di kalender.");
      }

      await calendar.events.patch({
        calendarId: 'primary',
        eventId: eventIdToUpdate,
        requestBody: {
          start: { dateTime: new_start },
          end: { dateTime: new_end }
        },
      } as any);

      return NextResponse.json({ success: true, message: "Kalender berhasil diperbarui" });
    }

    // 1. CARI APAKAH EVENT DENGAN NAMA & TANGGAL TERSEBUT SUDAH ADA DI GOOGLE CALENDAR
    const eventSummary = `Foto: ${item.nama_klien}`;

    const existingEventsRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(new Date(startTimeStr).getTime() - 2 * 60 * 60 * 1000).toISOString(),
      timeMax: new Date(new Date(endTimeStr).getTime() + 2 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
    });

    const matchedEvent = existingEventsRes.data.items?.find(ev => 
      ev.summary === eventSummary || (ev.description && ev.description.includes(item.nama_klien))
    );

    let finalEventId = matchedEvent?.id || item?.google_event_id || item?.calendar_event_id;

    if (matchedEvent && matchedEvent.id) {
      // Jika sudah ada di Google Calendar, gunakan patch dan update waktunya sesuai durasi baru
      await calendar.events.patch({
        calendarId: 'primary',
        eventId: matchedEvent.id,
        requestBody: {
          summary: eventSummary,
          description: `Lokasi: ${detail?.lokasi || '-'}\nPaket: ${detail?.paket || item?.paket || '-'}\nFG: ${item.nama_fg || '-'}`,
          start: { dateTime: startTimeStr },
          end: { dateTime: endTimeStr },
        },
      } as any);
      finalEventId = matchedEvent.id;
    } else {
      // Jika belum ada, buat baru via insert dengan durasi yang sudah disesuaikan
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: eventSummary,
          description: `Lokasi: ${detail?.lokasi || '-'}\nPaket: ${detail?.paket || item?.paket || '-'}\nFG: ${item.nama_fg || '-'}`,
          start: { dateTime: startTimeStr },
          end: { dateTime: endTimeStr },
        },
      } as any);
      finalEventId = res.data.id;
    }

    // Simpan status dan event ID otomatis ke database Supabase
    const updatePromises = [];
    if (targetBookingId) {
      updatePromises.push(
        supabase.from('Booking').update({ google_event_id: finalEventId, calendar_event_id: finalEventId, calendar_synced: true }).eq('id', targetBookingId)
      );
    }
    if (targetJadwalId) {
      updatePromises.push(
        supabase.from('jadwal').update({ google_event_id: finalEventId, calendar_event_id: finalEventId, calendar_synced: true }).eq('id', targetJadwalId)
      );
    }
    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, eventId: finalEventId, durasi: durasiMenit });

  } catch (error: any) {
    return NextResponse.json({ error: "Gagal memproses kalender", details: error.message }, { status: 500 });
  }
}
