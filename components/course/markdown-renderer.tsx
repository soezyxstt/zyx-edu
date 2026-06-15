"use client";

import React, { useState, type ReactNode } from "react";
import katex from "katex";
import { 
  Info, 
  Lightbulb, 
  AlertTriangle, 
  AlertOctagon, 
  Sparkles, 
  Copy, 
  Check 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// --- Types ---

interface Block {
  type: "p" | "h" | "code" | "list" | "blockquote" | "alert" | "table" | "hr";
  level?: number;
  language?: string;
  items?: { text: string; ordered: boolean }[];
  rows?: string[][];
  headers?: string[];
  alignments?: ("left" | "center" | "right")[];
  content?: string;
  alertType?: "note" | "tip" | "important" | "warning" | "caution";
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// --- KaTeX Setup ---

const katexOptions = {
  throwOnError: false,
  strict: false,
  trust: false,
};

function renderMath(value: string, displayMode: boolean): string {
  try {
    return katex.renderToString(value, { ...katexOptions, displayMode });
  } catch (err) {
    console.error("KaTeX render error:", err);
    return value;
  }
}

// --- Inline Parser ---

function parseInline(text: string): ReactNode[] {
  const result: ReactNode[] = [];
  let index = 0;
  let textAccumulator = "";

  const flushText = () => {
    if (textAccumulator) {
      result.push(<span key={`txt-${index}-${result.length}`}>{textAccumulator}</span>);
      textAccumulator = "";
    }
  };

  while (index < text.length) {
    const remaining = text.slice(index);

    // 1. Math Block (e.g. $$...$$ or \[...\])
    const mathBlockMatch = remaining.match(/^\$\$([\s\S]+?)\$\$/) || remaining.match(/^\\\[([\s\S]+?)\\\]/);
    if (mathBlockMatch) {
      flushText();
      const content = mathBlockMatch[1] || mathBlockMatch[2];
      result.push(
        <span
          key={`mathblk-${index}`}
          className="my-3 block overflow-x-auto overflow-y-hidden py-1.5 text-center"
          dangerouslySetInnerHTML={{ __html: renderMath(content, true) }}
        />
      );
      index += mathBlockMatch[0].length;
      continue;
    }

    // 2. Math Inline (e.g. $...$ or \(...\))
    const mathInlineMatch = remaining.match(/^\$([^\$\n]+?)\$/) || remaining.match(/^\\\(([\s\S]+?)\\\)/);
    if (mathInlineMatch) {
      flushText();
      const content = mathInlineMatch[1] || mathInlineMatch[2];
      result.push(
        <span
          key={`mathinline-${index}`}
          className="inline-block max-w-full align-baseline px-0.5"
          dangerouslySetInnerHTML={{ __html: renderMath(content, false) }}
        />
      );
      index += mathInlineMatch[0].length;
      continue;
    }

    // 3. Image (e.g. ![alt](src))
    const imgMatch = remaining.match(/^!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      flushText();
      const alt = imgMatch[1];
      const src = imgMatch[2];
      result.push(
        <span key={`img-${index}`} className="block my-6 text-center">
          <img
            src={src}
            alt={alt}
            className="photo-inline mx-auto rounded-2xl border border-border shadow-sm max-w-full h-auto max-h-[450px]"
          />
          {alt && <span className="block mt-2 text-body-sm text-muted-foreground italic font-sans">{alt}</span>}
        </span>
      );
      index += imgMatch[0].length;
      continue;
    }

    // 4. Link (e.g. [text](href))
    const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      flushText();
      const linkText = linkMatch[1];
      const href = linkMatch[2];
      result.push(
        <a
          key={`link-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary font-semibold hover:underline decoration-brand-primary/40 underline-offset-4"
        >
          {parseInline(linkText)}
        </a>
      );
      index += linkMatch[0].length;
      continue;
    }

    // 5. Bold (e.g. **text** or __text__)
    const boldMatch = remaining.match(/^\*\*([\s\S]+?)\*\*/) || remaining.match(/^__([\s\S]+?)__/);
    if (boldMatch) {
      flushText();
      const content = boldMatch[1];
      result.push(
        <strong key={`bold-${index}`} className="font-bold">
          {parseInline(content)}
        </strong>
      );
      index += boldMatch[0].length;
      continue;
    }

    // 6. Italic (e.g. *text* or _text_)
    const italicMatch = remaining.match(/^\*([^\*]+?)\*/) || remaining.match(/^_(.+?)_/);
    if (italicMatch) {
      flushText();
      const content = italicMatch[1];
      result.push(
        <em key={`italic-${index}`} className="italic">
          {parseInline(content)}
        </em>
      );
      index += italicMatch[0].length;
      continue;
    }

    // 7. Inline Code (e.g. `code`)
    const codeMatch = remaining.match(/^`([^`]+?)`/);
    if (codeMatch) {
      flushText();
      const content = codeMatch[1];
      result.push(
        <code
          key={`code-${index}`}
          className="px-1.5 py-0.5 rounded bg-muted text-body-sm font-mono border border-border text-foreground"
        >
          {content}
        </code>
      );
      index += codeMatch[0].length;
      continue;
    }

    // No match, accumulate character
    textAccumulator += text[index];
    index++;
  }

  flushText();
  return result;
}

// --- Block-Level Parser ---

function parseMarkdown(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: "code",
        language: language || "plaintext",
        content: codeLines.join("\n"),
      });
      continue;
    }

    // 2. Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 3. Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "h",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 4. Blockquote or Alert
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      let isAlert = false;
      let alertType: "note" | "tip" | "important" | "warning" | "caution" = "note";

      const alertMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
      if (alertMatch) {
        isAlert = true;
        alertType = alertMatch[1].toLowerCase() as any;
        i++;
      }

      while (i < lines.length && lines[i].trim().startsWith(">")) {
        let contentLine = lines[i].trim().slice(1);
        if (contentLine.startsWith(" ")) {
          contentLine = contentLine.slice(1);
        }
        quoteLines.push(contentLine);
        i++;
      }

      const quoteContent = quoteLines.join("\n").trim();
      if (isAlert) {
        blocks.push({
          type: "alert",
          alertType,
          content: quoteContent,
        });
      } else {
        blocks.push({
          type: "blockquote",
          content: quoteContent,
        });
      }
      continue;
    }

    // 5. Lists
    const listPattern = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
    if (listPattern.test(line)) {
      const items: { text: string; ordered: boolean }[] = [];
      while (i < lines.length && listPattern.test(lines[i])) {
        const match = lines[i].match(listPattern);
        if (match) {
          const marker = match[2];
          const isOrdered = /^\d/.test(marker);
          items.push({
            text: match[3].trim(),
            ordered: isOrdered,
          });
        }
        i++;
      }
      blocks.push({
        type: "list",
        items,
      });
      continue;
    }

    // 6. Tables
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) {
const headers = trimmed
          .replace(/\\mid/g, ':')
          .replace(/\\\|/g, ':')
          .split("|")
          .map((s) => s.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      i++;

      let alignments: ("left" | "center" | "right")[] = [];
      if (i < lines.length) {
        const sepLine = lines[i].trim();
        if (sepLine.startsWith("|") && sepLine.endsWith("|")) {
          const parts = sepLine
            .split("|")
            .map((s) => s.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          const isSep = parts.every((p) => /^[:-]+$/.test(p));
          if (isSep) {
            alignments = parts.map((p) => {
              const startColon = p.startsWith(":");
              const endColon = p.endsWith(":");
              if (startColon && endColon) return "center";
              if (endColon) return "right";
              return "left";
            });
            i++;
          }
        }
      }

      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        const rowParts = lines[i]
          .replace(/\\mid/g, ':')
          .replace(/\\\|/g, ':')
          .split("|")
          .map((s) => s.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        rows.push(rowParts);
        i++;
      }

      blocks.push({
        type: "table",
        headers,
        alignments: alignments.length > 0 ? alignments : headers.map(() => "left"),
        rows,
      });
      continue;
    }

    // 7. Paragraph
    if (trimmed === "") {
      i++;
      continue;
    }

    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !listPattern.test(lines[i]) &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|"))
    ) {
      pLines.push(lines[i].trim());
      i++;
    }
    blocks.push({
      type: "p",
      content: pLines.join(" "),
    });
  }

  return blocks;
}

// --- Inner Components ---

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-border/80 bg-zinc-950 dark:bg-zinc-900/60 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 dark:bg-zinc-950/40 border-b border-zinc-800 text-zinc-400 text-[11px] font-mono select-none">
        <span className="font-semibold tracking-wider uppercase text-zinc-400/80">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors py-1 px-2 rounded-md hover:bg-zinc-800"
          type="button"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400 animate-in fade-in zoom-in-75 duration-200" />
              <span className="text-emerald-400 font-medium">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-zinc-200 font-mono text-[13px] sm:text-body-sm leading-relaxed text-left">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function AlertCallout({
  type,
  content,
}: {
  type: "note" | "tip" | "important" | "warning" | "caution";
  content: string;
}) {
  const config = {
    note: {
      border: "border-blue-500/25 bg-blue-500/5 text-blue-900 dark:text-blue-100",
      icon: <Info className="size-5 text-blue-500 shrink-0 mt-0.5" />,
      label: "Catatan",
      labelColor: "text-blue-600 dark:text-blue-400",
    },
    tip: {
      border: "border-status-success/25 bg-status-success/5 text-emerald-950 dark:text-emerald-50",
      icon: <Lightbulb className="size-5 text-status-success shrink-0 mt-0.5" />,
      label: "Tips & Trik",
      labelColor: "text-status-success dark:text-emerald-400",
    },
    important: {
      border: "border-violet-500/25 bg-violet-500/5 text-violet-950 dark:text-violet-50",
      icon: <Sparkles className="size-5 text-violet-500 shrink-0 mt-0.5" />,
      label: "Penting",
      labelColor: "text-violet-600 dark:text-violet-400",
    },
    warning: {
      border: "border-status-warning/25 bg-status-warning/5 text-amber-950 dark:text-amber-50",
      icon: <AlertTriangle className="size-5 text-status-warning shrink-0 mt-0.5" />,
      label: "Peringatan",
      labelColor: "text-status-warning dark:text-amber-400",
    },
    caution: {
      border: "border-status-error/25 bg-status-error/5 text-rose-950 dark:text-rose-50",
      icon: <AlertOctagon className="size-5 text-status-error shrink-0 mt-0.5" />,
      label: "Perhatian",
      labelColor: "text-status-error dark:text-rose-400",
    },
  }[type];

  return (
    <div className={cn("my-6 p-4 md:p-5 rounded-2xl border flex gap-3.5 leading-relaxed shadow-xs", config.border)}>
      {config.icon}
      <div className="flex-1 text-left">
        <div className={cn("text-body-xs font-bold font-heading uppercase tracking-wider mb-1", config.labelColor)}>
          {config.label}
        </div>
        <div className="text-body-sm leading-relaxed text-foreground/90 font-sans">
          {parseInline(content)}
        </div>
      </div>
    </div>
  );
}

function InteractiveGraphWidget({ initialFormula }: { initialFormula: string }) {
  const [formula, setFormula] = useState(initialFormula || "x^2 - 2");
  
  const padL = 46;
  const padR = 18;
  const padT = 16;
  const padB = 36;
  const svgW = 600;
  const svgH = 312;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  
  const xMin = -10;
  const xMax = 10;
  const yMin = -8;
  const yMax = 8;

  const mapX = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
  const mapY = (y: number) => padT + ((yMax - y) / (yMax - yMin)) * plotH;

  const evalFormula = (xVal: number) => {
    let expr = formula
      .toLowerCase()
      .replace(/\^/g, "**")
      .replace(/sin/g, "Math.sin")
      .replace(/cos/g, "Math.cos")
      .replace(/tan/g, "Math.tan")
      .replace(/sqrt/g, "Math.sqrt")
      .replace(/exp/g, "Math.exp")
      .replace(/log/g, "Math.log")
      .replace(/pi/g, "Math.PI")
      .replace(/e/g, "Math.E");

    // Allow only safe characters
    const sanitized = expr.replace(/[^0-9x+\-*/().\sMath.sincostanqrexplgPIE]/g, "");

    try {
      const fn = new Function("x", `return ${sanitized};`);
      const val = fn(xVal);
      return isNaN(val) ? 0 : val;
    } catch {
      return NaN;
    }
  };

  const graphPath = React.useMemo(() => {
    const steps = 200;
    let path = "";
    let started = false;

    for (let i = 0; i <= steps; i++) {
      const xVal = xMin + (i / steps) * (xMax - xMin);
      const yVal = evalFormula(xVal);

      if (isNaN(yVal)) continue;

      const px = mapX(xVal);
      const py = mapY(Math.min(yMax + 2, Math.max(yMin - 2, yVal)));

      if (!started) {
        path += `M ${px} ${py}`;
        started = true;
      } else {
        path += ` L ${px} ${py}`;
      }
    }
    return path;
  }, [formula]);

  const xTicks = React.useMemo(() => {
    const ticks = [];
    for (let x = -10; x <= 10; x += 2) ticks.push(x);
    return ticks;
  }, []);

  const yTicks = React.useMemo(() => {
    const ticks = [];
    for (let y = -8; y <= 8; y += 2) ticks.push(y);
    return ticks;
  }, []);

  const showXAxis = yMin < 0 && yMax > 0;
  const showYAxis = xMin < 0 && xMax > 0;
  const y0 = mapY(0);
  const x0 = mapX(0);

  const gridLines: React.ReactNode[] = [];

  for (let gx = -10; gx <= 10; gx++) {
    const major = gx % 5 === 0;
    gridLines.push(
      <line
        key={`vx-${gx}`}
        x1={mapX(gx)}
        y1={padT}
        x2={mapX(gx)}
        y2={padT + plotH}
        stroke={major ? "#d6d6d6" : "#ececec"}
        strokeWidth={major ? 1 : 0.65}
      />
    );
  }

  for (let gy = -8; gy <= 8; gy++) {
    const major = gy % 4 === 0;
    gridLines.push(
      <line
        key={`hy-${gy}`}
        x1={padL}
        y1={mapY(gy)}
        x2={padL + plotW}
        y2={mapY(gy)}
        stroke={major ? "#d6d6d6" : "#ececec"}
        strokeWidth={major ? 1 : 0.65}
      />
    );
  }

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md">
      <div className="flex items-center gap-3 border-b bg-muted/20 px-4 py-2 font-sans select-none">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-[10px] font-bold font-mono">f</span>
        <span className="text-body-sm font-mono text-muted-foreground">y =</span>
        <Input
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="e.g. x^2 - 4"
          className="h-8 font-mono text-body-sm rounded-lg bg-background border-border/80 focus-visible:ring-brand-primary py-1"
        />
      </div>
      <div className="relative bg-white">
        <svg viewBox="0 0 600 312" className="h-[240px] w-full max-w-full md:h-[278px]">
          <g aria-hidden>{gridLines}</g>
          {showXAxis && <line x1={padL} y1={y0} x2={padL + plotW} y2={y0} stroke="#1f2937" strokeWidth={1.75} />}
          {showYAxis && <line x1={x0} y1={padT} x2={x0} y2={padT + plotH} stroke="#1f2937" strokeWidth={1.75} />}
          
          {xTicks.map((xv) => (
            <text key={`xt-${xv}`} x={mapX(xv)} y={padT + plotH + 22} textAnchor="middle" fill="#6b7280" fontSize={11} fontFamily="system-ui">
              {xv}
            </text>
          ))}
          {yTicks.map((yv) => (
            <text key={`yt-${yv}`} x={padL - 10} y={mapY(yv)} textAnchor="end" dominantBaseline="middle" fill="#6b7280" fontSize={11} fontFamily="system-ui">
              {yv}
            </text>
          ))}

          <clipPath id="plot-clip-embed">
            <rect x={padL} y={padT} width={plotW} height={plotH} />
          </clipPath>

          {graphPath && (
            <path
              d={graphPath}
              fill="none"
              stroke="#2464b8"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#plot-clip-embed)"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

// --- Main Component ---

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const blocks = parseMarkdown(content);
  const hasTextColor = className && /\btext-\w+/.test(className);

  return (
    <div className={cn(
      "markdown-article text-left space-y-4 font-sans select-text",
      !hasTextColor && "text-foreground/90",
      className
    )}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "p":
            return (
              <p key={idx} className="text-body-base leading-relaxed">
                {parseInline(block.content || "")}
              </p>
            );

          case "h": {
            const hLvl = block.level || 2;
            const headingClasses = {
              1: "text-h2 font-heading font-bold mt-8 mb-4 border-b border-border/60 pb-2.5 tracking-tight",
              2: "text-h3 font-heading font-bold mt-7 mb-3 tracking-tight",
              3: "text-h4 font-heading font-bold mt-6 mb-3 tracking-tight",
              4: "text-h5 font-heading font-semibold mt-5 mb-2.5 tracking-tight",
              5: "text-h6 font-heading font-semibold mt-4 mb-2 tracking-tight",
              6: "text-body-base font-heading font-semibold text-muted-foreground mt-4 mb-2 tracking-tight",
            };
            const cls = headingClasses[hLvl as 1 | 2 | 3 | 4 | 5 | 6] || headingClasses[2];
            
            // Map headers to native semantic levels but style via Lexend theme
            const HeadingTag = `h${hLvl}` as any;
            return (
              <HeadingTag key={idx} className={cls}>
                {parseInline(block.content || "")}
              </HeadingTag>
            );
          }

          case "code":
            if (block.language === "desmos" || block.language === "desmos-graph") {
              return (
                <InteractiveGraphWidget
                  key={idx}
                  initialFormula={block.content || ""}
                />
              );
            }
            return (
              <CodeBlock
                key={idx}
                language={block.language || "plaintext"}
                code={block.content || ""}
              />
            );

          case "list": {
            const isOrdered = block.items?.[0]?.ordered || false;
            const ListTag = isOrdered ? "ol" : "ul";
            return (
              <ListTag
                key={idx}
                className={cn(
                  "my-4 pl-6 space-y-1.5 leading-relaxed text-body-base",
                  isOrdered ? "list-decimal" : "list-disc"
                )}
              >
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="pl-1">
                    {parseInline(item.text)}
                  </li>
                ))}
              </ListTag>
            );
          }

          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="my-5 pl-5 border-l-4 border-primary/50 text-muted-foreground italic bg-muted/20 py-2.5 pr-4 rounded-r-xl leading-relaxed text-body-md"
              >
                {parseInline(block.content || "")}
              </blockquote>
            );

          case "alert":
            return (
              <AlertCallout
                key={idx}
                type={block.alertType || "note"}
                content={block.content || ""}
              />
            );

          case "table": {
            const alignments = block.alignments || [];
            return (
              <div key={idx} className="my-6 overflow-x-auto rounded-2xl border border-border shadow-2xs">
                <table className="w-full text-left border-collapse text-body-sm">
                  <thead>
                    <tr className="bg-muted/80 text-foreground font-semibold border-b border-border/80">
                      {block.headers?.map((header, headIdx) => {
                        const align = alignments[headIdx] || "left";
                        return (
                          <th
                            key={headIdx}
                            className={cn(
                              "px-4 py-3 font-heading font-bold select-none text-foreground/95",
                              align === "center" && "text-center",
                              align === "right" && "text-right"
                            )}
                          >
                            {parseInline(header)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows?.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="border-b border-border/40 last:border-b-0 odd:bg-card/30 even:bg-muted/20 transition-colors hover:bg-muted/30"
                      >
                        {row.map((cell, cellIdx) => {
                          const align = alignments[cellIdx] || "left";
                          return (
                            <td
                              key={cellIdx}
                              className={cn(
                                "px-4 py-3 text-foreground/80 font-normal leading-relaxed",
                                align === "center" && "text-center",
                                align === "right" && "text-right"
                              )}
                            >
                              {parseInline(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case "hr":
            return <hr key={idx} className="my-8 border-t border-border/80" />;

          default:
            return null;
        }
      })}
    </div>
  );
}
