"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EditerProfil() {
    const [form, setForm] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const secteurs = ["Commerce", "BTP / Construction", "Santé", "Éducation", "Informatique", "Agriculture", "Artisanat", "Transport", "Droit / Justice", "Autre"];

    useEffect(() => { chargerInfos(); }, []);

    async function chargerInfos() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/login');

        const { data } = await supabase.from('membres').select('*').eq('user_id', user.id).maybeSingle();
        if (data) setForm(data);
        setLoading(false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const { error } = await supabase
            .from('membres')
            .update({
                nom_complet: form.nom_complet,
                kah_tokho: form.kah_tokho,
                ville_residence: form.ville_residence,
                telephone: form.telephone,
                metier: form.metier,
                diplome: form.diplome,
                secteur_activite: form.secteur_activite,
                biographie: form.biographie
            })
            .eq('id', form.id);

        if (error) alert(error.message);
        else {
            alert("PROFIL MIS À JOUR !");
            router.push('/profil');
        }
        setSaving(false);
    }

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black uppercase">Ouverture de votre dossier...</div>;

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10 border-b-8 border-black pb-4 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-[#0044ff] uppercase italic underline decoration-black">Mise à jour</h1>
                        <p className="font-bold text-sm mt-2 uppercase tracking-widest">Enrichir ma fiche communautaire</p>
                    </div>
                    <button onClick={() => router.back()} className="text-[10px] font-black uppercase border-2 border-black px-4 py-2 rounded-xl hover:bg-black hover:text-white transition-all">Retour</button>
                </header>

                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border-4 border-black p-8 md:p-12 rounded-[2.5rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">

                    {/* SECTION IDENTITÉ */}
                    <div className="space-y-4">
                        <h3 className="font-black uppercase text-blue-700 italic border-b-2 border-slate-100 pb-2">Informations Civiles</h3>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400">Nom complet</label>
                            <input type="text" value={form.nom_complet || ''} className="w-full p-4 border-2 border-black rounded-2xl font-bold" onChange={e => setForm({ ...form, nom_complet: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400">Kah Tôkhô</label>
                            <input type="text" value={form.kah_tokho || ''} className="w-full p-4 border-2 border-black rounded-2xl font-bold" onChange={e => setForm({ ...form, kah_tokho: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400">Ville de résidence</label>
                            <input type="text" value={form.ville_residence || ''} className="w-full p-4 border-2 border-black rounded-2xl font-bold" onChange={e => setForm({ ...form, ville_residence: e.target.value })} />
                        </div>
                    </div>

                    {/* SECTION PROFESSIONNELLE */}
                    <div className="space-y-4">
                        <h3 className="font-black uppercase text-green-700 italic border-b-2 border-slate-100 pb-2">Parcours & Métier</h3>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400">Secteur d'activité</label>
                            <select value={form.secteur_activite || ''} className="w-full p-4 border-2 border-black rounded-2xl font-black bg-white" onChange={e => setForm({ ...form, secteur_activite: e.target.value })}>
                                <option value="">-- Choisir un secteur --</option>
                                {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400">Métier précis</label>
                            <input type="text" value={form.metier || ''} placeholder="Ex: Chef de chantier" className="w-full p-4 border-2 border-black rounded-2xl font-bold" onChange={e => setForm({ ...form, metier: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400">Dernier Diplôme</label>
                            <input type="text" value={form.diplome || ''} className="w-full p-4 border-2 border-black rounded-2xl font-bold" onChange={e => setForm({ ...form, diplome: e.target.value })} />
                        </div>
                    </div>

                    {/* BIOGRAPHIE / PRÉSENTATION */}
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Ma présentation (Optionnel)</label>
                        <textarea value={form.biographie || ''} className="w-full p-4 border-2 border-black rounded-2xl font-medium h-32"
                            placeholder="Parlez-nous de vos compétences ou de vos projets..."
                            onChange={e => setForm({ ...form, biographie: e.target.value })}></textarea>
                    </div>

                    <button type="submit" disabled={saving} className="md:col-span-2 py-6 bg-black text-white font-black text-2xl border-4 border-black rounded-3xl hover:bg-[#0044ff] transition-all shadow-xl uppercase">
                        {saving ? "ENREGISTREMENT..." : "Mettre à jour ma fiche"}
                    </button>
                </form>
            </div>
        </main>
    );
}