"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ArbreGenealogique() {
    const [search, setSearch] = useState("");
    const [resultats, setResultats] = useState<any[]>([]);
    const [selection, setSelection] = useState<any>(null);
    const [famille, setFamille] = useState<{ parents: any[], enfants: any[] }>({ parents: [], enfants: [] });

    const chercherMembre = async () => {
        const { data } = await supabase.from('membres')
            .select('*')
            .ilike('nom_complet', `%${search}%`)
            .limit(5);
        setResultats(data || []);
    };

    const voirFamille = async (membre: any) => {
        setSelection(membre);
        setResultats([]);

        // Chercher les parents
        const { data: parents } = await supabase.from('membres')
            .select('*')
            .in('id', [membre.pere_id, membre.mere_id]);

        // Chercher les enfants
        const { data: enfants } = await supabase.from('membres')
            .select('*')
            .or(`pere_id.eq.${membre.id},mere_id.eq.${membre.id}`);

        setFamille({ parents: parents || [], enfants: enfants || [] });
    };

    return (
        <main className="min-h-screen bg-white p-4 md:p-12 text-black font-sans">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-black uppercase italic border-b-8 border-black mb-8">Lignée Baliou Padra</h1>

                {/* RECHERCHE */}
                <div className="relative mb-12">
                    <input
                        type="text"
                        placeholder="RECHERCHER UN NOM POUR VOIR L'ARBRE..."
                        className="w-full p-6 border-4 border-black rounded-2xl font-black uppercase text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyUp={(e) => e.key === 'Enter' && chercherMembre()}
                    />
                    {resultats.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border-4 border-black mt-2 z-50 rounded-2xl overflow-hidden">
                            {resultats.map(m => (
                                <button key={m.id} onClick={() => voirFamille(m)} className="w-full p-4 text-left font-bold hover:bg-blue-600 hover:text-white border-b-2 border-black last:border-0 uppercase">
                                    {m.nom_complet} ({m.kah_tokho})
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selection && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                        {/* PARENTS */}
                        <section className="text-center">
                            <h2 className="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest">Ascendance (Parents)</h2>
                            <div className="flex justify-center gap-6">
                                {famille.parents.length > 0 ? famille.parents.map(p => (
                                    <div key={p.id} className="p-4 border-4 border-black rounded-2xl bg-blue-50 font-black uppercase text-sm italic">
                                        {p.nom_complet}
                                    </div>
                                )) : <p className="italic text-gray-300">Parents non renseignés</p>}
                            </div>
                        </section>

                        {/* LE MEMBRE SELECTIONNÉ */}
                        <div className="flex justify-center relative">
                            <div className="w-4 h-12 bg-black absolute -top-12"></div>
                            <div className="p-10 border-8 border-[#146332] rounded-[3rem] bg-white shadow-2xl text-center min-w-[300px]">
                                <h3 className="text-3xl font-black uppercase mb-2">{selection.nom_complet}</h3>
                                <p className="text-blue-600 font-black italic">{selection.kah_tokho}</p>
                                <p className="mt-4 text-xs font-bold bg-black text-white px-4 py-1 rounded-full inline-block">GÉNÉRATION {selection.generation}</p>
                            </div>
                            <div className="w-4 h-12 bg-black absolute -bottom-12"></div>
                        </div>

                        {/* ENFANTS */}
                        <section className="text-center">
                            <h2 className="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest pt-8">Descendance (Enfants)</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {famille.enfants.length > 0 ? famille.enfants.map(e => (
                                    <button key={e.id} onClick={() => voirFamille(e)} className="p-4 border-4 border-black rounded-2xl bg-green-50 font-black uppercase text-xs hover:bg-black hover:text-white transition-all">
                                        {e.nom_complet}
                                    </button>
                                )) : <p className="col-span-full italic text-gray-300">Aucun enfant enregistré</p>}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}