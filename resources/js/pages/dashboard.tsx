import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

type DashboardProps = {
    cashierUrl: string;
    kitchenUrl: string;
    financeUrl: string;
    adminUrl: string;
    canAccessCashier: boolean;
    canAccessKitchen: boolean;
    canAccessFinance: boolean;
    canAccessAdmin: boolean;
    orderStats: {
        pending: number;
        preparing: number;
        ready: number;
        served: number;
    };
    billStats: {
        open: number;
        paid: number;
    };
    financeStats: {
        revenueToday: number;
        revenueMonth: number;
        paidBillsToday: number;
        averageTicketMonth: number;
        openExposure: number;
        billSettlementRate: number;
        outstandingOrders: number;
    };
    recentPayments: Array<{
        id: number;
        billNumber: string;
        totalAmount: number;
        closedAt: string | null;
        tableCodes: string[];
    }>;
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export default function Dashboard({
    cashierUrl,
    kitchenUrl,
    financeUrl,
    adminUrl,
    canAccessCashier,
    canAccessKitchen,
    canAccessFinance,
    canAccessAdmin,
    orderStats,
    billStats,
    financeStats,
    recentPayments,
}: DashboardProps) {
    const statCards = [
        {
            label: 'Menunggu',
            value: orderStats.pending,
            note: 'Menunggu diproses dapur',
            tone: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        },
        {
            label: 'Diproses',
            value: orderStats.preparing,
            note: 'Sedang dimasak',
            tone: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300',
        },
        {
            label: 'Siap Antar',
            value: orderStats.ready,
            note: 'Siap diantar waiter',
            tone: 'border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300',
        },
        {
            label: 'Terkirim',
            value: orderStats.served,
            note: 'Sudah diterima customer',
            tone: 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
        },
        {
            label: 'Bill Aktif',
            value: billStats.open,
            note: 'Tagihan masih berjalan',
            tone: 'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300',
        },
        {
            label: 'Bill Lunas',
            value: billStats.paid,
            note: 'Tagihan lunas hari ini',
            tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="selia-surface p-6 md:p-7">
                    <p className="selia-chip text-primary/80">
                        Pusat Kontrol Kafe
                    </p>
                    <h1 className="selia-title mt-3">Dashboard Operasional</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Pantau antrean kitchen, delivery waiter, dan open bill untuk proses pembayaran
                        gabungan di kasir.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                        {canAccessKitchen ? (
                            <Link
                                href={kitchenUrl}
                                className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                            >
                                Buka papan dapur
                            </Link>
                        ) : null}

                        {canAccessCashier ? (
                            <Link
                                href={cashierUrl}
                                className="inline-flex rounded-xl border border-border/70 bg-card/90 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
                            >
                                Buka panel kasir
                            </Link>
                        ) : null}

                        {canAccessFinance ? (
                            <Link
                                href={financeUrl}
                                className="inline-flex rounded-xl border border-border/70 bg-card/90 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
                            >
                                Buka modul keuangan
                            </Link>
                        ) : null}

                        {canAccessAdmin ? (
                            <Link
                                href={adminUrl}
                                className="inline-flex rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                            >
                                Buka manajemen admin
                            </Link>
                        ) : null}
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {statCards.map((card) => (
                        <article key={card.label} className="selia-surface group p-5 transition-transform duration-300 hover:-translate-y-0.5">
                            <div className="flex items-center justify-between gap-3">
                                <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${card.tone}`}>
                                    {card.label}
                                </Badge>
                                <span className="h-2 w-2 rounded-full bg-primary/40 transition-colors group-hover:bg-primary" />
                            </div>
                            <p className="mt-4 text-4xl font-black tracking-tight text-foreground">{card.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>
                        </article>
                    ))}
                </section>

                {canAccessAdmin ? (
                    <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
                        <article className="selia-surface p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="selia-chip">Pemantauan Keuangan</p>
                                    <h2 className="mt-2 text-xl font-semibold text-foreground">Ringkasan Keuangan Kasir</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Snapshot performa pembayaran, cashflow bill, dan risiko outstanding.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Revenue Hari Ini</p>
                                    <p className="mt-2 text-2xl font-bold text-foreground">{currencyFormatter.format(financeStats.revenueToday)}</p>
                                </div>

                                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Revenue Bulan Ini</p>
                                    <p className="mt-2 text-2xl font-bold text-foreground">{currencyFormatter.format(financeStats.revenueMonth)}</p>
                                </div>

                                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Rata-rata Ticket (Bulan)</p>
                                    <p className="mt-2 text-2xl font-bold text-foreground">{currencyFormatter.format(financeStats.averageTicketMonth)}</p>
                                </div>

                                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Bill Lunas Hari Ini</p>
                                    <p className="mt-2 text-2xl font-bold text-foreground">{financeStats.paidBillsToday}</p>
                                </div>

                                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Eksposur Bill Aktif</p>
                                    <p className="mt-2 text-2xl font-bold text-foreground">{currencyFormatter.format(financeStats.openExposure)}</p>
                                </div>

                                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Rasio Pelunasan</p>
                                    <p className="mt-2 text-2xl font-bold text-foreground">{financeStats.billSettlementRate.toFixed(1)}%</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-border/80 bg-primary/10 p-4">
                                <p className="text-xs font-medium tracking-wide text-primary/80 uppercase">Perhatian</p>
                                <p className="mt-1 text-sm font-semibold text-primary">
                                    Outstanding order aktif saat ini: {financeStats.outstandingOrders} order.
                                </p>
                            </div>
                        </article>

                        <article className="selia-surface p-5">
                            <p className="selia-chip">Pembayaran Terbaru</p>
                            <h2 className="mt-2 text-xl font-semibold text-foreground">Pembayaran Terakhir</h2>
                            <div className="mt-4 space-y-3">
                                {recentPayments.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-border/70 bg-background/50 px-3 py-4 text-sm text-muted-foreground">
                                        Belum ada pembayaran tercatat.
                                    </p>
                                ) : (
                                    recentPayments.map((payment) => {
                                        const closedAt = payment.closedAt
                                            ? new Date(payment.closedAt).toLocaleString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                day: '2-digit',
                                                month: 'short',
                                            })
                                            : '-';

                                        return (
                                            <div key={payment.id} className="rounded-xl border border-border/80 bg-background/70 px-3 py-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">{payment.billNumber}</p>
                                                        <p className="text-xs text-muted-foreground">{payment.tableCodes.join(', ') || '-'}</p>
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {currencyFormatter.format(payment.totalAmount)}
                                                    </p>
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">{closedAt}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </article>
                    </section>
                ) : null}
            </div>
        </AppLayout>
    );
}
