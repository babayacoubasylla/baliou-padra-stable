"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardHub() {
    const [status, setStatus] = useState("Vérification de la session...");
    const router = useRouter();

    useEffect(() => {
        const checkConnection = async () => {
            // 1. Récupérer l'utilisateur connecté
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                setStatus("Erreur Auth : Non connecté ou session expirée.");
                router.push('/login');
                return;
            }

            setStatus(`Connecté en tant que ${user.email}. Recherche du profil...`);

            // 2. Chercher le profil par user_id
            const { data: p, error: dbError } = await supabase
                .from('membres')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (dbError) {
                setStatus(`Erreur Base de données : ${dbError.message}`);
                return;
            }

            if (!p) {
                // 3. Si non trouvé par ID, on tente par EMAIL (au cas où)
                setStatus("ID non trouvé, tentative par email...");
                const { data: pByEmail } = await supabase
                    .from('membres')
                    .select('*')
                    .eq('email', user.email)
                    .maybeSingle();

                if (pByEmail) {
                    setStatus("Profil trouvé par email ! Mise à jour du lien...");
                    await supabase.from('membres').update({ user_id: user.id }).eq('id', pByEmail.id);
                    window.location.reload();
                    return;
                }

                setStatus(`ERREUR : Aucun profil trouvé pour l'email ${user.email} dans la table membres.`);
            } else {
                // REDIRECTION SELON ROLE
                setStatus(`Profil trouvé ! Rôle : ${p.role}. Redirection...`);
                if (p.role === 'agent_civil') router.push('/etat-civil');
                else if (p.role === 'super_admin') router.push('/admin-systeme');
                else if (p.role === 'baliou_padra') router.push('/admin-central');
                else router.push('/profil');
            }
        };

        checkConnection();
    }, [router]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center font-sans">
            <div className="bg-slate-50 border-4 border-black p-10 rounded-[2.5rem] shadow-2xl max-w-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mx-auto mb-6"></div>
                <h1 className="text-xl font-black uppercase mb-4">Analyse du Compte</h1>
                <p className="font-bold text-gray-600 bg-white p-4 border-2 border-black rounded-xl">
                    {status}
                </p>
                <button onClick={() => window.location.href = '/login'} className="mt-8 text-xs font-black underline uppercase">Retour au login</button>
            </div>
        </div>
    );
}