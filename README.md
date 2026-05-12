# 🎂 Paragon Invite — Convite Digital com PIX + Check-in

> Sistema de convite digital para aniversário: confirmação de presença, presenteio via PIX (Mercado Pago), convite individual com QR Code e painel administrativo com scanner de check-in.

**URL de produção:** https://jannyinvite.netlify.app

---

## Fluxo da Aplicação

```
[Link no WhatsApp]
        │
        ▼
[Landing Page]  (/index.html)
  └── Data, local, detalhes da festa
        │
        ▼
[Formulário de Confirmação]  (/form.html)
  ├── Nome completo
  ├── Telefone WhatsApp
  └── "Quero presentear com PIX 🎁" (opcional)
        │
     ┌──┴──────────────────────────┐
     │ (com PIX)                    │ (sem PIX)
     ▼                              ▼
[Tela de PIX]  (/payment.html)    [Sucesso direto]
  ├── QR Code gerado (Mercado Pago)      │
  ├── Código copia e cola                │
  ├── Countdown 30 min                   │
  └── Polling de status a cada 3s        │
        │                                │
        ▼                                │
[Pagamento Confirmado] ◄─────────────────┘
        │
        ▼
[Página Final]  (/success.html)
  ├── Link do convite individual
  └── Botão: "Entrar no Grupo do WhatsApp 🎉"
        │
        ▼
[Convite Individual]  (/convite.html?token=UUID)
  ├── QR Code do convite (gerado no browser)
  └── Dados do convidado + confirmação
```

---

## Painel Administrativo

Acesso: `/admin.html` — protegido por senha (`ADMIN_SECRET`)

**Funcionalidades:**
- Cards de estatísticas: Confirmados / Com PIX / Arrecadado / Pendentes / **Presentes**
- Tabela completa com todos os convidados e status de pagamento
- Coluna **Presença** com horário do check-in
- Busca por nome ou telefone
- Exportação CSV
- **Scanner de check-in:** câmera ao vivo (`getUserMedia` + `jsQR`) lê o QR Code do convite individual e registra a presença em tempo real

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | Node.js 18 + Netlify Functions (serverless) |
| **Frontend** | HTML + CSS + JavaScript vanilla |
| **Banco de dados** | Supabase (PostgreSQL + RLS) |
| **Pagamentos** | Mercado Pago REST API (PIX) — sem SDK |
| **QR Code (geração)** | qrcodejs (CDN) — `/convite.html` |
| **QR Code (leitura)** | jsQR (CDN) — scanner do admin |
| **Hospedagem** | Netlify |

---

## Estrutura do Projeto

```
paragon-invite/
├── netlify/
│   └── functions/
│       ├── confirm-guest.js      # Salva convidado, gera invite_token + invite_url
│       ├── create-payment.js     # Cria cobrança PIX no Mercado Pago (REST direto)
│       ├── payment-status.js     # Polling de status (Supabase → Mercado Pago)
│       ├── mp-webhook.js         # Webhook HMAC-SHA256 do Mercado Pago
│       ├── get-invite.js         # Retorna dados do convidado pelo token (convite.html)
│       ├── admin-guests.js       # Lista todos os convidados (protegido por x-admin-secret)
│       └── checkin-guest.js      # Registra check-in pelo invite_token (scanner)
├── public/
│   ├── index.html                # Landing page da festa
│   ├── form.html                 # Formulário de confirmação de presença
│   ├── payment.html              # Tela PIX (QR Code + copia e cola + polling)
│   ├── success.html              # Página final + link WhatsApp
│   ├── convite.html              # Convite individual com QR Code (por token)
│   ├── admin.html                # Painel administrativo + scanner de check-in
│   ├── favicon.svg               # Ícone J com coroa
│   └── assets/
│       ├── style.css             # Design system (cores, tipografia, componentes)
│       └── app.js                # (reservado)
├── supabase/
│   ├── schema.sql                # Criação inicial das tabelas guests + payments
│   ├── migration_v2.sql          # Adiciona invite_token + invite_url
│   ├── migration_v3_fix_rls.sql  # Corrige políticas RLS para chave anon
│   └── migration_v4_checkin.sql  # Adiciona checked_in_at para check-in
├── netlify.toml                  # Build config + redirect /api/* → /.netlify/functions/*
├── package.json                  # Dependências: @supabase/supabase-js
└── .env                          # Variáveis locais (gitignored)
```

---

## Banco de Dados (Supabase)

### Tabela `guests`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `name` | text | Nome do convidado |
| `phone` | text | Telefone WhatsApp |
| `wants_to_gift` | boolean | Quer dar PIX |
| `confirmed_at` | timestamptz | Data/hora da confirmação |
| `invite_token` | uuid | Token único do convite individual |
| `invite_url` | text | URL completa do convite (`/convite.html?token=…`) |
| `checked_in_at` | timestamptz | Data/hora do check-in na festa (scanner) |
| `created_at` | timestamptz | Criação do registro |

### Tabela `payments`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `guest_id` | uuid | FK → guests.id |
| `mp_payment_id` | text | ID do pagamento no Mercado Pago |
| `amount` | numeric | Valor em reais |
| `status` | text | `pending` / `approved` / `rejected` / `cancelled` |
| `qr_code` | text | Código copia e cola |
| `qr_code_base64` | text | QR Code em imagem base64 |
| `paid_at` | timestamptz | Data/hora do pagamento aprovado |
| `created_at` | timestamptz | Criação do registro |

### Migrations (executar no SQL Editor do Supabase em ordem)

```
supabase/schema.sql              ← criação inicial
supabase/migration_v2.sql        ← invite_token + invite_url
supabase/migration_v3_fix_rls.sql ← RLS permissiva (chave anon)
supabase/migration_v4_checkin.sql ← checked_in_at
```

---

## Variáveis de Ambiente

Configure em **Netlify → Site settings → Environment variables** (e no `.env` local):

```env
# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Admin
ADMIN_SECRET=SenhaSegura123

# App
BASE_URL=https://jannyinvite.netlify.app
```

> **Atenção:** evite caracteres especiais como `#`, `@` na senha — o dashboard do Netlify pode truncar o valor. Prefira usar a API do Netlify para definir variáveis com caracteres especiais.

---

## Como Rodar Localmente

```bash
git clone https://github.com/RafaeltCMSP/paragon-invite.git
cd paragon-invite

npm install

# Configure as variáveis de ambiente
cp .env.example .env   # edite com suas credenciais reais

# Sobe frontend + functions juntos
npm run dev            # equivale a: netlify dev
```

Para testar o webhook do Mercado Pago localmente:
```bash
netlify dev --live     # gera URL pública temporária
```

---

## Decisões Técnicas Relevantes

| Decisão | Motivo |
|---------|--------|
| Sem SDK do Mercado Pago | O pacote `mercadopago` v2 não bundleia corretamente no Netlify Functions — substituído por `fetch` direto à REST API |
| `payment-status.js` consulta o MP diretamente | Garante funcionamento mesmo sem webhook configurado |
| Chave Supabase é a publishable (anon), não service_role | RLS configurada com políticas permissivas para cobrir isso |
| Scanner: `getUserMedia` + `jsQR` | `html5-qrcode` falhava silenciosamente sem pedir permissão de câmera |

---

## Segurança

- Webhook do Mercado Pago validado por assinatura **HMAC-SHA256**
- Admin protegido por header `x-admin-secret` comparado com `ADMIN_SECRET` no servidor
- Variáveis sensíveis nunca expostas ao frontend
- HTTPS obrigatório (Netlify força redirect)

---

## Licença

Projeto privado — uso pessoal.
