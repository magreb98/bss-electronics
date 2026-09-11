# BSS POS — Frontend (your-friendly-assistant)

Ce fichier est lu automatiquement avant chaque action. Il consigne l'état du projet, les décisions d'architecture, et chaque modification apportée.

---

## Contexte du projet

Application POS (Point of Sale) React pour les boutiques BSS. Interface utilisée par les vendeurs en boutique.

**Stack :** React 19 + TanStack Start/Router + TanStack Query v5 + shadcn/ui + Tailwind CSS 4 + Vite PWA  
**Backend :** Laravel 13 sur `localhost:8000`, proxié via Vite (`/commerce/*`, `/electronics/*`)  
**Auth :** Bearer token JWT stocké dans `localStorage` sous la clé `bss_pos_token`  
**Devise :** XAF (Franc CFA) — utiliser `formatXAF()` de `src/lib/format.ts`  
**Langue :** Interface en français, code en anglais

---

## Architecture & conventions

### Appels API
- Client Axios configuré dans `src/lib/api.ts` avec intercepteurs auth + erreurs
- Fonction `request<T>(path, options)` : retourne directement `res.data` (corps complet)
- Les réponses backend ont toujours la forme `{ data: T }` → extraire avec `.then(r => r.data)`
- `fetchOrDemo(path, fallback)` : retombe sur données demo si backend absent — **à éviter pour les nouvelles pages**
- Utiliser `useQuery` de `@tanstack/react-query` directement pour les nouvelles pages

### Types
- Types frontend (UI) dans `src/lib/types.ts`
- Types backend bruts préfixés `Backend*` (ex: `BackendProduct`, `BackendInvoice`)
- Adaptateurs dans `src/lib/adapters.ts` pour transformer backend → frontend

### Composants clés
- `KpiCard` (`src/components/kpi-card.tsx`) : props `label`, `value` (string), `hint?`, `icon` (LucideIcon)
- `PageHeader` / `PageBody` (`src/components/page-header.tsx`)
- Tous les composants UI shadcn dans `src/components/ui/`

### États de chargement (convention)
- KPI cards : passer `"…"` comme `value` pendant le chargement
- Tables : une ligne `<LoadingRow cols={N} />` pendant le chargement
- Tables vides : une ligne `<EmptyRow cols={N} />` si le tableau backend est vide

---

## Journal des modifications

### [2026-09-10] Rapports — remplacement données demo → backend réel

**Fichier modifié :** `src/routes/_auth/rapports.tsx`

**Avant :** Page entièrement basée sur `demoProducts`, `demoCustomers`, `demoDashboard` de `src/lib/demo.ts`. Aucun appel API réel.

**Après :** 5 appels `useQuery` vers les vrais endpoints backend :

| Query key | Endpoint | Données |
|---|---|---|
| `reports-dashboard` | `GET /commerce/dashboard?from&to` | CA TTC, nb ventes, breakdown by_pos |
| `reports-margin` | `GET /commerce/reports/margin?from&to` | CA HT, TVA collectée, CA TTC |
| `reports-top-products` | `GET /commerce/reports/top-products?from&to&limit=15` | Top produits par CA |
| `reports-customers` | `GET /commerce/reports/customer-ranking?from&to&limit=15` | Classement clients par dépense |
| `reports-stock-rotation` | `GET /commerce/reports/stock-rotation?from&to&limit=20` | Produits les plus écoulés |

**Changements structurels :**
- Ajout d'un filtre de période `from` / `to` (date pickers dans le header, défaut : 30 derniers jours)
- Toutes les queries se rafraîchissent automatiquement quand la période change
- `staleTime: 5 * 60_000` sur toutes les queries rapports

**Nouveaux onglets :**
- "Par caisse" (ex "Ventes") → CA HT + TVA + bar chart + tableau par point de vente
- "Top produits" (ex "Marges") → bar chart horizontal + tableau top 15 par CA réel
- "Clients" → classement réel avec `visit_count` et panier moyen
- "Rotation stock" → `units_sold` réels par produit

**Format réponse backend :**
- `dashboard` → `{ total_sale_count, total_excluding_tax, total_tax, total_including_tax, is_provisional, by_pos[] }`
- `margin` → `{ total_ht, total_tax, total_ttc, sale_count }` (agrégat, pas par produit)
- `top-products` → `[{ id, label, reference, total_quantity, total_revenue }]`
- `customer-ranking` → `[{ id, name, phone, visit_count, total_spent }]`
- `stock-rotation` → `[{ id, label, reference, point_of_sale_id, units_sold }]`

**Note :** Le endpoint `/commerce/reports/margin` donne un résumé fiscal (HT/TVA/TTC), pas une marge bénéficiaire produit par produit. Il n'y a pas d'endpoint backend pour les marges par produit pour l'instant.

---

## Audit de cohérence — [2026-09-10]

### CATALOGUE (`catalogue.index.tsx`, `catalogue.$id.tsx`)

**Formulaire création :** Cohérent avec le backend (`label`, `reference`, `family_id`, `selling_price`, `vat_rate`, `granularity`). ✅

**Formulaire édition :** Envoie `cost_price` et `min_stock` que le backend **ignore silencieusement** — ces champs n'existent pas dans le modèle `Product` backend. À clarifier : `cost_price` est peut-être sur un autre modèle, `min_stock` vient de `StockLevel.minimum_quantity`.

**À ne pas faire :** envoyer `cost_price`/`min_stock` dans `PUT /commerce/products/{id}` — le backend ne les persiste pas.

**Manques frontend :** pas d'UI pour `attributes` (champ JSON libre du produit).

---

### STOCK (`stock.tsx`)

**`/commerce/stock` retourne `StockLevel[]`** (`point_of_sale_id`, `product_id`, `quantity`, `minimum_quantity`) — pas des `Product[]`. L'adaptation doit joindre les deux.

**`/commerce/stock/alerts` non appelé.** Le frontend calcule les alertes côté client. Utiliser l'endpoint backend à la place.

**Inventaire physique absent.** Le backend a `POST /commerce/inventory-counts` — aucune UI.

---

### FOURNISSEURS (`fournisseurs.tsx`, `fournisseurs.$id.tsx`, `fournisseurs.commandes.$id.tsx`)

**CRITIQUE — `phone` et `city` absents du modèle `Supplier` backend.** Le frontend les affiche et les envoie mais ils ne sont jamais persistés. Décision à prendre : ajouter une migration backend ou retirer ces champs du frontend.

**`balance` affiché sans source API.** Le modèle `Supplier` n'expose pas de solde dû. À implémenter en backend ou retirer de l'affichage.

**Création de commande fournisseur absente.** `POST /commerce/supplier-orders` requiert `{ supplier_id, lines[]: { product_id, quantity, unit_cost } }` — aucun formulaire dans le frontend.

---

### TRANSFERTS (`transferts.tsx`)

**Module le plus cohérent.** Formulaire de création complet, dispatch et réception fonctionnels, mapping des statuts correct.

**Seul manque :** statut `cancelled` existe backend, aucun bouton d'annulation ni filtre dans le frontend.

---

### PROMOTIONS (`promotions.tsx`)

**`GET /commerce/promotions/validate-coupon` jamais appelé.** La caisse n'intègre pas la validation coupon.

**`cumulative` absent de tous les formulaires.** Le champ existe en backend, l'UI ne permet pas de le définir.

**`scope_id` toujours `null`.** Impossible de lier une promo à un produit ou une famille spécifique depuis le frontend — toutes les promos sont globales.

---

## Lacunes connues (à implémenter)

### Bloquants / Incohérences de données

- **Catalogue `cost_price` / `min_stock`** — clarifier la source backend avant toute modif du formulaire d'édition
- **Fournisseur `phone` / `city`** — migration backend à ajouter ou champs à retirer du frontend
- **Fournisseur `balance`** — implémenter en backend ou retirer de l'affichage

### Fonctionnalités manquantes (par priorité)

1. **Retours/Remboursements** — `POST /commerce/sales/{id}/returns` — aucun UI
2. **Validation coupon en caisse** — `GET /commerce/promotions/validate-coupon` — non appelé
3. **Création commande fournisseur** — `POST /commerce/supplier-orders` — aucun UI
4. **Reçus PDF** — `GET /commerce/sales/{id}/receipt.pdf` — non exposé
5. **Facture PDF** — `GET /commerce/invoices/{id}/invoice.pdf` — non exposé
6. **Promotions `scope_id`** — lier une promo à un produit/famille spécifique
7. **Promotions `cumulative`** — champ absent des formulaires
8. **Stock — utiliser `/stock/alerts`** au lieu du calcul client-side
9. **Inventaires physiques** — `POST /commerce/inventory-counts` — absent
10. **Historique client** — `GET /commerce/customers/{id}/sales` — absent
11. **Crédits client** — `GET /commerce/customers/{id}/credits` — absent
12. **Modifier client** — `PUT /commerce/customers/{id}` — absent
13. **Images produits** — `POST /commerce/products/{id}/images/*` — absent
14. **Variantes produits** — `GET/POST /commerce/products/{id}/variants` — absent
15. **Lots produits (batches)** — absent
16. **Annulation transfert** — statut `cancelled` backend sans UI
17. **Historique sessions caisse** — `GET /commerce/cash-sessions` — absent
18. **Admin Utilisateurs** — `/admin/utilisateurs` — squelette demo
19. **Admin Rôles** — `/admin/roles` — squelette demo
20. **Garanties électronique** — `/electronique/garanties` — page vide
21. **Devises** — `GET/POST/PUT /commerce/currencies` — absent
