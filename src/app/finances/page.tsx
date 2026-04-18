"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FinancesPage() {
    const [membres, setMembres] = useState<any[]>([]);
    const [cotisations, setCotisations] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);

    // État pour le formulaire d'ajout
    const [nouveauPaiement, setNouveauPaiement] = useState({
        membre_id: '',
        montant: '',
        type: 'Sibity Mensuelle',
        mois: 'Janvier',
        annee: 2025
    });

    useEffect(() => {
        fetchDonnees();
    }, []);

    async function fetchDonnees() {
        setChargement(true);
        try {
            // Charger les membres pour la liste déroulante
            const { data: m } = await supabase.from('membres').select('id, nom_complet, kah_tokho');

            // Charger les cotisations avec les noms des membres (Jointure)
            const { data: c } = await supabase
                .from('cotisations')
                .select(`
          id,
          montant,
          type_cotisation,
          mois,
          annee,
          date_paiement,
          membres (
            nom_complet,
            kah_tokho
          )
        `)
                .order('date_paiement', { ascending: false });

            setMembres(m || []);
            setCotisations(c || []);
        } catch (error) {
            console.error("Erreur de chargement:", error);
        } finally {
            setChargement(false);
        }
    }

    const enregistrerPaiement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nouveauPaiement.membre_id) return alert("Sélectionnez un membre");
        if (!nouveauPaiement.montant) return alert("Entrez un montant");

        setChargement(true);
        const { error } = await supabase.from('cotisations').insert([{
            membre_id: nouveauPaiement.membre_id,
            montant: parseFloat(nouveauPaiement.montant),
            type_cotisation: nouveauPaiement.type,
            mois: nouveauPaiement.mois,
            annee: nouveauPaiement.annee
        }]);

        if (error) {
            alert("Erreur : " + error.message);
        } else {
            alert("Paiement de la Sibity enregistré avec succès !");
            fetchDonnees(); // Rafraîchir la liste
        }
        setChargement(false);
    };

    const totalCollecte = cotisations.reduce((acc, curr) => acc + Number(curr.montant), 0);

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
            {/* Style global pour la sélection en noir sur blanc */}
            <style jsx global>{`
        /* Style de sélection pour tout l'application */
        ::selection {
          background-color: black !important;
          color: white !important;
        }
        
        /* Pour Firefox */
        ::-moz-selection {
          background-color: black !important;
          color: white !important;
        }
        
        /* Style spécifique pour les tableaux */
        table ::selection,
        td ::selection,
        th ::selection,
        tbody ::selection,
        tr ::selection {
          background-color: black !important;
          color: white !important;
        }
        
        /* Style pour les champs de formulaire en noir */
        select, input, textarea {
          background-color: black !important;
          color: white !important;
          border-color: #333 !important;
        }
        
        select option {
          background-color: black !important;
          color: white !important;
        }
        
        /* Style pour le placeholder */
        input::placeholder {
          color: #999 !important;
        }
        
        select:focus, input:focus, textarea:focus {
          border-color: #22c55e !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2) !important;
        }
        
        /* Pour les éléments de formulaire (select, input) */
        select ::selection,
        input ::selection,
        textarea ::selection {
          background-color: white !important;
          color: black !important;
        }
        
        /* Style pour le survol des lignes du tableau */
        tbody tr {
          transition: background-color 0.2s ease;
        }
        
        tbody tr:hover {
          background-color: #f3f4f6 !important;
        }
      `}</style>

            <div className="max-w-7xl mx-auto">

                <header className="mb-10">
                    <h1 className="text-4xl font-black text-green-900 tracking-tighter uppercase">Gestion Financière</h1>
                    <p className="text-gray-500 font-bold tracking-widest text-sm">Trésorerie Baliou N'Padra - Sibity & Cotisations</p>
                </header>

                {/* DASHBOARD */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <div className="bg-green-700 text-white p-8 rounded-[2.5rem] shadow-2xl transform hover:scale-105 transition-transform">
                        <p className="text-xs font-black uppercase tracking-widest opacity-70">Total Caisse Baliou N'Padra</p>
                        <h2 className="text-5xl font-black mt-3">{totalCollecte.toLocaleString()} <span className="text-lg">CFA</span></h2>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nombre de versements</p>
                        <h2 className="text-5xl font-black text-slate-800 mt-3">{cotisations.length}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* FORMULAIRE */}
                    <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] shadow-2xl border border-green-50">
                        <h3 className="text-xl font-black mb-8 text-slate-800 border-b pb-4">Nouveau Versement</h3>
                        <form onSubmit={enregistrerPaiement} className="space-y-5">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2">Choisir le Membre</label>
                                <select
                                    className="w-full px-5 py-4 border-2 rounded-2xl font-bold transition-all"
                                    onChange={(e) => setNouveauPaiement({ ...nouveauPaiement, membre_id: e.target.value })}
                                >
                                    <option value="">-- Liste des membres --</option>
                                    {membres.map(m => (
                                        <option key={m.id} value={m.id}>{m.nom_complet} ({m.kah_tokho})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2">Montant (FCFA)</label>
                                <input
                                    type="number" required placeholder="5000"
                                    className="w-full px-5 py-4 border-2 rounded-2xl font-bold"
                                    onChange={(e) => setNouveauPaiement({ ...nouveauPaiement, montant: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">Mois</label>
                                    <select
                                        className="w-full px-5 py-4 border-2 rounded-2xl font-bold"
                                        onChange={(e) => setNouveauPaiement({ ...nouveauPaiement, mois: e.target.value })}
                                    >
                                        {["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">Année</label>
                                    <input
                                        type="number" defaultValue="2025"
                                        className="w-full px-5 py-4 border-2 rounded-2xl font-bold"
                                        onChange={(e) => setNouveauPaiement({ ...nouveauPaiement, annee: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={chargement}
                                className="w-full py-5 bg-green-700 text-white font-black rounded-2xl hover:bg-green-800 transition-all shadow-xl active:scale-95"
                            >
                                {chargement ? "Validation..." : "ENREGISTRER LA SIBITY"}
                            </button>
                        </form>
                    </div>

                    {/* LISTE DES TRANSACTIONS */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100">
                        <h3 className="text-xl font-black mb-8 text-slate-800 border-b pb-4">Historique des versements</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] border-b">
                                        <th className="py-4">Membre</th>
                                        <th className="py-4">Période</th>
                                        <th className="py-4 text-right">Montant</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {cotisations.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="py-5">
                                                <p className="font-black text-slate-900 group-hover:text-green-700 transition-colors">
                                                    {c.membres?.nom_complet || 'Membre inconnu'}
                                                </p>
                                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-wider">
                                                    {c.membres?.kah_tokho}
                                                </p>
                                            </td>
                                            <td className="py-5">
                                                <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">
                                                    {c.mois} {c.annee}
                                                </span>
                                            </td>
                                            <td className="py-5 text-right">
                                                <span className="font-black text-green-700 text-lg">
                                                    {Number(c.montant).toLocaleString()} <span className="text-[10px]">CFA</span>
                                                </span>
                                                <p className="text-[9px] text-gray-300 italic">
                                                    Le {new Date(c.date_paiement).toLocaleDateString()}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {cotisations.length === 0 && (
                                <div className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest">
                                    Aucun versement enregistré
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}