"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import { AtaxxArena } from "@/components/home/ataxx-arena";
import { AtaxxPlayCard } from "@/components/home/ataxx-play-card";
import { AtaxxStrategyDiagram } from "@/components/home/ataxx-strategy-diagram";
import { AulaSubtitlesDiagram } from "@/components/home/aula-subtitles-diagram";
import { GeoGreenTelemetryDiagram } from "@/components/home/geogreen-telemetry-diagram";
import { NemMemoryDiagram } from "@/components/home/nem-memory-diagram";
import { PersonalArchive } from "@/components/home/personal-archive";

const MAX_SHIFT_PERCENT = 42;
const SNAP_THRESHOLD = 0.46;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

type Locale = "es" | "en";
type SectionId = "projects" | "profile" | "arena";
type ProjectId = "geogreen" | "nem" | "ataxx" | "aula";

const PROJECT_ORDER: ProjectId[] = ["geogreen", "nem", "ataxx", "aula"];
const SECTION_ORDER: SectionId[] = ["projects", "profile", "arena"];

const COPY = {
  es: {
    portfolio: "PORTAFOLIO",
    location: "OSORNO, CHILE",
    active: "ACTIVO",
    register: "REGISTRO / 01",
    navigationLabel: "Secciones del portfolio",
    navigationTitle: "ÍNDICE",
    navigationHint: "FLECHAS / ENTER",
    projectsNav: "PROYECTOS",
    profileNav: "PERFIL",
    arenaNav: "ARENA",
    languageLabel: "Cambiar idioma",
    kicker: "DIEGO OBANDO",
    headline: "PROGRAMADOR Y DOCENTE",
    role: "PYTHON. GO. TYPESCRIPT.",
    trajectory: "TRAYECTORIA",
    years: "2018—HOY",
    region: "SUR DE CHILE",
    projectWord: "PROYECTO",
    projectHeading: "ARCHIVO DE PROYECTOS",
    projectNavigationLabel: "Seleccionar proyecto",
    projectNavigationHint: "DOSSIER DISPONIBLE",
    projectRecords: [
      ["geogreen", "01", "GEOGREEN", "IOT / STEM", true],
      ["nem", "02", "NEM", "MEMORIA / AGENTES", true],
      ["ataxx", "03", "ATAXX ZERO", "ML / SELF-PLAY", true],
      ["aula", "04", "AULA SUBTITULADA", "ACCESIBILIDAD", true]
    ],
    position: "POSICIÓN",
    states: {
      transit: "EN TRÁNSITO",
      open: "ABIERTO",
      rest: "CERRADO"
    },
    facts: [
      ["ROL", "AUTOR / MANTENEDOR"],
      ["ESTADO", "PUBLICADO / EN USO"],
      ["MÉTODO", "GO · RECUPERACIÓN HÍBRIDA"],
      ["DISTRIBUCIÓN", "HOMEBREW · SCOOP"]
    ],
    evidence: "EVIDENCIA",
    openRepository: "ABRIR REPOSITORIO ↗",
    openDrawer: "Abrir el cajón del proyecto",
    closeDrawer: "Cerrar el cajón del proyecto",
    pull: "ABRIR",
    push: "CERRAR",
    category: "INFRAESTRUCTURA DE MEMORIA",
    description:
      "Contexto versionado para agentes que necesitan conservar decisiones, correcciones y estado de trabajo compartido.",
    release: "ESTADO",
    public: "PÚBLICO",
    stack: "GO / CLI / BÚSQUEDA",
    diagramTitle: "Memoria compartida y versionada",
    diagramDescription:
      "Tres agentes escriben contexto en NEM y producen un historial de versiones verificable.",
    diagramAgents: "AGENTES",
    diagramVersions: "VERSIONES",
    geoFacts: [
      ["ALCANCE", "60 ESTUDIANTES · 3 DISCIPLINAS"],
      ["SISTEMA", "SENSAR · ENVIAR · VISUALIZAR"],
      ["HARDWARE", "UNO R4 WIFI · ULTRASONIDO"],
      ["INTERFAZ", "PWA · MAPA DE OSORNO"]
    ],
    geoCategory: "SISTEMA CÍVICO / IOT",
    geoDescription:
      "Programa STEM y sistema de monitoreo que conecta sensores, firmware y visualización georreferenciada para transformar el reciclaje en una experiencia medible.",
    geoPublic: "EN DESARROLLO",
    geoStack: "ARDUINO / REACT / IOT",
    geoDiagramTitle: "Cadena de telemetría GeoGreen",
    geoDiagramDescription:
      "Un sensor mide el llenado, el dispositivo interpreta la lectura y el sistema la ubica en un mapa de Osorno.",
    geoDiagramSense: "SENSAR",
    geoDiagramSend: "ENVIAR",
    geoDiagramView: "VISUALIZAR",
    geoDiagramLevel: "NIVEL",
    geoDiagramAlert: "ALERTA",
    ataxxFacts: [
      ["MODELO", "NÉMESIS · V15.3 · ITER 192"],
      ["APRENDIZAJE", "SELF-PLAY · LIGA DE GENERACIONES"],
      ["EVALUACIÓN", "38–0–2 VS CAMPEÓN ANTERIOR"],
      ["ARENA", "22 RIVALES EN ÍNDICE / 03"]
    ],
    ataxxCategory: "IA DE JUEGO / SELF-PLAY",
    ataxxDescription:
      "Motor de IA para Ataxx entrenado mediante self-play y llevado a clases y talleres. NÉMESIS combina un Transformer espacial, MCTS y una liga de generaciones para aprender estrategia en un tablero 7×7.",
    ataxxPublic: "NÉMESIS / V15.3 · 192",
    ataxxStack: "PYTORCH / MCTS / SELF-PLAY",
    ataxxDiagramTitle: "Ataxx Zero: juego, búsqueda y aprendizaje",
    ataxxDiagramDescription:
      "Un tablero de Ataxx alimenta una búsqueda MCTS y una liga de generaciones que culmina en NÉMESIS.",
    ataxxDiagramPlay: "JUGAR",
    ataxxDiagramSearch: "BUSCAR",
    ataxxDiagramLearn: "APRENDER",
    ataxxDiagramChampion: "H2H",
    ataxxPlayLabel: "JUGAR",
    ataxxFlipLabel: "Girar la tarjeta y jugar Ataxx",
    ataxxBoardLabel: "Tablero de Ataxx",
    ataxxHumanLabel: "TÚ",
    ataxxHeuristicLabel: "NÉMESIS",
    ataxxYourTurnLabel: "ELIGE DESTINO",
    ataxxThinkingLabel: "NÉMESIS PIENSA",
    ataxxSelectLabel: "ELIGE FICHA",
    ataxxHumanPassLabel: "SIN MOVIMIENTOS · PASA",
    ataxxHeuristicPassLabel: "NÉMESIS PASA",
    ataxxWinLabel: "VICTORIA",
    ataxxLoseLabel: "DERROTA",
    ataxxDrawLabel: "EMPATE",
    ataxxAcceptLabel: "ACEPTAR",
    ataxxNewGameLabel: "Reiniciar tablero",
    ataxxBackLabel: "Volver a la tarjeta",
    aulaTitle: "AULA SUBTITULADA",
    aulaFacts: [
      ["CAPTURA", "ANDROID · SPEECH / PCM"],
      ["TRANSPORTE", "GO · WEBSOCKET / RAILWAY"],
      ["ESCRITORIO", "TAURI · OVERLAY FLOTANTE"],
      ["SALIDA", "MARKDOWN · PDF · DOCX"]
    ],
    aulaCategory: "ACCESIBILIDAD / TIEMPO REAL",
    aulaDescription:
      "Sistema de subtitulado en tiempo real que convierte el celular del docente en micrófono y coloca la transcripción sobre cualquier aplicación del aula.",
    aulaPublic: "PROTOTIPO / V0.2",
    aulaStack: "ANDROID / TAURI / GO",
    aulaDiagramTitle: "Aula Subtitulada: de la voz al overlay",
    aulaDiagramDescription:
      "El celular captura la voz, un relay WebSocket empareja la sesión y el computador muestra subtítulos flotantes.",
    aulaDiagramCapture: "CAPTURA",
    aulaDiagramRelay: "RELAY",
    aulaDiagramOverlay: "OVERLAY",
    aulaDiagramLive: "EN VIVO",
    aulaDiagramSession: "SESIÓN",
    aulaCaptionLineOne: "LA EXPLICACIÓN",
    aulaCaptionLineTwo: "TAMBIÉN SE LEE",
    dragInstruction: "ARRASTRA EL TIRADOR",
    alternateInstruction: "CLIC / ENTER /",
    travel: "RECORRIDO",
    discipline: "PROGRAMACIÓN / DOCENCIA",
    practice: "SISTEMAS · HERRAMIENTAS · APRENDIZAJE"
  },
  en: {
    portfolio: "PORTFOLIO",
    location: "OSORNO, CHILE",
    active: "ACTIVE",
    register: "REGISTER / 01",
    navigationLabel: "Portfolio sections",
    navigationTitle: "INDEX",
    navigationHint: "ARROWS / ENTER",
    projectsNav: "PROJECTS",
    profileNav: "PROFILE",
    arenaNav: "ARENA",
    languageLabel: "Change language",
    kicker: "DIEGO OBANDO",
    headline: "PROGRAMMER AND TEACHER",
    role: "PYTHON. GO. TYPESCRIPT.",
    trajectory: "TRAJECTORY",
    years: "2018—NOW",
    region: "SOUTHERN CHILE",
    projectWord: "PROJECT",
    projectHeading: "PROJECT ARCHIVE",
    projectNavigationLabel: "Select project",
    projectNavigationHint: "DOSSIER AVAILABLE",
    projectRecords: [
      ["geogreen", "01", "GEOGREEN", "IOT / STEM", true],
      ["nem", "02", "NEM", "MEMORY / AGENTS", true],
      ["ataxx", "03", "ATAXX ZERO", "ML / SELF-PLAY", true],
      ["aula", "04", "SUBTITLED CLASSROOM", "ACCESSIBILITY", true]
    ],
    position: "POSITION",
    states: {
      transit: "IN TRANSIT",
      open: "OPEN",
      rest: "CLOSED"
    },
    facts: [
      ["ROLE", "AUTHOR / MAINTAINER"],
      ["STATUS", "RELEASED / IN USE"],
      ["METHOD", "GO · HYBRID RETRIEVAL"],
      ["DISTRIBUTION", "HOMEBREW · SCOOP"]
    ],
    evidence: "EVIDENCE",
    openRepository: "OPEN REPOSITORY ↗",
    openDrawer: "Open the project drawer",
    closeDrawer: "Close the project drawer",
    pull: "OPEN",
    push: "CLOSE",
    category: "MEMORY INFRASTRUCTURE",
    description:
      "Versioned context for agents that need to preserve decisions, corrections and shared working state.",
    release: "STATUS",
    public: "PUBLIC",
    stack: "GO / CLI / SEARCH",
    diagramTitle: "Shared versioned memory",
    diagramDescription:
      "Three agents write context into NEM and produce a verifiable version history.",
    diagramAgents: "AGENTS",
    diagramVersions: "VERSIONS",
    geoFacts: [
      ["REACH", "60 STUDENTS · 3 DISCIPLINES"],
      ["SYSTEM", "SENSE · SEND · VISUALIZE"],
      ["HARDWARE", "UNO R4 WIFI · ULTRASONIC"],
      ["INTERFACE", "PWA · OSORNO MAP"]
    ],
    geoCategory: "CIVIC SYSTEM / IOT",
    geoDescription:
      "A STEM program and monitoring system connecting sensors, firmware and georeferenced visualization to make recycling measurable.",
    geoPublic: "IN DEVELOPMENT",
    geoStack: "ARDUINO / REACT / IOT",
    geoDiagramTitle: "GeoGreen telemetry chain",
    geoDiagramDescription:
      "A sensor measures fill level, the device interprets the reading, and the system locates it on a map of Osorno.",
    geoDiagramSense: "SENSE",
    geoDiagramSend: "SEND",
    geoDiagramView: "VISUALIZE",
    geoDiagramLevel: "LEVEL",
    geoDiagramAlert: "ALERT",
    ataxxFacts: [
      ["MODEL", "NEMESIS · V15.3 · ITER 192"],
      ["LEARNING", "SELF-PLAY · GENERATIONAL LEAGUE"],
      ["EVALUATION", "38–0–2 VS PREVIOUS CHAMPION"],
      ["ARENA", "22 RIVALS IN INDEX / 03"]
    ],
    ataxxCategory: "GAME AI / SELF-PLAY",
    ataxxDescription:
      "An Ataxx engine trained through self-play and brought into classes and workshops. NEMESIS combines a spatial Transformer, MCTS, and a generational league to learn strategy on a 7×7 board.",
    ataxxPublic: "NEMESIS / V15.3 · 192",
    ataxxStack: "PYTORCH / MCTS / SELF-PLAY",
    ataxxDiagramTitle: "Ataxx Zero: play, search, and learning",
    ataxxDiagramDescription:
      "An Ataxx board feeds MCTS search and a generational league culminating in NEMESIS.",
    ataxxDiagramPlay: "PLAY",
    ataxxDiagramSearch: "SEARCH",
    ataxxDiagramLearn: "LEARN",
    ataxxDiagramChampion: "H2H",
    ataxxPlayLabel: "PLAY",
    ataxxFlipLabel: "Flip the card and play Ataxx",
    ataxxBoardLabel: "Ataxx board",
    ataxxHumanLabel: "YOU",
    ataxxHeuristicLabel: "NEMESIS",
    ataxxYourTurnLabel: "CHOOSE TARGET",
    ataxxThinkingLabel: "NEMESIS THINKS",
    ataxxSelectLabel: "CHOOSE PIECE",
    ataxxHumanPassLabel: "NO MOVES · PASS",
    ataxxHeuristicPassLabel: "NEMESIS PASSES",
    ataxxWinLabel: "VICTORY",
    ataxxLoseLabel: "DEFEAT",
    ataxxDrawLabel: "DRAW",
    ataxxAcceptLabel: "ACCEPT",
    ataxxNewGameLabel: "Restart board",
    ataxxBackLabel: "Return to card",
    aulaTitle: "SUBTITLED CLASSROOM",
    aulaFacts: [
      ["CAPTURE", "ANDROID · SPEECH / PCM"],
      ["TRANSPORT", "GO · WEBSOCKET / RAILWAY"],
      ["DESKTOP", "TAURI · FLOATING OVERLAY"],
      ["OUTPUT", "MARKDOWN · PDF · DOCX"]
    ],
    aulaCategory: "ACCESSIBILITY / REAL TIME",
    aulaDescription:
      "A real-time captioning system that turns the teacher's phone into a microphone and places the transcript over any classroom application.",
    aulaPublic: "PROTOTYPE / V0.2",
    aulaStack: "ANDROID / TAURI / GO",
    aulaDiagramTitle: "Subtitled Classroom: from voice to overlay",
    aulaDiagramDescription:
      "The phone captures speech, a WebSocket relay pairs the session, and the computer displays floating captions.",
    aulaDiagramCapture: "CAPTURE",
    aulaDiagramRelay: "RELAY",
    aulaDiagramOverlay: "OVERLAY",
    aulaDiagramLive: "LIVE",
    aulaDiagramSession: "SESSION",
    aulaCaptionLineOne: "THE EXPLANATION",
    aulaCaptionLineTwo: "CAN ALSO BE READ",
    dragInstruction: "DRAG THE HANDLE",
    alternateInstruction: "CLICK / ENTER /",
    travel: "TRAVEL",
    discipline: "SOFTWARE / TEACHING",
    practice: "SYSTEMS · TOOLS · LEARNING"
  }
} as const;

type DrawerStyle = CSSProperties & {
  "--drawer-progress": number;
  "--drawer-shift": string;
  "--drawer-reveal": string;
  "--drawer-rotation": string;
  "--drawer-shadow-shift": string;
};

type ProjectRegisterStyle = CSSProperties & {
  "--project-index": number;
};

export function MechanicalDrawerPrototype() {
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startProgress: 0,
    moved: false
  });
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [locale, setLocale] = useState<Locale>("es");
  const [activeSection, setActiveSection] = useState<SectionId>("projects");
  const [activeProject, setActiveProject] = useState<ProjectId>("geogreen");
  const [isAtaxxCardFlipped, setIsAtaxxCardFlipped] = useState(false);

  const isOpen = progress >= SNAP_THRESHOLD;
  const t = COPY[locale];
  const stateKey = isDragging ? "transit" : isOpen ? "open" : "rest";
  const stateLabel = t.states[stateKey];
  const project =
    activeProject === "geogreen"
      ? {
          index: "01",
          title: "GEOGREEN",
          category: t.geoCategory,
          description: t.geoDescription,
          status: t.geoPublic,
          stack: t.geoStack,
          facts: t.geoFacts,
          href: "https://github.com/Dieg0Code/proyecto-01-aiep-geogreen"
        }
      : activeProject === "nem"
        ? {
          index: "02",
          title: "NEM",
          category: t.category,
          description: t.description,
          status: t.public,
          stack: t.stack,
          facts: t.facts,
          href: "https://github.com/Dieg0Code/nem"
        }
        : activeProject === "ataxx"
          ? {
            index: "03",
            title: "ATAXX ZERO",
            category: t.ataxxCategory,
            description: t.ataxxDescription,
            status: t.ataxxPublic,
            stack: t.ataxxStack,
            facts: t.ataxxFacts,
            href: "https://github.com/Dieg0Code/ataxx-zero-ai"
          }
          : {
              index: "04",
              title: t.aulaTitle,
              category: t.aulaCategory,
              description: t.aulaDescription,
              status: t.aulaPublic,
              stack: t.aulaStack,
              facts: t.aulaFacts,
              href: "https://github.com/Dieg0Code/aiep-subtitulos"
            };

  useEffect(() => {
    const syncSectionFromHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#profile") {
        setActiveSection("profile");
        setIsAtaxxCardFlipped(false);
        return;
      }

      if (hash === "#arena") {
        setActiveSection("arena");
        setIsAtaxxCardFlipped(false);
        return;
      }

      setActiveSection("projects");
      setIsAtaxxCardFlipped(false);
      setActiveProject(
        hash.includes("/ataxx")
          ? "ataxx"
          : hash.includes("/aula")
            ? "aula"
          : hash.includes("/nem")
            ? "nem"
            : "geogreen"
      );
    };

    const frame = window.requestAnimationFrame(syncSectionFromHash);
    window.addEventListener("hashchange", syncSectionFromHash);
    window.addEventListener("popstate", syncSectionFromHash);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncSectionFromHash);
      window.removeEventListener("popstate", syncSectionFromHash);
    };
  }, []);

  const selectSection = (section: SectionId) => {
    if (section === activeSection) return;

    setActiveSection(section);
    if (section !== "projects") setIsAtaxxCardFlipped(false);
    window.history.pushState(
      null,
      "",
      section === "projects"
        ? `#projects/${activeProject}`
        : section === "arena"
          ? "#arena"
          : "#profile"
    );
  };

  const openGeoGreenFromProfile = () => {
    progressRef.current = 0;
    setProgress(0);
    setIsDragging(false);
    setActiveProject("geogreen");
    setActiveSection("projects");
    window.history.pushState(null, "", "#projects/geogreen");
  };

  const handleSectionKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    const currentIndex = SECTION_ORDER.indexOf(activeSection);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? SECTION_ORDER.length - 1
          : (currentIndex +
              (event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1) +
              SECTION_ORDER.length) %
            SECTION_ORDER.length;
    const nextSection = SECTION_ORDER[nextIndex];

    selectSection(nextSection);
    const selector = event.currentTarget.querySelector<HTMLButtonElement>(
      `[data-section-target="${nextSection}"]`
    );
    selector?.focus();
  };

  const getTravel = () => {
    const width = stageRef.current?.getBoundingClientRect().width ?? 1;
    return width * (MAX_SHIFT_PERCENT / 100);
  };

  const updateProgress = (value: number) => {
    const next = clamp(value);
    progressRef.current = next;
    setProgress(next);
  };

  const settle = (nextOpen: boolean) => {
    setIsDragging(false);
    updateProgress(nextOpen ? 1 : 0);
  };

  const selectProject = (nextProject: ProjectId) => {
    if (nextProject === activeProject) return;

    settle(false);
    setIsAtaxxCardFlipped(false);
    setActiveProject(nextProject);
    window.history.pushState(null, "", `#projects/${nextProject}`);
  };

  const handleProjectKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    const currentIndex = PROJECT_ORDER.indexOf(activeProject);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? PROJECT_ORDER.length - 1
          : Math.min(
              PROJECT_ORDER.length - 1,
              Math.max(
                0,
                currentIndex +
                  (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1)
              )
            );
    const nextProject = PROJECT_ORDER[nextIndex];

    selectProject(nextProject);
    event.currentTarget
      .querySelector<HTMLButtonElement>(
        `[data-project-target="${nextProject}"]`
      )
      ?.focus();
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startProgress: progress,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    const delta = event.clientX - dragRef.current.startX;
    if (Math.abs(delta) > 5) dragRef.current.moved = true;

    const next = clamp(
      dragRef.current.startProgress + delta / Math.max(getTravel(), 1)
    );
    updateProgress(next);
  };

  const finishPointerGesture = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current.pointerId = -1;
    settle(progressRef.current >= SNAP_THRESHOLD);
  };

  const handleClick = () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    settle(!isOpen);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight" || event.key === "End") {
      event.preventDefault();
      settle(true);
    }

    if (event.key === "ArrowLeft" || event.key === "Home") {
      event.preventDefault();
      settle(false);
    }
  };

  const drawerStyle: DrawerStyle = {
    "--drawer-progress": progress,
    "--drawer-shift": `${progress * MAX_SHIFT_PERCENT}%`,
    "--drawer-reveal": `${(1 - progress) * -18}px`,
    "--drawer-rotation": `${progress * 180}deg`,
    "--drawer-shadow-shift": `${progress * -14}px`
  };
  const projectRegisterStyle: ProjectRegisterStyle = {
    "--project-index": PROJECT_ORDER.indexOf(activeProject)
  };

  return (
    <main className="drawer-lab" lang={locale}>
      <article className="drawer-board" aria-labelledby="prototype-title">
        <span className="registration-mark registration-mark--nw" aria-hidden="true" />
        <span className="registration-mark registration-mark--ne" aria-hidden="true" />
        <span className="registration-mark registration-mark--sw" aria-hidden="true" />
        <span className="registration-mark registration-mark--se" aria-hidden="true" />

        <header className="drawer-board__bar">
          <strong>D.OBANDO/</strong>
          <span>{t.portfolio}</span>
          <span className="drawer-board__bar-spacer" />
          <span>{t.location}</span>
          <span>UTC−04:00</span>
          <span className="drawer-board__signal">
            <i aria-hidden="true" />
            {t.active}
          </span>
          <div className="language-switch" aria-label={t.languageLabel}>
            {(["es", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={locale === option}
                onClick={() => setLocale(option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <div className="drawer-board__sheet">
          <nav
            className="section-selector"
            aria-label={t.navigationLabel}
            data-active={activeSection}
            onKeyDown={handleSectionKeyDown}
          >
            <div className="section-selector__header">
              <span>{t.navigationTitle}</span>
              <strong>03</strong>
            </div>

            <div className="section-selector__options">
              <span className="section-selector__carriage" aria-hidden="true" />
              {(
                [
                  ["projects", "01", t.projectsNav],
                  ["profile", "02", t.profileNav],
                  ["arena", "03", t.arenaNav]
                ] as const
              ).map(([section, index, label]) => (
                <button
                  key={section}
                  type="button"
                  data-section-target={section}
                  aria-current={activeSection === section ? "page" : undefined}
                  onClick={() => selectSection(section)}
                >
                  <span>{index}</span>
                  <strong>{label}</strong>
                  <i aria-hidden="true">→</i>
                </button>
              ))}
            </div>

            <p>{t.navigationHint}</p>
          </nav>

          <div className="drawer-board__content" data-section={activeSection}>
            <header className="prototype-masthead">
              <div>
                <p className="prototype-kicker">{t.kicker}</p>
                <h1 id="prototype-title">{t.headline}</h1>
                <p className="prototype-role">{t.role}</p>
              </div>

              <div className="prototype-issue">
                <span>{t.trajectory}</span>
                <strong>{t.years}</strong>
                <small>{t.region}</small>
              </div>
            </header>

            <div className="section-stage" data-section={activeSection}>
            <section
              id="projects-panel"
              className="mechanism section-panel section-panel--projects"
              aria-labelledby="mechanism-title"
              aria-hidden={activeSection !== "projects"}
              inert={activeSection !== "projects"}
            >
              <div className="mechanism__heading">
                <div>
                  <span>
                    {t.projectWord} / {project.index}
                  </span>
                  <h2 id="mechanism-title">{t.projectHeading}</h2>
                </div>
                <output className="mechanism__state" aria-live="polite">
                  <span>{t.position}</span>
                  <strong>{stateLabel}</strong>
                </output>
              </div>

              <nav
                className="project-register"
                aria-label={t.projectNavigationLabel}
                data-project={activeProject}
                style={projectRegisterStyle}
                onKeyDown={handleProjectKeyDown}
              >
                <span className="project-register__carriage" aria-hidden="true" />
                {t.projectRecords.map(
                  ([id, index, label, field, available]) => (
                    <button
                      key={id}
                      type="button"
                      data-project-target={id}
                      data-available={available}
                      disabled={!available}
                      aria-current={activeProject === id ? "true" : undefined}
                      aria-label={
                        available
                          ? `${label} · ${t.projectNavigationHint}`
                          : label
                      }
                      onClick={() => {
                        if (
                          id === "geogreen" ||
                          id === "nem" ||
                          id === "ataxx" ||
                          id === "aula"
                        ) {
                          selectProject(id);
                        }
                      }}
                    >
                      <span>{index}</span>
                      <strong>{label}</strong>
                      <small>{field}</small>
                      <i aria-hidden="true">{available ? "●" : "○"}</i>
                    </button>
                  )
                )}
              </nav>

              <div
                ref={stageRef}
                className={`project-drawer${isDragging ? " is-dragging" : ""}${
                  isOpen ? " is-open" : ""
                }`}
                style={drawerStyle}
                data-state={stateKey}
                data-project={activeProject}
              >
                <div
                  id={`drawer-evidence-${activeProject}`}
                  className="project-drawer__cavity"
                  aria-hidden={!isOpen}
                >
                  <div className="cavity-register" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <dl className="cavity-facts">
                    {project.facts.map(([term, definition]) => (
                      <div key={term}>
                        <dt>{term}</dt>
                        <dd>{definition}</dd>
                      </div>
                    ))}
                  </dl>

                  <a
                    className="cavity-evidence-link"
                    href={project.href}
                    target="_blank"
                    rel="noreferrer"
                    tabIndex={activeSection === "projects" && isOpen ? 0 : -1}
                  >
                    <span>{t.evidence}</span>
                    {t.openRepository}
                  </a>
                </div>

                <div className="project-drawer__face" key={activeProject}>
                  <button
                    className="drawer-latch"
                    type="button"
                    tabIndex={activeSection === "projects" ? 0 : -1}
                    aria-expanded={isOpen}
                    aria-controls={`drawer-evidence-${activeProject}`}
                    aria-label={
                      isOpen
                        ? t.closeDrawer
                        : t.openDrawer
                    }
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finishPointerGesture}
                    onPointerCancel={finishPointerGesture}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                  >
                    <span className="drawer-latch__index">{project.index}</span>
                    <span className="drawer-latch__verb">
                      {isOpen ? t.push : t.pull}
                    </span>
                    <span className="drawer-latch__arrow" aria-hidden="true">
                      <i />
                      <b>→</b>
                    </span>
                  </button>

                  <div className="drawer-schematic">
                    {activeProject === "geogreen" ? (
                      <GeoGreenTelemetryDiagram
                        title={t.geoDiagramTitle}
                        description={t.geoDiagramDescription}
                        senseLabel={t.geoDiagramSense}
                        sendLabel={t.geoDiagramSend}
                        viewLabel={t.geoDiagramView}
                        levelLabel={t.geoDiagramLevel}
                        alertLabel={t.geoDiagramAlert}
                      />
                    ) : activeProject === "nem" ? (
                      <NemMemoryDiagram
                        title={t.diagramTitle}
                        description={t.diagramDescription}
                        agentsLabel={t.diagramAgents}
                        versionsLabel={t.diagramVersions}
                      />
                    ) : activeProject === "ataxx" ? (
                      <AtaxxStrategyDiagram
                        title={t.ataxxDiagramTitle}
                        description={t.ataxxDiagramDescription}
                        playLabel={t.ataxxDiagramPlay}
                        searchLabel={t.ataxxDiagramSearch}
                        learnLabel={t.ataxxDiagramLearn}
                        championLabel={t.ataxxDiagramChampion}
                      />
                    ) : (
                      <AulaSubtitlesDiagram
                        title={t.aulaDiagramTitle}
                        description={t.aulaDiagramDescription}
                        captureLabel={t.aulaDiagramCapture}
                        relayLabel={t.aulaDiagramRelay}
                        overlayLabel={t.aulaDiagramOverlay}
                        liveLabel={t.aulaDiagramLive}
                        sessionLabel={t.aulaDiagramSession}
                        captionLineOne={t.aulaCaptionLineOne}
                        captionLineTwo={t.aulaCaptionLineTwo}
                      />
                    )}
                  </div>

                  <div className="drawer-project-copy">
                    <span>{project.category}</span>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                  </div>

                  {activeProject === "ataxx" ? (
                    <AtaxxPlayCard
                      flipped={isAtaxxCardFlipped}
                      onFlippedChange={setIsAtaxxCardFlipped}
                      releaseLabel={t.release}
                      status={project.status}
                      stack={project.stack}
                      playLabel={t.ataxxPlayLabel}
                      flipLabel={t.ataxxFlipLabel}
                      boardLabel={t.ataxxBoardLabel}
                      humanLabel={t.ataxxHumanLabel}
                      heuristicLabel={t.ataxxHeuristicLabel}
                      yourTurnLabel={t.ataxxYourTurnLabel}
                      thinkingLabel={t.ataxxThinkingLabel}
                      selectLabel={t.ataxxSelectLabel}
                      humanPassLabel={t.ataxxHumanPassLabel}
                      heuristicPassLabel={t.ataxxHeuristicPassLabel}
                      winLabel={t.ataxxWinLabel}
                      loseLabel={t.ataxxLoseLabel}
                      drawLabel={t.ataxxDrawLabel}
                      acceptLabel={t.ataxxAcceptLabel}
                      newGameLabel={t.ataxxNewGameLabel}
                      backLabel={t.ataxxBackLabel}
                    />
                  ) : (
                    <div className="drawer-project-meta">
                      <span>{t.release}</span>
                      <strong>{project.status}</strong>
                      <small>{project.stack}</small>
                    </div>
                  )}
                </div>
              </div>

              <footer className="mechanism__instructions">
                <p>
                  <span className="mechanism__instruction-mark">
                    {project.index}
                  </span>
                  {t.dragInstruction}
                </p>
                <p>
                  {t.alternateInstruction} <span aria-hidden="true">← →</span>
                </p>
                <p className="mechanism__progress">
                  {t.travel}
                  <span aria-hidden="true">
                    <i style={{ width: `${Math.max(progress * 100, 2)}%` }} />
                  </span>
                  {Math.round(progress * 100)
                    .toString()
                    .padStart(3, "0")}
                  %
                </p>
              </footer>
            </section>

            <section
              id="profile-panel"
              className="personal-archive section-panel section-panel--profile"
              aria-labelledby="profile-title"
              aria-hidden={activeSection !== "profile"}
              inert={activeSection !== "profile"}
            >
              <PersonalArchive
                locale={locale}
                onOpenGeoGreen={openGeoGreenFromProfile}
              />
            </section>

            <section
              id="arena-panel"
              className="section-panel section-panel--arena"
              aria-label={t.arenaNav}
              aria-hidden={activeSection !== "arena"}
              inert={activeSection !== "arena"}
            >
              <AtaxxArena locale={locale} />
            </section>
            </div>

            <footer className="prototype-footer">
              <span>{t.discipline}</span>
              <span>{t.practice}</span>
              <span>© 2026 DIEGO OBANDO</span>
            </footer>
          </div>
        </div>
      </article>
    </main>
  );
}
