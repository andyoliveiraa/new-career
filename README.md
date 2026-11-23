# 💼 New Career — Plataforma Inteligente de Emprego & AI Career Ops

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Unslop-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A **New Career** é uma plataforma multi-utilizador de agregação inteligente de vagas, verificação de disponibilidade em tempo real (*liveness check*), tailoring cirúrgico de currículos ATS sem alucinações e gestão ativa de candidaturas.

O projeto combina a velocidade e resiliência de monitoramento assíncrono do [**V2-BOT_EMPREGO**](https://github.com/andyoliveiraa/V2-BOT_EMPREGO) e o rigor de avaliação e liveness do [**career-ops**](https://github.com/career-ops-hq/career-ops), com uma interface visual profissional de alta produtividade construída sob os padrões de design do [**Unslop**](.agents/skills/unslop/SKILL.md).

Projetado tanto para execução **local** como para hospedagem remota numa **VPS (Linux / Docker)** com isolamento completo de utilizadores.

---

## ✨ Funcionalidades Principais

### 1. 👥 Arquitetura Multi-Utilizador & Autenticação Segura
- **Gestão de Sessão JWT & Hashing Criptográfico**:
  - Hashing de palavras-passe com salt através de `PBKDF2-HMAC-SHA256`.
  - Sessões autenticadas com tokens JWT (`PyJWT`) e rotação de credenciais.
- **Isolamento de Dados Multi-tenant**:
  - Cada utilizador possui a sua partição estritamente isolada no **Firebase Firestore** (`users/{user_id}/profile`, `jobs`, `applications`, `scan_history`).
  - Utilizadores diferentes operam de forma 100% privada e independente.
- **Telas Dedicadas Unslop**:
  - Telas de **Login** e **Registo** com design limpo, tipografia ergonómica, neutral ramp calma e validações em tempo real.

### 2. 📦 Onboarding Career-Ops com Suporte a VPS
Permite a migração imediata de quem já utiliza o Career-Ops, funcionando perfeitamente em servidores remotos (VPS):
- **Modo de Privacidade (Upload Ficheiro a Ficheiro)**:
  - 📝 **`cv.md`** (na raiz) ➔ O **CV Base Mestre** que serve de alicerce para todas as customizações de IA.
  - 📄 **`config/profile.yml`** ➔ Perfil pessoal, competências e fatos verificados.
  - 📊 **`data/applications.md`** ➔ Histórico de vagas submetidas, fit scores e anotações.
  - 📑 **`output.zip`** ➔ Comprima apenas a pasta `output/` dos PDFs para upload seguro.
- **Modo Rápido (Pasta Completa em ZIP)**:
  - Drag-and-drop da pasta inteira do Career-Ops comprimida em `.zip`. O servidor VPS descompacta em sandbox segura com proteção contra *Zip Slip*, localiza os ficheiros e indexa tudo automaticamente.
- **Modo Manual (Começar do Zero)**:
  - Configuração rápida para novos utilizadores sem histórico prévio.

### 3. 🚀 Motor de Scraping Multi-Fonte
- **Net-Empregos (Portugal)**: Scraper dedicado nativo com suporte a categorias, distritos/cidades, ordenação e extração de descrições completas com decodificação `iso-8859-1`.
- **Career-Ops ATS Portals**: Consulta direta aos quadros de empregos das principais empresas de tecnologia através de APIs públicas (Greenhouse, Lever, Ashby, Workday).
- **Google Jobs**: Agregação com fallbacks inteligentes (SerpApi, JSearch).
- **JobSpy Engine**: Coleta agregada no LinkedIn, Indeed, Glassdoor e ZipRecruiter.
- **Prevenção de Duplicados**: Hash determinístico de vagas para nunca duplicar oportunidades.
- **Filtro Geográfico**: Cálculo de distância física em km via OpenStreetMap Nominatim e fórmula de Haversine.

### 4. 🟢 Verificação de Disponibilidade em Tempo Real (Liveness Engine)
- **Camada Zero-Token**: Consulta direta a endpoints JSON públicos dos ATSs para checagem instantânea de encerramento sem gastar cotas de IA ou carregar navegadores pesados.
- **Camada Headless / HTTP**: Inspeção de marcadores de encerramento de ofertas ("vaga encerrada", "candidaturas fechadas", "404 Not Found").
- Badges visuais imediatos: **Ativa**, **Expirada** ou **A Verificar**.

### 5. 🎯 AI Career Studio & Adaptação de CV (Sem Alucinações)
- **Auditoria de Fit & Match Score (0 a 100%)**: Diagnóstico detalhado de pontos fortes e lacunas técnicas em relação ao anúncio.
- **Adaptação Cirúrgica de CV**: Alinha o resumo profissional e os bullet points reais às palavras-chave da vaga, respeitando estritamente os fatos comprovados do perfil mestre.
- **Exportação de PDF ATS-Friendly**: Geração de currículo A4 profissional via Playwright em tipografia de alto contraste (Space Grotesk + DM Sans).
- **Carta de Apresentação & Mensagem LinkedIn**: Redação concisa, persuasiva e livre de clichês corporativos.
- **Simulador de Entrevista (STAR+R)**: Perguntas comportamentais prováveis e estrutura sugerida de resposta.

### 6. 📋 Pipeline de Gestão de Candidaturas ("Já me candidatei")
- Visualização em **Tabela Densa** ou **Quadro Kanban**.
- Fluxo completo: *Disponíveis ➔ Avaliadas ➔ Em Preparação ➔ Candidatado ➔ Entrevista ➔ Positiva / Oferta ➔ Negativa ➔ Descartada*.
- Ação rápida de 1 clique para marcar como candidatado e registar a data.

---

## 🏗️ Arquitetura do Repositório

```text
new-career/
├── .agents/skills/          # Skills de UI/UX, Design Tokens e Unslop integrados
├── AGENTS.md                # Regras ativas de design e craft do projeto
├── backend/
│   ├── app/
│   │   ├── main.py          # Ponto de entrada FastAPI com CORS e routers
│   │   ├── config.py        # Configurações de ambiente, JWT e Firebase
│   │   ├── firebase.py      # Gestor Firestore Multi-Tenant + Fallback Local
│   │   ├── auth_utils.py    # Funções de hashing PBKDF2 e tokens JWT
│   │   ├── database.py      # SQLite assíncrono (SQLAlchemy + aiosqlite)
│   │   ├── models/          # Modelos de entidades
│   │   ├── schemas/         # Schemas de validação Pydantic V2 (Auth, Jobs, Profile)
│   │   ├── scrapers/        # Scrapers (Net-Empregos, Google, JobSpy, ATS)
│   │   ├── services/        # CareerOpsImporter, Liveness, Geo-Filter, AI Tailor, PDF Generator
│   │   ├── api/             # Rotas REST (/auth, /jobs, /applications, /scrapers, /ai, /profile)
│   │   └── scripts/         # Scripts de migração, reset e sincronização Cloud
│   ├── tests/               # Testes automatizados (12 testes pytest com auth e uploads)
│   └── requirements.txt     # Dependências Python
├── frontend/
│   ├── src/
│   │   ├── components/      # LoginView, RegisterView, OnboardingWizard, Navbar, DashboardView, JobsView, etc.
│   │   ├── context/         # AuthContext (Gestão global de sessão e utilizador)
│   │   ├── api.ts           # Cliente HTTP da API com autenticação Bearer
│   │   ├── types.ts         # Tipagens TypeScript estritas
│   │   └── App.tsx          # Aplicação principal
│   ├── tailwind.config.js   # Tokens de estilo Unslop
│   └── package.json         # Dependências React 19 + Tailwind CSS
├── storage/                 # Armazenamento particionado por utilizador
├── firebase-credentials.example.json # Modelo de credenciais Google Cloud Firestore
├── sync-firebase.bat        # Sincronizador de 1 clique para Firebase Cloud
├── start.bat                # Inicializador rápido para Windows
├── start.ps1                # Inicializador PowerShell
└── README.md                # Documentação do projeto
```

---

## 🚀 Como Executar

### 1. Inicialização Rápida Local (Windows)
Basta clicar duas vezes em `start.bat` ou executar no terminal PowerShell:
```powershell
.\start.ps1
```

O script inicia o backend em `http://localhost:8000` e abre o frontend em `http://localhost:5173`.

### 2. Execução Manual

#### Backend
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = ".."
python -m uvicorn app.main:app --reload --port 8000
```
Documentação interativa Swagger disponível em: `http://localhost:8000/docs`.

#### Frontend
```powershell
cd frontend
npm.cmd run dev
```
Acesse a aplicação no navegador em: `http://localhost:5173`.

---

## 🌐 Hospedagem em VPS (Linux / Ubuntu)

Como o sistema utiliza uploads diretos via browser e armazenamento relativo (`storage/users/{user_id}/`), ele está pronto para rodar em qualquer VPS:

1. **Clonar o repositório na VPS**:
   ```bash
   git clone https://github.com/andyoliveiraa/new-career.git
   cd new-career
   ```

2. **Configurar o Backend**:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   playwright install chromium --with-deps
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. **Compilar e Servir o Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run build
   # Os ficheiros gerados em /dist podem ser servidos via Nginx ou Caddy
   ```

---

## 🔥 Configuração do Firebase Firestore

Toda a base de dados do projeto roda sobre o **Google Cloud Firestore (Firebase)**:
- Coleções estruturadas: `users`, `users/{user_id}/jobs`, `applications`, `profile`, `scan_history`.
- O sistema possui **fallback persistente local automático** (`storage/local_firestore.json`) para que tudo funcione de imediato mesmo sem internet ou sem chaves configuradas.

### Para ligar ao seu projeto na nuvem Firebase:
1. Aceda ao [Console do Firebase](https://console.firebase.google.com/) e selecione o projeto (ex: `new-career-9289e`).
2. Ative a base de dados em **Build > Firestore Database > Criar base de dados**.
3. Vá a **Configurações do Projeto (Engrenagem) > Contas de Serviço > Gerar nova chave privada**.
4. Descarregue o ficheiro JSON e coloque-o na raiz como `firebase-credentials.json`.
5. Execute [`sync-firebase.bat`](sync-firebase.bat) para sincronizar de imediato!

---

## 🧪 Testes Automatizados

A plataforma conta com uma suíte rigorosa de 12 testes cobrindo autenticação, isolamento de múltiplos utilizadores, upload de arquivos ZIP, modo de privacidade, scrapers e verificação de disponibilidade:

```powershell
$env:PYTHONPATH = "."
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

---

## 📄 Licença
Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para mais detalhes.
