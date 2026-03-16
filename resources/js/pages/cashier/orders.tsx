import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ItemOrderKasir = {
    id: number;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    paidAt: string | null;
    specialRequest: string | null;
};

type OrderKasir = {
    id: number;
    orderNumber: string;
    status: string;
    customerName: string;
    customerNote: string | null;
    totalAmount: number;
    canSplit: boolean;
    orderedAt: string | null;
    table: {
        code: string | null;
        name: string | null;
    };
    items: ItemOrderKasir[];
};

type PembayaranBill = {
    id: number;
    amount: number;
    paymentMethod: 'cash' | 'transfer';
    note: string | null;
    cashierName: string | null;
    paidAt: string | null;
};

type BillKasir = {
    id: number;
    billNumber: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    openedAt: string | null;
    closedAt: string | null;
    tables: Array<{
        id: number;
        code: string;
        name: string;
    }>;
    payments: PembayaranBill[];
    orders: OrderKasir[];
};

type MetaPaginasi = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    hasMorePages: boolean;
};

type DataPaginasi<T> = {
    data: T[];
    meta: MetaPaginasi;
};

type PropsHalamanKasir = {
    filters: {
        tab: 'open' | 'paid';
        period: 'day' | 'week' | 'month' | 'custom';
        startDate: string | null;
        endDate: string | null;
    };
    orderStatusOptions: string[];
    paymentMethodOptions: Array<'cash' | 'transfer'>;
    mergeCandidates: Array<{
        id: number;
        billNumber: string;
        tableCodes: string[];
    }>;
    openBills: DataPaginasi<BillKasir>;
    paidBills: DataPaginasi<BillKasir>;
    updatedAt: string;
};

type PropsShared = {
    auth?: {
        user?: {
            roles?: string[];
        };
    };
    flash?: {
        success?: string;
        error?: string;
    };
};

type SplitUnitEntry = {
    unitKey: string;
    orderItemId: number;
    orderNumber: string;
    customerName: string;
    tableCode: string | null;
    tableName: string | null;
    menuItemName: string;
    unitPrice: number;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tagihan Kasir', href: '/cashier/orders' }];

const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const labelStatus: Record<string, string> = {
    open: 'Aktif',
    paid: 'Lunas',
    merged: 'Digabung',
    pending: 'Menunggu',
    preparing: 'Diproses',
    ready: 'Siap',
    served: 'Diantar',
    completed: 'Selesai',
    cancelled: 'Batal',
};

const kelasStatus: Record<string, string> = {
    open: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    merged: 'border-border bg-muted text-muted-foreground',
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    preparing: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    ready: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    served: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    cancelled: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const metodeLabel: Record<'cash' | 'transfer', string> = {
    cash: 'Tunai',
    transfer: 'Transfer',
};

const statusTerminal = new Set(['ready', 'served', 'completed', 'cancelled']);

function renderStatusBadge(status: string) {
    if (status === 'completed') {
        return (
            <Badge variant="success" className="rounded-full px-2.5 py-1 font-semibold">
                <CheckCircle2Icon className="size-3.5" />
                Terverifikasi
            </Badge>
        );
    }

    return <Badge className={kelasStatus[status] ?? 'border-border bg-muted text-muted-foreground'}>{labelStatus[status] ?? status}</Badge>;
}

function klasifikasiOpenBills(bills: BillKasir[]) {
    const belumDibayar: BillKasir[] = [];
    const siapPelunasan: BillKasir[] = [];

    bills.forEach((bill) => {
        const semuaOrderTerminal = bill.orders.every((order) => statusTerminal.has(order.status));

        if (bill.remainingAmount <= 0 || semuaOrderTerminal) {
            siapPelunasan.push(bill);
            return;
        }

        belumDibayar.push(bill);
    });

    return { belumDibayar, siapPelunasan };
}

function ambilOrderAktifUntukSplit(bill: BillKasir) {
    return bill.orders.filter((order) => order.items.some((item) => !item.paidAt));
}

export default function HalamanKasir({
    filters,
    orderStatusOptions,
    paymentMethodOptions,
    mergeCandidates,
    openBills,
    paidBills,
    updatedAt,
}: PropsHalamanKasir) {
    const { flash, auth } = usePage<PropsShared>().props;
    const tabAktif = filters.tab ?? 'open';
    const periodAktif = filters.period ?? 'day';
    const userRoles = auth?.user?.roles ?? [];
    const kasirSaja = userRoles.includes('cashier') && !userRoles.includes('admin');

    const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month' | 'custom'>(periodAktif);
    const [customStartDate, setCustomStartDate] = useState(filters.startDate ?? '');
    const [customEndDate, setCustomEndDate] = useState(filters.endDate ?? '');

    const [mergeModalBillId, setMergeModalBillId] = useState<number | null>(null);
    const [mergeTargetBillId, setMergeTargetBillId] = useState<string>('');
    const [settleMethodByBill, setSettleMethodByBill] = useState<Record<number, 'cash' | 'transfer'>>({});

    const [splitModalBillId, setSplitModalBillId] = useState<number | null>(null);
    const [selectedSplitUnitKeys, setSelectedSplitUnitKeys] = useState<string[]>([]);

    useEffect(() => {
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.private('cashier.orders');

        channel.listen('.order.lifecycle.updated', () => {
            router.reload({ only: ['openBills', 'paidBills', 'mergeCandidates', 'updatedAt'] });
        });

        channel.listen('.bill.lifecycle.updated', () => {
            router.reload({ only: ['openBills', 'paidBills', 'mergeCandidates', 'updatedAt'] });
        });

        return () => {
            window.Echo?.leave('private-cashier.orders');
        };
    }, []);

    const updatedAtLabel = useMemo(() => {
        const tanggal = new Date(updatedAt);
        return Number.isNaN(tanggal.getTime())
            ? '-'
            : tanggal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, [updatedAt]);

    const bagianOpen = useMemo(() => klasifikasiOpenBills(openBills.data), [openBills.data]);

    const openPage = openBills.meta.currentPage;
    const paidPage = paidBills.meta.currentPage;

    useEffect(() => {
        setPeriodFilter(periodAktif);
    }, [periodAktif]);

    useEffect(() => {
        setCustomStartDate(filters.startDate ?? '');
        setCustomEndDate(filters.endDate ?? '');
    }, [filters.startDate, filters.endDate]);

    const ambilParameterFilterPaid = () => ({
        period: periodFilter,
        start_date: periodFilter === 'custom' ? customStartDate || undefined : undefined,
        end_date: periodFilter === 'custom' ? customEndDate || undefined : undefined,
    });

    const splitModalBill = useMemo(() => {
        if (!splitModalBillId) {
            return null;
        }
        return openBills.data.find((bill) => bill.id === splitModalBillId) ?? null;
    }, [openBills.data, splitModalBillId]);

    const mergeModalBill = useMemo(() => {
        if (!mergeModalBillId) {
            return null;
        }

        return openBills.data.find((bill) => bill.id === mergeModalBillId) ?? null;
    }, [openBills.data, mergeModalBillId]);

    const kandidatMergeModal = useMemo(() => {
        if (!mergeModalBillId) {
            return [];
        }

        return mergeCandidates.filter((candidate) => candidate.id !== mergeModalBillId);
    }, [mergeCandidates, mergeModalBillId]);

    const splitModalOrders = useMemo(() => {
        if (!splitModalBill) {
            return [];
        }
        return ambilOrderAktifUntukSplit(splitModalBill);
    }, [splitModalBill]);

    const splitModalUnpaidItems = useMemo(() => {
        return splitModalOrders.flatMap((order) =>
            order.items
                .filter((item) => !item.paidAt)
                .map((item) => ({
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    tableCode: order.table.code,
                    tableName: order.table.name,
                    item,
                })),
        );
    }, [splitModalOrders]);

    const splitModalUnpaidUnits = useMemo<SplitUnitEntry[]>(() => {
        return splitModalUnpaidItems.flatMap((entry) =>
            Array.from({ length: entry.item.quantity }, (_, index) => ({
                unitKey: `${entry.item.id}-${index + 1}`,
                orderItemId: entry.item.id,
                orderNumber: entry.orderNumber,
                customerName: entry.customerName,
                tableCode: entry.tableCode,
                tableName: entry.tableName,
                menuItemName: entry.item.menuItemName,
                unitPrice: entry.item.unitPrice,
            })),
        );
    }, [splitModalUnpaidItems]);

    const splitUnitMap = useMemo(() => {
        return new Map(splitModalUnpaidUnits.map((unit) => [unit.unitKey, unit]));
    }, [splitModalUnpaidUnits]);

    const totalKuantitasAktifSplit = useMemo(() => {
        return splitModalUnpaidItems.reduce((sum, entry) => sum + entry.item.quantity, 0);
    }, [splitModalUnpaidItems]);

    const payloadSplitItems = useMemo(() => {
        const quantityByItemId = new Map<number, number>();

        selectedSplitUnitKeys.forEach((unitKey) => {
            const unit = splitUnitMap.get(unitKey);
            if (!unit) {
                return;
            }

            quantityByItemId.set(unit.orderItemId, (quantityByItemId.get(unit.orderItemId) ?? 0) + 1);
        });

        return Array.from(quantityByItemId.entries()).map(([orderItemId, quantity]) => ({
            order_item_id: orderItemId,
            quantity,
        }));
    }, [selectedSplitUnitKeys, splitUnitMap]);

    const totalKuantitasTerpilih = useMemo(() => {
        return payloadSplitItems.reduce((sum, item) => sum + item.quantity, 0);
    }, [payloadSplitItems]);

    const totalSplitTerpilih = useMemo(() => {
        return selectedSplitUnitKeys.reduce((sum, unitKey) => {
            const unit = splitUnitMap.get(unitKey);
            if (!unit) {
                return sum;
            }

            return sum + unit.unitPrice;
        }, 0);
    }, [selectedSplitUnitKeys, splitUnitMap]);

    const validasiSplit = (() => {
        if (!splitModalBill) {
            return {
                canSplit: false,
                reason: 'Bill tidak ditemukan.',
            };
        }

        if (totalKuantitasAktifSplit <= 1) {
            return {
                canSplit: false,
                reason: 'Split pembayaran aktif jika total kuantitas item belum dibayar minimal 2.',
            };
        }

        if (selectedSplitUnitKeys.length === 0) {
            return {
                canSplit: false,
                reason: 'Centang minimal satu item (unit) yang dibayar sekarang.',
            };
        }

        if (totalKuantitasTerpilih >= totalKuantitasAktifSplit) {
            return {
                canSplit: false,
                reason: 'Pilih sebagian kuantitas item saja agar tetap dianggap split pembayaran.',
            };
        }

        return {
            canSplit: true,
            reason: null,
        };
    })();

    const pindahTab = (tab: 'open' | 'paid') => {
        router.get(
            '/cashier/orders',
            {
                tab,
                open_page: openPage,
                paid_page: paidPage,
                ...ambilParameterFilterPaid(),
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const pindahHalamanTab = (tab: 'open' | 'paid', page: number) => {
        router.get(
            '/cashier/orders',
            {
                tab,
                open_page: tab === 'open' ? page : openPage,
                paid_page: tab === 'paid' ? page : paidPage,
                ...ambilParameterFilterPaid(),
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const updateStatus = (orderId: number, status: string) => {
        router.patch(
            `/cashier/orders/${orderId}/status`,
            { status },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const bukaModalSplit = (bill: BillKasir) => {
        setSplitModalBillId(bill.id);
        setSelectedSplitUnitKeys([]);
    };

    const submitSplitBill = () => {
        if (!splitModalBill || !validasiSplit.canSplit) {
            return;
        }

        router.post(
            `/cashier/bills/${splitModalBill.id}/split`,
                {
                    paid_items: payloadSplitItems,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setSplitModalBillId(null);
                        setSelectedSplitUnitKeys([]);
                    },
                },
            );
    };

    const bukaModalMerge = (bill: BillKasir) => {
        setMergeModalBillId(bill.id);
        setMergeTargetBillId('');
    };

    const submitMergeBill = () => {
        if (!mergeModalBill || !mergeTargetBillId) {
            return;
        }

        router.post(
            '/cashier/bills/merge',
            {
                source_bill_id: mergeModalBill.id,
                target_bill_id: Number(mergeTargetBillId),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setMergeModalBillId(null);
                    setMergeTargetBillId('');
                },
            },
        );
    };

    const settleBill = (billId: number) => {
        const paymentMethod = settleMethodByBill[billId] ?? 'cash';

        router.post(
            `/cashier/bills/${billId}/settle`,
            {
                payment_method: paymentMethod,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const terapkanFilterPaid = () => {
        router.get(
            '/cashier/orders',
            {
                tab: 'paid',
                open_page: openPage,
                paid_page: 1,
                ...ambilParameterFilterPaid(),
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const renderBillCard = (bill: BillKasir) => {
        const billOpen = bill.status === 'open';
        const totalKuantitasItemAktifBelumDibayar = ambilOrderAktifUntukSplit(bill)
            .flatMap((order) => order.items)
            .filter((item) => !item.paidAt)
            .reduce((sum, item) => sum + item.quantity, 0);
        const bisaBukaSplitModal = billOpen && totalKuantitasItemAktifBelumDibayar > 1;

        return (
            <article key={bill.id} className="rounded-2xl border border-border/80 bg-card/85 p-3 shadow-sm backdrop-blur">

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{bill.billNumber}</h3>
                        <p className="text-sm text-muted-foreground">Meja: {bill.tables.map((table) => table.code).join(', ') || '-'}</p>
                    </div>
                    {renderStatusBadge(bill.status)}
                </div>

                <div className="mt-2 grid gap-2 rounded-xl border border-border/70 bg-background/65 p-2.5 sm:grid-cols-3">
                    <div>
                        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Total Bill</p>
                        <p className="text-sm font-semibold text-foreground">{formatter.format(bill.totalAmount)}</p>
                    </div>
                    <div>
                        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Sudah Dibayar</p>
                        <p className="text-sm font-semibold text-foreground">{formatter.format(bill.paidAmount)}</p>
                    </div>
                    <div>
                        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Sisa</p>
                        <p className="text-sm font-semibold text-primary">{formatter.format(bill.remainingAmount)}</p>
                    </div>
                </div>

                {bill.payments.length > 0 ? (
                    <div className="mt-2 rounded-xl border border-border/70 bg-background/65 p-2.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Riwayat Pembayaran</p>
                        <div className="mt-2 space-y-2">
                            {bill.payments.slice(0, 3).map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span>
                                        {metodeLabel[payment.paymentMethod]} {payment.cashierName ? `• ${payment.cashierName}` : ''}
                                    </span>
                                    <span className="font-semibold text-foreground">{formatter.format(payment.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-3 space-y-2.5">
                    {bill.orders.map((order) => (
                        <div key={order.id} className="rounded-xl border border-border/80 bg-background/70 p-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {order.orderNumber} - {order.customerName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {order.table.code ?? '-'} / {order.table.name ?? '-'}
                                    </p>
                                </div>
                                {renderStatusBadge(order.status)}
                            </div>

                            <div className="mt-2 space-y-1 text-xs text-foreground">
                                {order.items.map((item) => (
                                    <p key={item.id}>
                                        {item.quantity}x {item.menuItemName} {item.paidAt ? '(sudah dibayar)' : ''}
                                    </p>
                                ))}
                            </div>

                            {order.customerNote ? (
                                <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                                    Catatan: {order.customerNote}
                                </p>
                            ) : null}

                            {billOpen ? (
                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                    {orderStatusOptions.map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            disabled={kasirSaja || order.status === status}
                                            onClick={() => updateStatus(order.id, status)}
                                            className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {labelStatus[status] ?? status}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-3 text-xs text-muted-foreground">Status order terkunci karena bill sudah lunas.</p>
                            )}

                            {billOpen && kasirSaja ? (
                                <p className="mt-2 text-[11px] text-muted-foreground">Aksi status hanya dapat dilakukan oleh admin.</p>
                            ) : null}
                        </div>
                    ))}
                </div>

                <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                    {billOpen ? (
                        <>
                            <div className="grid gap-2 rounded-xl border border-border/70 bg-background/65 p-2.5 sm:grid-cols-2 xl:grid-cols-3">
                                <button
                                    type="button"
                                    disabled={mergeCandidates.filter((candidate) => candidate.id !== bill.id).length === 0}
                                    onClick={() => bukaModalMerge(bill)}
                                    className="h-8 rounded-md border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Gabungkan Bill
                                </button>

                                <button
                                    type="button"
                                    disabled={!bisaBukaSplitModal}
                                    onClick={() => bukaModalSplit(bill)}
                                    className="h-8 rounded-md border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Split Pembayaran
                                </button>

                                <div className="flex gap-1.5 sm:col-span-2 xl:col-span-1">
                                    <select
                                        value={settleMethodByBill[bill.id] ?? 'cash'}
                                        onChange={(event) => {
                                            setSettleMethodByBill((sebelumnya) => ({
                                                ...sebelumnya,
                                                [bill.id]: event.target.value as 'cash' | 'transfer',
                                            }));
                                        }}
                                        className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[11px] text-foreground"
                                    >
                                        {paymentMethodOptions.map((method) => (
                                            <option key={method} value={method}>
                                                {metodeLabel[method]}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => settleBill(bill.id)}
                                        className="h-8 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground transition hover:brightness-95"
                                    >
                                        Pelunasan
                                    </button>
                                </div>
                            </div>

                            {!bisaBukaSplitModal ? (
                                <p className="text-[11px] text-muted-foreground">
                                    Split pembayaran aktif jika total kuantitas item belum dibayar minimal 2.
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground">Bill sudah lunas, semua aksi perubahan dikunci.</p>
                    )}
                </div>
            </article>
        );
    };

    const renderPanelPaginasi = (tab: 'open' | 'paid', meta: MetaPaginasi) => (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/70 px-2.5 py-1.5">
            <p className="text-[11px] text-muted-foreground">
                Halaman {meta.currentPage} dari {meta.lastPage} • Total {meta.total} bill
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={meta.currentPage <= 1}
                    onClick={() => pindahHalamanTab(tab, meta.currentPage - 1)}
                    className="h-7 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Sebelumnya
                </button>
                <button
                    type="button"
                    disabled={!meta.hasMorePages}
                    onClick={() => pindahHalamanTab(tab, meta.currentPage + 1)}
                    className="h-7 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Berikutnya
                </button>
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tagihan Kasir" />

            <Dialog
                open={splitModalBillId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSplitModalBillId(null);
                        setSelectedSplitUnitKeys([]);
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Split Pembayaran per Item</DialogTitle>
                        <DialogDescription>
                            Centang item (unit) yang dibayar sekarang. Item yang tidak dicentang tetap belum dibayar pada bill yang sama.
                        </DialogDescription>
                    </DialogHeader>

                    {splitModalBill ? (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                                <p>
                                    Bill asal: <span className="font-semibold text-foreground">{splitModalBill.billNumber}</span>
                                </p>
                                <p className="mt-1">
                                    Total kuantitas aktif: <span className="font-semibold text-foreground">{totalKuantitasAktifSplit}</span> • Dipilih:{' '}
                                    <span className="font-semibold text-foreground">{totalKuantitasTerpilih}</span>
                                </p>
                                <p className="mt-1">
                                    Total item terpilih:{' '}
                                    <span className="font-semibold text-primary">{formatter.format(totalSplitTerpilih)}</span>
                                </p>
                            </div>

                            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                                {splitModalOrders.map((order) => {
                                    const unitRows = order.items
                                        .filter((item) => !item.paidAt)
                                        .flatMap((item) =>
                                            Array.from({ length: item.quantity }, (_, index) => ({
                                                unitKey: `${item.id}-${index + 1}`,
                                                menuItemName: item.menuItemName,
                                                unitPrice: item.unitPrice,
                                            })),
                                        );

                                    return (
                                        <div key={order.id} className="rounded-xl border border-border/70 bg-background/70 p-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-foreground">{order.orderNumber}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {order.customerName} • {order.table.code ?? '-'} • {order.table.name ?? '-'}
                                                    </p>
                                                    <p className="text-xs font-semibold text-foreground">Total: {formatter.format(order.totalAmount)}</p>
                                                </div>
                                                {renderStatusBadge(order.status)}
                                            </div>

                                            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                                                {order.items
                                                    .filter((item) => item.paidAt)
                                                    .map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
                                                        >
                                                            <span className="min-w-0 flex-1">
                                                                {item.quantity}x {item.menuItemName} • Harga: {formatter.format(item.unitPrice)} (sudah dibayar)
                                                            </span>
                                                        </div>
                                                    ))}

                                                {unitRows.map((unit) => {
                                                    const checked = selectedSplitUnitKeys.includes(unit.unitKey);

                                                    return (
                                                        <label
                                                            key={unit.unitKey}
                                                            htmlFor={`split-item-${unit.unitKey}`}
                                                            className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
                                                        >
                                                            <input
                                                                id={`split-item-${unit.unitKey}`}
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(event) => {
                                                                    setSelectedSplitUnitKeys((previous) => {
                                                                        if (event.target.checked) {
                                                                            if (previous.includes(unit.unitKey)) {
                                                                                return previous;
                                                                            }

                                                                            return [...previous, unit.unitKey];
                                                                        }

                                                                        return previous.filter((value) => value !== unit.unitKey);
                                                                    });
                                                                }}
                                                                className="mt-0.5 size-4 rounded border-border bg-background text-primary"
                                                            />
                                                            <span className="min-w-0 flex-1">
                                                                {unit.menuItemName} • Harga: {formatter.format(unit.unitPrice)}
                                                            </span>
                                                        </label>
                                                    );
                                                })}

                                                {unitRows.length === 0 ? (
                                                    <p className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-2 text-[11px] text-muted-foreground">
                                                        Tidak ada item aktif untuk split pada order ini.
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {validasiSplit.reason ? <p className="text-xs text-amber-700 dark:text-amber-300">{validasiSplit.reason}</p> : null}
                        </div>
                    ) : null}

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => {
                                setSplitModalBillId(null);
                                setSelectedSplitUnitKeys([]);
                            }}
                            className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-accent"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            disabled={!validasiSplit.canSplit}
                            onClick={submitSplitBill}
                            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Konfirmasi Split Pembayaran
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={mergeModalBillId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setMergeModalBillId(null);
                        setMergeTargetBillId('');
                    }
                }}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Gabungkan Bill</DialogTitle>
                        <DialogDescription>
                            Pilih bill tujuan untuk menerima semua pesanan dari bill asal.
                        </DialogDescription>
                    </DialogHeader>

                    {mergeModalBill ? (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                                <p>
                                    Bill asal: <span className="font-semibold text-foreground">{mergeModalBill.billNumber}</span>
                                </p>
                                <p className="mt-1 text-xs">Meja: {mergeModalBill.tables.map((table) => table.code).join(', ') || '-'}</p>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="merge-target-bill" className="text-xs font-medium text-muted-foreground">
                                    Bill tujuan merge
                                </label>
                                <select
                                    id="merge-target-bill"
                                    value={mergeTargetBillId}
                                    onChange={(event) => setMergeTargetBillId(event.target.value)}
                                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                                >
                                    <option value="">Pilih bill tujuan</option>
                                    {kandidatMergeModal.map((candidate) => (
                                        <option key={candidate.id} value={candidate.id}>
                                            {candidate.billNumber} ({candidate.tableCodes.join(', ')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {kandidatMergeModal.length === 0 ? (
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Tidak ada kandidat bill tujuan yang tersedia saat ini.
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => {
                                setMergeModalBillId(null);
                                setMergeTargetBillId('');
                            }}
                            className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-accent"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            disabled={!mergeModalBill || !mergeTargetBillId}
                            onClick={submitMergeBill}
                            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Konfirmasi Merge
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex flex-1 flex-col gap-3 p-3 md:p-4">
                <section className="selia-surface p-3 md:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="selia-chip">Panel Kasir</p>
                            <h1 className="selia-title mt-1 text-xl">Tagihan Kasir</h1>
                            <p className="mt-1 text-xs text-muted-foreground">Sinkron realtime via WebSocket. Update terakhir: {updatedAtLabel}</p>
                        </div>

                        <div className="flex rounded-lg border border-border bg-muted/50 p-1">
                            <button
                                type="button"
                                onClick={() => pindahTab('open')}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                    tabAktif === 'open' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Bill Aktif
                            </button>
                            <button
                                type="button"
                                onClick={() => pindahTab('paid')}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                    tabAktif === 'paid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Bill Lunas
                            </button>
                        </div>
                    </div>

                    {flash?.success ? (
                        <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">{flash.success}</div>
                    ) : null}
                    {flash?.error ? (
                        <div className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{flash.error}</div>
                    ) : null}
                </section>

                {tabAktif === 'open' ? (
                    <section className="selia-surface p-3">
                        <div className="grid gap-3 xl:grid-cols-2">
                            {([
                                ['Belum Dibayar', bagianOpen.belumDibayar],
                                ['Siap Pelunasan', bagianOpen.siapPelunasan],
                            ] as const).map(([judul, data]) => (
                                <article key={judul} className="rounded-2xl border border-border/80 bg-background/55 p-3">
                                    <h2 className="text-sm font-semibold text-foreground">{judul}</h2>
                                    <p className="text-[11px] text-muted-foreground">{data.length} bill di halaman ini</p>

                                    <div className="mt-2.5 space-y-2.5">
                                        {data.length === 0 ? (
                                            <p className="rounded-xl border border-dashed border-border bg-card/70 px-3 py-4 text-center text-xs text-muted-foreground">
                                                Tidak ada bill pada bagian ini.
                                            </p>
                                        ) : (
                                            data.map((bill) => renderBillCard(bill))
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>

                        {renderPanelPaginasi('open', openBills.meta)}
                    </section>
                ) : (
                    <section className="selia-surface p-3">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">Daftar Bill Lunas</h2>
                                <p className="text-[11px] text-muted-foreground">Status order tidak dapat diubah setelah bill lunas.</p>
                            </div>

                            <div className="flex flex-wrap items-end gap-2">
                                <div>
                                    <label htmlFor="period-filter" className="text-[11px] font-medium text-muted-foreground">
                                        Periode
                                    </label>
                                    <select
                                        id="period-filter"
                                        value={periodFilter}
                                        onChange={(event) => setPeriodFilter(event.target.value as 'day' | 'week' | 'month' | 'custom')}
                                        className="mt-1 h-8 rounded-md border border-border bg-background px-2.5 text-[11px] text-foreground"
                                    >
                                        <option value="day">Per Hari</option>
                                        <option value="week">1 Minggu</option>
                                        <option value="month">1 Bulan</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>

                                {periodFilter === 'custom' ? (
                                    <>
                                        <div>
                                            <label htmlFor="start-date-filter" className="text-[11px] font-medium text-muted-foreground">
                                                Dari
                                            </label>
                                            <input
                                                id="start-date-filter"
                                                type="date"
                                                value={customStartDate}
                                                onChange={(event) => setCustomStartDate(event.target.value)}
                                                className="mt-1 h-8 rounded-md border border-border bg-background px-2.5 text-[11px] text-foreground"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="end-date-filter" className="text-[11px] font-medium text-muted-foreground">
                                                Sampai
                                            </label>
                                            <input
                                                id="end-date-filter"
                                                type="date"
                                                value={customEndDate}
                                                onChange={(event) => setCustomEndDate(event.target.value)}
                                                className="mt-1 h-8 rounded-md border border-border bg-background px-2.5 text-[11px] text-foreground"
                                            />
                                        </div>
                                    </>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={terapkanFilterPaid}
                                    className="h-8 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition hover:bg-accent"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>

                        <div className="mt-2.5 space-y-2.5">
                            {paidBills.data.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-border bg-card/70 px-3 py-5 text-center text-xs text-muted-foreground">
                                    Belum ada bill lunas.
                                </p>
                            ) : (
                                paidBills.data.map((bill) => renderBillCard(bill))
                            )}
                        </div>

                        {renderPanelPaginasi('paid', paidBills.meta)}
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
