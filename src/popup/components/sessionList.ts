import { escapeHtml } from "@popup/utils/dom";
import { ActiveSessions, SessionData } from "@shared/types";

export class SessionList {
  private container: HTMLElement;
  private onSessionClick?: (sessionId: string) => void;
  private onRenameClick?: (sessionId: string) => void;
  private onDeleteClick?: (sessionId: string) => void;
  private onReorder?: (sessionIds: string[]) => void;
  private draggedElement: HTMLElement | null = null;
  private draggedOverElement: HTMLElement | null = null;

  // SVG icons (inline, no emoji)
  private readonly dragIcon =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><line x1="9" y1="6" x2="15" y2="6"></line><line x1="9" y1="12" x2="15" y2="12"></line><line x1="9" y1="18" x2="15" y2="18"></line></svg>';
  private readonly renameIcon =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5a2.121 2.121 0 0 1 3 3z"></path></svg>';
  private readonly deleteIcon =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  private readonly emptyIcon =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>';

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.addEventListener("click", this.handleClick.bind(this));
    this.container.addEventListener("dragstart", this.handleDragStart.bind(this));
    this.container.addEventListener("dragover", this.handleDragOver.bind(this));
    this.container.addEventListener("drop", this.handleDrop.bind(this));
    this.container.addEventListener("dragend", this.handleDragEnd.bind(this));
    this.container.addEventListener("dragenter", this.handleDragEnter.bind(this));
    this.container.addEventListener("dragleave", this.handleDragLeave.bind(this));
  }

  setEventHandlers(handlers: {
    onSessionClick?: (sessionId: string) => void;
    onRenameClick?: (sessionId: string) => void;
    onDeleteClick?: (sessionId: string) => void;
    onReorder?: (sessionIds: string[]) => void;
  }): void {
    this.onSessionClick = handlers.onSessionClick;
    this.onRenameClick = handlers.onRenameClick;
    this.onDeleteClick = handlers.onDeleteClick;
    this.onReorder = handlers.onReorder;
  }

  render(sessions: SessionData[], activeSessions: ActiveSessions, currentDomain: string): void {
    const domainSessions = sessions
      .filter((s) => s.domain === currentDomain)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const activeSessionId = activeSessions[currentDomain];

    if (domainSessions.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.renderSessions(domainSessions, activeSessionId);
  }

  private renderEmptyState(): void {
    this.container.innerHTML = `
      <div class="no-sessions" aria-hidden="true">
        ${this.emptyIcon}
        <span class="no-sessions-text">No sessions saved for this site</span>
      </div>
    `;
  }

  private renderSessions(sessions: SessionData[], activeSessionId?: string): void {
    const sessionsHtml = sessions
      .map((session, index) => {
        const isActive = session.id === activeSessionId;
        const order = index + 1;

        return `
          <div class="session-row ${isActive ? "active" : ""}"
               data-session-id="${escapeHtml(session.id)}"
               draggable="true"
               role="listitem"
               ${isActive ? 'aria-current="true"' : ""}>
            <button class="drag-handle" aria-label="Drag to reorder" type="button">
              ${this.dragIcon}
            </button>
            <div class="session-info">
              <div class="session-name">${escapeHtml(session.name)}</div>
              <div class="session-meta">
                <span class="session-domain">${escapeHtml(session.domain)}</span>
                <span class="session-order" aria-label="Order">#${order}</span>
              </div>
            </div>
            <div class="session-actions">
              <button class="session-btn" data-action="rename" data-session-id="${escapeHtml(session.id)}" aria-label="Rename session">
                ${this.renameIcon}
              </button>
              <button class="session-btn delete" data-action="delete" data-session-id="${escapeHtml(session.id)}" aria-label="Delete session">
                ${this.deleteIcon}
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    this.container.innerHTML = sessionsHtml;
  }

  private handleClick(e: Event): void {
    const target = e.target as HTMLElement;

    // Handle action buttons (rename/delete)
    const actionBtn = target.closest(".session-btn");
    if (actionBtn) {
      e.stopPropagation();
      const action = actionBtn.dataset.action;
      const sessionId = actionBtn.dataset.sessionId;

      if (!sessionId) return;

      if (action === "rename" && this.onRenameClick) {
        this.onRenameClick(sessionId);
      } else if (action === "delete" && this.onDeleteClick) {
        this.onDeleteClick(sessionId);
      }
      return;
    }

    // Handle drag handle - don't trigger session switch
    if (target.closest(".drag-handle")) {
      return;
    }

    // Handle session switching (click on row)
    const sessionRow = target.closest(".session-row") as HTMLElement;
    if (sessionRow && this.onSessionClick) {
      const sessionId = sessionRow.dataset.sessionId;
      if (sessionId) {
        this.onSessionClick(sessionId);
      }
    }
  }

  private handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement;
    const sessionRow = target.closest(".session-row") as HTMLElement;
    if (sessionRow) {
      this.draggedElement = sessionRow;
      sessionRow.classList.add("dragging");
      e.dataTransfer!.effectAllowed = "move";
      e.dataTransfer!.setData("text/plain", sessionRow.dataset.sessionId || "");
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
  }

  private handleDragEnter(e: DragEvent): void {
    const target = (e.target as HTMLElement).closest(".session-row") as HTMLElement;
    if (target && target !== this.draggedElement) {
      if (this.draggedOverElement && this.draggedOverElement !== target) {
        this.draggedOverElement.classList.remove("drag-over");
      }
      target.classList.add("drag-over");
      this.draggedOverElement = target;
    }
  }

  private handleDragLeave(e: DragEvent): void {
    const target = (e.target as HTMLElement).closest(".session-row") as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;

    if (target && relatedTarget) {
      const leavingToOutside = !target.contains(relatedTarget);
      if (leavingToOutside && target === this.draggedOverElement) {
        target.classList.remove("drag-over");
        this.draggedOverElement = null;
      }
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const target = (e.target as HTMLElement).closest(".session-row") as HTMLElement;

    if (target && this.draggedElement && target !== this.draggedElement) {
      const allItems = Array.from(this.container.querySelectorAll(".session-row")) as HTMLElement[];
      const draggedIndex = allItems.indexOf(this.draggedElement);
      const targetIndex = allItems.indexOf(target);

      if (draggedIndex < targetIndex) {
        target.after(this.draggedElement);
      } else {
        target.before(this.draggedElement);
      }

      const reorderedIds = Array.from(this.container.querySelectorAll(".session-row")).map(
        (item) => (item as HTMLElement).dataset.sessionId!
      );

      if (this.onReorder) {
        this.onReorder(reorderedIds);
      }
    }
  }

  private handleDragEnd(e: DragEvent): void {
    const target = e.target as HTMLElement;
    const sessionRow = target.closest(".session-row") as HTMLElement;
    if (sessionRow) {
      sessionRow.classList.remove("dragging");
    }

    const allItems = this.container.querySelectorAll(".session-row");
    allItems.forEach((item) => item.classList.remove("drag-over"));

    this.draggedElement = null;
    this.draggedOverElement = null;
  }
}
