import Link from "next/link";
import { MicrographicCard } from "@/components/micrographics/micrographic-card";
import { micrographicSeeds } from "@/lib/micrographics/registry";

export default function LibraryPage() {
  return (
    <main className="shell">
      <section className="section section--tight">
        <div className="section__heading">
          <p className="eyebrow">MICROGRAPHICS REGISTRY</p>
          <h1>Registro inicial de componentes del pack</h1>
          <p className="lead lead--compact">
            Este listado tipado usa los nombres semánticos ya mapeados y apunta a
            los SVGs fuente dentro de `docs/`. Es la capa previa a la conversión
            a componentes React.
          </p>
        </div>
        <div className="section__actions">
          <Link className="button button--secondary" href="/">
            Volver al home
          </Link>
        </div>
      </section>

      <section className="section section--tight">
        <div className="card-grid">
          {micrographicSeeds.map((entry) => (
            <MicrographicCard key={entry.id} entry={entry} />
          ))}
        </div>
      </section>
    </main>
  );
}
