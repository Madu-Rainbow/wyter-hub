"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";

export type Cidade = {
  key: string; // "Cidade/UF" (valor da dimensão)
  lat: number;
  lng: number;
  n: number;
  valor: number | null;
};

/** Enquadra só as cidades visíveis; reenquadra quando elas mudam. */
function Enquadrar({ cidades }: { cidades: Cidade[] }) {
  const map = useMap();
  const chave = cidades.map((c) => `${c.key}:${c.lat}:${c.lng}`).join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `chave` resume `cidades`
  useEffect(() => {
    if (!cidades.length) return;
    if (cidades.length === 1) map.setView([cidades[0].lat, cidades[0].lng], 10);
    else
      map.fitBounds(L.latLngBounds(cidades.map((c) => [c.lat, c.lng] as [number, number])), {
        padding: [36, 36],
        maxZoom: 11,
      });
  }, [chave, map]);
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function MapaClientes({
  cidades,
  selecionados,
  onToggle,
  fmtValor,
}: {
  cidades: Cidade[];
  selecionados: string[];
  onToggle: (key: string, multi: boolean) => void;
  fmtValor: (n: number) => string;
}) {
  // Monta só após o efeito: evita "Map container is being reused" no StrictMode/HMR.
  const [pronto, setPronto] = useState(false);
  useEffect(() => setPronto(true), []);
  const max = Math.max(1, ...cidades.map((c) => c.n));
  const algum = selecionados.length > 0;
  if (!pronto) return null;
  return (
    <MapContainer
      center={[-15.6, -56.1]}
      zoom={5}
      className="size-full rounded"
      scrollWheelZoom={false}
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Enquadrar cidades={cidades} />
      {cidades.map((c) => {
        const on = selecionados.includes(c.key);
        return (
          <CircleMarker
            key={c.key}
            center={[c.lat, c.lng]}
            radius={8 + 16 * Math.sqrt(c.n / max)}
            pathOptions={{
              color: on ? "#0e1726" : "#ffffff",
              weight: on ? 3 : 2,
              fillColor: "#2a78d6",
              fillOpacity: algum && !on ? 0.3 : 0.8,
            }}
            eventHandlers={{
              click: (e) => {
                const o = e.originalEvent;
                onToggle(c.key, o.ctrlKey || o.shiftKey || o.metaKey);
              },
            }}
          >
            <Tooltip>
              {c.key}: {c.n} {c.n === 1 ? "cliente" : "clientes"}
              {c.valor != null ? ` · ${fmtValor(c.valor)}` : ""}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
