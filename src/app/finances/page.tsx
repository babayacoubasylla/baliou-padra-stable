"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Membre = {
    id: number;
    user_id: string;
    nom_complet: string | null;
    email: string | null;
    generation: string | null;
    role?: string | null;
};

type Cotisation = {
    id: string;
    membre_id: number;
    montant: number | string | null;
    type_cotisation?: string | null;
    type?: string | null;
    mois?: string | null;
    annee?: number | null;
    date_paiement?: string | null;
    date_cotisation?: string | null;
    notes?: string | null;
    description?: string | null;
    statut?: string | null;
    created_at?: string | null;
};

export default function FinancesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Membre | null>(null);
    const [cotisations, setCotisations] = useState<Cotisation[]>([]);
    const [filterType, setFilterType] = useState("tous");

    const [stats, setStats] = useState({
        total: 0,
        sibity: 0,
        mensualite: 0,
        autres: 0,
        nombrePaiements: 0,
    });

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanValue = (value: any): string => {
        return (value ?? "").toString().trim();
    };

    const numberValue = (value: any): number => {
        const n = Number(value || 0);
        return Number.isFinite(n) ? n : 0;
    };

    const formatMontant = (montant: any): string => {
        return new Intl.NumberFormat("fr-FR").format(numberValue(montant)) + " FCFA";
    };

    const formatDate = (date?: string | null): string => {
        if (!date) return "—";

        try {
            return new Date(date).toLocaleDateString("fr-FR");
        } catch {
            return "—";
        }
    };

    const getTypeValue = (cotisation: Cotisation): string => {
        return cleanValue(cotisation.type_cotisation || cotisation.type).toLowerCase();
    };

    const getTypeLabel = (cotisation: Cotisation): string => {
        const value = getTypeValue(cotisation);

        if (value.includes("sibity")) return "📿 Sibity";
        if (value.includes("mensualite") || value.includes("mensualité")) {
            return "📅 Mensualité";
        }

        return value ? `💰 ${value}` : "💰 Cotisation";
    };

    const getCotisationDate = (cotisation: Cotisation): string | null => {
        return (
            cotisation.date_paiement ||
            cotisation.date_cotisation ||
            cotisation.created_at ||
            null
        );
    };

    const getStatusBadge = (statut?: string | null) => {
        const value = cleanValue(statut || "valide");

        if (value === "valide") {
            return (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black uppercase">
                    ✅ Validé
                </span>
            );
        }

        if (value === "en_attente") {
            return (
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black uppercase">
                    ⏳ En attente
                </span>
            );
        }

        if (value === "rejete") {
            return (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black uppercase">
                    ❌ Rejeté
                </span>
            );
        }

        return (
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-black uppercase">
                {value}
            </span>
        );
    };

    const calculateStats = (list: Cotisation[]) => {
        let sibity = 0;
        let mensualite = 0;
        let autres = 0;

        list.forEach((c) => {
            const type = getTypeValue(c);
            const montant = numberValue(c.montant);

            if (type.includes("sibity")) {
                sibity += montant;
            } else if (type.includes("mensualite") || type.includes("mensualité")) {
                mensualite += montant;
            } else {
                autres += montant;
            }
        });

        setStats({
            total: sibity + mensualite + autres,
            sibity,
            mensualite,
            autres,
            nombrePaiements: list.length,
        });
    };

    const loadData = async () => {
        setLoading(true);

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            router.push("/login");
            return;
        }

        const { data: membreData, error: membreError } = await supabase
            .from("membres")
            .select("id, user_id, nom_complet, email, generation, role")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (membreError) {
            console.error("Erreur profil:", membreError);
            alert("Erreur chargement profil : " + membreError.message);
            setLoading(false);
            return;
        }

        if (!membreData) {
            alert("Profil membre introuvable.");
            router.push("/profil");
            return;
        }

        setProfile(membreData);

        /**
         * IMPORTANT :
         * Ta table cotisations.membre_id est BIGINT
         * donc elle pointe vers membres.id.
         */
        const { data: cotisationsData, error: cotisationsError } = await supabase
            .from("cotisations")
            .select("*")
            .eq("membre_id", membreData.id)
            .order("date_paiement", { ascending: false });

        if (cotisationsError) {
            console.error("Erreur cotisations:", cotisationsError);
            alert("Erreur chargement cotisations : " + cotisationsError.message);
            setCotisations([]);
            setLoading(false);
            return;
        }

        const list = (cotisationsData || []) as Cotisation[];

        setCotisations(list);
        calculateStats(list);

        setLoading(false);
    };

    const cotisationsFiltrees = cotisations.filter((c) => {
        if (filterType === "tous") return true;

        const type = getTypeValue(c);

        if (filterType === "sibity") return type.includes("sibity");

        if (filterType === "mensualite") {
            return type.includes("mensualite") || type.includes("mensualité");
        }

        if (filterType === "autres") {
            return !type.includes("sibity") &&
                !type.includes("mensualite") &&
                !type.includes("mensualité");
        }

        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center text-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#146332] border-t-transparent mx-auto mb-4"></div>
                    <p className="font-black text-xl">Chargement de mes finances...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-10 text-black">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 border-b-4 border-black pb-6">
                    <Link
                        href="/profil"
                        className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#146332] mb-4"
                    >
                        ← Retour au profil
                    </Link>

                    <h1 className="text-4xl font-black uppercase italic text-[#146332]">
                        Mes cotisations
                    </h1>

                    <p className="font-bold text-gray-500 mt-2">
                        Historique personnel des paiements — {profile?.generation || "Génération non renseignée"}
                    </p>
                </header>

                <div className="bg-green-50 border-4 border-[#146332] rounded-3xl p-6 mb-8">
                    <h2 className="text-xl font-black text-[#146332] mb-2">
                        {profile?.nom_complet || "Membre"}
                    </h2>

                    <p className="font-bold text-gray-600">{profile?.email}</p>

                    <p className="font-black text-sm uppercase mt-2">
                        Génération : {profile?.generation || "Non renseignée"}
                    </p>

                    <p className="text-xs text-gray-500 mt-4 font-bold">
                        Confidentialité : seul vous, le trésorier de votre génération, le chef de votre génération et le Bureau Central peuvent consulter cet historique.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard title="Total payé" value={formatMontant(stats.total)} icon="💰" />
                    <StatCard title="Sibity" value={formatMontant(stats.sibity)} icon="📿" />
                    <StatCard title="Mensualités" value={formatMontant(stats.mensualite)} icon="📅" />
                    <StatCard title="Paiements" value={stats.nombrePaiements} icon="🧾" />
                </div>

                <div className="bg-white border-4 border-black rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
                    <button
                        onClick={() => setFilterType("tous")}
                        className={`px-5 py-2 rounded-xl border-2 border-black font-black uppercase text-xs ${filterType === "tous" ? "bg-black text-white" : "bg-white text-black"
                            }`}
                    >
                        Tous
                    </button>

                    <button
                        onClick={() => setFilterType("sibity")}
                        className={`px-5 py-2 rounded-xl border-2 border-black font-black uppercase text-xs ${filterType === "sibity" ? "bg-purple-600 text-white" : "bg-white text-black"
                            }`}
                    >
                        📿 Sibity
                    </button>

                    <button
                        onClick={() => setFilterType("mensualite")}
                        className={`px-5 py-2 rounded-xl border-2 border-black font-black uppercase text-xs ${filterType === "mensualite" ? "bg-blue-600 text-white" : "bg-white text-black"
                            }`}
                    >
                        📅 Mensualités
                    </button>

                    <button
                        onClick={() => setFilterType("autres")}
                        className={`px-5 py-2 rounded-xl border-2 border-black font-black uppercase text-xs ${filterType === "autres" ? "bg-orange-600 text-white" : "bg-white text-black"
                            }`}
                    >
                        ⚡ Autres
                    </button>
                </div>

                <div className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="bg-black text-white p-4">
                        <h2 className="font-black uppercase text-sm">
                            🧾 Historique de mes paiements
                        </h2>
                    </div>

                    {cotisationsFiltrees.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-xl font-black text-gray-500 italic">
                                Aucun paiement enregistré pour le moment.
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                Dès que le trésorier de votre génération enregistrera un paiement, il apparaîtra ici.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 text-xs uppercase">
                                    <tr>
                                        <th className="p-4 font-black">Date</th>
                                        <th className="p-4 font-black">Type</th>
                                        <th className="p-4 font-black">Période</th>
                                        <th className="p-4 font-black text-right">Montant</th>
                                        <th className="p-4 font-black">Statut</th>
                                        <th className="p-4 font-black">Notes</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y-2 divide-gray-200">
                                    {cotisationsFiltrees.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">
                                                {formatDate(getCotisationDate(c))}
                                            </td>

                                            <td className="p-4 font-black">
                                                {getTypeLabel(c)}
                                            </td>

                                            <td className="p-4 text-sm font-bold text-gray-600">
                                                {c.mois || "—"} {c.annee || ""}
                                            </td>

                                            <td className="p-4 text-right font-black text-green-700">
                                                {formatMontant(c.montant)}
                                            </td>

                                            <td className="p-4">
                                                {getStatusBadge(c.statut)}
                                            </td>

                                            <td className="p-4 text-sm text-gray-600">
                                                {c.notes || c.description || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-right">
                    <p className="text-xs text-gray-400 font-black uppercase">
                        Historique personnel sécurisé — Baliou Padra
                    </p>
                </div>
            </div>
        </main>
    );
}

function StatCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: string | number;
    icon: string;
}) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)]">
            <div className="text-3xl mb-2">{icon}</div>

            <p className="text-xl font-black text-black">{value}</p>

            <p className="text-xs font-black uppercase text-gray-500 mt-1">
                {title}
            </p>
        </div>
    );
}