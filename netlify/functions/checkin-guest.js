const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const secret = event.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis não configuradas' }) }
  }

  let body
  try { body = JSON.parse(event.body) }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) } }

  const { token } = body
  if (!token) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token obrigatório' }) }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: guest, error } = await supabase
    .from('guests')
    .select('id, name, phone, checked_in_at')
    .eq('invite_token', token)
    .single()

  if (error || !guest) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Convidado não encontrado' }) }
  }

  if (guest.checked_in_at) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ guest: { name: guest.name }, already_checked_in: true, checked_in_at: guest.checked_in_at }),
    }
  }

  const now = new Date().toISOString()

  await supabase
    .from('guests')
    .update({ checked_in_at: now })
    .eq('id', guest.id)

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ guest: { name: guest.name }, already_checked_in: false, checked_in_at: now }),
  }
}
