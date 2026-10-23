// Called daily by Vercel cron (see vercel.json) to keep the Supabase free-tier
// project from pausing after 7 days of inactivity. RLS hides catalog rows from
// anon, so this returns [] — the query still counts as database activity.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false })
  }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase env vars' })
  }

  const r = await fetch(`${url}/rest/v1/catalog?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status })
}
