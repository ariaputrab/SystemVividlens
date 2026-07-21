import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  // Ambil token dari session NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token || !(token as any).accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: (token as any).accessToken });
  
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    // Ambil daftar event dari Google Calendar
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(), // Mulai dari waktu sekarang
      singleEvents: true,
      orderBy: 'startTime',
    });

    return NextResponse.json({ events: res.data.items });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}