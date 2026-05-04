"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function InscriptionPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [alreadyConnected, setAlreadyConnected] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

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
        "Diaspora",
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
        domaine_activite: "",
    });

    useEffect(() => {
        const checkSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            /**
             * IMPORTANT :
             * On ne redirige PAS vers /login ici.
             * La page inscription doit rester accessible aux visiteurs non connectés.
             *
             * Si quelqu'un est déjà connecté, on affiche seulement un message.
             */
            if (session) {
                setAlreadyConnected(true);
            }

            setCheckingSession(false);
        };

        checkSession();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setAlreadyConnected(false);
        router.refresh();
    };

    const validateForm = () => {
        if (!formData.email.trim()) return "Veuillez saisir votre email.";
        if (!formData.password.trim()) return "Veuillez saisir un mot de passe.";
        if (formData.password.length < 6) {
            return "Le mot de passe doit contenir au moins 6 caractères.";
        }
        if (!formData.nom_complet.trim()) return "Veuillez saisir votre nom complet.";
        if (!formData.generation.trim()) return "Veuillez sélectionner votre génération.";
        if (!formData.ville_residence.trim()) return "Veuillez saisir votre ville de résidence.";
        if (!formData.telephone.trim()) return "Veuillez saisir votre numéro de téléphone.";

        return "";
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            /**
             * 1. Création du compte Supabase Auth
             * Le mot de passe est stocké par Supabase Auth.
             * Il n'est jamais inséré dans la table membres.
             */
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                options: {
                    data: {
                        nom_complet: formData.nom_complet,
                        generation: formData.generation,
                    },
                },
            });

            if (authError) {
                if (authError.message.includes("User already registered")) {
                    throw new Error("Cet email est déjà enregistré. Veuillez vous connecter.");
                }

                throw new Error(authError.message);
            }

            if (!authData.user) {
                throw new Error("Erreur lors de la création du compte utilisateur.");
            }

            /**
             * 2. Insertion du profil dans membres
             */
            const { error: dbError } = await supabase.from("membres").insert({
                user_id: authData.user.id,
                email: formData.email.trim().toLowerCase(),

                nom_complet: formData.nom_complet.trim(),
                nom_soninke: formData.nom_soninke.trim() || null,
                petit_nom: formData.petit_nom.trim() || null,

                sexe: formData.sexe,
                generation: formData.generation,
                ville_residence: formData.ville_residence.trim(),
                quartier: formData.quartier.trim() || null,
                telephone: formData.telephone.trim(),
                contact_urgence: formData.contact_urgence.trim() || null,

                pere_nom_civil: formData.pere_nom_civil.trim() || null,
                pere_nom_soninke: formData.pere_nom_soninke.trim() || null,
                pere_petit_nom: formData.pere_petit_nom.trim() || null,

                mere_nom_civil: formData.mere_nom_civil.trim() || null,
                mere_nom_soninke: formData.mere_nom_soninke.trim() || null,
                mere_petit_nom: formData.mere_petit_nom.trim() || null,

                statut_matrimonial: formData.statut_matrimonial,
                etat_scolarisation: formData.etat_scolarisation,
                niveau_etudes: formData.niveau_etudes.trim() || null,
                statut_professionnel: formData.statut_professionnel,
                domaine_activite: formData.domaine_activite.trim() || null,

                role: "membre",
                statut_validation: "en_attente",
                est_compte_gestion: false,
            });

            if (dbError) {
                console.error("Erreur insertion membres:", dbError);
                throw new Error("Erreur base de données : " + dbError.message);
            }

            setSuccess(
                "Inscription réussie. Votre compte est en attente de validation par votre génération."
            );

            setFormData({
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
                domaine_activite: "",
            });

            setTimeout(() => {
                router.push("/login");
            }, 3500);
        } catch (err: any) {
            console.error("Erreur inscription:", err);
            setError(err.message || "Erreur lors de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#146332] border-t-transparent mx-auto mb-4"></div>
                    <p className="font-black uppercase">Vérification...</p>
                </div>
            </div>
        );
    }

    if (alreadyConnected) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-black">
                <div className="bg-white border-4 border-black rounded-[2rem] p-8 max-w-xl w-full text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                    <div className="text-5xl mb-4">✅</div>

                    <h1 className="text-3xl font-black uppercase text-[#146332] mb-4">
                        Vous êtes déjà connecté
                    </h1>

                    <p className="font-bold text-gray-600 mb-8">
                        Pour créer un nouveau compte, vous devez d'abord vous déconnecter.
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="bg-[#146332] text-white px-6 py-3 rounded-xl font-black uppercase border-2 border-black"
                        >
                            Accéder à mon espace
                        </button>

                        <button
                            onClick={logout}
                            className="bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase border-2 border-black"
                        >
                            Me déconnecter
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12 text-black">
            <div className="bg-white border-4 border-black p-6 md:p-8 rounded-[2.5rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] max-w-5xl w-full">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-black uppercase italic text-[#146332]">
                        Rejoindre la communauté
                    </h1>
                    <p className="text-sm text-gray-600 mt-2 font-bold">
                        Formulaire d'inscription complet
                    </p>
                </header>

                {error && (
                    <div className="bg-red-100 border-2 border-red-700 text-red-700 p-4 rounded-xl font-bold mb-6">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 border-2 border-green-700 text-green-700 p-4 rounded-xl font-bold mb-6">
                        {success}
                        <div className="mt-3">
                            <button
                                type="button"
                                onClick={() => router.push("/login")}
                                className="bg-[#39ff14] text-black px-4 py-2 rounded-xl font-black border-2 border-black hover:bg-black hover:text-white transition-all"
                            >
                                Aller à la connexion
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-8">
                    {/* Section 1 */}
                    <section className="space-y-4 border-b-2 border-gray-200 pb-6">
                        <h2 className="text-xl font-black text-[#146332] uppercase">
                            1. Identité et accès
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                placeholder="Email *"
                                required
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black"
                            />

                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                placeholder="Mot de passe * (min. 6 caractères)"
                                required
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black"
                            />
                        </div>

                        <input
                            type="text"
                            name="nom_complet"
                            value={formData.nom_complet}
                            placeholder="Nom et prénom - État civil *"
                            required
                            onChange={handleChange}
                            disabled={loading}
                            className="w-full p-4 border-2 border-black rounded-xl font-bold text-black"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                name="nom_soninke"
                                value={formData.nom_soninke}
                                placeholder="Nom en Soninké"
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black bg-green-50"
                            />

                            <input
                                type="text"
                                name="petit_nom"
                                value={formData.petit_nom}
                                placeholder="Petit nom / Nom de reconnaissance"
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black bg-green-50"
                            />
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section className="space-y-4 border-b-2 border-gray-200 pb-6">
                        <h2 className="text-xl font-black text-[#146332] uppercase">
                            2. Localisation et contact
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select
                                name="sexe"
                                value={formData.sexe}
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black bg-white"
                            >
                                <option value="M">Homme</option>
                                <option value="F">Femme</option>
                            </select>

                            <select
                                name="generation"
                                value={formData.generation}
                                onChange={handleChange}
                                required
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black bg-white"
                            >
                                <option value="">Sélectionnez votre génération *</option>
                                {generationsList.map((gen) => (
                                    <option key={gen} value={gen}>
                                        {gen}
                                    </option>
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
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black"
                            />

                            <input
                                type="text"
                                name="quartier"
                                value={formData.quartier}
                                placeholder="Quartier / Commune"
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black"
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
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black"
                            />

                            <input
                                type="text"
                                name="contact_urgence"
                                value={formData.contact_urgence}
                                placeholder="Contact d'urgence"
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black"
                            />
                        </div>
                    </section>

                    {/* Section 3 */}
                    <section className="space-y-4 border-b-2 border-gray-200 pb-6">
                        <h2 className="text-xl font-black text-[#146332] uppercase">
                            3. Filiation
                        </h2>

                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                            <p className="text-xs font-black uppercase mb-2">
                                Informations du père
                            </p>

                            <input
                                type="text"
                                name="pere_nom_civil"
                                value={formData.pere_nom_civil}
                                placeholder="Nom du père - État civil"
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full p-3 border border-black rounded-lg mb-2 font-bold text-black"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    name="pere_nom_soninke"
                                    value={formData.pere_nom_soninke}
                                    placeholder="Nom Soninké"
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="p-3 border border-black rounded-lg font-bold text-xs text-black"
                                />

                                <input
                                    type="text"
                                    name="pere_petit_nom"
                                    value={formData.pere_petit_nom}
                                    placeholder="Petit nom"
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="p-3 border border-black rounded-lg font-bold text-xs text-black"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-pink-50 border-2 border-pink-200 rounded-2xl">
                            <p className="text-xs font-black uppercase mb-2">
                                Informations de la mère
                            </p>

                            <input
                                type="text"
                                name="mere_nom_civil"
                                value={formData.mere_nom_civil}
                                placeholder="Nom de la mère - État civil"
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full p-3 border border-black rounded-lg mb-2 font-bold text-black"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    name="mere_nom_soninke"
                                    value={formData.mere_nom_soninke}
                                    placeholder="Nom Soninké"
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="p-3 border border-black rounded-lg font-bold text-xs text-black"
                                />

                                <input
                                    type="text"
                                    name="mere_petit_nom"
                                    value={formData.mere_petit_nom}
                                    placeholder="Petit nom"
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="p-3 border border-black rounded-lg font-bold text-xs text-black"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section 4 */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-black text-[#146332] uppercase">
                            4. Situation sociale et professionnelle
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select
                                name="statut_matrimonial"
                                value={formData.statut_matrimonial}
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black bg-white"
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
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black bg-white"
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
                            disabled={loading}
                            className="w-full p-4 border-2 border-black rounded-xl font-bold text-black"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select
                                name="statut_professionnel"
                                value={formData.statut_professionnel}
                                onChange={handleChange}
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black bg-white"
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
                                disabled={loading}
                                className="p-4 border-2 border-black rounded-xl font-bold text-black"
                            />
                        </div>
                    </section>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#39ff14] text-black rounded-2xl font-black uppercase border-4 border-black hover:bg-black hover:text-white transition-all disabled:opacity-50 text-lg"
                    >
                        {loading ? "Inscription en cours..." : "Valider mon inscription"}
                    </button>
                </form>
            </div>
        </main>
    );
}