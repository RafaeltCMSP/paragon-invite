const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis de ambiente do Supabase não configuradas' }) }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { token } = event.queryStringParameters || {}

  if (!token) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token obrigatório' }) }
  }

  // Check guests first
  const { data: guest } = await supabase
    .from('guests')
    .select('name, confirmed_at, invite_token')
    .eq('invite_token', token)
    .single()

  if (guest) {
    return { statusCode: 200, headers, body: JSON.stringify({ guest }) }
  }

  // Fall back to companions table
  const { data: companion } = await supabase
    .from('companions')
    .select('name, invite_token')
    .eq('invite_token', token)
    .single()

  if (companion) {
    return { statusCode: 200, headers, body: JSON.stringify({ guest: { name: companion.name, confirmed_at: null, invite_token: companion.invite_token } }) }
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Convite não encontrado' }) }
}
