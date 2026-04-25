"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NaissanceForm() {
    const [loading, setLoading] = useState(false);
    const [modeActe, setModeActe] = useState<'auto' | 'manuel'>('auto');
    const [numeroActeManuel, setNumeroActeManuel] = useState('');
    const [numeroActeAuto, setNumeroActeAuto] = useState('');
    const router = useRouter();

    const annee = new Date().getFullYear();
    const [form, setForm] = useState({
        numero_acte: '',
        annee: annee,
        date_acte: new Date().toISOString().split('T')[0],
        numero_registre: '',
        nom_enfant: '',
        prenoms_enfant: '',
        sexe: 'Masculin',
        date_naissance: '',
        heure_naissance: '',
        lieu_naissance: '',
        nom_pere: '',
        date_naissance_pere: '',
        lieu_naissance_pere: '',
        profession_pere: '',
        nationalite_pere: '',
        numero_cni_pere: '',
        cni_etablie_pere: '',
        cni_validite_debut: '',
        cni_validite_fin: '',
        adresse_pere: '',
        telephone_pere: '',
        nom_mere: '',
        date_naissance_mere: '',
        lieu_naissance_mere: '',
        profession_mere: '',
        nationalite_mere: '',
        numero_cni_mere: '',
        cni_etablie_mere: '',
        cni_validite_debut_mere: '',
        cni_validite_fin_mere: '',
        adresse_mere: '',
        telephone_mere: '',
        nom_declarant: '',
        lien_declarant: '',
        adresse_declarant: '',
        telephone_declarant: '',
        temoin1_nom: '',
        temoin1_adresse: '',
        temoin2_nom: '',
        temoin2_adresse: '',
        officier_nom: '',
        officier_grade: '',
        observations: ''
    });

    // Générer le numéro d'acte automatiquement
    React.useEffect(() => {
        const generateNumeroActe = async () => {
            const { count } = await supabase
                .from('registre_civil')
                .select('*', { count: 'exact', head: false })
                .eq('type_evenement', 'Naissance')
                .eq('annee', annee);

            const nombreNaissances = count || 0;
            const numero = `${annee}-${String(nombreNaissances + 1).padStart(4, '0')}`;
            setNumeroActeAuto(numero);

            if (modeActe === 'auto') {
                setForm(prev => ({ ...prev, numero_acte: numero }));
            }
        };
        generateNumeroActe();
    }, [annee, modeActe]);

    const handleModeChange = (mode: 'auto' | 'manuel') => {
        setModeActe(mode);
        if (mode === 'auto') {
            setForm(prev => ({ ...prev, numero_acte: numeroActeAuto }));
            setNumeroActeManuel('');
        } else {
            setForm(prev => ({ ...prev, numero_acte: numeroActeManuel }));
        }
    };

    const handleNumeroManuelChange = (value: string) => {
        setNumeroActeManuel(value);
        setForm(prev => ({ ...prev, numero_acte: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Vérifier que le numéro d'acte est renseigné
        if (!form.numero_acte) {
            alert("Veuillez renseigner un numéro d'acte");
            setLoading(false);
            return;
        }

        // Vérifier que le numéro d'acte n'existe pas déjà
        const { data: existant } = await supabase
            .from('registre_civil')
            .select('numero_acte')
            .eq('numero_acte', form.numero_acte)
            .maybeSingle();

        if (existant) {
            alert(`Le numéro d'acte ${form.numero_acte} existe déjà !`);
            setLoading(false);
            return;
        }

        const { error } = await supabase.from('registre_civil').insert([{
            type_evenement: 'Naissance',
            numero_acte: form.numero_acte,
            annee: form.annee,
            date_acte: form.date_acte,
            numero_registre: form.numero_registre,
            date_evenement: form.date_naissance,
            description: `Naissance de ${form.prenoms_enfant} ${form.nom_enfant}`,
            donnees_detaillees: form
        }]);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert(`ACTE DE NAISSANCE N°${form.numero_acte} ENREGISTRÉ AVEC SUCCÈS`);
            router.push('/etat-civil');
        }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-black font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="mb-4">
                    <Link href="/etat-civil" className="inline-flex items-center gap-2 text-black font-black hover:text-orange-600">
                        ← Retour à l'état civil
                    </Link>
                </div>

                <div className="bg-white border-4 border-black rounded-[2rem] p-6 md:p-8 shadow-2xl">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-black uppercase text-orange-700 italic">Déclaration de Naissance</h1>
                        <div className="h-1 w-24 bg-black mx-auto mt-2"></div>
                        <p className="text-sm font-black text-gray-500 mt-2">Registre d'état civil</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* SECTION 1: INFORMATIONS SUR L'ACTE AVEC OPTION MANUELLE/AUTO */}
                        <div className="bg-gray-50 p-5 rounded-xl border-2 border-black">
                            <h2 className="font-black uppercase text-sm text-orange-700 mb-4 border-l-4 border-orange-700 pl-2">📋 Informations sur l'acte</h2>

                            {/* Sélection du mode */}
                            <div className="mb-4 flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="modeActe"
                                        value="auto"
                                        checked={modeActe === 'auto'}
                                        onChange={() => handleModeChange('auto')}
                                        className="w-4 h-4"
                                    />
                                    <span className="font-black text-sm">🔢 Auto (généré automatiquement)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="modeActe"
                                        value="manuel"
                                        checked={modeActe === 'manuel'}
                                        onChange={() => handleModeChange('manuel')}
                                        className="w-4 h-4"
                                    />
                                    <span className="font-black text-sm">✏️ Manuel (pour les actes anciens)</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">
                                        N° de l'acte {modeActe === 'manuel' && <span className="text-red-500">*</span>}
                                    </label>
                                    {modeActe === 'auto' ? (
                                        <input
                                            type="text"
                                            value={numeroActeAuto}
                                            readOnly
                                            className="w-full p-3 bg-green-100 border-2 border-green-500 rounded-xl font-bold text-green-700"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={numeroActeManuel}
                                            onChange={(e) => handleNumeroManuelChange(e.target.value)}
                                            placeholder="Ex: 2024-0001 ou AN-2024-001"
                                            className="w-full p-3 border-2 border-black rounded-xl font-bold bg-white focus:bg-yellow-50"
                                            required
                                        />
                                    )}
                                    {modeActe === 'auto' && (
                                        <p className="text-xs text-green-600 mt-1">Numéro généré automatiquement</p>
                                    )}
                                    {modeActe === 'manuel' && (
                                        <p className="text-xs text-orange-600 mt-1">Pour les actes anciens, saisissez le numéro existant</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">Année</label>
                                    <input type="text" value={annee} readOnly className="w-full p-3 bg-gray-100 border-2 border-black rounded-xl font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">Date de l'acte</label>
                                    <input type="date" value={form.date_acte} onChange={e => setForm({ ...form, date_acte: e.target.value })} className="w-full p-3 border-2 border-black rounded-xl font-bold" required />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">N° du registre</label>
                                    <input type="text" placeholder="Registre N°..." value={form.numero_registre} onChange={e => setForm({ ...form, numero_registre: e.target.value })} className="w-full p-3 border-2 border-black rounded-xl font-bold" />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: ENFANT */}
                        <div className="bg-pink-50 p-5 rounded-xl border-2 border-black">
                            <h2 className="font-black uppercase text-sm text-pink-700 mb-4 border-l-4 border-pink-700 pl-2">👶 L'ENFANT</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-1">
                                    <label className="block text-[10px] font-black uppercase">NOM DE FAMILLE</label>
                                    <input type="text" required className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, nom_enfant: e.target.value })} />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">PRÉNOMS</label>
                                    <input type="text" required className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, prenoms_enfant: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">SEXE</label>
                                    <select className="w-full p-3 border-2 border-black rounded-xl font-black bg-white" onChange={e => setForm({ ...form, sexe: e.target.value })}>
                                        <option value="Masculin">Masculin</option>
                                        <option value="Féminin">Féminin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">DATE DE NAISSANCE</label>
                                    <input type="date" required className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, date_naissance: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">HEURE DE NAISSANCE</label>
                                    <input type="time" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, heure_naissance: e.target.value })} />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">LIEU DE NAISSANCE</label>
                                    <input type="text" placeholder="Ville, Hôpital, Quartier..." required className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, lieu_naissance: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: PÈRE */}
                        <div className="bg-blue-50 p-5 rounded-xl border-2 border-black">
                            <h2 className="font-black uppercase text-sm text-blue-700 mb-4 border-l-4 border-blue-700 pl-2">👨 LE PÈRE</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">NOM COMPLET</label>
                                    <input type="text" required className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, nom_pere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">DATE DE NAISSANCE</label>
                                    <input type="date" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, date_naissance_pere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">LIEU DE NAISSANCE</label>
                                    <input type="text" placeholder="Ville, Pays" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, lieu_naissance_pere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">PROFESSION</label>
                                    <input type="text" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, profession_pere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">NATIONALITÉ</label>
                                    <input type="text" placeholder="Ivoirienne, Française..." className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, nationalite_pere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">N° CNI</label>
                                    <input type="text" placeholder="N° Carte Nationale d'Identité" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, numero_cni_pere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">CNI ÉTABLIE À</label>
                                    <input type="text" placeholder="Lieu d'établissement" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, cni_etablie_pere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">CNI VALIDITÉ DU</label>
                                    <input type="date" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, cni_validite_debut: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">CNI VALIDITÉ AU</label>
                                    <input type="date" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, cni_validite_fin: e.target.value })} />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">ADRESSE</label>
                                    <input type="text" placeholder="Adresse complète" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, adresse_pere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">TÉLÉPHONE</label>
                                    <input type="tel" placeholder="Numéro de téléphone" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, telephone_pere: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: MÈRE */}
                        <div className="bg-green-50 p-5 rounded-xl border-2 border-black">
                            <h2 className="font-black uppercase text-sm text-green-700 mb-4 border-l-4 border-green-700 pl-2">👩 LA MÈRE</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">NOM COMPLET</label>
                                    <input type="text" required className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, nom_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">DATE DE NAISSANCE</label>
                                    <input type="date" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, date_naissance_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">LIEU DE NAISSANCE</label>
                                    <input type="text" placeholder="Ville, Pays" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, lieu_naissance_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">PROFESSION</label>
                                    <input type="text" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, profession_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">NATIONALITÉ</label>
                                    <input type="text" placeholder="Ivoirienne, Française..." className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, nationalite_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">N° CNI</label>
                                    <input type="text" placeholder="N° Carte Nationale d'Identité" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, numero_cni_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">CNI ÉTABLIE À</label>
                                    <input type="text" placeholder="Lieu d'établissement" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, cni_etablie_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">CNI VALIDITÉ DU</label>
                                    <input type="date" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, cni_validite_debut_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">CNI VALIDITÉ AU</label>
                                    <input type="date" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, cni_validite_fin_mere: e.target.value })} />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">ADRESSE</label>
                                    <input type="text" placeholder="Adresse complète" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, adresse_mere: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">TÉLÉPHONE</label>
                                    <input type="tel" placeholder="Numéro de téléphone" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, telephone_mere: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 5: DÉCLARANT */}
                        <div className="bg-yellow-50 p-5 rounded-xl border-2 border-black">
                            <h2 className="font-black uppercase text-sm text-yellow-700 mb-4 border-l-4 border-yellow-700 pl-2">📝 DÉCLARANT</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase">NOM COMPLET</label>
                                    <input type="text" required className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, nom_declarant: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">LIEN DE PARENTÉ</label>
                                    <input type="text" placeholder="Père, Mère, Tuteur..." required className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, lien_declarant: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">ADRESSE</label>
                                    <input type="text" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, adresse_declarant: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">TÉLÉPHONE</label>
                                    <input type="tel" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, telephone_declarant: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 6: TÉMOINS */}
                        <div className="bg-purple-50 p-5 rounded-xl border-2 border-black">
                            <h2 className="font-black uppercase text-sm text-purple-700 mb-4 border-l-4 border-purple-700 pl-2">👥 TÉMOINS</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase">NOM DU 1er TÉMOIN</label>
                                    <input type="text" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, temoin1_nom: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">ADRESSE DU 1er TÉMOIN</label>
                                    <input type="text" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, temoin1_adresse: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">NOM DU 2e TÉMOIN</label>
                                    <input type="text" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, temoin2_nom: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase">ADRESSE DU 2e TÉMOIN</label>
                                    <input type="text" className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, temoin2_adresse: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 7: OFFICIER D'ÉTAT CIVIL */}
                        <div className="bg-gray-800 p-5 rounded-xl border-2 border-black">
                            <h2 className="font-black uppercase text-sm text-white mb-4 border-l-4 border-white pl-2">⚖️ OFFICIER D'ÉTAT CIVIL</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-white">NOM ET PRÉNOMS</label>
                                    <input type="text" required className="w-full p-3 border-2 border-black rounded-xl font-bold bg-white" onChange={e => setForm({ ...form, officier_nom: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-white">GRADE / QUALITÉ</label>
                                    <input type="text" placeholder="Maire, Adjoint, Officier..." required className="w-full p-3 border-2 border-black rounded-xl font-bold bg-white" onChange={e => setForm({ ...form, officier_grade: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 8: OBSERVATIONS */}
                        <div className="bg-gray-100 p-5 rounded-xl border-2 border-black">
                            <h2 className="font-black uppercase text-sm text-gray-700 mb-4 border-l-4 border-gray-700 pl-2">📝 OBSERVATIONS</h2>
                            <textarea rows={3} placeholder="Observations particulières, mentions marginales..." className="w-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, observations: e.target.value })}></textarea>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-5 bg-black text-white font-black text-2xl rounded-2xl uppercase hover:bg-orange-600 transition-all shadow-xl">
                            {loading ? "ENREGISTREMENT..." : "VALIDER L'ACTE DE NAISSANCE"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}