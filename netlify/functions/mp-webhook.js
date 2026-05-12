const crypto = require('crypto')
const { MercadoPagoConfig, Payment } = require('mercadopago')
const { createClient } = require('@supabase/supabase-js')

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function validateSignature(event) {
  const xSignature  = event.headers['x-signature'] || ''
  const xRequestId  = event.headers['x-request-id'] || ''
  const dataId      = JSON.parse(event.body || '{}')?.data?.id || ''

  const tsMatch = xSignature.match(/ts=([^,]+)/)
  const v1Match = xSignature.match(/v1=([^,]+)/)
  if (!tsMatch || !v1Match) return false

  const ts        = tsMatch[1]
  const v1        = v1Match[1]
  const template  = `id:${dataId};request-id:${xRequestId};ts:${ts}`
  const expected  = crypto.createHmac('sha256', process.env.MP_WEBHOOK_SECRET).update(template).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  if (process.env.MP_WEBHOOK_SECRET && !validateSignature(event)) {
    return { statusCode: 401, body: 'Invalid signature' }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  if (payload.type !== 'payment') return { statusCode: 200, body: 'ok' }

  const mpPaymentId = String(payload.data?.id)
  if (!mpPaymentId) return { statusCode: 400, body: 'Missing payment id' }

  const paymentClient = new Payment(mp)
  let mpPayment
  try {
    mpPayment = await paymentClient.get({ id: mpPaymentId })
  } catch (err) {
    console.error('MP fetch error:', err)
    return { statusCode: 502, body: 'Failed to fetch payment' }
  }

  const status  = mpPayment.status
  const paid_at = status === 'approved' ? new Date().toISOString() : null

  await supabase
    .from('payments')
    .update({ status, ...(paid_at && { paid_at }) })
    .eq('mp_payment_id', mpPaymentId)

  return { statusCode: 200, body: 'ok' }
}
