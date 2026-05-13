;(async () => {
  const raw = localStorage.getItem('pending_pix')
  if (!raw) return

  let stored
  try { stored = JSON.parse(raw) } catch { localStorage.removeItem('pending_pix'); return }

  // Expirado após 30 minutos
  if (!stored.saved_at || Date.now() - stored.saved_at > 30 * 60 * 1000) {
    localStorage.removeItem('pending_pix')
    return
  }

  const payments = stored.payments
  if (!payments?.length) { localStorage.removeItem('pending_pix'); return }

  // Verifica status do primeiro pagamento ainda pendente
  try {
    const res  = await fetch(`/api/payment-status?payment_id=${payments[0].payment_id}`)
    const data = await res.json()
    if (data.status !== 'pending') { localStorage.removeItem('pending_pix'); return }
  } catch { return }

  // Monta resumo
  const total = payments.reduce((s, p) => s + parseFloat(String(p.amount).replace(',', '.')), 0)
  const names = payments.map(p => esc(p.label)).join(' e ')

  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  }

  // Injeta modal
  const modal = document.createElement('div')
  modal.id = 'pix-recovery-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;justify-content:center;padding:0'
  modal.innerHTML = `
    <div style="background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 40px;max-width:480px;width:100%;box-shadow:0 -8px 40px rgba(0,0,0,0.2)">
      <div style="font-size:2.2rem;text-align:center;margin-bottom:10px">💳</div>
      <h3 style="text-align:center;color:#5C2D44;font-family:'Nunito',sans-serif;font-size:1.15rem;margin-bottom:8px">Você tem um PIX pendente!</h3>
      <p style="text-align:center;color:#888;font-family:'Nunito',sans-serif;font-size:0.9rem;margin-bottom:24px;line-height:1.5">
        Um PIX de <strong style="color:#5C2D44">R$ ${total.toFixed(2).replace('.', ',')}</strong>
        para <strong>${names}</strong> ainda não foi concluído.
      </p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button id="pix-recovery-go"
          style="background:#A0395A;border:none;color:#fff;padding:15px;border-radius:100px;font-family:'Nunito',sans-serif;font-size:0.95rem;font-weight:700;cursor:pointer;width:100%">
          💳 Concluir Pagamento
        </button>
        <button id="pix-recovery-cancel"
          style="background:#F5EFF2;border:1.5px solid #DDD0D6;color:#888;padding:13px;border-radius:100px;font-family:'Nunito',sans-serif;font-size:0.88rem;font-weight:700;cursor:pointer;width:100%">
          Cancelar e voltar ao formulário
        </button>
      </div>
    </div>
  `
  document.body.appendChild(modal)

  document.getElementById('pix-recovery-go').addEventListener('click', () => {
    modal.remove()
    window.location.href = '/payment.html'
  })

  document.getElementById('pix-recovery-cancel').addEventListener('click', () => {
    localStorage.removeItem('pending_pix')
    modal.remove()
    window.location.href = '/form.html'
  })
})()
