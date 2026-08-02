"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent
} from "react";
import { createPortal } from "react-dom";

type Locale = "es" | "en";
type ContactKind = "email" | "phone";

type CvAccessPanelProps = {
  locale: Locale;
  visible: boolean;
  onClose: () => void;
};

const COPY = {
  es: {
    label: "EXPEDIENTE / CV",
    issue: "EDICIÓN · 2026",
    heading: "UNA COPIA PROFESIONAL.",
    intro:
      "Déjame una forma de responderte y descarga el documento inmediatamente.",
    contains: "CONTIENE",
    contents: ["EXPERIENCIA", "FORMACIÓN", "TECNOLOGÍAS"],
    format: "PDF · 1 PÁGINA",
    close: "Cerrar expediente",
    name: "TU NOMBRE",
    namePlaceholder: "Nombre y apellido",
    channel: "CÓMO TE RESPONDO",
    email: "CORREO",
    phone: "TELÉFONO",
    emailPlaceholder: "nombre@empresa.cl",
    phonePlaceholder: "+56 9 1234 5678",
    consent:
      "Autorizo a Diego a guardar este dato y contactarme por oportunidades relacionadas con su trabajo. No se comparte.",
    action: "IDENTIFICARME Y DESCARGAR",
    sending: "PREPARANDO EXPEDIENTE…",
    ready: "DESCARGA AUTORIZADA",
    readyCopy:
      "El documento comenzó a descargarse. Este acceso caduca en diez minutos.",
    downloadAgain: "DESCARGAR DE NUEVO",
    errors: {
      invalid_name: "Escribe tu nombre.",
      invalid_email: "Revisa el correo.",
      invalid_phone: "Revisa el teléfono.",
      invalid_contact: "Añade un correo o teléfono.",
      consent_required: "Necesito tu autorización para guardar el contacto.",
      service_unavailable:
        "No pude preparar la descarga. Inténtalo nuevamente en un momento.",
      default: "No pude preparar la descarga. Revisa los datos."
    }
  },
  en: {
    label: "DOSSIER / CV",
    issue: "EDITION · 2026",
    heading: "A PROFESSIONAL COPY.",
    intro:
      "Leave me a way to reply and download the document immediately.",
    contains: "CONTAINS",
    contents: ["EXPERIENCE", "EDUCATION", "TECHNOLOGIES"],
    format: "PDF · 1 PAGE",
    close: "Close dossier",
    name: "YOUR NAME",
    namePlaceholder: "First and last name",
    channel: "HOW SHOULD I REPLY?",
    email: "EMAIL",
    phone: "PHONE",
    emailPlaceholder: "name@company.com",
    phonePlaceholder: "+1 555 000 0000",
    consent:
      "I authorize Diego to store this detail and contact me about opportunities related to his work. It is not shared.",
    action: "IDENTIFY AND DOWNLOAD",
    sending: "PREPARING DOSSIER…",
    ready: "DOWNLOAD AUTHORIZED",
    readyCopy:
      "The document started downloading. This access expires in ten minutes.",
    downloadAgain: "DOWNLOAD AGAIN",
    errors: {
      invalid_name: "Enter your name.",
      invalid_email: "Check the email address.",
      invalid_phone: "Check the phone number.",
      invalid_contact: "Add an email or phone number.",
      consent_required: "I need your permission to store the contact detail.",
      service_unavailable:
        "The download could not be prepared. Try again in a moment.",
      default: "The download could not be prepared. Check the details."
    }
  }
} as const;

function beginDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function CvAccessPanel({
  locale,
  visible,
  onClose
}: CvAccessPanelProps) {
  const [contactKind, setContactKind] = useState<ContactKind>("email");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const t = COPY[locale];

  useEffect(() => {
    if (!visible) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [onClose, visible]);

  const selectContactKind = (kind: ContactKind) => {
    setContactKind(kind);
    setContact("");
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/cv/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactKind,
          contact,
          consent,
          locale,
          company
        })
      });
      const result = (await response.json()) as {
        downloadUrl?: string;
        error?: keyof typeof t.errors;
      };

      if (!response.ok || !result.downloadUrl) {
        setError(t.errors[result.error ?? "default"] ?? t.errors.default);
        return;
      }

      setDownloadUrl(result.downloadUrl);
      beginDownload(result.downloadUrl);
    } catch {
      setError(t.errors.service_unavailable);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <section
      ref={panelRef}
      className="cv-access-panel"
      data-visible="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cv-access-title"
    >
      <header className="cv-access-panel__header">
        <span>{t.label}</span>
        <small>{t.issue}</small>
        <button type="button" aria-label={t.close} onClick={onClose}>
          ×
        </button>
      </header>

      <div className="cv-access-panel__document">
        <span className="cv-access-panel__seal" aria-hidden="true">
          <i>DO</i>
          <b>CV</b>
        </span>
        <div>
          <h3 id="cv-access-title">{t.heading}</h3>
          <p>{t.intro}</p>
        </div>
        <dl>
          <div>
            <dt>{t.contains}</dt>
            <dd>{t.contents.join(" · ")}</dd>
          </div>
          <div>
            <dt>FORMATO</dt>
            <dd>{t.format}</dd>
          </div>
        </dl>
      </div>

      {downloadUrl ? (
        <div className="cv-access-panel__ready" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <strong>{t.ready}</strong>
          <p>{t.readyCopy}</p>
          <button type="button" onClick={() => beginDownload(downloadUrl)}>
            {t.downloadAgain} ↓
          </button>
        </div>
      ) : (
        <form className="cv-access-panel__form" onSubmit={submit}>
          <label>
            <span>{t.name}</span>
            <input
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={name}
              placeholder={t.namePlaceholder}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <fieldset>
            <legend>{t.channel}</legend>
            <div className="cv-access-panel__contact-switch">
              <button
                type="button"
                aria-pressed={contactKind === "email"}
                onClick={() => selectContactKind("email")}
              >
                {t.email}
              </button>
              <button
                type="button"
                aria-pressed={contactKind === "phone"}
                onClick={() => selectContactKind("phone")}
              >
                {t.phone}
              </button>
            </div>
            <input
              required
              type={contactKind === "email" ? "email" : "tel"}
              inputMode={contactKind === "email" ? "email" : "tel"}
              autoComplete={contactKind}
              value={contact}
              placeholder={
                contactKind === "email"
                  ? t.emailPlaceholder
                  : t.phonePlaceholder
              }
              onChange={(event) => setContact(event.target.value)}
            />
          </fieldset>

          <label className="cv-access-panel__honeypot" aria-hidden="true">
            Company
            <input
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>

          <label className="cv-access-panel__consent">
            <input
              required
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>{t.consent}</span>
          </label>

          <button
            className="cv-access-panel__submit"
            type="submit"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? t.sending : t.action}</span>
            <i aria-hidden="true">↓</i>
          </button>

          <output className="cv-access-panel__error" aria-live="polite">
            {error}
          </output>
        </form>
      )}
    </section>,
    document.body
  );
}
