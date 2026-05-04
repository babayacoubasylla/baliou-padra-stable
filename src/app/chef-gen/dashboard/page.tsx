"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
    Users,
    Wallet,
    CheckCircle,
    AlertCircle,
    Crown,
    UserCheck,
    ChevronDown,
    UserCog,
    Megaphone,
    BarChart3,
    LogOut,
    User,
    Settings,
    BookOpen,
    Users as UsersIcon,
    Receipt,
    FileText,
    RefreshCw,
    Plus,
    X,
} from "lucide-react";

export default function ChefGenDashboard() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [profile, setProfile] = useState<any>(null);

    const [membres, setMembres] = useState<any[]>([]);
    const [demandesAttente, setDemandesAttente] = useState<any[]>([]);
    const [tresoriers, setTresoriers] = useState<any[]>([]);
    const [comiteCom, setComiteCom] = useState<any[]>([]);
    const [mesCotisations, setMesCotisations] = useState<any[]>([]);
    const [propositionsBudget, setPropositionsBudget] = useState<any[]>([]);

    const [lignesCotisation, setLignesCotisation] = useState<any[]>([]);
    const [engagements, setEngagements] = useState<any[]>([]);
    const [cotisationsGeneration, setCotisationsGeneration] = useState<any[]>([]);

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNominationModal, setShowNominationModal] = useState(false);
    const [showLigneModal, setShowLigneModal] = useState(false);

    const [nominationType, setNominationType] = useState("tresorier_titulaire");
    const [selectedMembre, setSelectedMembre] = useState<any>(null);

    const [selectedProposition, setSelectedProposition] = useState<any>(null);
    const [showNegociationModal, setShowNegociationModal] = useState(false);
    const [showRejetModal, setShowRejetModal] = useState(false);
    const [montantNegocie, setMontantNegocie] = useState("");
    const [commentaireNegocie, setCommentaireNegocie] = useState("");
    const [commentaireRejet, setCommentaireRejet] = useState("");

    const [ligneForm, setLigneForm] = useState({
        titre: "",
        type_ligne: "cotisation",
        montant: "",
        description: "",
        date_limite: "",
    });

    const [stats, setStats] = useState({
        totalMembres: 0,
        collecteTotale: 0,
        objectif: 0,
        progression: 0,
        sibity: 0,
        mensualites: 0,
        autres: 0,
        mesCotisationsTotal: 0,
        mesCotisationsSibity: 0,
        mesCotisationsMensualite: 0,
        mesCotisationsAutres: 0,
    });

    useEffect(() => {
        checkAuthAndLoadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!profile?.generation || profile.generation === "A définir") return;

        if (activeTab === "budget") {
            loadPropositionsBudget(profile.generation);
        }

        if (activeTab === "cotisations") {
            loadLignesCotisation(profile.generation);
            loadEngagements(profile.generation);
            loadCotisationsGeneration(profile.generation);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, profile?.generation]);

    const clean = (value: any) => (value ?? "").toString().trim();

    const isChefRole = (role: any) =>
        ["chef_gen", "chef_generation"].includes(clean(role));

    const isMembreValide = (membre: any) =>
        clean(membre?.statut_validation || "en_attente") === "valide";

    const isMembreEnAttente = (membre: any) => {
        const statut = clean(membre?.statut_validation);
        return statut === "" || statut === "en_attente";
    };

    const isMembreRejete = (membre: any) =>
        clean(membre?.statut_validation) === "rejete";

    const formatMontant = (montant: any) => {
        return new Intl.NumberFormat("fr-FR").format(Number(montant || 0)) + " FCFA";
    };

    const formatDate = (date?: string | null) => {
        if (!date) return "—";

        try {
            return new Date(date).toLocaleDateString("fr-FR");
        } catch {
            return "—";
        }
    };

    const getCotisationType = (cotisation: any) => {
        return clean(cotisation?.type_cotisation || cotisation?.type).toLowerCase();
    };

    const getCotisationDate = (cotisation: any) => {
        return (
            cotisation?.date_paiement ||
            cotisation?.date_cotisation ||
            cotisation?.created_at ||
            null
        );
    };

    const getPaiementDate = (paiement: any) => {
        return (
            paiement?.date_paiement ||
            paiement?.date_cotisation ||
            paiement?.created_at ||
            null
        );
    };

    const getPaiementType = (paiement: any) => {
        return clean(paiement?.type_cotisation || paiement?.type).toLowerCase();
    };

    const getPaiementTypeLabel = (paiement: any) => {
        const type = getPaiementType(paiement);

        if (type.includes("sibity") || type.includes("sibiti")) return "📿 Sibiti";
        if (type.includes("mensualite") || type.includes("mensualité")) return "📅 Mensualité";
        if (type.includes("engagement")) return "🤝 Engagement";
        if (type.includes("extraordinaire")) return "⚡ Autre cotisation";

        return type ? `💰 ${type}` : "💰 Cotisation";
    };

    const getPaiementLigneTitre = (paiement: any) => {
        return clean(
            paiement?.cotisation_lignes?.titre ||
            paiement?.ligne_titre ||
            ""
        );
    };

    const getPaiementMembreNom = (paiement: any) => {
        if (paiement?.membres?.nom_complet) return paiement.membres.nom_complet;

        const membre = membres.find((m) => Number(m.id) === Number(paiement.membre_id));
        return membre?.nom_complet || "Membre inconnu";
    };

    const getPaiementMembreContact = (paiement: any) => {
        if (paiement?.membres?.telephone) return paiement.membres.telephone;

        const membre = membres.find((m) => Number(m.id) === Number(paiement.membre_id));
        return membre?.telephone || "—";
    };

    const getPaiementNotes = (paiement: any) => {
        return clean(paiement?.notes || paiement?.description || "");
    };

    const getStatusLabel = (membre: any) => {
        if (isMembreValide(membre)) return "Validé";
        if (isMembreRejete(membre)) return "Rejeté";
        return "En attente";
    };

    const getStatusBadge = (membre: any) => {
        if (isMembreValide(membre)) {
            return <span className="text-green-600 font-black">✅ Validé</span>;
        }

        if (isMembreRejete(membre)) {
            return <span className="text-red-600 font-black">❌ Rejeté</span>;
        }

        return <span className="text-yellow-600 font-black">⏳ En attente</span>;
    };

    const checkAuthAndLoadData = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            router.push("/login");
            return;
        }

        const { data: profileData, error: profileError } = await supabase
            .from("membres")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (profileError) {
            alert("Erreur chargement profil : " + profileError.message);
            router.push("/profil");
            return;
        }

        if (!profileData || !isChefRole(profileData.role)) {
            router.push("/profil");
            return;
        }

        setProfile(profileData);

        if (profileData.generation && profileData.generation !== "A définir") {
            await loadAllData(profileData.generation, profileData.id);
            await loadMesCotisations(profileData.id);
            await loadPropositionsBudget(profileData.generation);
            await loadLignesCotisation(profileData.generation);
            await loadEngagements(profileData.generation);
            await loadCotisationsGeneration(profileData.generation);
        }

        setLoading(false);
    };

    const loadAllData = async (generationNom: any, membreId: any) => {
        const { data: membresData, error } = await supabase
            .from("membres")
            .select("*")
            .eq("generation", generationNom)
            .order("nom_complet", { ascending: true });

        if (error) {
            alert("Erreur chargement membres : " + error.message);
            setMembres([]);
            setDemandesAttente([]);
            setTresoriers([]);
            setComiteCom([]);
            return;
        }

        const liste = membresData || [];
        setMembres(liste);

        setDemandesAttente(
            liste.filter(
                (m) =>
                    isMembreEnAttente(m) &&
                    clean(m.role || "membre") === "membre" &&
                    m.id !== membreId
            )
        );

        setTresoriers(
            liste.filter(
                (m) =>
                    ["tresorier", "tresorier_adjoint"].includes(clean(m.role)) &&
                    m.id !== membreId
            )
        );

        setComiteCom(
            liste.filter(
                (m) =>
                    ["comite_com_gen", "comite_com_adjoint"].includes(clean(m.role)) &&
                    m.id !== membreId
            )
        );

        await calculateStats(liste);
    };

    const loadMesCotisations = async (membreId: any) => {
        const { data: cotisations, error } = await supabase
            .from("cotisations")
            .select("*")
            .eq("membre_id", membreId);

        if (error) {
            console.warn("Erreur cotisations personnelles:", error.message);
            setMesCotisations([]);
            return;
        }

        const liste = cotisations || [];
        setMesCotisations(liste);

        let totalSibity = 0;
        let totalMensualite = 0;
        let totalAutres = 0;

        liste.forEach((c) => {
            const type = getCotisationType(c);
            const montant = Number(c.montant || 0);

            if (type.includes("sibity") || type.includes("sibiti")) totalSibity += montant;
            else if (type.includes("mensualite") || type.includes("mensualité")) {
                totalMensualite += montant;
            } else {
                totalAutres += montant;
            }
        });

        setStats((prev) => ({
            ...prev,
            mesCotisationsTotal: totalSibity + totalMensualite + totalAutres,
            mesCotisationsSibity: totalSibity,
            mesCotisationsMensualite: totalMensualite,
            mesCotisationsAutres: totalAutres,
        }));
    };

    const loadPropositionsBudget = async (generationParam?: string) => {
        const generation = generationParam || profile?.generation;

        if (!generation) return;

        const { data, error } = await supabase
            .from("propositions_budgetaires")
            .select("*")
            .eq("generation_nom", generation);

        if (error) {
            console.warn("Erreur propositions budget:", error.message);
            setPropositionsBudget([]);
            return;
        }

        setPropositionsBudget(data || []);
    };

    const loadLignesCotisation = async (generationNom: string) => {
        const { data: lignesGeneration, error: errorGeneration } = await supabase
            .from("cotisation_lignes")
            .select("*")
            .eq("generation_nom", generationNom)
            .eq("statut", "active")
            .order("created_at", { ascending: false });

        const { data: lignesGlobales, error: errorGlobal } = await supabase
            .from("cotisation_lignes")
            .select("*")
            .eq("scope", "global")
            .eq("statut", "active")
            .order("created_at", { ascending: false });

        if (errorGeneration || errorGlobal) {
            console.error("Erreur lignes cotisation:", errorGeneration || errorGlobal);
            setLignesCotisation([]);
            return;
        }

        setLignesCotisation([...(lignesGlobales || []), ...(lignesGeneration || [])]);
    };

    const loadEngagements = async (generationNom: string) => {
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

        const membreIds = [...new Set(engagementsRaw.map((e) => e.membre_id).filter(Boolean))];
        const ligneIds = [...new Set(engagementsRaw.map((e) => e.ligne_cotisation_id).filter(Boolean))];
        const engagementIds = [...new Set(engagementsRaw.map((e) => e.id).filter(Boolean))];

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

            const statut = clean(p.statut || "valide");
            if (statut !== "valide") return;

            const montantActuel = paiementsParEngagement.get(engagementId) || 0;
            paiementsParEngagement.set(engagementId, montantActuel + Number(p.montant || 0));
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

    const loadCotisationsGeneration = async (generationNom: string) => {
        const { data: membresGen, error: membresError } = await supabase
            .from("membres")
            .select("id")
            .eq("generation", generationNom)
            .eq("statut_validation", "valide")
            .eq("est_compte_gestion", false);

        if (membresError) {
            console.error("Erreur membres pour cotisations:", membresError);
            setCotisationsGeneration([]);
            return;
        }

        const membreIds = membresGen?.map((m) => m.id) || [];

        if (membreIds.length === 0) {
            setCotisationsGeneration([]);
            return;
        }

        const { data, error } = await supabase
            .from("cotisations")
            .select(
                "*, membres(nom_complet,email,telephone), cotisation_lignes(titre,type_ligne,scope,montant_cible), cotisation_engagements(id,statut,montant_propose,montant_valide)"
            )
            .in("membre_id", membreIds)
            .order("date_paiement", { ascending: false });

        if (error) {
            const fallback = await supabase
                .from("cotisations")
                .select("*")
                .in("membre_id", membreIds)
                .order("date_paiement", { ascending: false });

            if (fallback.error) {
                console.error("Erreur cotisations génération:", fallback.error);
                setCotisationsGeneration([]);
                return;
            }

            setCotisationsGeneration(fallback.data || []);
            return;
        }

        setCotisationsGeneration(data || []);
    };

    const calculateStats = async (membresData: any[]) => {
        const membreIds = membresData
            .filter((m) => !m.est_compte_gestion)
            .map((m) => m.id);

        let totalSibity = 0;
        let totalMensualites = 0;
        let totalAutres = 0;

        if (membreIds.length > 0) {
            const { data: cotisations, error } = await supabase
                .from("cotisations")
                .select("montant, type_cotisation")
                .in("membre_id", membreIds);

            if (!error && cotisations) {
                cotisations.forEach((c) => {
                    const type = clean(c.type_cotisation).toLowerCase();
                    const montant = Number(c.montant || 0);

                    if (type.includes("sibity") || type.includes("sibiti")) totalSibity += montant;
                    else if (type.includes("mensualite") || type.includes("mensualité")) {
                        totalMensualites += montant;
                    } else {
                        totalAutres += montant;
                    }
                });
            }
        }

        const collecteTotale = totalSibity + totalMensualites + totalAutres;
        const objectif = 5000000;
        const progression = objectif > 0 ? (collecteTotale / objectif) * 100 : 0;

        setStats((prev) => ({
            ...prev,
            totalMembres: membresData.filter((m) => !m.est_compte_gestion).length,
            collecteTotale,
            objectif,
            progression,
            sibity: totalSibity,
            mensualites: totalMensualites,
            autres: totalAutres,
        }));
    };

    const updateStatutMembreGeneration = async (
        membreId: any,
        statut: "valide" | "rejete" | "en_attente"
    ) => {
        const { error } = await supabase.rpc("valider_membre_generation", {
            p_membre_id: Number(membreId),
            p_statut: statut,
        });

        return error || null;
    };

    const handleValiderMembre = async (membreId: any) => {
        const error = await updateStatutMembreGeneration(membreId, "valide");

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Membre validé !");
        await loadAllData(profile.generation, profile.id);
    };

    const handleRejeterMembre = async (membreId: any) => {
        if (!confirm("Rejeter cette demande ? Le compte sera marqué comme rejeté.")) return;

        const error = await updateStatutMembreGeneration(membreId, "rejete");

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Demande rejetée");
        await loadAllData(profile.generation, profile.id);
    };

    const handleNommerResponsable = async () => {
        if (!selectedMembre) {
            alert("Veuillez choisir un membre.");
            return;
        }

        let nouveauRole = "";

        if (nominationType === "tresorier_titulaire") nouveauRole = "tresorier";
        else if (nominationType === "tresorier_adjoint") nouveauRole = "tresorier_adjoint";
        else if (nominationType === "comite_com_titulaire") nouveauRole = "comite_com_gen";
        else if (nominationType === "comite_com_adjoint") nouveauRole = "comite_com_adjoint";

        if (!nouveauRole) {
            alert("Type de nomination invalide.");
            return;
        }

        const { error } = await supabase.rpc("nommer_responsable_generation", {
            p_membre_id: Number(selectedMembre),
            p_role: nouveauRole,
        });

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Responsable nommé !");
        setShowNominationModal(false);
        setSelectedMembre(null);
        await loadAllData(profile.generation, profile.id);
    };

    const handleRetirerResponsable = async (membreId: any, nomMembre: any) => {
        if (!confirm(`Retirer ${nomMembre} de sa responsabilité ?`)) return;

        const { error } = await supabase.rpc("retirer_responsable_generation", {
            p_membre_id: Number(membreId),
        });

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Responsable retiré");
        await loadAllData(profile.generation, profile.id);
    };

    const resetLigneForm = () => {
        setLigneForm({
            titre: "",
            type_ligne: "cotisation",
            montant: "",
            description: "",
            date_limite: "",
        });
    };

    const handleCreateLigneCotisation = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!ligneForm.titre.trim()) {
            alert("Veuillez saisir le titre ou la désignation.");
            return;
        }

        if (ligneForm.type_ligne === "cotisation" && !ligneForm.montant) {
            alert("Veuillez saisir le montant de la cotisation.");
            return;
        }

        const { error } = await supabase.rpc("creer_ligne_cotisation_generation_v2", {
            p_titre: ligneForm.titre,
            p_type_ligne: ligneForm.type_ligne,
            p_montant:
                ligneForm.type_ligne === "cotisation"
                    ? Number(ligneForm.montant)
                    : null,
            p_description: ligneForm.description || null,
            p_date_limite: ligneForm.date_limite || null,
            p_annee: new Date().getFullYear(),
            p_generation_nom: profile.generation,
        });

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert(
            ligneForm.type_ligne === "cotisation"
                ? "Cotisation créée avec succès."
                : "Ligne engagement créée avec succès."
        );

        setShowLigneModal(false);
        resetLigneForm();
        await loadLignesCotisation(profile.generation);
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

        console.log("Activation engagement chef:", { data, error });

        if (error) {
            alert("Erreur activation engagement : " + error.message);
            return;
        }

        alert("Engagement activé avec succès.");

        await loadEngagements(profile.generation);
        await loadCotisationsGeneration(profile.generation);
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

        console.log("Rejet engagement chef:", { data, error });

        if (error) {
            alert("Erreur rejet engagement : " + error.message);
            return;
        }

        alert("Engagement rejeté.");

        await loadEngagements(profile.generation);
        await loadCotisationsGeneration(profile.generation);
    };

    const handleAccepterProposition = async (propParam?: any) => {
        const prop = propParam || selectedProposition;

        if (!prop?.id) {
            alert("Proposition introuvable.");
            return;
        }

        const { error } = await supabase
            .from("propositions_budgetaires")
            .update({
                statut_chef: "accepte",
                commentaire_chef: null,
                date_reponse: new Date().toISOString(),
                valide_par_membre_id: profile?.id || null,
                valide_par_role: profile?.role || "chef_gen",
            })
            .eq("id", prop.id);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("✅ Proposition acceptée !");
        setSelectedProposition(null);
        await loadPropositionsBudget(profile.generation);
    };

    const handleNegocierProposition = async () => {
        if (!selectedProposition?.id) {
            alert("Proposition introuvable.");
            return;
        }

        if (!montantNegocie) {
            alert("Entrez un montant");
            return;
        }

        const { error } = await supabase
            .from("propositions_budgetaires")
            .update({
                statut_chef: "negociation",
                montant_corrige: parseInt(montantNegocie),
                commentaire_chef: commentaireNegocie,
                date_reponse: new Date().toISOString(),
                valide_par_membre_id: profile?.id || null,
                valide_par_role: profile?.role || "chef_gen",
            })
            .eq("id", selectedProposition.id);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("💬 Proposition de négociation envoyée !");
        setShowNegociationModal(false);
        setSelectedProposition(null);
        setMontantNegocie("");
        setCommentaireNegocie("");
        await loadPropositionsBudget(profile.generation);
    };

    const handleRejeterProposition = async () => {
        if (!selectedProposition?.id) {
            alert("Proposition introuvable.");
            return;
        }

        if (!commentaireRejet) {
            alert("Indiquez un motif");
            return;
        }

        const { error } = await supabase
            .from("propositions_budgetaires")
            .update({
                statut_chef: "rejete",
                commentaire_chef: commentaireRejet,
                date_reponse: new Date().toISOString(),
                valide_par_membre_id: profile?.id || null,
                valide_par_role: profile?.role || "chef_gen",
            })
            .eq("id", selectedProposition.id);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("❌ Proposition rejetée.");
        setShowRejetModal(false);
        setSelectedProposition(null);
        setCommentaireRejet("");
        await loadPropositionsBudget(profile.generation);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const getMembresDisponibles = () => {
        const responsablesIds = [...tresoriers, ...comiteCom].map((r) => r.id);

        return membres.filter(
            (m) =>
                !responsablesIds.includes(m.id) &&
                isMembreValide(m) &&
                clean(m.role || "membre") === "membre" &&
                m.id !== profile?.id
        );
    };

    const getRoleBadge = (role: any) => {
        switch (clean(role)) {
            case "tresorier":
                return (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-black">
                        💰 Trésorier Titulaire
                    </span>
                );
            case "tresorier_adjoint":
                return (
                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-black">
                        💰 Trésorier Adjoint
                    </span>
                );
            case "comite_com_gen":
                return (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-black">
                        📢 Comité Titulaire
                    </span>
                );
            case "comite_com_adjoint":
                return (
                    <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded-full text-xs font-black">
                        📢 Comité Adjoint
                    </span>
                );
            case "chef_gen":
            case "chef_generation":
                return (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-black">
                        👑 Chef Génération
                    </span>
                );
            default:
                return (
                    <span className="bg-gray-100 text-black px-2 py-1 rounded-full text-xs font-black">
                        👤 Membre
                    </span>
                );
        }
    };

    const getLigneTypeBadge = (ligne: any) => {
        if (ligne.type_ligne === "sibiti") {
            return (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-black">
                    🌍 Sibiti global
                </span>
            );
        }

        if (ligne.type_ligne === "engagement") {
            return (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-black">
                    🤝 Engagement
                </span>
            );
        }

        return (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-black">
                💰 Cotisation
            </span>
        );
    };

    const getEngagementBadge = (statut: any) => {
        switch (clean(statut)) {
            case "actif":
                return (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-black">
                        ✅ Actif
                    </span>
                );
            case "rejete":
                return (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-black">
                        ❌ Rejeté
                    </span>
                );
            case "cloture":
                return (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-black">
                        🔒 Clôturé
                    </span>
                );
            default:
                return (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-black">
                        ⏳ En attente
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!profile?.generation || profile.generation === "A définir") {
        return (
            <div className="min-h-screen bg-white p-6 flex items-center justify-center">
                <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-8 text-center">
                    <AlertCircle size={48} className="mx-auto text-yellow-600 mb-4" />
                    <h1 className="text-2xl font-black text-yellow-800">
                        ⚠️ Génération non définie
                    </h1>
                    <button
                        onClick={() => router.push("/profil")}
                        className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-black"
                    >
                        Retour à mon profil
                    </button>
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
                                <Crown size={32} className="text-yellow-600" />
                                <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                    ESPACE CHEF DE GÉNÉRATION
                                </h1>
                            </div>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black font-medium mt-2">
                                {profile.generation} • Bienvenue {profile.nom_complet}
                            </p>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-xl font-black text-sm"
                            >
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-black">
                                    {profile.nom_complet?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <span className="text-white">
                                    {profile.nom_complet?.split(" ")[0] || "Utilisateur"}
                                </span>
                                <ChevronDown size={16} className="text-white" />
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-white border-4 border-black rounded-2xl shadow-lg z-50">
                                    <div className="p-3 border-b-2 border-black/10">
                                        <p className="font-black text-black">{profile.nom_complet}</p>
                                        <p className="text-sm text-black/60">{profile.email}</p>
                                        <p className="text-xs text-black/40">👑 Chef de Génération</p>
                                    </div>
                                    <div className="py-2">
                                        <button onClick={() => router.push("/profil")} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium">
                                            <User size={16} /> Mon profil membre
                                        </button>
                                        <button onClick={() => router.push("/profil/editer")} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium">
                                            <Settings size={16} /> Modifier mon profil
                                        </button>
                                        <button onClick={() => router.push("/finances")} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium">
                                            <Receipt size={16} /> Mes cotisations
                                        </button>
                                        <button onClick={() => router.push("/annuaire")} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium">
                                            <UsersIcon size={16} /> Annuaire
                                        </button>
                                        <button onClick={() => router.push("/bibliotheque")} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium">
                                            <BookOpen size={16} /> Bibliothèque
                                        </button>
                                        <div className="border-t-2 border-black/10 my-1"></div>
                                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-red-50 text-red-600 font-medium">
                                            <LogOut size={16} /> Se déconnecter
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mes cotisations personnelles */}
                <div className="bg-[#146332] border-4 border-black rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Crown size={20} className="text-yellow-400" />
                        <h3 className="font-black text-white uppercase text-sm">
                            👑 Mes cotisations personnelles
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoBox title="Total versé" value={formatMontant(stats.mesCotisationsTotal)} />
                        <InfoBox title="📿 Sibiti" value={formatMontant(stats.mesCotisationsSibity)} />
                        <InfoBox title="📅 Mensualités" value={formatMontant(stats.mesCotisationsMensualite)} />
                        <div className="bg-white/10 rounded-xl p-3 flex items-center justify-center">
                            <button onClick={() => router.push("/finances")} className="text-sm font-black text-yellow-400 hover:underline">
                                Voir détails →
                            </button>
                        </div>
                    </div>
                </div>

                {/* Alertes */}
                {demandesAttente.length > 0 && (
                    <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-4 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="text-yellow-600" size={24} />
                            <div>
                                <p className="font-black text-yellow-800">
                                    {demandesAttente.length} demande(s) en attente
                                </p>
                                <p className="text-sm text-yellow-700">
                                    Cliquez sur l'onglet "Validations"
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setActiveTab("validations")} className="bg-yellow-600 text-white px-4 py-2 rounded-xl font-black text-sm">
                            Voir
                        </button>
                    </div>
                )}

                {/* Onglets */}
                <div className="flex flex-wrap gap-2 border-b-4 border-black mb-6 overflow-x-auto">
                    <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<BarChart3 size={16} />} label="Vue d'ensemble" />
                    <TabButton active={activeTab === "validations"} onClick={() => setActiveTab("validations")} icon={<UserCheck size={16} />} label={`Validations (${demandesAttente.length})`} />
                    <TabButton active={activeTab === "tresorerie"} onClick={() => setActiveTab("tresorerie")} icon={<Wallet size={16} />} label="Finances génération" />
                    <TabButton active={activeTab === "cotisations"} onClick={() => setActiveTab("cotisations")} icon={<Receipt size={16} />} label="Cotisations & Engagements" />
                    <TabButton active={activeTab === "budget"} onClick={() => setActiveTab("budget")} icon={<FileText size={16} />} label={`Budget (${propositionsBudget.length})`} />
                    <TabButton active={activeTab === "nomination"} onClick={() => setActiveTab("nomination")} icon={<UserCog size={16} />} label="Nomination" />
                    <TabButton active={activeTab === "membres"} onClick={() => setActiveTab("membres")} icon={<Users size={16} />} label={`Membres (${stats.totalMembres})`} />
                </div>

                {activeTab === "overview" && (
                    <OverviewSection
                        stats={stats}
                        formatMontant={formatMontant}
                        tresoriers={tresoriers}
                        comiteCom={comiteCom}
                        getRoleBadge={getRoleBadge}
                        router={router}
                    />
                )}

                {activeTab === "validations" && (
                    <ValidationsSection
                        demandesAttente={demandesAttente}
                        handleValiderMembre={handleValiderMembre}
                        handleRejeterMembre={handleRejeterMembre}
                        getStatusLabel={getStatusLabel}
                    />
                )}

                {activeTab === "tresorerie" && (
                    <TresorerieSection
                        stats={stats}
                        mesCotisations={mesCotisations}
                        formatMontant={formatMontant}
                        formatDate={formatDate}
                        getCotisationDate={getCotisationDate}
                        getCotisationType={getCotisationType}
                        router={router}
                    />
                )}

                {activeTab === "cotisations" && (
                    <CotisationsEngagementsSection
                        lignesCotisation={lignesCotisation}
                        engagements={engagements}
                        cotisationsGeneration={cotisationsGeneration}
                        formatMontant={formatMontant}
                        formatDate={formatDate}
                        getLigneTypeBadge={getLigneTypeBadge}
                        getEngagementBadge={getEngagementBadge}
                        handleActiverEngagement={handleActiverEngagement}
                        handleRejeterEngagement={handleRejeterEngagement}
                        loadCotisationsGeneration={() => loadCotisationsGeneration(profile.generation)}
                        getPaiementDate={getPaiementDate}
                        getPaiementMembreNom={getPaiementMembreNom}
                        getPaiementMembreContact={getPaiementMembreContact}
                        getPaiementLigneTitre={getPaiementLigneTitre}
                        getPaiementType={getPaiementType}
                        getPaiementTypeLabel={getPaiementTypeLabel}
                        getPaiementNotes={getPaiementNotes}
                        openLigneModal={() => setShowLigneModal(true)}
                    />
                )}

                {activeTab === "budget" && (
                    <BudgetSection
                        propositionsBudget={propositionsBudget}
                        formatDate={formatDate}
                        formatMontant={formatMontant}
                        handleAccepterProposition={handleAccepterProposition}
                        setSelectedProposition={setSelectedProposition}
                        setMontantNegocie={setMontantNegocie}
                        setCommentaireNegocie={setCommentaireNegocie}
                        setCommentaireRejet={setCommentaireRejet}
                        setShowNegociationModal={setShowNegociationModal}
                        setShowRejetModal={setShowRejetModal}
                        loadPropositionsBudget={() => loadPropositionsBudget(profile.generation)}
                    />
                )}

                {activeTab === "nomination" && (
                    <NominationSection
                        tresoriers={tresoriers}
                        comiteCom={comiteCom}
                        setNominationType={setNominationType}
                        setShowNominationModal={setShowNominationModal}
                        handleRetirerResponsable={handleRetirerResponsable}
                    />
                )}

                {activeTab === "membres" && (
                    <MembresSection
                        membres={membres}
                        profile={profile}
                        getRoleBadge={getRoleBadge}
                        getStatusBadge={getStatusBadge}
                    />
                )}
            </div>

            {/* Modal création ligne */}
            {showLigneModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-black">➕ Nouvelle ligne</h2>
                            <button onClick={() => setShowLigneModal(false)} className="text-black hover:text-red-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateLigneCotisation} className="space-y-4">
                            <div>
                                <label className="block text-black font-black mb-1">Type</label>
                                <select
                                    value={ligneForm.type_ligne}
                                    onChange={(e) =>
                                        setLigneForm({
                                            ...ligneForm,
                                            type_ligne: e.target.value,
                                            montant: e.target.value === "engagement" ? "" : ligneForm.montant,
                                        })
                                    }
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white"
                                >
                                    <option value="cotisation">Cotisation avec montant défini</option>
                                    <option value="engagement">Engagement libre des membres</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-black font-black mb-1">Titre / Désignation *</label>
                                <input
                                    type="text"
                                    value={ligneForm.titre}
                                    onChange={(e) => setLigneForm({ ...ligneForm, titre: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white"
                                    placeholder="Ex: Cotisation Ramadan, Engagement annuel..."
                                    required
                                />
                            </div>

                            {ligneForm.type_ligne === "cotisation" && (
                                <div>
                                    <label className="block text-black font-black mb-1">Montant (FCFA) *</label>
                                    <input
                                        type="number"
                                        value={ligneForm.montant}
                                        onChange={(e) => setLigneForm({ ...ligneForm, montant: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white"
                                        placeholder="Ex: 5000"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-black font-black mb-1">Date limite</label>
                                <input
                                    type="date"
                                    value={ligneForm.date_limite}
                                    onChange={(e) => setLigneForm({ ...ligneForm, date_limite: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-black font-black mb-1">Description</label>
                                <textarea
                                    value={ligneForm.description}
                                    onChange={(e) => setLigneForm({ ...ligneForm, description: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white"
                                    rows={3}
                                    placeholder="Précisions sur cette cotisation..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowLigneModal(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-black">
                                    Annuler
                                </button>
                                <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-black hover:bg-[#146332]">
                                    Créer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal nomination */}
            {showNominationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-black text-black mb-4">
                            {nominationType.includes("tresorier") ? "💰 Nommer un Trésorier" : "📢 Nommer un membre"}
                        </h2>

                        <select
                            value={selectedMembre || ""}
                            onChange={(e) => setSelectedMembre(e.target.value)}
                            className="w-full p-3 border-4 border-black rounded-xl mb-4 font-black text-black bg-white"
                        >
                            <option value="">-- Choisir --</option>
                            {getMembresDisponibles().map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.nom_complet}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-3">
                            <button onClick={() => setShowNominationModal(false)} className="flex-1 bg-gray-200 py-2 rounded-xl font-black">
                                Annuler
                            </button>
                            <button onClick={handleNommerResponsable} className="flex-1 bg-black text-white py-2 rounded-xl font-black">
                                Nommer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal négociation */}
            {showNegociationModal && selectedProposition && (
                <BudgetNegociationModal
                    selectedProposition={selectedProposition}
                    montantNegocie={montantNegocie}
                    setMontantNegocie={setMontantNegocie}
                    commentaireNegocie={commentaireNegocie}
                    setCommentaireNegocie={setCommentaireNegocie}
                    close={() => setShowNegociationModal(false)}
                    submit={handleNegocierProposition}
                    formatMontant={formatMontant}
                />
            )}

            {/* Modal rejet */}
            {showRejetModal && selectedProposition && (
                <BudgetRejetModal
                    selectedProposition={selectedProposition}
                    commentaireRejet={commentaireRejet}
                    setCommentaireRejet={setCommentaireRejet}
                    close={() => setShowRejetModal(false)}
                    submit={handleRejeterProposition}
                    formatMontant={formatMontant}
                />
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Sous-composants                                                            */
/* -------------------------------------------------------------------------- */

function InfoBox({ title, value }: { title: string; value: string }) {
    return (
        <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs font-black text-white/70">{title}</p>
            <p className="text-xl font-black text-yellow-400">{value}</p>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 font-black uppercase text-sm flex items-center gap-2 ${active ? "bg-black text-white rounded-t-2xl" : "text-black"
                }`}
        >
            {icon} {label}
        </button>
    );
}

function OverviewSection({ stats, formatMontant, tresoriers, comiteCom, getRoleBadge, router }: any) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi label="👥 Membres" value={stats.totalMembres} />
                <Kpi label="💰 Collecte" value={formatMontant(stats.collecteTotale)} green />
                <Kpi label="📈 Progression" value={`${stats.progression.toFixed(1)}%`} blue />
                <Kpi label="📿 / 📅" value={`${formatMontant(stats.sibity)} / ${formatMontant(stats.mensualites)}`} />
            </div>

            <div className="bg-white border-4 border-black rounded-2xl p-6">
                <div className="flex justify-between mb-2">
                    <span className="font-black text-black">Progression</span>
                    <span className="font-black text-black">{stats.progression.toFixed(1)}%</span>
                </div>
                <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
                    <div className="h-full bg-green-500" style={{ width: `${Math.min(100, stats.progression)}%` }}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ResponsablesCard title="Trésorerie" items={tresoriers} empty="Aucun trésorier" getRoleBadge={getRoleBadge} />
                <ResponsablesCard title="Communication" items={comiteCom} empty="Aucun membre" getRoleBadge={getRoleBadge} />

                <div className="bg-white border-4 border-black rounded-2xl p-6">
                    <h3 className="font-black text-black mb-4">⚡ Accès rapide</h3>
                    <div className="space-y-2">
                        <button onClick={() => router.push("/profil")} className="flex items-center gap-3 w-full text-left text-black hover:text-[#146332]">
                            <User size={16} /> Mon profil
                        </button>
                        <button onClick={() => router.push("/finances")} className="flex items-center gap-3 w-full text-left text-black hover:text-[#146332]">
                            <Receipt size={16} /> Mes cotisations
                        </button>
                        <button onClick={() => router.push("/annuaire")} className="flex items-center gap-3 w-full text-left text-black hover:text-[#146332]">
                            <UsersIcon size={16} /> Annuaire
                        </button>
                        <button onClick={() => router.push("/bibliotheque")} className="flex items-center gap-3 w-full text-left text-black hover:text-[#146332]">
                            <BookOpen size={16} /> Bibliothèque
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Kpi({ label, value, green, blue }: any) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-5">
            <p className="text-xs font-black uppercase text-black/50">{label}</p>
            <p className={`text-xl font-black ${green ? "text-green-600" : blue ? "text-blue-600" : "text-black"}`}>
                {value}
            </p>
        </div>
    );
}

function ResponsablesCard({ title, items, empty, getRoleBadge }: any) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-6">
            <h3 className="font-black text-black mb-4">{title}</h3>
            {items.length === 0 ? (
                <p className="text-black/60 italic">{empty}</p>
            ) : (
                items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-black/10">
                        <div>
                            <p className="font-black text-black">{item.nom_complet}</p>
                            <p className="text-xs text-black/60">{item.email}</p>
                        </div>
                        {getRoleBadge(item.role)}
                    </div>
                ))
            )}
        </div>
    );
}

function ValidationsSection({ demandesAttente, handleValiderMembre, handleRejeterMembre, getStatusLabel }: any) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
            <div className="bg-black p-4">
                <h2 className="text-white font-black uppercase">📋 Demandes en attente</h2>
            </div>

            {demandesAttente.length === 0 ? (
                <div className="p-12 text-center">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <p className="text-xl font-black text-black/60 italic">Aucune demande</p>
                </div>
            ) : (
                demandesAttente.map((d: any) => (
                    <div key={d.id} className="p-5 flex justify-between items-center border-b border-black/10">
                        <div>
                            <p className="font-black text-black text-lg">{d.nom_complet}</p>
                            <p className="text-sm text-black/60">{d.email}</p>
                            <p className="text-xs text-yellow-700 font-black mt-1">
                                Statut : {getStatusLabel(d)}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => handleValiderMembre(d.id)} className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-sm">
                                ✅ Valider
                            </button>
                            <button onClick={() => handleRejeterMembre(d.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-sm">
                                ❌ Rejeter
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

function TresorerieSection({ stats, mesCotisations, formatMontant, formatDate, getCotisationDate, getCotisationType, router }: any) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-4 border-black rounded-2xl p-6">
                <h3 className="font-black text-black mb-4">📊 Collectes</h3>
                <div className="space-y-3">
                    <Line label="📿 Sibiti" value={formatMontant(stats.sibity)} />
                    <Line label="📅 Mensualités" value={formatMontant(stats.mensualites)} />
                    <Line label="⚡ Autres" value={formatMontant(stats.autres)} />
                    <Line label="Total" value={formatMontant(stats.collecteTotale)} strong />
                </div>
            </div>

            <div className="bg-white border-4 border-black rounded-2xl p-6">
                <h3 className="font-black text-black mb-4">💳 Mes cotisations</h3>
                {mesCotisations.slice(0, 5).length === 0 ? (
                    <p className="text-black font-black italic">Aucune</p>
                ) : (
                    mesCotisations.slice(0, 5).map((c: any) => {
                        const type = getCotisationType(c);
                        return (
                            <div key={c.id} className="flex justify-between py-2 border-b border-black/10">
                                <div>
                                    <p className="text-sm font-black">
                                        {type.includes("sibity") || type.includes("sibiti")
                                            ? "📿 Sibiti"
                                            : type.includes("mensualite") || type.includes("mensualité")
                                                ? "📅 Mensualité"
                                                : "💰 Cotisation"}
                                    </p>
                                    <p className="text-xs text-black/60">{formatDate(getCotisationDate(c))}</p>
                                </div>
                                <span className="font-black text-green-600">{formatMontant(c.montant)}</span>
                            </div>
                        );
                    })
                )}
                <button onClick={() => router.push("/finances")} className="mt-4 text-sm font-black text-black hover:underline">
                    Voir tout →
                </button>
            </div>
        </div>
    );
}

function Line({ label, value, strong }: any) {
    return (
        <div className={`flex justify-between py-2 ${strong ? "pt-3" : "border-b border-black/10"}`}>
            <span className="font-black text-black">{label}</span>
            <span className="font-black text-black">{value}</span>
        </div>
    );
}

function CotisationsEngagementsSection(props: any) {
    const {
        lignesCotisation,
        engagements,
        cotisationsGeneration,
        formatMontant,
        formatDate,
        getLigneTypeBadge,
        getEngagementBadge,
        handleActiverEngagement,
        handleRejeterEngagement,
        loadCotisationsGeneration,
        getPaiementDate,
        getPaiementMembreNom,
        getPaiementMembreContact,
        getPaiementLigneTitre,
        getPaiementType,
        getPaiementTypeLabel,
        getPaiementNotes,
        openLigneModal,
    } = props;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-black text-black uppercase">Cotisations & Engagements</h2>
                    <p className="text-sm text-black/60">
                        Créez les cotisations de votre génération et suivez les engagements et paiements des membres.
                    </p>
                </div>

                <button
                    onClick={openLigneModal}
                    className="bg-[#146332] text-white px-5 py-3 rounded-xl font-black uppercase text-sm flex items-center gap-2 hover:bg-black"
                >
                    <Plus size={16} /> Nouvelle ligne
                </button>
            </div>

            <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                <div className="bg-black p-4">
                    <h3 className="text-white font-black uppercase text-sm">🎯 Lignes actives</h3>
                </div>

                {lignesCotisation.length === 0 ? (
                    <div className="p-10 text-center text-black/60 font-black italic">Aucune ligne active.</div>
                ) : (
                    <div className="divide-y-2 divide-black/10">
                        {lignesCotisation.map((ligne: any) => (
                            <div key={ligne.id} className="p-5 flex justify-between items-start gap-4">
                                <div>
                                    <div className="flex gap-2 items-center mb-2">
                                        <p className="font-black text-black text-lg">{ligne.titre}</p>
                                        {getLigneTypeBadge(ligne)}
                                    </div>
                                    <p className="text-sm text-black/60">{ligne.description || "—"}</p>
                                    <p className="text-xs text-black/50 mt-1">
                                        Année : {ligne.annee || new Date().getFullYear()}
                                        {ligne.date_limite ? ` • Limite : ${formatDate(ligne.date_limite)}` : ""}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="font-black text-green-700 text-lg">
                                        {ligne.type_ligne === "engagement" ? "Montant libre" : formatMontant(ligne.montant_cible)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                <div className="bg-black p-4">
                    <h3 className="text-white font-black uppercase text-sm">🤝 Engagements proposés par les membres</h3>
                </div>

                {engagements.length === 0 ? (
                    <div className="p-10 text-center text-black/60 font-black italic">Aucun engagement proposé pour le moment.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left font-black text-sm">Membre</th>
                                    <th className="p-3 text-left font-black text-sm">Ligne</th>
                                    <th className="p-3 text-right font-black text-sm">Proposé</th>
                                    <th className="p-3 text-right font-black text-sm">Validé</th>
                                    <th className="p-3 text-right font-black text-sm">Payé</th>
                                    <th className="p-3 text-center font-black text-sm">Progression</th>
                                    <th className="p-3 text-center font-black text-sm">Statut</th>
                                    <th className="p-3 text-center font-black text-sm">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {engagements.map((e: any) => (
                                    <tr key={e.engagement_id} className="border-b border-black/10">
                                        <td className="p-3">
                                            <p className="font-black text-black">{e.nom_complet}</p>
                                            <p className="text-xs text-black/50">{e.email}</p>
                                            <p className="text-xs text-black/50">{e.telephone}</p>
                                        </td>
                                        <td className="p-3 font-bold text-black">{e.titre}</td>
                                        <td className="p-3 text-right font-black text-orange-700">{formatMontant(e.montant_propose)}</td>
                                        <td className="p-3 text-right font-black text-green-700">{e.montant_valide ? formatMontant(e.montant_valide) : "—"}</td>
                                        <td className="p-3 text-right font-black text-blue-700">{formatMontant(e.montant_paye)}</td>
                                        <td className="p-3 text-center">
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, Number(e.progression || 0))}%` }}></div>
                                            </div>
                                            <span className="text-xs font-black">{Number(e.progression || 0).toFixed(0)}%</span>
                                        </td>
                                        <td className="p-3 text-center">{getEngagementBadge(e.statut)}</td>
                                        <td className="p-3 text-center">
                                            {e.statut === "en_attente" ? (
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleActiverEngagement(e)} className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-black">
                                                        Activer
                                                    </button>
                                                    <button onClick={() => handleRejeterEngagement(e)} className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-black">
                                                        Rejeter
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-black/50 font-black">Traité</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                <div className="bg-black p-4 flex justify-between items-center">
                    <h3 className="text-white font-black uppercase text-sm">🧾 Historique des mouvements financiers</h3>

                    <button onClick={loadCotisationsGeneration} className="bg-white text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2">
                        <RefreshCw size={14} /> Actualiser
                    </button>
                </div>

                {cotisationsGeneration.length === 0 ? (
                    <div className="p-10 text-center text-black/60 font-black italic">
                        Aucun mouvement financier enregistré pour cette génération.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left font-black text-sm">Date</th>
                                    <th className="p-3 text-left font-black text-sm">Membre</th>
                                    <th className="p-3 text-left font-black text-sm">Contact</th>
                                    <th className="p-3 text-left font-black text-sm">Ligne</th>
                                    <th className="p-3 text-left font-black text-sm">Type</th>
                                    <th className="p-3 text-right font-black text-sm">Montant</th>
                                    <th className="p-3 text-left font-black text-sm">Notes</th>
                                </tr>
                            </thead>

                            <tbody>
                                {cotisationsGeneration.map((p: any) => (
                                    <tr key={p.id} className="border-b border-black/10 hover:bg-gray-50">
                                        <td className="p-3 text-sm font-bold text-black/70">{formatDate(getPaiementDate(p))}</td>

                                        <td className="p-3">
                                            <p className="font-black text-black">{getPaiementMembreNom(p)}</p>
                                            {p?.membres?.email && <p className="text-xs text-black/50">{p.membres.email}</p>}
                                        </td>

                                        <td className="p-3 text-sm font-bold text-blue-700">{getPaiementMembreContact(p)}</td>

                                        <td className="p-3 text-sm font-black text-blue-700">{getPaiementLigneTitre(p) || "—"}</td>

                                        <td className="p-3">
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full font-black ${getPaiementType(p).includes("sibity") || getPaiementType(p).includes("sibiti")
                                                        ? "bg-purple-100 text-purple-800"
                                                        : getPaiementType(p).includes("mensualite") || getPaiementType(p).includes("mensualité")
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-orange-100 text-orange-800"
                                                    }`}
                                            >
                                                {getPaiementTypeLabel(p)}
                                            </span>
                                        </td>

                                        <td className="p-3 text-right font-black text-green-700">{formatMontant(p.montant)}</td>

                                        <td className="p-3 text-sm text-black/60 max-w-xs">{getPaiementNotes(p) || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function BudgetSection({
    propositionsBudget,
    formatDate,
    formatMontant,
    handleAccepterProposition,
    setSelectedProposition,
    setMontantNegocie,
    setCommentaireNegocie,
    setCommentaireRejet,
    setShowNegociationModal,
    setShowRejetModal,
    loadPropositionsBudget,
}: any) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-black">Propositions Budgétaires du Bureau Central</h2>
                <button onClick={loadPropositionsBudget} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm">
                    <RefreshCw size={14} /> Rafraîchir
                </button>
            </div>

            {propositionsBudget.length === 0 ? (
                <div className="text-center py-12">
                    <FileText size={48} className="mx-auto text-black/30 mb-4" />
                    <p className="text-xl font-black text-black/60 italic">Aucune proposition budgétaire</p>
                </div>
            ) : (
                propositionsBudget.map((prop: any) => {
                    const montant = prop.montant_corrige || prop.montant_propose || 0;
                    const isEnAttente = prop.statut_chef === "en_attente" || !prop.statut_chef;
                    const isAccepte = prop.statut_chef === "accepte";
                    const isRejete = prop.statut_chef === "rejete";
                    const isNegociation = prop.statut_chef === "negociation";

                    return (
                        <div
                            key={prop.id}
                            className={`border-2 rounded-xl p-5 mb-4 ${isAccepte
                                    ? "border-green-500 bg-green-50"
                                    : isRejete
                                        ? "border-red-500 bg-red-50"
                                        : isNegociation
                                            ? "border-orange-500 bg-orange-50"
                                            : "border-yellow-500 bg-yellow-50"
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-black/60">Proposition du {formatDate(prop.date_proposition)}</p>
                                    <p className="font-black text-black text-2xl">{formatMontant(montant)}</p>
                                    <p className="text-xs text-black/40">Année {prop.annee}</p>
                                    {prop.description && <p className="text-sm text-black/70 italic mt-2">{prop.description}</p>}
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-black ${isAccepte
                                            ? "bg-green-500 text-white"
                                            : isRejete
                                                ? "bg-red-500 text-white"
                                                : isNegociation
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-yellow-500 text-white"
                                        }`}
                                >
                                    {isAccepte ? "✅ Accepté" : isRejete ? "❌ Rejeté" : isNegociation ? "🔄 Négociation" : "⏳ En attente"}
                                </span>
                            </div>

                            {isEnAttente && (
                                <div className="mt-4 pt-3 border-t border-black/10 flex gap-3">
                                    <button onClick={() => handleAccepterProposition(prop)} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-black hover:bg-green-600">
                                        ✅ Accepter
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedProposition(prop);
                                            setMontantNegocie("");
                                            setCommentaireNegocie("");
                                            setShowNegociationModal(true);
                                        }}
                                        className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-black hover:bg-orange-600"
                                    >
                                        💬 Négocier
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedProposition(prop);
                                            setCommentaireRejet("");
                                            setShowRejetModal(true);
                                        }}
                                        className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-black hover:bg-red-600"
                                    >
                                        ❌ Rejeter
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}

function NominationSection({ tresoriers, comiteCom, setNominationType, setShowNominationModal, handleRetirerResponsable }: any) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NominationCard
                title="💰 Nommer un Trésorier"
                primaryLabel="+ Trésorier Titulaire"
                secondaryLabel="+ Trésorier Adjoint"
                primaryAction={() => {
                    setNominationType("tresorier_titulaire");
                    setShowNominationModal(true);
                }}
                secondaryAction={() => {
                    setNominationType("tresorier_adjoint");
                    setShowNominationModal(true);
                }}
                items={tresoriers}
                handleRetirerResponsable={handleRetirerResponsable}
            />

            <NominationCard
                title="📢 Nommer Comité Communication"
                primaryLabel="+ Comité Titulaire"
                secondaryLabel="+ Comité Adjoint"
                primaryAction={() => {
                    setNominationType("comite_com_titulaire");
                    setShowNominationModal(true);
                }}
                secondaryAction={() => {
                    setNominationType("comite_com_adjoint");
                    setShowNominationModal(true);
                }}
                items={comiteCom}
                handleRetirerResponsable={handleRetirerResponsable}
            />
        </div>
    );
}

function NominationCard({ title, primaryLabel, secondaryLabel, primaryAction, secondaryAction, items, handleRetirerResponsable }: any) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-6">
            <h3 className="font-black text-black mb-4">{title}</h3>
            <button onClick={primaryAction} className="w-full bg-blue-600 text-white py-2 rounded-xl mb-2 font-black">
                {primaryLabel}
            </button>
            <button onClick={secondaryAction} className="w-full bg-blue-400 text-white py-2 rounded-xl font-black">
                {secondaryLabel}
            </button>

            {items.length > 0 && (
                <div className="mt-4 pt-3 border-t border-black/10">
                    <h4 className="font-black text-black mb-2">Responsables actuels</h4>
                    {items.map((item: any) => (
                        <div key={item.id} className="flex justify-between py-1">
                            <span className="font-black text-black">{item.nom_complet}</span>
                            <button onClick={() => handleRetirerResponsable(item.id, item.nom_complet)} className="text-red-500 text-sm font-black">
                                Retirer
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MembresSection({ membres, profile, getRoleBadge, getStatusBadge }: any) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
            <div className="bg-black p-4">
                <h2 className="text-white font-black uppercase">📋 Liste des membres</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left font-black text-black">Nom</th>
                            <th className="p-3 text-left font-black text-black">Email</th>
                            <th className="p-3 text-left font-black text-black">Rôle</th>
                            <th className="p-3 text-left font-black text-black">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {membres.map((m: any) => (
                            <tr key={m.id} className="border-b border-black/10">
                                <td className="p-3 font-black text-black">
                                    {m.nom_complet}
                                    {m.id === profile?.id && <span className="ml-2 text-xs bg-yellow-100 px-1 rounded-full">Moi</span>}
                                </td>
                                <td className="p-3 text-black/70">{m.email}</td>
                                <td className="p-3">{getRoleBadge(m.role)}</td>
                                <td className="p-3">{getStatusBadge(m)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BudgetNegociationModal({
    selectedProposition,
    montantNegocie,
    setMontantNegocie,
    commentaireNegocie,
    setCommentaireNegocie,
    close,
    submit,
    formatMontant,
}: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                <h2 className="text-2xl font-black text-black mb-4">💬 Proposer un montant</h2>
                <p className="text-purple-600 font-black mb-2">
                    Proposition initiale: {formatMontant(selectedProposition.montant_propose || 0)}
                </p>
                <input
                    type="number"
                    value={montantNegocie}
                    onChange={(e) => setMontantNegocie(e.target.value)}
                    className="w-full p-3 border-4 border-black rounded-xl mb-3 font-black text-black"
                    placeholder="Votre proposition"
                />
                <textarea
                    value={commentaireNegocie}
                    onChange={(e) => setCommentaireNegocie(e.target.value)}
                    className="w-full p-3 border-4 border-black rounded-xl mb-4 font-black text-black"
                    rows={2}
                    placeholder="Justification"
                />
                <div className="flex gap-3">
                    <button onClick={close} className="flex-1 bg-gray-200 py-2 rounded-xl font-black">
                        Annuler
                    </button>
                    <button onClick={submit} className="flex-1 bg-orange-500 text-white py-2 rounded-xl font-black">
                        Envoyer
                    </button>
                </div>
            </div>
        </div>
    );
}

function BudgetRejetModal({ selectedProposition, commentaireRejet, setCommentaireRejet, close, submit, formatMontant }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                <h2 className="text-2xl font-black text-black mb-4">❌ Rejeter</h2>
                <p className="text-purple-600 font-black mb-2">Proposition: {formatMontant(selectedProposition.montant_propose || 0)}</p>
                <textarea
                    value={commentaireRejet}
                    onChange={(e) => setCommentaireRejet(e.target.value)}
                    className="w-full p-3 border-4 border-black rounded-xl mb-4 font-black text-black"
                    rows={3}
                    placeholder="Motif du rejet"
                    required
                />
                <div className="flex gap-3">
                    <button onClick={close} className="flex-1 bg-gray-200 py-2 rounded-xl font-black">
                        Annuler
                    </button>
                    <button onClick={submit} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-black">
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
}