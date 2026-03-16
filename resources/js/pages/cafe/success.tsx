import { Head, Link } from '@inertiajs/react';

type TableInfo = {
    name: string;
    code: string;
    qrToken: string;
};

type OrderItem = {
    id: number;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
};

type SuccessPageProps = {
    table: TableInfo;
    order: {
        id: number;
        billId: number | null;
        orderNumber: string;
        status: string;
        customerName: string;
        customerNote: string | null;
        totalAmount: number;
        orderedAt: string | null;
        items: OrderItem[];
    };
    openBill: {
        id: number;
        billNumber: string;
        status: string;
        totalAmount: number;
        ordersCount: number;
    } | null;
};

const currency = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export default function CafeOrderSuccessPage({ table, order, openBill }: SuccessPageProps) {
    return (
        <>
            <Head title="Pesanan Berhasil" />

            <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50 px-4 py-8 md:px-6 md:py-12">
                <section className="mx-auto w-full max-w-2xl rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
                    <p className="text-xs font-semibold tracking-[0.2em] text-emerald-700 uppercase">
                        Pesanan Terkirim
                    </p>
                    <h1 className="mt-2 text-3xl font-bold text-stone-900">
                        Terima kasih, pesananmu sedang diproses
                    </h1>
                    <p className="mt-2 text-sm text-stone-600">
                        {table.name} ({table.code}) - Nomor pesanan{' '}
                        <span className="font-semibold text-stone-900">{order.orderNumber}</span>
                    </p>

                    {openBill ? (
                        <p className="mt-2 text-sm text-sky-700">
                            Pesanan ini masuk ke bill{' '}
                            <span className="font-semibold text-sky-900">{openBill.billNumber}</span>. Kamu bisa tambah order lagi sebelum final payment di kasir.
                        </p>
                    ) : null}

                    <div className="mt-6 rounded-2xl border border-stone-200 p-4">
                        <h2 className="text-base font-semibold text-stone-900">Detail pesanan</h2>
                        <div className="mt-3 space-y-2">
                            {order.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 text-sm"
                                >
                                    <div>
                                        <p className="font-medium text-stone-800">
                                            {item.menu_item_name}
                                        </p>
                                        <p className="text-stone-500">
                                            {item.quantity} x {currency.format(item.unit_price)}
                                        </p>
                                    </div>
                                    <p className="font-semibold text-stone-900">
                                        {currency.format(item.line_total)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 border-t border-stone-200 pt-4">
                            <p className="text-xs text-stone-500 uppercase">Total bayar</p>
                            <p className="text-2xl font-bold text-emerald-700">
                                {currency.format(order.totalAmount)}
                            </p>
                        </div>

                        {order.customerNote ? (
                            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                                Catatan: {order.customerNote}
                            </div>
                        ) : null}
                    </div>

                    <Link
                        href={`/scan/${table.qrToken}`}
                        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                    >
                        Pesan lagi
                    </Link>
                </section>
            </main>
        </>
    );
}
