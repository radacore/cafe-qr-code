import { Head, router } from '@inertiajs/react';
import { BanknoteIcon, LandmarkIcon, Package2Icon, ShoppingBagIcon, TagsIcon, TargetIcon, TrendingDownIcon, TrendingUpIcon, Users2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type PaymentMethod = 'cash' | 'transfer';

type Props = {
    filters: {
        method: string;
    };
    methodOptions: string[];
    summary: {
        collectedToday: number;
        collectedMonth: number;
        cashToday: number;
        transferToday: number;
        openReceivables: number;
        collectionRate: number;
    };
    charts: {
        dailyRevenue: Array<{
            date: string;
            label: string;
            total: number;
            target: number;
        }>;
        methodMixMonth: Array<{
            method: PaymentMethod;
            total: number;
            percentage: number;
        }>;
    };
    payments: {
        data: Array<{
            id: number;
            amount: number;
            paymentMethod: PaymentMethod;
            note: string | null;
            paidAt: string | null;
            cashierName: string | null;
            bill: {
                id: number | null;
                billNumber: string | null;
                status: string | null;
                totalAmount: number;
            };
        }>;
        meta: {
            currentPage: number;
            lastPage: number;
            perPage: number;
            total: number;
            hasMorePages: boolean;
        };
    };
    openBills: Array<{
        id: number;
        billNumber: string;
        totalAmount: number;
        openedAt: string | null;
        tableCodes: string[];
    }>;
    schemaReady?: boolean;
    schemaMessage?: string | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Keuangan', href: '/finance' },
];

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const methodLabel: Record<string, string> = {
    all: 'Semua Metode',
    cash: 'Tunai',
    transfer: 'Transfer',
};

const methodClass: Record<string, string> = {
    cash: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    transfer: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

type StatCardProps = {
    icon: React.ReactNode;
    title: string;
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
};

function StatCard({ icon, title, value, change, changeType }: StatCardProps) {
    return (
        <article className="rounded-xl border border-border/80 bg-background/70 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <span className="rounded-lg border border-border/70 bg-muted/40 p-2 text-foreground">{icon}</span>
                <Badge
                    className={
                        changeType === 'increase'
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    }
                >
                    {changeType === 'increase' ? <TrendingUpIcon className="size-3.5" /> : <TrendingDownIcon className="size-3.5" />}
                    {change}
                </Badge>
            </div>

            <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
        </article>
    );
}

const renderMethodBadge = (method: PaymentMethod) => {
    if (method === 'cash') {
        return (
            <Badge className={methodClass.cash}>
                <BanknoteIcon className="mr-1 size-3.5" />
                Tunai
            </Badge>
        );
    }

    return (
        <Badge className={methodClass.transfer}>
            <LandmarkIcon className="mr-1 size-3.5" />
            Transfer
        </Badge>
    );
};

export default function FinanceIndexPage({
    filters,
    methodOptions,
    summary,
    charts,
    payments,
    openBills,
    schemaReady = true,
    schemaMessage = null,
}: Props) {
    const activeMethod = filters.method || 'all';
    const totalPendapatan7Hari = charts.dailyRevenue.reduce((sum, item) => sum + item.total, 0);
    const totalTarget7Hari = charts.dailyRevenue.reduce((sum, item) => sum + item.target, 0);
    const totalTransaksi = payments.meta.total;
    const rataRataHarian = charts.dailyRevenue.length > 0 ? totalPendapatan7Hari / charts.dailyRevenue.length : 0;

    const pendapatanHariIni = charts.dailyRevenue.at(-1)?.total ?? 0;
    const pendapatanKemarin = charts.dailyRevenue.at(-2)?.total ?? pendapatanHariIni;

    const perubahanHarian = pendapatanKemarin > 0 ? ((pendapatanHariIni - pendapatanKemarin) / pendapatanKemarin) * 100 : 0;
    const perubahanTotal = totalTarget7Hari > 0 ? ((totalPendapatan7Hari - totalTarget7Hari) / totalTarget7Hari) * 100 : 0;
    const perubahanTransaksi = payments.meta.perPage > 0 ? ((payments.data.length - payments.meta.perPage) / payments.meta.perPage) * 100 : 0;

    const capaianTarget = totalTarget7Hari > 0 ? (totalPendapatan7Hari / totalTarget7Hari) * 100 : 0;

    const formatPerubahan = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

    const gantiHalamanPembayaran = (page: number) => {
        router.get(
            '/finance',
            {
                ...(activeMethod === 'all' ? {} : { method: activeMethod }),
                payments_page: page,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Keuangan" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="selia-surface p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="selia-chip">Pos Keuangan</p>
                            <h1 className="selia-title mt-2 text-2xl">Ringkasan Keuangan & Metode Pembayaran</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Pantau pemasukan harian, performa bulanan, dan komposisi metode pembayaran untuk keputusan kasir yang lebih cepat.
                            </p>
                        </div>

                        <div className="min-w-44">
                            <label htmlFor="finance-method" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Filter metode
                            </label>
                            <select
                                id="finance-method"
                                value={activeMethod}
                                onChange={(event) => {
                                    const method = event.target.value;
                                    router.get(
                                        '/finance',
                                        {
                                            ...(method === 'all' ? {} : { method }),
                                            payments_page: 1,
                                        },
                                        {
                                            preserveScroll: true,
                                            preserveState: true,
                                            replace: true,
                                        },
                                    );
                                }}
                                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                            >
                                {methodOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {methodLabel[option] ?? option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!schemaReady && schemaMessage ? (
                        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                            {schemaMessage}
                        </div>
                    ) : null}
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <article className="selia-surface p-4">
                        <p className="text-sm text-muted-foreground">Pemasukan Hari Ini</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{currencyFormatter.format(summary.collectedToday)}</p>
                    </article>
                    <article className="selia-surface p-4">
                        <p className="text-sm text-muted-foreground">Pemasukan Bulan Ini</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{currencyFormatter.format(summary.collectedMonth)}</p>
                    </article>
                    <article className="selia-surface p-4">
                        <p className="text-sm text-muted-foreground">Rasio Pelunasan</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{summary.collectionRate.toFixed(1)}%</p>
                    </article>
                    <article className="selia-surface p-4">
                        <p className="text-sm text-muted-foreground">Tunai Hari Ini</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{currencyFormatter.format(summary.cashToday)}</p>
                    </article>
                    <article className="selia-surface p-4">
                        <p className="text-sm text-muted-foreground">Transfer Hari Ini</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{currencyFormatter.format(summary.transferToday)}</p>
                    </article>
                    <article className="selia-surface p-4">
                        <p className="text-sm text-muted-foreground">Piutang Bill Aktif</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{currencyFormatter.format(summary.openReceivables)}</p>
                    </article>
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                    <article className="selia-surface p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-foreground">Tren Pendapatan 7 Hari</p>
                                <p className="text-xs text-muted-foreground">Model StatCard ala Selia untuk membaca performa 7 hari secara cepat.</p>
                            </div>
                            <Badge className="border-primary/25 bg-primary/10 text-primary">
                                <TrendingUpIcon className="mr-1 size-3.5" />
                                POS Harian
                            </Badge>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                icon={<ShoppingBagIcon className="size-4" />}
                                title="Total Sales"
                                value={currencyFormatter.format(totalPendapatan7Hari)}
                                change={formatPerubahan(perubahanTotal)}
                                changeType={perubahanTotal >= 0 ? 'increase' : 'decrease'}
                            />
                            <StatCard
                                icon={<Users2Icon className="size-4" />}
                                title="Transaksi"
                                value={totalTransaksi.toLocaleString('id-ID')}
                                change={formatPerubahan(perubahanTransaksi)}
                                changeType={perubahanTransaksi >= 0 ? 'increase' : 'decrease'}
                            />
                            <StatCard
                                icon={<Package2Icon className="size-4" />}
                                title="Rata-rata Harian"
                                value={currencyFormatter.format(rataRataHarian)}
                                change={formatPerubahan(perubahanHarian)}
                                changeType={perubahanHarian >= 0 ? 'increase' : 'decrease'}
                            />
                            <StatCard
                                icon={<TagsIcon className="size-4" />}
                                title="Capaian Target"
                                value={`${capaianTarget.toFixed(1)}%`}
                                change={formatPerubahan(capaianTarget - 100)}
                                changeType={capaianTarget >= 100 ? 'increase' : 'decrease'}
                            />
                        </div>
                    </article>

                    <article className="selia-surface p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-foreground">Komposisi Metode Bulan Ini</p>
                                <p className="text-xs text-muted-foreground">Distribusi kontribusi pembayaran tunai vs transfer.</p>
                            </div>
                            <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                <TargetIcon className="mr-1 size-3.5" />
                                Mix Metode
                            </Badge>
                        </div>

                        <div className="mt-4 space-y-3">
                            {charts.methodMixMonth.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-5 text-center text-sm text-muted-foreground">
                                    Belum ada data pembayaran bulan ini.
                                </p>
                            ) : (
                                charts.methodMixMonth.map((item) => (
                                    <div key={item.method} className="space-y-1">
                                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                            <span>{methodLabel[item.method]}</span>
                                            <span>{item.percentage.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2.5 overflow-hidden rounded-full bg-muted/45">
                                            <div
                                                className={`h-full rounded-full ${item.method === 'cash' ? 'bg-amber-500/80' : 'bg-sky-500/80'}`}
                                                style={{ width: `${Math.max(item.percentage, 3)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">{currencyFormatter.format(item.total)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </article>
                </section>

                <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Riwayat Pembayaran</h2>
                        <div className="mt-4 space-y-3">
                            {payments.data.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
                                    Belum ada pembayaran untuk filter ini.
                                </p>
                            ) : (
                                payments.data.map((payment) => (
                                    <div key={payment.id} className="rounded-xl border border-border/80 bg-background/60 p-3">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{payment.bill.billNumber ?? '-'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {payment.cashierName ?? '-'} • {payment.paidAt ? new Date(payment.paidAt).toLocaleString('id-ID') : '-'}
                                                </p>
                                            </div>
                                            {renderMethodBadge(payment.paymentMethod)}
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-foreground">{currencyFormatter.format(payment.amount)}</p>
                                        </div>

                                        {payment.note ? <p className="mt-1 text-xs text-muted-foreground">{payment.note}</p> : null}
                                    </div>
                                ))
                            )}

                            {payments.meta.lastPage > 1 ? (
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                                    <p className="text-xs text-muted-foreground">
                                        Halaman {payments.meta.currentPage} dari {payments.meta.lastPage} • Total {payments.meta.total} pembayaran
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={payments.meta.currentPage <= 1}
                                            onClick={() => gantiHalamanPembayaran(payments.meta.currentPage - 1)}
                                            className="h-7 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Sebelumnya
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!payments.meta.hasMorePages}
                                            onClick={() => gantiHalamanPembayaran(payments.meta.currentPage + 1)}
                                            className="h-7 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Berikutnya
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </article>

                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Bill Aktif</h2>
                        <div className="mt-4 space-y-3">
                            {openBills.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
                                    Tidak ada bill aktif.
                                </p>
                            ) : (
                                openBills.map((bill) => (
                                    <div key={bill.id} className="rounded-xl border border-border/80 bg-background/60 p-3">
                                        <p className="text-sm font-semibold text-foreground">{bill.billNumber}</p>
                                        <p className="text-xs text-muted-foreground">Meja: {bill.tableCodes.join(', ') || '-'}</p>
                                        <p className="mt-2 text-sm font-semibold text-foreground">{currencyFormatter.format(bill.totalAmount)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </article>
                </section>
            </div>
        </AppLayout>
    );
}
