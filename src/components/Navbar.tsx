"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [session, setSession] = useState<any>(null);

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
            }
        };
        getSessionAndRole();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) setRole(null);
        });

        return () => subscription.unsubscribe();
    }, [pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="bg-[#146332] text-white shadow-2xl sticky top-0 z-50 border-b-4 border-black font-black">
            <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">

                {/* LOGO */}
                <Link href="/" className="text-xl uppercase italic">
                    BALIOU <span className="text-[#39ff14]">PADRA</span>
                </Link>

                <div className="flex items-center space-x-2 text-[9px] md:text-[10px] uppercase">

                    {/* --- ACCÈS PUBLICS (Tout le monde) --- */}
                    <Link href="/inscription" className={`px-2 py-1 ${isActive('/inscription') ? 'text-[#39ff14] underline' : ''}`}>inscription</Link>
                    <Link href="/actualites" className={`px-2 py-1 ${isActive('/actualites') ? 'text-[#39ff14] underline' : ''}`}>Actualités</Link>
                    <Link href="/histoire" className={`px-2 py-1 ${isActive('/histoire') ? 'text-[#39ff14] underline' : ''}`}>Histoire</Link>
                    <Link href="/bibliotheque" className={`px-2 py-1 ${isActive('/bibliotheque') ? 'text-[#39ff14] underline' : ''}`}>Bibliothèque</Link>

                    {session && (
                        <>
                            {/* --- ÉTAT CIVIL : Uniquement Agents et Superadmin --- */}
                            {(role === 'agent_civil' || role === 'super_admin') && (
                                <Link href="/etat-civil" className="bg-orange-600 px-3 py-2 rounded-lg border-2 border-white animate-pulse text-white">
                                    État Civil
                                </Link>
                            )}

                            {/* --- EMPLOI & STATS : Uniquement RH, Baliou Padra et Superadmin --- */}
                            {(role === 'agent_rh' || role === 'baliou_padra' || role === 'super_admin') && (
                                <Link href="/annuaire" className="bg-blue-600 px-3 py-2 rounded-lg border-2 border-white text-white">
                                    Emploi & Stats
                                </Link>
                            )}

                            {/* --- FINANCES : Uniquement Baliou Padra, Chefs/Trésoriers et Superadmin --- */}
                            {(role === 'baliou_padra' || role === 'chef_gen' || role === 'tresorier_gen' || role === 'super_admin') && (
                                <Link href="/finances" className={`px-2 py-1 ${isActive('/finances') ? 'text-[#39ff14] underline' : ''}`}>
                                    Finances
                                </Link>
                            )}

                            {/* --- MA GÉNÉRATION : Uniquement Responsables de Gen --- */}
                            {(role === 'chef_gen' || role === 'tresorier_gen') && (
                                <Link href="/generation" className="text-yellow-400 px-2 py-1">Ma Gen</Link>
                            )}

                            {/* --- ROOT : Uniquement Super Admin --- */}
                            {role === 'super_admin' && (
                                <Link href="/admin-systeme" className="bg-red-600 px-3 py-1 rounded border-2 border-white">Root</Link>
                            )}

                            {/* --- PROFIL (Caché pour les agents techniques pour plus de clarté) --- */}
                            {role !== 'agent_civil' && role !== 'agent_rh' && (
                                <Link href="/profil" className="border-2 border-[#39ff14] text-[#39ff14] px-3 py-2 rounded-lg">Mon Profil</Link>
                            )}

                            <button onClick={handleLogout} className="text-red-400 font-black ml-2 uppercase">Sortir</button>
                        </>
                    )}

                    {!session && (
                        <Link href="/login" className="border-2 border-white px-4 py-2 rounded-lg">Connexion</Link>
                    )}
                </div>
            </div>
        </nav>
    );
}