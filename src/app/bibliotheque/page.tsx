"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BibliothequePage() {
    const [docs, setDocs] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const [filtre, setFiltre] = useState("Tous");

    useEffect(() => { chargerDocuments(); }, []);

    async function chargerDocuments() {
        setChargement(true);
        const { data: { user } } = await supabase.auth.getUser();

        let MaGen = "";
        if (user) {
            const { data: p } = await supabase.from('membres').select('generation').eq('user_id', user.id).maybeSingle();
            MaGen = p?.generation || "";
        }

        // On récupère les communications qui contiennent un fichier
        // Filtrage : Public OU ma génération
        const { data } = await supabase
            .from('communications')
            .select('*, comites(nom)')
            .not('fichier_url', 'is', null) // Uniquement ceux avec un fichier
            .or(`portee.eq.Public,cible_generation.eq."${MaGen}"`)
            .order('created_at', { ascending: false });

        setDocs(data || []);
        setChargement(false);
    }

    const docsFiltrés = filtre === "Tous" ? docs : docs.filter(d => d.type_info === filtre);

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 border-b-8 border-black pb-6">
                    <h1 className="text-5xl font-black text-[#0044ff] uppercase italic tracking-tighter">Bibliothèque</h1>
                    <p className="font-black text-xl mt-2 uppercase underline">Documents & Rapports Baliou N'Padra</p>
                </header>

                {/* FILTRES PAR TYPE */}
                <div className="flex flex-wrap gap-4 mb-10">
                    {["Tous", "Scolaire", "Bilan", "Information"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFiltre(f)}
                            className={`px-6 py-2 border-2 border-black font-black uppercase text-xs rounded-full transition-all ${filtre === f ? 'bg-black text-white' : 'bg-white text-black hover:bg-blue-50'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {chargement ? (
                    <div className="text-center py-20 font-black text-blue-700 animate-pulse uppercase">Ouverture des dossiers...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {docsFiltrés.map((doc) => (
                            <div key={doc.id} className="bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-black text-[9px] uppercase border border-blue-200">
                                            {doc.comites?.nom}
                                        </span>
                                        <span className="font-black text-[9px] uppercase text-gray-400">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black uppercase mb-3 leading-tight">{doc.titre}</h3>
                                    <p className="text-sm font-bold text-gray-600 line-clamp-3 mb-6">{doc.contenu}</p>
                                </div>

                                <a
                                    href={doc.fichier_url}
                                    target="_blank"
                                    className="w-full py-4 bg-black text-white text-center rounded-2xl font-black uppercase text-xs border-2 border-black hover:bg-[#0044ff] transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>📥 Télécharger</span>
                                    <span className="text-[10px] opacity-60">
                                        ({doc.fichier_url.split('.').pop()?.toUpperCase()})
                                    </span>
                                </a>
                            </div>
                        ))}

                        {docsFiltrés.length === 0 && (
                            <div className="col-span-full py-20 text-center border-4 border-dashed border-gray-200 rounded-[2.5rem]">
                                <p className="font-black text-gray-300 uppercase text-xl italic tracking-widest">Aucun document disponible</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}