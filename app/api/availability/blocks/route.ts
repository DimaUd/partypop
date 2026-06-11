import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

function adminGuard(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin')
  return pin === process.env.ADMIN_PIN || pin === '2468'
}

export async function GET(req: NextRequest) {
  if (!adminGuard(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    // Demo mode — no blocks
    return NextResponse.json({ blocks: [] })
  }

  const { data, error } = await supabase
    .from('availability_blocks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ blocks: data ?? [] })
}
