const { randomUUID }   = require('crypto')
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis de ambiente do Supabase não configuradas' }) }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { name, phone, wants_to_gift, companions = [] } = body

  if (!name || !phone) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome e telefone são obrigatórios' }) }
  }

  const inviteToken = randomUUID()
  const baseUrl     = process.env.BASE_URL || 'http://localhost:8888'
  const inviteUrl   = `${baseUrl}/convite?token=${inviteToken}`

  const { data, error } = await supabase
    .from('guests')
    .insert({
      name:          name.trim(),
      phone:         phone.trim(),
      wants_to_gift: !!wants_to_gift,
      confirmed_at:  new Date().toISOString(),
      invite_token:  inviteToken,
      invite_url:    inviteUrl,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao salvar confirmação' }) }
  }

  // Insert companions with individual invite tokens
  let insertedCompanions = []
  if (Array.isArray(companions) && companions.length > 0) {
    const rows = companions
      .filter(c => c?.name?.trim())
      .map(c => {
        const token = randomUUID()
        return {
          guest_id:      data.id,
          name:          c.name.trim(),
          wants_to_gift: !!c.wants_to_gift,
          invite_token:  token,
          invite_url:    `${baseUrl}/convite?token=${token}`,
        }
      })
    if (rows.length > 0) {
      const { data: compData, error: compError } = await supabase
        .from('companions')
        .insert(rows)
        .select('id, name, wants_to_gift, invite_url')
      if (compError) console.error('Companions insert error:', compError)
      insertedCompanions = compData || []
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ guest: data, companions: insertedCompanions }) }
}
