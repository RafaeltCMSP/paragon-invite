const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const { token } = event.queryStringParameters || {}

  if (!token) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token obrigatório' }) }
  }

  const { data, error } = await supabase
    .from('guests')
    .select('name, confirmed_at, invite_token')
    .eq('invite_token', token)
    .single()

  if (error || !data) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Convite não encontrado' }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ guest: data }) }
}
