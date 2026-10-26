"use client";

import {
  BoldIcon,
  ItalicIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  ListIndentDecreaseIcon,
  ListIndentIncreaseIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* @info - Tiptap parses whatever HTML it is given into its own schema, which is also
   how a stored draft is cleaned on the way back in: unknown tags and attributes never
   reach the DOM. Nothing here renders HTML through dangerouslySetInnerHTML. */

type RichTextSectionProps = {
  label: string;
  value: string;
  onChange: (html: string, characters: number) => void;
  onBlur?: () => void;
};

export function RichTextSection({
  label,
  value,
  onChange,
  onBlur,
}: RichTextSectionProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": label,
        class:
          "min-h-32 w-full rounded-xl bg-surface-muted px-3 py-2.5 text-[14px] text-ink leading-[1.65] outline-none focus-visible:ring-[3px] focus-visible:ring-ink/10",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML(), instance.getText().length);
    },
    onBlur,
  });

  // Only a value that changed outside the editor (a loaded draft, another tab) replaces
  // the content; the person's own keystrokes must never be set back under them.
  const synced = useRef(value);
  useEffect(() => {
    if (!editor || value === synced.current) return;
    synced.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className="min-h-32 rounded-xl bg-surface-muted"
        aria-hidden="true"
      />
    );
  }

  const tools = [
    {
      label: "Bold",
      icon: BoldIcon,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: ItalicIcon,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Bulleted list",
      icon: LeftToRightListBulletIcon,
      active: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: LeftToRightListNumberIcon,
      active: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Indent",
      icon: ListIndentIncreaseIcon,
      active: false,
      run: () => editor.chain().focus().sinkListItem("listItem").run(),
    },
    {
      label: "Outdent",
      icon: ListIndentDecreaseIcon,
      active: false,
      run: () => editor.chain().focus().liftListItem("listItem").run(),
    },
  ];

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            aria-label={tool.label}
            aria-pressed={tool.active}
            onClick={tool.run}
            className={cn(
              "grid size-9 place-items-center rounded-lg text-ink/60 hover:bg-surface-muted",
              tool.active && "bg-ink/[0.07] text-ink",
            )}
          >
            <HugeiconsIcon
              icon={tool.icon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
