export type OraEventType =
  | "ready"
  | "change"
  | "focus"
  | "blur"
  | "selectionChange"
  | "destroy"
  | "imageUploadStart"
  | "imageUploadSuccess"
  | "imageUploadError"
  | "aiRequestStart"
  | "aiRequestSuccess"
  | "aiRequestError"
  | "pluginLoaded"
  | "fileUploadStart"
  | "fileUploadSuccess"
  | "fileUploadError"
  | "mentionQuery";

export type OraEventMap = {
  ready: { editor: unknown };
  change: { source: "user" | "api" | "history" };
  focus: undefined;
  blur: undefined;
  selectionChange: undefined;
  destroy: undefined;
  imageUploadStart: { file: File };
  imageUploadSuccess: { url: string };
  imageUploadError: { error: Error };
  aiRequestStart: { op: string };
  aiRequestSuccess: { op: string };
  aiRequestError: { op: string; error: Error };
  pluginLoaded: { id: string };
  fileUploadStart: { file: File };
  fileUploadSuccess: { url: string };
  fileUploadError: { error: Error };
  mentionQuery: { query: string };
};

export type EventHandler<K extends OraEventType> = (payload: OraEventMap[K]) => void;

export class EventBus {
  private listeners = new Map<OraEventType, Set<EventHandler<OraEventType>>>();

  on<K extends OraEventType>(type: K, handler: EventHandler<K>): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(handler as EventHandler<OraEventType>);
    this.listeners.set(type, set);
    return () => this.off(type, handler);
  }

  off<K extends OraEventType>(type: K, handler: EventHandler<K>): void {
    this.listeners.get(type)?.delete(handler as EventHandler<OraEventType>);
  }

  emit<K extends OraEventType>(type: K, payload: OraEventMap[K]): void {
    const set = this.listeners.get(type);
    if (!set) {
      return;
    }
    for (const handler of set) {
      (handler as EventHandler<K>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
