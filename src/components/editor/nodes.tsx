"use client";

import { mergeAttributes, Node, Extension } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { clsx } from "clsx";

/**
 * Inkinspire's literary nodes for TipTap. Their JSON is what src/lib/editor/render.ts turns into
 * the public HTML, so node names and attributes here are the contract between editor and site.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    literary: {
      insertVerse: () => ReturnType;
      insertEpigraph: () => ReturnType;
      insertPullQuote: () => ReturnType;
      insertOrnament: () => ReturnType;
      insertPaywall: () => ReturnType;
      insertFigure: (attrs: { mediaId?: string; src: string; alt: string; caption?: string; credit?: string }) => ReturnType;
      toggleDropCap: () => ReturnType;
    };
  }
}

/** Paragraph with an optional drop cap (used on the opening paragraph). */
export const InkParagraph = Paragraph.extend({
  addAttributes() {
    return {
      dropCap: {
        default: false,
        parseHTML: (el) => el.classList.contains("has-drop-cap"),
        renderHTML: (attrs) => (attrs.dropCap ? { class: "has-drop-cap" } : {}),
      },
    };
  },
});

/**
 * Verse: typed like a poem on paper. Enter = new line, a blank line = new stanza, leading spaces
 * indent. Press Enter on an empty last line twice (or Ctrl/⌘+Enter) to leave the poem.
 */
export const Verse = Node.create({
  name: "verse",
  group: "block",
  content: "text*",
  marks: "italic bold",
  whitespace: "pre",
  defining: true,
  addAttributes() {
    return { numbered: { default: false }, title: { default: null } };
  },
  parseHTML() {
    return [{ tag: "div.ink-verse", preserveWhitespace: "full" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "ink-verse-editor", "data-numbered": HTMLAttributes.numbered ? "true" : "false" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VerseView);
  },
  addKeyboardShortcuts() {
    const exit = () => {
      const { state, view } = this.editor;
      const { $from } = state.selection;
      const after = $from.after();
      const tr = state.tr.insert(after, state.schema.nodes.paragraph.create());
      tr.setSelection(TextSelection.create(tr.doc, after + 1));
      view.dispatch(tr.scrollIntoView());
      return true;
    };
    return {
      Enter: () => {
        const { state } = this.editor;
        const { $from, empty } = state.selection;
        if ($from.parent.type.name !== "verse" || !empty) return false;
        const text = $from.parent.textContent;
        const atEnd = $from.parentOffset === $from.parent.content.size;
        if (atEnd && text.endsWith("\n\n")) {
          // Third Enter at the end: trim the blank lines and step out of the poem.
          const end = $from.end();
          this.editor.view.dispatch(state.tr.delete(end - 2, end));
          return exit();
        }
        return this.editor.commands.insertContent("\n");
      },
      "Mod-Enter": () => (this.editor.state.selection.$from.parent.type.name === "verse" ? exit() : false),
      Tab: () => (this.editor.state.selection.$from.parent.type.name === "verse" ? this.editor.commands.insertContent("  ") : false),
    };
  },
  addCommands() {
    return {
      insertVerse:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "verse", attrs: { numbered: false } }),
    };
  },
});

function VerseView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className={clsx("ink-block group relative my-8", selected && "is-selected")} data-type="verse">
      <div contentEditable={false} className="ink-block-bar">
        <span className="ink-block-label">Verse</span>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={!!node.attrs.numbered} onChange={(e) => updateAttributes({ numbered: e.target.checked })} />
          Line numbers
        </label>
        <span className="hidden text-ink-muted sm:inline">Enter = new line · blank line = new stanza · Enter ×3 to finish</span>
      </div>
      <NodeViewContent className="ink-verse-editor" as="div" />
    </NodeViewWrapper>
  );
}

/** Epigraph: an opening quotation with attribution. */
export const Epigraph = Node.create({
  name: "epigraph",
  group: "block",
  content: "paragraph+",
  defining: true,
  addAttributes() {
    return { attribution: { default: null } };
  },
  parseHTML() {
    return [{ tag: "blockquote.ink-epigraph" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["blockquote", mergeAttributes(HTMLAttributes, { class: "ink-epigraph" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EpigraphView);
  },
  addCommands() {
    return {
      insertEpigraph:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "epigraph", attrs: { attribution: "" }, content: [{ type: "paragraph" }] }),
    };
  },
});

function EpigraphView({ node, updateAttributes }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper as="div" className="ink-block relative my-8" data-type="epigraph">
      <div contentEditable={false} className="ink-block-bar">
        <span className="ink-block-label">Epigraph</span>
      </div>
      <blockquote className="ink-epigraph" style={{ marginBottom: 0 }}>
        <NodeViewContent as="div" />
        <div contentEditable={false} className="mt-2 flex justify-end">
          <label className="sr-only" htmlFor={`attr-${node.attrs.attribution}`}>Attribution</label>
          <input
            value={node.attrs.attribution ?? ""}
            onChange={(e) => updateAttributes({ attribution: e.target.value })}
            placeholder="— Who said it?"
            aria-label="Epigraph attribution"
            className="w-full max-w-xs border-b border-dashed border-rule bg-transparent text-right font-ui text-[0.72em] tracking-[0.12em] uppercase outline-none focus:border-focus"
          />
        </div>
      </blockquote>
    </NodeViewWrapper>
  );
}

/** Pull quote: a line from the story set large, between rules. */
export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "paragraph+",
  defining: true,
  parseHTML() {
    return [{ tag: "blockquote.ink-pullquote" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["blockquote", mergeAttributes(HTMLAttributes, { class: "ink-pullquote" }), 0];
  },
  addCommands() {
    return {
      insertPullQuote:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "pullQuote", content: [{ type: "paragraph" }] }),
    };
  },
});

/** Ornamental section break. Click it to change the ornament. */
export const Ornament = Node.create({
  name: "ornament",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { style: { default: "fleuron" } };
  },
  parseHTML() {
    return [{ tag: "hr.ink-ornament", getAttrs: (el) => ({ style: (el as HTMLElement).dataset.style ?? "fleuron" }) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["hr", mergeAttributes({ class: "ink-ornament", "data-style": HTMLAttributes.style })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(OrnamentView);
  },
  addCommands() {
    return {
      insertOrnament:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "ornament", attrs: { style: "fleuron" } }),
    };
  },
});

const ornamentStyles = ["fleuron", "asterism", "stars"] as const;
function OrnamentView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const next = ornamentStyles[(ornamentStyles.indexOf(node.attrs.style) + 1) % ornamentStyles.length];
  return (
    <NodeViewWrapper className={clsx("relative my-6 text-center", selected && "is-selected")} data-type="ornament">
      <button type="button" contentEditable={false} onClick={() => updateAttributes({ style: next })} title="Change ornament" className="w-full rounded py-2 hover:bg-sunken">
        <hr className="ink-ornament" data-style={node.attrs.style} style={{ margin: 0 }} />
        <span className="sr-only">Section break ({node.attrs.style}). Click to change.</span>
      </button>
    </NodeViewWrapper>
  );
}

/** The members line. Everything below it is for members; above it is the public preview. One per story. */
export const Paywall = Node.create({
  name: "paywall",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div.ink-paywall" }];
  },
  renderHTML() {
    return ["div", { class: "ink-paywall" }, "Members only below this line"];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PaywallView);
  },
  addCommands() {
    return {
      insertPaywall:
        () =>
        ({ state, commands }) => {
          let exists = false;
          state.doc.descendants((n) => {
            if (n.type.name === "paywall") exists = true;
          });
          if (exists) return false;
          return commands.insertContent({ type: "paywall" });
        },
    };
  },
});

function PaywallView({ selected, deleteNode }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className={clsx("relative my-10", selected && "is-selected")} data-type="paywall" contentEditable={false}>
      <div className="ink-paywall" style={{ margin: 0 }}>Members only below this line</div>
      <p className="mt-2 text-center font-ui text-[0.75rem] text-ink-muted">
        Readers without a membership see everything above this line, then an invitation to join.{" "}
        <button type="button" onClick={deleteNode} className="underline">Remove</button>
      </p>
    </NodeViewWrapper>
  );
}

/** Image with caption, credit and (required) alt text. */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { mediaId: { default: null }, src: { default: null }, alt: { default: "" }, caption: { default: "" }, credit: { default: "" }, width: { default: "normal" } };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector("img");
          if (!img) return false;
          return { src: img.getAttribute("src"), alt: img.getAttribute("alt") ?? "", caption: (el as HTMLElement).querySelector("figcaption")?.textContent ?? "" };
        },
      },
      { tag: "img[src]", getAttrs: (el) => ({ src: (el as HTMLElement).getAttribute("src"), alt: (el as HTMLElement).getAttribute("alt") ?? "" }) },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", { class: "ink-figure" }, ["img", { src: HTMLAttributes.src, alt: HTMLAttributes.alt }], ["figcaption", {}, HTMLAttributes.caption ?? ""]];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },
  addCommands() {
    return {
      insertFigure:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: "figure", attrs }),
    };
  },
});

function FigureView({ node, updateAttributes, selected, deleteNode }: ReactNodeViewProps) {
  const missingAlt = !String(node.attrs.alt ?? "").trim();
  return (
    <NodeViewWrapper as="figure" className={clsx("ink-figure relative my-8", selected && "is-selected")} data-type="figure" contentEditable={false}>
      {/* eslint-disable-next-line @next/next/no-img-element -- editor preview */}
      <img src={node.attrs.src} alt={node.attrs.alt} className="w-full rounded-[var(--radius-s)]" />
      <div className="mt-2 grid gap-2 font-ui text-[0.8rem]">
        <input
          value={node.attrs.alt}
          onChange={(e) => updateAttributes({ alt: e.target.value })}
          placeholder="Describe the image for people who can’t see it (required)"
          aria-label="Alt text"
          aria-invalid={missingAlt}
          className={clsx("field min-h-9 py-1 text-[0.85rem]", missingAlt && "border-warning")}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={node.attrs.caption} onChange={(e) => updateAttributes({ caption: e.target.value })} placeholder="Caption (optional)" aria-label="Caption" className="field min-h-9 py-1 text-[0.85rem]" />
          <input value={node.attrs.credit} onChange={(e) => updateAttributes({ credit: e.target.value })} placeholder="Credit, e.g. Photo: Ada Obi" aria-label="Credit" className="field min-h-9 py-1 text-[0.85rem]" />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={node.attrs.width === "wide"} onChange={(e) => updateAttributes({ width: e.target.checked ? "wide" : "normal" })} />
            Wide on large screens
          </label>
          <button type="button" onClick={deleteNode} className="ml-auto text-danger underline">Remove image</button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

/** Drop cap toggle on the current paragraph (Mod-Shift-D). */
export const DropCap = Extension.create({
  name: "dropCapCommand",
  addCommands() {
    return {
      toggleDropCap:
        () =>
        ({ editor, commands }) =>
          commands.updateAttributes("paragraph", { dropCap: !editor.getAttributes("paragraph").dropCap }),
    };
  },
  addKeyboardShortcuts() {
    return { "Mod-Shift-d": () => this.editor.commands.toggleDropCap() };
  },
});
