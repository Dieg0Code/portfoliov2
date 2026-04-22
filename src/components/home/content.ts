export type HomeLocale = "es" | "en";

type HeroMetric = {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
  live?: boolean;
};

type HeroSection = {
  eyebrow: string;
  bannerNote: string;
  headline: string;
  statusLabel: string;
  statusNote: string;
  location: string;
  lede: string;
  primaryCta: string;
  secondaryCta: string;
  asideEyebrow: string;
  asideBody: string;
  list: string[];
  stats: HeroMetric[];
};

type BentoSize = "hero" | "wide" | "narrow" | "standard" | "compact";

type ProjectModule = {
  code: string;
  title: string;
  href: string;
};

type ProjectCard = {
  kicker: string;
  title: string;
  summary: string;
  tags: string[];
  href: string;
  hrefLabel: string;
  bentoSize: BentoSize;
  imageSrc?: string;
  imageAlt?: string;
  imageGallery?: Array<{ src: string; alt: string }>;
  isExperiment?: boolean;
  isLogo?: boolean;
  modules?: ProjectModule[];
};

type BlogPulse = {
  kicker: string;
  title: string;
  emptyLabel: string;
};

type BlogSection = {
  eyebrow: string;
  title: string;
  copy: string;
  ctaLabel: string;
  ctaHref: string;
  latestKicker: string;
  latestReadLabel: string;
  pulse: BlogPulse;
};

type ContactFact = {
  label: string;
  value: string;
};

type ContactSignal = {
  meta: string;
  kind: string;
  project: string;
};

type ContactSection = {
  eyebrow: string;
  copy: string;
  availability: string;
  responseTime: string;
  mailLabel: string;
  primaryCta: string;
  secondaryCta: string;
  mailSubject: string;
  facts: ContactFact[];
  signalTitle: string;
  signals: ContactSignal[];
};

export type HomeContentBundle = {
  brand: {
    name: string;
    strapline: string;
  };
  nav: {
    work: string;
    notes: string;
    contact: string;
  };
  hero: HeroSection;
  work: {
    eyebrow: string;
    title: string;
    copy: string;
    projects: ProjectCard[];
  };
  blog: BlogSection;
  contact: ContactSection;
  footer: {
    note: string;
    items: string[];
    profileLabel: string;
  };
};

export const contactEmail = "diegoobando20@gmail.com";
export const githubProfile = "https://github.com/Dieg0Code";

export const homeContent: Record<HomeLocale, HomeContentBundle> = {
  es: {
    brand: {
      name: "Diego Obando",
      strapline: "Fullstack, IA aplicada y docencia técnica."
    },
    nav: {
      work: "Trabajo",
      notes: "Notas",
      contact: "Contacto"
    },
    hero: {
      eyebrow: "Desarrollo de software / docencia",
      bannerNote: "software fullstack · ia aplicada al negocio · docencia",
      headline: "Construyo software. Enseño. A veces entreno redes neuronales desde cero.",
      statusLabel: "actualmente",
      statusNote: "entrenando un transformer + MCTS · enseñando en AIEP",
      location: "Osorno, Chile · UTC-4",
      lede:
        "Desarrollador fullstack desde 2018, con foco en backend (Go, Java, TypeScript), arquitecturas cloud-native e IA adaptada a los datos y procesos reales de cada negocio. Enseño en AIEP —donde egresé con máxima distinción— y construyo sistemas que entregan valor en producción.",
      primaryCta: "Ver proyectos",
      secondaryCta: "Escríbeme",
      asideEyebrow: "Así me muevo",
      asideBody:
        "Backend en Go, arquitecturas serverless (AWS Lambda, Terraform), IA aplicada con agentes y búsqueda semántica sobre los datos de cada cliente. Mantengo Syndicate, un SDK propio para orquestar agentes en Go, y aporto a proyectos open source cuando algo me pide arreglo.",
      list: [
        "Entender antes de escribir código",
        "Integrar IA solo cuando aporta valor real",
        "Terminar lo que empiezo"
      ],
      stats: [
        {
          label: "Trayectoria",
          value: "Desde 2018",
          note: "backend, cloud, IA",
          accent: true,
          live: true
        },
        {
          label: "Stack",
          value: "Go · Java · TS",
          note: "AWS · Terraform · pgvector"
        },
        {
          label: "Docencia",
          value: "AIEP",
          note: "4 asignaturas activas",
          accent: true
        },
        {
          label: "Formación",
          value: "Máxima distinción",
          note: "GPA 6.4/7.0",
          accent: true
        }
      ]
    },
    work: {
      eyebrow: "Trabajo seleccionado",
      title: "Trabajo reciente en investigación, producto y docencia.",
      copy: "Investigación ML, productos con RAG, DevSecOps y docencia aplicada.",
      projects: [
        {
          kicker: "Investigación ML / juegos",
          title: "ataxx-zero",
          summary:
            "Motor de IA que aprende Ataxx desde cero con deep reinforcement learning y self-play. **Sin heurísticas manuales: la estrategia emerge del entrenamiento.**",
          tags: ["Reinforcement Learning", "Transformers", "PyTorch"],
          href: "https://github.com/Dieg0Code/ataxx-zero",
          hrefLabel: "Ver en GitHub",
          bentoSize: "hero",
          imageSrc: "/projects/ataxx-zero.png",
          imageAlt: "Interfaz web de ataxx-zero en producción"
        },
        {
          kicker: "ML / NLP",
          title: "NanoLogicLM",
          summary:
            "Experimento: transformer decoder-only entrenado para traducir lenguaje natural a lógica proposicional. RoPE, SwiGLU y curriculum learning desde cero.",
          tags: ["Transformers", "NLP", "PyTorch"],
          href: "https://github.com/Dieg0Code/NanoLogicLM",
          hrefLabel: "Ver en GitHub",
          bentoSize: "wide",
          isExperiment: true
        },
        {
          kicker: "DevSecOps",
          title: "player_profile",
          summary:
            "API REST en Go con **pipeline CI/CD completo**: análisis estático, **escaneo de vulnerabilidades**, IaC con Terraform y despliegue automatizado en AWS.",
          tags: ["Go", "Terraform", "AWS"],
          href: "https://github.com/Dieg0Code/portfolio_01_player_profile",
          hrefLabel: "Ver en GitHub",
          bentoSize: "narrow"
        },
        {
          kicker: "Producto / Agentes IA",
          title: "customer_service_ai_agents",
          summary:
            "Plataforma multi-agente para atención al cliente en restaurantes. Orquestación de herramientas, embeddings en menús y **canal WhatsApp integrado**.",
          tags: ["Go", "Agentes", "Embeddings"],
          href: "https://github.com/Dieg0Code/customer_service_ai_agents",
          hrefLabel: "Ver en GitHub",
          bentoSize: "standard",
          imageSrc: "/projects/customer-service-arch.png",
          imageAlt: "Diagrama de arquitectura del sistema multi-agente"
        },
        {
          kicker: "Serverless RAG",
          title: "Personal Intelligent Assistant",
          summary:
            "Asistente personal serverless con búsqueda semántica y RAG. AWS Lambda + pgvector + OpenAI embeddings. **Arquitectura orientada a costo cero en reposo.**",
          tags: ["AWS Lambda", "RAG", "pgvector"],
          href: "https://github.com/Dieg0Code/portfolio_04_personal_intelligent_assistant",
          hrefLabel: "Ver en GitHub",
          bentoSize: "standard",
          imageSrc: "/projects/pia-infra.png",
          imageAlt: "Diagrama de infraestructura serverless del PIA"
        },
        {
          kicker: "SDK / Tooling",
          title: "syndicate-go",
          summary:
            "SDK para construir y orquestar agentes **sin pelear con la complejidad base**.",
          tags: ["Go", "Agentes", "Tooling"],
          href: "https://github.com/Dieg0Code/syndicate-go",
          hrefLabel: "Ver en GitHub",
          bentoSize: "standard",
          imageSrc: "/projects/syndicate-logo.png",
          imageAlt: "Logo de Syndicate SDK",
          isLogo: true
        },
        {
          kicker: "Producto mobile",
          title: "pia-app",
          summary:
            "App móvil con RAG enfocada en contexto, recuperación y uso real.",
          tags: ["React Native", "RAG", "Móvil"],
          href: "https://github.com/Dieg0Code/pia-app",
          hrefLabel: "Ver en GitHub",
          bentoSize: "standard",
          imageGallery: [
            { src: "/projects/pia-app/pia-auth.jpeg", alt: "Autenticación biométrica en PIA" },
            { src: "/projects/pia-app/pia-registros-1.jpeg", alt: "Pantalla de registros" },
            { src: "/projects/pia-app/pia-chat.jpeg", alt: "Chat con PIA usando RAG" }
          ]
        },
        {
          kicker: "Docencia",
          title: "Módulos AIEP",
          summary:
            "Material técnico y clases para **cuatro asignaturas activas en AIEP** — pensadas para explicar bien, ordenar procesos y mover equipos.",
          tags: ["AIEP", "Docencia", "Formación"],
          href: "https://github.com/Dieg0Code?tab=repositories&q=PRO",
          hrefLabel: "Ver todos en GitHub",
          bentoSize: "hero",
          imageSrc: "/projects/aiep-logo.png",
          imageAlt: "Logo de AIEP",
          isLogo: true,
          modules: [
            {
              code: "PRO301",
              title: "Taller de Aplicaciones para Internet",
              href: "https://github.com/Dieg0Code/PRO301_Taller_de_Aplicaciones_para_Internet"
            },
            {
              code: "PRO402",
              title: "Taller de Testing",
              href: "https://github.com/Dieg0Code/PRO402-Taller-de-Testing"
            },
            {
              code: "PRO205",
              title: "Taller de Programación",
              href: "https://github.com/Dieg0Code/PRO205-Taller-de-Programacion"
            },
            {
              code: "PRO204",
              title: "Metodologías de Desarrollo",
              href: "https://github.com/Dieg0Code/PRO204-Metodologias-de-desarrollo"
            }
          ]
        }
      ]
    },
    blog: {
      eyebrow: "Notas",
      title: "Escribo sobre lo que construyo.",
      copy:
        "Apuntes sobre IA aplicada, backend y docencia — con código, diagramas y detalle suficiente para que sirva.",
      ctaLabel: "Ver todas las notas →",
      ctaHref: "/blog",
      latestKicker: "Última nota",
      latestReadLabel: "min de lectura",
      pulse: {
        kicker: "Señal",
        title: "Qué se movió últimamente",
        emptyLabel: "Sin actividad pública reciente."
      }
    },
    contact: {
      eyebrow: "Disponible",
      copy:
        "Construyo software web y backend, integro IA adaptada a los datos y procesos de tu negocio, y capacito equipos técnicos. Escríbeme y conversamos qué se puede hacer.",
      availability:
        "Abierto a: desarrollo web y backend · IA aplicada a tu negocio · docencia técnica",
      responseTime: "Respondo en 1-2 días",
      mailLabel: "Correo directo",
      primaryCta: "Escríbeme",
      secondaryCta: "Ver proyectos",
      mailSubject: "Te escribo desde tu portafolio",
      facts: [
        { label: "TZ", value: "UTC-4 · CL" },
        { label: "Idiomas", value: "ES · EN" },
        { label: "Canales", value: "Mail · GH" },
        { label: "SLA", value: "1-2 días" }
      ],
      signalTitle: "Señal reciente",
      signals: [
        { meta: "2d", kind: "class", project: "AIEP / S4" },
        { meta: "4d", kind: "merge", project: "rag-lab" },
        { meta: "1w", kind: "push", project: "zero-rs" },
        { meta: "2w", kind: "deploy", project: "pia-app" }
      ]
    },
    footer: {
      note: "Software web y backend, IA aplicada, docencia e investigación.",
      items: ["web y backend", "agentes IA", "IA aplicada", "docencia AIEP"],
      profileLabel: "GitHub / Dieg0Code"
    }
  },
  en: {
    brand: {
      name: "Diego Obando",
      strapline: "Fullstack, applied AI, and technical teaching."
    },
    nav: {
      work: "Work",
      notes: "Notes",
      contact: "Contact"
    },
    hero: {
      eyebrow: "Software development / teaching",
      bannerNote: "fullstack software · AI applied to your business · teaching",
      headline: "I build software. I teach. Sometimes I train neural networks from scratch.",
      statusLabel: "currently",
      statusNote: "training a transformer + MCTS · teaching at AIEP",
      location: "Osorno, Chile · UTC-4",
      lede:
        "Fullstack developer since 2018, focused on backend (Go, Java, TypeScript), cloud-native architectures, and AI adapted to the real data and processes of each business. I teach at AIEP —where I graduated with highest honors— and build systems that deliver value in production.",
      primaryCta: "View work",
      secondaryCta: "Write to me",
      asideEyebrow: "How I move",
      asideBody:
        "Backend in Go, serverless architectures (AWS Lambda, Terraform), AI applied with agents and semantic search over each client's own data. I maintain Syndicate, a small Go SDK for orchestrating agents, and contribute to open source whenever something needs fixing.",
      list: [
        "Understand before writing code",
        "Integrate AI only when it adds real value",
        "Finish what I start"
      ],
      stats: [
        {
          label: "Track record",
          value: "Since 2018",
          note: "backend, cloud, AI",
          accent: true,
          live: true
        },
        {
          label: "Stack",
          value: "Go · Java · TS",
          note: "AWS · Terraform · pgvector"
        },
        {
          label: "Teaching",
          value: "AIEP",
          note: "4 active courses",
          accent: true
        },
        {
          label: "Education",
          value: "Highest honors",
          note: "GPA 6.4/7.0",
          accent: true
        }
      ]
    },
    work: {
      eyebrow: "Selected work",
      title: "Recent work across research, product, and teaching.",
      copy: "ML research, RAG products, DevSecOps, and applied teaching.",
      projects: [
        {
          kicker: "ML research / games",
          title: "ataxx-zero",
          summary:
            "An AI engine that learns Ataxx from scratch using deep reinforcement learning and self-play. **No manual heuristics: strategy emerges from training.**",
          tags: ["Reinforcement Learning", "Transformers", "PyTorch"],
          href: "https://github.com/Dieg0Code/ataxx-zero",
          hrefLabel: "View on GitHub",
          bentoSize: "hero",
          imageSrc: "/projects/ataxx-zero.png",
          imageAlt: "ataxx-zero web interface in production"
        },
        {
          kicker: "ML / NLP",
          title: "NanoLogicLM",
          summary:
            "Experiment: a decoder-only transformer trained to translate natural language into propositional logic. RoPE, SwiGLU and curriculum learning from scratch.",
          tags: ["Transformers", "NLP", "PyTorch"],
          href: "https://github.com/Dieg0Code/NanoLogicLM",
          hrefLabel: "View on GitHub",
          bentoSize: "wide",
          isExperiment: true
        },
        {
          kicker: "DevSecOps",
          title: "player_profile",
          summary:
            "Go REST API with a **complete CI/CD pipeline**: static analysis, **vulnerability scanning**, Terraform IaC, and automated deployment on AWS.",
          tags: ["Go", "Terraform", "AWS"],
          href: "https://github.com/Dieg0Code/portfolio_01_player_profile",
          hrefLabel: "View on GitHub",
          bentoSize: "narrow"
        },
        {
          kicker: "Product / AI agents",
          title: "customer_service_ai_agents",
          summary:
            "Multi-agent platform for restaurant customer service. Tool orchestration, menu embeddings, and **WhatsApp integration**.",
          tags: ["Go", "Agents", "Embeddings"],
          href: "https://github.com/Dieg0Code/customer_service_ai_agents",
          hrefLabel: "View on GitHub",
          bentoSize: "standard",
          imageSrc: "/projects/customer-service-arch.png",
          imageAlt: "Multi-agent system architecture diagram"
        },
        {
          kicker: "Serverless RAG",
          title: "Personal Intelligent Assistant",
          summary:
            "Serverless personal assistant with semantic search and RAG. AWS Lambda + pgvector + OpenAI embeddings. **Architecture designed for zero cost at rest.**",
          tags: ["AWS Lambda", "RAG", "pgvector"],
          href: "https://github.com/Dieg0Code/portfolio_04_personal_intelligent_assistant",
          hrefLabel: "View on GitHub",
          bentoSize: "standard",
          imageSrc: "/projects/pia-infra.png",
          imageAlt: "PIA serverless infrastructure diagram"
        },
        {
          kicker: "SDK / Tooling",
          title: "syndicate-go",
          summary:
            "An SDK for building and orchestrating agents **without fighting the underlying complexity**.",
          tags: ["Go", "Agents", "Tooling"],
          href: "https://github.com/Dieg0Code/syndicate-go",
          hrefLabel: "View on GitHub",
          bentoSize: "standard",
          imageSrc: "/projects/syndicate-logo.png",
          imageAlt: "Syndicate SDK logo",
          isLogo: true
        },
        {
          kicker: "Mobile product",
          title: "pia-app",
          summary:
            "A mobile app with RAG focused on context, retrieval, and real use.",
          tags: ["React Native", "RAG", "Mobile"],
          href: "https://github.com/Dieg0Code/pia-app",
          hrefLabel: "View on GitHub",
          bentoSize: "standard",
          imageGallery: [
            { src: "/projects/pia-app/pia-auth.jpeg", alt: "Biometric auth in PIA" },
            { src: "/projects/pia-app/pia-registros-1.jpeg", alt: "Records screen" },
            { src: "/projects/pia-app/pia-chat.jpeg", alt: "Chat with PIA using RAG" }
          ]
        },
        {
          kicker: "Teaching",
          title: "AIEP modules",
          summary:
            "Technical material and classes for **four active AIEP courses** — built to explain clearly, streamline process, and move teams forward.",
          tags: ["AIEP", "Teaching", "Training"],
          href: "https://github.com/Dieg0Code?tab=repositories&q=PRO",
          hrefLabel: "View all on GitHub",
          bentoSize: "hero",
          imageSrc: "/projects/aiep-logo.png",
          imageAlt: "AIEP logo",
          isLogo: true,
          modules: [
            {
              code: "PRO301",
              title: "Web Application Workshop",
              href: "https://github.com/Dieg0Code/PRO301_Taller_de_Aplicaciones_para_Internet"
            },
            {
              code: "PRO402",
              title: "Testing Workshop",
              href: "https://github.com/Dieg0Code/PRO402-Taller-de-Testing"
            },
            {
              code: "PRO205",
              title: "Programming Workshop",
              href: "https://github.com/Dieg0Code/PRO205-Taller-de-Programacion"
            },
            {
              code: "PRO204",
              title: "Development Methodologies",
              href: "https://github.com/Dieg0Code/PRO204-Metodologias-de-desarrollo"
            }
          ]
        }
      ]
    },
    blog: {
      eyebrow: "Notes",
      title: "I write about what I build.",
      copy:
        "Field notes on applied AI, backend, and teaching — with code, diagrams, and enough detail to be useful.",
      ctaLabel: "Read all notes →",
      ctaHref: "/blog",
      latestKicker: "Latest note",
      latestReadLabel: "min read",
      pulse: {
        kicker: "Signal",
        title: "What moved lately",
        emptyLabel: "No recent public activity."
      }
    },
    contact: {
      eyebrow: "Available",
      copy:
        "I build web and backend software, integrate AI adapted to your business data and processes, and train technical teams. Write to me and we'll talk about what's possible.",
      availability:
        "Open to: web and backend development · AI applied to your business · technical teaching",
      responseTime: "I reply within 1-2 days",
      mailLabel: "Direct email",
      primaryCta: "Write to me",
      secondaryCta: "View work",
      mailSubject: "Writing from your portfolio",
      facts: [
        { label: "TZ", value: "UTC-4 · CL" },
        { label: "Languages", value: "ES · EN" },
        { label: "Channels", value: "Mail · GH" },
        { label: "SLA", value: "1-2 days" }
      ],
      signalTitle: "Recent signal",
      signals: [
        { meta: "2d", kind: "class", project: "AIEP / S4" },
        { meta: "4d", kind: "merge", project: "rag-lab" },
        { meta: "1w", kind: "push", project: "zero-rs" },
        { meta: "2w", kind: "deploy", project: "pia-app" }
      ]
    },
    footer: {
      note: "Web and backend software, applied AI, teaching, and research.",
      items: ["web and backend", "AI agents", "applied AI", "AIEP teaching"],
      profileLabel: "GitHub / Dieg0Code"
    }
  }
};
