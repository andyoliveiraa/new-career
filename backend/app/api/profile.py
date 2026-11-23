from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.database import get_db
from backend.app.models.profile import Profile
from backend.app.schemas.profile import ProfileBase, ProfileUpdate, ProfileResponse

router = APIRouter(prefix="/profile", tags=["Profile"])

DEFAULT_PROFILE = {
    "full_name": "André Filipe Oliveira Dias",
    "headline": "Profissional comunicativo e polivalente com experiência em vendas outbound, atendimento e gestão operacional",
    "email": "andrexxdias@hotmail.com",
    "phone": "(+351) 965398851",
    "location": "Covilhã, Portugal",
    "linkedin_url": "https://linkedin.com/in/andyoliveiraa",
    "github_url": "https://github.com/andyoliveiraa",
    "portfolio_url": "",
    "summary": "Profissional comunicativo e polivalente com experiência sólida em vendas outbound, atendimento ao cliente, coordenação operacional de equipas e resolução de problemas, motivado para novos desafios profissionais.",
    "skills": [
        "Comunicação Interpessoal", "Vendas Outbound", "Negociação & Fecho Comercial",
        "Atendimento ao Cliente / Contact Center", "Gestão de Equipas & Turnos",
        "Gestão de Stocks & Inventário", "Normas HACCP", "Resolução de Conflitos",
        "Suporte Técnico (Hardware & Software)", "Administração Web & CMS", "Sistemas CRM",
        "Inglês (B1)"
    ],
    "experiences": [
        {
            "role": "Gestor de Turno",
            "company": "Pans & Company",
            "period": "10/08/2026 - 23/10/2026",
            "location": "Covilhã, Portugal",
            "bullets": [
                "Gestão operacional da equipa e planeamento diário de escalas;",
                "Assegurar a máxima satisfação e fidelização do cliente;",
                "Planeamento rigoroso e controlo de stocks e consumíveis;",
                "Garantir a verificação e registos segundo as normas HACCP;",
                "Antecipação e resolução de eventuais conflitos em ambiente de ritmo acelerado;",
                "Cumprimento dos standards de produto, serviço e metas do negócio."
            ]
        },
        {
            "role": "Dirigente Associativo",
            "company": "CéuInquieto – Associação de Comunicação Criativa",
            "period": "10/09/2025 - 10/09/2026",
            "location": "Covilhã, Portugal",
            "bullets": [
                "Coordenação e gestão direta da equipa criativa e distribuição estratégica de tarefas;",
                "Supervisão do calendário editorial online e cumprimento rigoroso de prazos;",
                "Administração técnica, manutenção contínua e programação web do website oficial;",
                "Gestão de conteúdos (CMS), publicação e integração estrutural multimédia;",
                "Troubleshooting rápido, monitorização de performance e design responsivo."
            ]
        },
        {
            "role": "Outbound Sales Representative",
            "company": "Teleperformance Portugal",
            "period": "14/10/2025 - 07/08/2026",
            "location": "Covilhã, Portugal",
            "bullets": [
                "Comercialização ativa de serviços via contacto telefónico com foco em captação e fidelização;",
                "Realização de chamadas outbound e atendimento inbound identificando necessidades;",
                "Gestão de carteira de clientes e registo de interações em sistema CRM;",
                "Cumprimento consistente de metas comerciais e indicadores de desempenho (KPIs);",
                "Tratamento de objeções, negociação contratual e fecho de vendas sob pressão."
            ]
        },
        {
            "role": "Técnico de Bar",
            "company": "Anitudes – Animação Turística Cultural e Desportiva Lda",
            "period": "20/06/2025 - 30/09/2025",
            "location": "Mirandela, Portugal",
            "bullets": [
                "Gestão e operação autônoma integral do bar (único responsável no turno);",
                "Gestão financeira, controlo de caixa diário, registo de vendas e administração de contas;",
                "Controlo e reposição de stock, assegurando conformidade com higiene e segurança alimentar."
            ]
        },
        {
            "role": "Assistente de Loja & Suporte Técnico",
            "company": "Power PC",
            "period": "01/05/2022 - 25/07/2022",
            "location": "Mirandela, Portugal",
            "bullets": [
                "Atendimento ao público e suporte técnico informático;",
                "Reparação e manutenção de equipamentos de hardware e software;",
                "Gestão e controlo de stock em loja de informática."
            ]
        }
    ],
    "educations": [
        {
            "degree": "Técnico de Comunicação, Marketing, Relações Públicas e Publicidade (Nível 4 QEQ)",
            "institution": "Escola Profissional de Murça",
            "period": "2020 - 2022"
        },
        {
            "degree": "Informática Web, Móvel e na Nuvem (Frequência Universitária)",
            "institution": "Universidade da Beira Interior (UBI)",
            "period": "2022 - 2025"
        }
    ],
    "certifications": [],
    "verified_facts": [
        "Mais de 2 anos de experiência profissional em contacto com clientes e gestão de equipas.",
        "Experiência comprovada em metas de vendas outbound na Teleperformance Portugal.",
        "Gestão de turno com HACCP e controlo de stocks na restauração (Pans & Company).",
        "Competências de suporte técnico em hardware e software (Power PC) e gestão web (CéuInquieto).",
        "Frequência universitária em Informática Web, Móvel e Nuvem na UBI."
    ]
}

@router.get("", response_model=ProfileResponse)
async def get_profile(db: AsyncSession = Depends(get_db)):
    stmt = select(Profile).limit(1)
    res = await db.execute(stmt)
    prof = res.scalar_one_or_none()
    
    if not prof:
        prof = Profile(**DEFAULT_PROFILE)
        db.add(prof)
        await db.commit()
        await db.refresh(prof)
        
    return prof

@router.put("", response_model=ProfileResponse)
async def update_profile(profile_data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Profile).limit(1)
    res = await db.execute(stmt)
    prof = res.scalar_one_or_none()
    
    if not prof:
        prof = Profile(**profile_data.model_dump())
        db.add(prof)
    else:
        for field, value in profile_data.model_dump().items():
            setattr(prof, field, value)

    await db.commit()
    await db.refresh(prof)
    return prof
