"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FinancePage() {
    const [loading, setLoading] = useState(true);
    const [generations, setGenerations] = useState([]);
    const [selectedGeneration, setSelectedGeneration] = useState("");
    const [financeData, setFinanceData] = useState({
        objectif_annuel: 0,
        collecte_totale: 0,
        progression: 0,
        reste_atteindre: 0,
        cotisations: [],
        versements_centraux: []
    });
    const router = useRouter();

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

        await loadGenerations();
        setLoading(false);
    };

    const loadGenerations = async () => {
        // Liste par défaut (celle de ton inscription)
        const defaultGens = [
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

        // Récupérer les générations réellement utilisées dans la base (membres et budgets)
        const { data: membres } = await supabase
            .from('membres')
            .select('generation')
            .not('generation', 'is', null);

        const { data: budgets } = await supabase
            .from('budgets_annuels')
            .select('generation');

        const dbGens = [...(membres?.map(m => m.generation) || []), ...(budgets?.map(b => b.generation) || [])];

        // Fusionner les listes et supprimer les doublons pour avoir "tout les générations du projet"
        const allUniqueGens = Array.from(new Set([...defaultGens, ...dbGens])).filter(Boolean);
        setGenerations(allUniqueGens);

        if (allUniqueGens.length > 0) {
            setSelectedGeneration(allUniqueGens[0]);
            await loadFinanceData(allUniqueGens[0]);
        }
    };

    const loadFinanceData = async (generationNom) => {
        const currentYear = new Date().getFullYear();

        // 1. Récupérer le budget annuel
        const { data: budget } = await supabase
            .from('budgets_annuels')
            .select('montant_prevu')
            .eq('generation', generationNom)
            .eq('annee', currentYear)
            .maybeSingle();

        const objectif = budget?.montant_prevu || 0;

        // 2. Récupérer les membres de cette génération
        const { data: membresGen } = await supabase
            .from('membres')
            .select('id')
            .eq('generation', generationNom);

        const membreIds = membresGen?.map(m => m.id) || [];
        let collecteTotale = 0;
        let cotisationsDetails = [];

        // 3. Récupérer les cotisations
        if (membreIds.length > 0) {
            const { data: cotisations } = await supabase
                .from('cotisations')
                .select('montant, date_cotisation')
                .in('membre_id', membreIds)
                .order('date_cotisation', { ascending: false });

            if (cotisations && cotisations.length > 0) {
                collecteTotale = cotisations.reduce((sum, c) => sum + (c.montant || 0), 0);

                const parMois = {};
                cotisations.forEach(c => {
                    if (c.date_cotisation) {
                        const date = new Date(c.date_cotisation);
                        const mois = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        parMois[mois] = (parMois[mois] || 0) + c.montant;
                    }
                });
                cotisationsDetails = Object.entries(parMois).map(([mois, montant]) => ({
                    mois,
                    montant
                }));
            }
        }

        // 4. Récupérer les versements centraux
        const { data: versements } = await supabase
            .from('versements_centraux')
            .select('montant, statut, date_versement')
            .eq('generation', generationNom)
            .order('date_versement', { ascending: false });

        const progression = objectif > 0 ? (collecteTotale / objectif) * 100 : 0;
        const resteAtteindre = Math.max(0, objectif - collecteTotale);

        setFinanceData({
            objectif_annuel: objectif,
            collecte_totale: collecteTotale,
            progression: Math.min(100, progression),
            reste_atteindre: resteAtteindre,
            cotisations: cotisationsDetails,
            versements_centraux: versements || []
        });
    };

    const handleGenerationChange = async (e) => {
        const generationNom = e.target.value;
        setSelectedGeneration(generationNom);
        await loadFinanceData(generationNom);
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
                    <Link href="/admin-central" className="inline-flex items-center gap-2 text-black font-black hover:text-[#146332] transition-colors mb-4">
                        <span>←</span> Retour au tableau de bord
                    </Link>
                    <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                        GESTION FINANCIÈRE
                    </h1>
                    <div className="h-1 w-32 bg-black mt-2"></div>
                    <p className="text-black/60 mt-2">Supervision des flux financiers par génération</p>
                </div>

                {/* Sélecteur de génération - AFFICHE TOUTE LA LISTE */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-8">
                    <label className="block text-black font-black mb-2">Sélectionner une génération</label>
                    <select
                        value={selectedGeneration}
                        onChange={handleGenerationChange}
                        className="w-full md:w-96 p-4 border-4 border-black rounded-2xl font-black text-black bg-white outline-none focus:bg-yellow-50 cursor-pointer"
                    >
                        {generations.map((gen, index) => (
                            <option key={index} value={gen} className="text-black">
                                {gen}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedGeneration && (
                    <>
                        {/* Cartes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <FinanceCard title="Objectif annuel" value={`${financeData.objectif_annuel.toLocaleString()} FCFA`} icon="🎯" color="border-blue-500" />
                            <FinanceCard title="Collecte totale" value={`${financeData.collecte_totale.toLocaleString()} FCFA`} icon="💰" color="border-green-500" />
                            <FinanceCard title="Progression" value={`${financeData.progression.toFixed(1)}%`} icon="📊" color="border-purple-500" />
                            <FinanceCard title="Reste à atteindre" value={`${financeData.reste_atteindre.toLocaleString()} FCFA`} icon="⚠️" color="border-orange-500" />
                        </div>

                        {/* Barre progression */}
                        <div className="bg-white border-4 border-black rounded-2xl p-6 mb-8">
                            <div className="flex justify-between mb-2">
                                <span className="font-black text-black">Progression vers l'objectif</span>
                                <span className="font-black text-black">{financeData.progression.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
                                <div className={`h-full ${financeData.progression < 50 ? 'bg-red-500' : financeData.progression < 75 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${financeData.progression}%` }}></div>
                            </div>
                        </div>

                        {/* Colonnes */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white border-4 border-black rounded-2xl p-6">
                                <h2 className="text-xl font-black text-black mb-4">📅 Cotisations collectées</h2>
                                {financeData.cotisations.length === 0 ? (
                                    <p className="text-black/60 italic">Aucune cotisation enregistrée</p>
                                ) : (
                                    financeData.cotisations.map((item, idx) => (
                                        <div key={idx} className="flex justify-between border-b border-black/10 py-3">
                                            <span className="font-black text-black">{item.mois}</span>
                                            <span className="font-black text-green-600">{item.montant.toLocaleString()} FCFA</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="bg-white border-4 border-black rounded-2xl p-6">
                                <h2 className="text-xl font-black text-black mb-4">🔄 Versements au Bureau Central</h2>
                                {financeData.versements_centraux.length === 0 ? (
                                    <p className="text-black/60 italic">Aucun versement enregistré</p>
                                ) : (
                                    financeData.versements_centraux.map((vers, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-black/10 py-3">
                                            <div>
                                                <span className="font-black text-black">{new Date(vers.date_versement).toLocaleDateString()}</span>
                                                <span className={`ml-2 text-xs px-2 py-1 rounded-full font-black ${vers.statut === 'valide' ? 'bg-green-100 text-green-800' : vers.statut === 'rejete' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {vers.statut || 'en attente'}
                                                </span>
                                            </div>
                                            <span className="font-black text-blue-600">{vers.montant.toLocaleString()} FCFA</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function FinanceCard({ title, value, icon, color }) {
    return (
        <div className={`bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] border-t-8 ${color}`}>
            <div className="flex justify-between mb-3">
                <span className="text-3xl">{icon}</span>
                <span className="text-xs font-black px-2 py-1 rounded-full bg-black text-white">BP</span>
            </div>
            <p className="text-2xl font-black text-black break-words">{value}</p>
            <p className="text-xs font-bold uppercase text-black/50 mt-1">{title}</p>
        </div>
    );
}