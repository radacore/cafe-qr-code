import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login, register } from '@/routes';

type WelcomeProps = {
    canRegister?: boolean;
    sampleScanUrl?: string | null;
};

type SharedProps = {
    auth: {
        user?: {
            id: number;
        } | null;
    };
};

export default function Welcome({ canRegister = true, sampleScanUrl = null }: WelcomeProps) {
    const { auth } = usePage<SharedProps>().props;

    return (
        <>
            <Head title="Cafe QR Ordering" />

            <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
                    <header className="selia-surface flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
                        <div>
                            <p className="selia-chip">Cafe Ordering System</p>
                            <h1 className="selia-title mt-2 text-3xl md:text-4xl">
                                Scan QR, pilih menu, kirim pesanan
                            </h1>
                        </div>

                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                                    >
                                        Log in
                                    </Link>
                                    {canRegister ? (
                                        <Link
                                            href={register()}
                                            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-95"
                                        >
                                            Register
                                        </Link>
                                    ) : null}
                                </>
                            )}
                        </nav>
                    </header>

                    <section className="selia-surface grid gap-5 p-6 md:grid-cols-2 md:p-8">
                        <div>
                            <h2 className="text-2xl font-semibold text-foreground">
                                Pengalaman order cepat tanpa login
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Setiap meja memiliki QR unik. Customer cukup scan lalu langsung bisa
                                pilih makanan/minuman, atur jumlah, dan kirim order ke kasir.
                            </p>
                            {sampleScanUrl ? (
                                <Link
                                    href={sampleScanUrl}
                                    className="mt-5 inline-flex items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
                                >
                                    Coba flow order sekarang
                                </Link>
                            ) : (
                                <p className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                                    Seeder belum dijalankan. Jalankan `php artisan migrate:fresh --seed`
                                    untuk membuat data meja dan menu.
                                </p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
                            <p className="text-sm font-semibold text-foreground">Alur pengguna</p>
                            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                                <li>1. Scan QR di meja.</li>
                                <li>2. Pilih menu dan jumlah pesanan.</li>
                                <li>3. Isi nama/catatan (opsional).</li>
                                <li>4. Submit order dan tunggu pelayan datang.</li>
                            </ol>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
