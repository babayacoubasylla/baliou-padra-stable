"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AnnuaireProPage() {
    const [pros, setPros] = useState<any[]>([]);
    const [secteur, setSecteur] = useState("Tous");
    const [recherche, setRecherche] = useState("");
    const [chargement, setChargement] = useState(true);

    const secteurs = ["Tous", "BTP / Construction", "Santé", "Éducation", "Commerce", "Informatique", "Agriculture", "Artisanat", "Transport", "Droit / Justice"];

    useEffect(() => { chargerPros(); }, []);

    async function chargerPros() {
        setChargement(true);
        // On ne montre que les membres VALIDÉS qui ont un MÉTIER renseigné
        const { data } = await supabase
            .from('membres')
            .select('*')
            .eq('est_valide', true)
            .not('metier', 'is', null)
            .order('nom_complet');
        setPros(data || []);
        setChargement(false);
    }

    const filtrés = pros.filter(p =>
        (secteur === "Tous" || p.secteur_activite === secteur) &&
        (p.nom_complet.toLowerCase().includes(recherche.toLowerCase()) ||
            (p.metier && p.metier.toLowerCase().includes(recherche.toLowerCase())) ||
            (p.diplome && p.diplome.toLowerCase().includes(recherche.toLowerCase())))
    );

    return (
        <main className="min-h-screen bg-white p-4 md:p-12 text-black">
            <style jsx global>{`
                ::selection {
                    background-color: black !important;
                    color: white !important;
                }
                ::-moz-selection {
                    background-color: black !important;
                    color: white !important;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .animate-pulse {
                    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>

            <div className="max-w-7xl mx-auto">
                <header className="mb-12 border-b-8 border-black pb-6">
                    <h1 className="text-4xl md:text-6xl font-black text-[#0044ff] uppercase italic tracking-tighter">Réseau Pro</h1>
                    <p className="font-black text-lg md:text-xl mt-2 uppercase underline decoration-black">Trouver un expert dans la communauté</p>
                    <p className="text-sm text-gray-500 mt-2 font-bold">
                        {pros.length} professionnels qualifiés disponibles
                    </p>
                </header>

                {/* BARRE DE FILTRES */}
                <div className="flex flex-col lg:flex-row gap-6 mb-12">
                    <div className="flex-grow">
                        <label className="text-[10px] font-black uppercase mb-1 block text-blue-700">Recherche libre</label>
                        <input
                            type="text"
                            placeholder="RECHERCHER UN MÉTIER, UN NOM, UN DIPLÔME..."
                            className="w-full p-4 border-4 border-black rounded-2xl font-black uppercase outline-none focus:bg-blue-50 transition-all"
                            onChange={e => setRecherche(e.target.value)}
                        />
                    </div>
                    <div className="lg:w-1/3">
                        <label className="text-[10px] font-black uppercase mb-1 block text-blue-700">Secteur d'activité</label>
                        <select
                            className="w-full p-4 border-4 border-black rounded-2xl font-black bg-white appearance-none cursor-pointer hover:bg-slate-50 transition-all"
                            onChange={e => setSecteur(e.target.value)}>
                            {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {chargement ? (
                    <div className="text-center py-20 font-black text-3xl animate-pulse uppercase text-blue-700">RECHERCHE DES COMPÉTENCES...</div>
                ) : filtrés.length === 0 ? (
                    <div className="text-center py-20 bg-yellow-50 border-4 border-black rounded-[2.5rem]">
                        <span className="text-6xl block mb-4">🔍</span>
                        <p className="font-black text-xl uppercase text-gray-600">Aucun professionnel trouvé</p>
                        <p className="text-sm text-gray-400 mt-2">Essayez de modifier vos critères de recherche</p>
                    </div>
                ) : (
                    /* GRILLE RESPONSIVE : 
                       - 1 colonne sur mobile (par défaut)
                       - 2 colonnes sur tablette (sm:grid-cols-2)
                       - 3 colonnes sur desktop (lg:grid-cols-3)
                       - 4 colonnes sur très grand écran (xl:grid-cols-4) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                        {filtrés.map(p => (
                            <div key={p.id} className="bg-white border-4 border-black p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-2 hover:shadow-none transition-all duration-300">
                                <div className="flex gap-4 md:gap-6 items-center mb-4 md:mb-6">
                                    <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-black rounded-full overflow-hidden flex-shrink-0 bg-slate-100">
                                        {p.photo_url ? (
                                            <img src={p.photo_url} className="w-full h-full object-cover" alt={p.nom_complet} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-black text-xl md:text-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                                                {p.nom_complet?.charAt(0) || '👤'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-base md:text-xl uppercase leading-none">{p.nom_complet}</h3>
                                        <p className="text-[#0044ff] font-black text-xs md:text-sm mt-1 underline italic">{p.metier}</p>
                                        {p.kah_tokho && (
                                            <p className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase mt-1">{p.kah_tokho}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 border-t-2 border-slate-100 pt-3 md:pt-4 text-[10px] md:text-xs font-bold uppercase">
                                    {p.ville_residence && (
                                        <p className="flex items-center gap-2">
                                            <span>📍</span> {p.ville_residence}
                                        </p>
                                    )}
                                    {p.diplome && (
                                        <p className="bg-yellow-300 inline-block px-2 py-1 border border-black rounded-lg text-[9px] md:text-xs">
                                            🎓 {p.diplome.length > 30 ? p.diplome.substring(0, 27) + '...' : p.diplome}
                                        </p>
                                    )}
                                    {p.secteur_activite && (
                                        <p className="text-[8px] md:text-[10px] text-gray-500 mt-1 md:mt-2">
                                            Secteur : {p.secteur_activite}
                                        </p>
                                    )}
                                </div>

                                <a
                                    href={`tel:${p.telephone}`}
                                    className="block w-full py-3 md:py-4 bg-green-600 text-white text-center rounded-xl md:rounded-2xl border-4 border-black font-black uppercase hover:bg-black transition-all shadow-lg active:scale-95 text-[10px] md:text-sm"
                                >
                                    📞 CONTACTER L'EXPERT
                                </a>
                            </div>
                        ))}
                    </div>
                )}

                {/* BANDEAU D'INFORMATION */}
                <div className="mt-12 md:mt-16 p-4 md:p-6 bg-blue-100 border-4 border-blue-600 rounded-[1.5rem] md:rounded-[2.5rem] text-center">
                    <p className="font-black text-blue-800 text-[10px] md:text-xs uppercase tracking-widest">
                        🔍 RÉSEAU D'EXPERTS BALIOU PADRA — Plus de {pros.length} compétences disponibles
                    </p>
                    <p className="text-[8px] md:text-[10px] text-gray-600 mt-2">
                        Pour apparaître dans cet annuaire, renseignez votre métier et votre diplôme dans votre profil.
                    </p>
                </div>
            </div>
        </main>
    );
}