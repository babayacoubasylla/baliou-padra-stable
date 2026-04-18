"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * COMPOSANT : NAVBAR (Barre de navigation) - BALIOU PADRA
 * Centralise la navigation sur toute la plateforme.
 * Les boutons apparaissent dynamiquement selon le rôle de l'utilisateur.
 */
export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);

    // Récupération de la session Supabase et du rôle utilisateur
    useEffect(() => {
        const getSessionAndRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            if (session) {
                const { data: p } = await supabase
                    .from('membres')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .maybeSingle();
                setRole(p?.role || 'membre');
            } else {
                setRole(null);
            }
        };

        getSessionAndRole();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) setRole(null);
            else {
                // Recharger le rôle quand la session change
                supabase
                    .from('membres')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .maybeSingle()
                    .then(({ data }) => setRole(data?.role || 'membre'));
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Fonction pour vérifier si un lien est actif afin de changer sa couleur
    const isActive = (path: string) => pathname === path;

    // Déconnexion
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <nav className="bg-green-900 text-white shadow-2xl sticky top-0 z-50 border-b-2 md:border-b-4 border-green-700">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center py-2 md:h-20">

                    {/* LOGO DU PROJET : BALIOU PADRA - Version responsive */}
                    <div className="flex-shrink-0 mb-2 md:mb-0">
                        <Link href="/" className="flex items-center space-x-2 group">
                            <span className="font-black text-xl md:text-2xl tracking-tighter group-hover:scale-105 transition-transform uppercase">
                                BALIOU <span className="text-green-400">PADRA</span>
                            </span>
                        </Link>
                    </div>

                    {/* MENU DE NAVIGATION - Scrollable horizontalement sur mobile */}
                    <div className="flex items-center space-x-1 md:space-x-6 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar justify-start md:justify-center">

                        {/* INSCRIPTION - Visible par tous */}
                        <Link
                            href="/"
                            className={`whitespace-nowrap px-2 md:px-3 py-1 md:py-2 rounded-lg text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all ${isActive("/") ? "bg-green-800 text-green-400 shadow-inner" : "hover:text-green-400"
                                }`}
                        >
                            Inscription
                        </Link>

                        {/* ANNUAIRE - Visible par tous */}
                        <Link
                            href="/annuaire"
                            className={`whitespace-nowrap px-2 md:px-3 py-1 md:py-2 rounded-lg text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all ${isActive("/annuaire") ? "bg-green-800 text-green-400 shadow-inner" : "hover:text-green-400"
                                }`}
                        >
                            Annuaire
                        </Link>

                        {/* ACTUALITÉS - Visible par tous */}
                        <Link
                            href="/actualites"
                            className={`whitespace-nowrap px-2 md:px-3 py-1 md:py-2 rounded-lg text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all ${isActive("/actualites") ? "bg-green-800 text-green-400 shadow-inner" : "hover:text-green-400"
                                }`}
                        >
                            Actualités
                        </Link>

                        {/* HISTOIRE - Visible par tous */}
                        <Link
                            href="/histoire"
                            className={`whitespace-nowrap px-2 py-1 md:py-2 text-[9px] md:text-[10px] font-black uppercase ${pathname === '/histoire' ? 'text-blue-400' : 'text-white hover:text-blue-300'}`}
                        >
                            Histoire
                        </Link>

                        {/* BIBLIOTHÈQUE - Visible par tous */}
                        <Link
                            href="/bibliotheque"
                            className={`whitespace-nowrap px-2 py-1 md:py-2 text-[9px] md:text-[10px] font-black uppercase ${pathname === '/bibliotheque' ? 'text-yellow-400' : 'text-white hover:text-yellow-300'}`}
                        >
                            Bibliothèque
                        </Link>

                        {/* RÉSEAU PRO - Visible par tous */}
                        <Link
                            href="/annuaire-pro"
                            className={`whitespace-nowrap px-2 py-1 md:py-2 text-[9px] md:text-[10px] font-black uppercase ${pathname === '/annuaire-pro' ? 'text-yellow-400' : 'text-white hover:text-yellow-300'}`}
                        >
                            Réseau Pro
                        </Link>

                        {/* FINANCES - Visible par tous les connectés */}
                        {session && (
                            <Link
                                href="/finances"
                                className={`whitespace-nowrap px-2 md:px-3 py-1 md:py-2 rounded-lg text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all ${isActive("/finances") ? "bg-green-800 text-green-400 shadow-inner" : "hover:text-green-400"
                                    }`}
                            >
                                Finances
                            </Link>
                        )}

                        {/* MA GÉNÉRATION - Uniquement pour tresorier_gen, chef_gen, adjoint_gen et baliou_padra */}
                        {session && (role === 'tresorier_gen' || role === 'chef_gen' || role === 'adjoint_gen' || role === 'baliou_padra') && (
                            <Link
                                href="/generation"
                                className={`whitespace-nowrap px-2 md:px-3 py-1 md:py-2 rounded-lg text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all text-yellow-400 ${isActive("/generation") ? "bg-green-800 shadow-inner" : "hover:text-yellow-300"
                                    }`}
                            >
                                Ma Génération
                            </Link>
                        )}

                        {/* BUREAU CENTRAL - Uniquement pour baliou_padra */}
                        {session && role === 'baliou_padra' && (
                            <Link
                                href="/admin-central"
                                className={`whitespace-nowrap px-2 md:px-3 py-1 md:py-2 rounded-lg text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all text-blue-400 ${isActive("/admin-central") ? "bg-green-800 shadow-inner" : "hover:text-blue-300"
                                    }`}
                            >
                                Bureau Central
                            </Link>
                        )}

                        {/* SYSTÈME ROOT - Uniquement pour super_admin */}
                        {session && role === 'super_admin' && (
                            <Link
                                href="/admin-systeme"
                                className="whitespace-nowrap px-2 md:px-3 py-1 md:py-2 rounded-lg text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all bg-red-600 text-white border-2 border-red-400 animate-pulse hover:bg-red-700"
                            >
                                🔧 ROOT
                            </Link>
                        )}

                        {/* CONNEXION / MON ESPACE */}
                        {session ? (
                            <>
                                <Link
                                    href="/profil"
                                    className={`whitespace-nowrap ml-1 md:ml-2 px-2 md:px-4 py-1 md:py-2 rounded-xl text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all bg-black text-green-400 border-2 border-white ${isActive("/profil") ? "ring-2 ring-green-400" : "hover:scale-105"
                                        }`}
                                >
                                    Mon Profil
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="whitespace-nowrap ml-1 md:ml-2 px-2 md:px-4 py-1 md:py-2 rounded-xl text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white hover:scale-105"
                                >
                                    Déconnexion
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className={`whitespace-nowrap ml-1 md:ml-2 px-2 md:px-4 py-1 md:py-2 rounded-xl text-[9px] md:text-[10px] lg:text-sm font-black uppercase tracking-widest transition-all border-2 ${isActive("/login")
                                    ? "bg-white text-green-900 border-white shadow-lg"
                                    : "border-green-400 text-green-400 hover:bg-green-400 hover:text-green-900 hover:scale-105"
                                    }`}
                            >
                                Connexion
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Style pour cacher la scrollbar sur mobile tout en gardant la fonctionnalité */}
            <style jsx>{`
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </nav>
    );
}