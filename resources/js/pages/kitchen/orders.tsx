import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2Icon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type KitchenOrderItem = {
    id: number;
    menuItemName: string;
    quantity: number;
    specialRequest: string | null;
};

type KitchenOrder = {
    id: number;
    billId: number | null;
    orderNumber: string;
    status: string;
    customerName: string;
    customerNote: string | null;
    orderedAt: string | null;
    table: {
        id: number;
        code: string | null;
        name: string | null;
    };
    items: KitchenOrderItem[];
};

type QueueMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    hasMorePages: boolean;
};

type QueueData = {
    data: KitchenOrder[];
    meta: QueueMeta;
};

type KitchenPageProps = {
    filters: {
        tab: 'pending' | 'preparing' | 'ready_served';
    };
    queues: {
        pending: QueueData;
        preparing: QueueData;
        readyServed: QueueData;
    };
    updatedAt: string;
};

type SharedProps = {
    flash?: {
        success?: string;
        error?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Papan Dapur', href: '/kitchen/orders' }];

const statusLabels: Record<string, string> = {
    pending: 'Menunggu',
    preparing: 'Diproses',
    ready: 'Siap',
    served: 'Diantar',
    cancelled: 'Batal',
};

const statusClass: Record<string, string> = {
    pending: 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    preparing: 'border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300',
    ready: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
    served: 'border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-300',
    cancelled: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

function renderStatusBadge(status: string) {
    if (status === 'served') {
        return (
            <Badge variant="success" className="gap-1.5">
                <CheckCircle2Icon className="size-3.5" />
                Diantar
            </Badge>
        );
    }

    return <Badge className={statusClass[status] ?? 'border-border bg-muted/60 text-foreground'}>{statusLabels[status] ?? status}</Badge>;
}

export default function KitchenOrdersPage({ filters, queues, updatedAt }: KitchenPageProps) {
    const { flash } = usePage<SharedProps>().props;
    const activeTab = filters.tab ?? 'pending';

    useEffect(() => {
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.private('kitchen.orders');

        channel.listen('.order.lifecycle.updated', () => {
            router.reload({ only: ['queues', 'updatedAt'] });
        });

        channel.listen('.bill.lifecycle.updated', () => {
            router.reload({ only: ['queues', 'updatedAt'] });
        });

        return () => {
            window.Echo?.leave('private-kitchen.orders');
        };
    }, []);

    const updatedAtLabel = useMemo(() => {
        const date = new Date(updatedAt);

        return Number.isNaN(date.getTime())
            ? '-'
            : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, [updatedAt]);

    const currentQueue =
        activeTab === 'pending'
            ? queues.pending
            : activeTab === 'preparing'
                ? queues.preparing
                : queues.readyServed;

    const switchTab = (tab: 'pending' | 'preparing' | 'ready_served') => {
        router.get(
            '/kitchen/orders',
            {
                tab,
                pending_page: queues.pending.meta.currentPage,
                preparing_page: queues.preparing.meta.currentPage,
                ready_page: queues.readyServed.meta.currentPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const switchPage = (page: number) => {
        router.get(
            '/kitchen/orders',
            {
                tab: activeTab,
                pending_page: activeTab === 'pending' ? page : queues.pending.meta.currentPage,
                preparing_page: activeTab === 'preparing' ? page : queues.preparing.meta.currentPage,
                ready_page: activeTab === 'ready_served' ? page : queues.readyServed.meta.currentPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const updateStatus = (orderId: number, status: string) => {
        router.patch(
            `/kitchen/orders/${orderId}/status`,
            { status },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const markServed = (orderId: number) => {
        router.post(
            `/kitchen/orders/${orderId}/served`,
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Papan Dapur" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="selia-surface p-4 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="selia-chip">Dapur</p>
                            <h1 className="selia-title mt-1 text-2xl">Papan Dapur</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Antrian realtime via WebSocket. Update terakhir: {updatedAtLabel}</p>
                        </div>

                        <div className="flex rounded-xl border border-border bg-muted/50 p-1">
                            <button
                                type="button"
                                onClick={() => switchTab('pending')}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                                    activeTab === 'pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Antrian Pending
                            </button>
                            <button
                                type="button"
                                onClick={() => switchTab('preparing')}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                                    activeTab === 'preparing' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Antrian Diproses
                            </button>
                            <button
                                type="button"
                                onClick={() => switchTab('ready_served')}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                                    activeTab === 'ready_served' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Siap / Diantar
                            </button>
                        </div>
                    </div>

                    {flash?.success ? (
                        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{flash.success}</div>
                    ) : null}
                    {flash?.error ? (
                        <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{flash.error}</div>
                    ) : null}
                </section>

                <section className="selia-surface p-4">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-foreground">
                                {activeTab === 'pending'
                                    ? 'Antrian Pending'
                                    : activeTab === 'preparing'
                                        ? 'Antrian Diproses'
                                        : 'Antrian Siap / Diantar'}
                            </h2>
                            <p className="text-xs text-muted-foreground">Maksimal 12 order per halaman</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Halaman {currentQueue.meta.currentPage} dari {currentQueue.meta.lastPage} • Total {currentQueue.meta.total} order
                        </p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                        {currentQueue.data.length === 0 ? (
                            <article className="xl:col-span-3 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
                                Tidak ada order pada tab ini.
                            </article>
                        ) : (
                            currentQueue.data.map((order, index) => (
                                <article
                                    key={order.id}
                                    className={`pinned-note p-4 md:p-5 ${index % 2 === 0 ? 'rotate-[-0.3deg]' : 'rotate-[0.25deg]'}`}
                                >
                                    <span className="pinned-note-pin" aria-hidden="true" />
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-foreground">{order.orderNumber}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {order.table.name ?? '-'} ({order.table.code ?? '-'}) - {order.customerName}
                                            </p>
                                        </div>
                                        {renderStatusBadge(order.status)}
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm text-foreground/90">
                                        {order.items.map((item) => (
                                            <div key={item.id}>
                                                <p>{item.quantity}x {item.menuItemName}</p>
                                                {item.specialRequest ? <p className="text-xs text-primary">Catatan item: {item.specialRequest}</p> : null}
                                            </div>
                                        ))}
                                    </div>

                                    {order.customerNote ? (
                                        <p className="mt-3 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
                                            Catatan customer: {order.customerNote}
                                        </p>
                                    ) : null}

                                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                                        <button
                                            type="button"
                                            disabled={order.status !== 'pending'}
                                            onClick={() => updateStatus(order.id, 'preparing')}
                                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Mulai Proses
                                        </button>
                                        <button
                                            type="button"
                                            disabled={order.status !== 'preparing'}
                                            onClick={() => updateStatus(order.id, 'ready')}
                                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Tandai Siap
                                        </button>
                                        <button
                                            type="button"
                                            disabled={order.status !== 'ready'}
                                            onClick={() => markServed(order.id)}
                                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Waiter Antar
                                        </button>
                                        <button
                                            type="button"
                                            disabled={order.status === 'cancelled' || order.status === 'completed'}
                                            onClick={() => updateStatus(order.id, 'cancelled')}
                                            className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300"
                                        >
                                            Batalkan
                                        </button>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Tampilkan {currentQueue.meta.perPage} item per halaman</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={currentQueue.meta.currentPage <= 1}
                                onClick={() => switchPage(currentQueue.meta.currentPage - 1)}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Sebelumnya
                            </button>
                            <button
                                type="button"
                                disabled={!currentQueue.meta.hasMorePages}
                                onClick={() => switchPage(currentQueue.meta.currentPage + 1)}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
