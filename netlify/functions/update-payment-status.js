const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const secret = event.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis não configuradas' }) }
  }

  let body
  try { body = JSON.parse(event.body) } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) } }

  const { payment_id, status } = body
  const allowed = ['pending', 'approved', 'cancelled']
  if (!payment_id || !allowed.includes(status)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'payment_id e status válido são obrigatórios' }) }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase
    .from('payments')
    .update({ status, ...(status === 'approved' ? { paid_at: new Date().toISOString() } : { paid_at: null }) })
    .eq('id', payment_id)

  if (error) {
    console.error('Update error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao atualizar status' }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
}
