"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
    Wallet,
    Users,
    Download,
    RefreshCw,
    Plus,
    X,
    Search,
    DollarSign,
    Receipt,
    CreditCard,
    Printer,
    Eye,
    Landmark,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
} from "lucide-react";

export default function TresorierDashboard() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [activeTab, setActiveTab] = useState<"cotisations" | "budget">("cotisations");

    const [user, setUser] = useState<any>(null);
    const [generation, setGeneration] = useState<any>(null);

    const [membres, setMembres] = useState<any[]>([]);
    const [cotisations, setCotisations] = useState<any[]>([]);
    const [propositionsBudget, setPropositionsBudget] = useState<any[]>([]);

    const [stats, setStats] = useState({
        totalSibity: 0,
        totalMensualite: 0,
        totalGlobal: 0,
        objectif: 0,
        progression: 0,
        membresActifs: 0,
        tauxParticipation: 0,
    });

    const [showAjoutModal, setShowAjoutModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCotisation, setSelectedCotisation] = useState<any>(null);

    const [selectedProposition, setSelectedProposition] = useState<any>(null);
    const [showNegociationModal, setShowNegociationModal] = useState(false);
    const [showRejetModal, setShowRejetModal] = useState(false);
    const [montantNegocie, setMontantNegocie] = useState("");
    const [commentaireNegocie, setCommentaireNegocie] = useState("");
    const [commentaireRejet, setCommentaireRejet] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("tous");
    const [filterMois, setFilterMois] = useState("tous");

    const [formData, setFormData] = useState({
        membre_id: "",
        type: "sibity",
        montant: "",
        date_cotisation: new Date().toISOString().split("T")[0],
        description: "",
    });

    const [visibilite, setVisibilite] = useState("prive");

    const typesCotisation = [
        { value: "sibity", label: "📿 Sibity", montant_defaut: 5000 },
        { value: "mensualite", label: "📅 Mensualité", montant_defaut: 10000 },
    ];

    useEffect(() => {
        checkAuthAndLoadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanValue = (value: any): string => {
        return (value ?? "").toString().trim();
    };

    const isValide = (membre: any): boolean => {
        return cleanValue(membre?.statut_validation || "en_attente") === "valide";
    };

    const formatDate = (date?: string | null): string => {
        if (!date) return "";
        try {
            return new Date(date).toLocaleDateString("fr-FR");
        } catch {
            return "";
        }
    };

    const getMoisLabel = (date?: string | null): string => {
        if (!date) return "";
        try {
            return new Date(date).toLocaleString("fr-FR", {
                month: "long",
                year: "numeric",
            });
        } catch {
            return "";
        }
    };

    const formatMontant = (montant: any) => {
        return new Intl.NumberFormat("fr-FR").format(Number(montant || 0)) + " FCFA";
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
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (error) {
            alert("Erreur profil : " + error.message);
            router.push("/dashboard");
            return;
        }

        if (!profile || !["tresorier", "tresorier_adjoint"].includes(profile.role)) {
            router.push("/dashboard");
            return;
        }

        setUser(profile);

        if (profile.generation) {
            await loadGenerationData(profile.generation);
            await loadMembres(profile.generation);
            await loadCotisations(profile.generation);
            await loadPropositionsBudget(profile.generation);
        }

        setLoading(false);
    };

    const loadGenerationData = async (generationNom: any) => {
        const { data: genData } = await supabase
            .from("generations")
            .select("*")
            .eq("nom", generationNom)
            .maybeSingle();

        if (genData) {
            setGeneration(genData);
            setVisibilite(genData.visibilite_finances || "prive");
        }
    };

    const loadMembres = async (generationNom: any) => {
        const { data, error } = await supabase
            .from("membres")
            .select("*")
            .eq("generation", generationNom)
            .eq("statut_validation", "valide")
            .order("nom_complet", { ascending: true });

        if (error) {
            console.error("Erreur membres:", error);
            setMembres([]);
            return;
        }

        setMembres(data || []);
    };

    const loadCotisations = async (generationNom: any) => {
        setRefreshing(true);

        const { data: membresGen, error: membresError } = await supabase
            .from("membres")
            .select("id")
            .eq("generation", generationNom)
            .eq("statut_validation", "valide");

        if (membresError) {
            console.error("Erreur membres cotisations:", membresError);
            setCotisations([]);
            setRefreshing(false);
            return;
        }

        const membreIds = membresGen?.map((m) => m.id) || [];

        if (membreIds.length > 0) {
            const { data: cotisationsData, error: cotisationsError } = await supabase
                .from("cotisations")
                .select("*, membres(nom_complet)")
                .in("membre_id", membreIds)
                .order("date_cotisation", { ascending: false });

            if (cotisationsError) {
                console.error("Erreur cotisations:", cotisationsError);
                setCotisations([]);
                setRefreshing(false);
                return;
            }

            setCotisations(cotisationsData || []);
            await calculateStats(cotisationsData || [], membreIds);
        } else {
            setCotisations([]);
            setStats({
                totalSibity: 0,
                totalMensualite: 0,
                totalGlobal: 0,
                objectif: generation?.objectif_annuel || 0,
                progression: 0,
                membresActifs: 0,
                tauxParticipation: 0,
            });
        }

        setRefreshing(false);
    };

    const loadPropositionsBudget = async (generationNom: any) => {
        if (!generationNom) return;

        const { data, error } = await supabase
            .from("propositions_budgetaires")
            .select("*")
            .eq("generation_nom", generationNom)
            .order("id", { ascending: false });

        if (error) {
            console.error("Erreur propositions budget:", error);
            setPropositionsBudget([]);
            return;
        }

        setPropositionsBudget(data || []);
    };

    const refreshAll = async () => {
        if (!user?.generation) return;

        setRefreshing(true);
        await loadMembres(user.generation);
        await loadCotisations(user.generation);
        await loadPropositionsBudget(user.generation);
        setRefreshing(false);
    };

    const calculateStats = async (cotisationsData: any[], membreIds: any[]) => {
        let totalSibity = 0;
        let totalMensualite = 0;
        const membresPayeurs = new Set();

        cotisationsData.forEach((c) => {
            if (c.type === "sibity") {
                totalSibity += Number(c.montant || 0);
            } else if (c.type === "mensualite") {
                totalMensualite += Number(c.montant || 0);
            }

            membresPayeurs.add(c.membre_id);
        });

        const totalGlobal = totalSibity + totalMensualite;
        const objectif = generation?.objectif_annuel || 5000000;
        const progression = objectif > 0 ? (totalGlobal / objectif) * 100 : 0;
        const membresActifs = membresPayeurs.size;
        const tauxParticipation =
            membreIds.length > 0 ? (membresActifs / membreIds.length) * 100 : 0;

        setStats({
            totalSibity,
            totalMensualite,
            totalGlobal,
            objectif,
            progression,
            membresActifs,
            tauxParticipation,
        });
    };

    const handleAjouterCotisation = async (e: any) => {
        e.preventDefault();

        if (!formData.membre_id || !formData.montant) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        const { error } = await supabase.from("cotisations").insert([
            {
                membre_id: Number(formData.membre_id),
                type: formData.type,
                montant: parseInt(formData.montant),
                date_cotisation: formData.date_cotisation,
                description: formData.description || null,
            },
        ]);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Cotisation enregistrée avec succès !");
        setShowAjoutModal(false);
        setFormData({
            membre_id: "",
            type: "sibity",
            montant: "",
            date_cotisation: new Date().toISOString().split("T")[0],
            description: "",
        });

        await loadCotisations(user.generation);
    };

    const handleSupprimerCotisation = async (cotisationId: any) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette cotisation ?")) return;

        const { error } = await supabase
            .from("cotisations")
            .delete()
            .eq("id", cotisationId);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Cotisation supprimée");
        await loadCotisations(user.generation);
    };

    const handleTypeChange = (type: any) => {
        const typeInfo = typesCotisation.find((t) => t.value === type);

        setFormData({
            ...formData,
            type,
            montant: typeInfo?.montant_defaut?.toString() || "",
        });
    };

    const getMembreNom = (membreId: any) => {
        const membre = membres.find((m) => m.id === membreId);
        return membre?.nom_complet || "Inconnu";
    };

    const exportCotisations = () => {
        const data = cotisationsFiltered.map((c: any) => ({
            Date: formatDate(c.date_cotisation),
            Membre: c.membres?.nom_complet || "Inconnu",
            Type: c.type === "sibity" ? "Sibity" : "Mensualité",
            Montant: c.montant,
            Description: c.description || "",
        }));

        if (data.length === 0) return;

        const csv = [
            Object.keys(data[0]).join(";"),
            ...data.map((row) => Object.values(row).join(";")),
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `cotisations_${user?.generation}_${new Date()
            .toISOString()
            .split("T")[0]}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    };

    const imprimerRecu = (cotisation: any) => {
        const recuHtml = `
            <html>
            <head>
                <title>Reçu de cotisation</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; color: #146332; }
                    .content { border: 2px solid black; padding: 20px; }
                    .field { margin: 10px 0; }
                    .label { font-weight: bold; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">BALIOU PADRA</div>
                    <div>Communauté Cheikh Yacouba Sylla</div>
                </div>
                <div class="content">
                    <h2>REÇU DE COTISATION</h2>
                    <div class="field"><span class="label">Date :</span> ${formatDate(
            cotisation.date_cotisation
        )}</div>
                    <div class="field"><span class="label">Membre :</span> ${cotisation.membres?.nom_complet || "Inconnu"
            }</div>
                    <div class="field"><span class="label">Génération :</span> ${user?.generation || ""
            }</div>
                    <div class="field"><span class="label">Type :</span> ${cotisation.type === "sibity" ? "Sibity" : "Mensualité"
            }</div>
                    <div class="field"><span class="label">Montant :</span> ${formatMontant(
                cotisation.montant
            )}</div>
                    ${cotisation.description
                ? `<div class="field"><span class="label">Description :</span> ${cotisation.description}</div>`
                : ""
            }
                </div>
                <div class="footer">
                    Merci pour votre contribution à la communauté
                </div>
            </body>
            </html>
        `;

        const win = window.open();

        if (!win) {
            alert("Impossible d'ouvrir la fenêtre d'impression.");
            return;
        }

        win.document.write(recuHtml);
        win.document.close();
        win.print();
    };

    const handleAccepterBudget = async (prop: any) => {
        if (!prop?.id) {
            alert("Proposition introuvable.");
            return;
        }

        const { data, error } = await supabase.rpc("repondre_budget_generation", {
            p_proposition_id: Number(prop.id),
            p_action: "accepte",
            p_montant_corrige: null,
            p_commentaire: null,
        });

        if (error) {
            console.error("Erreur acceptation budget:", error);
            alert("Erreur: " + error.message);
            return;
        }

        console.log("Budget accepté par trésorier:", data);
        alert("✅ Proposition acceptée côté génération !");

        await loadPropositionsBudget(user.generation);
    };

    const handleNegocierBudget = async () => {
        if (!selectedProposition?.id) {
            alert("Proposition introuvable.");
            return;
        }

        if (!montantNegocie) {
            alert("Entrez un montant corrigé.");
            return;
        }

        const { data, error } = await supabase.rpc("repondre_budget_generation", {
            p_proposition_id: Number(selectedProposition.id),
            p_action: "negociation",
            p_montant_corrige: Number(montantNegocie),
            p_commentaire: commentaireNegocie || null,
        });

        if (error) {
            console.error("Erreur négociation budget:", error);
            alert("Erreur: " + error.message);
            return;
        }

        console.log("Budget négocié par trésorier:", data);
        alert("💬 Négociation envoyée côté génération !");

        setShowNegociationModal(false);
        setSelectedProposition(null);
        setMontantNegocie("");
        setCommentaireNegocie("");

        await loadPropositionsBudget(user.generation);
    };

    const handleRejeterBudget = async () => {
        if (!selectedProposition?.id) {
            alert("Proposition introuvable.");
            return;
        }

        if (!commentaireRejet) {
            alert("Indiquez un motif de rejet.");
            return;
        }

        const { data, error } = await supabase.rpc("repondre_budget_generation", {
            p_proposition_id: Number(selectedProposition.id),
            p_action: "rejete",
            p_montant_corrige: null,
            p_commentaire: commentaireRejet,
        });

        if (error) {
            console.error("Erreur rejet budget:", error);
            alert("Erreur: " + error.message);
            return;
        }

        console.log("Budget rejeté par trésorier:", data);
        alert("❌ Proposition rejetée côté génération !");

        setShowRejetModal(false);
        setSelectedProposition(null);
        setCommentaireRejet("");

        await loadPropositionsBudget(user.generation);
    };

    const getStatutBCBadge = (statut?: string | null) => {
        const value = cleanValue(statut || "en_attente");

        if (value === "valide") {
            return (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">
                    <CheckCircle size={14} /> Validé BC
                </span>
            );
        }

        if (value === "rejete") {
            return (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black">
                    <X size={14} /> Rejeté BC
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">
                <Clock size={14} /> En attente BC
            </span>
        );
    };

    const getStatutGenerationBadge = (statut?: string | null) => {
        const value = cleanValue(statut || "en_attente");

        if (value === "accepte") {
            return (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">
                    <CheckCircle size={14} /> Accepté génération
                </span>
            );
        }

        if (value === "rejete") {
            return (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black">
                    <X size={14} /> Rejeté génération
                </span>
            );
        }

        if (value === "negociation") {
            return (
                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-black">
                    <AlertCircle size={14} /> Négociation
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">
                <Clock size={14} /> En attente génération
            </span>
        );
    };

    const cotisationsFiltered = cotisations.filter((c) => {
        const matchSearch =
            searchTerm === "" ||
            c.membres?.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchType = filterType === "tous" || c.type === filterType;

        const matchMois =
            filterMois === "tous" || getMoisLabel(c.date_cotisation) === filterMois;

        return matchSearch && matchType && matchMois;
    });

    const moisUniques = [
        ...new Set(
            cotisations
                .map((c) => getMoisLabel(c.date_cotisation))
                .filter(Boolean)
        ),
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">
                        Chargement de l'espace trésorier...
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
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Wallet size={32} className="text-blue-600" />
                                <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                    ESPACE TRÉSORIER
                                </h1>
                            </div>

                            <div className="h-1 w-32 bg-black mt-2"></div>

                            <p className="text-black/60 mt-2">
                                {user?.generation} • {user?.nom_complet}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setShowAjoutModal(true)}
                                className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                <Plus size={16} /> Nouvelle cotisation
                            </button>

                            <button
                                onClick={exportCotisations}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-[#146332] transition-all disabled:opacity-40"
                                disabled={cotisations.length === 0}
                            >
                                <Download size={16} /> Exporter
                            </button>

                            <button
                                onClick={refreshAll}
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

                {/* Visibilité */}
                <div
                    className="mb-6 p-3 rounded-xl text-center text-sm font-black"
                    style={{
                        backgroundColor: visibilite === "public" ? "#dcfce7" : "#fef3c7",
                        color: visibilite === "public" ? "#166534" : "#92400e",
                    }}
                >
                    {visibilite === "public" ? (
                        <span className="flex items-center justify-center gap-2">
                            🌍 Les finances de la génération sont visibles par tous les membres
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            🔒 Les finances sont visibles uniquement par le Chef et le Trésorier
                        </span>
                    )}
                </div>

                {/* KPI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">
                                Total Sibity
                            </p>
                        </div>
                        <p className="text-xl font-black text-black">
                            {formatMontant(stats.totalSibity)}
                        </p>
                    </div>

                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">
                                Total Mensualités
                            </p>
                        </div>
                        <p className="text-xl font-black text-black">
                            {formatMontant(stats.totalMensualite)}
                        </p>
                    </div>

                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Landmark size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">
                                Collecte globale
                            </p>
                        </div>
                        <p className="text-xl font-black text-black">
                            {formatMontant(stats.totalGlobal)}
                        </p>
                    </div>

                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Users size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">
                                Taux participation
                            </p>
                        </div>
                        <p className="text-xl font-black text-black">
                            {stats.tauxParticipation.toFixed(0)}%
                        </p>
                    </div>
                </div>

                {/* Progression */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="font-black text-black">
                            Progression vers l'objectif annuel
                        </span>
                        <span className="font-black text-black">
                            {stats.progression.toFixed(1)}%
                        </span>
                    </div>

                    <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, stats.progression)}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between mt-2 text-sm">
                        <span className="text-black/60">0 FCFA</span>
                        <span className="font-black text-black">
                            {formatMontant(stats.objectif)}
                        </span>
                    </div>
                </div>

                {/* Onglets */}
                <div className="flex gap-3 mb-6 border-b-4 border-black">
                    <button
                        onClick={() => setActiveTab("cotisations")}
                        className={`px-6 py-3 font-black uppercase rounded-t-2xl ${activeTab === "cotisations"
                                ? "bg-black text-white"
                                : "bg-gray-100 text-black"
                            }`}
                    >
                        💰 Cotisations
                    </button>

                    <button
                        onClick={() => setActiveTab("budget")}
                        className={`px-6 py-3 font-black uppercase rounded-t-2xl ${activeTab === "budget"
                                ? "bg-black text-white"
                                : "bg-gray-100 text-black"
                            }`}
                    >
                        📋 Budget génération ({propositionsBudget.length})
                    </button>
                </div>

                {/* Onglet Cotisations */}
                {activeTab === "cotisations" && (
                    <>
                        {/* Filtres */}
                        <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-black font-black text-sm mb-1">
                                        🔍 Recherche
                                    </label>
                                    <div className="relative">
                                        <Search
                                            size={16}
                                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Membre..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-black font-black text-sm mb-1">
                                        📋 Type
                                    </label>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                                    >
                                        <option value="tous">Tous les types</option>
                                        <option value="sibity">📿 Sibity</option>
                                        <option value="mensualite">📅 Mensualité</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-black font-black text-sm mb-1">
                                        📅 Mois
                                    </label>
                                    <select
                                        value={filterMois}
                                        onChange={(e) => setFilterMois(e.target.value)}
                                        className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                                    >
                                        <option value="tous">Tous les mois</option>
                                        {moisUniques.map((mois) => (
                                            <option key={mois} value={mois}>
                                                {mois}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setSearchTerm("");
                                            setFilterType("tous");
                                            setFilterMois("tous");
                                        }}
                                        className="w-full p-2 border-4 border-black rounded-xl font-black text-sm bg-gray-100 hover:bg-gray-200 transition-all"
                                    >
                                        Réinitialiser
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Liste cotisations */}
                        <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                            <div className="bg-black p-4 flex justify-between items-center">
                                <h2 className="text-white font-black uppercase text-sm">
                                    📋 Historique des cotisations
                                </h2>
                                <span className="text-white/70 text-sm font-black">
                                    {cotisationsFiltered.length} enregistrement(s)
                                </span>
                            </div>

                            {cotisationsFiltered.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Receipt size={48} className="mx-auto text-black/30 mb-4" />
                                    <p className="text-xl font-black text-black/60 italic">
                                        Aucune cotisation enregistrée
                                    </p>
                                    <p className="text-black/40 mt-2">
                                        Cliquez sur "Nouvelle cotisation" pour commencer
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="p-3 text-left font-black text-sm">
                                                    Date
                                                </th>
                                                <th className="p-3 text-left font-black text-sm">
                                                    Membre
                                                </th>
                                                <th className="p-3 text-left font-black text-sm">
                                                    Type
                                                </th>
                                                <th className="p-3 text-right font-black text-sm">
                                                    Montant
                                                </th>
                                                <th className="p-3 text-center font-black text-sm">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {cotisationsFiltered.map((cotisation) => (
                                                <tr
                                                    key={cotisation.id}
                                                    className="border-b border-black/10 hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="p-3 text-black/60 text-sm">
                                                        {formatDate(cotisation.date_cotisation)}
                                                    </td>
                                                    <td className="p-3 font-black text-black">
                                                        {cotisation.membres?.nom_complet || "Inconnu"}
                                                    </td>
                                                    <td className="p-3">
                                                        <span
                                                            className={`text-xs px-2 py-1 rounded-full font-black ${cotisation.type === "sibity"
                                                                    ? "bg-purple-100 text-purple-800"
                                                                    : "bg-blue-100 text-blue-800"
                                                                }`}
                                                        >
                                                            {cotisation.type === "sibity"
                                                                ? "📿 Sibity"
                                                                : "📅 Mensualité"}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-black text-black">
                                                        {formatMontant(cotisation.montant)}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedCotisation(cotisation);
                                                                    setShowDetailsModal(true);
                                                                }}
                                                                className="text-blue-500 hover:text-blue-700"
                                                                title="Détails"
                                                            >
                                                                <Eye size={18} />
                                                            </button>

                                                            <button
                                                                onClick={() => imprimerRecu(cotisation)}
                                                                className="text-gray-500 hover:text-gray-700"
                                                                title="Imprimer le reçu"
                                                            >
                                                                <Printer size={18} />
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    handleSupprimerCotisation(cotisation.id)
                                                                }
                                                                className="text-red-500 hover:text-red-700"
                                                                title="Supprimer"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Onglet Budget */}
                {activeTab === "budget" && (
                    <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                        <div className="bg-black p-4 flex justify-between items-center">
                            <h2 className="text-white font-black uppercase text-sm">
                                📋 Propositions budgétaires de ma génération
                            </h2>
                            <button
                                onClick={() => loadPropositionsBudget(user.generation)}
                                className="bg-white text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2"
                            >
                                <RefreshCw size={14} /> Actualiser
                            </button>
                        </div>

                        {propositionsBudget.length === 0 ? (
                            <div className="p-12 text-center">
                                <FileText size={48} className="mx-auto text-black/30 mb-4" />
                                <p className="text-xl font-black text-black/60 italic">
                                    Aucune proposition budgétaire
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-black text-sm">
                                                Génération
                                            </th>
                                            <th className="p-3 text-left font-black text-sm">
                                                Année
                                            </th>
                                            <th className="p-3 text-left font-black text-sm">
                                                Montant
                                            </th>
                                            <th className="p-3 text-left font-black text-sm">
                                                Statut BC
                                            </th>
                                            <th className="p-3 text-left font-black text-sm">
                                                Statut Génération
                                            </th>
                                            <th className="p-3 text-center font-black text-sm">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {propositionsBudget.map((prop) => {
                                            const statutGeneration =
                                                prop.statut_chef || "en_attente";
                                            const peutRepondre =
                                                statutGeneration === "en_attente" ||
                                                statutGeneration === "";

                                            return (
                                                <tr
                                                    key={prop.id}
                                                    className="border-b border-black/10"
                                                >
                                                    <td className="p-3 font-black text-black">
                                                        {prop.generation_nom}
                                                    </td>
                                                    <td className="p-3 text-black">
                                                        {prop.annee}
                                                    </td>
                                                    <td className="p-3 font-black text-green-600">
                                                        {formatMontant(prop.montant_propose)}
                                                    </td>
                                                    <td className="p-3">
                                                        {getStatutBCBadge(prop.statut_bc)}
                                                    </td>
                                                    <td className="p-3">
                                                        {getStatutGenerationBadge(prop.statut_chef)}
                                                        {prop.valide_par_role && (
                                                            <p className="text-[10px] text-black/50 mt-1 font-bold">
                                                                Par : {prop.valide_par_role}
                                                            </p>
                                                        )}
                                                        {prop.montant_corrige && (
                                                            <p className="text-[10px] text-orange-700 mt-1 font-bold">
                                                                Montant proposé :{" "}
                                                                {formatMontant(prop.montant_corrige)}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {peutRepondre ? (
                                                            <div className="flex justify-center gap-2">
                                                                <button
                                                                    onClick={() =>
                                                                        handleAccepterBudget(prop)
                                                                    }
                                                                    className="bg-green-600 text-white px-3 py-2 rounded-xl font-black text-xs hover:bg-green-700"
                                                                >
                                                                    ✅ Accepter
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedProposition(prop);
                                                                        setMontantNegocie("");
                                                                        setCommentaireNegocie("");
                                                                        setShowNegociationModal(true);
                                                                    }}
                                                                    className="bg-orange-500 text-white px-3 py-2 rounded-xl font-black text-xs hover:bg-orange-600"
                                                                >
                                                                    💬 Négocier
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedProposition(prop);
                                                                        setCommentaireRejet("");
                                                                        setShowRejetModal(true);
                                                                    }}
                                                                    className="bg-red-600 text-white px-3 py-2 rounded-xl font-black text-xs hover:bg-red-700"
                                                                >
                                                                    ❌ Rejeter
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-black/50 font-black">
                                                                Réponse envoyée
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-6 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Espace Trésorier — Génération {user?.generation}
                    </p>
                </div>
            </div>

            {/* Modal Ajout Cotisation */}
            {showAjoutModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.2)]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-black">
                                💰 Nouvelle cotisation
                            </h2>
                            <button
                                onClick={() => setShowAjoutModal(false)}
                                className="text-black hover:text-red-500"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAjouterCotisation} className="space-y-4">
                            <div>
                                <label className="block text-black font-black mb-1">
                                    Membre *
                                </label>
                                <select
                                    value={formData.membre_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            membre_id: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    required
                                >
                                    <option value="">-- Sélectionner un membre --</option>
                                    {membres.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.nom_complet}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-black font-black mb-1">
                                    Type de cotisation *
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                >
                                    {typesCotisation.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-black font-black mb-1">
                                    Montant (FCFA) *
                                </label>
                                <input
                                    type="number"
                                    value={formData.montant}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            montant: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-black font-black mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.date_cotisation}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            date_cotisation: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-black font-black mb-1">
                                    Description (optionnelle)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    rows={2}
                                    placeholder="Mois de janvier, Événement spécial..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAjoutModal(false)}
                                    className="flex-1 bg-gray-200 py-3 rounded-xl font-black"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-black text-white py-3 rounded-xl font-black hover:bg-[#146332]"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Détails Cotisation */}
            {showDetailsModal && selectedCotisation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-black">
                                📄 Détails de la cotisation
                            </h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-black hover:text-red-500"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="border-b border-black/10 pb-2">
                                <p className="text-xs font-black uppercase text-black/50">
                                    Date
                                </p>
                                <p className="font-black text-black">
                                    {formatDate(selectedCotisation.date_cotisation)}
                                </p>
                            </div>

                            <div className="border-b border-black/10 pb-2">
                                <p className="text-xs font-black uppercase text-black/50">
                                    Membre
                                </p>
                                <p className="font-black text-black">
                                    {getMembreNom(selectedCotisation.membre_id)}
                                </p>
                            </div>

                            <div className="border-b border-black/10 pb-2">
                                <p className="text-xs font-black uppercase text-black/50">
                                    Type
                                </p>
                                <p className="font-black text-black">
                                    {selectedCotisation.type === "sibity"
                                        ? "📿 Sibity"
                                        : "📅 Mensualité"}
                                </p>
                            </div>

                            <div className="border-b border-black/10 pb-2">
                                <p className="text-xs font-black uppercase text-black/50">
                                    Montant
                                </p>
                                <p className="font-black text-green-600">
                                    {formatMontant(selectedCotisation.montant)}
                                </p>
                            </div>

                            {selectedCotisation.description && (
                                <div className="border-b border-black/10 pb-2">
                                    <p className="text-xs font-black uppercase text-black/50">
                                        Description
                                    </p>
                                    <p className="text-black/70">
                                        {selectedCotisation.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-6">
                            <button
                                onClick={() => {
                                    imprimerRecu(selectedCotisation);
                                    setShowDetailsModal(false);
                                }}
                                className="flex-1 bg-black text-white py-3 rounded-xl font-black hover:bg-[#146332]"
                            >
                                Imprimer le reçu
                            </button>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="flex-1 bg-gray-200 py-3 rounded-xl font-black"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Négociation Budget */}
            {showNegociationModal && selectedProposition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-black text-black mb-4">
                            💬 Négocier le budget
                        </h2>

                        <p className="text-black font-black mb-2">
                            Montant initial :{" "}
                            {formatMontant(selectedProposition.montant_propose)}
                        </p>

                        <input
                            type="number"
                            value={montantNegocie}
                            onChange={(e) => setMontantNegocie(e.target.value)}
                            className="w-full p-3 border-4 border-black rounded-xl mb-3 font-black text-black"
                            placeholder="Montant proposé"
                        />

                        <textarea
                            value={commentaireNegocie}
                            onChange={(e) => setCommentaireNegocie(e.target.value)}
                            className="w-full p-3 border-4 border-black rounded-xl mb-4 font-black text-black"
                            rows={3}
                            placeholder="Commentaire / justification"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowNegociationModal(false)}
                                className="flex-1 bg-gray-200 py-3 rounded-xl font-black"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleNegocierBudget}
                                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-black"
                            >
                                Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Rejet Budget */}
            {showRejetModal && selectedProposition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-black text-black mb-4">
                            ❌ Rejeter le budget
                        </h2>

                        <p className="text-black font-black mb-2">
                            Montant : {formatMontant(selectedProposition.montant_propose)}
                        </p>

                        <textarea
                            value={commentaireRejet}
                            onChange={(e) => setCommentaireRejet(e.target.value)}
                            className="w-full p-3 border-4 border-black rounded-xl mb-4 font-black text-black"
                            rows={3}
                            placeholder="Motif du rejet"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejetModal(false)}
                                className="flex-1 bg-gray-200 py-3 rounded-xl font-black"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleRejeterBudget}
                                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black"
                            >
                                Rejeter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}