const { MercadoPagoConfig, Payment } = require('mercadopago')
const { createClient } = require('@supabase/supabase-js')

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { guest_id, amount, name } = body

  if (!guest_id || !amount || amount <= 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'guest_id e amount são obrigatórios' }) }
  }

  const payment = new Payment(mp)

  let result
  try {
    result = await payment.create({
      body: {
        transaction_amount: Number(amount),
        description: 'Presente de Aniversário 🎂',
        payment_method_id: 'pix',
        payer: {
          email: `guest-${guest_id}@paragon-invite.com`,
          first_name: name || 'Convidado',
        },
      },
      requestOptions: { idempotencyKey: guest_id },
    })
  } catch (err) {
    console.error('Mercado Pago error:', err)
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erro ao gerar PIX. Tente novamente.' }) }
  }

  const qr_code        = result.point_of_interaction?.transaction_data?.qr_code
  const qr_code_base64 = result.point_of_interaction?.transaction_data?.qr_code_base64

  const { error: dbError } = await supabase.from('payments').insert({
    guest_id,
    mp_payment_id: String(result.id),
    amount: Number(amount),
    status: 'pending',
    qr_code,
    qr_code_base64,
  })

  if (dbError) {
    console.error('Supabase error:', dbError)
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ payment_id: String(result.id), qr_code, qr_code_base64 }),
  }
}
