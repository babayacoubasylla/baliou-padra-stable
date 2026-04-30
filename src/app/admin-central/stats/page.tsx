"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Users,
    Download,
    RefreshCw,
    PieChart,
    LineChart,
    Activity,
    Award,
    Clock,
    CheckCircle,
    XCircle,
    Landmark,
    Receipt,
    Target,
    AlertTriangle,
    Crown,
    Medal,
    Zap,
} from "lucide-react";

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

const initialStats = {
    membres: {
        total: 0,
        actifs: 0,
        nouveauxMois: 0,
        nouveauxAnnee: 0,
        parGeneration: [] as any[],
        parVille: [] as any[],
        parRole: [] as any[],
        evolutionMensuelle: [] as any[],
    },
    finances: {
        totalCotisations: 0,
        totalVersements: 0,
        totalDepenses: 0,
        soldeGlobal: 0,
        parType: { sibity: 0, mensualite: 0, extraordinaire: 0 },
        cotisationsParGeneration: [] as any[],
        parGeneration: [] as any[],
        evolutionMensuelle: [] as any[],
        objectifs: {
            atteints: 0,
            enCours: 0,
            nonAtteints: 0,
        },
    },
    reversements: {
        total: 0,
        valides: 0,
        enAttente: 0,
        rejetes: 0,
        negociations: 0,
        montantTotal: 0,
        parGeneration: [] as any[],
        tendance: 0,
    },
    cotisationsExtra: {
        total: 0,
        actives: 0,
        terminees: 0,
        collecteTotale: 0,
    },
    performance: {
        meilleureGeneration: "",
        meilleureCollecte: 0,
        membrePlusActif: "Aucun",
        moisRecord: "",
        tauxValidation: 0,
        progressionAnnuelle: 0,
    },
};

export default function StatsPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activePeriod, setActivePeriod] = useState("year");
    const [stats, setStats] = useState(initialStats);
    const [allGenerations, setAllGenerations] = useState<string[]>(GENERATIONS_FIXES);
    const router = useRouter();

    useEffect(() => {
        checkAuthAndLoadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePeriod]);

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

    const parseDateSafe = (value?: string | Date | null): Date | null => {
        if (!value) return null;

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        let text = String(value).trim();

        /**
         * Supabase/Postgres renvoie parfois :
         * "2026-04-29 23:32:27.59"
         * Certains navigateurs parsèrent mal ce format.
         */
        if (/^\d{4}-\d{2}-\d{2} /.test(text)) {
            text = text.replace(" ", "T");
        }

        const d = new Date(text);

        if (Number.isNaN(d.getTime())) {
            console.warn("Date invalide ignorée:", value);
            return null;
        }

        return d;
    };

    const monthLabel = (dateValue: string | Date): string => {
        const d = parseDateSafe(dateValue);
        if (!d) return "Date inconnue";

        return d.toLocaleString("fr-FR", {
            month: "short",
            year: "numeric",
        });
    };

    const getDateFilter = () => {
        const now = new Date();

        if (activePeriod === "month") {
            return {
                start: new Date(now.getFullYear(), now.getMonth(), 1),
                end: now,
            };
        }

        if (activePeriod === "quarter") {
            return {
                start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
                end: now,
            };
        }

        if (activePeriod === "year") {
            return {
                start: new Date(now.getFullYear(), 0, 1),
                end: now,
            };
        }

        return {
            start: null as Date | null,
            end: now,
        };
    };

    const isInPeriod = (dateValue?: string | null, start?: Date | null): boolean => {
        if (!start) return true;

        const d = parseDateSafe(dateValue);

        /**
         * Important :
         * Si la date est invalide, on ne bloque pas le report.
         * Cela évite que les budgets acceptés disparaissent des stats.
         */
        if (!d) return true;

        return d >= start;
    };

    const getCotisationType = (c: any): string => {
        return cleanValue(c.type_cotisation || c.type).toLowerCase();
    };

    const getCotisationDate = (c: any): string | null => {
        return c.date_paiement || c.date_cotisation || null;
    };

    const getBudgetDate = (p: any): string | null => {
        return p.date_reponse || p.date_proposition || p.created_at || null;
    };

    const getBudgetMontantFinal = (p: any): number => {
        return numberValue(p.montant_corrige ?? p.montant_propose);
    };

    const isBudgetAcceptedByGeneration = (p: any): boolean => {
        return cleanValue(p.statut_chef) === "accepte";
    };

    const isBudgetRejected = (p: any): boolean => {
        return cleanValue(p.statut_bc) === "rejete" || cleanValue(p.statut_chef) === "rejete";
    };

    const isBudgetNegotiation = (p: any): boolean => {
        return cleanValue(p.statut_chef) === "negociation";
    };

    const isBudgetBCValidated = (p: any): boolean => {
        return cleanValue(p.statut_bc) === "valide";
    };

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
            console.error("Erreur profil:", profileError);
            router.push("/dashboard");
            return;
        }

        if (profile?.role !== "baliou_padra" && profile?.role !== "super_admin") {
            router.push("/dashboard");
            return;
        }

        await loadAllStats();
        setLoading(false);
    };

    const loadAllStats = async () => {
        setRefreshing(true);

        const { start } = getDateFilter();

        /**
         * 1. MEMBRES
         */
        const { data: membresData, error: membresError } = await supabase
            .from("membres")
            .select("*");

        if (membresError) {
            console.error("Erreur membres:", membresError);
        }

        const membres = membresData || [];

        const memberByUserId = new Map<string, any>();
        const memberById = new Map<string, any>();

        membres.forEach((m: any) => {
            if (m.user_id) memberByUserId.set(String(m.user_id), m);
            if (m.id !== undefined && m.id !== null) memberById.set(String(m.id), m);
        });

        const parGeneration: Record<string, number> = {};
        const parVille: Record<string, number> = {};
        const parRole: Record<string, number> = {};
        const evolutionMembres: Record<string, number> = {};

        membres.forEach((m: any) => {
            const gen = cleanValue(m.generation);
            const ville = cleanValue(m.ville_residence);
            const role = cleanValue(m.role || "membre");

            if (gen) parGeneration[gen] = (parGeneration[gen] || 0) + 1;
            if (ville) parVille[ville] = (parVille[ville] || 0) + 1;
            if (role) parRole[role] = (parRole[role] || 0) + 1;

            if (m.created_at) {
                const mois = monthLabel(m.created_at);
                evolutionMembres[mois] = (evolutionMembres[mois] || 0) + 1;
            }
        });

        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startYear = new Date(now.getFullYear(), 0, 1);

        const nouveauxMois = membres.filter((m: any) => {
            const d = parseDateSafe(m.created_at);
            return d ? d >= startMonth : false;
        }).length;

        const nouveauxAnnee = membres.filter((m: any) => {
            const d = parseDateSafe(m.created_at);
            return d ? d >= startYear : false;
        }).length;

        /**
         * 2. COTISATIONS
         *
         * Ta table cotisations a :
         * - membre_id UUID
         * - type_cotisation
         * - date_paiement
         *
         * Donc on charge tout, puis on associe membre_id à membres.user_id.
         */
        const { data: cotisationsData, error: cotisationsError } = await supabase
            .from("cotisations")
            .select("*");

        if (cotisationsError) {
            console.error("Erreur cotisations:", cotisationsError);
        }

        const cotisationsToutes = cotisationsData || [];

        const cotisations = cotisationsToutes.filter((c: any) =>
            isInPeriod(getCotisationDate(c), start)
        );

        let totalSibity = 0;
        let totalMensualite = 0;
        let totalExtra = 0;

        const cotisationsParGeneration: Record<string, number> = {};
        const financesParGeneration: Record<string, number> = {};
        const cotisationsParMembre: Record<string, number> = {};
        const evolutionFinanciere: Record<string, number> = {};

        cotisations.forEach((c: any) => {
            const montant = numberValue(c.montant);
            const type = getCotisationType(c);

            if (type.includes("sibity")) {
                totalSibity += montant;
            } else if (type.includes("mensualite") || type.includes("mensualité")) {
                totalMensualite += montant;
            } else {
                totalExtra += montant;
            }

            const membreKey = String(c.membre_id || "");
            const membre = memberByUserId.get(membreKey) || memberById.get(membreKey);

            const gen = cleanValue(membre?.generation || "Inconnu");
            const nom = cleanValue(membre?.nom_complet || "Inconnu");

            cotisationsParGeneration[gen] = (cotisationsParGeneration[gen] || 0) + montant;
            financesParGeneration[gen] = (financesParGeneration[gen] || 0) + montant;

            cotisationsParMembre[nom] = (cotisationsParMembre[nom] || 0) + 1;

            const date = getCotisationDate(c);

            if (date) {
                const mois = monthLabel(date);
                evolutionFinanciere[mois] = (evolutionFinanciere[mois] || 0) + montant;
            }
        });

        const totalCotisations = totalSibity + totalMensualite + totalExtra;

        /**
         * 3. BUDGETS / REVERSEMENTS
         *
         * Source correcte :
         * propositions_budgetaires
         *
         * Le report se fait lorsque :
         * statut_chef = accepte
         *
         * Montant reporté :
         * montant_corrige ?? montant_propose
         */
        const { data: propositionsData, error: propositionsError } = await supabase
            .from("propositions_budgetaires")
            .select("*");

        if (propositionsError) {
            console.error("Erreur propositions_budgetaires:", propositionsError);
        }

        const propositionsToutes = propositionsData || [];

        const propositions = propositionsToutes.filter((p: any) => {
            if (!start) return true;

            const d = parseDateSafe(getBudgetDate(p));

            if (!d) {
                return cleanValue(p.statut_chef) === "accepte";
            }

            return d >= start;
        });

        const reversementsParGeneration: Record<string, number> = {};
        let totalVersements = 0;

        propositions.forEach((p: any) => {
            const montant = getBudgetMontantFinal(p);
            const gen = cleanValue(p.generation_nom || "Inconnu");

            if (isBudgetAcceptedByGeneration(p) && cleanValue(p.statut_bc) !== "rejete") {
                totalVersements += montant;

                reversementsParGeneration[gen] = (reversementsParGeneration[gen] || 0) + montant;
                financesParGeneration[gen] = (financesParGeneration[gen] || 0) + montant;

                const date = getBudgetDate(p);

                if (date) {
                    const mois = monthLabel(date);
                    evolutionFinanciere[mois] = (evolutionFinanciere[mois] || 0) + montant;
                }
            }
        });

        console.log("📊 REPORT BUDGET STATS", {
            propositionsToutes: propositionsToutes.length,
            propositionsFiltrees: propositions.length,
            totalVersements,
            reversementsParGeneration,
        });

        const reversementsValides = propositions.filter(isBudgetBCValidated).length;

        const reversementsEnAttente = propositions.filter((p: any) => {
            return (
                isBudgetAcceptedByGeneration(p) &&
                cleanValue(p.statut_bc || "en_attente") === "en_attente"
            );
        }).length;

        const reversementsRejetes = propositions.filter(isBudgetRejected).length;
        const reversementsNegociation = propositions.filter(isBudgetNegotiation).length;

        /**
         * Objectifs budgétaires
         */
        const objectifsAtteints = propositions.filter(isBudgetAcceptedByGeneration).length;

        const objectifsEnCours = propositions.filter((p: any) => {
            const statutChef = cleanValue(p.statut_chef || "en_attente");
            return statutChef === "en_attente" || statutChef === "negociation";
        }).length;

        const objectifsNonAtteints = propositions.filter(isBudgetRejected).length;

        /**
         * 4. DÉPENSES
         */
        const { data: depensesData, error: depensesError } = await supabase
            .from("depenses_centrales")
            .select("*");

        if (depensesError) {
            console.warn("Erreur depenses_centrales:", depensesError.message);
        }

        const depensesToutes = depensesData || [];

        const depenses = depensesToutes.filter((d: any) =>
            isInPeriod(d.date_depense || d.created_at || null, start)
        );

        const totalDepensesVal = depenses.reduce(
            (sum: number, d: any) => sum + numberValue(d.montant),
            0
        );

        depenses.forEach((d: any) => {
            const date = d.date_depense || d.created_at;

            if (date) {
                const mois = monthLabel(date);
                evolutionFinanciere[mois] =
                    (evolutionFinanciere[mois] || 0) - numberValue(d.montant);
            }
        });

        /**
         * 5. COTISATIONS EXTRAORDINAIRES
         */
        let cotisationsExtra: any[] = [];

        const { data: cotisationsExtraData, error: cotisationsExtraError } =
            await supabase.from("cotisations_extraordinaires").select("*");

        if (!cotisationsExtraError && cotisationsExtraData) {
            cotisationsExtra = cotisationsExtraData;
        }

        const cotisExtraActives = cotisationsExtra.filter(
            (c: any) => c.statut === "active"
        ).length;

        const cotisExtraTerminees = cotisationsExtra.filter(
            (c: any) => c.statut === "terminee"
        ).length;

        const collecteExtraTotale = cotisationsExtra.reduce(
            (s: number, c: any) => s + numberValue(c.montant_requis),
            0
        );

        /**
         * 6. PERFORMANCE
         */
        let meilleureGeneration = "";
        let meilleureCollecte = 0;

        Object.entries(financesParGeneration).forEach(([gen, montant]) => {
            if (numberValue(montant) > meilleureCollecte) {
                meilleureCollecte = numberValue(montant);
                meilleureGeneration = gen;
            }
        });

        let membrePlusActif = "Aucun";
        let maxCotisations = 0;

        Object.entries(cotisationsParMembre).forEach(([nom, count]) => {
            if (numberValue(count) > maxCotisations) {
                maxCotisations = numberValue(count);
                membrePlusActif = nom;
            }
        });

        let moisRecord = "";
        let maxMoisMontant = 0;

        Object.entries(evolutionFinanciere).forEach(([mois, montant]) => {
            if (numberValue(montant) > maxMoisMontant) {
                maxMoisMontant = numberValue(montant);
                moisRecord = mois;
            }
        });

        const totalPropositionsPourValidation =
            reversementsValides + reversementsEnAttente + reversementsRejetes;

        const tauxValidation =
            totalPropositionsPourValidation > 0
                ? (reversementsValides / totalPropositionsPourValidation) * 100
                : 0;

        const anneeDerniere = new Date().getFullYear() - 1;

        const cotisationsAnneeDerniere = cotisationsToutes
            .filter((c: any) => {
                const d = parseDateSafe(getCotisationDate(c));
                return d ? d.getFullYear() === anneeDerniere : false;
            })
            .reduce((s: number, c: any) => s + numberValue(c.montant), 0);

        const progressionAnnuelle =
            cotisationsAnneeDerniere > 0
                ? ((totalCotisations - cotisationsAnneeDerniere) / cotisationsAnneeDerniere) * 100
                : 0;

        const soldeGlobal = totalCotisations + totalVersements - totalDepensesVal;

        const dynamicGenerations = Array.from(
            new Set([
                ...GENERATIONS_FIXES,
                ...membres.map((m: any) => cleanValue(m.generation)).filter(Boolean),
                ...propositionsToutes
                    .map((p: any) => cleanValue(p.generation_nom))
                    .filter(Boolean),
            ])
        );

        setStats({
            membres: {
                total: membres.length,
                actifs: membres.filter((m: any) => cleanValue(m.statut_validation) === "valide").length,
                nouveauxMois,
                nouveauxAnnee,
                parGeneration: Object.entries(parGeneration)
                    .map(([name, count]) => ({ name, count: numberValue(count) }))
                    .sort((a, b) => b.count - a.count),
                parVille: Object.entries(parVille)
                    .map(([name, count]) => ({ name, count: numberValue(count) }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
                parRole: Object.entries(parRole).map(([name, count]) => ({
                    name,
                    count: numberValue(count),
                })),
                evolutionMensuelle: Object.entries(evolutionMembres)
                    .map(([mois, count]) => ({ mois, count: numberValue(count) }))
                    .slice(-12),
            },
            finances: {
                totalCotisations,
                totalVersements,
                totalDepenses: totalDepensesVal,
                soldeGlobal,
                parType: {
                    sibity: totalSibity,
                    mensualite: totalMensualite,
                    extraordinaire: totalExtra,
                },
                cotisationsParGeneration: Object.entries(cotisationsParGeneration)
                    .map(([name, montant]) => ({ name, montant: numberValue(montant) }))
                    .sort((a, b) => b.montant - a.montant),
                parGeneration: Object.entries(financesParGeneration)
                    .map(([name, montant]) => ({ name, montant: numberValue(montant) }))
                    .sort((a, b) => b.montant - a.montant),
                evolutionMensuelle: Object.entries(evolutionFinanciere)
                    .map(([mois, montant]) => ({ mois, montant: numberValue(montant) }))
                    .slice(-12),
                objectifs: {
                    atteints: objectifsAtteints,
                    enCours: objectifsEnCours,
                    nonAtteints: objectifsNonAtteints,
                },
            },
            reversements: {
                total: propositions.filter((p: any) => cleanValue(p.statut_chef) !== "en_attente").length,
                valides: reversementsValides,
                enAttente: reversementsEnAttente,
                rejetes: reversementsRejetes,
                negociations: reversementsNegociation,
                montantTotal: totalVersements,
                parGeneration: Object.entries(reversementsParGeneration)
                    .map(([name, montant]) => ({ name, montant: numberValue(montant) }))
                    .sort((a, b) => b.montant - a.montant),
                tendance: reversementsValides >= reversementsEnAttente ? 1 : -1,
            },
            cotisationsExtra: {
                total: cotisationsExtra.length,
                actives: cotisExtraActives,
                terminees: cotisExtraTerminees,
                collecteTotale: collecteExtraTotale,
            },
            performance: {
                meilleureGeneration,
                meilleureCollecte,
                membrePlusActif,
                moisRecord,
                tauxValidation,
                progressionAnnuelle,
            },
        });

        setAllGenerations(dynamicGenerations);
        setRefreshing(false);
    };

    const exportStats = () => {
        const data = {
            date: new Date().toISOString(),
            periode: activePeriod,
            stats,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `statistiques_baliou_padra_${new Date()
            .toISOString()
            .split("T")[0]}.json`;

        a.click();
        URL.revokeObjectURL(url);
    };

    const maxPerformanceTotal = Math.max(
        ...allGenerations.map((gen) => {
            const cotisationsMontant =
                stats.finances.cotisationsParGeneration.find((f: any) => f.name === gen)?.montant || 0;

            const reversementsMontant =
                stats.reversements.parGeneration.find((r: any) => r.name === gen)?.montant || 0;

            return cotisationsMontant + reversementsMontant;
        }),
        1
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">
                        Chargement des statistiques...
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
                                TABLEAU DE BORD STATISTIQUE
                            </h1>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">
                                Analyse complète des données de la communauté
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="flex border-4 border-black rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setActivePeriod("month")}
                                    className={`px-4 py-2 font-black text-sm ${
                                        activePeriod === "month"
                                            ? "bg-black text-white"
                                            : "bg-white text-black"
                                    }`}
                                >
                                    Mois
                                </button>
                                <button
                                    onClick={() => setActivePeriod("quarter")}
                                    className={`px-4 py-2 font-black text-sm ${
                                        activePeriod === "quarter"
                                            ? "bg-black text-white"
                                            : "bg-white text-black"
                                    }`}
                                >
                                    Trimestre
                                </button>
                                <button
                                    onClick={() => setActivePeriod("year")}
                                    className={`px-4 py-2 font-black text-sm ${
                                        activePeriod === "year"
                                            ? "bg-black text-white"
                                            : "bg-white text-black"
                                    }`}
                                >
                                    Année
                                </button>
                                <button
                                    onClick={() => setActivePeriod("all")}
                                    className={`px-4 py-2 font-black text-sm ${
                                        activePeriod === "all"
                                            ? "bg-black text-white"
                                            : "bg-white text-black"
                                    }`}
                                >
                                    Total
                                </button>
                            </div>

                            <button
                                onClick={exportStats}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-[#146332] transition-all"
                            >
                                <Download size={16} /> Exporter
                            </button>

                            <button
                                onClick={loadAllStats}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-gray-200 text-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-300 transition-all"
                            >
                                <RefreshCw
                                    size={16}
                                    className={refreshing ? "animate-spin" : ""}
                                />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPIs Principaux */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <KpiCard
                        title="Membres"
                        value={stats.membres.total}
                        subtitle={`${stats.membres.actifs} actifs • +${stats.membres.nouveauxMois} ce mois`}
                        icon={<Users size={20} />}
                        color="bg-blue-500"
                    />

                    <KpiCard
                        title="Cotisations"
                        value={formatMontant(stats.finances.totalCotisations)}
                        icon={<Receipt size={20} />}
                        color="bg-green-500"
                    />

                    <KpiCard
                        title="Reversements"
                        value={formatMontant(stats.finances.totalVersements)}
                        subtitle="Acceptés par génération"
                        icon={<TrendingUp size={20} />}
                        color="bg-purple-500"
                    />

                    <KpiCard
                        title="Dépenses"
                        value={formatMontant(stats.finances.totalDepenses)}
                        icon={<TrendingDown size={20} />}
                        color="bg-red-500"
                    />

                    <KpiCard
                        title="Solde"
                        value={formatMontant(stats.finances.soldeGlobal)}
                        icon={<Landmark size={20} />}
                        color={stats.finances.soldeGlobal >= 0 ? "bg-green-600" : "bg-red-600"}
                    />

                    <KpiCard
                        title="Validation"
                        value={`${stats.performance.tauxValidation.toFixed(1)}%`}
                        icon={<CheckCircle size={20} />}
                        color="bg-yellow-500"
                    />
                </div>

                {/* Performance et Records */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <RecordCard
                        title="Meilleure génération"
                        value={stats.performance.meilleureGeneration || "—"}
                        subtitle={formatMontant(stats.performance.meilleureCollecte)}
                        icon={<Crown size={24} className="text-yellow-500" />}
                    />

                    <RecordCard
                        title="Membre le plus actif"
                        value={stats.performance.membrePlusActif}
                        subtitle="Plus grand nombre de cotisations"
                        icon={<Medal size={24} className="text-blue-500" />}
                    />

                    <RecordCard
                        title="Mois record"
                        value={stats.performance.moisRecord || "—"}
                        subtitle={formatMontant(
                            stats.finances.evolutionMensuelle.find(
                                (e: any) => e.mois === stats.performance.moisRecord
                            )?.montant || 0
                        )}
                        icon={<Zap size={24} className="text-orange-500" />}
                    />

                    <RecordCard
                        title="Progression annuelle"
                        value={`${stats.performance.progressionAnnuelle >= 0 ? "+" : ""}${stats.performance.progressionAnnuelle.toFixed(1)}%`}
                        subtitle="vs année précédente"
                        icon={
                            <TrendingUp
                                size={24}
                                className={
                                    stats.performance.progressionAnnuelle >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                }
                            />
                        }
                    />
                </div>

                {/* Graphique principal - Évolution financière */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <h3 className="font-black text-black mb-4 flex items-center gap-2">
                        <LineChart size={18} /> Évolution financière
                    </h3>

                    {stats.finances.evolutionMensuelle.length === 0 ? (
                        <p className="text-black/50 font-bold italic">
                            Aucune donnée financière sur la période.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {stats.finances.evolutionMensuelle.map((item: any, idx: number) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-black text-black">{item.mois}</span>
                                        <span
                                            className={`font-black ${
                                                item.montant >= 0
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                            }`}
                                        >
                                            {item.montant >= 0 ? "+" : "-"}
                                            {formatMontant(Math.abs(item.montant))}
                                        </span>
                                    </div>

                                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border border-black">
                                        <div
                                            className={`h-full ${
                                                item.montant >= 0
                                                    ? "bg-green-500"
                                                    : "bg-red-500"
                                            } rounded-full transition-all duration-500`}
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    (Math.abs(item.montant) / 1000000) * 100
                                                )}%`,
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Répartition cotisations */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <PieChart size={18} /> Répartition des cotisations
                        </h3>

                        <div className="space-y-4">
                            <CotisationBar
                                label="📿 Sibity"
                                montant={stats.finances.parType.sibity}
                                total={stats.finances.totalCotisations}
                                color="bg-purple-500"
                            />

                            <CotisationBar
                                label="📅 Mensualités"
                                montant={stats.finances.parType.mensualite}
                                total={stats.finances.totalCotisations}
                                color="bg-blue-500"
                            />

                            <CotisationBar
                                label="⚡ Extraordinaire"
                                montant={stats.finances.parType.extraordinaire}
                                total={stats.finances.totalCotisations}
                                color="bg-orange-500"
                            />
                        </div>
                    </div>

                    {/* Top générations */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <Award size={18} /> Top générations par contribution
                        </h3>

                        {stats.finances.parGeneration.length === 0 ? (
                            <p className="text-black/50 font-bold italic">
                                Aucune contribution enregistrée.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {stats.finances.parGeneration.slice(0, 5).map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between items-center border-b border-black/10 py-2"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black text-black/40">
                                                #{idx + 1}
                                            </span>
                                            <span className="font-black text-black">
                                                {item.name}
                                            </span>
                                        </div>

                                        <span className="font-black text-green-600">
                                            {formatMontant(item.montant)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Évolution membres */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <Users size={18} /> Évolution des membres
                        </h3>

                        <div className="space-y-2">
                            {stats.membres.evolutionMensuelle.slice(-6).map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-black/70">{item.mois}</span>
                                    <span className="font-black text-black">+{item.count}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-3 border-t-2 border-black/10">
                            <div className="flex justify-between">
                                <span className="text-black/70">Nouveaux ce mois</span>
                                <span className="font-black text-green-600">
                                    +{stats.membres.nouveauxMois}
                                </span>
                            </div>

                            <div className="flex justify-between mt-1">
                                <span className="text-black/70">Nouveaux cette année</span>
                                <span className="font-black text-green-600">
                                    +{stats.membres.nouveauxAnnee}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* État reversements */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <Activity size={18} /> État des reversements
                        </h3>

                        <div className="space-y-3">
                            <StatLine
                                icon={<CheckCircle size={16} className="text-green-500" />}
                                label="Validés BC"
                                value={stats.reversements.valides}
                                color="text-green-600"
                            />

                            <StatLine
                                icon={<Clock size={16} className="text-yellow-500" />}
                                label="En attente BC"
                                value={stats.reversements.enAttente}
                                color="text-yellow-600"
                            />

                            <StatLine
                                icon={<XCircle size={16} className="text-red-500" />}
                                label="Rejetés"
                                value={stats.reversements.rejetes}
                                color="text-red-600"
                            />
                        </div>

                        <div className="mt-4 pt-3 border-t-2 border-black/10">
                            <div className="flex justify-between">
                                <span className="text-black/70">Montant accepté</span>
                                <span className="font-black text-purple-600">
                                    {formatMontant(stats.reversements.montantTotal)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Objectifs */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <Target size={18} /> Objectifs budgétaires
                        </h3>

                        <div className="space-y-3">
                            <StatLine
                                icon={<CheckCircle size={16} className="text-green-500" />}
                                label="Atteints"
                                value={stats.finances.objectifs.atteints}
                                color="text-green-600"
                            />

                            <StatLine
                                icon={<Clock size={16} className="text-yellow-500" />}
                                label="En cours"
                                value={stats.finances.objectifs.enCours}
                                color="text-yellow-600"
                            />

                            <StatLine
                                icon={<AlertTriangle size={16} className="text-red-500" />}
                                label="Non atteints"
                                value={stats.finances.objectifs.nonAtteints}
                                color="text-red-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Tableau générations */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm">
                            📊 Performance par génération
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left font-black text-sm">
                                        Génération
                                    </th>
                                    <th className="p-3 text-center font-black text-sm">
                                        Membres
                                    </th>
                                    <th className="p-3 text-right font-black text-sm">
                                        Cotisations
                                    </th>
                                    <th className="p-3 text-right font-black text-sm">
                                        Reversements
                                    </th>
                                    <th className="p-3 text-right font-black text-sm">
                                        Total
                                    </th>
                                    <th className="p-3 text-center font-black text-sm">
                                        Performance
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {allGenerations.map((gen, idx) => {
                                    const membresCount =
                                        stats.membres.parGeneration.find((m: any) => m.name === gen)
                                            ?.count || 0;

                                    const cotisationsMontant =
                                        stats.finances.cotisationsParGeneration.find(
                                            (f: any) => f.name === gen
                                        )?.montant || 0;

                                    const reversementsMontant =
                                        stats.reversements.parGeneration.find(
                                            (r: any) => r.name === gen
                                        )?.montant || 0;

                                    const total = cotisationsMontant + reversementsMontant;
                                    const performance = (total / maxPerformanceTotal) * 100;

                                    return (
                                        <tr
                                            key={idx}
                                            className="border-b border-black/10 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="p-3 font-black text-black">{gen}</td>

                                            <td className="p-3 text-center text-black/70">
                                                {membresCount}
                                            </td>

                                            <td className="p-3 text-right text-green-600 font-black">
                                                {formatMontant(cotisationsMontant)}
                                            </td>

                                            <td className="p-3 text-right text-purple-600 font-black">
                                                {formatMontant(reversementsMontant)}
                                            </td>

                                            <td className="p-3 text-right text-blue-600 font-black">
                                                {formatMontant(total)}
                                            </td>

                                            <td className="p-3 text-center">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-green-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${Math.min(100, performance)}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pied de page */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Tableau de bord statistique
                    </p>
                </div>
            </div>
        </div>
    );
}

function KpiCard({
    title,
    value,
    subtitle,
    icon,
    color,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-2">
                <div className={`${color} p-2 rounded-xl text-white`}>{icon}</div>
                <span className="text-xs font-black uppercase text-black/40">KPI</span>
            </div>

            <p className="text-xl font-black text-black">{value}</p>
            <p className="text-xs font-black uppercase text-black/50 mt-1">{title}</p>

            {subtitle && <p className="text-xs text-black/40 mt-2">{subtitle}</p>}
        </div>
    );
}

function RecordCard({
    title,
    value,
    subtitle,
    icon,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-xs font-black uppercase text-black/40">Record</span>
            </div>

            <p className="text-lg font-black text-black truncate">{value}</p>
            <p className="text-sm font-black text-black/70">{title}</p>

            {subtitle && <p className="text-xs text-black/40 mt-1">{subtitle}</p>}
        </div>
    );
}

function CotisationBar({
    label,
    montant,
    total,
    color,
}: {
    label: string;
    montant: number;
    total: number;
    color: string;
}) {
    const percent = total > 0 ? (montant / total) * 100 : 0;

    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="font-black text-black">{label}</span>
                <span className="font-black text-black/70">
                    {new Intl.NumberFormat("fr-FR").format(montant)} FCFA
                </span>
            </div>

            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                ></div>
            </div>
        </div>
    );
}

function StatLine({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
                {icon} {label}
            </span>
            <span className={`font-black ${color}`}>{value}</span>
        </div>
    );
}