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

type ActiveTab = "cotisations" | "lignes" | "budget";

export default function TresorierDashboard() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [activeTab, setActiveTab] = useState<ActiveTab>("cotisations");

    const [user, setUser] = useState<any>(null);
    const [generation, setGeneration] = useState<any>(null);

    const [membres, setMembres] = useState<any[]>([]);
    const [cotisations, setCotisations] = useState<any[]>([]);
    const [lignesCotisation, setLignesCotisation] = useState<any[]>([]);
    const [engagements, setEngagements] = useState<any[]>([]);
    const [propositionsBudget, setPropositionsBudget] = useState<any[]>([]);

    const [stats, setStats] = useState({
        totalSibiti: 0,
        totalMensualite: 0,
        totalAutres: 0,
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

    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString("fr-FR", { month: "long" });
    const currentYear = currentDate.getFullYear();

    const [formData, setFormData] = useState({
        membre_id: "",
        ligne_cotisation_id: "",
        engagement_id: "",
        type_cotisation: "sibiti",
        montant: "",
        date_paiement: new Date().toISOString().split("T")[0],
        mois: currentMonth,
        annee: currentYear.toString(),
        notes: "",
    });

    const [visibilite, setVisibilite] = useState("prive");

    const typesCotisation = [
        { value: "sibiti", label: "📿 Sibiti", montant_defaut: 3000 },
        { value: "mensualite", label: "📅 Mensualité", montant_defaut: 10000 },
        { value: "engagement", label: "🤝 Engagement", montant_defaut: 0 },
        { value: "extraordinaire", label: "⚡ Autre cotisation", montant_defaut: 0 },
    ];

    useEffect(() => {
        checkAuthAndLoadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanValue = (value: any): string => {
        return (value ?? "").toString().trim();
    };

    const numberValue = (value: any): number => {
        const n = Number(value || 0);
        return Number.isFinite(n) ? n : 0;
    };

    const formatMontant = (montant: any) => {
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

    const getCotisationType = (cotisation: any): string => {
        return cleanValue(cotisation?.type_cotisation || cotisation?.type).toLowerCase();
    };

    const getCotisationDate = (cotisation: any): string | null => {
        return (
            cotisation?.date_paiement ||
            cotisation?.date_cotisation ||
            cotisation?.created_at ||
            null
        );
    };

    const getCotisationNotes = (cotisation: any): string => {
        return cleanValue(cotisation?.notes || cotisation?.description || "");
    };

    const getLigneTitre = (cotisation: any): string => {
        return cleanValue(
            cotisation?.cotisation_lignes?.titre ||
                cotisation?.ligne_titre ||
                ""
        );
    };

    const getTypeLabel = (cotisation: any): string => {
        const type = getCotisationType(cotisation);

        if (type.includes("sibity") || type.includes("sibiti")) return "📿 Sibiti";
        if (type.includes("mensualite") || type.includes("mensualité")) return "📅 Mensualité";
        if (type.includes("engagement")) return "🤝 Engagement";
        if (type.includes("extraordinaire")) return "⚡ Autre cotisation";

        return type ? `💰 ${type}` : "💰 Cotisation";
    };

    const getLigneTypeLabel = (ligne: any) => {
        const type = cleanValue(ligne?.type_ligne);

        if (type === "sibiti") return "🌍 Sibiti global";
        if (type === "engagement") return "🤝 Engagement libre";
        return "💰 Cotisation";
    };

    const getLigneAmountLabel = (ligne: any) => {
        if (ligne?.type_ligne === "engagement") return "Montant libre";
        return formatMontant(ligne?.montant_cible);
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
            await loadLignesCotisation(profile.generation);
            await loadEngagements(profile.generation);
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
            .eq("est_compte_gestion", false)
            .order("nom_complet", { ascending: true });

        if (error) {
            console.error("Erreur membres:", error);
            setMembres([]);
            return;
        }

        setMembres(data || []);
    };

    const loadLignesCotisation = async (generationNom: any) => {
        const { data: lignesGlobales, error: errorGlobal } = await supabase
            .from("cotisation_lignes")
            .select("*")
            .eq("scope", "global")
            .eq("statut", "active")
            .order("created_at", { ascending: false });

        const { data: lignesGeneration, error: errorGeneration } = await supabase
            .from("cotisation_lignes")
            .select("*")
            .eq("generation_nom", generationNom)
            .eq("statut", "active")
            .order("created_at", { ascending: false });

        if (errorGlobal || errorGeneration) {
            console.error("Erreur lignes cotisation:", errorGlobal || errorGeneration);
            setLignesCotisation([]);
            return;
        }

        setLignesCotisation([...(lignesGlobales || []), ...(lignesGeneration || [])]);
    };

    const loadEngagements = async (generationNom: any) => {
        const { data: engagementsData, error: engagementsError } = await supabase
            .from("cotisation_engagements")
            .select("*")
            .eq("generation_nom", generationNom)
            .order("created_at", { ascending: false });

        if (engagementsError) {
            console.error("Erreur chargement engagements:", engagementsError);
            setEngagements([]);
            return;
        }

        const engagementsRaw = engagementsData || [];

        if (engagementsRaw.length === 0) {
            setEngagements([]);
            return;
        }

        const membreIds = [
            ...new Set(engagementsRaw.map((e) => e.membre_id).filter(Boolean)),
        ];

        const ligneIds = [
            ...new Set(engagementsRaw.map((e) => e.ligne_cotisation_id).filter(Boolean)),
        ];

        const engagementIds = [
            ...new Set(engagementsRaw.map((e) => e.id).filter(Boolean)),
        ];

        const { data: membresData } = await supabase
            .from("membres")
            .select("id, nom_complet, email, telephone, generation")
            .in("id", membreIds);

        const { data: lignesData } = await supabase
            .from("cotisation_lignes")
            .select("id, titre, type_ligne, generation_nom")
            .in("id", ligneIds);

        const { data: paiementsData } = await supabase
            .from("cotisations")
            .select("id, engagement_id, montant, statut")
            .in("engagement_id", engagementIds);

        const membresMap = new Map((membresData || []).map((m) => [Number(m.id), m]));
        const lignesMap = new Map((lignesData || []).map((l) => [String(l.id), l]));

        const paiementsParEngagement = new Map<string, number>();

        (paiementsData || []).forEach((p) => {
            const engagementId = String(p.engagement_id || "");
            if (!engagementId) return;

            const statut = cleanValue(p.statut || "valide");
            if (statut !== "valide") return;

            const montantActuel = paiementsParEngagement.get(engagementId) || 0;

            paiementsParEngagement.set(
                engagementId,
                montantActuel + Number(p.montant || 0)
            );
        });

        const mapped = engagementsRaw.map((e) => {
            const membre = membresMap.get(Number(e.membre_id));
            const ligne = lignesMap.get(String(e.ligne_cotisation_id));

            const montantPropose = Number(e.montant_propose || 0);
            const montantValide =
                e.montant_valide !== null && e.montant_valide !== undefined
                    ? Number(e.montant_valide)
                    : null;

            const montantAttendu = montantValide || montantPropose;
            const montantPaye = paiementsParEngagement.get(String(e.id)) || 0;
            const resteAPayer = Math.max(montantAttendu - montantPaye, 0);

            const progression =
                montantAttendu > 0
                    ? Math.min((montantPaye / montantAttendu) * 100, 100)
                    : 0;

            return {
                engagement_id: e.id,
                ligne_id: e.ligne_cotisation_id,
                titre: ligne?.titre || "Engagement",
                generation_nom: e.generation_nom,
                annee: e.annee,
                membre_id: e.membre_id,
                nom_complet: membre?.nom_complet || "Membre inconnu",
                email: membre?.email || "",
                telephone: membre?.telephone || "",
                montant_propose: montantPropose,
                montant_valide: montantValide,
                montant_paye: montantPaye,
                reste_a_payer: resteAPayer,
                progression,
                message_membre: e.message_membre,
                commentaire_chef: e.commentaire_chef,
                statut: e.statut || "en_attente",
                created_at: e.created_at,
            };
        });

        setEngagements(mapped);
    };

    const loadCotisations = async (generationNom: any) => {
        setRefreshing(true);

        const { data: membresGen, error: membresError } = await supabase
            .from("membres")
            .select("id")
            .eq("generation", generationNom)
            .eq("statut_validation", "valide")
            .eq("est_compte_gestion", false);

        if (membresError) {
            console.error("Erreur membres cotisations:", membresError);
            setCotisations([]);
            setRefreshing(false);
            return;
        }

        const membreIds = membresGen?.map((m) => m.id) || [];

        if (membreIds.length === 0) {
            setCotisations([]);
            setStats({
                totalSibiti: 0,
                totalMensualite: 0,
                totalAutres: 0,
                totalGlobal: 0,
                objectif: generation?.objectif_annuel || 0,
                progression: 0,
                membresActifs: 0,
                tauxParticipation: 0,
            });
            setRefreshing(false);
            return;
        }

        const { data, error } = await supabase
            .from("cotisations")
            .select(
                "*, membres(nom_complet,email), cotisation_lignes(titre,montant_cible,type_ligne,scope), cotisation_engagements(id,statut,montant_propose,montant_valide)"
            )
            .in("membre_id", membreIds)
            .order("date_paiement", { ascending: false });

        if (error) {
            console.warn("Fallback cotisations sans relations:", error.message);

            const fallback = await supabase
                .from("cotisations")
                .select("*")
                .in("membre_id", membreIds)
                .order("date_paiement", { ascending: false });

            if (fallback.error) {
                console.error("Erreur cotisations:", fallback.error);
                setCotisations([]);
                setRefreshing(false);
                return;
            }

            setCotisations(fallback.data || []);
            await calculateStats(fallback.data || [], membreIds);
            setRefreshing(false);
            return;
        }

        setCotisations(data || []);
        await calculateStats(data || [], membreIds);

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
        await loadLignesCotisation(user.generation);
        await loadEngagements(user.generation);
        await loadCotisations(user.generation);
        await loadPropositionsBudget(user.generation);

        setRefreshing(false);
    };

    const calculateStats = async (cotisationsData: any[], membreIds: any[]) => {
        let totalSibiti = 0;
        let totalMensualite = 0;
        let totalAutres = 0;
        const membresPayeurs = new Set();

        cotisationsData.forEach((c) => {
            const type = getCotisationType(c);
            const montant = numberValue(c.montant);

            if (type.includes("sibity") || type.includes("sibiti")) {
                totalSibiti += montant;
            } else if (type.includes("mensualite") || type.includes("mensualité")) {
                totalMensualite += montant;
            } else {
                totalAutres += montant;
            }

            membresPayeurs.add(c.membre_id);
        });

        const totalGlobal = totalSibiti + totalMensualite + totalAutres;
        const objectif = generation?.objectif_annuel || 5000000;
        const progression = objectif > 0 ? (totalGlobal / objectif) * 100 : 0;
        const membresActifs = membresPayeurs.size;
        const tauxParticipation =
            membreIds.length > 0 ? (membresActifs / membreIds.length) * 100 : 0;

        setStats({
            totalSibiti,
            totalMensualite,
            totalAutres,
            totalGlobal,
            objectif,
            progression,
            membresActifs,
            tauxParticipation,
        });
    };

    const resetForm = () => {
        setFormData({
            membre_id: "",
            ligne_cotisation_id: "",
            engagement_id: "",
            type_cotisation: "sibiti",
            montant: "",
            date_paiement: new Date().toISOString().split("T")[0],
            mois: currentMonth,
            annee: currentYear.toString(),
            notes: "",
        });
    };

    const activeEngagementsForSelectedMember = engagements.filter((e) => {
        if (!formData.membre_id) return false;

        const sameMember = Number(e.membre_id) === Number(formData.membre_id);
        const isActive = cleanValue(e.statut) === "actif";

        if (!formData.ligne_cotisation_id) {
            return sameMember && isActive;
        }

        const sameLine = String(e.ligne_id) === String(formData.ligne_cotisation_id);

        return sameMember && isActive && sameLine;
    });

    const handleAjouterCotisation = async (e: any) => {
        e.preventDefault();

        if (!formData.membre_id) {
            alert("Veuillez sélectionner un membre.");
            return;
        }

        if (!formData.ligne_cotisation_id) {
            alert("Veuillez sélectionner une ligne de cotisation.");
            return;
        }

        if (!formData.montant) {
            alert("Veuillez saisir le montant payé.");
            return;
        }

        const selectedLine = lignesCotisation.find(
            (l) => String(l.id) === String(formData.ligne_cotisation_id)
        );

        if (!selectedLine) {
            alert("Ligne de cotisation introuvable.");
            return;
        }

        if (selectedLine.type_ligne === "engagement" && !formData.engagement_id) {
            alert("Veuillez sélectionner l'engagement actif du membre.");
            return;
        }

        const { data, error } = await supabase.rpc("enregistrer_cotisation_generation", {
            p_membre_id: Number(formData.membre_id),
            p_ligne_cotisation_id: formData.ligne_cotisation_id,
            p_montant: Number(formData.montant),
            p_type_cotisation: formData.type_cotisation,
            p_mois: formData.mois || null,
            p_annee: formData.annee ? Number(formData.annee) : currentYear,
            p_date_paiement: formData.date_paiement || null,
            p_notes: formData.notes || null,
            p_engagement_id: formData.engagement_id || null,
        });

        console.log("Cotisation enregistrée:", { data, error });

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Cotisation enregistrée avec succès !");

        setShowAjoutModal(false);
        resetForm();

        await loadEngagements(user.generation);
        await loadCotisations(user.generation);
    };

    const handleSupprimerCotisation = async (cotisationId: any) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette cotisation ?")) return;

        const { error } = await supabase.from("cotisations").delete().eq("id", cotisationId);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Cotisation supprimée");

        await loadEngagements(user.generation);
        await loadCotisations(user.generation);
    };

    const handleTypeChange = (type: any) => {
        const typeInfo = typesCotisation.find((t) => t.value === type);

        setFormData({
            ...formData,
            type_cotisation: type,
            montant: typeInfo?.montant_defaut ? typeInfo.montant_defaut.toString() : "",
        });
    };

    const handleLigneChange = (ligneId: string) => {
        const ligne = lignesCotisation.find((l) => String(l.id) === String(ligneId));

        if (!ligne) {
            setFormData({
                ...formData,
                ligne_cotisation_id: "",
                engagement_id: "",
                montant: "",
            });
            return;
        }

        let nextType = formData.type_cotisation;
        let nextMontant = formData.montant;
        let nextNotes = formData.notes;

        if (ligne.type_ligne === "sibiti") {
            nextType = "sibiti";
            nextMontant = "3000";
            nextNotes = "Paiement Sibiti";
        } else if (ligne.type_ligne === "cotisation") {
            nextType = "extraordinaire";
            nextMontant = ligne.montant_cible ? String(ligne.montant_cible) : "";
            nextNotes = ligne.titre ? `Paiement pour : ${ligne.titre}` : "";
        } else if (ligne.type_ligne === "engagement") {
            nextType = "engagement";
            nextMontant = "";
            nextNotes = ligne.titre ? `Paiement engagement : ${ligne.titre}` : "";
        }

        setFormData({
            ...formData,
            ligne_cotisation_id: ligneId,
            engagement_id: "",
            type_cotisation: nextType,
            montant: nextMontant,
            notes: nextNotes,
        });
    };

    const handleEngagementChange = (engagementId: string) => {
        const engagement = engagements.find((e) => e.engagement_id === engagementId);

        if (!engagement) {
            setFormData({
                ...formData,
                engagement_id: "",
            });
            return;
        }

        const reste = Number(engagement.reste_a_payer || 0);
        const montant = reste > 0 ? String(reste) : "";

        setFormData({
            ...formData,
            engagement_id: engagementId,
            ligne_cotisation_id: engagement.ligne_id,
            type_cotisation: "engagement",
            montant,
            notes: `Paiement engagement : ${engagement.titre}`,
        });
    };

    const handleActiverEngagement = async (engagement: any) => {
        const montantInput = window.prompt(
            `Montant à valider pour ${engagement.nom_complet}`,
            String(engagement.montant_propose || "")
        );

        if (montantInput === null) return;

        const montantValide = Number(montantInput);

        if (!montantValide || montantValide <= 0) {
            alert("Montant invalide.");
            return;
        }

        const commentaire = window.prompt("Commentaire optionnel", "");

        const { data, error } = await supabase.rpc("activer_engagement_generation", {
            p_engagement_id: engagement.engagement_id,
            p_montant_valide: montantValide,
            p_commentaire: commentaire || null,
        });

        console.log("Activation engagement trésorier:", { data, error });

        if (error) {
            alert("Erreur activation engagement : " + error.message);
            return;
        }

        alert("Engagement activé avec succès.");

        await loadEngagements(user.generation);
        await loadCotisations(user.generation);
    };

    const handleRejeterEngagement = async (engagement: any) => {
        const commentaire = window.prompt(
            `Motif du rejet pour ${engagement.nom_complet}`,
            ""
        );

        if (commentaire === null) return;

        const { data, error } = await supabase.rpc("rejeter_engagement_generation", {
            p_engagement_id: engagement.engagement_id,
            p_commentaire: commentaire || null,
        });

        console.log("Rejet engagement trésorier:", { data, error });

        if (error) {
            alert("Erreur rejet engagement : " + error.message);
            return;
        }

        alert("Engagement rejeté.");

        await loadEngagements(user.generation);
        await loadCotisations(user.generation);
    };

    const getMembreNom = (membreId: any) => {
        const membre = membres.find((m) => Number(m.id) === Number(membreId));
        return membre?.nom_complet || "Inconnu";
    };

    const exportCotisations = () => {
        const data = cotisationsFiltered.map((c: any) => ({
            Date: formatDate(getCotisationDate(c)),
            Membre: c.membres?.nom_complet || getMembreNom(c.membre_id),
            Ligne: getLigneTitre(c) || "",
            Type: getTypeLabel(c),
            Montant: c.montant,
            Mois: c.mois || "",
            Annee: c.annee || "",
            Notes: getCotisationNotes(c) || "",
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
                    <div class="field"><span class="label">Date :</span> ${formatDate(getCotisationDate(cotisation))}</div>
                    <div class="field"><span class="label">Membre :</span> ${cotisation.membres?.nom_complet || getMembreNom(cotisation.membre_id)}</div>
                    <div class="field"><span class="label">Génération :</span> ${user?.generation || ""}</div>
                    ${getLigneTitre(cotisation) ? `<div class="field"><span class="label">Ligne :</span> ${getLigneTitre(cotisation)}</div>` : ""}
                    <div class="field"><span class="label">Type :</span> ${getTypeLabel(cotisation)}</div>
                    <div class="field"><span class="label">Montant :</span> ${formatMontant(cotisation.montant)}</div>
                    ${cotisation.mois || cotisation.annee ? `<div class="field"><span class="label">Période :</span> ${cotisation.mois || ""} ${cotisation.annee || ""}</div>` : ""}
                    ${getCotisationNotes(cotisation) ? `<div class="field"><span class="label">Notes :</span> ${getCotisationNotes(cotisation)}</div>` : ""}
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

        const { data, error } = await supabase
            .from("propositions_budgetaires")
            .update({
                statut_chef: "accepte",
                commentaire_chef: null,
                date_reponse: new Date().toISOString(),
                valide_par_membre_id: user?.id || null,
                valide_par_role: user?.role || "tresorier",
            })
            .eq("id", prop.id)
            .select()
            .maybeSingle();

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

        const { data, error } = await supabase
            .from("propositions_budgetaires")
            .update({
                statut_chef: "negociation",
                montant_corrige: Number(montantNegocie),
                commentaire_chef: commentaireNegocie || null,
                date_reponse: new Date().toISOString(),
                valide_par_membre_id: user?.id || null,
                valide_par_role: user?.role || "tresorier",
            })
            .eq("id", selectedProposition.id)
            .select()
            .maybeSingle();

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

        const { data, error } = await supabase
            .from("propositions_budgetaires")
            .update({
                statut_chef: "rejete",
                montant_corrige: null,
                commentaire_chef: commentaireRejet,
                date_reponse: new Date().toISOString(),
                valide_par_membre_id: user?.id || null,
                valide_par_role: user?.role || "tresorier",
            })
            .eq("id", selectedProposition.id)
            .select()
            .maybeSingle();

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

    const getEngagementBadge = (statut?: string | null) => {
        const value = cleanValue(statut || "en_attente");

        if (value === "actif") {
            return (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">
                    ✅ Actif
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

        if (value === "cloture") {
            return (
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-black">
                    🔒 Clôturé
                </span>
            );
        }

        return (
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">
                ⏳ En attente
            </span>
        );
    };

    const cotisationsFiltered = cotisations.filter((c) => {
        const matchSearch =
            searchTerm === "" ||
            c.membres?.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getMembreNom(c.membre_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
            getLigneTitre(c).toLowerCase().includes(searchTerm.toLowerCase());

        const type = getCotisationType(c);

        const matchType =
            filterType === "tous" ||
            type === filterType ||
            (filterType === "mensualite" &&
                (type.includes("mensualite") || type.includes("mensualité"))) ||
            (filterType === "sibity" &&
                (type.includes("sibity") || type.includes("sibiti"))) ||
            (filterType === "engagement" && type.includes("engagement"));

        const matchMois =
            filterMois === "tous" || getMoisLabel(getCotisationDate(c)) === filterMois;

        return matchSearch && matchType && matchMois;
    });

    const moisUniques = [
        ...new Set(
            cotisations.map((c) => getMoisLabel(getCotisationDate(c))).filter(Boolean)
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

                {/* Lignes disponibles */}
                <div className="bg-blue-50 border-4 border-blue-700 rounded-2xl p-4 mb-6">
                    <h2 className="font-black text-blue-900 uppercase text-sm mb-2">
                        🎯 Lignes de cotisation actives
                    </h2>

                    {lignesCotisation.length === 0 ? (
                        <p className="text-sm font-bold text-blue-800">
                            Aucune ligne active créée par le chef de génération.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {lignesCotisation.map((ligne) => (
                                <div
                                    key={ligne.id}
                                    className="bg-white border-2 border-blue-700 rounded-xl p-3"
                                >
                                    <p className="font-black text-blue-900">{ligne.titre}</p>

                                    <p className="text-xs font-black text-black/50 uppercase mt-1">
                                        {ligne.scope === "global" ? "🌍 Global" : "Génération"} •{" "}
                                        {getLigneTypeLabel(ligne)}
                                    </p>

                                    <p className="text-sm font-black text-green-700 mt-1">
                                        {getLigneAmountLabel(ligne)}
                                    </p>

                                    {ligne.date_limite && (
                                        <p className="text-[10px] text-gray-500 font-bold">
                                            Limite : {formatDate(ligne.date_limite)}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* KPI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <KpiBox icon={<DollarSign size={18} />} title="Total Sibiti" value={formatMontant(stats.totalSibity)} />
                    <KpiBox icon={<CreditCard size={18} />} title="Total Mensualités" value={formatMontant(stats.totalMensualite)} />
                    <KpiBox icon={<Landmark size={18} />} title="Collecte globale" value={formatMontant(stats.totalGlobal)} />
                    <KpiBox icon={<Users size={18} />} title="Taux participation" value={`${stats.tauxParticipation.toFixed(0)}%`} />
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
                <div className="flex flex-wrap gap-3 mb-6 border-b-4 border-black">
                    <TabButton
                        active={activeTab === "cotisations"}
                        onClick={() => setActiveTab("cotisations")}
                    >
                        💰 Cotisations
                    </TabButton>

                    <TabButton
                        active={activeTab === "lignes"}
                        onClick={() => setActiveTab("lignes")}
                    >
                        🎯 Lignes & Engagements ({lignesCotisation.length})
                    </TabButton>

                    <TabButton
                        active={activeTab === "budget"}
                        onClick={() => setActiveTab("budget")}
                    >
                        📋 Budget génération ({propositionsBudget.length})
                    </TabButton>
                </div>

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
                                            placeholder="Membre ou ligne..."
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
                                        <option value="sibity">📿 Sibiti</option>
                                        <option value="mensualite">📅 Mensualité</option>
                                        <option value="engagement">🤝 Engagement</option>
                                        <option value="extraordinaire">⚡ Autre cotisation</option>
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
                                                    Ligne
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
                                                        {formatDate(getCotisationDate(cotisation))}
                                                    </td>
                                                    <td className="p-3 font-black text-black">
                                                        {cotisation.membres?.nom_complet ||
                                                            getMembreNom(cotisation.membre_id)}
                                                    </td>
                                                    <td className="p-3 text-xs font-black text-blue-700">
                                                        {getLigneTitre(cotisation) || "—"}
                                                    </td>
                                                    <td className="p-3">
                                                        <span
                                                            className={`text-xs px-2 py-1 rounded-full font-black ${
                                                                getCotisationType(cotisation).includes("sibity") ||
                                                                getCotisationType(cotisation).includes("sibiti")
                                                                    ? "bg-purple-100 text-purple-800"
                                                                    : getCotisationType(cotisation).includes("mensualite") ||
                                                                      getCotisationType(cotisation).includes("mensualité")
                                                                    ? "bg-blue-100 text-blue-800"
                                                                    : getCotisationType(cotisation).includes("engagement")
                                                                    ? "bg-orange-100 text-orange-800"
                                                                    : "bg-gray-100 text-gray-800"
                                                            }`}
                                                        >
                                                            {getTypeLabel(cotisation)}
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

                {/* Onglet Lignes & Engagements */}
                {activeTab === "lignes" && (
                    <div className="space-y-6">
                        <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                            <div className="bg-black p-4">
                                <h2 className="text-white font-black uppercase text-sm">
                                    🎯 Lignes de cotisation de ma génération
                                </h2>
                            </div>

                            {lignesCotisation.length === 0 ? (
                                <div className="p-10 text-center text-black/60 font-black italic">
                                    Aucune ligne de cotisation active.
                                </div>
                            ) : (
                                <div className="divide-y-2 divide-black/10">
                                    {lignesCotisation.map((ligne) => (
                                        <div
                                            key={ligne.id}
                                            className="p-5 flex justify-between items-start gap-4"
                                        >
                                            <div>
                                                <p className="font-black text-black text-lg">
                                                    {ligne.titre}
                                                </p>

                                                <p className="text-sm text-black/60">
                                                    {ligne.description || "—"}
                                                </p>

                                                <p className="text-xs text-black/50 mt-1">
                                                    Type : {getLigneTypeLabel(ligne)} • Année :{" "}
                                                    {ligne.annee}
                                                    {ligne.date_limite
                                                        ? ` • Limite : ${formatDate(ligne.date_limite)}`
                                                        : ""}
                                                </p>

                                                {ligne.scope === "global" && (
                                                    <p className="text-xs font-black text-green-700 mt-1">
                                                        🌍 Ligne globale applicable à tous les membres
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-right">
                                                <p className="font-black text-green-700 text-lg">
                                                    {getLigneAmountLabel(ligne)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                            <div className="bg-black p-4">
                                <h2 className="text-white font-black uppercase text-sm">
                                    🤝 Engagements des membres de ma génération
                                </h2>
                            </div>

                            {engagements.length === 0 ? (
                                <div className="p-10 text-center text-black/60 font-black italic">
                                    Aucun engagement proposé pour le moment.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="p-3 text-left font-black text-sm">
                                                    Membre
                                                </th>
                                                <th className="p-3 text-left font-black text-sm">
                                                    Ligne
                                                </th>
                                                <th className="p-3 text-right font-black text-sm">
                                                    Proposé
                                                </th>
                                                <th className="p-3 text-right font-black text-sm">
                                                    Validé
                                                </th>
                                                <th className="p-3 text-right font-black text-sm">
                                                    Payé
                                                </th>
                                                <th className="p-3 text-center font-black text-sm">
                                                    Progression
                                                </th>
                                                <th className="p-3 text-center font-black text-sm">
                                                    Statut
                                                </th>
                                                <th className="p-3 text-center font-black text-sm">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {engagements.map((e) => (
                                                <tr key={e.engagement_id} className="border-b border-black/10">
                                                    <td className="p-3">
                                                        <p className="font-black text-black">
                                                            {e.nom_complet}
                                                        </p>
                                                        <p className="text-xs text-black/50">{e.email}</p>
                                                        <p className="text-xs text-black/50">
                                                            {e.telephone}
                                                        </p>
                                                    </td>

                                                    <td className="p-3 font-bold text-black">
                                                        {e.titre}
                                                    </td>

                                                    <td className="p-3 text-right font-black text-orange-700">
                                                        {formatMontant(e.montant_propose)}
                                                    </td>

                                                    <td className="p-3 text-right font-black text-green-700">
                                                        {e.montant_valide
                                                            ? formatMontant(e.montant_valide)
                                                            : "—"}
                                                    </td>

                                                    <td className="p-3 text-right font-black text-blue-700">
                                                        {formatMontant(e.montant_paye)}
                                                    </td>

                                                    <td className="p-3 text-center">
                                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                                            <div
                                                                className="bg-green-500 h-2 rounded-full"
                                                                style={{
                                                                    width: `${Math.min(
                                                                        100,
                                                                        Number(e.progression || 0)
                                                                    )}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-black">
                                                            {Number(e.progression || 0).toFixed(0)}%
                                                        </span>
                                                    </td>

                                                    <td className="p-3 text-center">
                                                        {getEngagementBadge(e.statut)}
                                                    </td>

                                                    <td className="p-3 text-center">
                                                        {e.statut === "en_attente" ? (
                                                            <div className="flex justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleActiverEngagement(e)}
                                                                    className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-black"
                                                                >
                                                                    Activer
                                                                </button>

                                                                <button
                                                                    onClick={() => handleRejeterEngagement(e)}
                                                                    className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-black"
                                                                >
                                                                    Rejeter
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-black/50 font-black">
                                                                Traité
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
                    </div>
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
                                                <tr key={prop.id} className="border-b border-black/10">
                                                    <td className="p-3 font-black text-black">
                                                        {prop.generation_nom}
                                                    </td>
                                                    <td className="p-3 text-black">{prop.annee}</td>
                                                    <td className="p-3 font-black text-green-600">
                                                        {formatMontant(prop.montant_corrige || prop.montant_propose)}
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
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {peutRepondre ? (
                                                            <div className="flex justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleAccepterBudget(prop)}
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
                                            engagement_id: "",
                                            ligne_cotisation_id: "",
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
                                    Ligne de cotisation *
                                </label>
                                <select
                                    value={formData.ligne_cotisation_id}
                                    onChange={(e) => handleLigneChange(e.target.value)}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    required
                                >
                                    <option value="">-- Sélectionner une ligne de cotisation --</option>
                                    {lignesCotisation.map((ligne) => (
                                        <option key={ligne.id} value={ligne.id}>
                                            {ligne.titre} —{" "}
                                            {ligne.type_ligne === "engagement"
                                                ? "Montant libre"
                                                : formatMontant(ligne.montant_cible)}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-500 font-bold mt-1">
                                    La ligne est obligatoire pour mettre à jour la jauge du membre.
                                </p>
                            </div>

                            {formData.membre_id && activeEngagementsForSelectedMember.length > 0 && (
                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Engagement actif du membre
                                    </label>
                                    <select
                                        value={formData.engagement_id}
                                        onChange={(e) => handleEngagementChange(e.target.value)}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    >
                                        <option value="">-- Aucun engagement spécifique --</option>
                                        {activeEngagementsForSelectedMember.map((e) => (
                                            <option key={e.engagement_id} value={e.engagement_id}>
                                                {e.titre} — Reste : {formatMontant(e.reste_a_payer)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-black font-black mb-1">
                                    Type de cotisation *
                                </label>
                                <select
                                    value={formData.type_cotisation}
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

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Mois
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.mois}
                                        onChange={(e) =>
                                            setFormData({ ...formData, mois: e.target.value })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">
                                        Année
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.annee}
                                        onChange={(e) =>
                                            setFormData({ ...formData, annee: e.target.value })
                                        }
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-black font-black mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.date_paiement}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            date_paiement: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-black font-black mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            notes: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    rows={2}
                                    placeholder="Ex: Paiement partiel, janvier, événement spécial..."
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
                            <DetailLine
                                label="Date"
                                value={formatDate(getCotisationDate(selectedCotisation))}
                            />
                            <DetailLine
                                label="Membre"
                                value={
                                    selectedCotisation.membres?.nom_complet ||
                                    getMembreNom(selectedCotisation.membre_id)
                                }
                            />
                            <DetailLine
                                label="Ligne"
                                value={getLigneTitre(selectedCotisation) || "—"}
                            />
                            <DetailLine
                                label="Type"
                                value={getTypeLabel(selectedCotisation)}
                            />
                            <DetailLine
                                label="Montant"
                                value={formatMontant(selectedCotisation.montant)}
                                green
                            />
                            <DetailLine
                                label="Période"
                                value={`${selectedCotisation.mois || "—"} ${
                                    selectedCotisation.annee || ""
                                }`}
                            />
                            <DetailLine
                                label="Notes"
                                value={getCotisationNotes(selectedCotisation) || "—"}
                            />
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

function KpiBox({
    icon,
    title,
    value,
}: {
    icon: React.ReactNode;
    title: string;
    value: string;
}) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <p className="text-xs font-black uppercase text-black/50">
                    {title}
                </p>
            </div>
            <p className="text-xl font-black text-black">{value}</p>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 font-black uppercase rounded-t-2xl ${
                active ? "bg-black text-white" : "bg-gray-100 text-black"
            }`}
        >
            {children}
        </button>
    );
}

function DetailLine({
    label,
    value,
    green = false,
}: {
    label: string;
    value: string;
    green?: boolean;
}) {
    return (
        <div className="border-b border-black/10 pb-2">
            <p className="text-xs font-black uppercase text-black/50">{label}</p>
            <p className={`font-black ${green ? "text-green-600" : "text-black"}`}>
                {value}
            </p>
        </div>
    );
}