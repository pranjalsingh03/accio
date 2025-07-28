"use client";

import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Header() {
    const router = useRouter();
    const { data: session } = useSession();

    const getUserInitial = () => {
        if (session?.user?.name) {
            return session.user.name.charAt(0).toUpperCase();
        } else if (session?.user?.email) {
            return session.user.email.charAt(0).toUpperCase();
        }
        return "?";
    };

    return (
        <header className="flex items-center justify-between w-full md:w-auto py-4 md:py-0 md:gap-10 mt-2">
            <div className="flex items-center gap-4">
                {/* <h1 className="text-2xl font-bold">Accio</h1> */}
            </div>
            <div className="flex items-center gap-4 mr-12">
                {session ? (
                    <>
                        <button className="bg-black text-white px-4 py-2 rounded-md" onClick={() => signOut()}>Sign Out</button> 
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <p className="text-sm text-black font-semibold">{getUserInitial()}</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <button className="bg-black text-white px-4 py-2 rounded-md" onClick={() => router.push("/register")}>Sign Up</button>
                        <button className="bg-black text-white px-4 py-2 rounded-md" onClick={() => router.push("/login")}>Login</button>
                    </>
                )}
            </div>
        </header>
    );
}