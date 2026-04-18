"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ProfilPage() {
    const [profile, setProfile] = useState<any>(null);
    const [mesCotisations, setMesCotisations] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const router = useRouter();

    useEffect(() => {
        getMesInfos();
    }, []);

    async function getMesInfos() {
        setChargement(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        // On utilise maybeSingle() pour éviter l'erreur 406 si rien n'est trouvé
        const { data: p, error } = await supabase
            .from('membres')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (p) {
            setProfile(p);
            const { data: c } = await supabase
                .from('cotisations')
                .select('*')
                .eq('membre_id', p.id)
                .order('date_paiement', { ascending: false });
            setMesCotisations(c || []);
        }
        setChargement(false);
    }

    if (chargement) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-xl">CHARGEMENT BALIOU PADRA...</div>;

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <div className="max-w-5xl mx-auto">

                <header className="mb-12 border-b-4 border-black pb-6">
                    <h1 className="text-4xl font-black text-[#146332] uppercase italic">Mon Intimité</h1>
                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mt-2">Espace Personnel Baliou Padra</p>
                </header>

                {!profile ? (
                    <div className="bg-white border-4 border-red-600 p-10 rounded-[2.5rem] shadow-2xl text-center">
                        <p className="font-black text-red-600 text-2xl uppercase">Profil non détecté</p>
                        <p className="font-bold mt-4 text-black max-w-md mx-auto text-sm">
                            Ton compte est bien connecté, mais il n'est pas encore lié à ta fiche de membre.
                            <br /><br />
                            <span className="bg-yellow-200 px-2 text-black italic">
                                Action : Vérifie que ton "user_id" est bien renseigné dans la table membres sur Supabase.
                            </span>
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                            {/* CARTE D'IDENTITÉ */}
                            <div className="lg:col-span-1 bg-white border-2 border-black rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center">
                                <div className="w-40 h-40 rounded-full border-4 border-[#146332] overflow-hidden mb-6 shadow-lg">
                                    {profile.photo_url ? (
                                        <img src={profile.photo_url} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-4xl bg-slate-100">👤</div>
                                    )}
                                </div>
                                <h2 className="text-2xl font-black uppercase text-center">{profile.nom_complet}</h2>
                                <p className="text-blue-700 font-black text-lg underline uppercase italic">{profile.kah_tokho}</p>

                                {/* BOUTON MODIFIER MON PROFIL */}
                                <button
                                    onClick={() => router.push('/profil/editer')}
                                    className="mt-6 w-full py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>✏️</span> MODIFIER MON PROFIL
                                </button>

                                <div className="w-full mt-8 space-y-3 text-[11px] font-black uppercase border-t-2 border-slate-100 pt-6">
                                    <p className="flex justify-between"><span>Génération:</span> <span className="text-[#146332]">{profile.generation}</span></p>
                                    <p className="flex justify-between"><span>Ville:</span> <span>{profile.ville_residence}</span></p>
                                    <p className="flex justify-between"><span>Contact:</span> <span>{profile.telephone}</span></p>
                                </div>
                            </div>

                            {/* HISTORIQUE FINANCIER ET PROFIL PROFESSIONNEL */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* SECTION COTISATIONS */}
                                <div className="bg-white border-2 border-black rounded-[2.5rem] p-8 shadow-2xl">
                                    <h3 className="text-xl font-black uppercase mb-8 border-b-4 border-[#146332] inline-block italic">Mes Sibity Payées</h3>

                                    <div className="space-y-4">
                                        {mesCotisations.length > 0 ? mesCotisations.map(c => (
                                            <div key={c.id} className="flex justify-between items-center p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl">
                                                <div>
                                                    <p className="font-black text-lg uppercase">{c.mois} {c.annee}</p>
                                                    <p className="text-[10px] font-bold text-blue-500 italic">Reçu Baliou Padra</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-green-700">{Number(c.montant).toLocaleString()} CFA</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-gray-400 font-bold italic py-10 text-center uppercase border-2 border-dashed border-slate-200 rounded-2xl">Aucun paiement enregistré pour l'instant</p>
                                        )}
                                    </div>
                                </div>

                                {/* SECTION PROFIL PROFESSIONNEL */}
                                <div className="bg-yellow-50 border-4 border-black p-8 rounded-[2.5rem] shadow-2xl">
                                    <h3 className="text-2xl font-black uppercase mb-4 italic underline">Mon Profil Professionnel</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-gray-400">Métier / Spécialité</p>
                                            <p className="text-xl font-black text-blue-700">{profile?.metier || 'Non renseigné'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-gray-400">Dernier Diplôme</p>
                                            <p className="text-xl font-black">{profile?.diplome || 'Expérience'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <p className="text-[10px] font-black uppercase text-gray-400">Secteur d'activité</p>
                                        <span className="inline-block bg-black text-white px-4 py-1 rounded-full text-xs font-black mt-1">
                                            {profile?.secteur_activite || 'Général'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => router.push('/profil/editer')}
                                        className="mt-8 w-full py-4 bg-white border-4 border-black rounded-2xl font-black uppercase hover:bg-yellow-200 transition-all shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                                    >
                                        Mettre à jour mes compétences pour l'emploi
                                    </button>
                                </div>
                            </div>

                        </div>
                    </>
                )}
            </div>
        </main>
    );
}