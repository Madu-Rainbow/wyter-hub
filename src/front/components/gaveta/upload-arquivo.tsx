"use client";

import { Button } from "@front/components/ui/button";
import { createClient } from "@front/lib/supabase/client";
import { useRef, useState } from "react";

const TIPOS = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const LIMITE = 25 * 1024 * 1024;

export function UploadArquivo({
  orgId,
  clienteId,
  pessoaId,
  pastaId,
}: {
  orgId: string;
  clienteId: string;
  pessoaId: string;
  pastaId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function enviar(file: File) {
    setMensagem("");
    if (file.size === 0 || file.size > LIMITE) {
      setMensagem("O arquivo deve ter entre 1 byte e 25 MB.");
      return;
    }
    if (!TIPOS.has(file.type)) {
      setMensagem("Tipo de arquivo não permitido.");
      return;
    }
    setBusy(true);
    const sb = createClient();
    const arquivoId = crypto.randomUUID();
    const nomeSeguro = file.name.replace(/[^\w.-]+/g, "_").slice(0, 180) || "arquivo";
    const path = `${orgId}/${clienteId}/${pastaId}/${arquivoId}/${nomeSeguro}`;
    const upload = await sb.storage.from("gaveta").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) {
      setBusy(false);
      setMensagem(upload.error.message);
      return;
    }
    const { error } = await sb.from("gaveta_arquivo").insert({
      id: arquivoId,
      org_id: orgId,
      cliente_id: clienteId,
      pasta_id: pastaId,
      nome: file.name,
      tipo_mime: file.type,
      tamanho: file.size,
      storage_path: path,
      criado_por: pessoaId,
    });
    if (error) {
      await sb.storage.from("gaveta").remove([path]);
      setMensagem(error.message);
    } else {
      setMensagem("Arquivo enviado.");
      window.location.reload();
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void enviar(file);
          event.target.value = "";
        }}
      />
      <Button type="button" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
        Enviar arquivo
      </Button>
      {mensagem && <span className="text-xs text-text-muted">{mensagem}</span>}
    </div>
  );
}
