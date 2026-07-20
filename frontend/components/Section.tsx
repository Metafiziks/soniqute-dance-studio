import { ReactNode } from "react";

export default function Section({ id, eyebrow, title, subtitle, children }: {
  id?: string;
  eyebrow?: string;
  title?: string | ReactNode;
  subtitle?: string | ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="container-padding maxw py-16 md:py-24">
      {eyebrow && <p className="text-sq-secondary mb-3 font-medium">{eyebrow}</p>}
      {title && <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">{title}</h2>}
      {subtitle && <p className="mt-3 text-white/70 max-w-2xl">{subtitle}</p>}
      <div className="mt-10">
        {children}
      </div>
    </section>
  );
}
