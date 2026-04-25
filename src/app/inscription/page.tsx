"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InscriptionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        nom_complet: '',
        telephone: '',
        generation: '',
        ville_residence: ''
    });

    const generations = [
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

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.push('/dashboard');
            }
        };
        checkUser();
    }, [router]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (form.password !== form.confirmPassword) {
            setError("Les mots de passe ne correspondent pas");
            setLoading(false);
            return;
        }

        if (form.password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères");
            setLoading(false);
            return;
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: dbError } = await supabase.from('membres').insert([{
                    user_id: authData.user.id,
                    email: form.email,
                    nom_complet: form.nom_complet,
                    telephone: form.telephone,
                    generation: form.generation,
                    ville_residence: form.ville_residence,
                    role: 'membre',
                    est_valide: true
                }]);

                if (dbError) throw dbError;
            }

            setSuccess("Inscription réussie ! Vous pouvez maintenant vous connecter.");
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-green-800 uppercase">
                        Balou Padra
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">Créer mon compte</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded-lg text-sm text-center">
                            {success}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Email *</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Mot de passe *</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Confirmer mot de passe *</label>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nom complet *</label>
                            <input
                                type="text"
                                value={form.nom_complet}
                                onChange={(e) => setForm({ ...form, nom_complet: e.target.value })}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Téléphone</label>
                            <input
                                type="tel"
                                value={form.telephone}
                                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Ville</label>
                            <input
                                type="text"
                                value={form.ville_residence}
                                onChange={(e) => setForm({ ...form, ville_residence: e.target.value })}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Génération *</label>
                        <select
                            value={form.generation}
                            onChange={(e) => setForm({ ...form, generation: e.target.value })}
                            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                            required
                        >
                            <option value="">-- Sélectionnez votre génération --</option>
                            {generations.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-700 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? "INSCRIPTION..." : "S'INSCRIRE"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/login" className="text-sm text-green-700 hover:underline">
                        Déjà un compte ? Se connecter
                    </Link>
                    <br />
                    <Link href="/" className="text-sm text-gray-500 hover:underline mt-2 inline-block">
                        ← Retour à l'accueil
                    </Link>
                </div>
            </div>
        </main>
    );
}