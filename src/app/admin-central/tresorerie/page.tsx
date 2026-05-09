"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Landmark,
    TrendingUp,
    TrendingDown,
    Download,
    RefreshCw,
    Plus,
    X,
    Trash2,
} from "lucide-react";

export default function TresoreriePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [campagnes, setCampagnes] = useState<any[]>([]);
    const [bilansCampagnes, setBilansCampagnes] = useState<any[]>([]);
    const [reversements, setReversements] = useState<any[]>([]);
    const [depenses, setDepenses] = useState<any[]>([]);

    const [soldeGlobal, setSoldeGlobal] = useState(0);
    const [entrees, setEntrees] = useState(0);
    const [sorties, setSorties] = useState(0);

    const [dernierMouvement, setDernierMouvement] = useState<any>(null);
    const [mouvements, setMouvements] = useState<any[]>([]);
    const [statsParGeneration, setStatsParGeneration] = useState<any[]>([]);

    const [showAjoutDepense, setShowAjoutDepense] = useState(false);

    const [nouvelleDepense, setNouvelleDepense] = useState({
        campagne_id: "",
        libelle: "",
        montant: "",
        description: "",
        date_depense: new Date().toISOString().split("T")[0],
        categorie: "fonctionnement",
        mode_paiement: "",
        reference_paiement: "",
    });

    const [filterType, setFilterType] = useState("tous");
    const [periode, setPeriode] = useState("mois");

    const [statsPeriod, setStatsPeriod] = useState({
        entreePeriode: 0,
        sortiePeriode: 0,
        evolution: 0,
    });

    const categoriesDepenses = [
        { value: "fonctionnement", label: "🏢 Fonctionnement" },
        { value: "evenement", label: "🎉 Événement" },
        { value: "humanitaire", label: "🤝 Humanitaire" },
        { value: "infrastructure", label: "🏗️ Infrastructure" },
        { value: "communication", label: "📢 Communication" },
        { value: "transport", label: "🚗 Transport" },
        { value: "materiel", label: "🧰 Matériel" },
        { value: "autre", label: "📌 Autre" },
    ];

    useEffect(() => {
        checkAuthAndLoadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periode]);

    const cleanValue = (value: any) => (value ?? "").toString().trim();

    const numberValue = (value: any) => {
        const n = Number(value || 0);
        return Number.isFinite(n) ? n : 0;
    };

    const formatMontant = (montant: any) => {
        return new Intl.NumberFormat("fr-FR").format(numberValue(montant)) + " FCFA";
    };

    const formatDate = (date?: string | null) => {
        if (!date) return "—";

        try {
            return new Date(date).toLocaleDateString("fr-FR");
        } catch {
            return "—";
        }
    };

    const checkAuthAndLoadData = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            router.push("/login");
            return;
        }

        const { data: profile, error } = await supabase
            .from("membres")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (error) {
            alert("Erreur profil : " + error.message);
            router.push("/dashboard");
            return;
        }

        if (profile?.role !== "baliou_padra" && profile?.role !== "super_admin") {
            router.push("/dashboard");
            return;
        }

        await loadTresorerieData();
        setLoading(false);
    };

    const getDateRangeFilter = () => {
        const now = new Date();
        const startDate = new Date();

        if (periode === "mois") {
            startDate.setMonth(now.getMonth() - 1);
        } else if (periode === "trimestre") {
            startDate.setMonth(now.getMonth() - 3);
        } else if (periode === "annee") {
            startDate.setFullYear(now.getFullYear() - 1);
        } else {
            startDate.setMonth(now.getMonth() - 1);
        }

        return { startDate, endDate: now };
    };

    const loadTresorerieData = async () => {
        setRefreshing(true);

        const { startDate, endDate } = getDateRangeFilter();

        const { data: campagnesData, error: campagnesError } = await supabase
            .from("cotisation_campagnes")
            .select("*")
            .order("created_at", { ascending: false });

        if (campagnesError) {
            console.error("Erreur campagnes:", campagnesError);
        }

        setCampagnes(campagnesData || []);

        const { data: bilansData, error: bilansError } = await supabase
            .from("v_bilan_campagnes")
            .select("*")
            .order("annee", { ascending: false });

        if (bilansError) {
            console.error("Erreur bilans campagnes:", bilansError);
        }

        setBilansCampagnes(bilansData || []);

        const { data: reversementsData, error: reversementsError } = await supabase
            .from("reversements_campagnes")
            .select("*, cotisation_campagnes(titre, mode_montant, montant_attendu_par_generation)")
            .eq("statut", "valide")
            .order("date_validation", { ascending: false });

        if (reversementsError) {
            console.error("Erreur reversements:", reversementsError);
        }

        const reversementsList = reversementsData || [];
        setReversements(reversementsList);

        const { data: depensesData, error: depensesError } = await supabase
            .from("depenses_campagnes")
            .select("*, cotisation_campagnes(titre)")
            .neq("statut", "annulee")
            .order("date_depense", { ascending: false });

        if (depensesError) {
            console.error("Erreur dépenses campagnes:", depensesError);
        }

        const depensesList = depensesData || [];
        setDepenses(depensesList);

        let totalEntrees = 0;
        let totalSorties = 0;
        let totalEntreesPeriode = 0;
        let totalSortiesPeriode = 0;

        const mouvementsTemp: any[] = [];

        reversementsList.forEach((v: any) => {
            const montant = numberValue(v.montant);
            const date = v.date_validation || v.date_soumission || v.created_at;

            totalEntrees += montant;

            mouvementsTemp.push({
                id: v.id,
                type: "entree",
                montant,
                libelle: v.cotisation_campagnes?.titre || "Reversement central",
                description: v.commentaire,
                date,
                source: v.generation_nom,
                categorie: "reversement",
                recu_numero: v.recu_numero,
            });

            const dateMvt = new Date(date);
            if (dateMvt >= startDate && dateMvt <= endDate) {
                totalEntreesPeriode += montant;
            }
        });

        depensesList.forEach((d: any) => {
            const montant = numberValue(d.montant);
            const date = d.date_depense || d.created_at;

            totalSorties += montant;

            mouvementsTemp.push({
                id: d.id,
                type: "sortie",
                montant,
                libelle: d.libelle,
                description: d.description,
                date,
                source: d.cotisation_campagnes?.titre || "Bureau Central",
                categorie: d.categorie,
            });

            const dateMvt = new Date(date);
            if (dateMvt >= startDate && dateMvt <= endDate) {
                totalSortiesPeriode += montant;
            }
        });

        mouvementsTemp.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setMouvements(mouvementsTemp);

        setDernierMouvement(mouvementsTemp.length > 0 ? mouvementsTemp[0] : null);

        setEntrees(totalEntrees);
        setSorties(totalSorties);
        setSoldeGlobal(totalEntrees - totalSorties);

        setStatsPeriod({
            entreePeriode: totalEntreesPeriode,
            sortiePeriode: totalSortiesPeriode,
            evolution: totalEntreesPeriode - totalSortiesPeriode,
        });

        const statsMap = new Map();

        reversementsList.forEach((v: any) => {
            if (!v.generation_nom) return;

            const current = statsMap.get(v.generation_nom) || {
                generation: v.generation_nom,
                total: 0,
                nbVersements: 0,
            };

            current.total += numberValue(v.montant);
            current.nbVersements += 1;

            statsMap.set(v.generation_nom, current);
        });

        setStatsParGeneration(
            Array.from(statsMap.values()).sort((a, b) => b.total - a.total)
        );

        setRefreshing(false);
    };

    const mouvementsFiltres = useMemo(() => {
        if (filterType === "entrees") {
            return mouvements.filter((m) => m.type === "entree").slice(0, 30);
        }

        if (filterType === "sorties") {
            return mouvements.filter((m) => m.type === "sortie").slice(0, 30);
        }

        return mouvements.slice(0, 30);
    }, [mouvements, filterType]);

    const getCategorieLabel = (categorie: string) => {
        const cat = categoriesDepenses.find((c) => c.value === categorie);
        return cat ? cat.label : "📌 Autre";
    };

    const getPeriodLabel = () => {
        const now = new Date();

        if (periode === "mois") {
            return `${now.toLocaleString("fr-FR", { month: "long" })} ${now.getFullYear()}`;
        }

        if (periode === "trimestre") {
            const trimestre = Math.floor(now.getMonth() / 3) + 1;
            return `T${trimestre} ${now.getFullYear()}`;
        }

        return `Année ${now.getFullYear()}`;
    };

    const handleAjouterDepense = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nouvelleDepense.campagne_id) {
            alert("Veuillez sélectionner une campagne / budget.");
            return;
        }

        if (!nouvelleDepense.libelle.trim()) {
            alert("Veuillez saisir le libellé de la dépense.");
            return;
        }

        if (!nouvelleDepense.montant || Number(nouvelleDepense.montant) <= 0) {
            alert("Veuillez saisir un montant valide.");
            return;
        }

        const { error } = await supabase.rpc("enregistrer_depense_campagne", {
            p_campagne_id: nouvelleDepense.campagne_id,
            p_libelle: nouvelleDepense.libelle,
            p_montant: Number(nouvelleDepense.montant),
            p_description: nouvelleDepense.description || null,
            p_categorie: nouvelleDepense.categorie || "autre",
            p_date_depense: nouvelleDepense.date_depense || null,
            p_mode_paiement: nouvelleDepense.mode_paiement || null,
            p_reference_paiement: nouvelleDepense.reference_paiement || null,
        });

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Dépense ajoutée avec succès !");

        setShowAjoutDepense(false);

        setNouvelleDepense({
            campagne_id: "",
            libelle: "",
            montant: "",
            description: "",
            date_depense: new Date().toISOString().split("T")[0],
            categorie: "fonctionnement",
            mode_paiement: "",
            reference_paiement: "",
        });

        await loadTresorerieData();
    };

    const handleSupprimerDepense = async (depenseId: string) => {
        if (!confirm("Annuler cette dépense ? Elle restera en historique mais ne sera plus comptabilisée.")) {
            return;
        }

        const { error } = await supabase
            .from("depenses_campagnes")
            .update({
                statut: "annulee",
                updated_at: new Date().toISOString(),
            })
            .eq("id", depenseId);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Dépense annulée !");
        await loadTresorerieData();
    };

    const handleRefresh = async () => {
        await loadTresorerieData();
    };

    const exportMouvements = () => {
        const rows = mouvementsFiltres.map((m) => ({
            Date: formatDate(m.date),
            Type: m.type === "entree" ? "Entrée" : "Sortie",
            Source: m.source || "",
            Libelle: m.libelle || "",
            Montant: m.montant,
            Description: m.description || "",
        }));

        if (rows.length === 0) return;

        const headers = Object.keys(rows[0]);

        const csv =
            "\uFEFF" +
            headers.join(";") +
            "\n" +
            rows.map((r: any) => headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(";")).join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `tresorerie_centrale_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">
                        Chargement de la trésorerie...
                    </p>
                </div>
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
                        <ArrowLeft size={20} /> Retour au tableau de bord
                    </Link>

                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                CAISSE CENTRALE
                            </h1>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">
                                Trésorerie globale du Bureau Central Baliou Padra
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAjoutDepense(true)}
                                className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                <Plus size={16} /> Nouvelle dépense
                            </button>

                            <button
                                onClick={exportMouvements}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-[#146332] transition-all"
                            >
                                <Download size={16} /> Exporter
                            </button>

                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-gray-200 text-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-300 transition-all"
                            >
                                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Solde principal */}
                <div className="bg-black border-4 border-black rounded-2xl p-8 mb-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <Landmark size={48} className="text-[#39ff14] mb-2" />
                            <p className="text-[#39ff14] font-black uppercase text-xs tracking-wider">
                                Solde global consolidé
                            </p>
                            <p className="text-5xl md:text-6xl font-black text-[#39ff14] mt-2">
                                {formatMontant(soldeGlobal)}
                            </p>
                            <p className="text-white/50 text-xs mt-2">
                                Mise à jour : {new Date().toLocaleString()}
                            </p>
                        </div>

                        <div className="text-right">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-green-400 font-black text-xs uppercase">
                                        Entrées
                                    </p>
                                    <p className="text-green-400 font-black text-xl">
                                        {formatMontant(entrees)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-red-400 font-black text-xs uppercase">
                                        Sorties
                                    </p>
                                    <p className="text-red-400 font-black text-xl">
                                        {formatMontant(sorties)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtres */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border-4 border-black rounded-2xl p-4">
                        <label className="block text-black font-black text-sm mb-2">
                            📅 Période
                        </label>
                        <div className="flex gap-2">
                            {["mois", "trimestre", "annee"].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriode(p)}
                                    className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${periode === p
                                            ? "bg-black text-white"
                                            : "bg-gray-100 text-black border-2 border-black"
                                        }`}
                                >
                                    {p === "mois" ? "Mois" : p === "trimestre" ? "Trimestre" : "Année"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border-4 border-black rounded-2xl p-4">
                        <label className="block text-black font-black text-sm mb-2">
                            🔍 Type de mouvement
                        </label>
                        <div className="flex gap-2">
                            {[
                                { value: "tous", label: "Tous" },
                                { value: "entrees", label: "Entrées" },
                                { value: "sorties", label: "Sorties" },
                            ].map((f) => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilterType(f.value)}
                                    className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${filterType === f.value
                                            ? f.value === "entrees"
                                                ? "bg-green-600 text-white"
                                                : f.value === "sorties"
                                                    ? "bg-red-600 text-white"
                                                    : "bg-black text-white"
                                            : "bg-gray-100 text-black border-2 border-black"
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cartes période */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <InfoCard title="Période" value={getPeriodLabel()} />
                    <InfoCard title="Entrées période" value={formatMontant(statsPeriod.entreePeriode)} green />
                    <InfoCard
                        title="Évolution période"
                        value={`${statsPeriod.evolution >= 0 ? "+" : ""}${formatMontant(statsPeriod.evolution)}`}
                        green={statsPeriod.evolution >= 0}
                        red={statsPeriod.evolution < 0}
                    />
                </div>

                {/* Bilans campagnes */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden mb-8">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm">
                            📊 Bilans par campagne centrale
                        </h2>
                    </div>

                    {bilansCampagnes.length === 0 ? (
                        <div className="p-12 text-center text-black/60 italic">
                            Aucune campagne centrale trouvée.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Campagne</th>
                                        <th className="p-3 text-left font-black text-sm">Type</th>
                                        <th className="p-3 text-right font-black text-sm">Entrées</th>
                                        <th className="p-3 text-right font-black text-sm">Dépenses</th>
                                        <th className="p-3 text-right font-black text-sm">Solde</th>
                                        <th className="p-3 text-center font-black text-sm">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bilansCampagnes.map((b) => (
                                        <tr key={b.campagne_id} className="border-b border-black/10">
                                            <td className="p-3 font-black text-black">
                                                {b.titre}
                                                <p className="text-xs text-black/50">
                                                    Année {b.annee}
                                                </p>
                                            </td>
                                            <td className="p-3 text-sm font-bold">
                                                {b.type_cotisation} / {b.mode_montant}
                                            </td>
                                            <td className="p-3 text-right font-black text-green-600">
                                                {formatMontant(b.total_entrees)}
                                            </td>
                                            <td className="p-3 text-right font-black text-red-600">
                                                {formatMontant(b.total_depenses)}
                                            </td>
                                            <td className="p-3 text-right font-black text-blue-700">
                                                {formatMontant(b.solde)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="bg-gray-100 text-black px-3 py-1 rounded-full text-xs font-black uppercase">
                                                    {b.statut}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Dernier mouvement */}
                {dernierMouvement && (
                    <div className="bg-yellow-50 border-4 border-black rounded-2xl p-5 mb-8">
                        <p className="text-xs font-black uppercase text-black/50 mb-1">
                            📌 Dernier mouvement
                        </p>
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <p className="font-black text-black text-lg">
                                    {dernierMouvement.libelle}
                                </p>
                                <p className="text-sm text-black/60">
                                    {dernierMouvement.source || "Bureau Central"} •{" "}
                                    {formatDate(dernierMouvement.date)}
                                    {dernierMouvement.categorie &&
                                        ` • ${getCategorieLabel(dernierMouvement.categorie)}`}
                                </p>
                            </div>
                            <span
                                className={`font-black text-2xl ${dernierMouvement.type === "entree"
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                            >
                                {dernierMouvement.type === "entree" ? "+" : "-"}{" "}
                                {formatMontant(dernierMouvement.montant)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Dépenses récentes */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden mb-8">
                    <div className="bg-black p-4 flex justify-between items-center">
                        <h2 className="text-white font-black uppercase text-sm">
                            💸 Dépenses récentes
                        </h2>
                        <button
                            onClick={() => setShowAjoutDepense(true)}
                            className="text-white font-black text-sm hover:text-[#39ff14] transition-colors flex items-center gap-1"
                        >
                            <Plus size={16} /> Ajouter
                        </button>
                    </div>
                    {depenses.length === 0 ? (
                        <div className="p-12 text-center text-black/60 italic">
                            Aucune dépense enregistrée
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Date</th>
                                        <th className="p-3 text-left font-black text-sm">Campagne</th>
                                        <th className="p-3 text-left font-black text-sm">Libellé</th>
                                        <th className="p-3 text-left font-black text-sm">Catégorie</th>
                                        <th className="p-3 text-right font-black text-sm">Montant</th>
                                        <th className="p-3 text-center font-black text-sm">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {depenses.slice(0, 10).map((depense) => (
                                        <tr key={depense.id} className="border-b border-black/10">
                                            <td className="p-3 text-black/80 text-sm">
                                                {formatDate(depense.date_depense)}
                                            </td>
                                            <td className="p-3 font-bold text-black">
                                                {depense.cotisation_campagnes?.titre || "—"}
                                            </td>
                                            <td className="p-3 font-black text-black">
                                                {depense.libelle}
                                            </td>
                                            <td className="p-3">
                                                <span className="text-sm">
                                                    {getCategorieLabel(depense.categorie)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-black text-red-600">
                                                - {formatMontant(depense.montant)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleSupprimerDepense(depense.id)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Mouvements récents */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden mb-8">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm">
                            📋 Historique des mouvements
                        </h2>
                    </div>
                    {mouvementsFiltres.length === 0 ? (
                        <div className="p-12 text-center text-black/60 italic">
                            Aucun mouvement enregistré
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Date</th>
                                        <th className="p-3 text-left font-black text-sm">Source</th>
                                        <th className="p-3 text-left font-black text-sm">Libellé</th>
                                        <th className="p-3 text-left font-black text-sm">Type</th>
                                        <th className="p-3 text-right font-black text-sm">Montant</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mouvementsFiltres.map((mvt) => (
                                        <tr
                                            key={`${mvt.type}-${mvt.id}`}
                                            className="border-b border-black/10 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="p-3 text-black/80 text-sm">
                                                {formatDate(mvt.date)}
                                            </td>
                                            <td className="p-3 font-black text-black text-sm">
                                                {mvt.source || "Bureau Central"}
                                            </td>
                                            <td className="p-3 text-black/80 text-sm">
                                                {mvt.libelle}
                                            </td>
                                            <td className="p-3">
                                                {mvt.type === "entree" ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit">
                                                        <TrendingUp size={12} /> Entrée
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit">
                                                        <TrendingDown size={12} /> Sortie
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                className={`p-3 text-right font-black ${mvt.type === "entree"
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                    }`}
                                            >
                                                {mvt.type === "entree" ? "+" : "-"}{" "}
                                                {formatMontant(mvt.montant)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Contribution par génération */}
                {statsParGeneration.length > 0 && (
                    <div className="bg-white border-4 border-black rounded-2xl overflow-hidden mb-8">
                        <div className="bg-black p-4">
                            <h2 className="text-white font-black uppercase text-sm">
                                🏆 Contribution par génération
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Génération</th>
                                        <th className="p-3 text-center font-black text-sm">Nombre de versements</th>
                                        <th className="p-3 text-right font-black text-sm">Montant total</th>
                                        <th className="p-3 text-right font-black text-sm">% du total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statsParGeneration.map((stat) => (
                                        <tr key={stat.generation} className="border-b border-black/10">
                                            <td className="p-3 font-black text-black">
                                                {stat.generation}
                                            </td>
                                            <td className="p-3 text-center text-black/80">
                                                {stat.nbVersements}
                                            </td>
                                            <td className="p-3 text-right font-black text-green-600">
                                                {formatMontant(stat.total)}
                                            </td>
                                            <td className="p-3 text-right text-black/80 font-black">
                                                {entrees > 0 ? ((stat.total / entrees) * 100).toFixed(1) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal Ajout Dépense */}
                {showAjoutDepense && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.2)]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-black">
                                    ➕ Nouvelle dépense
                                </h2>
                                <button
                                    onClick={() => setShowAjoutDepense(false)}
                                    className="text-black hover:text-red-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAjouterDepense} className="space-y-4">
                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Campagne / Budget *
                                    </label>
                                    <select
                                        value={nouvelleDepense.campagne_id}
                                        onChange={(e) =>
                                            setNouvelleDepense({
                                                ...nouvelleDepense,
                                                campagne_id: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    >
                                        <option value="">-- Sélectionner une campagne --</option>
                                        {campagnes
                                            .filter((c) => c.statut === "active")
                                            .map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.titre} — {c.annee}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Libellé *
                                    </label>
                                    <input
                                        type="text"
                                        value={nouvelleDepense.libelle}
                                        onChange={(e) =>
                                            setNouvelleDepense({
                                                ...nouvelleDepense,
                                                libelle: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        placeholder="Ex: Achat fournitures"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Montant (FCFA) *
                                    </label>
                                    <input
                                        type="number"
                                        value={nouvelleDepense.montant}
                                        onChange={(e) =>
                                            setNouvelleDepense({
                                                ...nouvelleDepense,
                                                montant: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        placeholder="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Catégorie
                                    </label>
                                    <select
                                        value={nouvelleDepense.categorie}
                                        onChange={(e) =>
                                            setNouvelleDepense({
                                                ...nouvelleDepense,
                                                categorie: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    >
                                        {categoriesDepenses.map((cat) => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Mode de paiement
                                    </label>
                                    <input
                                        type="text"
                                        value={nouvelleDepense.mode_paiement}
                                        onChange={(e) =>
                                            setNouvelleDepense({
                                                ...nouvelleDepense,
                                                mode_paiement: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        placeholder="Espèces, Wave, Orange Money..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Référence paiement
                                    </label>
                                    <input
                                        type="text"
                                        value={nouvelleDepense.reference_paiement}
                                        onChange={(e) =>
                                            setNouvelleDepense({
                                                ...nouvelleDepense,
                                                reference_paiement: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        placeholder="Référence ou numéro reçu"
                                    />
                                </div>

                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={nouvelleDepense.date_depense}
                                        onChange={(e) =>
                                            setNouvelleDepense({
                                                ...nouvelleDepense,
                                                date_depense: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={nouvelleDepense.description}
                                        onChange={(e) =>
                                            setNouvelleDepense({
                                                ...nouvelleDepense,
                                                description: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        rows={3}
                                        placeholder="Détails supplémentaires..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAjoutDepense(false)}
                                        className="flex-1 bg-gray-200 text-black py-3 rounded-xl font-black uppercase text-sm hover:bg-gray-300 transition-all"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-black text-white py-3 rounded-xl font-black uppercase text-sm hover:bg-[#146332] transition-all"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Trésorerie consolidée
                    </p>
                </div>
            </div>
        </div>
    );
}

function InfoCard({
    title,
    value,
    green,
    red,
}: {
    title: string;
    value: string;
    green?: boolean;
    red?: boolean;
}) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-5">
            <p className="text-xs font-black uppercase text-black/50">
                {title}
            </p>
            <p
                className={`text-xl font-black ${green ? "text-green-600" : red ? "text-red-600" : "text-black"
                    }`}
            >
                {value}
            </p>
        </div>
    );
}