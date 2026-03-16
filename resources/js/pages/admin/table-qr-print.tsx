import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Props = {
    schemaReady?: boolean;
    schemaMessage?: string | null;
    qrImageUrl: string | null;
    table: {
        id: number;
        code: string;
        name: string;
        areaType: 'indoor' | 'outdoor';
        qrToken: string;
        scanUrl: string;
    } | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Admin Management', href: '/admin/management/categories' },
    { title: 'Kelola Meja', href: '/admin/management/tables' },
    { title: 'Print QR Meja', href: '#' },
];

export default function TableQrPrintPage({ schemaReady = true, schemaMessage = null, qrImageUrl, table }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Print QR Meja" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="selia-surface p-5 md:p-6">
                    <p className="selia-chip">Admin • QR Print</p>
                    <h1 className="selia-title mt-2 text-2xl">Print QR per Meja</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Cetak kode QR untuk ditempel di meja fisik agar customer bisa langsung scan dan order.
                    </p>

                    {!schemaReady && schemaMessage ? (
                        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                            {schemaMessage}
                        </div>
                    ) : null}
                </section>

                {schemaReady && table && qrImageUrl ? (
                    <section className="selia-surface p-6">
                        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-6 text-center print:max-w-none print:border-none print:bg-white print:p-0">
                            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Cafe Table</p>
                            <h2 className="mt-2 text-3xl font-bold text-foreground">{table.code}</h2>
                            <p className="text-sm text-muted-foreground">{table.name} • {table.areaType}</p>

                            <div className="mt-5 rounded-xl border border-border bg-card p-4 print:border-none print:bg-white print:p-0">
                                <img src={qrImageUrl} alt={`QR meja ${table.code}`} className="mx-auto h-72 w-72 object-contain print:h-80 print:w-80" />
                            </div>

                            <p className="mt-4 text-xs text-muted-foreground">Token: {table.qrToken}</p>
                            <p className="mt-1 break-all text-xs text-muted-foreground">{table.scanUrl}</p>

                            <div className="mt-6 flex flex-wrap justify-center gap-2 print:hidden">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                                >
                                    Print Sekarang
                                </button>
                                <Link
                                    href="/admin/management/tables"
                                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
                                >
                                    Kembali ke Meja
                                </Link>
                                <a
                                    href={table.scanUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                                >
                                    Buka URL Scan
                                </a>
                            </div>
                        </div>
                    </section>
                ) : null}
            </div>
        </AppLayout>
    );
}
