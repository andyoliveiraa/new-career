# 💼 New Career — Plataforma Inteligente de Emprego & AI Career Ops

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Unslop-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A **New Career** é uma plataforma completa e local-first de agregação de vagas, verificação de disponibilidade em tempo real, tailoring cirúrgico de currículos ATS e gestão ativa de candidaturas.

O projeto une o poder do monitoramento assíncrono do [**V2-BOT_EMPREGO**](https://github.com/andyoliveiraa/V2-BOT_EMPREGO) e o rigor de avaliação e liveness do [**career-ops**](https://github.com/career-ops-hq/career-ops), com uma interface visual de alta produtividade construída sob os padrões de design do [**Unslop**](.agents/skills/unslop/SKILL.md).

---

## ✨ Funcionalidades Principais

* 🚀 **Motor de Scraping Multi-Fonte**:
  - **Net-Empregos (Portugal)**: Scraper dedicado nativo com suporte a categorias, distritos/cidades, ordenação e extração de descrições completas.
  - **Career-Ops ATS Portals**: Consulta direta aos quadros de empregos das principais empresas de tecnologia através de APIs públicas (Greenhouse, Lever, Ashby, Workday).
  - **Google Jobs**: Agregação com fallbacks inteligentes (SerpApi, JSearch).
  - **JobSpy Engine**: Coleta agregada no LinkedIn, Indeed, Glassdoor e ZipRecruiter.
  - **Prevenção de Duplicados**: Hash determinístico de vagas para nunca duplicar oportunidades.
  - **Filtro Geográfico**: Cálculo de distância física em km via OpenStreetMap Nominatim e Haversine.

* 🟢 **Verificação de Disponibilidade em Tempo Real (Liveness Engine)**:
  - **Camada Zero-Token**: Consulta direta a endpoints JSON públicos dos ATSs para checagem instantânea de encerramento sem gastar cotas de IA ou carregar navegadores pesados.
  - **Camada Headless / HTTP**: Inspeção de marcadores de encerramento de ofertas ("vaga encerrada", "candidaturas fechadas", "404 Not Found").
  - Badges visuais imediatos: **Ativa**, **Expirada** ou **A Verificar**.

* 🎯 **AI Career Studio & Adaptação de CV (Sem Alucinações)**:
  - **Auditoria de Fit & Match Score (0 a 100%)**: Diagnóstico detalhado de pontos fortes e lacunas técnicas em relação ao anúncio.
  - **Adaptação Cirúrgica de CV**: Alinha o resumo profissional e os bullet points reais às palavras-chave da vaga, respeitando estritamente os fatos comprovados do perfil mestre.
  - **Exportação de PDF ATS-Friendly**: Geração de currículo A4 profissional via Playwright em tipografia de alto contraste (Space Grotesk + DM Sans).
  - **Carta de Apresentação & Mensagem LinkedIn**: Redação concisa, persuasiva e livre de clichês corporativos.
  - **Simulador de Entrevista (STAR+R)**: Perguntas comportamentais prováveis e estrutura sugerida de resposta.

* 📋 **Pipeline de Gestão de Candidaturas ("Já me candidatei")**:
  - Visualização em **Tabela Densa** ou **Quadro Kanban**.
  - Fluxo completo: *Disponíveis ➔ Avaliadas ➔ Em Preparação ➔ Candidatado ➔ Entrevista ➔ Positiva / Oferta ➔ Negativa ➔ Descartada*.
  - Ação rápida de 1 clique para marcar como candidatado e registrar a data.

* 🎨 **Padrão de Design Unslop (AGENTS.md)**:
  - Grid de espaçamento rítmico de 4px.
  - Paleta neutra calma com uma única cor de destaque intencional.
  - Sem gradientes roxos genéricos de IA, sem neon excessivo e com alto contraste WCAG 2.2 AA.

---

## 🏗️ Arquitetura do Repositório

```text
new-career/
├── .agents/skills/          # Skills de UI/UX, Design Tokens e Unslop integrados
├── AGENTS.md                # Regras ativas de design e craft do projeto
├── backend/
│   ├── app/
│   │   ├── main.py          # Ponto de entrada FastAPI com CORS e lifespan
│   │   ├── config.py        # Configurações e variáveis de ambiente
│   │   ├── database.py      # SQLite assíncrono (SQLAlchemy + aiosqlite)
│   │   ├── models/          # Modelos (Job, Application, Profile, ScanHistory)
│   │   ├── schemas/         # Schemas de validação Pydantic V2
│   │   ├── scrapers/        # Scrapers (Net-Empregos, Google, JobSpy, ATS)
│   │   ├── services/        # Liveness, Geo-Filter, AI Tailor, PDF Generator
│   │   └── api/             # Rotas REST (/jobs, /applications, /scrapers, /ai, /profile)
│   ├── tests/               # Testes automatizados (pytest + pytest-asyncio)
│   └── requirements.txt     # Dependências Python
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, DashboardView, JobsView, AIStudioModal, etc.
│   │   ├── api.ts           # Cliente HTTP da API
│   │   ├── types.ts         # Tipagens TypeScript
│   │   └── App.tsx          # Aplicação principal
│   ├── tailwind.config.js   # Tokens de estilo Unslop
│   └── package.json         # Dependências React 19 + Tailwind
├── start.bat                # Inicializador rápido para Windows
├── start.ps1                # Inicializador PowerShell
└── README.md                # Documentação
```

---

## 🚀 Como Executar

### 1. Inicialização Rápida (Windows)
Basta clicar duas vezes em `start.bat` ou executar no terminal PowerShell:
```powershell
.\start.ps1
```

O script inicia o backend em `http://localhost:8000` e abre o frontend em `http://localhost:5173`.

### 2. Execução Manual

#### Backend
```powershell
# Ativar o ambiente virtual e iniciar a API
cd backend
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = ".."
python -m uvicorn app.main:app --reload --port 8000
```
Documentação interativa Swagger disponível em: `http://localhost:8000/docs`.

#### Frontend
```powershell
cd frontend
npm run dev
```
Acesse a aplicação no navegador em: `http://localhost:5173`.

### 3. Execução dos Testes Automatizados
```powershell
$env:PYTHONPATH = "."
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

---

## 🔥 Configuração do Firebase Firestore

Toda a base de dados do projeto roda sobre o **Google Cloud Firestore (Firebase)**:
- Coleções gerenciadas: `jobs`, `applications`, `profiles`, e `scan_history`.
- O sistema já possui fallback persistente local automático (`storage/local_firestore.json`) para que tudo funcione de imediato mesmo sem internet ou chaves configuradas.

### Para conectar ao seu projeto na nuvem Firebase:
1. Acesse o [Console do Firebase](https://console.firebase.google.com/) e selecione o seu projeto.
2. Vá em **Configurações do Projeto (Engrenagem)** > **Contas de Serviço** > **Gerar nova chave privada**.
3. Baixe o arquivo JSON e renomeie-o para `firebase-credentials.json` na raiz deste projeto (ou defina `FIREBASE_CREDENTIALS_PATH=./caminho/chave.json` no seu arquivo `.env`).
4. Ao iniciar a aplicação, ela se conectará automaticamente à nuvem do Firebase Firestore!

---

## 🔒 Privacidade & Armazenamento Local

- Todos os dados, perfis, notas e candidaturas são gravados localmente em banco SQLite (`new_career.db`).
- Nenhum dado pessoal é transmitido a servidores externos além das chamadas diretas às APIs de LLM que você configurar (Gemini, Groq ou OpenAI).

---

## 📄 Licença
Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para mais detalhes.
