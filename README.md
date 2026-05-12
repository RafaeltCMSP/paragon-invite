# 🎂 Paragon Invite — Sistema de Confirmação de Presença com PIX

> Sistema de convite digital para aniversário com confirmação de presença e presenteio via PIX integrado ao Mercado Pago.

---

## Visão Geral

O **Paragon Invite** é uma aplicação web pensada para tornar o processo de confirmação de presença em festas de aniversário mais fácil, bonito e moderno. O convidado recebe um link pelo WhatsApp, acessa no celular e em poucos passos confirma a presença e, se quiser, envia um presente via PIX — tudo sem sair do navegador.

---

## Fluxo da Aplicação

```
[Convite no WhatsApp]
        │
        ▼
[Landing Page do Convite]
  └── Apresentação do evento (data, local, mensagem especial)
        │
        ▼
[Formulário de Confirmação]
  ├── Nome completo
  ├── Telefone (WhatsApp)
  └── Checkbox destacado: "Quero presentear com PIX 🎁"
        │
     ┌──┴──────────────────────┐
     │ (checkbox marcado)       │ (checkbox desmarcado)
     ▼                          ▼
[Tela de PIX]            [Confirmação direta]
  ├── Campo: valor               │
  ├── QR Code gerado             │
  └── Código Copia e Cola        │
        │                        │
        ▼                        │
[Aguardando Pagamento]           │
  └── Polling status Mercado Pago│
        │                        │
        ▼                        │
[Pagamento Confirmado] ◄─────────┘
        │
        ▼
[Página Final]
  ├── Mensagem especial personalizada
  └── Botão: "Entrar no Grupo do WhatsApp 🎉"
```

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | Node.js + Netlify Functions (serverless) |
| **Frontend** | HTML + CSS + JavaScript (Vanilla) |
| **Banco de dados** | Supabase (PostgreSQL) |
| **Pagamentos** | Mercado Pago API (PIX) |
| **Hospedagem** | Netlify (frontend + functions no mesmo deploy) |

---

## Estrutura do Projeto

```
paragon-invite/
├── netlify/
│   └── functions/
│       ├── confirm-guest.js      # Salva convidado e confirmação no Supabase
│       ├── create-payment.js     # Gera cobrança PIX no Mercado Pago
│       ├── payment-status.js     # Consulta status do pagamento (polling)
│       └── mp-webhook.js         # Webhook de notificação do Mercado Pago
├── public/
│   ├── index.html                # Landing page do convite
│   ├── form.html                 # Formulário de confirmação
│   ├── payment.html              # Tela de PIX (QR Code + Copia e Cola)
│   ├── success.html              # Página final com mensagem especial
│   └── assets/
│       ├── style.css
│       └── app.js
├── netlify.toml                  # Configuração do Netlify (redirects, functions)
├── .env.example
├── package.json
└── README.md
```

---

## Banco de Dados (Supabase)

### Tabela `guests`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `name` | text | Nome do convidado |
| `phone` | text | Telefone (WhatsApp) |
| `wants_to_gift` | boolean | Marcou o checkbox de presente |
| `confirmed_at` | timestamp | Data/hora da confirmação |
| `created_at` | timestamp | Data de criação do registro |

### Tabela `payments`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `guest_id` | uuid | FK → guests |
| `mp_payment_id` | text | ID do pagamento no Mercado Pago |
| `amount` | numeric | Valor em reais |
| `status` | text | `pending` / `approved` / `rejected` |
| `qr_code` | text | Código copia e cola |
| `qr_code_base64` | text | QR Code em base64 |
| `paid_at` | timestamp | Data/hora do pagamento aprovado |
| `created_at` | timestamp | Data de criação |

---

## Integrações

### Mercado Pago — PIX

- Geração de cobrança PIX via **Payments API**
- QR Code dinâmico exibido na tela
- Código **Copia e Cola** para facilitar o pagamento
- Confirmação via **Webhook** (`/webhooks/mercadopago`) ou polling periódico
- Ambiente sandbox disponível para testes

### Supabase

- Persistência de convidados e pagamentos
- Row Level Security (RLS) configurado
- Realtime opcional para atualização de status de pagamento

---

## Variáveis de Ambiente

```env
# Mercado Pago
MP_ACCESS_TOKEN=your_access_token_here
MP_WEBHOOK_SECRET=your_webhook_secret_here

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App
PORT=3000
BASE_URL=https://seu-dominio.com
WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/xxxx
```

---

## Como Rodar Localmente

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/paragon-invite.git
cd paragon-invite

# Instale as dependências (inclui Netlify CLI)
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais

# Inicie o servidor de desenvolvimento (frontend + functions juntos)
npm run dev
# equivale a: netlify dev
```

> O `netlify dev` sobe o frontend estático e as Functions localmente na mesma porta, simulando o ambiente de produção. Para testar o webhook do Mercado Pago, utilize `netlify dev --live` para obter uma URL pública temporária.

## Deploy no Netlify

```bash
# Primeira vez: conecte o repositório pelo painel do Netlify
# ou via CLI:
netlify login
netlify init

# Deploy de produção
netlify deploy --prod
```

As variáveis de ambiente devem ser configuradas em **Netlify → Site settings → Environment variables**.

---

## Roadmap

- [x] Definição do fluxo e arquitetura
- [ ] Setup inicial do projeto (Node + Netlify Functions)
- [ ] Configuração do `netlify.toml`
- [ ] Configuração do Supabase (tabelas + RLS)
- [ ] Netlify Function — `confirm-guest` (salvar convidado)
- [ ] Netlify Function — `create-payment` (gerar PIX)
- [ ] Netlify Function — `payment-status` (polling de status)
- [ ] Netlify Function — `mp-webhook` (confirmação assíncrona)
- [ ] Frontend — Landing page do convite
- [ ] Frontend — Formulário de confirmação
- [ ] Frontend — Tela de pagamento PIX
- [ ] Frontend — Página final com mensagem e link do grupo
- [ ] Testes com ambiente sandbox do Mercado Pago
- [ ] Deploy no Netlify

---

## Segurança

- Webhook do Mercado Pago validado por assinatura HMAC
- Variáveis sensíveis nunca expostas ao cliente
- Service Role Key do Supabase usada apenas no backend
- HTTPS obrigatório em produção

---

## Licença

Projeto privado — uso pessoal.
