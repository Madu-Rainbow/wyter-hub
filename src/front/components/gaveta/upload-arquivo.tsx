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

  async function enviar(file: File): Promise<boolean> {
    if (file.size === 0 || file.size > LIMITE) {
      setMensagem(`"${file.name}" deve ter entre 1 byte e 25 MB.`);
      return false;
    }
    if (!TIPOS.has(file.type)) {
      setMensagem(`"${file.name}" tem um tipo de arquivo não permitido.`);
      return false;
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
      return false;
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
      setBusy(false);
      return false;
    }
    const { error: versaoError } = await sb.from("gaveta_versao").insert({
      arquivo_id: arquivoId,
      numero: 1,
      storage_path: path,
      tamanho: file.size,
      criado_por: pessoaId,
    });
    if (versaoError) {
      await sb.from("gaveta_arquivo").delete().eq("id", arquivoId);
      await sb.storage.from("gaveta").remove([path]);
      setMensagem(versaoError.message);
      setBusy(false);
      return false;
    } else {
      return true;
    }
  }

  async function enviarArquivos(files: FileList) {
    setMensagem("");
    setBusy(true);
    let enviados = 0;
    for (const file of Array.from(files)) {
      if (await enviar(file)) enviados++;
    }
    setBusy(false);
    if (enviados > 0) {
      setMensagem(`${enviados} arquivo(s) enviado(s).`);
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple
        onChange={(event) => {
          if (event.target.files?.length) void enviarArquivos(event.target.files);
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
