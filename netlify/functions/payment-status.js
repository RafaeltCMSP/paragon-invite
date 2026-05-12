const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis de ambiente do Supabase não configuradas' }) }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { payment_id } = event.queryStringParameters || {}

  if (!payment_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'payment_id é obrigatório' }) }
  }

  const { data, error } = await supabase
    .from('payments')
    .select('status, paid_at')
    .eq('mp_payment_id', payment_id)
    .single()

  if (error || !data) {
    return { statusCode: 404, headers, body: JSON.stringify({ status: 'not_found' }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ status: data.status, paid_at: data.paid_at }) }
}
