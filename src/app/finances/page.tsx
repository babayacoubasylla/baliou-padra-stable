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
    telephone?: string | null;
    ville_residence?: string | null;
    quartier?: string | null;
    est_compte_gestion?: boolean | null;
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
    ligne_cotisation_id?: string | null;
    engagement_id?: string | null;
    cotisation_lignes?: {
        titre?: string | null;
        type_ligne?: string | null;
        montant_cible?: number | string | null;
    } | null;
};

type LigneCotisation = {
    ligne_id: string;
    engagement_id: string | null;
    generation_nom: string | null;
    titre: string;
    description: string | null;
    type_ligne: "sibiti" | "cotisation" | "engagement";
    scope: "global" | "generation";
    annee: number;
    montant_attendu: number;
    montant_paye: number;
    reste_a_payer: number;
    progression: number;
    engagement_statut: string;
    date_limite: string | null;
    statut: string;
};

export default function FinancesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Membre | null>(null);
    const [cotisations, setCotisations] = useState<Cotisation[]>([]);
    const [lignes, setLignes] = useState<LigneCotisation[]>([]);
    const [membresGeneration, setMembresGeneration] = useState<Membre[]>([]);

    const [filterType, setFilterType] = useState("tous");

    const [showEngagementModal, setShowEngagementModal] = useState(false);
    const [selectedLigne, setSelectedLigne] = useState<LigneCotisation | null>(null);
    const [engagementMontant, setEngagementMontant] = useState("");
    const [engagementMessage, setEngagementMessage] = useState("");

    const [stats, setStats] = useState({
        total: 0,
        sibiti: 0,
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

        if (value.includes("sibity") || value.includes("sibiti")) return "📿 Sibiti";
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

    const getLigneTitre = (cotisation: Cotisation): string => {
        return cleanValue(cotisation.cotisation_lignes?.titre);
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

    const getRoleLabel = (role?: string | null): string => {
        const value = cleanValue(role);

        if (value === "chef_gen" || value === "chef_generation") return "Chef génération";
        if (value === "tresorier") return "Trésorier";
        if (value === "tresorier_adjoint") return "Trésorier adjoint";
        if (value === "comite_com_gen") return "Comité communication";
        if (value === "membre") return "Membre";

        return value || "Membre";
    };

    const calculateStats = (list: Cotisation[]) => {
        let sibiti = 0;
        let mensualite = 0;
        let autres = 0;

        list.forEach((c) => {
            const type = getTypeValue(c);
            const montant = numberValue(c.montant);

            if (type.includes("sibity") || type.includes("sibiti")) {
                sibiti += montant;
            } else if (type.includes("mensualite") || type.includes("mensualité")) {
                mensualite += montant;
            } else {
                autres += montant;
            }
        });

        setStats({
            total: sibiti + mensualite + autres,
            sibiti,
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
            .select(
                "id, user_id, nom_complet, email, generation, role, telephone, ville_residence, quartier, est_compte_gestion"
            )
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

        await loadCotisations(membreData);
        await loadLignes();
        await loadMembresGeneration(membreData);

        setLoading(false);
    };

    const loadCotisations = async (membreData: Membre) => {
        /**
         * cotisations.membre_id est BIGINT et pointe vers membres.id.
         */
        const withRelations = await supabase
            .from("cotisations")
            .select("*, cotisation_lignes(titre,type_ligne,montant_cible)")
            .eq("membre_id", membreData.id)
            .order("date_paiement", { ascending: false });

        let list: Cotisation[] = [];

        if (withRelations.error) {
            console.warn("Fallback cotisations sans relation:", withRelations.error.message);

            const { data, error } = await supabase
                .from("cotisations")
                .select("*")
                .eq("membre_id", membreData.id)
                .order("date_paiement", { ascending: false });

            if (error) {
                console.error("Erreur cotisations:", error);
                alert("Erreur chargement cotisations : " + error.message);
                setCotisations([]);
                return;
            }

            list = (data || []) as Cotisation[];
        } else {
            list = (withRelations.data || []) as Cotisation[];
        }

        setCotisations(list);
        calculateStats(list);
    };

    const loadLignes = async () => {
        const { data, error } = await supabase.rpc("get_mes_lignes_cotisation_v2");

        if (error) {
            console.error("Erreur jauges cotisation:", error);
            setLignes([]);
            return;
        }

        setLignes((data || []) as LigneCotisation[]);
    };

    const loadMembresGeneration = async (membreData: Membre) => {
        if (!membreData.generation) {
            setMembresGeneration([]);
            return;
        }

        const { data, error } = await supabase
            .from("membres")
            .select("id, user_id, nom_complet, email, generation, role, telephone, ville_residence, quartier, est_compte_gestion")
            .eq("generation", membreData.generation)
            .eq("statut_validation", "valide")
            .eq("est_compte_gestion", false)
            .order("nom_complet", { ascending: true });

        if (error) {
            console.error("Erreur membres génération:", error);
            setMembresGeneration([]);
            return;
        }

        setMembresGeneration((data || []) as Membre[]);
    };

    const refreshAll = async () => {
        if (!profile) return;

        setLoading(true);
        await loadCotisations(profile);
        await loadLignes();
        await loadMembresGeneration(profile);
        setLoading(false);
    };

    const openEngagementModal = (ligne: LigneCotisation) => {
        setSelectedLigne(ligne);
        setEngagementMontant("");
        setEngagementMessage("");
        setShowEngagementModal(true);
    };

    const handleSubmitEngagement = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedLigne) return;

        if (!engagementMontant || Number(engagementMontant) <= 0) {
            alert("Veuillez saisir un montant valide.");
            return;
        }

        const { error } = await supabase.rpc("soumettre_engagement_membre", {
            p_ligne_id: selectedLigne.ligne_id,
            p_montant_propose: Number(engagementMontant),
            p_message: engagementMessage || null,
        });

        if (error) {
            alert("Erreur : " + error.message);
            return;
        }

        alert("Votre engagement a été soumis au chef de génération.");

        setShowEngagementModal(false);
        setSelectedLigne(null);
        setEngagementMontant("");
        setEngagementMessage("");

        await loadLignes();
    };

    const cotisationsFiltrees = cotisations.filter((c) => {
        if (filterType === "tous") return true;

        const type = getTypeValue(c);

        if (filterType === "sibity") {
            return type.includes("sibity") || type.includes("sibiti");
        }

        if (filterType === "mensualite") {
            return type.includes("mensualite") || type.includes("mensualité");
        }

        if (filterType === "autres") {
            return (
                !type.includes("sibity") &&
                !type.includes("sibiti") &&
                !type.includes("mensualite") &&
                !type.includes("mensualité")
            );
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
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 border-b-4 border-black pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <Link
                            href="/profil"
                            className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#146332] mb-4"
                        >
                            ← Retour au profil
                        </Link>

                        <h1 className="text-4xl font-black uppercase italic text-[#146332]">
                            Mes finances
                        </h1>

                        <p className="font-bold text-gray-500 mt-2">
                            Cotisations, engagements et historique personnel — {profile?.generation || "Génération non renseignée"}
                        </p>
                    </div>

                    <button
                        onClick={refreshAll}
                        className="bg-black text-white px-5 py-3 rounded-xl font-black uppercase text-xs"
                    >
                        Actualiser
                    </button>
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
                        Confidentialité : seul vous, le trésorier de votre génération et le chef de votre génération peuvent consulter cet historique.
                    </p>
                </div>

                {profile?.est_compte_gestion && (
                    <div className="bg-yellow-50 border-4 border-yellow-600 rounded-2xl p-6 mb-8">
                        <p className="font-black text-yellow-800">
                            Ce compte est un compte de gestion. Il n’est pas inclus dans les totaux financiers des membres cotisants.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard title="Total payé" value={formatMontant(stats.total)} icon="💰" />
                    <StatCard title="Sibiti" value={formatMontant(stats.sibiti)} icon="📿" />
                    <StatCard title="Mensualités" value={formatMontant(stats.mensualite)} icon="📅" />
                    <StatCard title="Paiements" value={stats.nombrePaiements} icon="🧾" />
                </div>

                {/* Jauges */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-black uppercase text-black">
                            Mes jauges de cotisation
                        </h2>
                    </div>

                    {lignes.length === 0 ? (
                        <div className="bg-white border-4 border-black rounded-2xl p-10 text-center">
                            <p className="font-black text-gray-500 italic">
                                Aucune ligne de cotisation active pour le moment.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {lignes.map((ligne) => (
                                <div
                                    key={`${ligne.ligne_id}-${ligne.engagement_id || "none"}`}
                                    className="bg-white border-4 border-black rounded-2xl p-5"
                                >
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div>
                                            <h3 className="font-black text-lg text-black">
                                                {ligne.titre}
                                            </h3>

                                            <p className="text-xs font-black uppercase text-gray-500 mt-1">
                                                {ligne.type_ligne === "sibiti" && "Sibiti global"}
                                                {ligne.type_ligne === "cotisation" && "Cotisation génération"}
                                                {ligne.type_ligne === "engagement" && "Engagement personnel"}
                                            </p>

                                            {ligne.description && (
                                                <p className="text-sm text-gray-600 mt-2">
                                                    {ligne.description}
                                                </p>
                                            )}
                                        </div>

                                        <StatusBadge ligne={ligne} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <MiniAmount label="Attendu" value={formatMontant(ligne.montant_attendu)} />
                                        <MiniAmount label="Payé" value={formatMontant(ligne.montant_paye)} />
                                        <MiniAmount label="Reste" value={formatMontant(ligne.reste_a_payer)} />
                                    </div>

                                    <div className="mb-2 flex justify-between text-xs font-black">
                                        <span>Progression</span>
                                        <span>{Number(ligne.progression || 0).toFixed(0)}%</span>
                                    </div>

                                    <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
                                        <div
                                            className="h-full bg-green-500"
                                            style={{
                                                width: `${Math.min(100, Number(ligne.progression || 0))}%`,
                                            }}
                                        ></div>
                                    </div>

                                    {ligne.date_limite && (
                                        <p className="text-xs text-gray-500 mt-3 font-bold">
                                            Date limite : {formatDate(ligne.date_limite)}
                                        </p>
                                    )}

                                    {ligne.type_ligne === "engagement" &&
                                        ligne.engagement_statut === "a_soumettre" && (
                                            <button
                                                onClick={() => openEngagementModal(ligne)}
                                                className="mt-4 w-full bg-orange-500 text-white py-3 rounded-xl font-black uppercase text-xs hover:bg-orange-600"
                                            >
                                                Soumettre mon engagement
                                            </button>
                                        )}

                                    {ligne.type_ligne === "engagement" &&
                                        ligne.engagement_statut === "en_attente" && (
                                            <p className="mt-4 text-sm font-black text-yellow-700">
                                                ⏳ Votre engagement est en attente de validation par le chef.
                                            </p>
                                        )}

                                    {ligne.type_ligne === "engagement" &&
                                        ligne.engagement_statut === "rejete" && (
                                            <p className="mt-4 text-sm font-black text-red-700">
                                                ❌ Votre engagement a été rejeté.
                                            </p>
                                        )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Filtres historique */}
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
                        📿 Sibiti
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

                {/* Historique */}
                <div className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-xl mb-10">
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
                                        <th className="p-4 font-black">Ligne</th>
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

                                            <td className="p-4 font-black text-blue-700">
                                                {getLigneTitre(c) || "—"}
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

                {/* Membres de génération */}
                <section className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="bg-black text-white p-4">
                        <h2 className="font-black uppercase text-sm">
                            👥 Membres validés de ma génération
                        </h2>
                    </div>

                    {membresGeneration.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 font-black italic">
                            Aucun membre validé trouvé.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 text-xs uppercase">
                                    <tr>
                                        <th className="p-4 font-black">Nom</th>
                                        <th className="p-4 font-black">Téléphone</th>
                                        <th className="p-4 font-black">Ville</th>
                                        <th className="p-4 font-black">Quartier</th>
                                        <th className="p-4 font-black">Rôle</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y-2 divide-gray-200">
                                    {membresGeneration.map((m) => (
                                        <tr key={m.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-black">
                                                {m.nom_complet || "—"}
                                                {m.id === profile?.id && (
                                                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-[10px] font-black">
                                                        Moi
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 font-bold text-blue-700">
                                                {m.telephone || "—"}
                                            </td>
                                            <td className="p-4">{m.ville_residence || "—"}</td>
                                            <td className="p-4">{m.quartier || "—"}</td>
                                            <td className="p-4 font-bold">{getRoleLabel(m.role)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <div className="mt-6 text-right">
                    <p className="text-xs text-gray-400 font-black uppercase">
                        Espace financier personnel sécurisé — Baliou Padra
                    </p>
                </div>
            </div>

            {/* Modal engagement */}
            {showEngagementModal && selectedLigne && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-3xl p-6 max-w-md w-full">
                        <h2 className="text-2xl font-black text-black mb-4">
                            🤝 Soumettre mon engagement
                        </h2>

                        <p className="font-black text-[#146332] mb-2">
                            {selectedLigne.titre}
                        </p>

                        <p className="text-sm text-gray-600 mb-4">
                            Indiquez le montant que vous souhaitez vous engager à payer.
                        </p>

                        <form onSubmit={handleSubmitEngagement} className="space-y-4">
                            <div>
                                <label className="block font-black mb-1">
                                    Montant proposé (FCFA)
                                </label>
                                <input
                                    type="number"
                                    value={engagementMontant}
                                    onChange={(e) => setEngagementMontant(e.target.value)}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-black mb-1">
                                    Message optionnel
                                </label>
                                <textarea
                                    value={engagementMessage}
                                    onChange={(e) => setEngagementMessage(e.target.value)}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black"
                                    rows={3}
                                    placeholder="Ex: Je m'engage à payer progressivement..."
                                />
                            </div>

                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEngagementModal(false)}
                                    className="flex-1 bg-gray-200 py-3 rounded-xl font-black"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    className="flex-1 bg-[#146332] text-white py-3 rounded-xl font-black"
                                >
                                    Envoyer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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

function MiniAmount({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="bg-gray-50 border-2 border-black rounded-xl p-2 text-center">
            <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
            <p className="text-xs font-black text-black">{value}</p>
        </div>
    );
}

function StatusBadge({ ligne }: { ligne: LigneCotisation }) {
    if (ligne.type_ligne === "sibiti") {
        return (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                Sibiti
            </span>
        );
    }

    if (ligne.type_ligne === "cotisation") {
        return (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                Cotisation
            </span>
        );
    }

    if (ligne.engagement_statut === "a_soumettre") {
        return (
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                À soumettre
            </span>
        );
    }

    if (ligne.engagement_statut === "en_attente") {
        return (
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                En attente
            </span>
        );
    }

    if (ligne.engagement_statut === "actif") {
        return (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                Actif
            </span>
        );
    }

    if (ligne.engagement_statut === "rejete") {
        return (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                Rejeté
            </span>
        );
    }

    return (
        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
            Engagement
        </span>
    );
}