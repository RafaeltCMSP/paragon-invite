# 🎂 Paragon Invite — Sistema de Convite Digital

> Plataforma completa de convite digital para eventos: confirmação de presença, presenteio via PIX (Mercado Pago), convites individuais com QR Code, check-in na entrada e painel administrativo responsivo.

**Produção:** https://jannyinvite.netlify.app  
**Desenvolvido por:** [RParagon](https://github.com/RafaeltCMSP)

---

## Fluxo Completo da Aplicação

```
[Link compartilhado no WhatsApp]
          │
          ▼
┌─────────────────────────┐
│   Landing Page          │  /index.html
│   Data · Hora · Local   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   Formulário de Confirmação             │  /form.html
│   ├── Nome completo                     │
│   ├── WhatsApp                          │
│   ├── PIX opcional + valor              │
│   └── Acompanhantes: nome + PIX + valor │
└──────────┬──────────────────────────────┘
           │
     ┌─────┴──────────────┐
     │ (com PIX)           │ (sem PIX)
     ▼                     ▼
┌──────────────┐     ┌──────────────┐
│  Tela PIX    │     │              │
│  /payment    │     │              │
│  ├── QR Code │     │              │
│  ├── Copia   │     │              │
│  ├── Timer   │     │              │
│  └── Polling │     │              │
└──────┬───────┘     │              │
       │ aprovado    │              │
       └──────┬──────┘              │
              ▼                     │
┌─────────────────────────────────────────┐
│   Página de Sucesso                     │  /success.html
│   ├── Convite por pessoa (link + QR)    │
│   ├── Botão "Ver Convite" por pessoa    │
│   ├── Compartilhar via WhatsApp         │
│   ├── Baixar PDF (1 página por pessoa)  │
│   └── Botão grupo WhatsApp              │
└──────────┬──────────────────────────────┘
           │  "Ver Convite"
           ▼
┌─────────────────────────────────────────┐
│   Convite Individual                    │  /convite.html?token=UUID
│   ├── Nome do convidado                 │
│   ├── Detalhes da festa                 │
│   ├── QR Code para check-in             │
│   └── ← Ver outros convites (se veio    │
│         da tela de sucesso)             │
└─────────────────────────────────────────┘
```

---

## Painel Administrativo

Acesso: `/admin.html` — protegido por senha (`ADMIN_SECRET`)

### Estatísticas em tempo real
| Card | O que mostra |
|------|-------------|
| 🎉 Confirmados | Total de convidados + acompanhantes |
| 🎁 Com PIX | Quantos querem presentear |
| 💰 Arrecadado | Soma dos PIX aprovados |
| ⏳ Pendentes | PIX aguardando pagamento |
| ✅ Presentes | Check-ins realizados (convidados + acompanhantes) |

### Tabela de convidados
- Convidado principal com linha completa: nome, WhatsApp, confirmado em, presença, PIX, valor, pagamento, ações
- Acompanhantes indentados abaixo (`↳`) com suas próprias informações e QR Code
- **Totalmente responsiva no mobile** — vira cards com campos rotulados em telas ≤ 660px

### Funcionalidades
- **Busca** por nome ou telefone — oculta acompanhantes junto com o convidado não encontrado
- **Scanner de check-in** — câmera ao vivo via `getUserMedia` + `jsQR`; funciona para convidado principal e acompanhante
- **Copiar link / Ver convite** — acesso rápido ao convite individual
- **Remover convidado** 🗑️ — exclui convidado, acompanhantes e pagamentos com confirmação
- **Exportar CSV** — inclui tipo (Convidado/Acompanhante), todos os dados
- **Atualizar** — recarrega a lista sem sair do painel

---

## Proteção contra Cadastro Duplicado

Ao tentar confirmar presença com um telefone já cadastrado:
- Backend retorna `409` com os dados do cadastro existente
- Frontend exibe: *"Você já está confirmado, [Nome]! Ver meus convites →"*
- Nenhum novo registro é criado no banco

---

## Recuperação de PIX Abandonado

Se o usuário iniciou um pagamento PIX mas saiu da página:
- O `payment_id` é salvo no `localStorage` com timestamp
- Ao acessar qualquer página (`/`, `/form.html`, `/convite.html`), um modal aparece:
  *"Você tem um PIX pendente de R$ XX para [Nome]. Deseja concluir?"*
- **Concluir** → retorna ao `payment.html` retomando o pagamento existente (sem criar novo)
- **Cancelar** → limpa o estado e redireciona para o formulário
- Expirado após 30 minutos ou após pagamento aprovado/rejeitado → limpo automaticamente

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | Node.js 18 + Netlify Functions (serverless) |
| **Frontend** | HTML + CSS + JavaScript vanilla |
| **Banco de dados** | Supabase (PostgreSQL) |
| **Pagamentos** | Mercado Pago REST API (PIX) — sem SDK |
| **QR Code geração** | qrcodejs (CDN) |
| **QR Code leitura** | jsQR (CDN) — scanner do admin |
| **PDF** | jsPDF (CDN) — desenho nativo, sem html2canvas |
| **Hospedagem** | Netlify |

---

## Estrutura do Projeto

```
paragon-invite/
├── netlify/
│   └── functions/
│       ├── confirm-guest.js      # Confirma presença, gera token, bloqueia duplicados
│       ├── create-payment.js     # Cria cobrança PIX no Mercado Pago (REST)
│       ├── payment-status.js     # Polling de status: Supabase → Mercado Pago
│       ├── mp-webhook.js         # Webhook HMAC-SHA256 do Mercado Pago
│       ├── get-invite.js         # Retorna dados do convite pelo token (guests + companions)
│       ├── admin-guests.js       # Lista convidados com acompanhantes e pagamentos
│       ├── checkin-guest.js      # Check-in pelo token (guests + companions)
│       └── delete-guest.js       # Remove convidado, acompanhantes e pagamentos
├── public/
│   ├── index.html                # Landing page da festa
│   ├── form.html                 # Formulário de confirmação + acompanhantes
│   ├── payment.html              # Tela PIX: QR Code, copia e cola, polling, recovery
│   ├── success.html              # Página final: convites individuais + PDF + WhatsApp
│   ├── convite.html              # Convite individual com QR Code (por token UUID)
│   ├── admin.html                # Painel admin: lista, stats, scanner, delete
│   ├── favicon.svg               # Ícone do projeto
│   └── assets/
│       ├── style.css             # Design system: cores, tipografia, componentes
│       └── pix-recovery.js       # Modal de recuperação de PIX abandonado
├── supabase/
│   ├── schema.sql                          # Tabelas guests + payments
│   ├── migration_v2.sql                    # invite_token + invite_url em guests
│   ├── migration_v3_fix_rls.sql            # Políticas RLS
│   ├── migration_v4_checkin.sql            # checked_in_at em guests
│   ├── migration_v5_companions.sql         # Tabela companions com convite próprio
│   └── migration_v6_companion_payments.sql # companion_id em payments
├── netlify.toml                  # Build config + redirect /api/* → functions
├── package.json                  # Dependências: @supabase/supabase-js
└── .env                          # Variáveis locais (gitignored)
```

---

## Banco de Dados (Supabase)

### Tabela `guests`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `name` | text | Nome completo |
| `phone` | text | WhatsApp (único por cadastro) |
| `wants_to_gift` | boolean | Optou por presentear via PIX |
| `confirmed_at` | timestamptz | Data/hora da confirmação |
| `invite_token` | uuid | Token do convite individual |
| `invite_url` | text | URL completa do convite |
| `checked_in_at` | timestamptz | Registro de entrada na festa |
| `created_at` | timestamptz | Criação do registro |

### Tabela `companions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `guest_id` | uuid | FK → guests.id |
| `name` | text | Nome do acompanhante |
| `wants_to_gift` | boolean | Optou por presentear via PIX |
| `invite_token` | uuid | Token do convite individual |
| `invite_url` | text | URL do convite do acompanhante |
| `checked_in_at` | timestamptz | Registro de entrada na festa |
| `created_at` | timestamptz | Criação do registro |

### Tabela `payments`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `guest_id` | uuid | FK → guests.id |
| `companion_id` | uuid | FK → companions.id (nulo se for do convidado principal) |
| `mp_payment_id` | text | ID do pagamento no Mercado Pago |
| `amount` | numeric | Valor em reais |
| `status` | text | `pending` / `approved` / `rejected` / `cancelled` |
| `qr_code` | text | Código copia e cola PIX |
| `qr_code_base64` | text | Imagem do QR Code em base64 |
| `paid_at` | timestamptz | Data/hora da aprovação |
| `created_at` | timestamptz | Criação do registro |

### Migration necessária para companions

```sql
-- Adicionar checked_in_at na tabela companions (se ainda não existir)
ALTER TABLE companions
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ DEFAULT NULL;
```

---

## Variáveis de Ambiente

Configure em **Netlify → Site settings → Environment variables** e no `.env` local:

```env
# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Admin
ADMIN_SECRET=SenhaSegura123

# App
BASE_URL=https://jannyinvite.netlify.app
```

> ⚠️ Evite caracteres especiais (`#`, `@`) na senha — o dashboard do Netlify pode truncar o valor. Use a CLI do Netlify para definir variáveis com caracteres especiais.

---

## Como Rodar Localmente

```bash
git clone https://github.com/RafaeltCMSP/paragon-invite.git
cd paragon-invite

npm install

# Configure as variáveis de ambiente
cp .env.example .env   # edite com suas credenciais

# Sobe frontend + functions juntos
npm run dev            # equivale a: netlify dev
```

Para testar o webhook do Mercado Pago localmente:
```bash
netlify dev --live     # gera URL pública temporária para receber webhooks
```

---

## Segurança

| Mecanismo | Proteção |
|-----------|---------|
| Webhook MP | Assinatura **HMAC-SHA256** validada no servidor |
| Painel admin | Header `x-admin-secret` comparado com `ADMIN_SECRET` no servidor |
| Variáveis sensíveis | Nunca expostas ao frontend — apenas usadas nas Netlify Functions |
| HTTPS | Netlify força redirect automático para HTTPS |
| Cadastro duplicado | Verificação por telefone no backend antes de qualquer insert |

---

## Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| Sem SDK Mercado Pago | O pacote `mercadopago` v2 não bundleia corretamente no Netlify Functions — substituído por `fetch` direto à REST API |
| `payment-status.js` consulta o MP diretamente | Garante funcionamento mesmo sem webhook configurado |
| Scanner: `getUserMedia` + `jsQR` | `html5-qrcode` falhava silenciosamente sem pedir permissão de câmera |
| PDF com jsPDF puro (sem html2canvas) | `html2canvas` cortava o QR Code em elementos off-screen — jsPDF desenha via comandos nativos e insere o canvas do qrcodejs diretamente |
| PIX recovery via `localStorage` | `sessionStorage` é perdido ao fechar a aba — `localStorage` persiste e permite retomar o pagamento sem recriar a cobrança |
| Check-in com fallback para `companions` | Tokens de acompanhantes ficam em tabela separada; `checkin-guest` busca em `guests` primeiro e cai para `companions` se não encontrar |

---

## Licença

Projeto privado — uso pessoal.  
Desenvolvido por **RParagon** · 2026
