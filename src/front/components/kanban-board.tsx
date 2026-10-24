"use client";

import { AdicaoRapida } from "@front/components/tarefas/adicao-rapida";
import { useCapaUrls } from "@front/components/tarefas/capa";
import type { Grupo, Tarefa } from "@front/components/tarefas/shared";
import { prioridadeBorder, TarefaCard } from "@front/components/tarefas/tarefa-card";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";

export function KanbanBoard({
  grupos,
  readOnly,
  bloqueadas,
  onOpen,
  onMove,
  onCreate,
}: {
  grupos: Grupo[];
  readOnly: boolean;
  bloqueadas: Set<string>;
  onOpen: (t: Tarefa) => void;
  onMove: (id: string, destino: string) => void;
  onCreate: (titulo: string, grupoKey: string) => void;
}) {
  const capas = useCapaUrls(grupos.flatMap((g) => g.items));

  function onDragEnd(r: DropResult) {
    if (!r.destination || r.destination.droppableId === r.source.droppableId) return;
    onMove(r.draggableId, r.destination.droppableId);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex max-h-[calc(100dvh-14rem)] min-h-64 gap-3 overflow-x-auto pb-2">
        {grupos.map((col) => (
          <Droppable key={col.key} droppableId={col.key}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex min-h-0 w-[clamp(15rem,22vw,20rem)] shrink-0 flex-col rounded-md p-2 transition-colors ${snapshot.isDraggingOver ? "bg-accent/5" : "bg-secondary/40"}`}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {col.label}
                  </h3>
                  <span className="text-xs tabular-nums text-text-muted">{col.items.length}</span>
                </div>
                <div className="min-h-[40px] flex-1 space-y-2 overflow-y-auto">
                  {col.items.map((t, idx) => (
                    <Draggable key={t.id} draggableId={t.id} index={idx} isDragDisabled={readOnly}>
                      {(prov, snap) => (
                        // biome-ignore lint/a11y/noStaticElementInteractions: role e tabIndex vem de dragHandleProps
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          onClick={() => onOpen(t)}
                          onKeyDown={(e) => e.key === "Enter" && onOpen(t)}
                          className={`cursor-pointer rounded-md border border-border border-l-4 bg-surface p-3 hover:border-accent/40 ${prioridadeBorder[t.prioridade] ?? "border-l-slate-300"} ${snap.isDragging ? "shadow-md" : ""}`}
                        >
                          <TarefaCard
                            t={t}
                            bloqueada={bloqueadas.has(t.id)}
                            capaUrl={t.capa ? capas[t.capa.path] : undefined}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
                {!readOnly && <AdicaoRapida onAdd={(titulo) => onCreate(titulo, col.key)} />}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
