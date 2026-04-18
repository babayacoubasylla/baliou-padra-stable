export interface Membre {
    id: string;
    focys_id: string; // Ex: #FYS-2025-001
    nom_complet: string;
    telephone: string;
    generation: 1 | 2 | 3 | 4;
    section: string;
    role: 'membre' | 'tresorier' | 'admin';
    est_verifie: boolean;
}