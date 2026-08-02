/**
 * The ladder: every rival that ever played this game, in the order they existed.
 *
 * First the six heuristics, which are the opponents that predate the first
 * neural network. Then the fifteen trained generations, chronologically — which
 * means the difficulty does not rise monotonically. That is the point: PLOMO is
 * weaker than CERBERO because PLOMO was a failed run, and the lore says so.
 *
 * Copy and evaluation numbers come from `checkpoints/registry.json` in the
 * ataxx-zero-ai repo, which is the single source of truth for the genealogy.
 */

import type { HeuristicLevel } from "@/lib/ataxx/heuristics";

export type Locale = "es" | "en";

export type RungCopy = {
  /** One line shown next to the name in the ladder list. */
  tagline: string;
  /** The story, shown when the rung is selected. */
  lore: string;
};

export type Rung = {
  /** Stable identifier: used in the URL, the API and the results table. */
  id: string;
  index: string;
  label: string;
  /** Browser-side heuristic, or a model served by the inference function. */
  kind: "heuristic" | "model";
  /** Heuristic level, or opponent id in the server manifest. */
  engine: string;
  era: string;
  generation: string;
  winsRequired: number;
  copy: Record<Locale, RungCopy>;
  /** Average score against the six heuristics, from the registry. */
  composite?: number;
  postmortem?: string;
};

const POSTMORTEM_BASE =
  "https://github.com/Dieg0Code/ataxx-zero-ai/blob/main/src/model/docs/postmortem";

export const HEURISTIC_RUNGS: ReadonlyArray<
  Rung & { kind: "heuristic"; engine: HeuristicLevel }
> = [
  {
    id: "easy",
    index: "01",
    label: "EASY",
    kind: "heuristic",
    engine: "easy",
    era: "Pre-red neuronal",
    generation: "Heurística",
    winsRequired: 3,
    copy: {
      es: {
        tagline: "Elige entre buenas y malas jugadas, pero con mucho ruido.",
        lore: "La primera regla escrita a mano: cuenta cuántas fichas gana la jugada, premia un poco clonar y un poco el centro, y elige al azar entre las opciones ponderadas. No mira ni una jugada adelante. Existe para que perder sea difícil y para que ningún modelo pueda decir que nunca ganó nada."
      },
      en: {
        tagline: "Tells good moves from bad ones, but with a lot of noise.",
        lore: "The first hand-written rule: count how many pieces the move wins, add a small bonus for cloning and for the centre, then sample from the weighted options. It never looks a move ahead. It exists so that losing is hard, and so no model can claim it never beat anything."
      }
    }
  },
  {
    id: "normal",
    index: "02",
    label: "NORMAL",
    kind: "heuristic",
    engine: "normal",
    era: "Pre-red neuronal",
    generation: "Heurística",
    winsRequired: 3,
    copy: {
      es: {
        tagline: "La misma evaluación, con la mano mucho más firme.",
        lore: "Idéntica a EASY salvo por la temperatura: 0.35 en vez de 0.85. Sigue siendo deliberadamente no-codiciosa para que las partidas no se repitan, pero ya casi siempre encuentra la mejor captura disponible."
      },
      en: {
        tagline: "The same evaluation, with a much steadier hand.",
        lore: "Identical to EASY except for temperature: 0.35 instead of 0.85. Still deliberately non-greedy so games do not repeat themselves, but it now almost always finds the best capture on the board."
      }
    }
  },
  {
    id: "hard",
    index: "03",
    label: "HARD",
    kind: "heuristic",
    engine: "hard",
    era: "Pre-red neuronal",
    generation: "Heurística",
    winsRequired: 5,
    copy: {
      es: {
        tagline: "Mira tu respuesta antes de jugar. Deja de regalar fichas.",
        lore: "El primer rival que piensa en el turno siguiente: castiga las jugadas que te dejan una gran respuesta y premia quedarse con más movilidad que vos. Curiosamente, es el que peor lo pasa NÉMESIS de las seis heurísticas: 0.69 de score contra 0.95 vs sentinel."
      },
      en: {
        tagline: "Looks at your reply before moving. Stops giving pieces away.",
        lore: "The first rival that thinks about the next turn: it punishes moves that leave you a strong answer and rewards keeping more mobility than you. Oddly, it is the heuristic NÉMESIS struggles most with: 0.69 score against it versus 0.95 against sentinel."
      }
    }
  },
  {
    id: "apex",
    index: "04",
    label: "APEX",
    kind: "heuristic",
    engine: "apex",
    era: "Pre-red neuronal",
    generation: "Heurística",
    winsRequired: 5,
    copy: {
      es: {
        tagline: "Dos jugadas de profundidad sobre tus tres mejores respuestas.",
        lore: "Búsqueda selectiva a dos capas: para cada jugada suya considera tus tres mejores respuestas, y para cada una de esas mira si logra recuperarse. Castiga las líneas donde vos podés disparar el marcador y ella no tiene contragolpe."
      },
      en: {
        tagline: "Two plies deep over your three best replies.",
        lore: "Selective two-ply search: for each of its moves it considers your three strongest answers, and for each of those whether it can recover. It punishes lines where you can spike the score and it has no counter."
      }
    }
  },
  {
    id: "gambit",
    index: "05",
    label: "GAMBIT",
    kind: "heuristic",
    engine: "gambit",
    era: "Pre-red neuronal",
    generation: "Heurística",
    winsRequired: 5,
    copy: {
      es: {
        tagline: "Salta al borde y a la presión, aunque quede expuesta.",
        lore: "Prefiere el salto sobre el clon, busca los bordes y se mete donde hay fichas tuyas alrededor para infectar en cadena. Acepta quedar expuesta con tal de generar presión: un estilo agresivo que descoloca a quien juega solo a contar fichas."
      },
      en: {
        tagline: "Jumps to the edge and into pressure, even when exposed.",
        lore: "It prefers the jump over the clone, hunts the edges, and lands where your pieces surround it so the infection chains. It accepts being exposed in exchange for pressure: an aggressive style that unsettles anyone playing pure piece-count."
      }
    }
  },
  {
    id: "sentinel",
    index: "06",
    label: "SENTINEL",
    kind: "heuristic",
    engine: "sentinel",
    era: "Pre-red neuronal",
    generation: "Heurística",
    winsRequired: 5,
    copy: {
      es: {
        tagline: "Juega sólido, apoyado y al centro. La que más entrenó.",
        lore: "La heurística más equilibrada: clona en vez de saltar, se apoya en sus propias fichas, domina el centro y evita quedar expuesta. Fue el sparring principal durante el entrenamiento, y por eso CERBERO terminó aprendiendo a ganarle a ella en vez de aprender Ataxx."
      },
      en: {
        tagline: "Solid, supported, centre-facing. The one that trained the most.",
        lore: "The most balanced heuristic: it clones instead of jumping, leans on its own pieces, owns the centre and avoids exposure. It was the main sparring partner during training, which is exactly why CERBERO ended up learning to beat it rather than learning Ataxx."
      }
    }
  }
];

export const MODEL_RUNGS: ReadonlyArray<Rung & { kind: "model" }> = [
  {
    id: "golem",
    index: "07",
    label: "GOLEM",
    kind: "model",
    engine: "golem",
    era: "1 mar 2026",
    generation: "v1 · iter 39",
    winsRequired: 3,
    composite: 0.0,
    postmortem: `${POSTMORTEM_BASE}/01/README.md`,
    copy: {
      es: {
        tagline: "La primera red. Solo aprendió a mover una ficha adelante y atrás.",
        lore: "Autómata de barro: se mueve sin mente. Arquitectura distinta a todas las demás — cabeza de política plana y solo 3 canales de observación — y lo único que aprendió fue a oscilar piezas indefinidamente. Es la primera vez que el proyecto entrenó algo, y sirve para medir desde dónde partió todo."
      },
      en: {
        tagline: "The first network. All it learned was to shuffle one piece back and forth.",
        lore: "A golem of clay: it moves without a mind. A different architecture from every other generation — flat policy head, only 3 observation channels — and the only thing it learned was to oscillate pieces indefinitely. It is the first thing this project ever trained, and it marks where everything started."
      }
    }
  },
  {
    id: "espectro",
    index: "08",
    label: "ESPECTRO",
    kind: "model",
    engine: "espectro",
    era: "4 mar 2026",
    generation: "v2 · iter 93",
    winsRequired: 3,
    composite: 0.0,
    postmortem: `${POSTMORTEM_BASE}/02/README.md`,
    copy: {
      es: {
        tagline: "Parecía jugar bien. Era un bug de desempate disfrazado de estrategia.",
        lore: "Primera arquitectura espacial. Parecía razonar hasta que descubrimos que el MCTS rompía los empates eligiendo siempre la primera jugada legal del action space. No era análisis: era un espectro en la máquina, un bug determinista que contaminaba self-play, evaluación y partidas por igual."
      },
      en: {
        tagline: "It looked like it was playing well. It was a tie-break bug in disguise.",
        lore: "The first spatial architecture. It seemed to reason until we found that MCTS was breaking ties by always picking the first legal move in the action space. Not analysis: a ghost in the machine, a deterministic bug contaminating self-play, evaluation and matches alike."
      }
    }
  },
  {
    id: "icaro",
    index: "09",
    label: "ÍCARO",
    kind: "model",
    engine: "icaro",
    era: "8 mar 2026",
    generation: "v3 · iter 11 (abortada)",
    winsRequired: 3,
    composite: 0.0,
    copy: {
      es: {
        tagline: "Voló alto y se quemó en la iteración 11 de 220.",
        lore: "Un destello que no prendió mecha. La run se abortó tempranísimo, pero sirvió de diagnóstico: dejó claro qué faltaba antes de volver a intentarlo con reward shaping en AUGUR. Está en la escalera porque los intentos fallidos también son parte de la historia."
      },
      en: {
        tagline: "Flew high and burned out at iteration 11 of 220.",
        lore: "A spark that never caught. The run was aborted very early, but it worked as a diagnosis: it made clear what was missing before trying again with reward shaping in AUGUR. It is on the ladder because failed attempts are part of the story too."
      }
    }
  },
  {
    id: "augur",
    index: "10",
    label: "AUGUR",
    kind: "model",
    engine: "augur",
    era: "8 mar 2026",
    generation: "v4a · iter 125",
    winsRequired: 3,
    composite: 0.0,
    postmortem: `${POSTMORTEM_BASE}/03/README.md`,
    copy: {
      es: {
        tagline: "Primer reward shaping: ya distingue posiciones, todavía no presiona.",
        lore: "Empieza a augurar. Distingue una buena posición de una mala, pero no sabe convertir esa lectura en presión sobre el rival. Era el camino correcto; faltaban los arreglos que llegarían recién con CERBERO."
      },
      en: {
        tagline: "First reward shaping: it reads positions, it still cannot press.",
        lore: "It starts to foretell. It can tell a good position from a bad one, but cannot turn that reading into pressure on the opponent. It was the right path; the fixes it needed would not arrive until CERBERO."
      }
    }
  },
  {
    id: "augur-ocaso",
    index: "11",
    label: "AUGUR · OCASO",
    kind: "model",
    engine: "augur-ocaso",
    era: "8 mar 2026",
    generation: "v4b · iter 135",
    winsRequired: 3,
    composite: 0.0,
    postmortem: `${POSTMORTEM_BASE}/03/README.md`,
    copy: {
      es: {
        tagline: "El mismo AUGUR, diez iteraciones más tarde.",
        lore: "Snapshot tardío de la misma run: misma identidad, más horas de cocción. Existe para responder una pregunta concreta — ¿el reward shaping seguía mejorando o ya había saturado? — y la respuesta fue que ya estaba plano."
      },
      en: {
        tagline: "The same AUGUR, ten iterations later.",
        lore: "A late snapshot of the same run: same identity, more hours in the oven. It exists to answer one concrete question — was reward shaping still improving, or had it saturated? — and the answer was that it had already flattened out."
      }
    }
  },
  {
    id: "cerbero",
    index: "12",
    label: "CERBERO",
    kind: "model",
    engine: "cerbero",
    era: "17 mar 2026",
    generation: "v6 · iter 180",
    winsRequired: 5,
    composite: 0.667,
    postmortem: `${POSTMORTEM_BASE}/05/README.md`,
    copy: {
      es: {
        tagline: "El primer despegue real. Y la primera lección amarga.",
        lore: "Juntó suficientes arreglos correctos para producir la primera mejora medible del proyecto. Pero la victoria tenía truco: no aprendió Ataxx, aprendió a ganarle a SENTINEL, la heurística que más vio en entrenamiento. Como Cerbero, guarda con ferocidad una sola puerta y es inútil contra lo que nunca enfrentó."
      },
      en: {
        tagline: "The first real takeoff. And the first bitter lesson.",
        lore: "It gathered enough correct fixes to produce the project's first measurable improvement. But the win had a catch: it did not learn Ataxx, it learned to beat SENTINEL, the heuristic it saw most in training. Like Cerberus, it ferociously guards a single gate and is useless against what it never faced."
      }
    }
  },
  {
    id: "leteo",
    index: "13",
    label: "LETEO",
    kind: "model",
    engine: "leteo",
    era: "18 mar 2026",
    generation: "v7 · iter 140",
    winsRequired: 5,
    composite: 0.75,
    postmortem: `${POSTMORTEM_BASE}/04/README.md`,
    copy: {
      es: {
        tagline: "Arrancó con los pesos de CERBERO y terminó peor que él.",
        lore: "No fue olvido catastrófico: fue reiniciar el ciclo con pesos buenos pero sin el contexto que los hacía buenos — buffer de replay limpio, iteración en cero, currículum reseteado, sin warmup. Bebió del Leteo y olvidó cómo aprender de sí mismo."
      },
      en: {
        tagline: "Started from CERBERO's weights and ended up worse than it.",
        lore: "Not catastrophic forgetting: it was restarting the loop with good weights but without the context that made them good — clean replay buffer, iteration back to zero, curriculum reset, no warmup. It drank from the Lethe and forgot how to learn from itself."
      }
    }
  },
  {
    id: "legion",
    index: "14",
    label: "LEGIÓN",
    kind: "model",
    engine: "legion",
    era: "10 may 2026",
    generation: "v8 · iter 180",
    winsRequired: 5,
    composite: 0.667,
    copy: {
      es: {
        tagline: "\"Somos legión\": el primer sistema de liga. El baseline histórico.",
        lore: "Primera generación entrenada con league system: en vez de sobreajustarse a una sola heurística como CERBERO, pelea contra legiones de sí misma y contra rivales variados. Más equilibrada contra todo, gana 62.5% de los duelos contra LETEO. Es el baseline contra el que se mide todo lo que vino después."
      },
      en: {
        tagline: "\"We are legion\": the first league system. The historical baseline.",
        lore: "The first generation trained with a league: instead of overfitting to a single heuristic like CERBERO, it fights legions of itself and varied opponents. More balanced against everything, winning 62.5% of head-to-heads against LETEO. It is the baseline everything after it is measured against."
      }
    }
  },
  {
    id: "quimera",
    index: "15",
    label: "QUIMERA",
    kind: "model",
    engine: "quimera",
    era: "11 may 2026",
    generation: "v9 · iter 180",
    winsRequired: 5,
    composite: 0.694,
    postmortem: `${POSTMORTEM_BASE}/06/README.md`,
    copy: {
      es: {
        tagline: "Más self-play, menos heurísticas. La dieta era una quimera.",
        lore: "Bootstrap desde LEGIÓN con la promesa de subir el techo. Desaprendió el suelo anti-codicioso de su base — vuelve a perder contra easy y normal — y nunca superó su composite. Lo que parece evolución a veces es solo continuidad estética."
      },
      en: {
        tagline: "More self-play, fewer heuristics. The diet was a chimera.",
        lore: "Bootstrapped from LEGION with the promise of raising the ceiling. It unlearned its base's anti-greedy floor — it loses to easy and normal again — and never beat its composite. What looks like evolution is sometimes just aesthetic continuity."
      }
    }
  },
  {
    id: "cisma",
    index: "16",
    label: "CISMA",
    kind: "model",
    engine: "cisma",
    era: "15 may 2026",
    generation: "v10 · iter 222",
    winsRequired: 5,
    composite: 0.694,
    postmortem: `${POSTMORTEM_BASE}/07/README.md`,
    copy: {
      es: {
        tagline: "Camino separado desde cero. Misma asíntota.",
        lore: "Primer run desde cero con la tubería nueva: pre-entrenamiento sobre partidas humanas curadas, gate absoluto que aborta si pierde contra LEGIÓN, cero bootstrap. Un cisma: otro camino, el mismo techo. Tres generaciones seguidas convergen al mismo plateau — el techo lo mueve la capacidad, no la dieta."
      },
      en: {
        tagline: "A separate path, from scratch. Same asymptote.",
        lore: "The first from-scratch run on the new pipeline: pretraining on curated human games, an absolute gate that aborts if it loses to LEGION, zero bootstrap. A schism: another road, the same ceiling. Three generations in a row converge on the same plateau — capacity moves the ceiling, not diet."
      }
    }
  },
  {
    id: "plomo",
    index: "17",
    label: "PLOMO",
    kind: "model",
    engine: "plomo",
    era: "17 may 2026",
    generation: "v11 · iter 18 (abortada)",
    winsRequired: 3,
    composite: 0.044,
    postmortem: `${POSTMORTEM_BASE}/08/README.md`,
    copy: {
      es: {
        tagline: "El fondo de la escalera: una cabeza auxiliar se comió el aprendizaje.",
        lore: "Abortada en la iteración 18 con un composite de 0.044. La cabeza de valor sí aprendía, pero una cabeza auxiliar quedó plana y su gradiente dominó el backbone compartido 26 veces sobre el de valor, canibalizando todo el aprendizaje. PLOMO: el peso muerto que lo hundió antes de arrancar."
      },
      en: {
        tagline: "The bottom of the ladder: an auxiliary head ate the learning.",
        lore: "Aborted at iteration 18 with a composite of 0.044. The value head was learning, but a flat auxiliary head's gradient dominated the shared backbone 26 times over value's, cannibalising everything else. PLOMO — lead: the dead weight that sank it before it started."
      }
    }
  },
  {
    id: "ariete",
    index: "18",
    label: "ARIETE",
    kind: "model",
    engine: "ariete",
    era: "17 may 2026",
    generation: "v11.1 · iter 41",
    winsRequired: 4,
    composite: 0.236,
    postmortem: `${POSTMORTEM_BASE}/09/README.md`,
    copy: {
      es: {
        tagline: "Golpeó el portón de LEGIÓN sin lograr abrirlo.",
        lore: "Primera generación después de arreglar la cabeza auxiliar: cinco veces mejor que PLOMO. Y por primera vez en cuatro generaciones la mejora se notó jugando de verdad — Diego ganó 3 de 4, pero sintió la presión. Se quedó a 2.8 puntos del umbral del gate y la run se abortó en la iteración 42."
      },
      en: {
        tagline: "Battered LEGION's gate without breaking it open.",
        lore: "The first generation after fixing the auxiliary head: five times better than PLOMO. And for the first time in four generations the improvement showed in real play — Diego won 3 of 4, but felt the pressure. It fell 2.8 points short of the gate threshold and the run aborted at iteration 42."
      }
    }
  },
  {
    id: "vispera",
    index: "19",
    label: "VÍSPERA",
    kind: "model",
    engine: "vispera",
    era: "17 may 2026",
    generation: "v11.2 · iter 114",
    winsRequired: 5,
    composite: 0.486,
    postmortem: `${POSTMORTEM_BASE}/10/README.md`,
    copy: {
      es: {
        tagline: "Rompió el plateau histórico. La noche antes del amanecer.",
        lore: "Llegó a 0.781 en duelos contra LEGIÓN cuando nadie había pasado de 0.55. Su perfil por nivel muestra el techo con claridad: gana contra hard, apex y sentinel, pero pierde contra easy y normal — explotación de rival invertida por un currículum desbalanceado. Cruzó el umbral justo antes de que NÉMESIS rompiera todo."
      },
      en: {
        tagline: "Broke the historical plateau. The night before the dawn.",
        lore: "It reached 0.781 head-to-head against LEGION when nobody had passed 0.55. Its per-level profile shows the ceiling clearly: it beats hard, apex and sentinel but loses to easy and normal — opponent exploitation inverted by an unbalanced curriculum. It crossed the threshold right before NÉMESIS broke everything."
      }
    }
  },
  {
    id: "vertice",
    index: "20",
    label: "VÉRTICE",
    kind: "model",
    engine: "vertice",
    era: "18 may 2026",
    generation: "v12 · iter 90",
    winsRequired: 5,
    composite: 0.484,
    copy: {
      es: {
        tagline: "El punto de apoyo donde el proyecto hizo palanca antes del salto.",
        lore: "Currículum rebalanceado y simulaciones de MCTS duplicadas. Consiguió el mejor duelo de campeones del repo hasta ese momento, pero pagó caro en hard y gambit pese al doble de búsqueda: la hipótesis de que más simulaciones arreglaban el techo no se sostuvo. Cortada por timeout en la iteración 95 de 300."
      },
      en: {
        tagline: "The fulcrum the project levered on right before the jump.",
        lore: "Rebalanced curriculum and doubled MCTS simulations. It landed the best champion duel in the repo's history to that point, but paid dearly on hard and gambit despite twice the search: the hypothesis that more simulations would fix the ceiling did not hold. Cut by timeout at iteration 95 of 300."
      }
    }
  },
  {
    id: "nemesis",
    index: "21",
    label: "NÉMESIS",
    kind: "model",
    engine: "nemesis",
    era: "23 jun 2026",
    generation: "v15.3 · iter 166",
    winsRequired: 1,
    composite: 0.975,
    postmortem: `${POSTMORTEM_BASE}/12/README.md`,
    copy: {
      es: {
        tagline: "El salto. Catorce generaciones contra el mismo techo, y un solo bug.",
        lore: "v15 juntó 31 arreglos estructurales, incluido EL arreglo: la tasa de aprendizaje llevaba clavada en 3e-6 porque un warmup se reiniciaba en cada iteración. Con la tasa viva en 1e-4 la curva despertó — precisión de política de 0.04 a 0.91, error de valor de 0.61 a 0.15. Barre las seis heurísticas y a Diego no le ganó ninguna partida en arena. La que no le ganás."
      },
      en: {
        tagline: "The jump. Fourteen generations against the same ceiling, and one single bug.",
        lore: "v15 bundled 31 structural fixes, including THE fix: the learning rate had been pinned at 3e-6 because a warmup restarted on every iteration. With the rate alive at 1e-4 the curve woke up — policy accuracy from 0.04 to 0.91, value error from 0.61 to 0.15. It sweeps all six heuristics, and Diego did not win a single arena game against it. The one you do not beat."
      }
    }
  },
  {
    id: "nemesis-192",
    index: "22",
    label: "NÉMESIS · 192",
    kind: "model",
    engine: "nemesis-192",
    era: "27 jul 2026",
    generation: "v15.3 · iter 192",
    winsRequired: 1,
    composite: 0.975,
    postmortem: `${POSTMORTEM_BASE}/12/README.md`,
    copy: {
      es: {
        tagline: "El último checkpoint que existe. Nada más entrenado después de esto.",
        lore: "La misma NÉMESIS con 26 iteraciones más de self-play: precisión de política de 0.91 a 0.95, error de valor de 0.15 a 0.11. La sesión de entrenamiento se cortó antes de la evaluación de arena, así que su fuerza se midió en duelo directo contra el iter 166, a las mismas 160 simulaciones con que juega acá: ganó 11 de 12. Es el final de la escalera y el final de la historia, hasta la próxima run."
      },
      en: {
        tagline: "The last checkpoint that exists. Nothing has been trained after this.",
        lore: "The same NÉMESIS with 26 more self-play iterations: policy accuracy from 0.91 to 0.95, value error from 0.15 to 0.11. The training session was cut before the arena evaluation, so its strength was measured head-to-head against iteration 166, at the same 160 simulations it plays with here: it won 11 of 12. It is the end of the ladder and the end of the story, until the next run."
      }
    }
  }
];

export const LADDER: ReadonlyArray<Rung> = [...HEURISTIC_RUNGS, ...MODEL_RUNGS];

export const LADDER_BY_ID = new Map(LADDER.map((rung) => [rung.id, rung]));

export const TOTAL_WINS_REQUIRED = LADDER.reduce(
  (total, rung) => total + rung.winsRequired,
  0
);

export function rungAt(index: number): Rung | undefined {
  return LADDER[index];
}

export function indexOfRung(id: string): number {
  return LADDER.findIndex((rung) => rung.id === id);
}

/**
 * How far a player has climbed: every rung is locked until the previous one has
 * been beaten the required number of times.
 */
export function unlockedCount(wins: Readonly<Record<string, number>>): number {
  let unlocked = 1;
  for (const rung of LADDER) {
    if ((wins[rung.id] ?? 0) >= rung.winsRequired) unlocked += 1;
    else break;
  }
  return Math.min(unlocked, LADDER.length);
}

export function isRungUnlocked(
  id: string,
  wins: Readonly<Record<string, number>>
): boolean {
  const index = indexOfRung(id);
  if (index < 0) return false;
  return index < unlockedCount(wins);
}
