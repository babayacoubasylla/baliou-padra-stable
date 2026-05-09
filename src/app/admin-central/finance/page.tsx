"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    RefreshCw,
    Plus,
    CheckCircle,
    Clock,
    XCircle,
    Printer,
    Download,
    X,
} from "lucide-react";

type Tab = "campagnes" | "reversements" | "bilans";

export default function FinancePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("campagnes");

    const [campagnes, setCampagnes] = useState<any[]>([]);
    const [reversements, setReversements] = useState<any[]>([]);
    const [bilans, setBilans] = useState<any[]>([]);

    const [showCampagneModal, setShowCampagneModal] = useState(false);
    const [showReversementModal, setShowReversementModal] = useState(false);

    const currentYear = new Date().getFullYear();

    const [newCampagne, setNewCampagne] = useState({
        titre: "",
        description: "",
        type_cotisation: "annuel",
        mode_montant: "fixe",
        montant_attendu: "",
        annee: currentYear.toString(),
        date_debut: new Date().toISOString().split("T")[0],
        date_fin: "",
    });

    const [newReversement, setNewReversement] = useState({
        campagne_id: "",
        generation_nom: "",
        montant: "",
        mode_paiement: "",
        reference_paiement: "",
        commentaire: "",
    });

    const generationsList = [
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

        await loadData();
        setLoading(false);
    };

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

    const loadData = async () => {
        setRefreshing(true);

        const { data: campagnesData, error: campagnesError } = await supabase
            .from("cotisation_campagnes")
            .select("*")
            .order("created_at", { ascending: false });

        if (campagnesError) {
            console.error("Erreur campagnes:", campagnesError);
        }

        setCampagnes(campagnesData || []);

        const { data: reversementsData, error: reversementsError } = await supabase
            .from("reversements_campagnes")
            .select("*, cotisation_campagnes(titre, mode_montant, montant_attendu_par_generation)")
            .order("date_validation", { ascending: false });

        if (reversementsError) {
            console.error("Erreur reversements:", reversementsError);
        }

        setReversements(reversementsData || []);

        const { data: bilansData, error: bilansError } = await supabase
            .from("v_bilan_campagnes")
            .select("*")
            .order("annee", { ascending: false });

        if (bilansError) {
            console.error("Erreur bilans:", bilansError);
        }

        setBilans(bilansData || []);
        setRefreshing(false);
    };

    const resetCampagneForm = () => {
        setNewCampagne({
            titre: "",
            description: "",
            type_cotisation: "annuel",
            mode_montant: "fixe",
            montant_attendu: "",
            annee: currentYear.toString(),
            date_debut: new Date().toISOString().split("T")[0],
            date_fin: "",
        });
    };

    const resetReversementForm = () => {
        setNewReversement({
            campagne_id: "",
            generation_nom: "",
            montant: "",
            mode_paiement: "",
            reference_paiement: "",
            commentaire: "",
        });
    };

    const handleCreateCampagne = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newCampagne.titre.trim()) {
            alert("Veuillez saisir le titre de la campagne.");
            return;
        }

        if (
            newCampagne.mode_montant === "fixe" &&
            (!newCampagne.montant_attendu || Number(newCampagne.montant_attendu) <= 0)
        ) {
            alert("Veuillez saisir le montant attendu par génération.");
            return;
        }

        const { error } = await supabase.rpc("creer_campagne_centrale", {
            p_titre: newCampagne.titre,
            p_description: newCampagne.description || null,
            p_type_cotisation: newCampagne.type_cotisation,
            p_mode_montant: newCampagne.mode_montant,
            p_montant_attendu:
                newCampagne.mode_montant === "fixe"
                    ? Number(newCampagne.montant_attendu)
                    : null,
            p_annee: Number(newCampagne.annee || currentYear),
            p_date_debut: newCampagne.date_debut || null,
            p_date_fin: newCampagne.date_fin || null,
        });

        if (error) {
            alert("Erreur : " + error.message);
            return;
        }

        alert("Campagne centrale créée avec succès !");
        setShowCampagneModal(false);
        resetCampagneForm();
        await loadData();
    };

    const handleCreateReversement = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newReversement.campagne_id) {
            alert("Veuillez sélectionner une campagne.");
            return;
        }

        if (!newReversement.generation_nom) {
            alert("Veuillez sélectionner une génération.");
            return;
        }

        if (!newReversement.montant || Number(newReversement.montant) <= 0) {
            alert("Veuillez saisir un montant valide.");
            return;
        }

        const { data, error } = await supabase.rpc("enregistrer_reversement_central", {
            p_campagne_id: newReversement.campagne_id,
            p_generation_nom: newReversement.generation_nom,
            p_montant: Number(newReversement.montant),
            p_mode_paiement: newReversement.mode_paiement || null,
            p_reference_paiement: newReversement.reference_paiement || null,
            p_commentaire: newReversement.commentaire || null,
        });

        if (error) {
            alert("Erreur : " + error.message);
            return;
        }

        alert(`Reversement enregistré avec succès. Reçu : ${data?.recu_numero || ""}`);
        setShowReversementModal(false);
        resetReversementForm();
        await loadData();
    };

    const getStatutBadge = (statut?: string | null) => {
        const value = cleanValue(statut || "active");

        if (value === "active") {
            return (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">
                    Active
                </span>
            );
        }

        if (value === "cloturee") {
            return (
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-black">
                    Clôturée
                </span>
            );
        }

        if (value === "annulee") {
            return (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black">
                    Annulée
                </span>
            );
        }

        return (
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">
                {value}
            </span>
        );
    };

    const printRecu = (reversement: any) => {
        const html = `
            <html>
                <head>
                    <title>Reçu reversement</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .title { font-size: 28px; font-weight: bold; color: #146332; }
                        .box { border: 3px solid black; padding: 20px; margin-top: 20px; }
                        .line { margin: 10px 0; }
                        .label { font-weight: bold; }
                        .footer { margin-top: 40px; text-align: center; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">BALIOU PADRA</div>
                        <div>Reçu de reversement au Bureau Central</div>
                    </div>
                    <div class="box">
                        <h2>REÇU : ${reversement.recu_numero || "—"}</h2>
                        <div class="line"><span class="label">Campagne :</span> ${reversement.cotisation_campagnes?.titre || "—"}</div>
                        <div class="line"><span class="label">Génération :</span> ${reversement.generation_nom}</div>
                        <div class="line"><span class="label">Montant :</span> ${formatMontant(reversement.montant)}</div>
                        <div class="line"><span class="label">Mode paiement :</span> ${reversement.mode_paiement || "—"}</div>
                        <div class="line"><span class="label">Référence :</span> ${reversement.reference_paiement || "—"}</div>
                        <div class="line"><span class="label">Date validation :</span> ${formatDate(reversement.date_validation)}</div>
                        <div class="line"><span class="label">Commentaire :</span> ${reversement.commentaire || "—"}</div>
                    </div>
                    <div class="footer">
                        Document généré par la plateforme Baliou Padra
                    </div>
                </body>
            </html>
        `;

        const win = window.open();

        if (!win) {
            alert("Impossible d’ouvrir la fenêtre d’impression.");
            return;
        }

        win.document.write(html);
        win.document.close();
        win.print();
    };

    const exportReversements = () => {
        const rows = reversements.map((r) => ({
            Date: formatDate(r.date_validation),
            Campagne: r.cotisation_campagnes?.titre || "",
            Generation: r.generation_nom,
            Montant: r.montant,
            Mode: r.mode_paiement || "",
            Reference: r.reference_paiement || "",
            Recu: r.recu_numero || "",
            Commentaire: r.commentaire || "",
        }));

        if (rows.length === 0) return;

        const headers = Object.keys(rows[0]);

        const csv =
            "\uFEFF" +
            headers.join(";") +
            "\n" +
            rows
                .map((row: any) =>
                    headers
                        .map((h) => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`)
                        .join(";")
                )
                .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `reversements_campagnes_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-2xl font-black text-black">Chargement...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-white p-6 text-black">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                    <Link
                        href="/admin-central"
                        className="inline-flex items-center gap-2 text-black font-black hover:text-[#146332] transition-colors mb-4"
                    >
                        <ArrowLeft size={20} /> Retour au tableau de bord
                    </Link>

                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                GESTION FINANCIÈRE CENTRALE
                            </h1>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">
                                Campagnes centrales, reversements des générations et bilans
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setShowCampagneModal(true)}
                                className="bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> Nouvelle campagne
                            </button>

                            <button
                                onClick={() => setShowReversementModal(true)}
                                className="bg-black text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-[#146332] transition-all flex items-center gap-2"
                            >
                                <CheckCircle size={16} /> Enregistrer reversement
                            </button>

                            <button
                                onClick={loadData}
                                disabled={refreshing}
                                className="bg-gray-200 text-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-300 transition-all flex items-center gap-2"
                            >
                                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex flex-wrap gap-2 border-b-4 border-black mb-6">
                    <button
                        onClick={() => setActiveTab("campagnes")}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all ${activeTab === "campagnes"
                                ? "bg-black text-white rounded-t-2xl"
                                : "text-black"
                            }`}
                    >
                        📋 Campagnes centrales
                    </button>

                    <button
                        onClick={() => setActiveTab("reversements")}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all ${activeTab === "reversements"
                                ? "bg-black text-white rounded-t-2xl"
                                : "text-black"
                            }`}
                    >
                        💰 Reversements
                    </button>

                    <button
                        onClick={() => setActiveTab("bilans")}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all ${activeTab === "bilans"
                                ? "bg-black text-white rounded-t-2xl"
                                : "text-black"
                            }`}
                    >
                        📊 Bilans
                    </button>
                </div>

                {activeTab === "campagnes" && (
                    <section className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                        <div className="bg-black p-4">
                            <h2 className="text-white font-black uppercase text-sm">
                                Campagnes centrales
                            </h2>
                        </div>

                        {campagnes.length === 0 ? (
                            <div className="p-12 text-center text-black/60 italic">
                                Aucune campagne centrale créée.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-black">Titre</th>
                                            <th className="p-3 text-left font-black">Type</th>
                                            <th className="p-3 text-left font-black">Mode</th>
                                            <th className="p-3 text-right font-black">Montant attendu</th>
                                            <th className="p-3 text-left font-black">Période</th>
                                            <th className="p-3 text-center font-black">Statut</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {campagnes.map((c) => (
                                            <tr key={c.id} className="border-b border-black/10">
                                                <td className="p-3 font-black">
                                                    {c.titre}
                                                    <p className="text-xs text-black/50">
                                                        {c.description || "—"}
                                                    </p>
                                                </td>
                                                <td className="p-3">{c.type_cotisation}</td>
                                                <td className="p-3">{c.mode_montant}</td>
                                                <td className="p-3 text-right font-black text-green-700">
                                                    {c.mode_montant === "fixe"
                                                        ? formatMontant(c.montant_attendu_par_generation)
                                                        : "Libre"}
                                                </td>
                                                <td className="p-3 text-sm">
                                                    {formatDate(c.date_debut)} → {formatDate(c.date_fin)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {getStatutBadge(c.statut)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {activeTab === "reversements" && (
                    <section className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                        <div className="bg-black p-4 flex justify-between items-center">
                            <h2 className="text-white font-black uppercase text-sm">
                                Reversements des générations
                            </h2>

                            <button
                                onClick={exportReversements}
                                className="bg-white text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2"
                            >
                                <Download size={14} /> Exporter
                            </button>
                        </div>

                        {reversements.length === 0 ? (
                            <div className="p-12 text-center text-black/60 italic">
                                Aucun reversement enregistré.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-black">Date</th>
                                            <th className="p-3 text-left font-black">Campagne</th>
                                            <th className="p-3 text-left font-black">Génération</th>
                                            <th className="p-3 text-right font-black">Montant</th>
                                            <th className="p-3 text-left font-black">Mode</th>
                                            <th className="p-3 text-left font-black">Reçu</th>
                                            <th className="p-3 text-center font-black">Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {reversements.map((r) => (
                                            <tr key={r.id} className="border-b border-black/10">
                                                <td className="p-3">{formatDate(r.date_validation)}</td>
                                                <td className="p-3 font-black">
                                                    {r.cotisation_campagnes?.titre || "—"}
                                                </td>
                                                <td className="p-3">{r.generation_nom}</td>
                                                <td className="p-3 text-right font-black text-green-700">
                                                    {formatMontant(r.montant)}
                                                </td>
                                                <td className="p-3">{r.mode_paiement || "—"}</td>
                                                <td className="p-3 font-black text-blue-700">
                                                    {r.recu_numero || "—"}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => printRecu(r)}
                                                        className="text-blue-600 font-black"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {activeTab === "bilans" && (
                    <section className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                        <div className="bg-black p-4">
                            <h2 className="text-white font-black uppercase text-sm">
                                Bilans automatiques par campagne
                            </h2>
                        </div>

                        {bilans.length === 0 ? (
                            <div className="p-12 text-center text-black/60 italic">
                                Aucun bilan disponible.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-black">Campagne</th>
                                            <th className="p-3 text-left font-black">Année</th>
                                            <th className="p-3 text-right font-black">Entrées</th>
                                            <th className="p-3 text-right font-black">Dépenses</th>
                                            <th className="p-3 text-right font-black">Solde</th>
                                            <th className="p-3 text-center font-black">Statut</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {bilans.map((b) => (
                                            <tr key={b.campagne_id} className="border-b border-black/10">
                                                <td className="p-3 font-black">
                                                    {b.titre}
                                                    <p className="text-xs text-black/50">
                                                        {b.description || "—"}
                                                    </p>
                                                </td>
                                                <td className="p-3">{b.annee}</td>
                                                <td className="p-3 text-right font-black text-green-700">
                                                    {formatMontant(b.total_entrees)}
                                                </td>
                                                <td className="p-3 text-right font-black text-red-700">
                                                    {formatMontant(b.total_depenses)}
                                                </td>
                                                <td className="p-3 text-right font-black text-blue-700">
                                                    {formatMontant(b.solde)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {getStatutBadge(b.statut)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {/* Modal création campagne */}
                {showCampagneModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white border-4 border-black rounded-2xl max-w-xl w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black">
                                    Nouvelle campagne centrale
                                </h2>
                                <button onClick={() => setShowCampagneModal(false)}>
                                    <X size={26} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateCampagne} className="space-y-4">
                                <Input
                                    label="Titre"
                                    value={newCampagne.titre}
                                    onChange={(v) => setNewCampagne({ ...newCampagne, titre: v })}
                                    required
                                />

                                <Textarea
                                    label="Description"
                                    value={newCampagne.description}
                                    onChange={(v) =>
                                        setNewCampagne({ ...newCampagne, description: v })
                                    }
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select
                                        label="Type"
                                        value={newCampagne.type_cotisation}
                                        onChange={(v) =>
                                            setNewCampagne({
                                                ...newCampagne,
                                                type_cotisation: v,
                                            })
                                        }
                                        options={[
                                            { value: "annuel", label: "Annuel" },
                                            { value: "extraordinaire", label: "Extraordinaire" },
                                            { value: "libre", label: "Libre" },
                                            { value: "projet", label: "Projet" },
                                            { value: "autre", label: "Autre" },
                                        ]}
                                    />

                                    <Select
                                        label="Mode montant"
                                        value={newCampagne.mode_montant}
                                        onChange={(v) =>
                                            setNewCampagne({
                                                ...newCampagne,
                                                mode_montant: v,
                                                montant_attendu:
                                                    v === "libre" ? "" : newCampagne.montant_attendu,
                                            })
                                        }
                                        options={[
                                            { value: "fixe", label: "Montant fixe" },
                                            { value: "libre", label: "Montant libre" },
                                        ]}
                                    />
                                </div>

                                {newCampagne.mode_montant === "fixe" && (
                                    <Input
                                        label="Montant attendu par génération"
                                        type="number"
                                        value={newCampagne.montant_attendu}
                                        onChange={(v) =>
                                            setNewCampagne({
                                                ...newCampagne,
                                                montant_attendu: v,
                                            })
                                        }
                                        required
                                    />
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="Année"
                                        type="number"
                                        value={newCampagne.annee}
                                        onChange={(v) =>
                                            setNewCampagne({ ...newCampagne, annee: v })
                                        }
                                    />

                                    <Input
                                        label="Date début"
                                        type="date"
                                        value={newCampagne.date_debut}
                                        onChange={(v) =>
                                            setNewCampagne({
                                                ...newCampagne,
                                                date_debut: v,
                                            })
                                        }
                                    />

                                    <Input
                                        label="Date fin"
                                        type="date"
                                        value={newCampagne.date_fin}
                                        onChange={(v) =>
                                            setNewCampagne({ ...newCampagne, date_fin: v })
                                        }
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCampagneModal(false)}
                                        className="flex-1 bg-gray-200 py-3 rounded-xl font-black"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-black text-white py-3 rounded-xl font-black"
                                    >
                                        Créer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal reversement */}
                {showReversementModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white border-4 border-black rounded-2xl max-w-xl w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black">
                                    Enregistrer un reversement reçu
                                </h2>
                                <button onClick={() => setShowReversementModal(false)}>
                                    <X size={26} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateReversement} className="space-y-4">
                                <Select
                                    label="Campagne"
                                    value={newReversement.campagne_id}
                                    onChange={(v) =>
                                        setNewReversement({
                                            ...newReversement,
                                            campagne_id: v,
                                        })
                                    }
                                    options={[
                                        { value: "", label: "Sélectionner" },
                                        ...campagnes
                                            .filter((c) => c.statut === "active")
                                            .map((c) => ({
                                                value: c.id,
                                                label: `${c.titre} — ${c.annee}`,
                                            })),
                                    ]}
                                />

                                <Select
                                    label="Génération"
                                    value={newReversement.generation_nom}
                                    onChange={(v) =>
                                        setNewReversement({
                                            ...newReversement,
                                            generation_nom: v,
                                        })
                                    }
                                    options={[
                                        { value: "", label: "Sélectionner" },
                                        ...generationsList.map((g) => ({
                                            value: g,
                                            label: g,
                                        })),
                                    ]}
                                />

                                <Input
                                    label="Montant reçu"
                                    type="number"
                                    value={newReversement.montant}
                                    onChange={(v) =>
                                        setNewReversement({
                                            ...newReversement,
                                            montant: v,
                                        })
                                    }
                                    required
                                />

                                <Input
                                    label="Mode de paiement"
                                    value={newReversement.mode_paiement}
                                    onChange={(v) =>
                                        setNewReversement({
                                            ...newReversement,
                                            mode_paiement: v,
                                        })
                                    }
                                />

                                <Input
                                    label="Référence paiement"
                                    value={newReversement.reference_paiement}
                                    onChange={(v) =>
                                        setNewReversement({
                                            ...newReversement,
                                            reference_paiement: v,
                                        })
                                    }
                                />

                                <Textarea
                                    label="Commentaire"
                                    value={newReversement.commentaire}
                                    onChange={(v) =>
                                        setNewReversement({
                                            ...newReversement,
                                            commentaire: v,
                                        })
                                    }
                                />

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowReversementModal(false)}
                                        className="flex-1 bg-gray-200 py-3 rounded-xl font-black"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-black text-white py-3 rounded-xl font-black"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="mt-6 text-right">
                    <p className="text-xs text-gray-400 font-black uppercase">
                        Bureau Central Baliou Padra — Gestion financière centrale
                    </p>
                </div>
            </div>
        </main>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="block text-xs font-black uppercase text-gray-600 mb-1">
                {label}
            </span>
            <input
                type={type}
                value={value}
                required={required}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white"
            />
        </label>
    );
}

function Textarea({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <label className="block">
            <span className="block text-xs font-black uppercase text-gray-600 mb-1">
                {label}
            </span>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white"
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
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <label className="block">
            <span className="block text-xs font-black uppercase text-gray-600 mb-1">
                {label}
            </span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white"
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

function getStatutBadge(statut?: string | null) {
    const value = (statut || "active").toString();

    if (value === "active") {
        return (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">
                Active
            </span>
        );
    }

    if (value === "cloturee") {
        return (
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-black">
                Clôturée
            </span>
        );
    }

    if (value === "annulee") {
        return (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black">
                Annulée
            </span>
        );
    }

    return (
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">
            {value}
        </span>
    );
}