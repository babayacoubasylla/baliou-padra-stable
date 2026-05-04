"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRole = "super_admin" | "responsable_bd" | "baliou_padra";

type Membre = {
    id: number;
    user_id?: string | null;
    email?: string | null;
    nom_complet?: string | null;
    nom_soninke?: string | null;
    petit_nom?: string | null;
    sexe?: string | null;
    generation?: string | null;
    ville_residence?: string | null;
    quartier?: string | null;
    telephone?: string | null;
    contact_urgence?: string | null;

    pere_nom_civil?: string | null;
    pere_nom_soninke?: string | null;
    pere_petit_nom?: string | null;

    mere_nom_civil?: string | null;
    mere_nom_soninke?: string | null;
    mere_petit_nom?: string | null;

    statut_matrimonial?: string | null;
    etat_scolarisation?: string | null;
    niveau_etudes?: string | null;
    statut_professionnel?: string | null;
    domaine_activite?: string | null;

    role?: string | null;
    statut_validation?: string | null;
    est_compte_gestion?: boolean | null;

    created_at?: string | null;
    updated_at?: string | null;

    [key: string]: any;
};

const BLEU = "#305CDE";

const PERMISSIONS: Record<
    string,
    { read: boolean; add: boolean; edit: boolean; delete: boolean; export: boolean }
> = {
    super_admin: { read: true, add: true, edit: true, delete: true, export: true },
    responsable_bd: { read: true, add: true, edit: true, delete: true, export: true },
    baliou_padra: { read: true, add: false, edit: false, delete: false, export: true },
};

const ROLES_OPTIONS = [
    { value: "membre", label: "Membre" },
    { value: "chef_gen", label: "Chef Génération" },
    { value: "tresorier", label: "Trésorier" },
    { value: "tresorier_adjoint", label: "Trésorier adjoint" },
    { value: "comite_com_gen", label: "Comité Com. Génération" },
    { value: "comite_com_adjoint", label: "Comité Com. adjoint" },
    { value: "agent_civil", label: "Agent État Civil" },
    { value: "agent_rh", label: "Agent RH" },
    { value: "responsable_bd", label: "Responsable BD" },
    { value: "baliou_padra", label: "Bureau Central" },
    { value: "super_admin", label: "Super Admin" },
];

const STATUS_OPTIONS = [
    { value: "en_attente", label: "En attente" },
    { value: "valide", label: "Validé" },
    { value: "rejete", label: "Rejeté" },
    { value: "suspendu", label: "Suspendu" },
    { value: "inactif", label: "Inactif" },
];

const GENERATIONS_FIXES = [
    "Administration",
    "Gagnoa",
    "Abidjan",
    "Génération Wassalah dramane",
    "Génération Dramane konté",
    "Génération kissima",
    "Génération maramou basseyabané",
    "Génération khadja bah baya",
    "Génération antankhoulé passokhona",
    "Génération Mamery",
    "Génération makhadja baliou",
    "Génération kissima bah",
    "Génération tchamba",
    "Diaspora",
];

const COLUMNS = [
    { key: "nom_complet", label: "Nom complet" },
    { key: "email", label: "Email" },
    { key: "role", label: "Rôle" },
    { key: "sexe", label: "Sexe" },
    { key: "generation", label: "Génération" },
    { key: "ville_residence", label: "Ville" },
    { key: "telephone", label: "Téléphone" },
    { key: "statut_validation", label: "Statut" },
    { key: "est_compte_gestion", label: "Gestion" },
    { key: "created_at", label: "Inscrit le" },
];

export default function GestionBaseDonneesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [membres, setMembres] = useState<Membre[]>([]);
    const [search, setSearch] = useState("");
    const [filterGen, setFilterGen] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [filterSexe, setFilterSexe] = useState("");
    const [filterStatut, setFilterStatut] = useState("");

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<Membre>>({});

    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetail, setShowDetail] = useState<Membre | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

    const [newMembre, setNewMembre] = useState<Partial<Membre>>({
        email: "",
        nom_complet: "",
        nom_soninke: "",
        petit_nom: "",
        sexe: "M",
        generation: "",
        ville_residence: "",
        quartier: "",
        telephone: "",
        contact_urgence: "",
    });

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanValue = (v: any) => (v ?? "").toString().trim();

    const roleLabel = (role?: string | null) =>
        ROLES_OPTIONS.find((r) => r.value === cleanValue(role))?.label ||
        cleanValue(role) ||
        "Membre";

    const statusLabel = (status?: string | null) =>
        STATUS_OPTIONS.find((s) => s.value === cleanValue(status || "en_attente"))?.label ||
        cleanValue(status || "en_attente");

    const formatDate = (date?: string | null) => {
        if (!date) return "—";
        try {
            return new Date(date).toLocaleDateString("fr-FR");
        } catch {
            return "—";
        }
    };

    const showToast = (msg: string, type: "ok" | "err") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

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
            showToast("Erreur profil : " + error.message, "err");
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

    const loadMembres = async () => {
        const { data, error } = await supabase
            .from("membres")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            showToast("Erreur chargement : " + error.message, "err");
            setMembres([]);
            return;
        }

        setMembres((data || []) as Membre[]);
    };

    const generations = useMemo(() => {
        const db = membres.map((m) => cleanValue(m.generation)).filter(Boolean);
        return Array.from(new Set([...GENERATIONS_FIXES, ...db])).sort();
    }, [membres]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();

        return membres.filter((m) => {
            const matchSearch =
                !q ||
                [
                    m.nom_complet,
                    m.email,
                    m.telephone,
                    m.ville_residence,
                    m.nom_soninke,
                    m.petit_nom,
                    m.generation,
                    m.role,
                ].some((field) => cleanValue(field).toLowerCase().includes(q));

            const matchGen = !filterGen || m.generation === filterGen;
            const matchRole = !filterRole || m.role === filterRole;
            const matchSexe = !filterSexe || m.sexe === filterSexe;
            const matchStatut = !filterStatut || cleanValue(m.statut_validation || "en_attente") === filterStatut;

            return matchSearch && matchGen && matchRole && matchSexe && matchStatut;
        });
    }, [membres, search, filterGen, filterRole, filterSexe, filterStatut]);

    const stats = useMemo(() => {
        return {
            total: membres.length,
            hommes: membres.filter((m) => m.sexe === "M").length,
            femmes: membres.filter((m) => m.sexe === "F").length,
            valides: membres.filter((m) => m.statut_validation === "valide").length,
            resultats: filtered.length,
        };
    }, [membres, filtered.length]);

    const perms = userRole ? PERMISSIONS[userRole] : PERMISSIONS.baliou_padra;

    const startEdit = (m: Membre) => {
        setEditingId(m.id);
        setEditData({ ...m });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = async () => {
        if (!editingId) return;

        const original = membres.find((m) => m.id === editingId);

        const {
            id,
            user_id,
            created_at,
            updated_at,
            ...payload
        } = editData as any;

        /**
         * Responsable BD :
         * - ne peut pas modifier les rôles
         * - ne peut pas modifier est_compte_gestion
         */
        if (userRole !== "super_admin") {
            payload.role = original?.role || "membre";
            payload.est_compte_gestion = original?.est_compte_gestion || false;
        }

        Object.keys(payload).forEach((key) => {
            if (payload[key] === undefined) delete payload[key];
        });

        const { error } = await supabase.from("membres").update(payload).eq("id", editingId);

        if (error) {
            showToast("Erreur mise à jour : " + error.message, "err");
            return;
        }

        showToast("Fiche mise à jour", "ok");
        setEditingId(null);
        setEditData({});
        await loadMembres();
    };

    const addMembre = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!perms.add) {
            showToast("Vous n'avez pas le droit d'ajouter une fiche.", "err");
            return;
        }

        if (!cleanValue(newMembre.nom_complet) || !cleanValue(newMembre.email)) {
            showToast("Nom complet et email obligatoires.", "err");
            return;
        }

        const { error } = await supabase.rpc("bananakhou_ajouter_fiche", {
            p_email: cleanValue(newMembre.email).toLowerCase(),
            p_nom_complet: cleanValue(newMembre.nom_complet),
            p_nom_soninke: cleanValue(newMembre.nom_soninke) || null,
            p_petit_nom: cleanValue(newMembre.petit_nom) || null,
            p_sexe: newMembre.sexe || "M",
            p_generation: cleanValue(newMembre.generation) || null,
            p_ville_residence: cleanValue(newMembre.ville_residence) || null,
            p_quartier: cleanValue(newMembre.quartier) || null,
            p_telephone: cleanValue(newMembre.telephone) || null,
            p_contact_urgence: cleanValue(newMembre.contact_urgence) || null,
        });

        if (error) {
            showToast("Erreur ajout : " + error.message, "err");
            return;
        }

        showToast("Fiche membre ajoutée", "ok");
        setShowAddModal(false);
        setNewMembre({
            email: "",
            nom_complet: "",
            nom_soninke: "",
            petit_nom: "",
            sexe: "M",
            generation: "",
            ville_residence: "",
            quartier: "",
            telephone: "",
            contact_urgence: "",
        });

        await loadMembres();
    };

    const confirmDelete = async (id: number) => {
        const { error } = await supabase.from("membres").delete().eq("id", id);

        if (error) {
            showToast("Erreur suppression : " + error.message, "err");
            return;
        }

        showToast("Fiche supprimée", "ok");
        setDeleteConfirm(null);
        await loadMembres();
    };

    const csvCell = (v: any) => `"${cleanValue(v).replace(/"/g, '""')}"`;

    const exportCSV = () => {
        const headers = [
            "Nom complet",
            "Email",
            "Nom Soninké",
            "Petit nom",
            "Sexe",
            "Génération",
            "Ville",
            "Quartier",
            "Téléphone",
            "Contact urgence",
            "Rôle",
            "Statut",
            "Compte gestion",
            "Date inscription",
        ];

        const rows = filtered.map((m) => [
            m.nom_complet,
            m.email,
            m.nom_soninke,
            m.petit_nom,
            m.sexe,
            m.generation,
            m.ville_residence,
            m.quartier,
            m.telephone,
            m.contact_urgence,
            roleLabel(m.role),
            statusLabel(m.statut_validation),
            m.est_compte_gestion ? "Oui" : "Non",
            formatDate(m.created_at),
        ]);

        const csv =
            "\uFEFF" +
            headers.map(csvCell).join(";") +
            "\n" +
            rows.map((r) => r.map(csvCell).join(";")).join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bananakhou_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast("Export téléchargé", "ok");
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center text-black">
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-14 w-14 border-4 border-t-transparent mx-auto mb-4"
                        style={{ borderColor: BLEU, borderTopColor: "transparent" }}
                    ></div>
                    <p className="font-black uppercase" style={{ color: BLEU }}>
                        Chargement BANANAKHOU...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 text-black">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-6 right-6 z-[9999] px-6 py-3 rounded-2xl font-black text-sm border-2 shadow-2xl ${toast.type === "ok"
                            ? "bg-green-400 text-black border-black"
                            : "bg-red-600 text-white border-red-300"
                        }`}
                >
                    {toast.msg}
                </div>
            )}

            {/* Delete modal */}
            {deleteConfirm !== null && (
                <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-red-600 rounded-3xl p-8 max-w-sm w-full text-center">
                        <p className="text-5xl mb-4">⚠️</p>
                        <h3 className="font-black text-xl uppercase mb-2 text-red-600">
                            Confirmer la suppression
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Cette action est irréversible.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 bg-gray-200 text-black py-3 rounded-xl font-black uppercase text-xs"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => confirmDelete(deleteConfirm)}
                                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-xs"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black uppercase" style={{ color: BLEU }}>
                                    Ajouter une fiche membre
                                </h2>
                                <p className="text-xs font-bold text-gray-500 mt-1">
                                    Cette fiche sera créée comme membre simple en attente de validation.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-red-600 font-black text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={addMembre} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Nom complet *" value={newMembre.nom_complet} onChange={(v) => setNewMembre({ ...newMembre, nom_complet: v })} />
                            <Input label="Email *" value={newMembre.email} onChange={(v) => setNewMembre({ ...newMembre, email: v })} />
                            <Input label="Nom Soninké" value={newMembre.nom_soninke} onChange={(v) => setNewMembre({ ...newMembre, nom_soninke: v })} />
                            <Input label="Petit nom" value={newMembre.petit_nom} onChange={(v) => setNewMembre({ ...newMembre, petit_nom: v })} />

                            <Select
                                label="Sexe"
                                value={newMembre.sexe}
                                onChange={(v) => setNewMembre({ ...newMembre, sexe: v })}
                                options={[
                                    { value: "M", label: "Homme" },
                                    { value: "F", label: "Femme" },
                                ]}
                            />

                            <Select
                                label="Génération"
                                value={newMembre.generation}
                                onChange={(v) => setNewMembre({ ...newMembre, generation: v })}
                                options={[
                                    { value: "", label: "Sélectionner" },
                                    ...generations.map((g) => ({ value: g, label: g })),
                                ]}
                            />

                            <Input label="Ville" value={newMembre.ville_residence} onChange={(v) => setNewMembre({ ...newMembre, ville_residence: v })} />
                            <Input label="Quartier" value={newMembre.quartier} onChange={(v) => setNewMembre({ ...newMembre, quartier: v })} />
                            <Input label="Téléphone" value={newMembre.telephone} onChange={(v) => setNewMembre({ ...newMembre, telephone: v })} />
                            <Input label="Contact urgence" value={newMembre.contact_urgence} onChange={(v) => setNewMembre({ ...newMembre, contact_urgence: v })} />

                            <div className="md:col-span-2 bg-blue-50 border-2 border-blue-700 rounded-xl p-4">
                                <p className="text-xs font-black uppercase text-blue-800">
                                    Règle BANANAKHOU
                                </p>
                                <p className="text-xs text-blue-700 mt-1 font-bold">
                                    La fiche sera créée comme <b>membre simple</b>. Les rôles et les comptes techniques sont gérés dans les espaces d’administration appropriés.
                                </p>
                            </div>

                            <div className="md:col-span-2 flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 bg-gray-200 py-3 rounded-xl font-black uppercase"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 text-white py-3 rounded-xl font-black uppercase"
                                    style={{ backgroundColor: BLEU }}
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail modal */}
            {showDetail && (
                <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-3xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black uppercase" style={{ color: BLEU }}>
                                    Détails de la fiche
                                </h2>
                                <p className="text-xs font-bold text-gray-500">
                                    {showDetail.nom_complet} — {showDetail.email}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDetail(null)}
                                className="text-red-600 font-black text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailCard
                                title="Identité"
                                items={[
                                    ["Nom complet", showDetail.nom_complet],
                                    ["Email", showDetail.email],
                                    ["Nom Soninké", showDetail.nom_soninke],
                                    ["Petit nom", showDetail.petit_nom],
                                    ["Sexe", showDetail.sexe],
                                ]}
                            />

                            <DetailCard
                                title="Localisation et contact"
                                items={[
                                    ["Génération", showDetail.generation],
                                    ["Ville", showDetail.ville_residence],
                                    ["Quartier", showDetail.quartier],
                                    ["Téléphone", showDetail.telephone],
                                    ["Contact urgence", showDetail.contact_urgence],
                                ]}
                            />

                            <DetailCard
                                title="Filiation père"
                                items={[
                                    ["Nom civil", showDetail.pere_nom_civil],
                                    ["Nom Soninké", showDetail.pere_nom_soninke],
                                    ["Petit nom", showDetail.pere_petit_nom],
                                ]}
                            />

                            <DetailCard
                                title="Filiation mère"
                                items={[
                                    ["Nom civil", showDetail.mere_nom_civil],
                                    ["Nom Soninké", showDetail.mere_nom_soninke],
                                    ["Petit nom", showDetail.mere_petit_nom],
                                ]}
                            />

                            <DetailCard
                                title="Situation"
                                items={[
                                    ["Statut matrimonial", showDetail.statut_matrimonial],
                                    ["Scolarisation", showDetail.etat_scolarisation],
                                    ["Niveau études", showDetail.niveau_etudes],
                                    ["Statut professionnel", showDetail.statut_professionnel],
                                    ["Domaine activité", showDetail.domaine_activite],
                                ]}
                            />

                            <DetailCard
                                title="Administration"
                                items={[
                                    ["Rôle", roleLabel(showDetail.role)],
                                    ["Statut", statusLabel(showDetail.statut_validation)],
                                    ["Compte gestion", showDetail.est_compte_gestion ? "Oui" : "Non"],
                                    ["Inscrit le", formatDate(showDetail.created_at)],
                                    ["Mis à jour", formatDate(showDetail.updated_at)],
                                ]}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header BANANAKHOU */}
            <section className="bg-white border-b-4 border-black">
                <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <img
                            src="/bananakhou-logo.png"
                            alt="BANANAKHOU"
                            className="w-14 h-14 object-contain rounded-xl border-2 border-black bg-white"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                        />

                        <div>
                            <h1 className="text-3xl md:text-4xl font-black uppercase italic" style={{ color: BLEU }}>
                                BANANAKHOU
                            </h1>
                            <p className="text-xs font-black uppercase text-gray-500">
                                Base de données communautaire — Responsable BD
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">
                                Connecté : {currentUser?.nom_complet || currentUser?.email} — {roleLabel(userRole)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {perms.add && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="text-white px-4 py-2 rounded-xl font-black uppercase text-xs border-2 border-black"
                                style={{ backgroundColor: BLEU }}
                            >
                                + Ajouter
                            </button>
                        )}

                        {perms.export && (
                            <button
                                onClick={exportCSV}
                                className="bg-black text-white px-4 py-2 rounded-xl font-black uppercase text-xs border-2 border-black"
                            >
                                Export CSV
                            </button>
                        )}

                        <button
                            onClick={logout}
                            className="bg-white text-red-600 px-4 py-2 rounded-xl font-black uppercase text-xs border-2 border-red-600"
                        >
                            Sortir
                        </button>
                    </div>
                </div>

                {/* Menu interne BANANAKHOU */}
                <div className="max-w-7xl mx-auto px-4 pb-4 flex flex-wrap gap-2 text-xs font-black uppercase">
                    <Link href="/" className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:text-white hover:bg-black">
                        Le projet
                    </Link>

                    <Link href="/profil" className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:text-white hover:bg-black">
                        Espace membre
                    </Link>

                    <Link href="/actualites" className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:text-white hover:bg-black">
                        Actualités
                    </Link>

                    <Link href="/gestion-base-donnees" className="px-4 py-2 rounded-xl border-2 border-black text-white" style={{ backgroundColor: BLEU }}>
                        Base de données
                    </Link>

                    <Link href="/histoire" className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:text-white hover:bg-black">
                        Histoire
                    </Link>
                </div>
            </section>

            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatBox label="Total fiches" value={stats.total} icon="👥" color={BLEU} />
                    <StatBox label="Hommes" value={stats.hommes} icon="♂" color="#2563EB" />
                    <StatBox label="Femmes" value={stats.femmes} icon="♀" color="#DB2777" />
                    <StatBox label="Validés" value={stats.valides} icon="✅" color="#16A34A" />
                    <StatBox label="Résultats" value={stats.resultats} icon="🔍" color="#F59E0B" />
                </div>

                {/* Filtres */}
                <div className="bg-white border-4 border-black rounded-2xl p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                        type="text"
                        placeholder="Rechercher nom, email, téléphone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="md:col-span-2 p-3 border-2 border-black rounded-xl font-bold text-black"
                    />

                    <select
                        value={filterGen}
                        onChange={(e) => setFilterGen(e.target.value)}
                        className="p-3 border-2 border-black rounded-xl font-bold bg-white"
                    >
                        <option value="">Toutes générations</option>
                        {generations.map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="p-3 border-2 border-black rounded-xl font-bold bg-white"
                    >
                        <option value="">Tous rôles</option>
                        {ROLES_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterStatut}
                        onChange={(e) => setFilterStatut(e.target.value)}
                        className="p-3 border-2 border-black rounded-xl font-bold bg-white"
                    >
                        <option value="">Tous statuts</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterSexe}
                        onChange={(e) => setFilterSexe(e.target.value)}
                        className="p-3 border-2 border-black rounded-xl font-bold bg-white"
                    >
                        <option value="">Tous sexes</option>
                        <option value="M">Hommes</option>
                        <option value="F">Femmes</option>
                    </select>

                    {(search || filterGen || filterRole || filterSexe || filterStatut) && (
                        <button
                            onClick={() => {
                                setSearch("");
                                setFilterGen("");
                                setFilterRole("");
                                setFilterSexe("");
                                setFilterStatut("");
                            }}
                            className="p-3 border-2 border-red-600 text-red-600 rounded-xl font-black uppercase"
                        >
                            Effacer filtres
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black text-white text-[10px] uppercase">
                                <tr>
                                    <th className="p-4">#</th>
                                    {COLUMNS.map((c) => (
                                        <th key={c.key} className="p-4 whitespace-nowrap">
                                            {c.label}
                                        </th>
                                    ))}
                                    {(perms.edit || perms.delete) && <th className="p-4 text-center">Actions</th>}
                                </tr>
                            </thead>

                            <tbody className="divide-y-2 divide-black/10 text-sm">
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={COLUMNS.length + 2} className="p-12 text-center font-black text-gray-500 italic">
                                            Aucun résultat
                                        </td>
                                    </tr>
                                )}

                                {filtered.map((m, index) => (
                                    <tr key={m.id} className="hover:bg-blue-50/40">
                                        <td className="p-4 font-black text-gray-500">{index + 1}</td>

                                        {editingId === m.id ? (
                                            <>
                                                <td className="p-2">
                                                    <input
                                                        value={editData.nom_complet || ""}
                                                        onChange={(e) => setEditData({ ...editData, nom_complet: e.target.value })}
                                                        className="w-full p-2 border-2 border-black rounded-lg font-bold"
                                                    />
                                                </td>

                                                <td className="p-2">
                                                    <input
                                                        value={editData.email || ""}
                                                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                                        className="w-full p-2 border-2 border-black rounded-lg font-bold"
                                                    />
                                                </td>

                                                <td className="p-2">
                                                    {userRole === "super_admin" ? (
                                                        <select
                                                            value={editData.role || "membre"}
                                                            onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                                            className="w-full p-2 border-2 border-black rounded-lg font-bold bg-white"
                                                        >
                                                            {ROLES_OPTIONS.map((r) => (
                                                                <option key={r.value} value={r.value}>
                                                                    {r.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="font-black text-xs">
                                                            {roleLabel(editData.role)}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-2">
                                                    <select
                                                        value={editData.sexe || "M"}
                                                        onChange={(e) => setEditData({ ...editData, sexe: e.target.value })}
                                                        className="w-full p-2 border-2 border-black rounded-lg font-bold bg-white"
                                                    >
                                                        <option value="M">Homme</option>
                                                        <option value="F">Femme</option>
                                                    </select>
                                                </td>

                                                <td className="p-2">
                                                    <input
                                                        value={editData.generation || ""}
                                                        onChange={(e) => setEditData({ ...editData, generation: e.target.value })}
                                                        className="w-full p-2 border-2 border-black rounded-lg font-bold"
                                                    />
                                                </td>

                                                <td className="p-2">
                                                    <input
                                                        value={editData.ville_residence || ""}
                                                        onChange={(e) => setEditData({ ...editData, ville_residence: e.target.value })}
                                                        className="w-full p-2 border-2 border-black rounded-lg font-bold"
                                                    />
                                                </td>

                                                <td className="p-2">
                                                    <input
                                                        value={editData.telephone || ""}
                                                        onChange={(e) => setEditData({ ...editData, telephone: e.target.value })}
                                                        className="w-full p-2 border-2 border-black rounded-lg font-bold"
                                                    />
                                                </td>

                                                <td className="p-2">
                                                    <select
                                                        value={editData.statut_validation || "en_attente"}
                                                        onChange={(e) => setEditData({ ...editData, statut_validation: e.target.value })}
                                                        className="w-full p-2 border-2 border-black rounded-lg font-bold bg-white"
                                                    >
                                                        {STATUS_OPTIONS.map((s) => (
                                                            <option key={s.value} value={s.value}>
                                                                {s.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                <td className="p-2 text-center">
                                                    {userRole === "super_admin" ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(editData.est_compte_gestion)}
                                                            onChange={(e) =>
                                                                setEditData({
                                                                    ...editData,
                                                                    est_compte_gestion: e.target.checked,
                                                                })
                                                            }
                                                            className="w-5 h-5"
                                                        />
                                                    ) : (
                                                        <span className="font-black text-xs">
                                                            {editData.est_compte_gestion ? "Oui" : "Non"}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-4 text-xs text-gray-500">{formatDate(m.created_at)}</td>

                                                <td className="p-2">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={saveEdit}
                                                            className="text-white px-3 py-2 rounded-lg font-black text-xs"
                                                            style={{ backgroundColor: BLEU }}
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="bg-gray-300 text-black px-3 py-2 rounded-lg font-black text-xs"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4 font-black">{m.nom_complet || "—"}</td>
                                                <td className="p-4 text-gray-700">{m.email || "—"}</td>
                                                <td className="p-4">
                                                    <Badge text={roleLabel(m.role)} color={BLEU} />
                                                </td>
                                                <td className="p-4 text-center">{m.sexe === "M" ? "♂" : m.sexe === "F" ? "♀" : "—"}</td>
                                                <td className="p-4 font-bold">{m.generation || "—"}</td>
                                                <td className="p-4">{m.ville_residence || "—"}</td>
                                                <td className="p-4 font-bold text-blue-700">{m.telephone || "—"}</td>
                                                <td className="p-4">
                                                    <StatusBadge statut={m.statut_validation} />
                                                </td>
                                                <td className="p-4">
                                                    {m.est_compte_gestion ? (
                                                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-black">
                                                            Oui
                                                        </span>
                                                    ) : (
                                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-black">
                                                            Non
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-xs text-gray-500">{formatDate(m.created_at)}</td>

                                                {(perms.edit || perms.delete) && (
                                                    <td className="p-4">
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={() => setShowDetail(m)}
                                                                className="bg-gray-100 border-2 border-black px-3 py-2 rounded-lg font-black text-xs"
                                                            >
                                                                Voir
                                                            </button>

                                                            {perms.edit && (
                                                                <button
                                                                    onClick={() => startEdit(m)}
                                                                    className="bg-blue-100 text-blue-800 border-2 border-blue-700 px-3 py-2 rounded-lg font-black text-xs"
                                                                >
                                                                    Éditer
                                                                </button>
                                                            )}

                                                            {perms.delete && (
                                                                <button
                                                                    onClick={() => setDeleteConfirm(m.id)}
                                                                    className="bg-red-100 text-red-700 border-2 border-red-700 px-3 py-2 rounded-lg font-black text-xs"
                                                                >
                                                                    Suppr.
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-6 text-right">
                    <p className="text-xs text-gray-400 font-black uppercase">
                        BANANAKHOU — Base de données communautaire
                    </p>
                </div>
            </div>
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Sous-composants                                                            */
/* -------------------------------------------------------------------------- */

function StatBox({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: number;
    icon: string;
    color: string;
}) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-2">
                <span className="text-2xl">{icon}</span>
                <span
                    className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-black"
                    style={{ backgroundColor: color }}
                >
                    BK
                </span>
            </div>
            <p className="text-3xl font-black">{value}</p>
            <p className="text-xs font-black uppercase text-gray-500 mt-1">{label}</p>
        </div>
    );
}

function Badge({ text, color }: { text: string; color: string }) {
    return (
        <span
            className="text-white px-3 py-1 rounded-full text-xs font-black uppercase"
            style={{ backgroundColor: color }}
        >
            {text}
        </span>
    );
}

function StatusBadge({ statut }: { statut?: string | null }) {
    const value = (statut || "en_attente").toString();

    if (value === "valide") {
        return (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">
                Validé
            </span>
        );
    }

    if (value === "rejete") {
        return (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black">
                Rejeté
            </span>
        );
    }

    if (value === "suspendu") {
        return (
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-black">
                Suspendu
            </span>
        );
    }

    return (
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">
            En attente
        </span>
    );
}

function Input({
    label,
    value,
    onChange,
}: {
    label: string;
    value: any;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="text-xs font-black uppercase text-gray-600">{label}</span>
            <input
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-3 border-2 border-black rounded-xl font-bold text-black mt-1"
            />
        </label>
    );
}

function Select({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: any;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <label className="block">
            <span className="text-xs font-black uppercase text-gray-600">{label}</span>
            <select
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-3 border-2 border-black rounded-xl font-bold text-black bg-white mt-1"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function DetailCard({
    title,
    items,
}: {
    title: string;
    items: Array<[string, any]>;
}) {
    return (
        <div className="border-2 border-black rounded-2xl p-4">
            <h3 className="font-black uppercase text-sm mb-3 text-blue-700">{title}</h3>
            <div className="space-y-2">
                {items.map(([label, value]) => (
                    <div key={label} className="border-b border-gray-200 pb-2">
                        <p className="text-[10px] text-gray-500 uppercase font-black">{label}</p>
                        <p className="font-bold text-black">
                            {(value ?? "").toString().trim() || "—"}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}