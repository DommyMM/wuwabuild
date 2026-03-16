import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center px-4 text-center space-y-4 font-plus-jakarta">
            <h1 className="text-2xl sm:text-5xl font-bold text-accent/80 leading-tight">
                How did you even end up here?
            </h1>

            <img
                src="/images/roverwhat.webp"
                alt="Rover looking confused"
                className="object-cover rounded-2xl"
                fetchPriority="high"
            />

            <Link
                href="/"
                className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-accent text-accent hover:bg-accent hover:text-black transition-colors duration-150"
            >
                Go home
            </Link>
        </div>
    );
}
