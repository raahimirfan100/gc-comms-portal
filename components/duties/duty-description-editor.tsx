"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bold, Italic, Underline, List, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
};

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = before
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);
  const newText =
    text.slice(0, start) + before + selected + after + text.slice(end);
  return newText;
}

export function DutyDescriptionEditor({
  value,
  onChange,
  placeholder = "Describe this duty (supports **bold**, *italic*, lists, links)…",
  id,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyFormat(before: string, after: string = before) {
    const ta = textareaRef.current;
    if (!ta) return;
    const newValue = wrapSelection(ta, before, after);
    onChange(newValue);
    ta.focus();
    const start = ta.selectionStart;
    ta.setSelectionRange(start + before.length, start + before.length);
  }

  function applyLink() {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const url = window.prompt("Link URL:", "https://");
    if (url == null) return;
    const text = selected || "link text";
    const markdown = `[${text}](${url})`;
    const newValue =
      ta.value.slice(0, start) + markdown + ta.value.slice(end);
    onChange(newValue);
    ta.focus();
  }

  function applyBullet() {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = ta.value.indexOf("\n", start);
    const end = lineEnd === -1 ? ta.value.length : lineEnd;
    const line = ta.value.slice(lineStart, end);
    const newLine = line.trimStart().startsWith("- ")
      ? line.replace(/^- \s*/, "")
      : "- " + line;
    const newValue =
      ta.value.slice(0, lineStart) + newLine + ta.value.slice(end);
    onChange(newValue);
    ta.focus();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1 p-1 rounded-md border bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormat("**", "**")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormat("*", "*")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormat("<u>", "</u>")}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyBullet}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyLink}
          title="Insert link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={4}
        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
