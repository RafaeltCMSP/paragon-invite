const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'GET')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const secret = event.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis de ambiente do Supabase não configuradas' }) }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('guests')
    .select(`
      id, name, phone, wants_to_gift, confirmed_at, invite_url, invite_token, checked_in_at,
      payments ( amount, status, paid_at ),
      companions ( id, name, wants_to_gift )
    `)
    .order('confirmed_at', { ascending: false })

  if (error) {
    console.error('Supabase error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao buscar convidados' }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ guests: data }) }
}
