"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ActualitesFiltrees() {
    const [news, setNews] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);

    useEffect(() => { chargerFlux(); }, []);

    async function chargerFlux() {
        const { data: { user } } = await supabase.auth.getUser();
        let MaGen = "";

        if (user) {
            const { data: p } = await supabase.from('membres').select('generation').eq('user_id', user.id).maybeSingle();
            MaGen = p?.generation || "";
        }

        // Requête avec filtrage : Public OU destiné à ma génération
        const { data } = await supabase
            .from('communications')
            .select('*, comites(nom)')
            .or(`portee.eq.Public,cible_generation.eq."${MaGen}"`)
            .order('created_at', { ascending: false });

        setNews(data || []);
        setChargement(false);
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12 border-b-8 border-black pb-4 text-center">
                    <h1 className="text-5xl font-black text-[#146332] uppercase italic tracking-tighter">Journal Baliou Padra</h1>
                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Informations et Bilans de la communauté</p>
                </header>

                <div className="space-y-10">
                    {news.map((item) => (
                        <div key={item.id} className="bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                            {/* Badge du Comité */}
                            <div className="absolute top-0 right-0 bg-black text-white px-6 py-2 font-black text-[10px] uppercase rounded-bl-3xl">
                                {item.comites?.nom}
                            </div>

                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border-2 border-black ${item.type_info === 'Bilan' ? 'bg-yellow-400' : 'bg-blue-100'}`}>
                                            {item.type_info}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400">Le {new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h2 className="text-3xl font-black uppercase mb-4 leading-tight">{item.titre}</h2>
                                    <p className="font-medium text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">{item.contenu}</p>

                                    {/* BOUTON DE TÉLÉCHARGEMENT SI FICHIER PRÉSENT */}
                                    {item.fichier_url && (
                                        <a href={item.fichier_url} target="_blank" className="inline-flex items-center gap-3 bg-green-700 text-white px-6 py-3 rounded-2xl font-black text-xs border-2 border-black hover:bg-black transition-all">
                                            📥 TÉLÉCHARGER LE DOCUMENT (XLS/PDF)
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}