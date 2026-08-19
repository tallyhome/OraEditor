import "../styles/ora-editor.css";
import { CORE_VERSION } from "../version.js";
import type { OraDocument, OraMark } from "../document/types.js";
import {
  createEmptyDocument,
  fromHTML,
  fromJSON,
  getNode,
  isText,
  toHTML,
  toJSON,
} from "../document/index.js";
import { Schema } from "../document/schema.js";
import { selectedHTML } from "../document/slice.js";
import { linkRangeAt } from "../document/linkRange.js";
import { hasMark } from "../document/marks.js";
import { pathEquals } from "../document/path.js";
import type { Selection, TextSelection } from "../selection/types.js";
import {
  initialSelection,
  isCollapsed,
  isTextSelection,
  selectionEdges,
} from "../selection/types.js";
import { applyOperation, Transform } from "../transaction/index.js";
import { activeMarksAt, textPathsInRange } from "../transaction/transform.js";
import type { HistoryKind } from "../history/History.js";
import { History } from "../history/History.js";
import { CommandRegistry, registerBuiltinCommands } from "../commands/registry.js";
import type { CommandArgs } from "../commands/registry.js";
import { EventBus } from "../events/EventBus.js";
import type { EventHandler, OraEventType } from "../events/EventBus.js";
import { PluginRegistry } from "../plugins/registry.js";
import type { OraPlugin } from "../plugins/types.js";
import { Renderer } from "../renderer/Renderer.js";
import { bindInput } from "../input/beforeInput.js";
import { AIProviderRegistry, createCustomProvider, createOpenAIProvider, mockAIProvider, oraAIProvider } from "../ai/index.js";
import type { AICapability } from "../ai/types.js";
import { cleanPastedHtml } from "../clipboard/index.js";
import { mountToolbar } from "../ui/toolbar.js";
import { extractAIFragments, mountAIPanel } from "../ui/aiPanel.js";
import { mountFindBar } from "../ui/findBar.js";
import { mountStatusBar } from "../ui/statusBar.js";
import { blobUploadAdapter } from "../adapters/upload.js";
import { validateImageFile } from "../security/files.js";
import type { OraEditorOptions, OraFeatures } from "./options.js";
import { resolveFeatures } from "./options.js";
import { documentStats } from "../document/search.js";
import { resolveLocale, t as translate, type OraLocale, type OraMessageKey } from "../i18n/index.js";

export interface DispatchOptions {
  history?: boolean;
  kind?: HistoryKind;
  source?: "user" | "api" | "history";
}

export class OraEditor {
  static readonly version = CORE_VERSION;
  private static globalPlugins: OraPlugin[] = [];

  static registerPlugin(plugin: OraPlugin): void {
    OraEditor.globalPlugins.push(plugin);
  }

  readonly commands = new CommandRegistry();
  readonly schema = Schema.createDefault();
  readonly config: { plugins: Record<string, unknown> } = { plugins: {} };
  readonly ai = new AIProviderRegistry();
  readonly options: OraEditorOptions;
  readonly features: OraFeatures;
  locale: OraLocale;
  openFindBar: (focusReplace?: boolean) => void = () => undefined;
  refreshToolbar: () => void = () => undefined;
  refreshFindBar: () => void = () => undefined;
  refreshStatusBar: () => void = () => undefined;
  refreshAIPanel: () => void = () => undefined;
  readonly ui = {
    addToolbarButton: (spec: { id: string; title: string; label: string; onClick: () => void }) => {
      const bar = this.root.querySelector(".ora-toolbar");
      if (!bar) {
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.plugin = spec.id;
      button.title = spec.title;
      button.textContent = spec.label;
      button.addEventListener("click", spec.onClick);
      bar.appendChild(button);
    },
  };

  private readonly host: HTMLElement;
  private readonly root: HTMLElement;
  private readonly renderer: Renderer;
  private readonly events = new EventBus();
  private readonly history = new History();
  private readonly plugins = new PluginRegistry();
  private readonly unbindInput: () => void;
  private unbindToolbar: (() => void) | null = null;
  private unbindAI: (() => void) | null = null;
  private unbindFind: (() => void) | null = null;
  private unbindStatus: (() => void) | null = null;
  private destroyed = false;
  private busy = false;
  private state: {
    doc: OraDocument;
    selection: Selection;
    storedMarks: OraMark[] | null;
  };

  constructor(options: OraEditorOptions) {
    this.options = options;
    this.features = resolveFeatures(options);
    this.locale = resolveLocale(options.locale);
    this.host = resolveElement(options.element);
    this.host.classList.add("ora-editor");
    this.host.lang = this.locale;
    this.root = document.createElement("div");
    this.root.className = "ora-root";
    this.host.appendChild(this.root);
    this.renderer = new Renderer(this.root);
    this.renderer.setPlaceholder(options.placeholder ?? translate(this.locale, "placeholder"));
    this.renderer.setHeaderLabel(translate(this.locale, "toggleHeaderRow"));
    if (options.editable === false) {
      this.renderer.contentEl.contentEditable = "false";
    }

    this.state = {
      doc: resolveContent(options.content),
      selection: initialSelection(),
      storedMarks: null,
    };

    registerBuiltinCommands(this.commands);
    this.ai.register(mockAIProvider);
    if (options.aiProxyUrl) {
      this.ai.register(createOpenAIProvider(options.aiProxyUrl));
      this.ai.register(createCustomProvider(options.aiProxyUrl));
    }
    this.ai.register(oraAIProvider);

    this.unbindInput = bindInput(this, this.renderer.contentEl);
    if (options.toolbar) {
      const toolbarHost = options.toolbar === true ? this.root : options.toolbar;
      this.unbindToolbar = mountToolbar(this, toolbarHost, this.features);
    }
    this.unbindFind = mountFindBar(this, this.root);
    if (options.toolbar) {
      this.unbindStatus = mountStatusBar(this, this.root);
    }
    if (this.features.ai && options.toolbar) {
      this.unbindAI = mountAIPanel(this, this.root);
    }
    for (const plugin of [...OraEditor.globalPlugins, ...(options.plugins ?? [])]) {
      this.plugins.register(plugin);
    }
    this.plugins.setupAll(this);
    for (const plugin of this.plugins.list()) {
      this.events.emit("pluginLoaded", { id: plugin.id });
    }
    this.renderer.render(this.state.doc, this.state.selection);
    this.events.emit("ready", { editor: this });
  }

  get hostElement(): HTMLElement {
    return this.host;
  }

  getJSON(): OraDocument {
    return toJSON(this.state.doc);
  }

  setJSON(doc: OraDocument): void {
    this.state = {
      doc: fromJSON(doc),
      selection: initialSelection(),
      storedMarks: null,
    };
    this.history.clear();
    this.renderer.render(this.state.doc, this.state.selection);
    this.events.emit("change", { source: "api" });
    this.events.emit("selectionChange", undefined);
  }

  getHTML(): string {
    return toHTML(this.state.doc);
  }

  setHTML(html: string): void {
    this.setJSON(fromHTML(html));
  }

  focus(): void {
    this.renderer.contentEl.focus();
  }

  blur(): void {
    this.renderer.contentEl.blur();
  }

  undo(): boolean {
    const step = this.history.popUndo();
    if (!step) {
      return false;
    }
    this.busy = true;
    let { doc } = this.state;
    let selection = this.state.selection;
    for (let i = step.inverses.length - 1; i >= 0; i -= 1) {
      const op = step.inverses[i];
      if (!op) {
        continue;
      }
      const result = applyOperation(doc, selection, op);
      doc = result.doc;
      selection = result.selection;
    }
    this.state = {
      doc,
      selection: step.selectionBefore,
      storedMarks: step.storedMarksBefore,
    };
    this.renderer.render(this.state.doc, this.state.selection);
    this.busy = false;
    this.events.emit("change", { source: "history" });
    this.events.emit("selectionChange", undefined);
    return true;
  }

  redo(): boolean {
    const step = this.history.popRedo();
    if (!step) {
      return false;
    }
    this.busy = true;
    let { doc } = this.state;
    let selection = this.state.selection;
    for (const op of step.ops) {
      const result = applyOperation(doc, selection, op);
      doc = result.doc;
      selection = result.selection;
    }
    this.state = {
      doc,
      selection: step.selectionAfter,
      storedMarks: step.storedMarksAfter,
    };
    this.renderer.render(this.state.doc, this.state.selection);
    this.busy = false;
    this.events.emit("change", { source: "history" });
    this.events.emit("selectionChange", undefined);
    return true;
  }

  dispatch(mutate: (tr: Transform) => Transform, options: DispatchOptions = {}): boolean {
    if (this.destroyed) {
      return false;
    }
    const tr = new Transform(this.state);
    mutate(tr);
    if (tr.ops.length === 0) {
      const changed = tr.storedMarks !== this.state.storedMarks;
      this.state.storedMarks = tr.storedMarks;
      if (changed) {
        this.events.emit("selectionChange", undefined);
      }
      return changed;
    }
    const selectionBefore = this.state.selection;
    const storedBefore = this.state.storedMarks;
    this.busy = true;
    this.state = {
      doc: tr.doc,
      selection: tr.selection,
      storedMarks: tr.storedMarks,
    };
    if (options.history !== false) {
      this.history.push({
        ops: tr.ops,
        inverses: tr.inverses,
        selectionBefore,
        selectionAfter: tr.selection,
        storedMarksBefore: storedBefore,
        storedMarksAfter: tr.storedMarks,
        time: Date.now(),
        kind: options.kind ?? "other",
      });
    }
    this.renderer.render(this.state.doc, this.state.selection);
    this.busy = false;
    this.events.emit("change", { source: options.source ?? "user" });
    this.events.emit("selectionChange", undefined);
    return true;
  }

  exec(name: string, args?: CommandArgs): boolean {
    return this.commands.execute(name, this, args);
  }

  registerPlugin(plugin: OraPlugin): void {
    this.plugins.register(plugin);
    this.plugins.setupOne(this, plugin);
    this.events.emit("pluginLoaded", { id: plugin.id });
  }

  on<K extends OraEventType>(type: K, handler: EventHandler<K>): () => void {
    return this.events.on(type, handler);
  }

  off<K extends OraEventType>(type: K, handler: EventHandler<K>): void {
    this.events.off(type, handler);
  }

  getSelection(): Selection {
    return this.state.selection;
  }

  getActiveMarks(): OraMark[] {
    if (this.state.storedMarks) {
      return this.state.storedMarks;
    }
    if (!isTextSelection(this.state.selection)) {
      return [];
    }
    if (isCollapsed(this.state.selection)) {
      return activeMarksAt(this.state.doc, this.state.selection.anchor);
    }
    const { start, end } = selectionEdges(this.state.selection);
    const paths = textPathsInRange(this.state.doc, start, end);
    if (paths.length === 0) {
      return [];
    }
    const first = getNode(this.state.doc, paths[0] as number[]);
    const marks = isText(first) ? (first.marks ?? []) : [];
    return marks.filter((mark) =>
      paths.every((path) => {
        const node = getNode(this.state.doc, path);
        return isText(node) && hasMark(node.marks, mark.type);
      }),
    );
  }

  getCurrentBlock(): { type: string; attrs?: Record<string, unknown> } {
    const index =
      this.state.selection.type === "node"
        ? (this.state.selection.path[0] ?? 0)
        : isTextSelection(this.state.selection)
          ? (this.state.selection.anchor.path[0] ?? 0)
          : 0;
    const block = this.state.doc.content[index];
    if (!block || isText(block)) {
      return { type: "paragraph" };
    }
    return { type: block.type, attrs: block.attrs };
  }

  setNodeSelection(path: number[]): void {
    this.state.selection = { type: "node", path };
    this.state.storedMarks = null;
    this.events.emit("selectionChange", undefined);
  }

  async insertImageFile(file: File, source: "button" | "drop" | "clipboard" = "button"): Promise<void> {
    const invalid = validateImageFile(file);
    if (invalid) {
      this.events.emit("imageUploadError", { error: new Error(invalid) });
      return;
    }
    this.events.emit("imageUploadStart", { file });
    try {
      const upload = this.options.uploadImage ?? blobUploadAdapter.uploadImage;
      const asset = await upload(file, { source });
      this.exec("insertImage", {
        src: asset.url,
        alt: asset.alt ?? file.name,
        width: asset.width,
        height: asset.height,
      });
      this.events.emit("imageUploadSuccess", { url: asset.url });
    } catch (error) {
      this.events.emit("imageUploadError", { error: error instanceof Error ? error : new Error(String(error)) });
    }
  }

  async openLibrary(type: "image" | "video" | "audio" = "image"): Promise<void> {
    const open = this.options.openMediaLibrary;
    if (!open) {
      return;
    }
    const items = await open({ multiple: true, types: [type] });
    for (const item of items ?? []) {
      if (item.type === "video") {
        this.exec("insertVideo", { src: item.url, title: item.title });
      } else if (item.type === "audio") {
        this.exec("insertAudio", { src: item.url, title: item.title });
      } else {
        this.exec("insertImage", { src: item.url, alt: item.alt, title: item.title });
      }
    }
  }

  async runAI(op: AICapability, language?: string): Promise<void> {
    const provider = this.ai.active();
    if (!provider || provider.enabled === false) {
      return;
    }
    const selected = extractAIFragments(this, "selection");
    const fragments = selected.length > 0 ? selected : extractAIFragments(this, "document");
    if (fragments.length === 0) {
      return;
    }
    this.events.emit("aiRequestStart", { op });
    try {
      const response = await provider.transform({
        op,
        scope: selected.length > 0 ? "selection" : "document",
        fragments,
        language,
      });
      this.dispatch((tr) => {
        for (const patch of response.patches) {
          tr.replaceTextAt(patch.path, patch.text);
        }
        return tr;
      }, { kind: "other", source: "api" });
      this.events.emit("aiRequestSuccess", { op });
    } catch (error) {
      this.events.emit("aiRequestError", { op, error: error instanceof Error ? error : new Error(String(error)) });
    }
  }

  hasMark(type: OraMark["type"]): boolean {
    return this.getActiveMarks().some((mark) => mark.type === type);
  }

  selectActiveLink(): boolean {
    const range = linkRangeAt(this.state.doc, this.state.selection);
    if (!range) {
      return false;
    }
    this.state.selection = { type: "text", anchor: range.start, focus: range.end };
    this.state.storedMarks = null;
    this.renderer.applySelection(this.state.selection);
    this.events.emit("selectionChange", undefined);
    return true;
  }

  syncSelectionFromDom(): void {
    const next = this.renderer.selectionFromDom();
    if (next) {
      this.state.selection = next;
    }
  }

  setSelectionFromDom(selection: TextSelection): void {
    this.state.selection = selection;
    this.state.storedMarks = null;
    this.events.emit("selectionChange", undefined);
  }

  readDomSelection(): TextSelection | null {
    return this.renderer.selectionFromDom();
  }

  renderFromModel(): void {
    this.renderer.render(this.state.doc, this.state.selection);
  }

  isBusy(): boolean {
    return this.busy;
  }

  emitFocus(): void {
    this.events.emit("focus", undefined);
  }

  emitBlur(): void {
    this.events.emit("blur", undefined);
  }

  insertHTML(html: string): void {
    const parsed = fromHTML(cleanPastedHtml(html));
    this.dispatch((tr) => tr.insertFragment(parsed), { kind: "other" });
  }

  getSelectedText(): string {
    const selection = this.state.selection;
    if (!isTextSelection(selection) || isCollapsed(selection)) {
      return "";
    }
    const { start, end } = selectionEdges(selection);
    if (pathEquals(start.path, end.path)) {
      const node = getNode(this.state.doc, start.path);
      return isText(node) ? node.text.slice(start.offset, end.offset) : "";
    }
    const paths = textPathsInRange(this.state.doc, start, end);
    return paths
      .map((path, index) => {
        const node = getNode(this.state.doc, path);
        if (!isText(node)) {
          return "";
        }
        if (index === 0) {
          return node.text.slice(start.offset);
        }
        if (index === paths.length - 1) {
          return node.text.slice(0, end.offset);
        }
        return node.text;
      })
      .join("");
  }

  getSelectedHTML(): string {
    const selection = this.state.selection;
    if (!isTextSelection(selection) || isCollapsed(selection)) {
      return "";
    }
    return selectedHTML(this.state.doc, selection);
  }

  toggleFullscreen(): void {
    this.host.classList.toggle("ora-editor--fullscreen");
  }

  isFullscreen(): boolean {
    return this.host.classList.contains("ora-editor--fullscreen");
  }

  t(key: OraMessageKey, vars?: Record<string, string | number>): string {
    return translate(this.locale, key, vars);
  }

  setLocale(locale: string): void {
    this.locale = resolveLocale(locale);
    this.host.lang = this.locale;
    this.renderer.setHeaderLabel(this.t("toggleHeaderRow"));
    if (!this.options.placeholder) {
      this.renderer.setPlaceholder(this.t("placeholder"));
      this.renderer.render(this.state.doc, this.state.selection);
    } else {
      this.renderer.render(this.state.doc, this.state.selection);
    }
    this.refreshToolbar();
    this.refreshFindBar();
    this.refreshStatusBar();
    this.refreshAIPanel();
  }

  getMarkValue(type: "fontSize" | "fontFamily" | "color" | "background"): string | undefined {
    const mark = this.getActiveMarks().find((item) => item.type === type);
    return mark && "value" in mark ? mark.value : undefined;
  }

  getStats(): ReturnType<typeof documentStats> {
    return documentStats(this.state.doc);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.unbindInput();
    this.unbindToolbar?.();
    this.unbindFind?.();
    this.unbindStatus?.();
    this.unbindAI?.();
    this.plugins.destroy();
    this.renderer.destroy();
    this.root.remove();
    this.host.classList.remove("ora-editor", "ora-editor--fullscreen");
    this.events.emit("destroy", undefined);
    this.events.clear();
  }
}

function resolveElement(element: string | HTMLElement): HTMLElement {
  if (typeof element === "string") {
    const found = document.querySelector<HTMLElement>(element);
    if (!found) {
      throw new Error(`OraEditor : élément introuvable (${element}).`);
    }
    return found;
  }
  return element;
}

function resolveContent(content?: OraDocument | string): OraDocument {
  if (!content) {
    return createEmptyDocument();
  }
  if (typeof content === "string") {
    return fromHTML(content);
  }
  return fromJSON(content);
}
