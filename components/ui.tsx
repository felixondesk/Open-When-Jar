import Link from "next/link";
import Image from "next/image";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Brand({ linkToHome = true }: { linkToHome?: boolean }) {
  const content = <><Image className="brand__mark" src="/open-when-jar-mark.png" width={38} height={38} alt="" aria-hidden="true" /><span>Open When Jar</span></>;
  return linkToHome
    ? <Link className="brand" href="/" aria-label="Open When Jar home">{content}</Link>
    : <span className="brand brand--static">{content}</span>;
}

export function StepRail({ active }: { active: 1 | 2 | 3 }) {
  return (
    <ol className="step-rail" aria-label="Jar creation progress">
      {["Letter", "Jar", "Preview"].map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        return (
          <li className={step <= active ? "is-active" : ""} key={label} aria-current={step === active ? "step" : undefined}>
            <span>{step < active ? "✓" : step}</span>
            <small>{label}</small>
          </li>
        );
      })}
    </ol>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Toast({ message }: { message: string | null }) {
  return message ? <div className="toast" role="status">{message}</div> : null;
}
