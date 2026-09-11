export type Role = "vendeur" | "gerant" | "proprietaire";

/** Hiérarchie des rôles — plus le niveau est élevé, plus les permissions sont larges. */
const ROLE_LEVEL: Record<Role, number> = {
  vendeur:      1,
  gerant:       2,
  proprietaire: 3,
};

/**
 * Chaque entrée associe un préfixe de chemin au rôle minimum requis.
 * Les règles sont évaluées dans l'ordre : la première correspondance l'emporte.
 */
const ROUTE_PERMISSIONS: { prefix: string; minRole: Role }[] = [
  // Admin — propriétaire uniquement
  { prefix: "/admin",        minRole: "proprietaire" },

  // Pilotage avancé — gérant et au-dessus
  { prefix: "/rapports",     minRole: "gerant" },
  { prefix: "/parametres",   minRole: "gerant" },

  // Stock & supply chain — gérant et au-dessus
  { prefix: "/stock",        minRole: "gerant" },
  { prefix: "/fournisseurs", minRole: "gerant" },
  { prefix: "/transferts",   minRole: "gerant" },
  { prefix: "/promotions",   minRole: "gerant" },
  { prefix: "/factures",     minRole: "gerant" },
];

/** Retourne true si le rôle donné peut accéder au chemin. */
export function canAccess(role: Role | undefined | null, pathname: string): boolean {
  if (!role) return false;
  const userLevel = ROLE_LEVEL[role] ?? 0;
  for (const perm of ROUTE_PERMISSIONS) {
    if (pathname === perm.prefix || pathname.startsWith(perm.prefix + "/")) {
      return userLevel >= ROLE_LEVEL[perm.minRole];
    }
  }
  return true;
}

/** Retourne true si le rôle de l'utilisateur est au moins égal au rôle requis. */
export function hasMinRole(role: Role | undefined | null, required: Role): boolean {
  if (!role) return false;
  return (ROLE_LEVEL[role] ?? 0) >= ROLE_LEVEL[required];
}

/** Labels affichés pour chaque rôle. */
export const ROLE_LABELS: Record<Role, string> = {
  vendeur:      "Vendeur",
  gerant:       "Gérant",
  proprietaire: "Propriétaire",
};
