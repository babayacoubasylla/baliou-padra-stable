"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Download, Edit2, Trash2, RefreshCw } from "lucide-react";

type Membre = {
    id: number | string;
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
    created_at?: string | null;
    updated_at?: string | null;

    [key: string]: any;
};

const ROLES_AUTORISES = ["super_admin", "responsable_bd", "baliou_padra"];

export default function GestionBDPage() {
    const [membres, setMembres] = useState<Membre[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterGen, setFilterGen] = useState("");
    const [search, setSearch] = useState("");
    const [currentRole, setCurrentRole] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanValue = (value: any): string => {
        return (value ?? "").toString().trim();
    };

    const getRoleLabel = (role?: string | null): string => {
        switch (cleanValue(role)) {
            case "super_admin":
                return "Super Admin";
            case "baliou_padra":
                return "Bureau Central";
            case "responsable_bd":
                return "Responsable BD";
            case "agent_rh":
                return "Agent RH";
            case "agent_civil":
                return "Agent État Civil";
            case "chef_gen":
            case "chef_generation":
                return "Chef Génération";
            case "tresorier":
                return "Trésorier";
            case "comite_com_gen":
                return "Comité Communication Génération";
            case "comite_com_central":
                return "Comité Communication Central";
            case "membre":
            default:
                return "Membre";
        }
    };

    const getStatutLabel = (statut?: string | null): string => {
        const value = cleanValue(statut || "en_attente");

        switch (value) {
            case "valide":
                return "Validé";
            case "rejete":
                return "Rejeté";
            case "suspendu":
                return "Suspendu";
            case "inactif":
                return "Inactif";
            case "en_attente":
            default:
                return "En attente";
        }
    };

    const getStatutBadge = (statut?: string | null) => {
        const value = cleanValue(statut || "en_attente");

        if (value === "valide") {
            return (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">
                    ✅ Validé
                </span>
            );
        }

        if (value === "rejete") {
            return (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black">
                    ❌ Rejeté
                </span>
            );
        }

        if (value === "suspendu") {
            return (
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-black">
                    ⚠️ Suspendu
                </span>
            );
        }

        return (
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">
                ⏳ En attente
            </span>
        );
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
            console.error("Erreur auth:", userError);
        }

        if (!user) {
            router.push("/login");
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from("membres")
            .select("role, email, nom_complet")
            .eq("user_id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Erreur profil:", profileError);
            setError("Erreur lors de la vérification de vos droits.");
            setLoading(false);
            return;
        }

        if (!ROLES_AUTORISES.includes(profile?.role)) {
            router.push("/dashboard");
            return;
        }

        setCurrentRole(profile?.role || null);

        const { data, error } = await supabase
            .from("membres")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erreur chargement membres:", error);
            setError("Erreur chargement membres : " + error.message);
            setMembres([]);
            setLoading(false);
            return;
        }

        setMembres((data || []) as Membre[]);
        setLoading(false);
    };

    const refreshData = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const csvCell = (value: any): string => {
        const text = cleanValue(value).replace(/"/g, '""');
        return `"${text}"`;
    };

    const exportToCSV = () => {
        if (membresFiltres.length === 0) {
            alert("Aucune donnée à exporter.");
            return;
        }

        const headers = [
            "Email",
            "Nom Civil",
            "Nom Soninké",
            "Petit nom",
            "Sexe",
            "Génération",
            "Ville",
            "Quartier",
            "Téléphone",
            "Contact urgence",
            "Père - Nom civil",
            "Père - Nom Soninké",
            "Père - Petit nom",
            "Mère - Nom civil",
            "Mère - Nom Soninké",
            "Mère - Petit nom",
            "Statut matrimonial",
            "État scolarisation",
            "Niveau études",
            "Statut professionnel",
            "Domaine activité / Métier",
            "Rôle",
            "Statut validation",
            "Date inscription",
        ];

        const rows = membresFiltres.map((m) => [
            m.email,
            m.nom_complet,
            m.nom_soninke,
            m.petit_nom,
            m.sexe === "M" ? "Homme" : m.sexe === "F" ? "Femme" : m.sexe,
            m.generation,
            m.ville_residence,
            m.quartier,
            m.telephone,
            m.contact_urgence,
            m.pere_nom_civil,
            m.pere_nom_soninke,
            m.pere_petit_nom,
            m.mere_nom_civil,
            m.mere_nom_soninke,
            m.mere_petit_nom,
            m.statut_matrimonial,
            m.etat_scolarisation,
            m.niveau_etudes,
            m.statut_professionnel,
            m.domaine_activite,
            getRoleLabel(m.role),
            getStatutLabel(m.statut_validation),
            m.created_at ? new Date(m.created_at).toLocaleDateString("fr-FR") : "",
        ]);

        const csvContent =
            "\uFEFF" +
            headers.map(csvCell).join(";") +
            "\n" +
            rows.map((row) => row.map(csvCell).join(";")).join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `audit_base_donnees_bp_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const membresFiltres = useMemo(() => {
        const q = search.toLowerCase().trim();

        return membres.filter((m) => {
            const matchGen = filterGen === "" || m.generation === filterGen;

            const searchableFields = [
                m.nom_complet,
                m.email,
                m.telephone,
                m.nom_soninke,
                m.petit_nom,
                m.ville_residence,
                m.quartier,
                m.pere_nom_civil,
                m.mere_nom_civil,
                m.domaine_activite,
                getRoleLabel(m.role),
                getStatutLabel(m.statut_validation),
            ];

            const matchSearch =
                q === "" ||
                searchableFields.some((field) =>
                    cleanValue(field).toLowerCase().includes(q)
                );

            return matchGen && matchSearch;
        });
    }, [membres, filterGen, search]);

    const generationsUniques = useMemo(() => {
        return Array.from(new Set(membres.map((m) => m.generation)))
            .filter(Boolean)
            .sort() as string[];
    }, [membres]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center text-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#146332] border-t-transparent mx-auto mb-4"></div>
                    <p className="text-2xl font-black">CHARGEMENT DE LA BASE...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-white p-6 flex items-center justify-center text-black">
                <div className="max-w-md border-4 border-red-600 rounded-3xl p-8 text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-black text-red-600 uppercase mb-4">
                        Erreur Audit
                    </h1>
                    <p className="font-bold text-gray-700">{error}</p>
                    <button
                        onClick={refreshData}
                        className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-black uppercase"
                    >
                        Réessayer
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white p-4 md:p-10 text-black">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-black uppercase text-purple-900 italic">
                            Audit & Consolidation BD
                        </h1>
                        <p className="text-xs font-bold text-gray-500">
                            Outil de pilotage Commission Communication & BD
                        </p>
                        <p className="text-[10px] font-black uppercase text-gray-400 mt-1">
                            Accès : {getRoleLabel(currentRole)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={refreshData}
                            disabled={refreshing}
                            className="flex items-center gap-2 bg-gray-100 text-black px-6 py-3 rounded-xl font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-200 transition-all"
                        >
                            <RefreshCw
                                size={18}
                                className={refreshing ? "animate-spin" : ""}
                            />
                            ACTUALISER
                        </button>

                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 bg-[#146332] text-white px-6 py-3 rounded-xl font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black transition-all"
                        >
                            <Download size={18} /> EXPORTER CSV
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="relative">
                        <span className="absolute left-4 top-3.5">🔍</span>
                        <input
                            type="text"
                            value={search}
                            placeholder="Nom, email, téléphone, ville..."
                            className="w-full p-3 pl-12 border-2 border-black rounded-xl font-bold"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        value={filterGen}
                        className="p-3 border-2 border-black rounded-xl font-bold bg-white"
                        onChange={(e) => setFilterGen(e.target.value)}
                    >
                        <option value="">Toutes les générations</option>
                        {generationsUniques.map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>

                    <div className="bg-purple-100 border-2 border-purple-900 p-3 rounded-xl flex justify-between items-center px-6">
                        <span className="font-black text-purple-900">TOTAL :</span>
                        <span className="text-2xl font-black">
                            {membresFiltres.length}
                        </span>
                    </div>
                </div>

                <div className="border-4 border-black rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-black text-white text-[10px] uppercase">
                                <tr>
                                    <th className="p-4">Membre</th>
                                    <th className="p-4">Génération</th>
                                    <th className="p-4">Filiation</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Pro / Métier</th>
                                    <th className="p-4">Rôle</th>
                                    <th className="p-4">Statut</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y-2 divide-black text-sm">
                                {membresFiltres.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="p-12 text-center font-black text-gray-500"
                                        >
                                            Aucun membre trouvé.
                                        </td>
                                    </tr>
                                )}

                                {membresFiltres.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold">
                                            {m.nom_complet || "—"}
                                            <br />
                                            <span className="text-green-700 text-xs">
                                                {m.nom_soninke || "-"}
                                            </span>
                                            <br />
                                            <span className="text-gray-500 text-[10px]">
                                                {m.email || "-"}
                                            </span>
                                        </td>

                                        <td className="p-4 font-black text-xs uppercase">
                                            {m.generation || "—"}
                                        </td>

                                        <td className="p-4 text-xs">
                                            <span className="text-blue-800">
                                                P: {m.pere_nom_civil || "-"}
                                            </span>
                                            <br />
                                            <span className="text-pink-800">
                                                M: {m.mere_nom_civil || "-"}
                                            </span>
                                        </td>

                                        <td className="p-4 font-bold text-blue-600">
                                            {m.telephone || "—"}
                                            {m.ville_residence && (
                                                <>
                                                    <br />
                                                    <span className="text-[10px] text-black/50">
                                                        📍 {m.ville_residence}
                                                    </span>
                                                </>
                                            )}
                                        </td>

                                        <td className="p-4 text-xs font-bold italic">
                                            {m.domaine_activite || "Non renseigné"}
                                            {m.niveau_etudes && (
                                                <>
                                                    <br />
                                                    <span className="text-[10px] text-black/50">
                                                        {m.niveau_etudes}
                                                    </span>
                                                </>
                                            )}
                                        </td>

                                        <td className="p-4">
                                            <span className="bg-purple-100 text-purple-900 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                {getRoleLabel(m.role)}
                                            </span>
                                        </td>

                                        <td className="p-4">{getStatutBadge(m.statut_validation)}</td>

                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => router.push("/gestion-base-donnees")}
                                                    className="p-2 border-2 border-black rounded-lg hover:bg-yellow-400"
                                                    title="Modifier dans Gestion BD"
                                                >
                                                    <Edit2 size={14} />
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        alert(
                                                            "Suppression directe désactivée depuis l'audit. Utilisez la page Gestion BD."
                                                        )
                                                    }
                                                    className="p-2 border-2 border-black rounded-lg hover:bg-red-500 hover:text-white"
                                                    title="Suppression désactivée ici"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-6 text-right">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Audit Base de Données — Baliou Padra
                    </p>
                </div>
            </div>
        </main>
    );
}