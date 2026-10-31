import { Fragment } from "react";

/** Renders `code` spans and **bold** text. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`") && p.length > 1)
          return (
            <code key={i} className="rounded-md bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.9em] text-sky-200 ring-1 ring-white/10">
              {p.slice(1, -1)}
            </code>
          );
        if (p.startsWith("**") && p.endsWith("**"))
          return (
            <strong key={i} className="font-semibold text-white">
              {p.slice(2, -2)}
            </strong>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </span>
  );
}
