import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialisation du client Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = process.env.MISTRAL_API_KEY;
let client: Mistral | null = null;

if (apiKey) {
    client = new Mistral({ apiKey: apiKey });
}

export async function POST(req: Request) {
    try {
        if (!client) {
            return NextResponse.json(
                { error: "L'IA n'est pas configurée. Vérifiez la clé MISTRAL_API_KEY." },
                { status: 503 }
            );
        }

        const { message } = await req.json();

        if (!message || message.trim() === "") {
            return NextResponse.json({ error: "Veuillez poser une question." }, { status: 400 });
        }

        // 1. Récupération du contexte (Archives, Evenements)
        // Utilisation de blocs séparés pour éviter qu'une table manquante bloque tout
        const { data: archives } = await supabase.from('archives').select('contenu, titre').limit(5);
        const { data: evenements } = await supabase.from('evenements').select('titre, description, date_evenement').limit(3);

        // Construction du contexte pour l'IA
        let contexte = "Tu es l'assistant de la COMMUNAUTÉ Cheikh Yacouba Sylla (BALIOU PADRA).\n";

        if (archives && archives.length > 0) {
            contexte += "\n📜 INFOS HISTORIQUES :\n";
            archives.forEach(a => contexte += `- ${a.titre}: ${a.contenu}\n`);
        }

        if (evenements && evenements.length > 0) {
            contexte += "\n📅 AGENDA RECENT :\n";
            evenements.forEach(e => contexte += `- ${e.titre}: ${e.description} (Date: ${e.date_evenement})\n`);
        }

        // 2. Appel à Mistral AI
        const chatResponse = await client.chat.complete({
            model: 'open-mistral-7b',
            messages: [
                {
                    role: 'system',
                    content: `${contexte}
                    
                    CONSIGNES :
                    - Ton nom est "Baliou Assistant".
                    - Réponds toujours en Français.
                    - Ton ton doit être respectueux, fraternel (tu peux tutoyer les membres) et spirituel.
                    - Utilise tes connaissances générales sur Cheikh Yacouba Sylla si les archives sont insuffisantes.
                    - Si une question est trop complexe, suggère de contacter le Bureau Central.`
                },
                { role: 'user', content: message },
            ],
            temperature: 0.7,
        });

        const answer = chatResponse.choices?.[0]?.message?.content || "Désolé, je ne trouve pas la réponse.";

        // 3. Enregistrement de la conversation pour l'admin (Table à créer si besoin)
        try {
            await supabase.from('conversations_ia').insert({
                question: message,
                reponse: answer
            });
        } catch (e) {
            console.log("Note: Table conversations_ia non trouvée, ignorez si non créée.");
        }

        return NextResponse.json({ text: answer });

    } catch (error: any) {
        console.error("ERREUR API CHAT :", error.message);
        return NextResponse.json(
            { error: "L'assistant est indisponible.", details: error.message },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({ status: "Assistant Baliou Padra actif" });
}