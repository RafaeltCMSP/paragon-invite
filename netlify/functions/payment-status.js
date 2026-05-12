const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variáveis Supabase não configuradas' }) }
  }

  const { payment_id } = event.queryStringParameters || {}
  if (!payment_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'payment_id é obrigatório' }) }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // 1. Lê o status atual no Supabase
  const { data } = await supabase
    .from('payments')
    .select('status, paid_at')
    .eq('mp_payment_id', payment_id)
    .single()

  // Se já está aprovado/rejeitado no banco, retorna direto
  if (data?.status && data.status !== 'pending') {
    return { statusCode: 200, headers, body: JSON.stringify({ status: data.status, paid_at: data.paid_at }) }
  }

  // 2. Status ainda pending — consulta o Mercado Pago diretamente
  if (process.env.MP_ACCESS_TOKEN) {
    try {
      const mpRes     = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      })
      const mpPayment = await mpRes.json()
      const mpStatus  = mpPayment?.status

      if (mpStatus && mpStatus !== 'pending') {
        const paid_at = mpStatus === 'approved' ? new Date().toISOString() : null

        // Atualiza o Supabase para manter consistência
        await supabase
          .from('payments')
          .update({ status: mpStatus, ...(paid_at && { paid_at }) })
          .eq('mp_payment_id', payment_id)

        return { statusCode: 200, headers, body: JSON.stringify({ status: mpStatus, paid_at }) }
      }
    } catch (err) {
      console.error('MP status check error:', err)
      // Falha silenciosa — retorna o status do banco mesmo
    }
  }

  // 3. Ainda pending em ambos
  return { statusCode: 200, headers, body: JSON.stringify({ status: data?.status || 'pending' }) }
}
