"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ChefGenerationPage() {
    const [membresEnAttente, setMembresEnAttente] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [maGeneration, setMaGeneration] = useState("");

    useEffect(() => {
        loadMembres();
    }, []);

    async function loadMembres() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Récupérer la génération du Chef
        const { data: profil } = await supabase.from('membres').select('generation').eq('user_id', user.id).single();
        if (profil) {
            setMaGeneration(profil.generation);
            // 2. Récupérer les membres non validés de cette génération
            const { data } = await supabase
                .from('membres')
                .select('*')
                .eq('generation', profil.generation)
                .eq('est_valide', false);
            setMembresEnAttente(data || []);
        }
        setLoading(false);
    }

    async function validerMembre(id: string) {
        const { error } = await supabase.from('membres').update({ est_valide: true }).eq('id', id);
        if (error) alert(error.message);
        else loadMembres();
    }

    return (
        <main className="min-h-screen bg-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-[#146332] text-white p-10 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-10">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">Chef de Génération</h1>
                    <p className="text-sm font-bold text-white/80 uppercase mt-2">Maison : {maGeneration || "Chargement..."}</p>
                </div>

                <section className="border-4 border-black p-8 rounded-3xl bg-slate-50">
                    <h2 className="text-2xl font-black uppercase mb-6 italic">Inscriptions en attente</h2>

                    {loading ? (
                        <p className="animate-pulse font-bold">RECHERCHE DES DEMANDES...</p>
                    ) : membresEnAttente.length === 0 ? (
                        <div className="p-10 text-center border-2 border-dashed border-gray-400 rounded-2xl">
                            <p className="text-gray-700 font-bold uppercase">Aucune nouvelle demande pour {maGeneration}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {membresEnAttente.map(membre => (
                                <div key={membre.id} className="bg-white border-4 border-black p-6 rounded-2xl flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div>
                                        <p className="font-black text-xl uppercase">{membre.nom_complet}</p>
                                        <p className="text-xs font-bold text-blue-600">{membre.email}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => validerMembre(membre.id)}
                                            className="bg-[#39ff14] border-2 border-black px-6 py-2 rounded-xl font-black uppercase text-xs hover:bg-black hover:text-white transition-colors"
                                        >
                                            Valider
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}