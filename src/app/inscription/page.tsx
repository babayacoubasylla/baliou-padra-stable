import Link from "next/link";

export default function HomePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
            <div className="max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight text-green-900 sm:text-6xl">
                    FOCYS PLATFORM
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                    Bienvenue sur l'espace numérique officiel des membres de la
                    Fondation Cheikh Yacouba Sylla.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link
                        href="/inscription"
                        className="rounded-md bg-green-700 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    >
                        S'inscrire
                    </Link>
                    <button className="text-lg font-semibold leading-6 text-gray-900">
                        Se connecter <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
        </main>
    );
}