const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  if (!process.env.MP_ACCESS_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Token do Mercado Pago não configurado' }) }
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis Supabase não configuradas' }) }
  }

  let body
  try { body = JSON.parse(event.body) }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const { guest_id, amount, name } = body

  if (!guest_id || !amount || Number(amount) <= 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'guest_id e amount são obrigatórios' }) }
  }

  // Chama a REST API do Mercado Pago diretamente — sem SDK
  let mpData
  try {
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization':    `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type':     'application/json',
        'X-Idempotency-Key': guest_id,
      },
      body: JSON.stringify({
        transaction_amount: Number(amount),
        description:        'Presente de Aniversário 🎂',
        payment_method_id:  'pix',
        payer: {
          email: `convidado.${Date.now()}@paragon-invite.com`,
        },
      }),
    })

    mpData = await mpRes.json()

    if (!mpRes.ok) {
      console.error('MP error:', JSON.stringify(mpData))
      const msg = mpData?.message || mpData?.cause?.[0]?.description || 'Erro ao gerar PIX'
      return { statusCode: 502, headers, body: JSON.stringify({ error: msg }) }
    }
  } catch (err) {
    console.error('MP fetch error:', err)
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erro ao conectar com Mercado Pago' }) }
  }

  const qr_code        = mpData.point_of_interaction?.transaction_data?.qr_code
  const qr_code_base64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error: dbError } = await supabase.from('payments').insert({
    guest_id,
    mp_payment_id: String(mpData.id),
    amount:        Number(amount),
    status:        'pending',
    qr_code,
    qr_code_base64,
  })

  if (dbError) console.error('Supabase insert error:', dbError)

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ payment_id: String(mpData.id), qr_code, qr_code_base64 }),
  }
}
