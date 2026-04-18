"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AnnuairePage() {
    const [membres, setMembres] = useState<any[]>([]);
    const [recherche, setRecherche] = useState("");
    const [chargement, setChargement] = useState(true);

    // Charger les membres au démarrage
    useEffect(() => {
        fetchMembres();
    }, []);

    async function fetchMembres() {
        setChargement(true);
        const { data, error } = await supabase
            .from('membres')
            .select('*')
            .eq('est_valide', true) // <-- ON NE PREND QUE LES MEMBRES VALIDÉS
            .order('nom_complet', { ascending: true });

        if (error) {
            console.error("Erreur de récupération:", error);
        } else {
            setMembres(data || []);
        }
        setChargement(false);
    }

    // Filtrer la liste en fonction de la recherche (Nom, Ville, Métier ou Kah Tôkhô)
    const membresFiltrés = membres.filter(m =>
        m.nom_complet?.toLowerCase().includes(recherche.toLowerCase()) ||
        m.kah_tokho?.toLowerCase().includes(recherche.toLowerCase()) ||
        m.ville_residence?.toLowerCase().includes(recherche.toLowerCase()) ||
        m.metier?.toLowerCase().includes(recherche.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8">
            <style jsx global>{`
                /* Style de sélection en noir */
                ::selection {
                    background-color: black !important;
                    color: white !important;
                }
                
                ::-moz-selection {
                    background-color: black !important;
                    color: white !important;
                }
            `}</style>

            <div className="max-w-6xl mx-auto">

                {/* TITRE ET RECHERCHE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-green-900">ANNUAIRE Baliou N'Padra</h1>
                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Membres de la Communauté</p>
                    </div>

                    <div className="relative max-w-md w-full">
                        <input
                            type="text"
                            placeholder="Rechercher un membre, une ville, un métier..."
                            className="w-full px-6 py-4 rounded-2xl border-2 border-green-100 shadow-sm focus:border-green-600 outline-none transition-all pl-12"
                            onChange={(e) => setRecherche(e.target.value)}
                        />
                        <span className="absolute left-4 top-4.5 text-xl">🔍</span>
                    </div>
                </div>

                {/* GRILLE DES MEMBRES */}
                {chargement ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-700"></div>
                    </div>
                ) : (
                    <>
                        {/* Indicateur du nombre de membres */}
                        <div className="mb-6 text-right">
                            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-black">
                                {membresFiltrés.length} membre(s) trouvé(s)
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {membresFiltrés.map((membre) => (
                                <div key={membre.id} className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 flex flex-col transition-all hover:shadow-2xl hover:-translate-y-1">

                                    {/* PHOTO DE PROFIL */}
                                    <div className="h-56 bg-slate-200 relative">
                                        {membre.photo_url ? (
                                            <img
                                                src={membre.photo_url}
                                                alt={membre.nom_complet}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-100 italic text-sm">
                                                <span className="text-4xl mb-2">👤</span>
                                                Pas de photo
                                            </div>
                                        )}
                                        {/* Badge Génération */}
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <span className="bg-green-700/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg shadow-lg block text-center truncate">
                                                {membre.generation}
                                            </span>
                                        </div>
                                        {/* Badge de validation */}
                                        <div className="absolute top-4 right-4">
                                            <span className="bg-green-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full shadow-lg">
                                                ✓ Validé
                                            </span>
                                        </div>
                                    </div>

                                    {/* INFOS */}
                                    <div className="p-6 flex-grow">
                                        <h3 className="text-lg font-black text-slate-900 leading-tight mb-1 truncate">
                                            {membre.nom_complet}
                                        </h3>
                                        <p className="text-blue-700 font-extrabold text-sm uppercase tracking-wider mb-4">
                                            {membre.kah_tokho}
                                        </p>

                                        <div className="space-y-3 text-sm text-slate-600 border-t pt-4">
                                            <div className="flex items-center">
                                                <span className="w-6">📍</span>
                                                <span className="font-medium">{membre.ville_residence}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="w-6">💼</span>
                                                <span className="font-medium truncate">{membre.metier || "Non renseigné"}</span>
                                            </div>
                                            <div className="flex items-center text-green-700 font-bold">
                                                <span className="w-6">📞</span>
                                                <span>{membre.telephone}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* SI AUCUN RÉSULTAT */}
                {!chargement && membresFiltrés.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border-2 border-dashed border-gray-200">
                        <span className="text-6xl block mb-4">🏜️</span>
                        <p className="text-xl font-bold text-gray-400">Aucun membre trouvé pour cette recherche.</p>
                        <p className="text-sm text-gray-300 mt-2">Seuls les membres validés apparaissent dans l'annuaire.</p>
                    </div>
                )}
            </div>
        </main>
    );
}