import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 22, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return <IconBase {...props}><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></IconBase>;
}

export function ArrowLeft(props: IconProps) {
  return <IconBase {...props}><path d="m15 5-7 7 7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></IconBase>;
}

export function Check(props: IconProps) {
  return <IconBase {...props}><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></IconBase>;
}

export function ChevronRight(props: IconProps) {
  return <IconBase {...props}><path d="m9 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></IconBase>;
}

export function Heart({ filled, ...props }: IconProps & { filled?: boolean }) {
  return <IconBase {...props}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></IconBase>;
}

export function ImageIcon(props: IconProps) {
  return <IconBase {...props}><rect height="17" rx="2.5" stroke="currentColor" strokeWidth="1.7" width="19" x="2.5" y="3.5" /><circle cx="8.3" cy="8.5" r="1.7" stroke="currentColor" strokeWidth="1.5" /><path d="m4.5 18 5-5 3.2 3.1 2.1-2.1 4.7 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></IconBase>;
}

export function Mic(props: IconProps) {
  return <IconBase {...props}><rect height="12" rx="4" stroke="currentColor" strokeWidth="1.7" width="7" x="8.5" y="2" /><path d="M5.5 10.5v.5a6.5 6.5 0 0 0 13 0v-.5M12 17.5V22m-4 0h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></IconBase>;
}

export function Calendar(props: IconProps) {
  return <IconBase {...props}><rect height="17" rx="2.5" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="4.5" /><path d="M7.5 2.5v4M16.5 2.5v4M3 9h18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" /></IconBase>;
}

export function Play(props: IconProps) {
  return <IconBase {...props}><path d="m9 7 8 5-8 5V7Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" /></IconBase>;
}

export function Pause(props: IconProps) {
  return <IconBase {...props}><path d="M9 7v10M15 7v10" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" /></IconBase>;
}

export function Lock(props: IconProps) {
  return <IconBase {...props}><rect height="10" rx="2" stroke="currentColor" strokeWidth="1.7" width="14" x="5" y="11" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" /></IconBase>;
}

export function LogOut(props: IconProps) {
  return <IconBase {...props}><path d="m10 17 5-5-5-5m5 5H3m12-9h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></IconBase>;
}

export function Menu(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></IconBase>;
}

export function Copy(props: IconProps) {
  return <IconBase {...props}><rect height="13" rx="2" stroke="currentColor" strokeWidth="1.6" width="13" x="8" y="8" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.6" /></IconBase>;
}

export function Share(props: IconProps) {
  return <IconBase {...props}><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" /><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" /><circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6" /><path d="m8.2 10.8 7.5-4.5M8.2 13.2l7.5 4.5" stroke="currentColor" strokeWidth="1.6" /></IconBase>;
}

export function Trash(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M9 3h6l1 4H8l1-4Zm-2 4 1 14h8l1-14M10 11v6M14 11v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></IconBase>;
}
