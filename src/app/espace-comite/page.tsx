"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EspaceComite() {
    const [monComite, setMonComite] = useState<any>(null);
    const [monProfil, setMonProfil] = useState<any>(null);
    const [titre, setTitre] = useState("");
    const [contenu, setContenu] = useState("");
    const [typeInfo, setTypeInfo] = useState("Information");
    const [portee, setPortee] = useState("Public");
    const [cibleGen, setCibleGen] = useState("");
    const [fichier, setFichier] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const generations = ["Génération Wassalah dramane", "Génération Dramane konté", "Génération kissima", "Génération maramou basseyabané", "Génération khadja bah baya", "Génération antankhoulé passokhona", "Génération Mamery", "Génération makhadja baliou", "Génération kissima bah", "Génération tchamba", "Diaspora"];

    useEffect(() => { checkAccess(); }, []);

    async function checkAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/login');

        const { data: p } = await supabase.from('membres').select('*').eq('user_id', user.id).maybeSingle();
        setMonProfil(p);

        // Vérifier si ce membre appartient à un comité
        const { data: comiteLien } = await supabase
            .from('comite_membres')
            .select('comites(*)')
            .eq('membre_id', p.id)
            .maybeSingle();

        if (!comiteLien) {
            alert("Accès refusé : Vous n'appartenez à aucun comité.");
            router.push('/dashboard');
        } else {
            setMonComite(comiteLien.comites);
        }
    }

    async function publierMessage(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        let fileUrl = "";

        try {
            // 1. Upload du document si présent
            if (fichier) {
                const fileName = `${Date.now()}-${fichier.name}`;
                const { error: upError } = await supabase.storage.from('documents-comites').upload(fileName, fichier);
                if (upError) throw upError;
                fileUrl = supabase.storage.from('documents-comites').getPublicUrl(fileName).data.publicUrl;
            }

            // 2. Enregistrement de la communication
            const { error } = await supabase.from('communications').insert([{
                comite_id: monComite.id,
                titre,
                contenu,
                type_info: typeInfo,
                portee,
                cible_generation: portee === 'Public' ? null : (portee === 'Ma Generation' ? monProfil.generation : cibleGen),
                fichier_url: fileUrl,
                cree_par_nom: monProfil.nom_complet
            }]);

            if (error) throw error;
            alert("Message diffusé avec succès !");
            router.push('/actualites');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10 border-b-8 border-black pb-4">
                    <h1 className="text-4xl font-black text-blue-700 uppercase italic underline">Espace {monComite?.nom}</h1>
                    <p className="font-bold text-sm mt-2">PUBLICATION DE DOCUMENTS ET INFORMATIONS</p>
                </header>

                <form onSubmit={publierMessage} className="bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <label className="block text-xs font-black uppercase">Titre de l'annonce</label>
                            <input type="text" required className="w-full p-4 border-2 border-black rounded-2xl font-bold" 
                                onChange={e => setTitre(e.target.value)} placeholder="Ex: Bilan Scolaire Trimestriel" />
                            
                            <label className="block text-xs font-black uppercase">Type de contenu</label>
                            <select className="w-full p-4 border-2 border-black rounded-2xl font-black bg-white" onChange={e => setTypeInfo(e.target.value)}>
                                <option value="Information">Information Générale</option>
                                <option value="Scolaire">Comité Scolaire / Éducatif</option>
                                <option value="Bilan">Bilan Financier / Rapport</option>
                                <option value="Evenement">Événement / Cérémonie</option>
                            </select>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-black uppercase">Qui peut voir ce message ?</label>
                            <select className="w-full p-4 border-2 border-black rounded-2xl font-black bg-white" onChange={e => setPortee(e.target.value)}>
                                <option value="Public">Toute la communauté (Public)</option>
                                <option value="Ma Generation">Uniquement ma génération</option>
                                <option value="Generation Specifique">Une autre génération précise</option>
                            </select>

                            {portee === "Generation Specifique" && (
                                <select className="w-full p-4 border-2 border-green-600 rounded-2xl font-black bg-white animate-bounce" onChange={e => setCibleGen(e.target.value)}>
                                    <option value="">-- Choisir la cible --</option>
                                    {generations.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase mb-1">Message détaillé</label>
                        <textarea className="w-full p-4 border-2 border-black rounded-2xl h-32 font-medium" 
                            onChange={e => setContenu(e.target.value)} placeholder="Ecrivez votre texte ici..."></textarea>
                    </div>

                    <div className="bg-blue-50 p-6 border-2 border-dashed border-blue-700 rounded-3xl">
                        <label className="block text-sm font-black text-blue-700 mb-2 uppercase">Joindre un document (PDF, XLS, Word)</label>
                        <input type="file" onChange={e => setFichier(e.target.files ? e.target.files[0] : null)} className="font-bold text-xs" />
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-6 bg-[#0044ff] text-white font-black text-2xl border-4 border-black rounded-3xl hover:bg-black transition-all shadow-xl">
                        {loading ? "ENVOI EN COURS..." : "DIFFUSER MAINTENANT"}
                    </button>
                </form>
            </div>
        </main>
    );
}