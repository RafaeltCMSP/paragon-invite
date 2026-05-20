const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const secret = event.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.MP_ACCESS_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis não configuradas' }) }
  }

  let body
  try { body = JSON.parse(event.body) } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) } }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const PIX_EXPIRY_MS = 30 * 60 * 1000

  async function syncOne(payment) {
    let mpPayment
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}`, {
        headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      })
      mpPayment = await res.json()
    } catch {
      return { id: payment.id, error: 'mp_fetch_failed' }
    }

    const mpStatus = mpPayment?.status
    const age = Date.now() - new Date(payment.created_at).getTime()

    // Determina o status final: se MP retorna pending mas PIX expirou, cancela
    let finalStatus = mpStatus
    if (mpStatus === 'pending' && age > PIX_EXPIRY_MS) {
      finalStatus = 'cancelled'
    }

    if (!finalStatus || finalStatus === payment.status) {
      return { id: payment.id, status: payment.status, changed: false }
    }

    const updateFields = { status: finalStatus }
    if (finalStatus === 'approved') updateFields.paid_at = new Date().toISOString()

    const { error } = await supabase
      .from('payments')
      .update(updateFields)
      .eq('id', payment.id)

    if (error) return { id: payment.id, error: 'db_update_failed' }
    return { id: payment.id, status: finalStatus, changed: true }
  }

  // ---- Sincronização em massa ----
  if (body.sync_all) {
    const { data: pending, error } = await supabase
      .from('payments')
      .select('id, mp_payment_id, status, created_at')
      .eq('status', 'pending')

    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao buscar pendentes' }) }
    if (!pending?.length) return { statusCode: 200, headers, body: JSON.stringify({ ok: true, synced: 0, results: [] }) }

    const results = []
    for (const p of pending) {
      results.push(await syncOne(p))
    }

    const synced = results.filter(r => r.changed).length
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, synced, results }) }
  }

  // ---- Sincronização individual ----
  const { payment_id } = body
  if (!payment_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'payment_id é obrigatório' }) }
  }

  const { data: payment, error: fetchErr } = await supabase
    .from('payments')
    .select('id, mp_payment_id, status, created_at')
    .eq('id', payment_id)
    .single()

  if (fetchErr || !payment) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pagamento não encontrado' }) }
  }

  if (!payment.mp_payment_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pagamento sem ID do Mercado Pago' }) }
  }

  const result = await syncOne(payment)
  if (result.error) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: result.error }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) }
}
