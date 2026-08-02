"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type UIEvent
} from "react";
import {
  AtaxxBoard,
  BOARD_SIZE,
  CELL_COUNT,
  EMPTY,
  PLAYER_1,
  PLAYER_2,
  boardFromHistory,
  columnOf,
  historyToWire,
  moveToIndices,
  rowOf,
  type HistoryEntry,
  type Move,
  type Player
} from "@/lib/ataxx/board";
import { requestOpponentMove, warmOpponent } from "@/lib/ataxx/arena-client";
import {
  LADDER,
  TOTAL_WINS_REQUIRED,
  unlockedCount,
  type Locale,
  type Rung
} from "@/lib/ataxx/ladder";
import { ArenaRivalSigil } from "@/components/home/arena-rival-sigil";

type Standing = {
  displayName: string;
  reached: number;
  reachedLabel: string;
  wins: number;
  games: number;
};

type Session = { displayName: string } | null;

type Outcome = "win" | "loss" | "draw" | null;

const COPY = {
  es: {
    title: "ARENA ATAXX",
    kicker: "GENEALOGÍA JUGABLE",
    gateLabel: "REGISTRO / ARENA",
    gateIssue: "ÍNDICE · 03",
    intro:
      "Todos los rivales que este proyecto llegó a tener, en el orden en que existieron. Primero las heurísticas escritas a mano, después cada generación entrenada — con sus fracasos incluidos — hasta el último checkpoint que existe.",
    stats: [
      ["RIVALES", "22"],
      ["HEURÍSTICAS", "06"],
      ["GENERACIONES", "15"],
      ["VICTORIAS", "85"]
    ],
    signInTitle: "FICHA DE INGRESO",
    signInLead:
      "Tu correo guarda tu progreso y te pone en la tabla. No se verifica ni se usa para nada más.",
    nameLabel: "NOMBRE",
    namePlaceholder: "Cómo apareces en la tabla",
    emailLabel: "CORREO",
    emailPlaceholder: "tu@correo.cl",
    consentLabel:
      "Acepto que se guarden mis partidas completas, que pueden usarse para entrenar modelos futuros.",
    submit: "ENTRAR A LA ARENA",
    submitting: "ENTRANDO…",
    loading: "BARAJANDO RIVALES",
    signOut: "SALIR",
    errors: {
      invalid_name: "El nombre necesita al menos 2 caracteres.",
      invalid_email: "Ese correo no parece válido.",
      consent_required: "Falta aceptar que se guarden las partidas.",
      service_unavailable: "El servicio no responde. Intenta de nuevo.",
      unknown: "Algo falló. Intenta de nuevo."
    },
    ladderTitle: "ESCALERA",
    heuristicBand: "REGLAS ESCRITAS / 06",
    modelBand: "REDES ENTRENADAS / 16 CHECKPOINTS",
    strengthLabel: "FUERZA",
    locked: "BLOQUEADO",
    cleared: "SUPERADO",
    unlockHint: "Gana {wins} para desbloquear el siguiente",
    progress: "PROGRESO",
    you: "TÚ",
    thinking: "PENSANDO",
    selectPiece: "ELIGE FICHA",
    selectTarget: "ELIGE DESTINO",
    youOpen: "ABRES TÚ · ELIGE FICHA",
    rivalOpens: "ABRE {label}",
    youPass: "SIN MOVIMIENTOS · PASAS",
    rivalPass: "EL RIVAL PASA",
    win: "VICTORIA",
    loss: "DERROTA",
    draw: "EMPATE",
    restart: "Reiniciar partida",
    restartShort: "REINICIAR",
    versusHeuristic: "VS · IA",
    versusModel: "VS · IA",
    newGame: "OTRA PARTIDA",
    savingMatch: "GUARDANDO…",
    unlockedNext: "DESBLOQUEASTE {label}",
    fallbackNotice: "Rival caído: sigue la heurística HARD",
    standingsTitle: "TABLA",
    standingsEmpty: "Nadie ha jugado todavía.",
    standingsPlayer: "JUGADOR",
    standingsReached: "LLEGÓ A",
    standingsWins: "V",
    standingsGames: "PJ",
    lockedLead: "Supera el escalón anterior para desbloquear este rival.",
    postmortem: "LEER EL POSTMORTEM",
    fileLabel: "EXPEDIENTE",
    writtenRule: "REGLA ESCRITA",
    trainedCheckpoint: "CHECKPOINT ENTRENADO",
    composite: "SCORE VS HEURÍSTICAS",
    requiredWins: "VICTORIAS PARA PASAR",
    yourWins: "TUS VICTORIAS",
    unlockTarget: "PARA DESBLOQUEAR {label}",
    oneWinLeft: "TE FALTA 1 VICTORIA",
    manyWinsLeft: "TE FALTAN {wins} VICTORIAS",
    unlockedShort: "DESBLOQUEADO",
    simsNote: "MCTS · 160 simulaciones",
    telemetryValue: "VALOR",
    telemetrySims: "SIMS",
    telemetryTime: "BÚSQUEDA",
    acceptLabel: "ACEPTAR"
  },
  en: {
    title: "ATAXX ARENA",
    kicker: "PLAYABLE GENEALOGY",
    gateLabel: "REGISTER / ARENA",
    gateIssue: "INDEX · 03",
    intro:
      "Every rival this project ever had, in the order they existed. First the hand-written heuristics, then each trained generation — failures included — up to the last checkpoint that exists.",
    stats: [
      ["RIVALS", "22"],
      ["HEURISTICS", "06"],
      ["GENERATIONS", "15"],
      ["WINS", "85"]
    ],
    signInTitle: "ENTRY FORM",
    signInLead:
      "Your email saves your progress and puts you on the board. It is not verified and is not used for anything else.",
    nameLabel: "NAME",
    namePlaceholder: "How you appear on the board",
    emailLabel: "EMAIL",
    emailPlaceholder: "you@email.com",
    consentLabel:
      "I agree to my complete games being stored, and possibly used to train future models.",
    submit: "ENTER THE ARENA",
    submitting: "ENTERING…",
    loading: "SHUFFLING RIVALS",
    signOut: "SIGN OUT",
    errors: {
      invalid_name: "The name needs at least 2 characters.",
      invalid_email: "That email does not look valid.",
      consent_required: "You need to agree to games being stored.",
      service_unavailable: "The service is not responding. Try again.",
      unknown: "Something failed. Try again."
    },
    ladderTitle: "LADDER",
    heuristicBand: "WRITTEN RULES / 06",
    modelBand: "TRAINED NETWORKS / 16 CHECKPOINTS",
    strengthLabel: "STRENGTH",
    locked: "LOCKED",
    cleared: "CLEARED",
    unlockHint: "Win {wins} to unlock the next one",
    progress: "PROGRESS",
    you: "YOU",
    thinking: "THINKING",
    selectPiece: "CHOOSE PIECE",
    selectTarget: "CHOOSE TARGET",
    youOpen: "YOU OPEN · CHOOSE PIECE",
    rivalOpens: "{label} OPENS",
    youPass: "NO MOVES · YOU PASS",
    rivalPass: "THE RIVAL PASSES",
    win: "VICTORY",
    loss: "DEFEAT",
    draw: "DRAW",
    restart: "Restart game",
    restartShort: "RESTART",
    versusHeuristic: "VS · AI",
    versusModel: "VS · AI",
    newGame: "PLAY AGAIN",
    savingMatch: "SAVING…",
    unlockedNext: "YOU UNLOCKED {label}",
    fallbackNotice: "Rival down: the HARD heuristic is standing in",
    standingsTitle: "STANDINGS",
    standingsEmpty: "Nobody has played yet.",
    standingsPlayer: "PLAYER",
    standingsReached: "REACHED",
    standingsWins: "W",
    standingsGames: "GP",
    lockedLead: "Clear the previous rung to unlock this rival.",
    postmortem: "READ THE POSTMORTEM",
    fileLabel: "CASE FILE",
    writtenRule: "WRITTEN RULE",
    trainedCheckpoint: "TRAINED CHECKPOINT",
    composite: "SCORE VS HEURISTICS",
    requiredWins: "WINS TO ADVANCE",
    yourWins: "YOUR WINS",
    unlockTarget: "TO UNLOCK {label}",
    oneWinLeft: "1 WIN LEFT",
    manyWinsLeft: "{wins} WINS LEFT",
    unlockedShort: "UNLOCKED",
    simsNote: "MCTS · 160 simulations",
    telemetryValue: "VALUE",
    telemetrySims: "SIMS",
    telemetryTime: "SEARCH",
    acceptLabel: "ACCEPT"
  }
} as const;

function RestartIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M12.7 5.2A5.5 5.5 0 1 0 13 10" />
      <path d="M10.2 2.8h3.2V6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" />
      <path d="M5.75 7V5a2.25 2.25 0 0 1 4.5 0v2" />
    </svg>
  );
}

type LadderRungProps = {
  entry: Rung;
  index: number;
  wins: number;
  locked: boolean;
  active: boolean;
  heuristicBand: string;
  modelBand: string;
  strengthLabel: string;
  onSelect: (entry: Rung, card: HTMLButtonElement, active: boolean) => void;
};

/*
  Memoised so the tray sits still while a game runs. These twenty-two cards
  were reconciled on every move, every telemetry tick and every render the
  board caused, to produce identical output — only the active card and the
  one whose win count changed ever differ.

  The click passes its own `active` flag back up rather than having the
  handler read the selected id from state. That keeps the handler's identity
  stable across renders, which is what lets this memo hold at all.
*/
const LadderRung = memo(function LadderRung({
  entry,
  index,
  wins,
  locked,
  active,
  heuristicBand,
  modelBand,
  strengthLabel,
  onSelect
}: LadderRungProps) {
  const cleared = wins >= entry.winsRequired;
  const isBandStart = index === 0 || index === 6;
  const style = {
    "--arena-rung-progress": Math.min(1, wins / entry.winsRequired),
    "--arena-rung-order": index
  } as CSSProperties;

  return (
    <li
      style={style}
      className={isBandStart ? "arena-ladder__group-start" : undefined}
      data-group-label={
        index === 0 ? heuristicBand : index === 6 ? modelBand : undefined
      }
      data-group={index === 0 ? "heuristic" : index === 6 ? "model" : undefined}
    >
      <button
        type="button"
        data-kind={entry.kind}
        data-state={cleared ? "cleared" : locked ? "locked" : "open"}
        aria-current={active ? "true" : undefined}
        onClick={(event) => onSelect(entry, event.currentTarget, active)}
      >
        <span className="arena-ladder__index">{entry.index}</span>
        <ArenaRivalSigil
          id={entry.id}
          kind={entry.kind}
          strength={entry.composite}
        />
        <strong className="arena-ladder__label">{entry.label}</strong>
        <small className="arena-ladder__generation">
          {entry.generation}
          {typeof entry.composite === "number" ? (
            <i>
              {strengthLabel} {entry.composite.toFixed(3)}
            </i>
          ) : null}
        </small>
        <span className="arena-ladder__mark" aria-hidden="true">
          {locked ? (
            <LockIcon />
          ) : (
            `${Math.min(wins, entry.winsRequired)}/${entry.winsRequired}`
          )}
        </span>
      </button>
    </li>
  );
});

function ArenaLoadingMark({ label }: { label: string }) {
  return (
    <div className="arena-loader">
      <svg
        className="arena-loader__cards"
        viewBox="0 0 104 74"
        aria-hidden="true"
      >
        <path className="arena-loader__route" d="M10 58C30 70 76 69 95 52" />
        <g className="arena-loader__card arena-loader__card--left">
          <rect x="14" y="10" width="38" height="50" />
          <path d="M20 16h8M20 20h5" />
          <circle cx="24" cy="51" r="4" />
        </g>
        <g className="arena-loader__card arena-loader__card--right">
          <rect x="52" y="10" width="38" height="50" />
          <path d="M76 50h8M79 54h5" />
          <circle cx="80" cy="20" r="4" />
        </g>
        <g className="arena-loader__card arena-loader__card--face">
          <rect x="33" y="7" width="38" height="50" />
          <path d="M39 18h26M39 28h26M39 38h26M46 13v38M58 13v38" />
          <circle cx="42.5" cy="17.5" r="3.5" />
          <circle cx="61.5" cy="46.5" r="3.5" />
        </g>
      </svg>
      <span>
        <b>03</b>
        {label}
      </span>
    </div>
  );
}

function drawStartingPlayer(): Player {
  return Math.random() < 0.5 ? PLAYER_1 : PLAYER_2;
}

/**
 * The rung a returning player is actually on: the furthest one their wins
 * have opened. The arena used to reopen on EASY every time regardless of how
 * far up the ladder someone had climbed, which meant hunting through the tray
 * for your place before you could play.
 */
function furthestRungId(wins: Readonly<Record<string, number>>): string {
  const open = unlockedCount(wins);
  const rung = LADDER[Math.min(open, LADDER.length) - 1] ?? LADDER[0];
  return rung.id;
}

export function AtaxxArena({ locale }: { locale: Locale }) {
  const t = COPY[locale];

  const [session, setSession] = useState<Session>(null);
  const [wins, setWins] = useState<Record<string, number>>({});
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const [selectedRungId, setSelectedRungId] = useState(LADDER[0].id);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [startingPlayer, setStartingPlayer] = useState<Player>(PLAYER_1);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [converted, setConverted] = useState<number[]>([]);
  const [thinking, setThinking] = useState(false);
  /** Substituted moves this game. Non-zero means the rival was stood in for. */
  const [engineFailures, setEngineFailures] = useState(0);
  /** What the last model reply cost and what it thought of the position. */
  const [telemetry, setTelemetry] = useState<{
    value: number | null;
    simulations: number | null;
    searchMs: number | null;
  } | null>(null);
  const [savingMatch, setSavingMatch] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const [dismissedResult, setDismissedResult] = useState<Outcome>(null);
  const [leavingResult, setLeavingResult] = useState<Outcome>(null);
  const resultTimerRef = useRef<number | null>(null);
  const resultButtonRef = useRef<HTMLButtonElement>(null);
  const restartButtonRef = useRef<HTMLButtonElement>(null);
  const [showStandings, setShowStandings] = useState(false);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const ladderListRef = useRef<HTMLOListElement>(null);
  const ladderRailRef = useRef<HTMLSpanElement>(null);
  const ladderRailFrameRef = useRef<number | null>(null);
  const fileScrollTopRef = useRef(0);

  useLayoutEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    arena.scrollTop = fileScrollTopRef.current;
    const frame = requestAnimationFrame(() => {
      arena.scrollTop = fileScrollTopRef.current;
    });

    return () => cancelAnimationFrame(frame);
  }, [openFileId]);

  const startedAtRef = useRef<number>(Date.now());
  const savedRef = useRef(false);

  const rung = useMemo(
    () => LADDER.find((entry) => entry.id === selectedRungId) ?? LADDER[0],
    [selectedRungId]
  );
  const unlocked = useMemo(() => unlockedCount(wins), [wins]);
  const rungIndex = LADDER.indexOf(rung);
  const rungLocked = rungIndex >= unlocked;

  const board = useMemo(
    () => boardFromHistory(history, startingPlayer),
    [history, startingPlayer]
  );
  const gameOver = useMemo(() => board.isGameOver(), [board]);
  const outcome: Outcome = useMemo(() => {
    if (!gameOver) return null;
    const result = board.resultForPlayerOne();
    if (result === 0) return "draw";
    return result === PLAYER_1 ? "win" : "loss";
  }, [board, gameOver]);

  const lastMove = useMemo(() => {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const entry = history[index];
      if (entry) return entry;
    }
    return null;
  }, [history]);

  const legalDestinations = useMemo(() => {
    if (selectedCell === null || board.currentPlayer !== PLAYER_1) {
      return new Set<number>();
    }
    const destinations = new Set<number>();
    for (const move of board.getValidMoves(PLAYER_1)) {
      if (move[0] * BOARD_SIZE + move[1] === selectedCell) {
        destinations.add(move[2] * BOARD_SIZE + move[3]);
      }
    }
    return destinations;
  }, [board, selectedCell]);

  const humanCount = board.countPieces(PLAYER_1);
  const rivalCount = board.countPieces(PLAYER_2);

  const resetGame = useCallback(() => {
    setHistory([]);
    setStartingPlayer(drawStartingPlayer());
    setSelectedCell(null);
    setConverted([]);
    setEngineFailures(0);
    setTelemetry(null);
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    setDismissedResult(null);
    setLeavingResult(null);
    setJustUnlocked(null);
    startedAtRef.current = Date.now();
    savedRef.current = false;
  }, []);

  useEffect(() => {
    if (outcome && dismissedResult !== outcome) {
      window.requestAnimationFrame(() => resultButtonRef.current?.focus());
    }
  }, [dismissedResult, outcome]);

  useEffect(
    () => () => {
      if (resultTimerRef.current !== null) {
        window.clearTimeout(resultTimerRef.current);
      }
    },
    []
  );

  // ---- session -----------------------------------------------------------

  useEffect(() => {
    let live = true;
    fetch("/api/arena/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!live || !payload) return;
        const player = payload.player ?? null;
        const restored = payload.wins ?? {};
        setSession(player);
        setWins(restored);
        setSelectedRungId(furthestRungId(restored));
        if (player) setStartingPlayer(drawStartingPlayer());
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setSessionChecked(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (signingIn) return;

    const form = new FormData(event.currentTarget);
    setSigningIn(true);
    setSignInError(null);

    try {
      const response = await fetch("/api/arena/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          consent: form.get("consent") === "on",
          arenaCheck: form.get("arena-check"),
          locale
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        const key = payload?.error as keyof typeof t.errors;
        setSignInError(t.errors[key] ?? t.errors.unknown);
        return;
      }
      setSession(payload.player ?? null);
      const restored = payload.wins ?? {};
      setWins(restored);
      setSelectedRungId(furthestRungId(restored));
      setStartingPlayer(drawStartingPlayer());
    } catch {
      setSignInError(t.errors.unknown);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/arena/session", { method: "DELETE" }).catch(
      () => undefined
    );
    setSession(null);
    setWins({});
    setSelectedRungId(LADDER[0].id);
    resetGame();
  };

  // ---- opponent turn -----------------------------------------------------

  useEffect(() => {
    if (!session || rungLocked || gameOver) return;

    // Whoever is to move has no legal move: the rules force a pass.
    if (!board.hasValidMoves()) {
      setHistory((current) => [...current, null]);
      return;
    }

    if (board.currentPlayer !== PLAYER_2) return;

    const controller = new AbortController();
    const historySnapshot = [...history];
    let live = true;

    setThinking(true);
    void (async () => {
      try {
        const response = await requestOpponentMove(
          rung,
          board,
          historySnapshot,
          startingPlayer,
          controller.signal
        );
        if (!live || controller.signal.aborted) return;

        if (response.source === "fallback") {
          // Recorded on the match so a substituted game is filterable later.
          setEngineFailures((count) => count + 1);
          setTelemetry(null);
        } else if (response.source === "model") {
          setTelemetry({
            value: response.value,
            simulations: response.simulations,
            searchMs: response.searchMs
          });
        }

        if (response.move) {
          setConverted(board.getConvertedCells(response.move));
          const indices = moveToIndices(response.move);
          setHistory((current) =>
            current.length === historySnapshot.length
              ? [...current, indices]
              : current
          );
        } else {
          setConverted([]);
          setHistory((current) =>
            current.length === historySnapshot.length
              ? [...current, null]
              : current
          );
        }
      } catch {
        // Aborted by unmount or a reset; nothing to recover.
      } finally {
        if (live) setThinking(false);
      }
    })();

    return () => {
      live = false;
      controller.abort();
      setThinking(false);
    };
    // `board` is derived from `history`, so history alone gates the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, session, rungLocked, gameOver, rung.id, startingPlayer]);

  // Warm the model as soon as a rung is selected, so the first reply is not cold.
  useEffect(() => {
    if (!session || rungLocked) return;
    const controller = new AbortController();
    void warmOpponent(rung, controller.signal);
    return () => controller.abort();
  }, [rung, rungLocked, session]);

  // ---- match persistence -------------------------------------------------

  useEffect(() => {
    if (!gameOver || !session || savedRef.current || history.length === 0) return;
    savedRef.current = true;
    setSavingMatch(true);

    const previousUnlocked = unlockedCount(wins);

    void fetch("/api/arena/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opponentId: rung.id,
        moves: historyToWire(history),
        startingPlayer,
        engineFailures,
        durationMs: Date.now() - startedAtRef.current
      })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.wins) return;
        setWins(payload.wins);
        const nextUnlocked = unlockedCount(payload.wins);
        if (nextUnlocked > previousUnlocked && nextUnlocked <= LADDER.length) {
          setJustUnlocked(LADDER[nextUnlocked - 1].label);
        }
      })
      .catch(() => undefined)
      .finally(() => setSavingMatch(false));
  }, [engineFailures, gameOver, history, rung.id, session, startingPlayer, wins]);

  // ---- standings ---------------------------------------------------------

  useEffect(() => {
    if (!showStandings) return;
    let live = true;
    fetch("/api/arena/ladder", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (live && payload?.standings) setStandings(payload.standings);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [showStandings, wins]);

  // ---- interaction -------------------------------------------------------

  const handleCellClick = (index: number) => {
    if (gameOver || thinking || board.currentPlayer !== PLAYER_1) return;

    if (board.grid[index] === PLAYER_1) {
      setSelectedCell((current) => (current === index ? null : index));
      return;
    }

    if (selectedCell === null || !legalDestinations.has(index)) return;

    const move: Move = [
      rowOf(selectedCell),
      columnOf(selectedCell),
      rowOf(index),
      columnOf(index)
    ];
    setConverted(board.getConvertedCells(move));
    setSelectedCell(null);
    setHistory((current) => [...current, { from: selectedCell, to: index }]);
  };

  const seatRungInTray = useCallback(
    (card: HTMLButtonElement, instant = false) => {
      const tray = ladderListRef.current;
      if (!tray || tray.scrollWidth <= tray.clientWidth) return;

      const left = card.offsetLeft - (tray.clientWidth - card.offsetWidth) / 2;
      tray.scrollTo({
        left,
        behavior:
          instant ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth"
      });
    },
    []
  );

  /* Bring the restored rung into view once, without a glide — the tray should
     already be sitting on your place when the arena opens, not scroll there
     while you watch. */
  useEffect(() => {
    if (!sessionChecked) return;
    const card = ladderListRef.current?.querySelector<HTMLButtonElement>(
      'button[aria-current="true"]'
    );
    if (card) seatRungInTray(card, true);
  }, [sessionChecked, seatRungInTray]);

  /* Stable across renders — see LadderRung. The card reports whether it was
     already the active one, so this never has to read selectedRungId and
     never has to be rebuilt. */
  const handleSelectRung = useCallback(
    (next: Rung, card: HTMLButtonElement, alreadyActive: boolean) => {
      if (!alreadyActive) {
        setSelectedRungId(next.id);
        resetGame();
      }
      seatRungInTray(card);
    },
    [resetGame, seatRungInTray]
  );

  /*
    The rail position used to live in React state, so every scroll event
    re-rendered the entire arena — twenty-two rung cards with their SVG
    sigils, all forty-nine board cells, the dossier. Tapping a rung made that
    worse rather than better: seatRungInTray smooth-scrolls the tray, and a
    smooth scroll is a stream of scroll events, so one tap meant a re-render
    on every frame of the glide, on top of the panel animations already
    running. That is the flicker.

    The rail is one custom property on one element that React never needs to
    know about, so it is written straight to the node, coalesced to one write
    per frame. On touch layouts the rail is display:none and this costs
    nothing at all.
  */
  const handleLadderScroll = useCallback(
    (event: UIEvent<HTMLOListElement>) => {
      const list = event.currentTarget;
      if (ladderRailFrameRef.current !== null) return;

      ladderRailFrameRef.current = requestAnimationFrame(() => {
        ladderRailFrameRef.current = null;
        const rail = ladderRailRef.current;
        if (!rail) return;

        const horizontalMax = list.scrollWidth - list.clientWidth;
        const verticalMax = list.scrollHeight - list.clientHeight;
        const isHorizontal = horizontalMax > 1;
        const maximum = isHorizontal ? horizontalMax : verticalMax;
        const offset = isHorizontal ? list.scrollLeft : list.scrollTop;

        rail.style.setProperty(
          "--arena-ladder-scroll",
          String(maximum > 0 ? offset / maximum : 0)
        );
      });
    },
    []
  );

  useEffect(
    () => () => {
      if (ladderRailFrameRef.current !== null) {
        cancelAnimationFrame(ladderRailFrameRef.current);
      }
    },
    []
  );

  const statusLabel = outcome
    ? outcome === "win"
      ? t.win
      : outcome === "loss"
        ? t.loss
        : t.draw
    : history.length === 0
      ? startingPlayer === PLAYER_1
        ? t.youOpen
        : t.rivalOpens.replace("{label}", rung.label)
    : thinking
      ? t.thinking
      : board.currentPlayer === PLAYER_2
        ? t.rivalPass
        : selectedCell === null
          ? t.selectPiece
          : t.selectTarget;

  const visibleResult = outcome && dismissedResult !== outcome ? outcome : null;
  const resultLabel =
    outcome === "win" ? t.win : outcome === "loss" ? t.loss : t.draw;

  const acceptResult = () => {
    if (!outcome || leavingResult) return;
    const accepted = outcome;
    setLeavingResult(accepted);
    resultTimerRef.current = window.setTimeout(() => {
      setDismissedResult(accepted);
      setLeavingResult(null);
      resultTimerRef.current = null;
      restartButtonRef.current?.focus();
    }, 480);
  };

  const rungWins = wins[rung.id] ?? 0;
  const totalWins = Object.values(wins).reduce((sum, value) => sum + value, 0);
  const nextRung = LADDER[rungIndex + 1];
  const winsRemaining = Math.max(0, rung.winsRequired - rungWins);
  const rungProgress = Math.min(1, rungWins / rung.winsRequired);
  const remainingLabel =
    winsRemaining === 1
      ? t.oneWinLeft
      : t.manyWinsLeft.replace("{wins}", String(winsRemaining));
  const unlockSummary = nextRung
    ? winsRemaining > 0
      ? `${remainingLabel} → ${nextRung.label}`
      : `${nextRung.label} · ${t.unlockedShort}`
    : null;

  // ---- render ------------------------------------------------------------

  if (!sessionChecked) {
    return (
      <div className="arena arena--loading" aria-busy="true">
        <ArenaLoadingMark label={t.loading} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="arena arena--gate">
        <div className="arena-gate">
          <header className="arena-gate__bar">
            <span>{t.gateLabel}</span>
            <small>{t.gateIssue}</small>
          </header>

          <div className="arena-gate__body">
            <section className="arena-gate__plate">
              <div className="arena-gate__seal" aria-hidden="true">
                <i>22</i>
                <b>{t.kicker.split(" ")[0]}</b>
              </div>

              <div className="arena-gate__pitch">
                <h2>{t.title}</h2>
                <p className="arena-gate__intro">{t.intro}</p>
              </div>

              <dl className="arena-gate__stats">
                {t.stats.map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <form className="arena-gate__form" onSubmit={handleSignIn}>
              <div className="arena-gate__form-head">
                <h3>{t.signInTitle}</h3>
                <p>{t.signInLead}</p>
              </div>

              <label className="arena-gate__field">
                <span>
                  <i aria-hidden="true">01</i>
                  {t.nameLabel}
                </span>
                <input
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={40}
                  autoComplete="nickname"
                  enterKeyHint="next"
                  placeholder={t.namePlaceholder}
                />
              </label>

              <label className="arena-gate__field">
                <span>
                  <i aria-hidden="true">02</i>
                  {t.emailLabel}
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="go"
                  placeholder={t.emailPlaceholder}
                />
              </label>

              <label className="arena-gate__consent">
                <input name="consent" type="checkbox" required />
                <i aria-hidden="true" />
                <span>{t.consentLabel}</span>
              </label>

              <input
                className="arena-gate__honeypot"
                name="arena-check"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                readOnly
                data-1p-ignore
                data-bwignore
                data-lpignore="true"
              />

              {signInError ? (
                <p className="arena-gate__error" role="alert">
                  {signInError}
                </p>
              ) : null}

              <button type="submit" disabled={signingIn}>
                <b>{signingIn ? t.submitting : t.submit}</b>
                <i aria-hidden="true">→</i>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arena" ref={arenaRef}>
      <nav className="arena-ladder" aria-label={t.ladderTitle}>
        <header className="arena-ladder__header">
          <span>{t.ladderTitle}</span>
          <strong>
            {String(unlocked).padStart(2, "0")}/{LADDER.length}
          </strong>
        </header>

        <ol
          ref={ladderListRef}
          className="arena-ladder__list"
          onScroll={handleLadderScroll}
        >
          {LADDER.map((entry, index) => (
            <LadderRung
              key={entry.id}
              entry={entry}
              index={index}
              wins={wins[entry.id] ?? 0}
              locked={index >= unlocked}
              active={entry.id === rung.id}
              heuristicBand={t.heuristicBand}
              modelBand={t.modelBand}
              strengthLabel={t.strengthLabel}
              onSelect={handleSelectRung}
            />
          ))}
        </ol>

        <span
          ref={ladderRailRef}
          className="arena-ladder__scroll-rail"
          aria-hidden="true"
        >
          <i />
        </span>

        <footer className="arena-ladder__footer">
          <span>{t.progress}</span>
          <strong>
            {totalWins}/{TOTAL_WINS_REQUIRED}
          </strong>
        </footer>
      </nav>

      <section className="arena-stage">
        <header className="arena-stage__hud">
          <span className="arena-stage__score">
            {t.you} <b>{humanCount.toString().padStart(2, "0")}</b>
          </span>
          <output className="arena-stage__status" aria-live="polite">
            {statusLabel}
          </output>
          <span
            className="arena-stage__opponent"
            data-kind={rung.kind}
            aria-label={`${
              rung.kind === "model" ? t.versusModel : t.versusHeuristic
            } ${rung.label}, ${rivalCount}`}
          >
            <small>
              {rung.kind === "model" ? t.versusModel : t.versusHeuristic}
            </small>
            <strong>{rung.label}</strong>
            <b>{rivalCount.toString().padStart(2, "0")}</b>
          </span>
        </header>

        <div className="arena-frame">
          <div className="arena-frame__ruler arena-frame__ruler--files" aria-hidden="true">
            {["A", "B", "C", "D", "E", "F", "G"].map((file) => (
              <span key={file}>{file}</span>
            ))}
          </div>
          <div className="arena-frame__ruler arena-frame__ruler--ranks" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7].map((rank) => (
              <span key={rank}>{rank}</span>
            ))}
          </div>

          <div
            className="arena-board"
            role="grid"
            aria-label={rung.label}
            data-locked={rungLocked || undefined}
          >
            <span className="arena-board__mark arena-board__mark--nw" aria-hidden="true" />
            <span className="arena-board__mark arena-board__mark--ne" aria-hidden="true" />
            <span className="arena-board__mark arena-board__mark--sw" aria-hidden="true" />
            <span className="arena-board__mark arena-board__mark--se" aria-hidden="true" />
          {Array.from({ length: CELL_COUNT }, (_, index) => {
            const cell = board.grid[index];
            const isSelected = selectedCell === index;
            const isLegal = legalDestinations.has(index);
            const isOrigin = lastMove?.from === index;
            const isArrival = lastMove?.to === index;
            const isConverted = converted.includes(index);
            // A clone grows in place; a jump travels from its origin. Showing
            // the difference is the fastest way to teach the rule.
            const arrivalKind =
              lastMove &&
              Math.max(
                Math.abs(rowOf(lastMove.from) - rowOf(lastMove.to)),
                Math.abs(columnOf(lastMove.from) - columnOf(lastMove.to))
              ) === 1
                ? "clone"
                : "jump";
            const arrivalStyle =
              isArrival && lastMove
                ? ({
                    "--arena-move-x": `${(columnOf(lastMove.from) - columnOf(index)) * 100}%`,
                    "--arena-move-y": `${(rowOf(lastMove.from) - rowOf(index)) * 100}%`
                  } as CSSProperties)
                : undefined;

            return (
              <button
                key={index}
                type="button"
                role="gridcell"
                className={[
                  cell === PLAYER_1
                    ? "has-human"
                    : cell === PLAYER_2
                      ? "has-rival"
                      : "",
                  isSelected ? "is-selected" : "",
                  isLegal ? "is-legal" : "",
                  isOrigin ? "is-origin" : "",
                  isArrival ? `is-arrival is-arrival--${arrivalKind}` : "",
                  isConverted ? "is-converted" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={arrivalStyle}
                onClick={() => handleCellClick(index)}
                disabled={
                  rungLocked ||
                  gameOver ||
                  thinking ||
                  board.currentPlayer !== PLAYER_1 ||
                  (cell !== PLAYER_1 && !isLegal)
                }
                aria-label={`${String.fromCharCode(65 + columnOf(index))}${rowOf(index) + 1}`}
              >
                {cell !== EMPTY ? (
                  <i
                    key={
                      isConverted || isArrival
                        ? `${cell}-${history.length}`
                        : `${cell}-stable`
                    }
                    className={
                      cell === PLAYER_1
                        ? "arena-piece arena-piece--human"
                        : "arena-piece arena-piece--rival"
                    }
                  />
                ) : null}
              </button>
            );
          })}
          </div>
        </div>

        {/*
          The point of this project is a network searching, so let it be seen:
          how the engine rates the position, how many simulations it ran and
          how long it took. Heuristics have none of this, and their empty strip
          is itself the contrast.
        */}
        <div className="arena-telemetry" data-active={Boolean(telemetry) || undefined}>
          {telemetry ? (
            <>
              <span>
                <b>{t.telemetryValue}</b>
                <i data-sign={telemetry.value !== null && telemetry.value >= 0 ? "up" : "down"}>
                  {telemetry.value !== null
                    ? `${telemetry.value >= 0 ? "+" : ""}${telemetry.value.toFixed(2)}`
                    : "—"}
                </i>
              </span>
              <span className="arena-telemetry__gauge" aria-hidden="true">
                <i
                  style={
                    {
                      "--arena-value": Math.max(
                        0,
                        Math.min(1, ((telemetry.value ?? 0) + 1) / 2)
                      )
                    } as CSSProperties
                  }
                />
              </span>
              <span>
                <b>{t.telemetrySims}</b>
                <i>{telemetry.simulations ?? "—"}</i>
              </span>
              <span>
                <b>{t.telemetryTime}</b>
                <i>{telemetry.searchMs !== null ? `${telemetry.searchMs} ms` : "—"}</i>
              </span>
            </>
          ) : null}
        </div>

        <footer className="arena-stage__controls">
          {justUnlocked ? (
            <span className="arena-stage__notice arena-stage__notice--unlock">
              {t.unlockedNext.replace("{label}", justUnlocked)}
            </span>
          ) : savingMatch ? (
            <span className="arena-stage__notice">{t.savingMatch}</span>
          ) : engineFailures > 0 ? (
            // Sticky for the rest of the game: once a move was substituted, this
            // is no longer a clean game against the rival on the card.
            <span className="arena-stage__notice arena-stage__notice--fallback">
              {t.fallbackNotice}
            </span>
          ) : rung.kind === "model" ? (
            <span className="arena-stage__notice arena-stage__notice--progress">
              {unlockSummary ? `${t.simsNote} · ${unlockSummary}` : t.simsNote}
            </span>
          ) : (
            <span className="arena-stage__notice arena-stage__notice--progress">
              {unlockSummary}
            </span>
          )}

          <button
            ref={restartButtonRef}
            type="button"
            className="arena-stage__restart"
            onClick={resetGame}
            aria-label={t.restart}
            title={t.restart}
          >
            <span className="arena-stage__restart-label">{t.restartShort}</span>
            <i className="arena-stage__restart-mark" aria-hidden="true">
              <RestartIcon />
            </i>
          </button>
        </footer>

        {/*
          Same band as the project card, on purpose: the whole strip is the
          control, it slides in from the left and out to the right, and there is
          no button inside it. People already know this gesture from that board.
        */}
        {visibleResult ? (
          <button
            ref={resultButtonRef}
            type="button"
            className={[
              "arena-result-strip",
              `arena-result-strip--${visibleResult}`,
              leavingResult === visibleResult ? "is-leaving" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={acceptResult}
            aria-label={`${resultLabel} ${humanCount}–${rivalCount}. ${t.acceptLabel}`}
          >
            <strong>{resultLabel}</strong>
            <span>
              {humanCount} — {rivalCount}
            </span>
          </button>
        ) : null}
      </section>

      <aside className="arena-dossier">
        <div className="arena-dossier__identity">
          <span>{session.displayName}</span>
          <button type="button" onClick={handleSignOut}>
            {t.signOut}
          </button>
        </div>

        <button
          type="button"
          className="arena-dossier__toggle"
          aria-pressed={showStandings}
          onClick={() => setShowStandings((current) => !current)}
        >
          {showStandings ? t.ladderTitle : t.standingsTitle}
        </button>

        {showStandings ? (
          <div className="arena-standings">
            {standings && standings.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>{t.standingsPlayer}</th>
                    <th>{t.standingsReached}</th>
                    <th>{t.standingsWins}</th>
                    <th>{t.standingsGames}</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr key={`${row.displayName}-${index}`}>
                      <td>{row.displayName}</td>
                      <td>{row.reachedLabel}</td>
                      <td>{row.wins}</td>
                      <td>{row.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>{t.standingsEmpty}</p>
            )}
          </div>
        ) : (
          <article className="arena-dossier__rung" key={rung.id}>
            <header>
              <span>{rung.era}</span>
              <h3>{rung.label}</h3>
              <small>{rung.generation}</small>
            </header>

            <p className="arena-dossier__tagline">
              {rungLocked ? t.lockedLead : rung.copy[locale].tagline}
            </p>

            {!rungLocked && nextRung ? (
              <div
                className="arena-dossier__unlock"
                data-complete={winsRemaining === 0 || undefined}
              >
                <span>
                  {t.unlockTarget.replace("{label}", nextRung.label)}
                </span>
                <strong>
                  {winsRemaining > 0
                    ? remainingLabel
                    : `${nextRung.label} · ${t.unlockedShort}`}
                </strong>
                <i aria-hidden="true">
                  <b style={{ transform: `scaleX(${rungProgress})` }} />
                </i>
              </div>
            ) : null}

            <dl className="arena-dossier__facts">
              <div>
                <dt>{t.requiredWins}</dt>
                <dd>{rung.winsRequired}</dd>
              </div>
              <div>
                <dt>{t.yourWins}</dt>
                <dd>{rungWins}</dd>
              </div>
              {typeof rung.composite === "number" ? (
                <div>
                  <dt>{t.composite}</dt>
                  <dd>{rung.composite.toFixed(3)}</dd>
                </div>
              ) : null}
            </dl>

            {/*
              The story is the best part of this project, but it should not be
              the loudest thing on a page whose job is playing. It waits behind
              a latch, like the project drawers on the index: whoever is curious
              pulls it open, everyone else gets a clean board.
            */}
            {!rungLocked ? (
              <details
                className="arena-file"
                key={rung.id}
                open={openFileId === rung.id}
              >
                <summary
                  onPointerDown={() => {
                    fileScrollTopRef.current = arenaRef.current?.scrollTop ?? 0;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      fileScrollTopRef.current =
                        arenaRef.current?.scrollTop ?? 0;
                    }
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    setOpenFileId((current) =>
                      current === rung.id ? null : rung.id
                    );
                  }}
                >
                  <span className="arena-file__stamp" aria-hidden="true">
                    {rung.index}
                  </span>
                  <span className="arena-file__label">
                    <b>{t.fileLabel}</b>
                    <small>{rung.era}</small>
                  </span>
                  <span className="arena-file__latch" aria-hidden="true">
                    <i>→</i>
                  </span>
                </summary>
                {openFileId === rung.id ? (
                  <div className="arena-file__content">
                    <header>
                      <span>
                        {rung.kind === "model"
                          ? t.trainedCheckpoint
                          : t.writtenRule}
                      </span>
                      <b>
                        {rung.index}/{LADDER.length}
                      </b>
                    </header>
                    <p>{rung.copy[locale].lore}</p>
                    {rung.postmortem ? (
                      <a href={rung.postmortem} target="_blank" rel="noreferrer">
                        {t.postmortem}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </details>
            ) : null}
          </article>
        )}
      </aside>
    </div>
  );
}

export type { AtaxxBoard };
