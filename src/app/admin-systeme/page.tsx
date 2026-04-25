"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SystemAdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        const { data } = await supabase.from('membres').select('*').order('created_at', { ascending: false });
        setUsers(data || []);
        setLoading(false);
    }

    async function updateRole(id: string, newRole: string) {
        const { error } = await supabase.from('membres').update({ role: newRole }).eq('id', id);
        if (error) alert(error.message);
        else loadUsers();
    }

    return (
        <main className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto bg-white border-4 border-black rounded-3xl p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                <header className="border-b-4 border-black pb-6 mb-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin-central" className="bg-black text-white p-2 rounded-lg border-2 border-black hover:bg-[#146332] transition-colors">
                            🏠
                        </Link>
                        <h1 className="text-3xl font-black text-[#146332] uppercase italic">Administration Système</h1>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/70 mt-2">Gouvernance Technique & Sécurité</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 border-4 border-black rounded-2xl bg-[#f0fdf4]">
                        <h2 className="font-black uppercase text-sm mb-4">État des Services</h2>
                        <div className="space-y-2 text-xs font-bold">
                            <div className="flex justify-between"><span>Supabase Auth</span> <span className="text-green-600">OPÉRATIONNEL</span></div>
                            <div className="flex justify-between"><span>Storage Buckets</span> <span className="text-green-600">OPÉRATIONNEL</span></div>
                            <div className="flex justify-between"><span>Database API</span> <span className="text-green-600">OPÉRATIONNEL</span></div>
                        </div>
                    </div>

                    <div className="p-6 border-4 border-black rounded-2xl bg-white md:col-span-2">
                        <h2 className="font-black uppercase text-sm mb-4 italic tracking-tighter text-black">Attribution des Rôles</h2>
                        <div className="space-y-4">
                            {users.map(u => (
                                <div key={u.id} className="flex justify-between items-center p-3 border-2 border-black rounded-xl">
                                    <div>
                                        <p className="text-xs font-black uppercase text-black">{u.nom_complet}</p>
                                        <p className="text-[10px] text-black/80 font-black italic">{u.email}</p>
                                    </div>
                                    <select
                                        value={u.role}
                                        onChange={(e) => updateRole(u.id, e.target.value)}
                                        className="text-[10px] font-black border-2 border-black rounded-lg p-1"
                                    >
                                        <option value="membre">Membre</option>
                                        <option value="tresorier">Trésorier</option>
                                        <option value="chef_generation">Chef Génération</option>
                                        <option value="baliou_padra">Bureau Central</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}