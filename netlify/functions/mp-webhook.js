const crypto       = require('crypto')
const { createClient } = require('@supabase/supabase-js')

function validateSignature(event) {
  const xSignature = event.headers['x-signature']  || ''
  const xRequestId = event.headers['x-request-id'] || ''
  const dataId     = JSON.parse(event.body || '{}')?.data?.id || ''

  const tsMatch = xSignature.match(/ts=([^,]+)/)
  const v1Match = xSignature.match(/v1=([^,]+)/)
  if (!tsMatch || !v1Match) return false

  const ts       = tsMatch[1]
  const v1       = v1Match[1]
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts}`
  const expected = crypto
    .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
    .update(template)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  if (process.env.MP_WEBHOOK_SECRET && !validateSignature(event)) {
    return { statusCode: 401, body: 'Invalid signature' }
  }

  if (!process.env.MP_ACCESS_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: 'Missing environment variables' }
  }

  let payload
  try { payload = JSON.parse(event.body) }
  catch { return { statusCode: 400, body: 'Invalid JSON' } }

  if (payload.type !== 'payment') return { statusCode: 200, body: 'ok' }

  const mpPaymentId = String(payload.data?.id)
  if (!mpPaymentId) return { statusCode: 400, body: 'Missing payment id' }

  // Busca o pagamento via REST API — sem SDK
  let mpPayment
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })
    mpPayment = await res.json()
  } catch (err) {
    console.error('MP fetch error:', err)
    return { statusCode: 502, body: 'Failed to fetch payment' }
  }

  const status  = mpPayment.status
  const paid_at = status === 'approved' ? new Date().toISOString() : null

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  await supabase
    .from('payments')
    .update({ status, ...(paid_at && { paid_at }) })
    .eq('mp_payment_id', mpPaymentId)

  return { statusCode: 200, body: 'ok' }
}
