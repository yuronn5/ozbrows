// app/api/availability/route.ts
import { NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  Vary: 'x-admin-key',
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'date required' }, { status: 400, headers: noCache });
    }

    const adminKey = (req.headers.get('x-admin-key') || '').trim();
    const isAdmin = adminKey && adminKey === process.env.ADMIN_KEY;

    const store = getStore({ name: 'bookings' });
    const day = (await store.get(date, { type: 'json' })) || { blocked: [], bookings: [] };

    const safeBookings = isAdmin
      ? (day.bookings || [])
      : (day.bookings || []).map((b: any) => ({ time: b.time, name: 'Зайнято' }));

    return new NextResponse(
      JSON.stringify({ blocked: day.blocked || [], bookings: safeBookings }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...noCache } }
    );
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500, headers: noCache });
  }
}
