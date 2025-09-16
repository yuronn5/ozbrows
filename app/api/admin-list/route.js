import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "x-admin-key",
};

const STEP = 15; // хв: 15-хв крок

function isDateStr(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function parseTime(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/** усі 15-хв точки інтервалу від часу start на duration хв (включно зі стартом) */
function spanTimes(startStr, durationMin, step = STEP) {
  const start = parseTime(startStr);
  const end = start + Math.max(0, Number(durationMin) || 0);
  const out = [];
  out.push(startStr);
  for (let t = Math.ceil(start / step) * step; t < end; t += step) {
    out.push(minutesToTime(t));
  }
  return out;
}
/** з масиву точок виду ["09:00","09:15",...] робить консолідовані інтервали */
function consolidateBlocked(points, step = STEP) {
  const arr = Array.from(new Set(points)).sort((a, b) => parseTime(a) - parseTime(b));
  const blocks = [];
  let i = 0;
  while (i < arr.length) {
    const startStr = arr[i];
    let count = 1;
    let prev = parseTime(startStr);
    i++;
    while (i < arr.length && parseTime(arr[i]) - prev === step) {
      count++;
      prev = parseTime(arr[i]);
      i++;
    }
    blocks.push({ time: startStr, durationMin: count * step });
  }
  return blocks;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const adminKey = (req.headers.get("x-admin-key") || "").trim();
    const isAdmin = !!adminKey && adminKey === process.env.ADMIN_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noCache });
    }

    if (!start || !end || !isDateStr(start) || !isDateStr(end)) {
      return NextResponse.json(
        { error: "start & end (YYYY-MM-DD) required" },
        { status: 400, headers: noCache }
      );
    }

    const store = getStore({ name: "bookings" });
    const rows = [];
    let cursor = undefined;

    do {
      const page = await store.list({ cursor });
      for (const item of page.blobs) {
        const key = item.key;
        if (!isDateStr(key)) continue;
        if (key < start || key > end) continue;

        const raw = await store.get(key, { type: "json" });
        const day = raw || { blocked: [], bookings: [] };

        // 1) звичайні бронювання
        for (const b of day.bookings || []) {
          rows.push({
            date: key,
            time: b.time,
            name: b.name || "",
            phone: b.phone || "",
            paid: !!b.paid,
            paymentId: b.paymentId || "",
            serviceTitle: b.serviceTitle || "",
            price: b.price || "",
            durationMin: Number.isFinite(b?.durationMin) ? b.durationMin : 45,
            isBlock: false,
          });
        }

        // 2) чисті адмін-блоки = blocked - усі інтервали бронювань
        const blockedSet = new Set(day.blocked || []);
        for (const b of day.bookings || []) {
          const pts = spanTimes(b.time, b?.durationMin ?? 45);
          pts.forEach((t) => blockedSet.delete(t));
        }
        const blocks = consolidateBlocked(Array.from(blockedSet));
        for (const blk of blocks) {
          rows.push({
            date: key,
            time: blk.time,
            name: "",
            phone: "",
            paid: false,
            paymentId: "",
            serviceTitle: "",
            price: "",
            durationMin: blk.durationMin,
            isBlock: true,
          });
        }
      }
      cursor = page.cursor;
    } while (cursor);

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    return new NextResponse(JSON.stringify({ rows }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...noCache },
    });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500, headers: noCache });
  }
}
