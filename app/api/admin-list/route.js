import { NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'x-admin-key',
};

function isDateStr(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const adminKey = (req.headers.get('x-admin-key') || '').trim();
    const isAdmin = !!adminKey && adminKey === process.env.ADMIN_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: noCache });
    }

    if (!start || !end || !isDateStr(start) || !isDateStr(end)) {
      return NextResponse.json({ error: 'start & end (YYYY-MM-DD) required' }, { status: 400, headers: noCache });
    }

    const store = getStore({ name: 'bookings' });
    const rows = [];
    let cursor = undefined;

    do {
      const page = await store.list({ cursor });
      for (const item of page.blobs) {
        const key = item.key;
        if (!isDateStr(key)) continue;
        if (key < start || key > end) continue;

        const raw = await store.get(key, { type: 'json' });
        const day = raw || { blocked: [], bookings: [] };
        for (const b of day.bookings || []) {
          rows.push({
            date: key,
            time: b.time,
            name: b.name || '',
            phone: b.phone || '',
            paid: !!b.paid,
            paymentId: b.paymentId || '',
          });
        }
      }
      cursor = page.cursor;
    } while (cursor);

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    return new NextResponse(JSON.stringify({ rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...noCache },
    });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500, headers: noCache });
  }
}
