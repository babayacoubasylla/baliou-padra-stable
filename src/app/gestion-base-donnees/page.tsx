"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = "super_admin" | "responsable_bd" | "baliou_padra";

type Option = {
    value: string;
    label: string;
};

interface Membre {
    id: number;
    user_id: string;

    // 1. Identité et accès
    email: string | null;
    nom_complet: string | null;
    nom_soninke?: string | null;
    petit_nom?: string | null;

    // 2. Localisation et contact
    sexe: string | null;
    generation: string | null;
    ville_residence: string | null;
    quartier?: string | null;
    telephone: string | null;
    contact_urgence?: string | null;

    // 3. Filiation père
    pere_nom_civil?: string | null;
    pere_nom_soninke?: string | null;
    pere_petit_nom?: string | null;

    // 3. Filiation mère
    mere_nom_civil?: string | null;
    mere_nom_soninke?: string | null;
    mere_petit_nom?: string | null;

    // 4. Situation sociale et professionnelle
    statut_matrimonial?: string | null;
    etat_scolarisation?: string | null;
    niveau_etudes?: string | null;
    statut_professionnel?: string | null;
    domaine_activite?: string | null;

    // Administration
    role: string | null;
    statut_validation?: string | null;
    created_at: string;
    updated_at?: string | null;

    [key: string]: any;
}

// ─── Permissions ──────────────────────────────────────────────────────────────
const PERMISSIONS: Record<
    string,
    { read: boolean; edit: boolean; delete: boolean; export: boolean }
> = {
    super_admin: { read: true, edit: true, delete: true, export: true },
    responsable_bd: { read: true, edit: true, delete: true, export: true },
    baliou_padra: { read: true, edit: false, delete: false, export: true },
};

// ─── Générations fixes ────────────────────────────────────────────────────────
const GENERATIONS_FIXES: Option[] = [
    { value: "Administration", label: "Administration" },
    { value: "Gagnoa", label: "Gagnoa" },
    { value: "Abidjan", label: "Abidjan" },
    { value: "Diaspora", label: "Diaspora" },

    { value: "Génération Wassalah dramane", label: "Génération Wassalah dramane" },
    { value: "Génération Dramane konté", label: "Génération Dramane konté" },
    { value: "Génération kissima", label: "Génération kissima" },
    { value: "Génération maramou basseyabané", label: "Génération maramou basseyabané" },
    { value: "Génération khadja bah baya", label: "Génération khadja bah baya" },
    { value: "Génération antankhoulé passokhona", label: "Génération antankhoulé passokhona" },
    { value: "Génération Mamery", label: "Génération Mamery" },
    { value: "Génération makhadja baliou", label: "Génération makhadja baliou" },
    { value: "Génération kissima bah", label: "Génération kissima bah" },
    { value: "Génération tchamba", label: "Génération tchamba" },
];

// ─── Rôles fixes ──────────────────────────────────────────────────────────────
const ROLES_FIXES: Option[] = [
    { value: "membre", label: "Membre" },

    { value: "super_admin", label: "Super Admin" },
    { value: "baliou_padra", label: "Bureau Central" },
    { value: "responsable_bd", label: "Responsable BD" },

    { value: "agent_civil", label: "Agent État Civil" },
    { value: "agent_rh", label: "Agent RH" },

    { value: "chef_gen", label: "Chef Génération" },
    { value: "chef_generation", label: "Chef Génération ancien rôle" },

    { value: "tresorier", label: "Trésorier" },

    { value: "comite_com_gen", label: "Comité Communication Génération" },
    { value: "comite_com_central", label: "Comité Communication Central" },

    { value: "admin_central", label: "Admin Central" },
    { value: "admin_systeme", label: "Admin Système" },
];

// ─── Statuts ──────────────────────────────────────────────────────────────────
const STATUT_OPTIONS: Option[] = [
    { value: "valide", label: "Validé" },
    { value: "en_attente", label: "En attente" },
    { value: "suspendu", label: "Suspendu" },
    { value: "inactif", label: "Inactif" },
    { value: "rejete", label: "Rejeté" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanValue(value: any): string {
    return (value ?? "").toString().trim();
}

function humanize(value: string): string {
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mergeOptions(baseOptions: Option[], dbValues: string[]): Option[] {
    const map = new Map<string, string>();

    for (const opt of baseOptions) {
        map.set(opt.value, opt.label);
    }

    for (const rawValue of dbValues) {
        const value = cleanValue(rawValue);
        if (!value) continue;

        if (!map.has(value)) {
            map.set(value, humanize(value));
        }
    }

    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}

function getRoleLabel(role?: string | null, options: Option[] = ROLES_FIXES): string {
    const value = cleanValue(role);
    return options.find((r) => r.value === value)?.label || humanize(value || "membre");
}

function getStatusLabel(status?: string | null): string {
    const value = cleanValue(status || "valide");
    return STATUT_OPTIONS.find((s) => s.value === value)?.label || humanize(value);
}

function getStatusClass(status?: string | null): string {
    const value = cleanValue(status || "valide");

    if (value === "valide") {
        return "bg-green-900/40 text-green-400";
    }

    if (value === "en_attente") {
        return "bg-yellow-900/40 text-yellow-400";
    }

    if (value === "suspendu") {
        return "bg-orange-900/40 text-orange-400";
    }

    return "bg-red-900/40 text-red-400";
}

function formatDate(date?: string | null): string {
    if (!date) return "";

    try {
        return new Date(date).toLocaleDateString("fr-FR");
    } catch {
        return "";
    }
}

function sexeLabel(sexe?: string | null): string {
    const value = cleanValue(sexe);

    if (value === "M") return "Homme";
    if (value === "F") return "Femme";

    return value;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function GestionBaseDonnees() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [membres, setMembres] = useState<Membre[]>([]);
    const [filtered, setFiltered] = useState<Membre[]>([]);

    const [search, setSearch] = useState("");
    const [filterGen, setFilterGen] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [filterSexe, setFilterSexe] = useState("");

    const [generationOptions, setGenerationOptions] = useState<Option[]>(GENERATIONS_FIXES);
    const [roleOptions, setRoleOptions] = useState<Option[]>(ROLES_FIXES);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<Membre>>({});

    const [detailMembre, setDetailMembre] = useState<Membre | null>(null);

    const [stats, setStats] = useState({
        total: 0,
        hommes: 0,
        femmes: 0,
        actifs: 0,
    });

    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    // ── Auth ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAuth = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            router.push("/login");
            return;
        }

        const { data: profile, error } = await supabase
            .from("membres")
            .select("role, nom_complet, email")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (error) {
            console.error("Erreur profil:", error);
            router.push("/");
            return;
        }

        const role = profile?.role;

        if (!role || !PERMISSIONS[role]) {
            router.push("/");
            return;
        }

        setUserRole(role as UserRole);
        setCurrentUser({
            ...session.user,
            nom_complet: profile?.nom_complet,
            email: profile?.email || session.user.email,
        });

        await loadMembres();
        setLoading(false);
    };

    // ── Chargement membres ────────────────────────────────────────────────────
    const loadMembres = async () => {
        console.log("📡 Chargement des membres...");

        const { data, error } = await supabase
            .from("membres")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("❌ Erreur Supabase:", error);
            showToast("Erreur chargement: " + error.message, "err");
            setLoading(false);
            return;
        }

        const list = (data || []) as Membre[];

        console.log(`✅ ${list.length} membres chargés`, list);

        setMembres(list);
        setFiltered(list);

        setStats({
            total: list.length,
            hommes: list.filter((m) => cleanValue(m.sexe) === "M").length,
            femmes: list.filter((m) => cleanValue(m.sexe) === "F").length,
            actifs: list.filter((m) => {
                const status = cleanValue(m.statut_validation || "valide");
                return status === "valide" || status === "";
            }).length,
        });

        const dbGenerations = list
            .map((m) => cleanValue(m.generation))
            .filter(Boolean);

        const mergedGenerations = mergeOptions(GENERATIONS_FIXES, dbGenerations);
        setGenerationOptions(mergedGenerations);

        const dbRoles = list
            .map((m) => cleanValue(m.role))
            .filter(Boolean);

        const mergedRoles = mergeOptions(ROLES_FIXES, dbRoles);
        setRoleOptions(mergedRoles);

        console.log("🎯 Générations disponibles:", mergedGenerations);
        console.log("🎯 Rôles disponibles:", mergedRoles);
    };

    // ── Filtres ───────────────────────────────────────────────────────────────
    useEffect(() => {
        let result = [...membres];

        const q = search.toLowerCase().trim();

        if (q) {
            result = result.filter((m) => {
                const fields = [
                    m.nom_complet,
                    m.email,
                    m.nom_soninke,
                    m.petit_nom,
                    m.telephone,
                    m.contact_urgence,
                    m.ville_residence,
                    m.quartier,
                    m.generation,
                    m.pere_nom_civil,
                    m.pere_nom_soninke,
                    m.pere_petit_nom,
                    m.mere_nom_civil,
                    m.mere_nom_soninke,
                    m.mere_petit_nom,
                    m.domaine_activite,
                    m.niveau_etudes,
                ];

                return fields.some((field) =>
                    cleanValue(field).toLowerCase().includes(q)
                );
            });
        }

        if (filterGen) {
            result = result.filter((m) => cleanValue(m.generation) === filterGen);
        }

        if (filterRole) {
            result = result.filter((m) => cleanValue(m.role) === filterRole);
        }

        if (filterSexe) {
            result = result.filter((m) => cleanValue(m.sexe) === filterSexe);
        }

        setFiltered(result);
    }, [search, filterGen, filterRole, filterSexe, membres]);

    // ── Edition rapide ────────────────────────────────────────────────────────
    const startEdit = (membre: Membre) => {
        setEditingId(membre.id);
        setEditData({
            id: membre.id,
            nom_complet: membre.nom_complet || "",
            email: membre.email || "",
            role: membre.role || "membre",
            sexe: membre.sexe || "M",
            generation: membre.generation || "",
            ville_residence: membre.ville_residence || "",
            telephone: membre.telephone || "",
            statut_validation: membre.statut_validation || "valide",
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = async () => {
        if (!editingId) return;

        const payload = {
            nom_complet: cleanValue(editData.nom_complet),
            email: cleanValue(editData.email),
            role: cleanValue(editData.role || "membre"),
            sexe: cleanValue(editData.sexe || "M"),
            generation: cleanValue(editData.generation),
            ville_residence: cleanValue(editData.ville_residence),
            telephone: cleanValue(editData.telephone),
            statut_validation: cleanValue(editData.statut_validation || "valide"),
        };

        console.log("💾 Payload envoyé:", payload);

        const { error } = await supabase
            .from("membres")
            .update(payload)
            .eq("id", editingId);

        if (error) {
            console.error("❌ Erreur update:", error);
            showToast("Erreur: " + error.message, "err");
            return;
        }

        showToast("Membre mis à jour ✓", "ok");
        setEditingId(null);
        setEditData({});
        await loadMembres();
    };

    // ── Suppression ───────────────────────────────────────────────────────────
    const confirmDelete = async (id: number) => {
        const { error } = await supabase.from("membres").delete().eq("id", id);

        if (error) {
            console.error("❌ Erreur suppression:", error);
            showToast("Erreur suppression: " + error.message, "err");
            return;
        }

        showToast("Membre supprimé", "ok");
        setDeleteConfirm(null);
        await loadMembres();
    };

    // ── Export Excel complet conforme au formulaire ───────────────────────────
    const exportExcel = () => {
        const dateExport = new Date().toLocaleDateString("fr-FR");
        const dateFile = new Date().toISOString().slice(0, 10);

        const headers = [
            "N°",

            // 1. Identité et accès
            "Email",
            "Nom complet",
            "Nom en Soninké",
            "Petit nom / Nom de reconnaissance",

            // 2. Localisation et contact
            "Sexe",
            "Génération",
            "Ville de résidence",
            "Quartier / Commune",
            "Téléphone",
            "Contact d'urgence",

            // 3. Filiation - Père
            "Nom du père - État civil",
            "Nom du père - Soninké",
            "Petit nom du père",

            // 3. Filiation - Mère
            "Nom de la mère - État civil",
            "Nom de la mère - Soninké",
            "Petit nom de la mère",

            // 4. Situation sociale et professionnelle
            "Statut matrimonial",
            "État scolarisation",
            "Niveau d'études",
            "Statut professionnel",
            "Domaine d'activité",

            // Administration
            "Rôle",
            "Statut validation",
            "Date d'inscription",
            "Dernière mise à jour",
        ];

        const dataRows = filtered.map((m, index) => [
            index + 1,

            // 1. Identité et accès
            cleanValue(m.email),
            cleanValue(m.nom_complet),
            cleanValue(m.nom_soninke),
            cleanValue(m.petit_nom),

            // 2. Localisation et contact
            sexeLabel(m.sexe),
            cleanValue(m.generation),
            cleanValue(m.ville_residence),
            cleanValue(m.quartier),
            cleanValue(m.telephone),
            cleanValue(m.contact_urgence),

            // 3. Filiation père
            cleanValue(m.pere_nom_civil),
            cleanValue(m.pere_nom_soninke),
            cleanValue(m.pere_petit_nom),

            // 3. Filiation mère
            cleanValue(m.mere_nom_civil),
            cleanValue(m.mere_nom_soninke),
            cleanValue(m.mere_petit_nom),

            // 4. Situation sociale et professionnelle
            cleanValue(m.statut_matrimonial),
            cleanValue(m.etat_scolarisation),
            cleanValue(m.niveau_etudes),
            cleanValue(m.statut_professionnel),
            cleanValue(m.domaine_activite),

            // Administration
            getRoleLabel(m.role, roleOptions),
            getStatusLabel(m.statut_validation),
            formatDate(m.created_at),
            formatDate(m.updated_at),
        ]);

        const sheetRows = [
            ["BALIOU PADRA - EXPORT COMPLET DES INSCRIPTIONS"],
            [`Date export : ${dateExport}`],
            [`Total exporté : ${filtered.length} membre${filtered.length > 1 ? "s" : ""}`],
            [],
            headers,
            ...dataRows,
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

        // Fusion du titre sur toutes les colonnes
        (worksheet as any)["!merges"] = [
            {
                s: { r: 0, c: 0 },
                e: { r: 0, c: headers.length - 1 },
            },
            {
                s: { r: 1, c: 0 },
                e: { r: 1, c: headers.length - 1 },
            },
            {
                s: { r: 2, c: 0 },
                e: { r: 2, c: headers.length - 1 },
            },
        ];

        // Largeur des colonnes pour rendre Excel lisible
        (worksheet as any)["!cols"] = [
            { wch: 6 }, // N°

            { wch: 35 }, // Email
            { wch: 32 }, // Nom complet
            { wch: 28 }, // Nom Soninké
            { wch: 34 }, // Petit nom

            { wch: 12 }, // Sexe
            { wch: 38 }, // Génération
            { wch: 24 }, // Ville
            { wch: 24 }, // Quartier
            { wch: 18 }, // Téléphone
            { wch: 24 }, // Contact urgence

            { wch: 32 }, // Père civil
            { wch: 28 }, // Père Soninké
            { wch: 24 }, // Père petit nom

            { wch: 32 }, // Mère civil
            { wch: 28 }, // Mère Soninké
            { wch: 24 }, // Mère petit nom

            { wch: 24 }, // Statut matrimonial
            { wch: 24 }, // État scolarisation
            { wch: 32 }, // Niveau études
            { wch: 28 }, // Statut professionnel
            { wch: 32 }, // Domaine activité

            { wch: 30 }, // Rôle
            { wch: 22 }, // Statut validation
            { wch: 22 }, // Date inscription
            { wch: 22 }, // Updated at
        ];

        // Filtre automatique Excel sur toutes les colonnes
        const lastRow = Math.max(5, sheetRows.length);
        const lastColumnLetter = XLSX.utils.encode_col(headers.length - 1);

        (worksheet as any)["!autofilter"] = {
            ref: `A5:${lastColumnLetter}${lastRow}`,
        };

        // Feuille statistiques
        const statsRows = [
            ["BALIOU PADRA - STATISTIQUES EXPORT"],
            [],
            ["Total membres dans la base", stats.total],
            ["Hommes", stats.hommes],
            ["Femmes", stats.femmes],
            ["Résultats exportés", filtered.length],
            [],
            ["Filtres appliqués"],
            ["Recherche", search || "Aucun"],
            [
                "Génération",
                filterGen
                    ? generationOptions.find((g) => g.value === filterGen)?.label || filterGen
                    : "Toutes",
            ],
            [
                "Rôle",
                filterRole
                    ? roleOptions.find((r) => r.value === filterRole)?.label || filterRole
                    : "Tous",
            ],
            [
                "Sexe",
                filterSexe === "M"
                    ? "Hommes"
                    : filterSexe === "F"
                        ? "Femmes"
                        : "Tous",
            ],
        ];

        const statsSheet = XLSX.utils.aoa_to_sheet(statsRows);
        (statsSheet as any)["!cols"] = [{ wch: 35 }, { wch: 55 }];

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Inscriptions complètes");
        XLSX.utils.book_append_sheet(workbook, statsSheet, "Statistiques");

        XLSX.writeFile(workbook, `inscriptions_baliou_padra_complet_${dateFile}.xlsx`);

        showToast("Export Excel complet téléchargé ✓", "ok");
    };

    // ── Toast ─────────────────────────────────────────────────────────────────
    const showToast = (msg: string, type: "ok" | "err") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Déconnexion ───────────────────────────────────────────────────────────
    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#39ff14] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-[#39ff14] font-black uppercase tracking-widest text-xs">
                        Chargement...
                    </p>
                </div>
            </div>
        );
    }

    const perms = PERMISSIONS[userRole!];
    const tableColSpan = 11;

    return (
        <div className="min-h-screen bg-[#0d1410] text-white font-mono">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl font-black text-sm border-2 shadow-2xl transition-all ${toast.type === "ok"
                            ? "bg-[#39ff14] text-black border-black"
                            : "bg-red-500 text-white border-red-300"
                        }`}
                >
                    {toast.msg}
                </div>
            )}

            {/* Modal suppression */}
            {deleteConfirm !== null && (
                <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
                    <div className="bg-[#1a2e1a] border-4 border-red-500 rounded-3xl p-8 max-w-sm w-full text-center">
                        <p className="text-4xl mb-4">⚠️</p>
                        <h3 className="font-black text-xl uppercase mb-2 text-red-400">
                            Confirmer la suppression
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Cette action est irréversible.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-black uppercase text-xs hover:bg-gray-600 transition-all"
                            >
                                Annuler
                            </button>

                            <button
                                onClick={() => confirmDelete(deleteConfirm)}
                                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-xs hover:bg-red-500 transition-all"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal détail complet */}
            {detailMembre && (
                <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
                    <div className="bg-[#111a11] border-4 border-[#39ff14] rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-black uppercase text-[#39ff14]">
                                    Détails du membre
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    {detailMembre.nom_complet} · {detailMembre.email}
                                </p>
                            </div>

                            <button
                                onClick={() => setDetailMembre(null)}
                                className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase"
                            >
                                Fermer
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailCard
                                title="1. Identité et accès"
                                items={[
                                    ["Email", detailMembre.email],
                                    ["Nom complet", detailMembre.nom_complet],
                                    ["Nom en Soninké", detailMembre.nom_soninke],
                                    ["Petit nom", detailMembre.petit_nom],
                                ]}
                            />

                            <DetailCard
                                title="2. Localisation et contact"
                                items={[
                                    ["Sexe", sexeLabel(detailMembre.sexe)],
                                    ["Génération", detailMembre.generation],
                                    ["Ville de résidence", detailMembre.ville_residence],
                                    ["Quartier / Commune", detailMembre.quartier],
                                    ["Téléphone", detailMembre.telephone],
                                    ["Contact urgence", detailMembre.contact_urgence],
                                ]}
                            />

                            <DetailCard
                                title="3. Filiation - Père"
                                items={[
                                    ["Nom père état civil", detailMembre.pere_nom_civil],
                                    ["Nom père Soninké", detailMembre.pere_nom_soninke],
                                    ["Petit nom père", detailMembre.pere_petit_nom],
                                ]}
                            />

                            <DetailCard
                                title="3. Filiation - Mère"
                                items={[
                                    ["Nom mère état civil", detailMembre.mere_nom_civil],
                                    ["Nom mère Soninké", detailMembre.mere_nom_soninke],
                                    ["Petit nom mère", detailMembre.mere_petit_nom],
                                ]}
                            />

                            <DetailCard
                                title="4. Situation sociale et professionnelle"
                                items={[
                                    ["Statut matrimonial", detailMembre.statut_matrimonial],
                                    ["État scolarisation", detailMembre.etat_scolarisation],
                                    ["Niveau d'études", detailMembre.niveau_etudes],
                                    ["Statut professionnel", detailMembre.statut_professionnel],
                                    ["Domaine d'activité", detailMembre.domaine_activite],
                                ]}
                            />

                            <DetailCard
                                title="Administration"
                                items={[
                                    ["Rôle", getRoleLabel(detailMembre.role, roleOptions)],
                                    ["Statut validation", getStatusLabel(detailMembre.statut_validation)],
                                    ["Date inscription", formatDate(detailMembre.created_at)],
                                    ["Dernière mise à jour", formatDate(detailMembre.updated_at)],
                                ]}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1500px] mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase text-[#39ff14]">
                            Gestion Base de Données
                        </h1>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                            Connecté : {currentUser?.nom_complet || currentUser?.email} ·{" "}
                            {userRole === "responsable_bd"
                                ? "Responsable BD"
                                : userRole === "super_admin"
                                    ? "Super Admin"
                                    : "Lecture seule"}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {perms.export && (
                            <button
                                onClick={exportExcel}
                                className="bg-[#39ff14] text-black px-4 py-2 rounded-xl font-black text-xs uppercase hover:opacity-90 transition-all border-2 border-[#39ff14]"
                            >
                                📊 Export Excel complet
                            </button>
                        )}

                        <button
                            onClick={logout}
                            className="bg-transparent text-gray-400 px-4 py-2 rounded-xl font-black text-xs uppercase hover:text-red-400 transition-all border-2 border-gray-700 hover:border-red-400"
                        >
                            Sortir
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                    {[
                        {
                            label: "Total Membres",
                            value: stats.total,
                            icon: "👥",
                            color: "border-[#39ff14]",
                        },
                        {
                            label: "Hommes",
                            value: stats.hommes,
                            icon: "♂",
                            color: "border-blue-500",
                        },
                        {
                            label: "Femmes",
                            value: stats.femmes,
                            icon: "♀",
                            color: "border-pink-500",
                        },
                        {
                            label: "Résultats",
                            value: filtered.length,
                            icon: "🔍",
                            color: "border-yellow-500",
                        },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className={`bg-[#111a11] border-2 ${s.color} rounded-2xl p-4 md:p-6`}
                        >
                            <p className="text-4xl font-black">{s.value}</p>
                            <p className="text-[11px] text-gray-400 uppercase tracking-widest mt-2">
                                {s.icon} {s.label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Filtres */}
                <div className="bg-[#111a11] border-2 border-[#1e3a1e] rounded-2xl p-4 md:p-6 mb-6 flex flex-col lg:flex-row gap-4 items-stretch">
                    <input
                        type="text"
                        placeholder="🔍 Rechercher par nom, email, téléphone, ville, parent..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-white text-black border-2 border-[#1e3a1e] rounded-xl px-4 py-3 text-sm font-bold placeholder-gray-500 outline-none focus:border-[#39ff14] transition-all"
                    />

                    <select
                        value={filterGen}
                        onChange={(e) => setFilterGen(e.target.value)}
                        className="bg-white text-black border-2 border-[#1e3a1e] rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-[#39ff14] transition-all min-w-[260px]"
                    >
                        <option value="">Toutes générations</option>
                        {generationOptions.map((g) => (
                            <option key={g.value} value={g.value}>
                                {g.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="bg-white text-black border-2 border-[#1e3a1e] rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-[#39ff14] transition-all min-w-[230px]"
                    >
                        <option value="">Tous les rôles</option>
                        {roleOptions.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterSexe}
                        onChange={(e) => setFilterSexe(e.target.value)}
                        className="bg-white text-black border-2 border-[#1e3a1e] rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-[#39ff14] transition-all min-w-[140px]"
                    >
                        <option value="">Tous</option>
                        <option value="M">Hommes</option>
                        <option value="F">Femmes</option>
                    </select>

                    {(search || filterGen || filterRole || filterSexe) && (
                        <button
                            onClick={() => {
                                setSearch("");
                                setFilterGen("");
                                setFilterRole("");
                                setFilterSexe("");
                            }}
                            className="text-xs font-black text-red-400 uppercase hover:text-red-300 transition-all border-2 border-red-400/30 px-4 py-3 rounded-xl hover:border-red-400"
                        >
                            ✕ Effacer
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-[#111a11] border-2 border-[#1e3a1e] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#0a0f0a] border-b-2 border-[#1e3a1e]">
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-[#39ff14]">
                                        #
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Nom complet
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Email
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Rôle
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Sexe
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Génération
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Ville
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Téléphone
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Statut
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                        Inscrit le
                                    </th>
                                    <th className="text-left px-4 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={tableColSpan}
                                            className="text-center py-12 text-gray-600 font-black uppercase text-xs"
                                        >
                                            Aucun résultat
                                        </td>
                                    </tr>
                                )}

                                {filtered.map((m, idx) => (
                                    <tr
                                        key={m.id}
                                        className="border-b border-[#1e3a1e] hover:bg-[#0d1f0d] transition-all"
                                    >
                                        <td className="px-4 py-4 text-xs text-gray-600 font-black">
                                            {idx + 1}
                                        </td>

                                        {editingId === m.id ? (
                                            <>
                                                <td className="px-2 py-2">
                                                    <input
                                                        value={editData.nom_complet || ""}
                                                        onChange={(e) =>
                                                            setEditData({
                                                                ...editData,
                                                                nom_complet: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white text-black border border-[#39ff14] rounded-lg px-2 py-2 text-xs font-bold outline-none"
                                                    />
                                                </td>

                                                <td className="px-2 py-2">
                                                    <input
                                                        value={editData.email || ""}
                                                        onChange={(e) =>
                                                            setEditData({
                                                                ...editData,
                                                                email: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white text-black border border-[#39ff14] rounded-lg px-2 py-2 text-xs font-bold outline-none"
                                                    />
                                                </td>

                                                <td className="px-2 py-2">
                                                    <select
                                                        value={editData.role || "membre"}
                                                        onChange={(e) =>
                                                            setEditData({
                                                                ...editData,
                                                                role: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white text-black border border-[#39ff14] rounded-lg px-2 py-2 text-xs font-bold outline-none"
                                                    >
                                                        {roleOptions.map((r) => (
                                                            <option key={r.value} value={r.value}>
                                                                {r.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                <td className="px-2 py-2">
                                                    <select
                                                        value={editData.sexe || "M"}
                                                        onChange={(e) =>
                                                            setEditData({
                                                                ...editData,
                                                                sexe: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white text-black border border-[#39ff14] rounded-lg px-2 py-2 text-xs font-bold outline-none"
                                                    >
                                                        <option value="M">Homme</option>
                                                        <option value="F">Femme</option>
                                                    </select>
                                                </td>

                                                <td className="px-2 py-2">
                                                    <select
                                                        value={editData.generation || ""}
                                                        onChange={(e) =>
                                                            setEditData({
                                                                ...editData,
                                                                generation: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white text-black border border-[#39ff14] rounded-lg px-2 py-2 text-xs font-bold outline-none"
                                                    >
                                                        <option value="">Sélectionner</option>
                                                        {generationOptions.map((g) => (
                                                            <option key={g.value} value={g.value}>
                                                                {g.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                <td className="px-2 py-2">
                                                    <input
                                                        value={editData.ville_residence || ""}
                                                        onChange={(e) =>
                                                            setEditData({
                                                                ...editData,
                                                                ville_residence: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white text-black border border-[#39ff14] rounded-lg px-2 py-2 text-xs font-bold outline-none"
                                                    />
                                                </td>

                                                <td className="px-2 py-2">
                                                    <input
                                                        value={editData.telephone || ""}
                                                        onChange={(e) =>
                                                            setEditData({
                                                                ...editData,
                                                                telephone: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white text-black border border-[#39ff14] rounded-lg px-2 py-2 text-xs font-bold outline-none"
                                                    />
                                                </td>

                                                <td className="px-2 py-2">
                                                    <select
                                                        value={editData.statut_validation || "valide"}
                                                        onChange={(e) =>
                                                            setEditData({
                                                                ...editData,
                                                                statut_validation: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white text-black border border-[#39ff14] rounded-lg px-2 py-2 text-xs font-bold outline-none"
                                                    >
                                                        {STATUT_OPTIONS.map((s) => (
                                                            <option key={s.value} value={s.value}>
                                                                {s.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                                                    {formatDate(m.created_at)}
                                                </td>

                                                <td className="px-2 py-2">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={saveEdit}
                                                            className="bg-[#39ff14] text-black px-3 py-2 rounded-lg text-xs font-black uppercase hover:opacity-90"
                                                        >
                                                            ✓
                                                        </button>

                                                        <button
                                                            onClick={cancelEdit}
                                                            className="bg-gray-700 text-white px-3 py-2 rounded-lg text-xs font-black uppercase hover:bg-gray-600"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-4 font-black text-white text-xs whitespace-nowrap">
                                                    {m.nom_complet}
                                                </td>

                                                <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">
                                                    {m.email}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg bg-[#39ff14]/10 text-[#39ff14] whitespace-nowrap">
                                                        {getRoleLabel(m.role, roleOptions)}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4 text-xs text-center">
                                                    {cleanValue(m.sexe) === "M"
                                                        ? "♂"
                                                        : cleanValue(m.sexe) === "F"
                                                            ? "♀"
                                                            : "-"}
                                                </td>

                                                <td className="px-4 py-4 text-xs text-gray-300 whitespace-nowrap">
                                                    {m.generation}
                                                </td>

                                                <td className="px-4 py-4 text-xs text-gray-300 whitespace-nowrap">
                                                    {m.ville_residence}
                                                </td>

                                                <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">
                                                    {m.telephone}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span
                                                        className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg whitespace-nowrap ${getStatusClass(
                                                            m.statut_validation
                                                        )}`}
                                                    >
                                                        {getStatusLabel(m.statut_validation)}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                                                    {formatDate(m.created_at)}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setDetailMembre(m)}
                                                            className="bg-purple-900/50 text-purple-300 border border-purple-700 px-3 py-2 rounded-lg text-xs font-black uppercase hover:bg-purple-800/50 transition-all whitespace-nowrap"
                                                        >
                                                            👁 Voir
                                                        </button>

                                                        {perms.edit && (
                                                            <button
                                                                onClick={() => startEdit(m)}
                                                                className="bg-blue-900/50 text-blue-300 border border-blue-700 px-3 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-800/50 transition-all whitespace-nowrap"
                                                            >
                                                                ✏ Éditer
                                                            </button>
                                                        )}

                                                        {perms.delete && (
                                                            <button
                                                                onClick={() => setDeleteConfirm(m.id)}
                                                                className="bg-red-900/40 text-red-400 border border-red-800 px-3 py-2 rounded-lg text-xs font-black uppercase hover:bg-red-900/60 transition-all"
                                                            >
                                                                🗑
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-t border-[#1e3a1e] flex flex-col md:flex-row gap-2 md:justify-between md:items-center">
                        <p className="text-[10px] text-gray-600 uppercase font-black">
                            {filtered.length} résultat{filtered.length > 1 ? "s" : ""} sur{" "}
                            {membres.length} membres
                        </p>

                        <p className="text-[10px] text-gray-700 uppercase font-black">
                            Cliquez sur 👁 Voir pour afficher toutes les informations du formulaire.
                        </p>
                    </div>
                </div>

                {/* Permissions */}
                <div className="mt-6 bg-[#111a11] border border-[#1e3a1e] rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
                        Vos permissions
                    </p>

                    <div className="flex flex-wrap gap-3">
                        {[
                            { label: "Lecture", active: perms.read, icon: "👁" },
                            { label: "Édition", active: perms.edit, icon: "✏" },
                            { label: "Suppression", active: perms.delete, icon: "🗑" },
                            { label: "Export Excel complet", active: perms.export, icon: "📊" },
                        ].map((p) => (
                            <span
                                key={p.label}
                                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border ${p.active
                                        ? "bg-[#39ff14]/10 text-[#39ff14] border-[#39ff14]/30"
                                        : "bg-gray-900 text-gray-600 border-gray-800"
                                    }`}
                            >
                                {p.icon} {p.label} {p.active ? "✓" : "✗"}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Petit composant détail ───────────────────────────────────────────────────
function DetailCard({
    title,
    items,
}: {
    title: string;
    items: Array<[string, any]>;
}) {
    return (
        <div className="bg-[#0a0f0a] border-2 border-[#1e3a1e] rounded-2xl p-4">
            <h3 className="text-[#39ff14] font-black uppercase text-xs tracking-widest mb-4">
                {title}
            </h3>

            <div className="space-y-3">
                {items.map(([label, value]) => (
                    <div key={label} className="border-b border-[#1e3a1e] pb-2">
                        <p className="text-[10px] text-gray-500 uppercase font-black">
                            {label}
                        </p>
                        <p className="text-sm text-white font-bold mt-1">
                            {cleanValue(value) || "—"}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}