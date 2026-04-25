"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            setIsLoggedIn(true);
            const { data: profile } = await supabase
                .from('membres')
                .select('nom_complet, role')
                .eq('user_id', session.user.id)
                .maybeSingle();
            setUserName(profile?.nom_complet || session.user.email?.split('@')[0]);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        router.push('/');
    };

    const handleGoToDashboard = () => {
        router.push('/dashboard');
    };

    if (loading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
                <p className="mt-4 text-gray-500">Chargement...</p>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
            <div className="max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight text-green-900 sm:text-6xl">
                    Balou Padra
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                    Bienvenue sur l'espace numérique officiel des membres de la
                    Communauté Cheikh Yacouba Sylla.
                </p>

                {!isLoggedIn ? (
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Link
                            href="/inscription"
                            className="rounded-md bg-green-700 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                        >
                            S'inscrire
                        </Link>
                        <Link
                            href="/login"
                            className="text-lg font-semibold leading-6 text-gray-900 hover:text-green-700"
                        >
                            Se connecter <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                ) : (
                    <div className="mt-10">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                            <p className="text-lg font-semibold text-green-800">
                                Bonjour, {userName} !
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                Vous êtes déjà connecté
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={handleGoToDashboard}
                                className="rounded-md bg-green-700 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-green-600"
                            >
                                Accéder à mon espace
                            </button>
                            <button
                                onClick={handleLogout}
                                className="rounded-md border border-red-500 bg-white px-6 py-3 text-lg font-semibold text-red-600 hover:bg-red-50"
                            >
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}