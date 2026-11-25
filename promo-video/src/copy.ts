export type VideoLang = 'en' | 'pt';

export interface VideoCopy {
  scene1: {
    pill: string;
    line1: string;
    line2: string;
    sub: string;
  };
  scene2: {
    subtitle: string;
  };
  scene3: {
    features: Array<{ step: string; label: string; sub: string }>;
    scraping: {
      title: string;
      subtitle: string;
      sources: Array<{ name: string; tag: string }>;
      roleLabel: string;
      roleValue: string;
      locLabel: string;
      locValue: string;
      scanningBtn: string;
      scanBtn: string;
      readyStatus: string;
      scanningStatus: string;
      completeStatus: string;
      newMatchesBadge: string;
      activeBadge: string;
      discovered: Array<{ title: string; company: string; loc: string; salary: string; appearAt: number }>;
    };
    pipeline: {
      title: string;
      subtitle: string;
      viewPill: string;
      cols: {
        found: string;
        applied: string;
        interview: string;
      };
      matchTag: string;
      activeBadge: string;
      remoteWord: string;
      staticCards: {
        found1Tag: string;
        found2Tag: string;
        applied1Tag: string;
        applied2Tag: string;
        interview1Tag: string;
        interview2Tag: string;
      };
    };
    discord: {
      title: string;
      subtitle: string;
      sentStatus: string;
      connectedStatus: string;
      sendTestBtn: string;
      justNow: string;
      embedTitle: string;
      atsMatchLabel: string;
      locationLabel: string;
      locationVal: string;
      livenessLabel: string;
      livenessVal: string;
    };
    cv: {
      studioTitle: string;
      templates: Array<{ name: string; tag: string; accent: string; score: number }>;
      scoreLabel: string;
      role2Col: string;
      role1Col: string;
      remoteEu: string;
      skillsLabel: string;
      summaryLabel: string;
      summaryShortLabel: string;
      coreStackLabel: string;
      experienceLabel: string;
      summary2Col: string;
      exp2ColTitle: string;
      exp2ColB1: string;
      exp2ColB2: string;
      summary1Col: string;
      exp1ColTitle: string;
      exp1ColB1: string;
    };
    langSwitch: {
      instantBadge: string;
    };
  };
  scene4: {
    eyebrow: string;
    title: string;
    highlights: [string, string, string, string, string];
  };
  scene5: {
    betaBadge: string;
    headline: string;
    ctaButton: string;
    attributionPrefix: string;
    attributionSuffix: string;
  };
  scene6: {
    betaPill: string;
    openSourcePill: string;
    headline: string;
    subtitle: string;
    footerPrefix: string;
    footerMiddle: string;
  };
}

export const VIDEO_COPY: Record<VideoLang, VideoCopy> = {
  en: {
    scene1: {
      pill: 'CAREER AUTOMATION ENGINE',
      line1: 'Stop hunting for jobs',
      line2: 'manually.',
      sub: 'Let automation work for you.',
    },
    scene2: {
      subtitle: 'Your All-in-One Career Automation Platform.',
    },
    scene3: {
      features: [
        { step: '01', label: 'Automated Job Scraping', sub: 'Multi-source radar with zero duplicates' },
        { step: '02', label: 'Jobs & Pipeline', sub: 'Drag-and-drop Kanban from Found to Interview' },
        { step: '03', label: 'Discord Webhook Alerts', sub: 'Instant match embeds sent to your server' },
        { step: '04', label: 'CV Templates & ATS Auditor', sub: 'Switch ATS-safe A4 layouts in one click' },
        { step: '05', label: 'Multi-Language Support', sub: 'Seamless EN / PT / ES workspace switching' },
      ],
      scraping: {
        title: 'Multi-Source Job Radar',
        subtitle: 'Simultaneous aggregation with deterministic deduplication & distance scoring',
        sources: [
          { name: 'Net-Empregos', tag: 'National Portal' },
          { name: 'Career-Ops ATS', tag: 'Greenhouse • Lever • Ashby' },
          { name: 'Google Jobs', tag: 'SerpApi / JSearch' },
          { name: 'JobSpy Engine', tag: 'LinkedIn & Indeed' },
        ],
        roleLabel: 'Role:',
        roleValue: 'Full Stack Engineer',
        locLabel: 'Location:',
        locValue: 'Remote / Europe',
        scanningBtn: 'Scanning...',
        scanBtn: 'Scan Jobs',
        readyStatus: 'Ready to scan 4 job engines',
        scanningStatus: 'Scanning live endpoints...',
        completeStatus: 'Scan Complete — 18 New Verified Jobs',
        newMatchesBadge: '+18 New Matches',
        activeBadge: 'Active',
        discovered: [
          { title: 'Senior Full Stack Engineer', company: 'Acme Cloud', loc: 'Remote • EU', salary: '$95k - $120k', appearAt: 85 },
          { title: 'Staff Backend Developer (Python)', company: 'Linear', loc: 'Remote • Global', salary: '$130k+', appearAt: 108 },
          { title: 'Frontend Architect (React / TS)', company: 'Supabase', loc: 'Remote', salary: '$110k', appearAt: 130 },
        ],
      },
      pipeline: {
        title: 'Jobs & Applications Pipeline',
        subtitle: 'Track every opportunity from discovery to final offer',
        viewPill: 'Kanban View',
        cols: {
          found: 'Found',
          applied: 'Applied',
          interview: 'Interview',
        },
        matchTag: '94% Match',
        activeBadge: 'Active',
        remoteWord: 'Remote',
        staticCards: {
          found1Tag: '89% Match',
          found2Tag: '86% Match',
          applied1Tag: 'Tailored CV',
          applied2Tag: 'Submitted',
          interview1Tag: 'Stage 2',
          interview2Tag: 'Technical',
        },
      },
      discord: {
        title: 'Discord Webhook',
        subtitle: 'Real-time alerts on new matches & interviews',
        sentStatus: 'Event Dispatched (HTTP 204)',
        connectedStatus: 'Webhook Connected',
        sendTestBtn: 'Send Test Alert',
        justNow: 'Just now',
        embedTitle: 'New Job Match sent via Discord Webhook',
        atsMatchLabel: 'ATS MATCH',
        locationLabel: 'LOCATION',
        locationVal: 'Remote • EU',
        livenessLabel: 'LIVENESS',
        livenessVal: 'Verified Active',
      },
      cv: {
        studioTitle: 'CV Template Studio',
        templates: [
          { name: 'Classic ATS', tag: '1-Column Linear', accent: '#1e293b', score: 98 },
          { name: 'Modern Split', tag: '2-Column Executive', accent: '#2563eb', score: 94 },
          { name: 'Tech Minimal', tag: 'Engineering Focus', accent: '#0f766e', score: 96 },
        ],
        scoreLabel: 'Real-Time ATS Score',
        role2Col: 'Staff Full Stack Engineer',
        role1Col: 'Senior Full Stack Engineer • alex@example.com • Remote',
        remoteEu: 'Remote • Europe',
        skillsLabel: 'Skills',
        summaryLabel: 'Professional Summary',
        summaryShortLabel: 'Summary',
        coreStackLabel: 'Core Stack',
        experienceLabel: 'Experience',
        summary2Col: 'Architecting distributed web applications and high-throughput APIs with measurable latency reductions of 42%.',
        exp2ColTitle: 'Lead Software Engineer — CloudScale',
        exp2ColB1: '• Reduced p95 API latency by 42% across 100k+ active users.',
        exp2ColB2: '• Automated CI/CD pipelines saving 15 hours/week.',
        summary1Col: 'Software engineer with 7+ years building scalable React, TypeScript, and Python FastAPI systems in cloud-native teams.',
        exp1ColTitle: 'Lead Full Stack Engineer — CloudScale (2022 – Present)',
        exp1ColB1: '• Cut API response time by 42% and scaled throughput for 100k+ users.',
      },
      langSwitch: {
        instantBadge: 'Instant UI Switch',
      },
    },
    scene4: {
      eyebrow: 'Built for Speed & Precision',
      title: 'Everything you need to land faster.',
      highlights: ['Smart Scraping', 'Job Pipeline', 'Discord Webhooks', 'CV Templates', 'Multi-Language'],
    },
    scene5: {
      betaBadge: 'Beta',
      headline: 'Upgrade your job search today.',
      ctaButton: 'Get Started',
      attributionPrefix: 'Inspired by & based on',
      attributionSuffix: 'on GitHub — independently built for the web',
    },
    scene6: {
      betaPill: 'Public Beta',
      openSourcePill: 'Open Source',
      headline: 'Open Source & Currently in Beta.',
      subtitle: 'Built transparently in the open. Explore the full source code on GitHub:',
      footerPrefix: 'Based on',
      footerMiddle: 'concepts • Live at',
    },
  },
  pt: {
    scene1: {
      pill: 'MOTOR DE AUTOMAÇÃO DE CARREIRA',
      line1: 'Pare de procurar vagas',
      line2: 'manualmente.',
      sub: 'Deixe a automação trabalhar por si.',
    },
    scene2: {
      subtitle: 'A Sua Plataforma Tudo-em-Um de Automação de Carreira.',
    },
    scene3: {
      features: [
        { step: '01', label: 'Pesquisa Automática de Vagas', sub: 'Radar multi-fonte em tempo real sem duplicados' },
        { step: '02', label: 'Vagas e Pipeline Kanban', sub: 'Arraste candidaturas de Encontrada até Entrevista' },
        { step: '03', label: 'Alertas via Discord Webhook', sub: 'Notificações instantâneas enviadas para o seu servidor' },
        { step: '04', label: 'Modelos de CV e Auditor ATS', sub: 'Troque de layout A4 compatível com ATS num clique' },
        { step: '05', label: 'Suporte Multi-Idioma', sub: 'Alterne entre EN / PT / ES instantaneamente' },
      ],
      scraping: {
        title: 'Radar Multi-Fonte de Vagas',
        subtitle: 'Agregação simultânea com remoção de duplicados e cálculo de distância',
        sources: [
          { name: 'Net-Empregos', tag: 'Portal Nacional' },
          { name: 'Career-Ops ATS', tag: 'Greenhouse • Lever • Ashby' },
          { name: 'Google Jobs', tag: 'SerpApi / JSearch' },
          { name: 'JobSpy Engine', tag: 'LinkedIn e Indeed' },
        ],
        roleLabel: 'Cargo:',
        roleValue: 'Full Stack Engineer',
        locLabel: 'Local:',
        locValue: 'Remoto / Europa',
        scanningBtn: 'A pesquisar...',
        scanBtn: 'Pesquisar Vagas',
        readyStatus: 'Pronto para analisar 4 motores de vagas',
        scanningStatus: 'A analisar fontes em tempo real...',
        completeStatus: 'Pesquisa Concluída — 18 Novas Vagas Verificadas',
        newMatchesBadge: '+18 Novas Vagas',
        activeBadge: 'Ativa',
        discovered: [
          { title: 'Senior Full Stack Engineer', company: 'Acme Cloud', loc: 'Remoto • UE', salary: '$95k - $120k', appearAt: 85 },
          { title: 'Staff Backend Developer (Python)', company: 'Linear', loc: 'Remoto • Global', salary: '$130k+', appearAt: 108 },
          { title: 'Frontend Architect (React / TS)', company: 'Supabase', loc: 'Remoto', salary: '$110k', appearAt: 130 },
        ],
      },
      pipeline: {
        title: 'Vagas & Pipeline de Candidaturas',
        subtitle: 'Acompanhe cada oportunidade da descoberta até à proposta final',
        viewPill: 'Vista Kanban',
        cols: {
          found: 'Encontrada',
          applied: 'Candidatado',
          interview: 'Entrevista',
        },
        matchTag: '94% Match',
        activeBadge: 'Ativa',
        remoteWord: 'Remoto',
        staticCards: {
          found1Tag: '89% Match',
          found2Tag: '86% Match',
          applied1Tag: 'CV Adaptado',
          applied2Tag: 'Submetida',
          interview1Tag: 'Fase 2',
          interview2Tag: 'Técnica',
        },
      },
      discord: {
        title: 'Discord Webhook',
        subtitle: 'Alertas em tempo real de novas vagas e entrevistas',
        sentStatus: 'Evento Enviado (HTTP 204)',
        connectedStatus: 'Webhook Ligado',
        sendTestBtn: 'Enviar Alerta Teste',
        justNow: 'Agora mesmo',
        embedTitle: 'Nova Vaga Compatível enviada via Discord Webhook',
        atsMatchLabel: 'MATCH ATS',
        locationLabel: 'LOCALIZAÇÃO',
        locationVal: 'Remoto • UE',
        livenessLabel: 'ESTADO',
        livenessVal: 'Ativa Verificada',
      },
      cv: {
        studioTitle: 'Estúdio de Modelos de CV',
        templates: [
          { name: 'Classic ATS', tag: 'Linear 1 Coluna', accent: '#1e293b', score: 98 },
          { name: 'Modern Split', tag: 'Executivo 2 Colunas', accent: '#2563eb', score: 94 },
          { name: 'Tech Minimal', tag: 'Foco em Engenharia', accent: '#0f766e', score: 96 },
        ],
        scoreLabel: 'Pontuação ATS em Tempo Real',
        role2Col: 'Staff Full Stack Engineer',
        role1Col: 'Senior Full Stack Engineer • alex@example.com • Remoto',
        remoteEu: 'Remoto • Europa',
        skillsLabel: 'Competências',
        summaryLabel: 'Resumo Profissional',
        summaryShortLabel: 'Resumo',
        coreStackLabel: 'Stack Principal',
        experienceLabel: 'Experiência',
        summary2Col: 'Arquitetura de aplicações web distribuídas e APIs de alta performance com redução de 42% na latência.',
        exp2ColTitle: 'Lead Software Engineer — CloudScale',
        exp2ColB1: '• Redução de 42% na latência p95 para mais de 100 mil utilizadores.',
        exp2ColB2: '• Automação de pipelines CI/CD poupando 15 horas por semana.',
        summary1Col: 'Engenheiro de software com mais de 7 anos em React, TypeScript e Python FastAPI para sistemas escaláveis.',
        exp1ColTitle: 'Lead Full Stack Engineer — CloudScale (2022 – Atual)',
        exp1ColB1: '• Redução de 42% no tempo de resposta da API para +100k utilizadores.',
      },
      langSwitch: {
        instantBadge: 'Troca Instantânea',
      },
    },
    scene4: {
      eyebrow: 'Criado para Velocidade e Precisão',
      title: 'Tudo o que precisa para avançar mais rápido.',
      highlights: ['Pesquisa Inteligente', 'Pipeline de Vagas', 'Discord Webhooks', 'Modelos de CV', 'Multi-Idioma'],
    },
    scene5: {
      betaBadge: 'Beta',
      headline: 'Eleve a sua procura de emprego hoje.',
      ctaButton: 'Começar Agora',
      attributionPrefix: 'Inspirado e baseado no',
      attributionSuffix: 'no GitHub — desenvolvido de forma independente para a web',
    },
    scene6: {
      betaPill: 'Beta Público',
      openSourcePill: 'Open Source',
      headline: 'Open Source e em Fase Beta.',
      subtitle: 'Desenvolvido de forma transparente em código aberto. Explore o código no GitHub:',
      footerPrefix: 'Baseado nos conceitos do',
      footerMiddle: '• Online em',
    },
  },
};
