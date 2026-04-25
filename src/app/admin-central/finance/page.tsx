"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function FinancePage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('budgets');
    const [generations, setGenerations] = useState<any[]>([]);
    const [selectedGeneration, setSelectedGeneration] = useState("");
    const [propositions, setPropositions] = useState<any[]>([]);
    const [nouvelleProposition, setNouvelleProposition] = useState({
        generation_nom: "",
        annee: new Date().getFullYear(),
        montant_propose: "",
        description: ""
    });
    const [cotisationsExtra, setCotisationsExtra] = useState<any[]>([]);
    const [nouvelleCotisationExtra, setNouvelleCotisationExtra] = useState({
        nom: "",
        description: "",
        montant_requis: "",
        date_limite: "",
        attribue_a_toutes: true,
        generations_concernees: []
    });
    const [financeData, setFinanceData] = useState({
        objectif_actuel: 0,
        collecte_totale: 0,
        progression: 0,
        reste_atteindre: 0,
        versements_par_type: { sibity: 0, mensualite: 0, extraordinaire: 0 },
        historique: []
    });

    const router = useRouter();
    const currentYear = new Date().getFullYear();

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
        "Diaspora"
    ];

    useEffect(() => {
        checkAuthAndLoadData();
    }, []);

    const checkAuthAndLoadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('membres')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (profile?.role !== 'baliou_padra' && profile?.role !== 'super_admin') {
            router.push('/dashboard');
            return;
        }

        setGenerations(generationsList);
        setSelectedGeneration(generationsList[0]);

        await loadPropositions();
        await loadCotisationsExtra();
        await loadFinanceData(generationsList[0]);

        setLoading(false);
    };

    const loadPropositions = async () => {
        const { data } = await supabase
            .from('propositions_budgetaires')
            .select('*')
            .order('date_proposition', { ascending: false });

        setPropositions(data || []);
    };

    const loadCotisationsExtra = async () => {
        const { data } = await supabase
            .from('cotisations_extraordinaires')
            .select('*')
            .order('created_at', { ascending: false });

        setCotisationsExtra(data || []);
    };

    const loadFinanceData = async (generationNom: any) => {
        const { data: budgetValide } = await supabase
            .from('propositions_budgetaires')
            .select('montant_propose')
            .eq('generation_nom', generationNom)
            .eq('annee', currentYear)
            .eq('statut_chef', 'accepte')
            .maybeSingle();

        const objectif = budgetValide?.montant_propose || 0;

        const { data: membresGen } = await supabase
            .from('membres')
            .select('id')
            .eq('generation', generationNom);

        const membreIds = membresGen?.map(m => m.id) || [];

        let collecteTotale = 0;
        let versementsParType = { sibity: 0, mensualite: 0, extraordinaire: 0 };
        let cotisationsData = [];
        let versementsCentrauxData = [];

        if (membreIds.length > 0) {
            const { data: cotisations } = await supabase
                .from('cotisations')
                .select('montant, type, date_cotisation')
                .in('membre_id', membreIds);

            if (cotisations) {
                cotisationsData = cotisations;
                cotisations.forEach(c => {
                    const type = c.type === 'sibity' ? 'sibity' : 'mensualite';
                    versementsParType[type] = (versementsParType[type] || 0) + (c.montant || 0);
                    collecteTotale += c.montant || 0;
                });
            }
        }

        const { data: versementsCentraux } = await supabase
            .from('versements_centraux')
            .select('montant, type, date_versement, statut')
            .eq('generation', generationNom);

        if (versementsCentraux) {
            versementsCentrauxData = versementsCentraux;
            versementsCentraux.forEach(v => {
                if (v.type === 'extraordinaire') {
                    versementsParType.extraordinaire = (versementsParType.extraordinaire || 0) + (v.montant || 0);
                    collecteTotale += v.montant || 0;
                } else if (v.type === 'sibity') {
                    versementsParType.sibity = (versementsParType.sibity || 0) + (v.montant || 0);
                    collecteTotale += v.montant || 0;
                } else if (v.type === 'mensualite') {
                    versementsParType.mensualite = (versementsParType.mensualite || 0) + (v.montant || 0);
                    collecteTotale += v.montant || 0;
                }
            });
        }

        const historique = [...cotisationsData, ...versementsCentrauxData].sort((a, b) =>
            new Date(b.date_cotisation || b.date_versement).getTime() - new Date(a.date_cotisation || a.date_versement).getTime()
        ).slice(0, 20);

        const progression = objectif > 0 ? (collecteTotale / objectif) * 100 : 0;
        const resteAtteindre = Math.max(0, objectif - collecteTotale);

        setFinanceData({
            objectif_actuel: objectif,
            collecte_totale: collecteTotale,
            progression: Math.min(100, progression),
            reste_atteindre: resteAtteindre,
            versements_par_type: versementsParType,
            historique
        });
    };

    const handleCreateProposition = async (e: any) => {
        e.preventDefault();

        const { error } = await supabase
            .from('propositions_budgetaires')
            .insert([{
                generation_nom: nouvelleProposition.generation_nom,
                annee: nouvelleProposition.annee,
                montant_propose: parseInt(nouvelleProposition.montant_propose),
                description: nouvelleProposition.description,
                statut: 'en_attente',
                statut_chef: 'en_attente'
            }]);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Proposition budgétaire créée avec succès !");
        setNouvelleProposition({
            generation_nom: "",
            annee: currentYear,
            montant_propose: "",
            description: ""
        });
        await loadPropositions();
    };

    const handleValiderProposition = async (propositionId: any) => {
        const { error } = await supabase
            .from('propositions_budgetaires')
            .update({ statut: 'valide', date_validation: new Date().toISOString() })
            .eq('id', propositionId);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Proposition validée !");
        await loadPropositions();

        if (selectedGeneration) {
            await loadFinanceData(selectedGeneration);
        }
    };

    const handleRejeterProposition = async (propositionId: any) => {
        const { error } = await supabase
            .from('propositions_budgetaires')
            .update({ statut: 'rejete' })
            .eq('id', propositionId);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Proposition rejetée");
        await loadPropositions();
    };

    const handleAccepterNegociation = async (propositionId: any, nouveauMontant: any) => {
        const { error } = await supabase
            .from('propositions_budgetaires')
            .update({
                statut_chef: 'accepte',
                montant_propose: nouveauMontant,
                date_reponse: new Date().toISOString()
            })
            .eq('id', propositionId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Négociation acceptée ! Budget mis à jour.");
            await loadPropositions();
            if (selectedGeneration) {
                await loadFinanceData(selectedGeneration);
            }
        }
    };

    const handleMaintenirProposition = async (propositionId: any) => {
        const { error } = await supabase
            .from('propositions_budgetaires')
            .update({
                statut_chef: 'rejete',
                date_reponse: new Date().toISOString()
            })
            .eq('id', propositionId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Proposition maintenue.");
            await loadPropositions();
        }
    };
    const handleCreateCotisationExtra = async (e: any) => {
        e.preventDefault();

        const { error } = await supabase
            .from('cotisations_extraordinaires')
            .insert([{
                nom: nouvelleCotisationExtra.nom,
                description: nouvelleCotisationExtra.description,
                montant_requis: parseInt(nouvelleCotisationExtra.montant_requis),
                date_limite: nouvelleCotisationExtra.date_limite || null,
                attribue_a_toutes: nouvelleCotisationExtra.attribue_a_toutes,
                generations_concernees: nouvelleCotisationExtra.attribue_a_toutes ? [] : nouvelleCotisationExtra.generations_concernees
            }]);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Cotisation extraordinaire créée !");
        setNouvelleCotisationExtra({
            nom: "",
            description: "",
            montant_requis: "",
            date_limite: "",
            attribue_a_toutes: true,
            generations_concernees: []
        });
        await loadCotisationsExtra();
    };

    const handleTerminerCotisation = async (cotisationId: any) => {
        const { error } = await supabase
            .from('cotisations_extraordinaires')
            .update({ statut: 'terminee' })
            .eq('id', cotisationId);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Cotisation terminée");
        await loadCotisationsExtra();
    };

    const handleGenerationChange = async (e: any) => {
        const gen = e.target.value;
        setSelectedGeneration(gen);
        await loadFinanceData(gen);
    };

    const formatMontant = (montant: any) => {
        if (!montant && montant !== 0) return '0 FCFA';
        return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
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
                <div className="mb-6">
                    <Link href="/admin-central" className="inline-flex items-center gap-2 text-black font-black hover:text-[#146332] transition-colors mb-4">
                        <span>←</span> Retour au tableau de bord
                    </Link>
                    <h1 className="text-4xl font-black text-[#146332] uppercase italic">GESTION FINANCIÈRE</h1>
                    <div className="h-1 w-32 bg-black mt-2"></div>
                    <p className="text-black/60 mt-2">Budgets, cotisations et suivi des générations</p>
                </div>

                <div className="flex flex-wrap gap-2 border-b-4 border-black mb-6">
                    <button onClick={() => setActiveTab('budgets')} className={`px-6 py-3 font-black uppercase text-sm transition-all ${activeTab === 'budgets' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}>📋 Propositions budgétaires</button>
                    <button onClick={() => setActiveTab('suivicotisations')} className={`px-6 py-3 font-black uppercase text-sm transition-all ${activeTab === 'suivicotisations' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}>📊 Suivi des cotisations</button>
                    <button onClick={() => setActiveTab('extraordinaire')} className={`px-6 py-3 font-black uppercase text-sm transition-all ${activeTab === 'extraordinaire' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}>⚡ Cotisations extraordinaires</button>
                </div>

                {activeTab === 'budgets' && (
                    <div className="space-y-8">
                        {/* Formulaire nouvelle proposition */}
                        <div className="bg-white border-4 border-black rounded-2xl p-6">
                            <h2 className="text-xl font-black text-black mb-4">📝 Nouvelle proposition budgétaire</h2>
                            <form onSubmit={handleCreateProposition} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-black font-black mb-1">Génération</label>
                                        <select value={nouvelleProposition.generation_nom} onChange={(e) => setNouvelleProposition({ ...nouvelleProposition, generation_nom: e.target.value })} className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white" required>
                                            <option value="">Sélectionner</option>
                                            {generationsList.map(gen => <option key={gen} value={gen}>{gen}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-black font-black mb-1">Année</label>
                                        <input type="number" value={nouvelleProposition.annee} onChange={(e) => setNouvelleProposition({ ...nouvelleProposition, annee: parseInt(e.target.value) })} className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white" required />
                                    </div>
                                    <div>
                                        <label className="block text-black font-black mb-1">Montant proposé (FCFA)</label>
                                        <input type="number" value={nouvelleProposition.montant_propose} onChange={(e) => setNouvelleProposition({ ...nouvelleProposition, montant_propose: e.target.value })} className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white" required />
                                    </div>
                                    <div>
                                        <label className="block text-black font-black mb-1">Description</label>
                                        <input type="text" value={nouvelleProposition.description} onChange={(e) => setNouvelleProposition({ ...nouvelleProposition, description: e.target.value })} className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white" placeholder="Budget annuel..." />
                                    </div>
                                </div>
                                <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase text-sm hover:bg-[#146332] transition-all">+ Créer la proposition</button>
                            </form>
                        </div>

                        {/* Tableau des propositions */}
                        <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                            <div className="bg-black p-4"><h2 className="text-white font-black uppercase text-sm">📋 Propositions existantes</h2></div>
                            {propositions.length === 0 ? (
                                <div className="p-12 text-center text-black/60 italic">Aucune proposition budgétaire</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100">
                                            <tr><th className="p-3 text-left font-black">Génération</th><th className="p-3 text-left font-black">Année</th><th className="p-3 text-left font-black">Montant</th><th className="p-3 text-left font-black">Statut BC</th><th className="p-3 text-left font-black">Statut Chef</th><th className="p-3 text-center font-black">Actions</th></tr>
                                        </thead>
                                        <tbody>
                                            {propositions.map((prop) => (
                                                <tr key={prop.id} className="border-b border-black/10">
                                                    <td className="p-3 font-black text-black">{prop.generation_nom}</td>
                                                    <td className="p-3">{prop.annee}</td>
                                                    <td className="p-3 font-black text-green-600">{formatMontant(prop.montant_propose)}</td>
                                                    <td className="p-3">
                                                        {prop.statut === 'valide' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-black">✅ Validé BC</span>}
                                                        {prop.statut === 'en_attente' && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-black">⏳ En attente BC</span>}
                                                        {prop.statut === 'rejete' && <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-black">❌ Rejeté BC</span>}
                                                    </td>
                                                    <td className="p-3">
                                                        {prop.statut_chef === 'accepte' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-black">✅ Accepté Chef</span>}
                                                        {(!prop.statut_chef || prop.statut_chef === 'en_attente') && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-black">⏳ En attente Chef</span>}
                                                        {prop.statut_chef === 'rejete' && <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-black">❌ Rejeté Chef</span>}
                                                        {prop.statut_chef === 'negociation' && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-black">🔄 Négociation</span>}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {prop.statut === 'en_attente' && (
                                                            <div className="flex gap-2 justify-center">
                                                                <button onClick={() => handleValiderProposition(prop.id)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-black">Valider BC</button>
                                                                <button onClick={() => handleRejeterProposition(prop.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black">Rejeter BC</button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* SECTION: RÉPONSES DES CHEFS */}
                        {propositions.filter(p => p.statut_chef !== 'en_attente' && p.statut_chef !== undefined).length > 0 && (
                            <div className="bg-white border-4 border-black rounded-2xl p-6">
                                <h2 className="text-xl font-black text-black mb-4">📋 Réponses des Chefs de Génération</h2>
                                <div className="space-y-4">
                                    {propositions.filter(p => p.statut_chef !== 'en_attente' && p.statut_chef !== undefined).map((prop) => {
                                        const isAccepte = prop.statut_chef === 'accepte';
                                        const isRejete = prop.statut_chef === 'rejete';
                                        const isNegociation = prop.statut_chef === 'negociation';
                                        return (
                                            <div key={prop.id} className={`border-2 rounded-xl p-4 ${isAccepte ? 'border-green-500 bg-green-50' : isRejete ? 'border-red-500 bg-red-50' : 'border-orange-500 bg-orange-50'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-black text-black text-lg">{prop.generation_nom}</p>
                                                        <p className="text-sm text-black/60">Proposition du {new Date(prop.date_proposition).toLocaleDateString()}</p>
                                                        <p className="text-sm text-black/60">Montant initial: <span className="font-black">{formatMontant(prop.montant_propose)}</span></p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${isAccepte ? 'bg-green-500 text-white' : isRejete ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                                                            {isAccepte ? '✅ Accepté' : isRejete ? '❌ Rejeté' : '🔄 Négociation'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isNegociation && prop.montant_corrige && (
                                                    <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                                                        <p className="text-sm font-black text-orange-800">Proposition du Chef :</p>
                                                        <p className="font-black text-orange-800">{formatMontant(prop.montant_corrige)}</p>
                                                        {prop.commentaire_chef && <p className="text-sm text-orange-700 mt-1">Commentaire : {prop.commentaire_chef}</p>}
                                                        <div className="flex gap-3 mt-3">
                                                            <button onClick={() => handleAccepterNegociation(prop.id, prop.montant_corrige)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-sm">Accepter la négociation</button>
                                                            <button onClick={() => handleMaintenirProposition(prop.id)} className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-sm">Maintenir proposition</button>
                                                        </div>
                                                    </div>
                                                )}
                                                {isRejete && prop.commentaire_chef && (
                                                    <div className="mt-3 p-3 bg-red-100 rounded-lg">
                                                        <p className="text-sm font-black text-red-800">Motif du rejet :</p>
                                                        <p className="text-sm text-red-700">{prop.commentaire_chef}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'suivicotisations' && (
                    <div className="space-y-8">
                        <div className="bg-white border-4 border-black rounded-2xl p-6">
                            <label className="block text-black font-black mb-2">Sélectionner une génération</label>
                            <select value={selectedGeneration} onChange={handleGenerationChange} className="w-full md:w-96 p-4 border-4 border-black rounded-2xl font-black text-black bg-white">
                                {generations.map((gen) => <option key={gen} value={gen}>{gen}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white border-4 border-black rounded-2xl p-5"><p className="text-xs font-black uppercase text-black/50">Objectif budgétaire</p><p className="text-2xl font-black text-black">{formatMontant(financeData.objectif_actuel)}</p></div>
                            <div className="bg-white border-4 border-black rounded-2xl p-5"><p className="text-xs font-black uppercase text-black/50">Collecte totale</p><p className="text-2xl font-black text-green-600">{formatMontant(financeData.collecte_totale)}</p></div>
                            <div className="bg-white border-4 border-black rounded-2xl p-5"><p className="text-xs font-black uppercase text-black/50">Progression</p><p className="text-2xl font-black text-blue-600">{financeData.progression.toFixed(1)}%</p></div>
                            <div className="bg-white border-4 border-black rounded-2xl p-5"><p className="text-xs font-black uppercase text-black/50">Reste à atteindre</p><p className="text-2xl font-black text-orange-600">{formatMontant(financeData.reste_atteindre)}</p></div>
                        </div>
                        <div className="bg-white border-4 border-black rounded-2xl p-6">
                            <div className="flex justify-between mb-2"><span className="font-black text-black">Progression</span><span className="font-black text-black">{financeData.progression.toFixed(1)}%</span></div>
                            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-black"><div className="h-full bg-green-500" style={{ width: `${financeData.progression}%` }}></div></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border-4 border-black rounded-2xl p-5 text-center"><span className="text-3xl">📿</span><p className="font-black text-black mt-2">Sibity</p><p className="text-xl font-black text-green-600">{formatMontant(financeData.versements_par_type.sibity)}</p></div>
                            <div className="bg-white border-4 border-black rounded-2xl p-5 text-center"><span className="text-3xl">📅</span><p className="font-black text-black mt-2">Mensualités</p><p className="text-xl font-black text-green-600">{formatMontant(financeData.versements_par_type.mensualite)}</p></div>
                            <div className="bg-white border-4 border-black rounded-2xl p-5 text-center"><span className="text-3xl">⚡</span><p className="font-black text-black mt-2">Extraordinaire</p><p className="text-xl font-black text-green-600">{formatMontant(financeData.versements_par_type.extraordinaire)}</p></div>
                        </div>
                        <div className="bg-white border-4 border-black rounded-2xl p-6">
                            <h3 className="font-black text-black mb-4">📜 Historique récent des versements</h3>
                            {financeData.historique.length === 0 ? <p className="text-black/60 italic">Aucun versement enregistré</p> : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {financeData.historique.map((v, idx) => (
                                        <div key={idx} className="flex justify-between border-b border-black/10 py-2">
                                            <span className="text-sm text-black/60">{new Date(v.date_cotisation || v.date_versement).toLocaleDateString()}</span>
                                            <span className="font-black text-black">{v.type || 'versement'}</span>
                                            <span className="font-black text-green-600">{formatMontant(v.montant || 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'extraordinaire' && (
                    <div className="space-y-8">
                        <div className="bg-white border-4 border-black rounded-2xl p-6">
                            <h2 className="text-xl font-black text-black mb-4">⚡ Nouvelle cotisation extraordinaire</h2>
                            <form onSubmit={handleCreateCotisationExtra} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-black font-black mb-1">Nom</label><input type="text" value={nouvelleCotisationExtra.nom} onChange={(e) => setNouvelleCotisationExtra({ ...nouvelleCotisationExtra, nom: e.target.value })} className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white" placeholder="Ex: Projet Mosquée..." required /></div>
                                    <div><label className="block text-black font-black mb-1">Montant requis</label><input type="number" value={nouvelleCotisationExtra.montant_requis} onChange={(e) => setNouvelleCotisationExtra({ ...nouvelleCotisationExtra, montant_requis: e.target.value })} className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white" required /></div>
                                    <div className="md:col-span-2"><label className="block text-black font-black mb-1">Description</label><textarea value={nouvelleCotisationExtra.description} onChange={(e) => setNouvelleCotisationExtra({ ...nouvelleCotisationExtra, description: e.target.value })} className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white" rows={2} placeholder="Objectif..." /></div>
                                    <div><label className="block text-black font-black mb-1">Date limite</label><input type="date" value={nouvelleCotisationExtra.date_limite} onChange={(e) => setNouvelleCotisationExtra({ ...nouvelleCotisationExtra, date_limite: e.target.value })} className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white" /></div>
                                    <div className="md:col-span-2"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={nouvelleCotisationExtra.attribue_a_toutes} onChange={(e) => setNouvelleCotisationExtra({ ...nouvelleCotisationExtra, attribue_a_toutes: e.target.checked })} className="w-5 h-5" /><span className="font-black text-black">Attribuer à toutes les générations</span></label></div>
                                </div>
                                <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase text-sm hover:bg-[#146332] transition-all">+ Créer la cotisation</button>
                            </form>
                        </div>
                        <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                            <div className="bg-black p-4"><h2 className="text-white font-black uppercase text-sm">⚡ Cotisations extraordinaires actives</h2></div>
                            {cotisationsExtra.length === 0 ? <div className="p-12 text-center text-black/60 italic">Aucune cotisation extraordinaire</div> : (
                                <div className="divide-y-2 divide-black/10">
                                    {cotisationsExtra.map((cot) => (
                                        <div key={cot.id} className="p-5">
                                            <div className="flex justify-between items-start mb-3">
                                                <div><h3 className="font-black text-xl text-black">{cot.nom}</h3><p className="text-black/60 text-sm">{cot.description}</p></div>
                                                {cot.statut === 'active' && <button onClick={() => handleTerminerCotisation(cot.id)} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-black text-xs">Terminer</button>}
                                                {cot.statut === 'terminee' && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">Terminée ✅</span>}
                                            </div>
                                            <div className="flex gap-6 text-sm">
                                                <span className="font-black text-black">💰 {cot.montant_requis.toLocaleString()} FCFA</span>
                                                {cot.date_limite && <span className="text-black/60">📅 Limite: {new Date(cot.date_limite).toLocaleDateString()}</span>}
                                                <span className="text-black/60">{cot.attribue_a_toutes ? '🌍 Toutes les générations' : `📌 ${cot.generations_concernees?.length || 0} génération(s)`}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}