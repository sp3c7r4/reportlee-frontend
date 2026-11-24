/**
 * When a rich text editor must take a new value from outside. Plain logic, no React,
 * so the rule is tested without a browser.
 */

export type EditorSync = {
  /** The editor produced this HTML from the person's own typing. */
  emitted: (html: string) => void;
  /** True when `value` came from outside (a loaded draft) and must replace the content. */
  shouldReplace: (value: string) => boolean;
};

/* @info - The editor's own HTML comes straight back as the parent's value. Setting it
   again re-parses it, and ProseMirror drops a paragraph's trailing space on parse, so
   every space vanished as it was typed. Remembering what was emitted stops that. */
export function editorSync(initial: string): EditorSync {
  let known = initial;
  return {
    emitted: (html) => {
      known = html;
    },
    shouldReplace: (value) => {
      if (value === known) return false;
      known = value;
      return true;
    },
  };
}
