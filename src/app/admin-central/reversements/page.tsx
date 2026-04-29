"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Reversement = {
    id: string;
    generation_nom: string;
    annee: number | null;
    montant_propose: number;
    montant_corrige: number | null;
    montant: number;
    description: string | null;
    statut_bc: string;
    statut_chef: string;
    statut: "en_attente" | "valide" | "rejete" | "negociation";
    date_affichage: string | null;
    date_proposition: string | null;
    date_reponse: string | null;
    valide_par_role: string | null;
    valide_par_membre_id: number | null;
    commentaire_chef: string | null;
};

type StatCardProps = {
    title: string;
    value: string | number;
    icon: string;
    color: string;
};

export default function ReversementsPage() {
    const [loading, setLoading] = useState(true);
    const [reversements, setReversements] = useState<Reversement[]>([]);
    const [filter, setFilter] = useState<
        "tous" | "en_attente" | "valide" | "rejete" | "negociation"
    >("tous");

    const router = useRouter();

    useEffect(() => {
        checkAuthAndLoadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAuthAndLoadData = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            router.push("/login");
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from("membres")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (profileError) {
            alert("Erreur profil : " + profileError.message);
            router.push("/dashboard");
            return;
        }

        if (profile?.role !== "baliou_padra" && profile?.role !== "super_admin") {
            router.push("/dashboard");
            return;
        }

        await loadReversements();
        setLoading(false);
    };

    const cleanValue = (value: any): string => {
        return (value ?? "").toString().trim();
    };

    const formatMontant = (montant: any): string => {
        return new Intl.NumberFormat("fr-FR").format(Number(montant || 0)) + " FCFA";
    };

    const formatDate = (date?: string | null): string => {
        if (!date) return "—";

        try {
            return new Date(date).toLocaleDateString("fr-FR");
        } catch {
            return "—";
        }
    };

    const getMontantFinal = (prop: any): number => {
        return Number(prop.montant_corrige ?? prop.montant_propose ?? 0);
    };

    const getStatutReversement = (prop: any): Reversement["statut"] => {
        const statutBC = cleanValue(prop.statut_bc || "en_attente");
        const statutChef = cleanValue(prop.statut_chef || "en_attente");

        if (statutBC === "valide") return "valide";
        if (statutBC === "rejete") return "rejete";
        if (statutChef === "rejete") return "rejete";
        if (statutChef === "negociation") return "negociation";

        // La génération a accepté, mais le Bureau Central n'a pas encore validé.
        if (statutChef === "accepte" && statutBC === "en_attente") {
            return "en_attente";
        }

        return "en_attente";
    };

    const loadReversements = async () => {
        /**
         * SOURCE CORRIGÉE :
         * On lit maintenant propositions_budgetaires au lieu de versements_centraux.
         *
         * Un reversement devient visible ici dès que la génération a répondu :
         * - statut_chef = accepte
         * - statut_chef = rejete
         * - statut_chef = negociation
         */
        const { data, error } = await supabase
            .from("propositions_budgetaires")
            .select("*")
            .in("statut_chef", ["accepte", "rejete", "negociation"])
            .order("date_reponse", { ascending: false });

        if (error) {
            console.error("Erreur chargement reversements:", error);
            alert("Erreur chargement reversements : " + error.message);
            setReversements([]);
            return;
        }

        const mapped: Reversement[] = (data || []).map((prop: any) => {
            const montantFinal = getMontantFinal(prop);
            const statut = getStatutReversement(prop);

            return {
                id: prop.id,
                generation_nom: prop.generation_nom || "Génération inconnue",
                annee: prop.annee || null,
                montant_propose: Number(prop.montant_propose || 0),
                montant_corrige:
                    prop.montant_corrige === null || prop.montant_corrige === undefined
                        ? null
                        : Number(prop.montant_corrige),
                montant: montantFinal,
                description: prop.description || null,
                statut_bc: prop.statut_bc || "en_attente",
                statut_chef: prop.statut_chef || "en_attente",
                statut,
                date_affichage:
                    prop.date_reponse || prop.date_proposition || prop.created_at || null,
                date_proposition: prop.date_proposition || null,
                date_reponse: prop.date_reponse || null,
                valide_par_role: prop.valide_par_role || null,
                valide_par_membre_id: prop.valide_par_membre_id || null,
                commentaire_chef: prop.commentaire_chef || null,
            };
        });

        setReversements(mapped);
    };

    const handleValidationBC = async (
        propositionId: string,
        nouveauStatut: "valide" | "rejete"
    ) => {
        const confirmation =
            nouveauStatut === "valide"
                ? "Valider ce reversement côté Bureau Central ?"
                : "Rejeter ce reversement côté Bureau Central ?";

        if (!confirm(confirmation)) return;

        /**
         * Ici on met à jour directement propositions_budgetaires.
         * L'id de ta table est un UUID, donc on évite les RPC bigint.
         */
        const { error } = await supabase
            .from("propositions_budgetaires")
            .update({
                statut_bc: nouveauStatut,
            })
            .eq("id", propositionId);

        if (error) {
            console.error("Erreur validation BC:", error);
            alert("Erreur lors de la validation : " + error.message);
            return;
        }

        await loadReversements();

        alert(
            nouveauStatut === "valide"
                ? "Reversement validé côté Bureau Central."
                : "Reversement rejeté côté Bureau Central."
        );
    };

    const getStatutBCBadge = (statut: string) => {
        switch (statut) {
            case "valide":
                return (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-black text-xs">
                        ✅ Validé BC
                    </span>
                );

            case "rejete":
                return (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-black text-xs">
                        ❌ Rejeté BC
                    </span>
                );

            default:
                return (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-black text-xs">
                        ⏳ En attente BC
                    </span>
                );
        }
    };

    const getStatutGenerationBadge = (statut: string) => {
        switch (statut) {
            case "accepte":
                return (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-black text-xs">
                        ✅ Accepté génération
                    </span>
                );

            case "rejete":
                return (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-black text-xs">
                        ❌ Rejeté génération
                    </span>
                );

            case "negociation":
                return (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-black text-xs">
                        💬 Négociation
                    </span>
                );

            default:
                return (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-black text-xs">
                        ⏳ En attente génération
                    </span>
                );
        }
    };

    const getMontantBadge = (montant: number) => {
        if (montant >= 1000000) {
            return (
                <span className="text-purple-600 font-black">
                    💰 {formatMontant(montant)}
                </span>
            );
        }

        if (montant >= 500000) {
            return (
                <span className="text-blue-600 font-black">
                    💵 {formatMontant(montant)}
                </span>
            );
        }

        return (
            <span className="text-green-600 font-black">
                {formatMontant(montant)}
            </span>
        );
    };

    const reversementsFiltres = reversements.filter((rev) => {
        if (filter === "tous") return true;
        return rev.statut === filter;
    });

    /**
     * IMPORTANT :
     * montantTotal = cumul des montants acceptés par les générations,
     * sauf ceux rejetés ensuite par le Bureau Central.
     *
     * Donc dès qu'une génération accepte, le montant apparaît dans le cumul.
     */
    const stats = {
        total: reversements.length,
        enAttente: reversements.filter((r) => r.statut === "en_attente").length,
        valides: reversements.filter((r) => r.statut === "valide").length,
        rejetes: reversements.filter((r) => r.statut === "rejete").length,
        negociations: reversements.filter((r) => r.statut === "negociation").length,
        montantTotal: reversements
            .filter(
                (r) =>
                    r.statut_chef === "accepte" &&
                    r.statut_bc !== "rejete" &&
                    r.statut !== "rejete"
            )
            .reduce((sum, r) => sum + Number(r.montant || 0), 0),
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-2xl font-black text-black">Chargement...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/admin-central"
                        className="inline-flex items-center gap-2 text-black font-black hover:text-[#146332] transition-colors mb-4"
                    >
                        <span>←</span> Retour au tableau de bord
                    </Link>

                    <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                        VALIDATION DES REVERSEMENTS
                    </h1>

                    <div className="h-1 w-32 bg-black mt-2"></div>

                    <p className="text-black/60 mt-2">
                        Suivi des montants acceptés par les générations et validation côté
                        Bureau Central.
                    </p>
                </div>

                {/* Cartes statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard
                        title="Total"
                        value={stats.total}
                        icon="📊"
                        color="bg-gray-800"
                    />

                    <StatCard
                        title="En attente BC"
                        value={stats.enAttente}
                        icon="⏳"
                        color="bg-yellow-500"
                    />

                    <StatCard
                        title="Validés BC"
                        value={stats.valides}
                        icon="✅"
                        color="bg-green-600"
                    />

                    <StatCard
                        title="Rejetés"
                        value={stats.rejetes}
                        icon="❌"
                        color="bg-red-600"
                    />

                    <StatCard
                        title="Montant accepté"
                        value={formatMontant(stats.montantTotal)}
                        icon="💰"
                        color="bg-blue-600"
                    />
                </div>

                {/* Filtres */}
                <div className="bg-white border-4 border-black rounded-2xl p-4 mb-6">
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setFilter("tous")}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === "tous"
                                    ? "bg-black text-white"
                                    : "bg-gray-100 text-black border-2 border-black"
                                }`}
                        >
                            Tous
                        </button>

                        <button
                            onClick={() => setFilter("en_attente")}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === "en_attente"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-gray-100 text-black border-2 border-black"
                                }`}
                        >
                            En attente BC
                        </button>

                        <button
                            onClick={() => setFilter("valide")}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === "valide"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-black border-2 border-black"
                                }`}
                        >
                            Validés BC
                        </button>

                        <button
                            onClick={() => setFilter("rejete")}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === "rejete"
                                    ? "bg-red-600 text-white"
                                    : "bg-gray-100 text-black border-2 border-black"
                                }`}
                        >
                            Rejetés
                        </button>

                        <button
                            onClick={() => setFilter("negociation")}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === "negociation"
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-100 text-black border-2 border-black"
                                }`}
                        >
                            Négociation
                        </button>
                    </div>
                </div>

                {/* Liste des reversements */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                    {reversementsFiltres.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-xl font-black text-black/60 italic">
                                Aucun reversement trouvé
                            </p>
                            <p className="text-black/40 mt-2">
                                Les montants acceptés par les générations apparaîtront ici.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-black text-white">
                                    <tr>
                                        <th className="p-4 text-left font-black uppercase text-sm">
                                            Date réponse
                                        </th>
                                        <th className="p-4 text-left font-black uppercase text-sm">
                                            Génération
                                        </th>
                                        <th className="p-4 text-left font-black uppercase text-sm">
                                            Année
                                        </th>
                                        <th className="p-4 text-left font-black uppercase text-sm">
                                            Montant validé
                                        </th>
                                        <th className="p-4 text-left font-black uppercase text-sm">
                                            Statut Génération
                                        </th>
                                        <th className="p-4 text-left font-black uppercase text-sm">
                                            Statut BC
                                        </th>
                                        <th className="p-4 text-left font-black uppercase text-sm">
                                            Description
                                        </th>
                                        <th className="p-4 text-center font-black uppercase text-sm">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {reversementsFiltres.map((rev, idx) => (
                                        <tr
                                            key={rev.id}
                                            className={`border-b-2 border-black/10 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                                }`}
                                        >
                                            <td className="p-4 font-black text-black whitespace-nowrap">
                                                {formatDate(rev.date_affichage)}
                                            </td>

                                            <td className="p-4 font-black text-black">
                                                {rev.generation_nom}
                                            </td>

                                            <td className="p-4 font-black text-black">
                                                {rev.annee || "—"}
                                            </td>

                                            <td className="p-4">
                                                {getMontantBadge(rev.montant)}
                                                {rev.montant_corrige !== null && (
                                                    <p className="text-[10px] text-orange-700 font-black mt-1">
                                                        Montant corrigé
                                                    </p>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                {getStatutGenerationBadge(rev.statut_chef)}
                                                {rev.valide_par_role && (
                                                    <p className="text-[10px] text-black/50 mt-1 font-bold">
                                                        Par : {rev.valide_par_role}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                {getStatutBCBadge(rev.statut_bc)}
                                            </td>

                                            <td className="p-4 text-black/80 max-w-xs">
                                                <p className="truncate">
                                                    {rev.description || "—"}
                                                </p>
                                                {rev.commentaire_chef && (
                                                    <p className="text-[10px] text-black/50 mt-1 italic">
                                                        "{rev.commentaire_chef}"
                                                    </p>
                                                )}
                                            </td>

                                            <td className="p-4 text-center">
                                                {rev.statut === "en_attente" && (
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() =>
                                                                handleValidationBC(rev.id, "valide")
                                                            }
                                                            className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-green-600 transition-all flex items-center gap-1"
                                                        >
                                                            ✅ Valider BC
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                handleValidationBC(rev.id, "rejete")
                                                            }
                                                            className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-red-600 transition-all flex items-center gap-1"
                                                        >
                                                            ❌ Rejeter BC
                                                        </button>
                                                    </div>
                                                )}

                                                {rev.statut === "valide" && (
                                                    <span className="text-green-600 font-black text-sm">
                                                        ✅ Validé BC
                                                    </span>
                                                )}

                                                {rev.statut === "rejete" && (
                                                    <span className="text-red-600 font-black text-sm">
                                                        ❌ Rejeté
                                                    </span>
                                                )}

                                                {rev.statut === "negociation" && (
                                                    <span className="text-orange-600 font-black text-sm">
                                                        💬 En négociation
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pied de page */}
                <div className="mt-6 text-right">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Supervision des reversements
                    </p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{icon}</span>
                <span
                    className={`text-xs font-black px-2 py-1 rounded-full ${color} text-white`}
                >
                    BP
                </span>
            </div>

            <p className="text-2xl font-black text-black">
                {typeof value === "number" ? value : value}
            </p>

            <p className="text-xs font-black uppercase text-black/50 mt-1">
                {title}
            </p>
        </div>
    );
}