"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = 'super_admin' | 'responsable_bd' | 'baliou_padra';

interface Membre {
    id: number;
    user_id: string;
    nom_complet: string;
    email: string;
    role: string;
    sexe: string;
    generation: string;
    ville_residence: string;
    telephone: string;
    statut?: string;
    created_at: string;
    [key: string]: any;
}

// ─── Permissions ──────────────────────────────────────────────────────────────
const PERMISSIONS: Record<string, { read: boolean; edit: boolean; delete: boolean; export: boolean }> = {
    super_admin: { read: true, edit: true, delete: true, export: true },
    responsable_bd: { read: true, edit: true, delete: true, export: true },
    baliou_padra: { read: true, edit: false, delete: false, export: true },
};

// ─── Colonnes affichées ───────────────────────────────────────────────────────
const COLUMNS = [
    { key: 'nom_complet', label: 'Nom Complet' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rôle' },
    { key: 'sexe', label: 'Sexe' },
    { key: 'generation', label: 'Génération' },
    { key: 'ville_residence', label: 'Ville' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'statut', label: 'Statut' },
    { key: 'created_at', label: 'Inscrit le' },
];

const ROLES_OPTIONS = [
    { value: 'membre', label: 'Membre' },
    { value: 'baliou_padra', label: 'Bureau Central' },
    { value: 'agent_civil', label: 'Agent État Civil' },
    { value: 'agent_rh', label: 'Agent RH' },
    { value: 'responsable_bd', label: 'Responsable BD' },
    { value: 'chef_gen', label: 'Chef Génération' },
    { value: 'tresorier', label: 'Trésorier' },
    { value: 'comite_com_gen', label: 'Comité Com. Gén.' },
    { value: 'comite_com_central', label: 'Comité Com. Central' },
    { value: 'super_admin', label: 'Super Admin' },
];

// ─── Composant principal ──────────────────────────────────────────────────────
export default function GestionBaseDonnees() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [membres, setMembres] = useState<Membre[]>([]);
    const [filtered, setFiltered] = useState<Membre[]>([]);
    const [search, setSearch] = useState('');
    const [filterGen, setFilterGen] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterSexe, setFilterSexe] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<Membre>>({});
    const [stats, setStats] = useState({ total: 0, hommes: 0, femmes: 0, actifs: 0 });
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [generations, setGenerations] = useState<string[]>([]);

    // ── Auth ──────────────────────────────────────────────────────────────────
    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/login'); return; }

        const { data: profile } = await supabase
            .from('membres').select('role, nom_complet, email')
            .eq('user_id', session.user.id).maybeSingle();

        const role = profile?.role;
        if (!role || !PERMISSIONS[role]) { router.push('/'); return; }

        setUserRole(role as UserRole);
        setCurrentUser({ ...session.user, nom_complet: profile?.nom_complet });
        await loadMembres();
        setLoading(false);
    };

    // ── Chargement ────────────────────────────────────────────────────────────
    const loadMembres = async () => {
        const { data, error } = await supabase
            .from('membres').select('*').order('created_at', { ascending: false });
        if (error) { showToast('Erreur chargement: ' + error.message, 'err'); return; }
        const list = data || [];
        setMembres(list);
        setFiltered(list);
        // stats
        setStats({
            total: list.length,
            hommes: list.filter(m => m.sexe === 'M').length,
            femmes: list.filter(m => m.sexe === 'F').length,
            actifs: list.filter(m => m.statut === 'valide' || !m.statut).length,
        });
        // générations uniques
        const gens = [...new Set(list.map(m => m.generation).filter(Boolean))] as string[];
        setGenerations(gens.sort());
    };

    // ── Filtres ───────────────────────────────────────────────────────────────
    useEffect(() => {
        let result = [...membres];
        if (search) result = result.filter(m =>
            m.nom_complet?.toLowerCase().includes(search.toLowerCase()) ||
            m.email?.toLowerCase().includes(search.toLowerCase()) ||
            m.telephone?.includes(search)
        );
        if (filterGen) result = result.filter(m => m.generation === filterGen);
        if (filterRole) result = result.filter(m => m.role === filterRole);
        if (filterSexe) result = result.filter(m => m.sexe === filterSexe);
        setFiltered(result);
    }, [search, filterGen, filterRole, filterSexe, membres]);

    // ── Edition ───────────────────────────────────────────────────────────────
    const startEdit = (m: Membre) => { setEditingId(m.id); setEditData({ ...m }); };
    const cancelEdit = () => { setEditingId(null); setEditData({}); };

    const saveEdit = async () => {
        if (!editingId) return;
        const { error } = await supabase.from('membres').update(editData).eq('id', editingId);
        if (error) { showToast('Erreur: ' + error.message, 'err'); return; }
        showToast('Membre mis à jour ✓', 'ok');
        setEditingId(null);
        await loadMembres();
    };

    // ── Suppression ───────────────────────────────────────────────────────────
    const confirmDelete = async (id: number) => {
        const { error } = await supabase.from('membres').delete().eq('id', id);
        if (error) { showToast('Erreur suppression: ' + error.message, 'err'); return; }
        showToast('Membre supprimé', 'ok');
        setDeleteConfirm(null);
        await loadMembres();
    };

    // ── Export CSV ────────────────────────────────────────────────────────────
    const exportCSV = () => {
        const headers = COLUMNS.map(c => c.label).join(',');
        const rows = filtered.map(m =>
            COLUMNS.map(c => `"${(m[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `membres_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        showToast('Export CSV téléchargé ✓', 'ok');
    };

    // ── Toast ─────────────────────────────────────────────────────────────────
    const showToast = (msg: string, type: 'ok' | 'err') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Déconnexion ───────────────────────────────────────────────────────────
    const logout = async () => { await supabase.auth.signOut(); router.push('/login'); };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#39ff14] border-t-transparent mx-auto"></div>
                <p className="mt-4 text-[#39ff14] font-black uppercase tracking-widest text-xs">Chargement...</p>
            </div>
        </div>
    );

    const perms = PERMISSIONS[userRole!];

    return (
        <div className="min-h-screen bg-[#0d1410] text-white font-mono">

            {/* ── Toast ── */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl font-black text-sm border-2 shadow-2xl transition-all
          ${toast.type === 'ok' ? 'bg-[#39ff14] text-black border-black' : 'bg-red-500 text-white border-red-300'}`}>
                    {toast.msg}
                </div>
            )}

            {/* ── Modal suppression ── */}
            {deleteConfirm !== null && (
                <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
                    <div className="bg-[#1a2e1a] border-4 border-red-500 rounded-3xl p-8 max-w-sm w-full text-center">
                        <p className="text-4xl mb-4">⚠️</p>
                        <h3 className="font-black text-xl uppercase mb-2 text-red-400">Confirmer la suppression</h3>
                        <p className="text-sm text-gray-400 mb-6">Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-black uppercase text-xs hover:bg-gray-600 transition-all">
                                Annuler
                            </button>
                            <button onClick={() => confirmDelete(deleteConfirm)}
                                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-xs hover:bg-red-500 transition-all">
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <header className="bg-[#0a0f0a] border-b-2 border-[#39ff14]/30 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#39ff14] rounded-xl flex items-center justify-center">
                        <span className="text-black font-black text-lg">🗄️</span>
                    </div>
                    <div>
                        <h1 className="font-black text-[#39ff14] uppercase tracking-tight text-lg leading-none">
                            Gestion Base de Données
                        </h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                            {userRole === 'super_admin' ? '⚡ Super Admin' :
                                userRole === 'responsable_bd' ? '🔧 Responsable BD' : '👁️ Lecture seule'}
                            {' · '}{currentUser?.nom_complet || currentUser?.email}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {perms.export && (
                        <button onClick={exportCSV}
                            className="bg-[#39ff14] text-black px-4 py-2 rounded-xl font-black text-xs uppercase hover:opacity-90 transition-all border-2 border-[#39ff14]">
                            ⬇ Export CSV
                        </button>
                    )}
                    <button onClick={logout}
                        className="bg-transparent text-gray-400 px-4 py-2 rounded-xl font-black text-xs uppercase hover:text-red-400 transition-all border-2 border-gray-700 hover:border-red-400">
                        Sortir
                    </button>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto p-4 md:p-8">

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Membres', value: stats.total, icon: '👥', color: 'border-[#39ff14]' },
                        { label: 'Hommes', value: stats.hommes, icon: '♂', color: 'border-blue-500' },
                        { label: 'Femmes', value: stats.femmes, icon: '♀', color: 'border-pink-500' },
                        { label: 'Résultats', value: filtered.length, icon: '🔍', color: 'border-yellow-500' },
                    ].map(s => (
                        <div key={s.label} className={`bg-[#111a11] border-2 ${s.color} rounded-2xl p-4`}>
                            <p className="text-3xl font-black">{s.value}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{s.icon} {s.label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Filtres & Recherche ── */}
                <div className="bg-[#111a11] border-2 border-[#1e3a1e] rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
                    <input
                        type="text" placeholder="🔍 Rechercher par nom, email, téléphone..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="flex-1 min-w-[200px] bg-[#0a0f0a] border-2 border-[#1e3a1e] rounded-xl px-4 py-2 text-sm font-bold text-white placeholder-gray-600 outline-none focus:border-[#39ff14] transition-all"
                    />
                    <select value={filterGen} onChange={e => setFilterGen(e.target.value)}
                        className="bg-[#0a0f0a] border-2 border-[#1e3a1e] rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#39ff14] transition-all">
                        <option value="">Toutes générations</option>
                        {generations.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                        className="bg-[#0a0f0a] border-2 border-[#1e3a1e] rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#39ff14] transition-all">
                        <option value="">Tous les rôles</option>
                        {ROLES_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <select value={filterSexe} onChange={e => setFilterSexe(e.target.value)}
                        className="bg-[#0a0f0a] border-2 border-[#1e3a1e] rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#39ff14] transition-all">
                        <option value="">Tous</option>
                        <option value="M">Hommes</option>
                        <option value="F">Femmes</option>
                    </select>
                    {(search || filterGen || filterRole || filterSexe) && (
                        <button onClick={() => { setSearch(''); setFilterGen(''); setFilterRole(''); setFilterSexe(''); }}
                            className="text-xs font-black text-red-400 uppercase hover:text-red-300 transition-all border-2 border-red-400/30 px-3 py-2 rounded-xl hover:border-red-400">
                            ✕ Effacer
                        </button>
                    )}
                </div>

                {/* ── Table ── */}
                <div className="bg-[#111a11] border-2 border-[#1e3a1e] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#0a0f0a] border-b-2 border-[#1e3a1e]">
                                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#39ff14]">#</th>
                                    {COLUMNS.map(c => (
                                        <th key={c.key} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                            {c.label}
                                        </th>
                                    ))}
                                    {(perms.edit || perms.delete) && (
                                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr><td colSpan={COLUMNS.length + 2} className="text-center py-12 text-gray-600 font-black uppercase text-xs">
                                        Aucun résultat
                                    </td></tr>
                                )}
                                {filtered.map((m, idx) => (
                                    <tr key={m.id} className="border-b border-[#1e3a1e] hover:bg-[#0d1f0d] transition-all">
                                        <td className="px-4 py-3 text-xs text-gray-600 font-black">{idx + 1}</td>

                                        {editingId === m.id ? (
                                            // ── Mode édition ──
                                            <>
                                                <td className="px-2 py-2">
                                                    <input value={editData.nom_complet || ''} onChange={e => setEditData({ ...editData, nom_complet: e.target.value })}
                                                        className="w-full bg-[#0a0f0a] border border-[#39ff14] rounded-lg px-2 py-1 text-xs text-white outline-none" />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })}
                                                        className="w-full bg-[#0a0f0a] border border-[#39ff14] rounded-lg px-2 py-1 text-xs text-white outline-none" />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <select value={editData.role || ''} onChange={e => setEditData({ ...editData, role: e.target.value })}
                                                        className="w-full bg-[#0a0f0a] border border-[#39ff14] rounded-lg px-2 py-1 text-xs text-white outline-none">
                                                        {ROLES_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <select value={editData.sexe || ''} onChange={e => setEditData({ ...editData, sexe: e.target.value })}
                                                        className="w-full bg-[#0a0f0a] border border-[#39ff14] rounded-lg px-2 py-1 text-xs text-white outline-none">
                                                        <option value="M">M</option>
                                                        <option value="F">F</option>
                                                    </select>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input value={editData.generation || ''} onChange={e => setEditData({ ...editData, generation: e.target.value })}
                                                        className="w-full bg-[#0a0f0a] border border-[#39ff14] rounded-lg px-2 py-1 text-xs text-white outline-none" />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input value={editData.ville_residence || ''} onChange={e => setEditData({ ...editData, ville_residence: e.target.value })}
                                                        className="w-full bg-[#0a0f0a] border border-[#39ff14] rounded-lg px-2 py-1 text-xs text-white outline-none" />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input value={editData.telephone || ''} onChange={e => setEditData({ ...editData, telephone: e.target.value })}
                                                        className="w-full bg-[#0a0f0a] border border-[#39ff14] rounded-lg px-2 py-1 text-xs text-white outline-none" />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <select value={editData.statut || ''} onChange={e => setEditData({ ...editData, statut: e.target.value })}
                                                        className="w-full bg-[#0a0f0a] border border-[#39ff14] rounded-lg px-2 py-1 text-xs text-white outline-none">
                                                        <option value="valide">Valide</option>
                                                        <option value="suspendu">Suspendu</option>
                                                        <option value="inactif">Inactif</option>
                                                    </select>
                                                </td>
                                                <td className="px-2 py-2 text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                                                <td className="px-2 py-2">
                                                    <div className="flex gap-2">
                                                        <button onClick={saveEdit} className="bg-[#39ff14] text-black px-3 py-1 rounded-lg text-xs font-black uppercase hover:opacity-90">✓</button>
                                                        <button onClick={cancelEdit} className="bg-gray-700 text-white px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-gray-600">✕</button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            // ── Mode lecture ──
                                            <>
                                                <td className="px-4 py-3 font-black text-white text-xs whitespace-nowrap">{m.nom_complet}</td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">{m.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-[#39ff14]/10 text-[#39ff14] whitespace-nowrap">
                                                        {ROLES_OPTIONS.find(r => r.value === m.role)?.label || m.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-center">{m.sexe === 'M' ? '♂' : '♀'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">{m.generation}</td>
                                                <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">{m.ville_residence}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400">{m.telephone}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg
                            ${m.statut === 'valide' || !m.statut ? 'bg-green-900/40 text-green-400' :
                                                            m.statut === 'suspendu' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'}`}>
                                                        {m.statut || 'valide'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                    {new Date(m.created_at).toLocaleDateString('fr-FR')}
                                                </td>
                                                {(perms.edit || perms.delete) && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            {perms.edit && (
                                                                <button onClick={() => startEdit(m)}
                                                                    className="bg-blue-900/50 text-blue-300 border border-blue-700 px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-blue-800/50 transition-all whitespace-nowrap">
                                                                    ✏ Éditer
                                                                </button>
                                                            )}
                                                            {perms.delete && (
                                                                <button onClick={() => setDeleteConfirm(m.id)}
                                                                    className="bg-red-900/40 text-red-400 border border-red-800 px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-red-900/60 transition-all">
                                                                    🗑
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer table */}
                    <div className="px-6 py-3 border-t border-[#1e3a1e] flex justify-between items-center">
                        <p className="text-[10px] text-gray-600 uppercase font-black">
                            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {membres.length} membres
                        </p>
                        <p className="text-[10px] text-gray-700 uppercase font-black">
                            {!perms.edit && !perms.delete ? '👁 Mode lecture seule' : ''}
                        </p>
                    </div>
                </div>

                {/* ── Légende permissions ── */}
                <div className="mt-6 bg-[#111a11] border border-[#1e3a1e] rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Vos permissions</p>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { label: 'Lecture', active: perms.read, icon: '👁' },
                            { label: 'Édition', active: perms.edit, icon: '✏' },
                            { label: 'Suppression', active: perms.delete, icon: '🗑' },
                            { label: 'Export CSV', active: perms.export, icon: '⬇' },
                        ].map(p => (
                            <span key={p.label} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border
                ${p.active ? 'bg-[#39ff14]/10 text-[#39ff14] border-[#39ff14]/30' : 'bg-gray-900 text-gray-600 border-gray-800'}`}>
                                {p.icon} {p.label} {p.active ? '✓' : '✗'}
                            </span>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}