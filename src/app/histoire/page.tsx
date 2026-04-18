"use client";

import React, { useState } from 'react';

export default function HistoirePage() {
    // État pour gérer l'ouverture des détails
    const [detailOuvert, setDetailOuvert] = useState<any>(null);

    // Données de la chronologie
    const chronologie = [
        {
            annee: 1906,
            titre: "NAISSANCE DU CHEIKH",
            desc: "Naissance de Cheikh Yacouba Sylla à Nioro du Sahel (Mali).",
            contenu: "Issu d'une famille Soninké maraboutique, il manifeste très tôt une grande sagesse. Disciple de Cheikh Hamahoullah, il devient une figure centrale du Hamallisme."
        },
        {
            annee: 1930,
            titre: "DÉPORTATION EN CÔTE D'IVOIRE",
            desc: "Internement à Sassandra par les autorités coloniales.",
            contenu: "Jugé dangereux par l'administration coloniale française à cause de son influence spirituelle, il est exilé en Côte d'Ivoire. Il restera interné pendant 8 ans avant de retrouver sa liberté d'action."
        },
        {
            annee: 1939,
            titre: "INSTALLATION À GAGNOA",
            desc: "Fondation de la communauté soufie et début des activités socio-économiques.",
            contenu: "C'est l'année charnière. Il fonde sa communauté basée sur le triptyque : Prière, Travail, et Solidarité. Il commence à bâtir ce qui deviendra l'empire économique Baliou Padra."
        },
        {
            annee: 1988,
            titre: "RAPPEL À DIEU",
            desc: "Le Cheikh s'éteint à Gagnoa, laissant un héritage spirituel et social immense.",
            contenu: "Il laisse derrière lui une communauté structurée, des milliers de disciples et un modèle de développement économique unique en Afrique de l'Ouest."
        }
    ];

    // Données des projets (les 3 boutons du bas)
    const projets = [
        {
            id: "cinema",
            icone: "🎬",
            titre: "CINÉMA",
            desc: "Réseau de cinémas dans tout le pays",
            contenu: "Le Cheikh a créé une chaîne de cinémas (notamment à Gagnoa, Daloa, Agboville). Pour lui, le cinéma était un outil d'éducation des masses et de modernisation de la société ivoirienne."
        },
        {
            id: "electricite",
            icone: "⚡",
            titre: "ÉLECTRICITÉ",
            desc: "La première électrification privée de Gagnoa",
            contenu: "Bien avant l'arrivée des réseaux publics, Cheikh Yacouba Sylla a importé des groupes électrogènes pour éclairer la ville de Gagnoa, les rues et la Zawiya, offrant la lumière gratuitement à la population."
        },
        {
            id: "transport",
            icone: "🚛",
            titre: "TRANSPORT",
            desc: "Flotte de transport et logistique",
            contenu: "La communauté a développé un immense réseau de transport de marchandises et de personnes, reliant les zones de production agricole aux centres urbains, renforçant l'autonomie de la fondation."
        }
    ];

    return (
        <main className="min-h-screen bg-white p-4 md:p-12 text-black font-sans">
            <div className="max-w-4xl mx-auto">

                {/* TITRE PRINCIPAL */}
                <header className="mb-16 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-[#146332] uppercase italic tracking-tighter">Baliou N'Padra</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Fondation Cheikh Yacouba Sylla</p>
                </header>

                {/* FRISE CHRONOLOGIQUE */}
                <div className="relative border-l-4 border-black ml-4 md:ml-10 space-y-12 mb-20">
                    {chronologie.map((item, index) => (
                        <div key={index} className="relative pl-10 group">
                            {/* Le cercle sur la ligne */}
                            <div className="absolute -left-[22px] top-0 w-10 h-10 bg-white border-4 border-black rounded-full flex items-center justify-center">
                                <div className="w-3 h-3 bg-black rounded-full"></div>
                            </div>

                            {/* La carte cliquable */}
                            <button
                                onClick={() => setDetailOuvert(item)}
                                className="w-full text-left bg-white border-2 border-black rounded-[1.5rem] p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                            >
                                <span className="text-3xl font-black text-[#146332] italic">{item.annee}</span>
                                <h3 className="text-lg font-black uppercase mt-1">{item.titre}</h3>
                                <p className="text-sm font-bold text-gray-600 mt-2">{item.desc}</p>
                                <p className="text-[10px] font-black text-blue-600 mt-4 uppercase underline">Cliquez pour lire l'histoire →</p>
                            </button>
                        </div>
                    ))}
                </div>

                {/* LES 3 BOUTONS DU BAS (PROJETS) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    {projets.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setDetailOuvert(p)}
                            className="bg-white border-2 border-black rounded-[1.5rem] p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-green-50 transition-all flex flex-col items-center text-center group"
                        >
                            <span className="text-3xl mb-3 group-hover:scale-125 transition-transform">{p.icone}</span>
                            <h4 className="font-black uppercase text-sm mb-2">{p.titre}</h4>
                            <p className="text-[10px] font-bold text-gray-500 leading-tight">{p.desc}</p>
                        </button>
                    ))}
                </div>

                {/* BANDEAU "LE TRAVAIL..." */}
                <div className="bg-[#146332] text-white p-8 rounded-[2rem] border-4 border-black text-center shadow-xl">
                    <h3 className="text-xl md:text-2xl font-black uppercase italic mb-2 italic">"Le travail est une forme d'adoration"</h3>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Source : fondationys.org — Mémoire Vivante Baliou Padra</p>
                </div>

                {/* LA FENÊTRE QUI S'OUVRE (MODALE) */}
                {detailOuvert && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white border-4 border-black rounded-[2.5rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
                            {/* Bouton fermer */}
                            <button
                                onClick={() => setDetailOuvert(null)}
                                className="absolute top-4 right-4 bg-red-500 text-white w-10 h-10 rounded-full font-black border-2 border-black hover:bg-black transition-colors"
                            >
                                X
                            </button>

                            {detailOuvert.annee && (
                                <span className="text-5xl font-black text-[#146332] italic">{detailOuvert.annee}</span>
                            )}
                            <h2 className="text-3xl font-black uppercase mt-2 mb-6 border-b-4 border-black pb-4 text-[#146332]">
                                {detailOuvert.titre}
                            </h2>
                            <p className="text-lg font-bold leading-relaxed text-gray-800">
                                {detailOuvert.contenu}
                            </p>

                            <button
                                onClick={() => setDetailOuvert(null)}
                                className="mt-10 w-full py-4 bg-black text-white font-black rounded-2xl border-2 border-black uppercase hover:bg-[#146332] transition-colors"
                            >
                                Fermer la lecture
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}