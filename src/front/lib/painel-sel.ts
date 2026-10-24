export type Dim = "status" | "prio" | "pessoa" | "sem" | "pst" | "sit";
export type Sel = Partial<Record<Dim, string[]>>;

export const DIMS: Dim[] = ["status", "prio", "pessoa", "sem", "pst", "sit"];
export const PARAM: Record<Dim, string> = {
  status: "f_status",
  prio: "f_prio",
  pessoa: "f_pessoa",
  sem: "f_sem",
  pst: "f_pst",
  sit: "f_sit",
};

export function selDeParams(sp: Record<string, string | undefined>): Sel {
  const s: Sel = {};
  for (const d of DIMS) {
    const v = sp[PARAM[d]];
    if (v) s[d] = v.split(",").filter(Boolean);
  }
  return s;
}
