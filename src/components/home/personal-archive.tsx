"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent
} from "react";
import { CvAccessPanel } from "@/components/home/cv-access-panel";
import { GeoGreenTelemetryDiagram } from "@/components/home/geogreen-telemetry-diagram";

type Locale = "es" | "en";
type ArtifactId =
  | "pirates"
  | "pixel-dojo"
  | "pixel-room"
  | "social-graph"
  | "rininahue"
  | "waterfall"
  | "portrait"
  | "selfie"
  | "selfie-blue"
  | "terno"
  | "arduino"
  | "cv";

type ArchiveCardStyle = CSSProperties & {
  "--archive-x": string;
  "--archive-y": string;
  "--archive-rotation": string;
  "--archive-order": number;
};

type PersonalArchiveProps = {
  locale: Locale;
  onOpenGeoGreen: () => void;
};

const ARTIFACT_ORDER: ArtifactId[] = [
  "pirates",
  "pixel-dojo",
  "pixel-room",
  "social-graph",
  "rininahue",
  "waterfall",
  "portrait",
  "selfie",
  "selfie-blue",
  "terno",
  "arduino",
  "cv"
];

const MEDIA: Record<
  ArtifactId,
  {
    src?: string;
    sources?: readonly string[];
    poster?: string;
    kind: "image" | "video" | "video-set" | "document";
    position?: string;
  }
> = {
  pirates: {
    src: "/archive/pirates.mp4",
    poster: "/archive/pirates-poster.webp",
    kind: "video",
    position: "center"
  },
  "pixel-dojo": {
    sources: [
      "/archive/pixel-jump.mp4",
      "/archive/pixel-neighbors.mp4",
      "/archive/pixel-tree.mp4",
      "/archive/pixel-java.mp4"
    ],
    poster: "/archive/pixel-dojo-poster.webp",
    kind: "video-set",
    position: "center"
  },
  "pixel-room": {
    src: "/archive/pixel-room.mp4",
    poster: "/archive/pixel-room-poster.webp",
    kind: "video",
    position: "center"
  },
  "social-graph": {
    src: "/archive/social-graph.webp",
    kind: "image",
    position: "center"
  },
  rininahue: {
    src: "/archive/rininahue.webp",
    kind: "image",
    position: "center"
  },
  waterfall: {
    src: "/archive/rininahue-waterfall.mp4",
    poster: "/archive/rininahue-waterfall-poster.webp",
    kind: "video",
    position: "center"
  },
  portrait: {
    src: "/archive/portrait.webp",
    kind: "image",
    position: "50% 42%"
  },
  selfie: {
    src: "/archive/selfie.webp",
    kind: "image",
    position: "50% 40%"
  },
  "selfie-blue": {
    src: "/archive/selfie-blue.webp",
    kind: "image",
    position: "50% 38%"
  },
  terno: {
    src: "/archive/terno.webp",
    kind: "image",
    position: "50% 34%"
  },
  arduino: {
    src: "/archive/arduino.webp",
    kind: "image",
    position: "center"
  },
  cv: {
    kind: "document"
  }
};

const FAN_POSITIONS: ArchiveCardStyle[] = [
  {
    "--archive-x": "calc(-1 * clamp(174px, 27vw, 320px))",
    "--archive-y": "25px",
    "--archive-rotation": "-11deg",
    "--archive-order": 1
  },
  {
    "--archive-x": "calc(-1 * clamp(116px, 18vw, 214px))",
    "--archive-y": "10px",
    "--archive-rotation": "-7deg",
    "--archive-order": 2
  },
  {
    "--archive-x": "calc(-1 * clamp(58px, 9vw, 108px))",
    "--archive-y": "1px",
    "--archive-rotation": "-3deg",
    "--archive-order": 3
  },
  {
    "--archive-x": "clamp(58px, 9vw, 108px)",
    "--archive-y": "1px",
    "--archive-rotation": "3deg",
    "--archive-order": 4
  },
  {
    "--archive-x": "clamp(116px, 18vw, 214px)",
    "--archive-y": "10px",
    "--archive-rotation": "7deg",
    "--archive-order": 5
  },
  {
    "--archive-x": "clamp(174px, 27vw, 320px)",
    "--archive-y": "25px",
    "--archive-rotation": "11deg",
    "--archive-order": 6
  }
];

const COPY = {
  es: {
    label: "ARCHIVO / 02",
    heading: "ARCHIVO PERSONAL / SIN ORDEN PARTICULAR.",
    register: "PIEZA",
    intro:
      "Código a deshora, pixel art cuadro por cuadro, clases, lugares del sur y suficiente evidencia de que no soy IA.",
    instruction: "ELIGE UNA PIEZA / USA LAS FLECHAS",
    graphLabel: "RED ANÓNIMA / RASTROS COMPARTIDOS",
    navLabel: "Explorar el archivo personal",
    correspondenceLabel: "CORRESPONDENCIA / 01",
    correspondenceHint: "DOBLE FONDO",
    correspondenceTitle: "GEOGREEN",
    correspondenceCategory: "ARDUINO → SISTEMA CÍVICO",
    correspondenceSummary:
      "Aprender electrónica cambió la escala del problema: de código en una pantalla a sensores, datos y una herramienta construida con estudiantes.",
    correspondenceStack: "UNO R4 WIFI · SENSORES · PWA",
    correspondenceAction: "ABRIR GEOGREEN",
    correspondenceAria:
      "Abrir GeoGreen, la correspondencia técnica de la pieza Arduino",
    geoDiagramTitle: "Cadena de telemetría de GeoGreen",
    geoDiagramDescription:
      "Un sensor mide el llenado, Arduino procesa la lectura y la aplicación la ubica en el mapa.",
    geoDiagramSense: "SENSAR",
    geoDiagramSend: "ENVIAR",
    geoDiagramView: "VER",
    geoDiagramLevel: "NIVEL",
    geoDiagramAlert: "ALERTA",
    footerPlace: "OSORNO · RIÑINAHUE",
    footerMaterial: "FOTOS · LOOPS · RASTROS",
    footerRange: "ARCHIVO 2018—2026",
    artifacts: {
      pirates: {
        title: "PIRATAS",
        meta: "PIXEL ART · 77 CUADROS",
        caption: "77 cuadros para que un ovni se lleve a un tripulante.",
        alt: "Barco pirata de noche; un ovni desciende y abduce a un tripulante."
      },
      "pixel-dojo": {
        title: "PIXEL DOJO",
        meta: "4 LOOPS · CUADRO A CUADRO",
        caption:
          "Saltos, vecinos, árboles y una interfaz Java: pequeños sistemas dibujados a mano.",
        alt: "Secuencia de cuatro animaciones pixel art creadas por Diego."
      },
      "pixel-room": {
        title: "NOCHE",
        meta: "PIXEL ART · LOOP",
        caption: "Modo código, pero en 16 bits.",
        alt: "Habitación nocturna en pixel art con computador, ventana, gato y servidores."
      },
      "social-graph": {
        title: "GRAFO VIVO",
        meta: "IG · RED ANÓNIMA",
        caption:
          "Convertí mis propias señales de Instagram en un mapa que se puede recorrer.",
        alt: "Visualización anónima de un grafo social construido desde Instagram."
      },
      rininahue: {
        title: "RIÑINAHUE",
        meta: "SUR · INVIERNO",
        caption: "Otoño, nieve, salto y playa. Las cuatro estaciones del sur.",
        alt: "Montañas nevadas entre árboles en Riñinahue, sur de Chile."
      },
      waterfall: {
        title: "SALTO",
        meta: "RIÑINAHUE · VIDEO",
        caption:
          "Agua, bosque y una caída escondida a pocos kilómetros de casa.",
        alt: "Video vertical de una cascada entre el bosque de Riñinahue."
      },
      portrait: {
        title: "PRUEBA DE VIDA",
        meta: "AUTORRETRATO · 2024",
        caption:
          "Subida a Instagram antes de que demostrar que uno no es IA fuera estrictamente necesario.",
        alt: "Retrato frontal de Diego mirando a cámara."
      },
      selfie: {
        title: "CAPUCHA",
        meta: "ARCHIVO · 2023",
        caption: "Una cara menos formal para equilibrar tanto código.",
        alt: "Diego con capucha al aire libre mirando a cámara."
      },
      "selfie-blue": {
        title: "LUZ AZUL",
        meta: "ARCHIVO · 2023",
        caption: "Frío, carretera y esa luz azul que aparece antes de la nieve.",
        alt: "Autorretrato de Diego con gorro y capucha bajo una luz azul."
      },
      terno: {
        title: "TERNO",
        meta: "REGISTRO · 01 VEZ / AÑO",
        caption: "El terno sale una vez al año. Quedó registrado.",
        alt: "Diego tomándose una fotografía frente a un espejo, vestido con terno."
      },
      arduino: {
        title: "ARDUINO",
        meta: "UNO R4 WIFI · HARDWARE",
        caption: "El error deja de ser abstracto: no prende, no lee o hace cualquier cosa.",
        alt: "Primer plano de una placa Arduino UNO R4 WiFi sostenida entre dos manos."
      },
      cv: {
        title: "EXPEDIENTE",
        meta: "CV · VISTA PREVIA",
        caption:
          "Experiencia, formación y tecnologías. Presiona otra vez para abrir el acceso.",
        alt: "Expediente profesional descargable de Diego Obando."
      }
    }
  },
  en: {
    label: "ARCHIVE / 02",
    heading: "PERSONAL ARCHIVE / IN NO PARTICULAR ORDER.",
    register: "PIECE",
    intro:
      "Late-night code, frame-by-frame pixel art, classes, places from the south, and enough evidence to prove I am not AI.",
    instruction: "CHOOSE A PIECE / USE THE ARROW KEYS",
    graphLabel: "ANONYMOUS NETWORK / SHARED TRACES",
    navLabel: "Explore the personal archive",
    correspondenceLabel: "CORRESPONDENCE / 01",
    correspondenceHint: "DOUBLE LIFT",
    correspondenceTitle: "GEOGREEN",
    correspondenceCategory: "ARDUINO → CIVIC SYSTEM",
    correspondenceSummary:
      "Learning electronics changed the scale of the problem: from code on a screen to sensors, data, and a tool built with students.",
    correspondenceStack: "UNO R4 WIFI · SENSORS · PWA",
    correspondenceAction: "OPEN GEOGREEN",
    correspondenceAria:
      "Open GeoGreen, the technical correspondence for the Arduino piece",
    geoDiagramTitle: "GeoGreen telemetry chain",
    geoDiagramDescription:
      "A sensor measures fill level, Arduino processes the reading, and the application places it on the map.",
    geoDiagramSense: "SENSE",
    geoDiagramSend: "SEND",
    geoDiagramView: "VIEW",
    geoDiagramLevel: "LEVEL",
    geoDiagramAlert: "ALERT",
    footerPlace: "OSORNO · RIÑINAHUE",
    footerMaterial: "PHOTOS · LOOPS · TRACES",
    footerRange: "ARCHIVE 2018—2026",
    artifacts: {
      pirates: {
        title: "PIRATES",
        meta: "PIXEL ART · 77 FRAMES",
        caption: "77 frames for a UFO to abduct a crew member.",
        alt: "A pirate ship at night as a UFO descends and abducts a crew member."
      },
      "pixel-dojo": {
        title: "PIXEL DOJO",
        meta: "4 LOOPS · FRAME BY FRAME",
        caption:
          "Jumps, neighbors, trees, and a Java interface: small systems drawn by hand.",
        alt: "A sequence of four pixel-art animations created by Diego."
      },
      "pixel-room": {
        title: "NIGHT",
        meta: "PIXEL ART · LOOP",
        caption: "Coding mode, but in 16 bits.",
        alt: "A night-time pixel-art room with a computer, window, cat, and servers."
      },
      "social-graph": {
        title: "LIVE GRAPH",
        meta: "IG · ANONYMOUS NETWORK",
        caption:
          "I turned my own Instagram signals into a map that can be explored.",
        alt: "Anonymous visualization of a social graph built from Instagram."
      },
      rininahue: {
        title: "RIÑINAHUE",
        meta: "SOUTH · WINTER",
        caption: "Autumn, snow, waterfall, and beach. Four seasons in the south.",
        alt: "Snowy mountains seen through trees in Riñinahue, southern Chile."
      },
      waterfall: {
        title: "FALLS",
        meta: "RIÑINAHUE · VIDEO",
        caption:
          "Water, forest, and a hidden drop a few kilometers from home.",
        alt: "Vertical video of a waterfall in the forest around Riñinahue."
      },
      portrait: {
        title: "PROOF OF LIFE",
        meta: "SELF-PORTRAIT · 2024",
        caption:
          "Posted before proving you are not AI became strictly necessary.",
        alt: "Front-facing portrait of Diego looking into the camera."
      },
      selfie: {
        title: "HOOD",
        meta: "ARCHIVE · 2023",
        caption: "A less formal face to balance all that code.",
        alt: "Diego outdoors wearing a hood and looking into the camera."
      },
      "selfie-blue": {
        title: "BLUE LIGHT",
        meta: "ARCHIVE · 2023",
        caption: "Cold, road, and the blue light that comes before the snow.",
        alt: "Self-portrait of Diego in a cap and hood under blue light."
      },
      terno: {
        title: "THE SUIT",
        meta: "RECORD · ONCE / YEAR",
        caption: "The suit comes out once a year. Now there is evidence.",
        alt: "Diego taking a mirror photograph while wearing a suit."
      },
      arduino: {
        title: "ARDUINO",
        meta: "UNO R4 WIFI · HARDWARE",
        caption: "The error stops being abstract: it will not turn on, read, or behave.",
        alt: "Close-up of an Arduino UNO R4 WiFi board held between two hands."
      },
      cv: {
        title: "DOSSIER",
        meta: "CV · PREVIEW",
        caption:
          "Experience, education, and technologies. Press again to open access.",
        alt: "Diego Obando's downloadable professional dossier."
      }
    }
  }
} as const;

const GRAPH_POINTS: Record<ArtifactId, { x: number; y: number }> = {
  pirates: { x: 170, y: 80 },
  "pixel-dojo": { x: 240, y: 130 },
  "pixel-room": { x: 310, y: 60 },
  "social-graph": { x: 380, y: 128 },
  rininahue: { x: 450, y: 70 },
  waterfall: { x: 520, y: 145 },
  portrait: { x: 590, y: 82 },
  selfie: { x: 650, y: 150 },
  "selfie-blue": { x: 700, y: 92 },
  terno: { x: 620, y: 236 },
  arduino: { x: 360, y: 235 },
  cv: { x: 230, y: 228 }
};

function ArchiveGraph({
  activeArtifact,
  label
}: {
  activeArtifact: ArtifactId;
  label: string;
}) {
  const activePoint = GRAPH_POINTS[activeArtifact];

  return (
    <svg
      className="personal-archive__graph"
      viewBox="0 0 760 300"
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <g className="personal-archive__graph-grid" aria-hidden="true">
        <path d="M0 60H760M0 120H760M0 180H760M0 240H760" />
        <path d="M76 0V300M152 0V300M228 0V300M304 0V300M380 0V300M456 0V300M532 0V300M608 0V300M684 0V300" />
      </g>

      <g className="personal-archive__graph-fog" aria-hidden="true">
        <circle cx="84" cy="84" r="2" />
        <circle cx="116" cy="204" r="2" />
        <circle cx="154" cy="54" r="2" />
        <circle cx="180" cy="246" r="2" />
        <circle cx="208" cy="178" r="2" />
        <circle cx="292" cy="232" r="2" />
        <circle cx="326" cy="136" r="2" />
        <circle cx="402" cy="220" r="2" />
        <circle cx="514" cy="238" r="2" />
        <circle cx="600" cy="252" r="2" />
        <circle cx="690" cy="80" r="2" />
        <circle cx="716" cy="222" r="2" />
      </g>

      <g className="personal-archive__graph-links" aria-hidden="true">
        <path d="M170 80L240 130L310 60L380 128L450 70L520 145L590 82L650 150L700 92" />
        <path d="M230 228L360 235L520 224L620 236L650 150" />
        <path d="M240 130L380 128L520 145L650 150" />
        <path d="M170 80L230 228L360 235L450 70L520 224L590 82" />
        <path d="M84 84L170 80L292 232L380 128L514 238L620 236L716 222" />
      </g>

      <g className="personal-archive__graph-nodes" aria-hidden="true">
        {ARTIFACT_ORDER.map((id) => {
          const point = GRAPH_POINTS[id];
          return (
            <circle
              key={id}
              cx={point.x}
              cy={point.y}
              r={id === activeArtifact ? 7 : 4}
              data-current={id === activeArtifact ? "true" : undefined}
            />
          );
        })}
      </g>

      <g
        className="personal-archive__graph-current"
        style={{ transform: `translate(${activePoint.x}px, ${activePoint.y}px)` }}
        aria-hidden="true"
      >
        <circle r="15" />
        <circle r="24" />
      </g>
    </svg>
  );
}

function ArchiveMedia({
  active,
  artifactId,
  cvActionLabel
}: {
  active: boolean;
  artifactId: ArtifactId;
  cvActionLabel: string;
}) {
  const media = MEDIA[artifactId];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const isAnimated =
    media.kind === "video" || media.kind === "video-set";
  const currentSource =
    media.kind === "video-set"
      ? media.sources?.[sequenceIndex]
      : media.src;

  useEffect(() => {
    if (!isAnimated || !videoRef.current) return;

    const video = videoRef.current;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!active || reducedMotion) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    void video.play().catch(() => undefined);
  }, [active, currentSource, isAnimated]);

  if (isAnimated) {
    return (
      <>
        <video
          ref={videoRef}
          src={currentSource}
          muted
          loop={media.kind === "video"}
          playsInline
          preload={active ? "metadata" : "none"}
          poster={media.poster}
          aria-hidden="true"
          style={{ objectPosition: media.position }}
          onEnded={
            media.kind === "video-set"
              ? () =>
                  setSequenceIndex(
                    (current) =>
                      (current + 1) % (media.sources?.length ?? 1)
                  )
              : undefined
          }
        />
        {media.kind === "video-set" && (
          <span
            className="personal-archive__sequence-counter"
            aria-hidden="true"
          >
            {(sequenceIndex + 1).toString().padStart(2, "0")} /{" "}
            {(media.sources?.length ?? 0).toString().padStart(2, "0")}
          </span>
        )}
      </>
    );
  }

  if (media.kind === "document") {
    return (
      <span className="personal-archive__document-media" aria-hidden="true">
        <i>D.O</i>
        <strong>CURRICULUM<br />VITAE</strong>
        <small>2026 / PDF</small>
        <b>{active ? cvActionLabel : "↓"}</b>
      </span>
    );
  }

  return (
    <Image
      src={media.src ?? ""}
      alt=""
      fill
      loading="eager"
      sizes="(max-width: 720px) 44vw, 220px"
      style={{ objectPosition: media.position }}
      aria-hidden="true"
    />
  );
}

export function PersonalArchive({
  locale,
  onOpenGeoGreen
}: PersonalArchiveProps) {
  const [activeArtifact, setActiveArtifact] =
    useState<ArtifactId>("pirates");
  const [cvAccessOpen, setCvAccessOpen] = useState(false);
  const swipeRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0
  });
  const suppressClickRef = useRef(false);
  const t = COPY[locale];
  const activeIndex = ARTIFACT_ORDER.indexOf(activeArtifact);
  const activeCopy = t.artifacts[activeArtifact];
  const showsGeoGreenCorrespondence = activeArtifact === "arduino";
  const showsCvAccess = cvAccessOpen;

  const moveThroughArchive = (direction: -1 | 1) => {
    const nextIndex =
      (activeIndex + direction + ARTIFACT_ORDER.length) %
      ARTIFACT_ORDER.length;

    setCvAccessOpen(false);
    setActiveArtifact(ARTIFACT_ORDER[nextIndex]);
  };

  const handleSwipeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || showsCvAccess) return;

    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSwipeEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipeRef.current.startX;
    const deltaY = event.clientY - swipeRef.current.startY;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= 34 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    swipeRef.current.pointerId = -1;

    if (!isHorizontalSwipe) return;

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    moveThroughArchive(deltaX < 0 ? 1 : -1);
  };

  const handleSwipeCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    swipeRef.current.pointerId = -1;
  };

  const suppressClickAfterSwipe = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? ARTIFACT_ORDER.length - 1
          : (activeIndex +
              (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
              ARTIFACT_ORDER.length) %
            ARTIFACT_ORDER.length;
    const nextArtifact = ARTIFACT_ORDER[nextIndex];

    setCvAccessOpen(false);
    setActiveArtifact(nextArtifact);
    event.currentTarget
      .querySelector<HTMLButtonElement>(
        `[data-archive-artifact="${nextArtifact}"]`
      )
      ?.focus();
  };

  return (
    <>
      <header className="personal-archive__heading">
        <div>
          <span>{t.label}</span>
          <h2 id="profile-title">{t.heading}</h2>
        </div>
        <button
          type="button"
          className="personal-archive__cv-shortcut"
          data-active={activeArtifact === "cv" ? "true" : undefined}
          aria-label={
            activeArtifact === "cv"
              ? locale === "es"
                ? "Abrir acceso al CV"
                : "Open CV access"
              : locale === "es"
                ? "Mostrar vista previa del CV"
                : "Show CV preview"
          }
          onClick={() => {
            if (activeArtifact === "cv") {
              setCvAccessOpen(true);
              return;
            }

            setActiveArtifact("cv");
            setCvAccessOpen(false);
          }}
        >
          CV <small>PDF</small> <span aria-hidden="true">↓</span>
        </button>
        <output className="personal-archive__registration" aria-live="polite">
          <span>{t.register}</span>
          <strong>
            {(activeIndex + 1).toString().padStart(2, "0")} /{" "}
            {ARTIFACT_ORDER.length.toString().padStart(2, "0")}
          </strong>
        </output>
      </header>

      <div className="personal-archive__body">
        <aside className="personal-archive__note">
          <span className="personal-archive__note-mark" aria-hidden="true">
            D.O
          </span>
          <p>{t.intro}</p>
          <small>{t.instruction}</small>
        </aside>

        <div
          className="personal-archive__table"
          data-correspondence={
            showsGeoGreenCorrespondence ? "geogreen" : undefined
          }
          data-cv-access={showsCvAccess ? "true" : undefined}
          onClickCapture={suppressClickAfterSwipe}
          onPointerCancel={handleSwipeCancel}
          onPointerDown={handleSwipeStart}
          onPointerUp={handleSwipeEnd}
        >
          <ArchiveGraph
            activeArtifact={activeArtifact}
            label={t.graphLabel}
          />

          <nav
            className="personal-archive__deck"
            aria-label={t.navLabel}
            onKeyDown={handleKeyDown}
            inert={showsCvAccess}
          >
            {ARTIFACT_ORDER.map((artifactId, index) => {
              const artifact = t.artifacts[artifactId];
              const isActive = artifactId === activeArtifact;
              const relativeOffset =
                (index - activeIndex + ARTIFACT_ORDER.length) %
                ARTIFACT_ORDER.length;
              const previousDistance =
                ARTIFACT_ORDER.length - relativeOffset;
              const fanIndex =
                relativeOffset >= 1 && relativeOffset <= 3
                  ? 2 + relativeOffset
                  : previousDistance >= 1 && previousDistance <= 3
                    ? 3 - previousDistance
                    : -1;
              const isVisible = isActive || fanIndex >= 0;
              const cardStyle: ArchiveCardStyle = isActive
                ? {
                    "--archive-x": "0px",
                    "--archive-y": "0px",
                    "--archive-rotation": "0deg",
                    "--archive-order": ARTIFACT_ORDER.length + 1
                  }
                : fanIndex >= 0
                  ? FAN_POSITIONS[fanIndex]
                  : {
                      "--archive-x": "0px",
                      "--archive-y": "0px",
                      "--archive-rotation": "0deg",
                      "--archive-order": 0
                    };

              return (
                <button
                  key={artifactId}
                  type="button"
                  className="personal-archive__card"
                  style={cardStyle}
                  data-archive-artifact={artifactId}
                  data-active={isActive ? "true" : undefined}
                  data-visible={isVisible ? "true" : "false"}
                  data-cv-preview={
                    artifactId === "cv" && isActive ? "true" : undefined
                  }
                  aria-current={isActive ? "true" : undefined}
                  aria-hidden={!isVisible}
                  tabIndex={isVisible ? 0 : -1}
                  aria-label={`${artifact.title}. ${artifact.alt} ${artifact.caption}${
                    artifactId === "cv" && isActive
                      ? locale === "es"
                        ? " Abrir expediente."
                        : " Open dossier."
                      : ""
                  }`}
                  onClick={() => {
                    if (artifactId === "cv" && isActive) {
                      setCvAccessOpen(true);
                      return;
                    }

                    setCvAccessOpen(false);
                    setActiveArtifact(artifactId);
                  }}
                >
                  <span className="personal-archive__card-index">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="personal-archive__media">
                    <ArchiveMedia
                      active={isActive}
                      artifactId={artifactId}
                      cvActionLabel={
                        locale === "es" ? "ABRIR →" : "OPEN →"
                      }
                    />
                  </span>
                  <span className="personal-archive__card-copy">
                    <strong>{artifact.title}</strong>
                    <small>{artifact.meta}</small>
                  </span>
                  {artifactId === "arduino" && (
                    <span
                      className="personal-archive__correspondence-mark"
                      aria-hidden="true"
                    >
                      ↔ GEO
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            className="personal-archive__correspondence-card"
            data-project="geogreen"
            data-visible={showsGeoGreenCorrespondence ? "true" : undefined}
            aria-hidden={!showsGeoGreenCorrespondence}
            aria-label={t.correspondenceAria}
            tabIndex={showsGeoGreenCorrespondence ? 0 : -1}
            onClick={onOpenGeoGreen}
          >
            <span className="personal-archive__correspondence-header">
              <span>{t.correspondenceLabel}</span>
              <small>{t.correspondenceHint}</small>
            </span>
            <span className="personal-archive__correspondence-diagram">
              <GeoGreenTelemetryDiagram
                title={t.geoDiagramTitle}
                description={t.geoDiagramDescription}
                senseLabel={t.geoDiagramSense}
                sendLabel={t.geoDiagramSend}
                viewLabel={t.geoDiagramView}
                levelLabel={t.geoDiagramLevel}
                alertLabel={t.geoDiagramAlert}
              />
            </span>
            <span className="personal-archive__correspondence-copy">
              <small>{t.correspondenceCategory}</small>
              <strong>{t.correspondenceTitle}</strong>
              <span>{t.correspondenceSummary}</span>
              <i>{t.correspondenceStack}</i>
              <b>{t.correspondenceAction} →</b>
            </span>
          </button>

          <div
            className="personal-archive__caption"
            data-correspondence={
              showsGeoGreenCorrespondence ? "true" : undefined
            }
            key={`${locale}-${activeArtifact}`}
            aria-live="polite"
          >
            <span>
              {activeCopy.title} / {activeCopy.meta}
            </span>
            <p>{activeCopy.caption}</p>
          </div>
        </div>
      </div>

      <footer className="personal-archive__footer">
        <span>{t.footerPlace}</span>
        <span>{t.footerMaterial}</span>
        <span>{t.footerRange}</span>
      </footer>

      <CvAccessPanel
        locale={locale}
        visible={showsCvAccess}
        onClose={() => setCvAccessOpen(false)}
      />
    </>
  );
}
