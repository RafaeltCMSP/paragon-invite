const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const secret = event.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis não configuradas' }) }
  }

  const { id } = event.queryStringParameters || {}
  if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Remove pagamentos dos acompanhantes
  const { data: comps } = await supabase.from('companions').select('id').eq('guest_id', id)
  if (comps?.length) {
    const compIds = comps.map(c => c.id)
    await supabase.from('payments').delete().in('companion_id', compIds)
  }

  // Remove acompanhantes, pagamentos do convidado e o convidado
  await supabase.from('companions').delete().eq('guest_id', id)
  await supabase.from('payments').delete().eq('guest_id', id)
  const { error } = await supabase.from('guests').delete().eq('id', id)

  if (error) {
    console.error('Delete error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao remover convidado' }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
}
