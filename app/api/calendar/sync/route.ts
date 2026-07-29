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

    // 1. Aksi RESCHEDULE
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
      });

      return NextResponse.json({ success: true, message: "Kalender berhasil diperbarui" });
    }

    // 2. CEK APAKAH SUDAH ADA EVENT ID DI DATABASE
    let existingEventId = item?.google_event_id || item?.calendar_event_id;

    if (!existingEventId && targetJadwalId) {
      const { data: jData } = await supabase
        .from('jadwal')
        .select('google_event_id, calendar_event_id')
        .eq('id', targetJadwalId)
        .single();
      existingEventId = jData?.google_event_id || jData?.calendar_event_id;
    }

    if (!existingEventId && targetBookingId) {
      const { data: bData } = await supabase
        .from('Booking')
        .select('google_event_id, calendar_event_id')
        .eq('id', targetBookingId)
        .single();
      existingEventId = bData?.google_event_id || bData?.calendar_event_id;
    }

    let finalEventId = existingEventId;

    if (existingEventId) {
      // JIKA SUDAH ADA: Cukup PATCH (Update jam/tanggal), JANGAN INSERT LAGI BIAR TIDAK DOUBLE!
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
      } catch (err) {
        // Kalau ternyata event aslinya sudah terhapus manual di Google Calendar, buat baru
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
      // JIKA BELUM ADA SAMA SEKALI: Baru buat event baru (Insert)
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

    // Simpan status dan event ID ke database secara serentak
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

    return NextResponse.json({ success: true, eventId: finalEventId });

  } catch (error: any) {
    return NextResponse.json({ error: "Gagal memproses kalender", details: error.message }, { status: 500 });
  }
}
