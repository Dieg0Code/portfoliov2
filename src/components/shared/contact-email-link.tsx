"use client";

import type { ReactNode } from "react";

const LOCAL = "diegoobando20";
const DOMAIN = "gmail.com";

type ContactEmailLinkProps = {
  className?: string;
  subject?: string;
  children: ReactNode;
  "data-text"?: string;
};

export function ContactEmailLink({
  className,
  subject,
  children,
  ...rest
}: ContactEmailLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const address = `${LOCAL}\u0040${DOMAIN}`;
    const url = subject
      ? `mailto:${address}?subject=${encodeURIComponent(subject)}`
      : `mailto:${address}`;
    window.location.href = url;
  };

  return (
    <a
      className={className}
      href="#contact"
      onClick={handleClick}
      rel="nofollow"
      {...rest}
    >
      {children}
    </a>
  );
}
