"use client";

import { createClient } from "@front/lib/supabase/client";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Progresso } from "./progresso";
import { type ProjetoItem, STATUS_PROJETO } from "./tipos";

export function ProjetosKanban({ projetos }: { projetos: ProjetoItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setOptimistic] = useOptimistic(projetos, (st, u: { id: string; status: string }) =>
    st.map((p) => (p.id === u.id ? { ...p, status: u.status } : p)),
  );

  function onDragEnd(r: DropResult) {
    if (!r.destination) return;
    const status = r.destination.droppableId;
    const id = r.draggableId;
    if (itens.find((p) => p.id === id)?.status === status) return;
    start(async () => {
      setOptimistic({ id, status });
      const { error } = await createClient()
        .from("projeto")
        .update({ status: status as never })
        .eq("id", id);
      setErro(error ? `Não foi possível mover o projeto: ${error.message}` : null);
      router.refresh();
    });
  }

  return (
    <>
      {erro && (
        <p role="alert" className="mb-2 text-sm text-danger">
          {erro}
        </p>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={`flex gap-3 overflow-x-auto pb-4 ${pending ? "opacity-70" : ""}`}>
          {STATUS_PROJETO.map(([key, label]) => {
            const col = itens.filter((p) => p.status === key);
            return (
              <Droppable key={key} droppableId={key}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.droppableProps}
                    className={`w-64 shrink-0 rounded-md p-2 transition-colors ${snap.isDraggingOver ? "bg-accent/5" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
                        {label}
                      </h3>
                      <span className="text-xs text-text-muted">{col.length}</span>
                    </div>
                    <div className="min-h-[60px] space-y-2">
                      {col.map((p, i) => (
                        <Draggable key={p.id} draggableId={p.id} index={i}>
                          {(d, ds) => (
                            <div
                              ref={d.innerRef}
                              {...d.draggableProps}
                              {...d.dragHandleProps}
                              className={`rounded-md border border-border bg-surface p-3 ${ds.isDragging ? "shadow-md" : ""}`}
                            >
                              <Link
                                href={`/projetos/${p.id}`}
                                className="text-sm font-medium text-text hover:text-accent"
                              >
                                {p.nome}
                              </Link>
                              <p className="mt-0.5 text-xs text-text-muted">{p.cliente}</p>
                              <div className="mt-2">
                                <Progresso feitas={p.feitas} total={p.total} />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {prov.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </>
  );
}
