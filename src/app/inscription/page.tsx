"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function InscriptionPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const router = useRouter();

    // Liste statique des générations
    const generationsList = [
        "Génération Wassalah dramane",
        "Génération Dramane konté",
        "Génération kissima",
        "Génération maramou basseyabané",
        "Génération khadja bah baya",
        "Génération antankhoulé passokhona",
        "Génération Mamery",
        "Génération makhadja baliou",
        "Génération kissima bah",
        "Génération tchamba",
        "Diaspora"
    ];

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        nom_complet: "",
        nom_soninke: "",
        petit_nom: "",
        sexe: "M",
        generation: "",
        ville_residence: "",
        quartier: "",
        telephone: "",
        contact_urgence: "",
        pere_nom_civil: "",
        pere_nom_soninke: "",
        pere_petit_nom: "",
        mere_nom_civil: "",
        mere_nom_soninke: "",
        mere_petit_nom: "",
        statut_matrimonial: "Célibataire",
        etat_scolarisation: "Scolarisé",
        niveau_etudes: "",
        statut_professionnel: "En emploi",
        domaine_activite: ""
    });

    useEffect(() => {
        // Rediriger si déjà connecté
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.push('/profil');
            }
        };
        checkUser();
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        // Validation des champs requis
        if (!formData.email || !formData.password || !formData.nom_complet || !formData.ville_residence || !formData.telephone) {
            setError("Veuillez remplir tous les champs obligatoires (*)");
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères");
            setLoading(false);
            return;
        }

        if (!formData.generation) {
            setError("Veuillez sélectionner votre génération");
            setLoading(false);
            return;
        }

        try {
            // 1. Création du compte Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        nom_complet: formData.nom_complet,
                        generation: formData.generation
                    }
                }
            });

            if (authError) {
                if (authError.message.includes('User already registered')) {
                    throw new Error("Cet e-mail est déjà enregistré. Veuillez vous connecter.");
                }
                throw new Error(authError.message);
            }

            if (!authData.user) {
                throw new Error("Erreur lors de la création du compte");
            }

            // 2. Insertion dans la table membres
            const { error: dbError } = await supabase.from('membres').insert({
                user_id: authData.user.id,
                email: formData.email,
                nom_complet: formData.nom_complet,
                nom_soninke: formData.nom_soninke || null,
                petit_nom: formData.petit_nom || null,
                sexe: formData.sexe,
                generation: formData.generation,
                ville_residence: formData.ville_residence,
                quartier: formData.quartier || null,
                telephone: formData.telephone,
                contact_urgence: formData.contact_urgence || null,
                pere_nom_civil: formData.pere_nom_civil || null,
                pere_nom_soninke: formData.pere_nom_soninke || null,
                pere_petit_nom: formData.pere_petit_nom || null,
                mere_nom_civil: formData.mere_nom_civil || null,
                mere_nom_soninke: formData.mere_nom_soninke || null,
                mere_petit_nom: formData.mere_petit_nom || null,
                statut_matrimonial: formData.statut_matrimonial,
                etat_scolarisation: formData.etat_scolarisation,
                niveau_etudes: formData.niveau_etudes || null,
                statut_professionnel: formData.statut_professionnel,
                domaine_activite: formData.domaine_activite || null,
                role: 'membre',
                statut_validation: 'en_attente'
            });

            if (dbError) {
                console.error("Erreur détaillée DB:", dbError);
                throw new Error(`Erreur base de données: ${dbError.message}`);
            }

            setSuccess("Inscription réussie ! Vérifiez votre email pour confirmer votre compte.");

            // Redirection vers la page de login après 3 secondes
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (err: any) {
            console.error("Erreur inscription:", err);
            if (err.message.includes('duplicate key')) {
                setError("Cet e-mail est déjà enregistré. Veuillez vous connecter.");
            } else if (err.message.includes('Password should be at least 6 characters')) {
                setError("Le mot de passe doit contenir au moins 6 caractères.");
            } else {
                setError("Erreur lors de l'inscription: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
            <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] max-w-4xl w-full">
                <header className="mb-8 text-center text-black">
                    <h1 className="text-3xl font-black uppercase italic text-[#146332]">Rejoindre la Communauté</h1>
                    <p className="text-sm text-gray-600 mt-2">Formulaire d'inscription complet</p>
                </header>

                <form onSubmit={handleSignup} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border-2 border-red-700 text-red-700 p-3 rounded-xl font-bold">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-100 border-2 border-green-700 text-green-700 p-3 rounded-xl font-bold">
                            {success}
                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={() => router.push('/login')}
                                    className="bg-[#39ff14] text-black px-4 py-2 rounded-xl font-bold border-2 border-black hover:bg-black hover:text-white transition-all"
                                >
                                    Se connecter maintenant
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Section 1: Identité et Accès */}
                    <div className="space-y-4 border-b-2 border-gray-200 pb-6">
                        <h2 className="text-xl font-bold text-[#146332] uppercase">1. Identité et Accès</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                placeholder="Email *"
                                required
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                placeholder="Mot de passe * (min. 6 caractères)"
                                required
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                        </div>
                        <input
                            type="text"
                            name="nom_complet"
                            value={formData.nom_complet}
                            placeholder="Nom et Prénom (État Civil) *"
                            required
                            onChange={handleChange}
                            className="w-full p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                            disabled={loading}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                name="nom_soninke"
                                value={formData.nom_soninke}
                                placeholder="Nom en Soninké"
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold bg-green-50 text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                            <input
                                type="text"
                                name="petit_nom"
                                value={formData.petit_nom}
                                placeholder="Petit nom / Nom de reconnaissance"
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold bg-green-50 text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Section 2: Localisation et Contact */}
                    <div className="space-y-4 border-b-2 border-gray-200 pb-6">
                        <h2 className="text-xl font-bold text-[#146332] uppercase">2. Localisation et Contact</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select
                                name="sexe"
                                value={formData.sexe}
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            >
                                <option value="M">Homme</option>
                                <option value="F">Femme</option>
                            </select>
                            <select
                                name="generation"
                                value={formData.generation}
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                required
                                disabled={loading}
                            >
                                <option value="">Sélectionnez votre génération *</option>
                                {generationsList.map((gen, index) => (
                                    <option key={index} value={gen}>{gen}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                name="ville_residence"
                                value={formData.ville_residence}
                                placeholder="Ville *"
                                required
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                            <input
                                type="text"
                                name="quartier"
                                value={formData.quartier}
                                placeholder="Quartier / Commune"
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="tel"
                                name="telephone"
                                value={formData.telephone}
                                placeholder="N° Téléphone *"
                                required
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                            <input
                                type="text"
                                name="contact_urgence"
                                value={formData.contact_urgence}
                                placeholder="Contact d'urgence"
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Section 3: Filiation */}
                    <div className="space-y-4 border-b-2 border-gray-200 pb-6">
                        <h2 className="text-xl font-bold text-[#146332] uppercase">3. Filiation</h2>
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                            <p className="text-xs font-black uppercase mb-2 text-black">Informations du Père</p>
                            <input
                                type="text"
                                name="pere_nom_civil"
                                value={formData.pere_nom_civil}
                                placeholder="Nom du Père (État Civil)"
                                onChange={handleChange}
                                className="w-full p-3 border border-black rounded-lg mb-2 font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    name="pere_nom_soninke"
                                    value={formData.pere_nom_soninke}
                                    placeholder="Nom Soninké"
                                    onChange={handleChange}
                                    className="p-3 border border-black rounded-lg font-bold text-xs text-black focus:outline-none focus:border-[#146332]"
                                    disabled={loading}
                                />
                                <input
                                    type="text"
                                    name="pere_petit_nom"
                                    value={formData.pere_petit_nom}
                                    placeholder="Petit Nom"
                                    onChange={handleChange}
                                    className="p-3 border border-black rounded-lg font-bold text-xs text-black focus:outline-none focus:border-[#146332]"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-pink-50 border-2 border-pink-200 rounded-2xl">
                            <p className="text-xs font-black uppercase mb-2 text-black">Informations de la Mère</p>
                            <input
                                type="text"
                                name="mere_nom_civil"
                                value={formData.mere_nom_civil}
                                placeholder="Nom de la Mère (État Civil)"
                                onChange={handleChange}
                                className="w-full p-3 border border-black rounded-lg mb-2 font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    name="mere_nom_soninke"
                                    value={formData.mere_nom_soninke}
                                    placeholder="Nom Soninké"
                                    onChange={handleChange}
                                    className="p-3 border border-black rounded-lg font-bold text-xs text-black focus:outline-none focus:border-[#146332]"
                                    disabled={loading}
                                />
                                <input
                                    type="text"
                                    name="mere_petit_nom"
                                    value={formData.mere_petit_nom}
                                    placeholder="Petit Nom"
                                    onChange={handleChange}
                                    className="p-3 border border-black rounded-lg font-bold text-xs text-black focus:outline-none focus:border-[#146332]"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Situation Sociale et Professionnelle */}
                    <div className="space-y-4 pb-6">
                        <h2 className="text-xl font-bold text-[#146332] uppercase">4. Situation Sociale et Professionnelle</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select
                                name="statut_matrimonial"
                                value={formData.statut_matrimonial}
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            >
                                <option>Célibataire</option>
                                <option>Marié(e)</option>
                                <option>Veuf/Veuve</option>
                                <option>Divorcé(e)</option>
                            </select>
                            <select
                                name="etat_scolarisation"
                                value={formData.etat_scolarisation}
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            >
                                <option>Scolarisé</option>
                                <option>Non scolarisé</option>
                            </select>
                        </div>
                        <input
                            type="text"
                            name="niveau_etudes"
                            value={formData.niveau_etudes}
                            placeholder="Dernier diplôme / Niveau d'études"
                            onChange={handleChange}
                            className="w-full p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                            disabled={loading}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select
                                name="statut_professionnel"
                                value={formData.statut_professionnel}
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            >
                                <option>En emploi</option>
                                <option>Indépendant / Entrepreneur</option>
                                <option>En quête d'emploi</option>
                                <option>Étudiant</option>
                            </select>
                            <input
                                type="text"
                                name="domaine_activite"
                                value={formData.domaine_activite}
                                placeholder="Domaine d'activité"
                                onChange={handleChange}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black focus:outline-none focus:border-[#146332]"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#39ff14] text-black rounded-2xl font-black uppercase border-4 border-black hover:bg-black hover:text-white transition-all disabled:opacity-50 text-lg"
                    >
                        {loading ? "Inscription en cours..." : "Valider mon inscription"}
                    </button>
                </form>
            </div>
        </div>
    );
}