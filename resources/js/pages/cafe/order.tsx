import { Head, router, useForm, usePage } from '@inertiajs/react';

type TableInfo = {
    name: string;
    code: string;
    qrToken: string;
};

type MenuItem = {
    id: number;
    name: string;
    slug: string;
    category: string | null;
    description: string | null;
    price: number;
    image_url: string | null;
};

type CartItem = {
    menuItemId: number;
    name: string;
    price: number;
    quantity: number;
    lineTotal: number;
};

type OrderPageProps = {
    table: TableInfo;
    menuItems: MenuItem[];
    cart: {
        items: CartItem[];
        totalQuantity: number;
        totalAmount: number;
    };
    openBill: {
        id: number;
        billNumber: string;
        status: string;
        totalAmount: number;
        ordersCount: number;
    } | null;
};

type SharedProps = {
    flash?: {
        success?: string;
    };
    errors?: Record<string, string>;
};

const currency = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const categoryFallbackImage: Record<string, string> = {
    Coffee: '/images/menu/coffee.svg',
    Tea: '/images/menu/tea.svg',
    Snack: '/images/menu/snack.svg',
    'Main Course': '/images/menu/main-course.svg',
    Dessert: '/images/menu/dessert.svg',
    Lainnya: '/images/menu/snack.svg',
};

const resolveFallbackImage = (category: string | null): string => {
    if (!category) {
        return categoryFallbackImage.Lainnya;
    }

    return categoryFallbackImage[category] ?? categoryFallbackImage.Lainnya;
};

export default function CafeOrderPage({ table, menuItems, cart, openBill }: OrderPageProps) {
    const { flash, errors } = usePage<SharedProps>().props;

    const checkoutForm = useForm({
        customer_name: '',
        customer_note: '',
    });

    const categories = Array.from(
        new Set(menuItems.map((item) => item.category ?? 'Lainnya')),
    );

    const submitCheckout = (event: { preventDefault: () => void }) => {
        event.preventDefault();

        checkoutForm.post(`/scan/${table.qrToken}/checkout`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Order ${table.code}`} />

            <main className="min-h-screen pb-32">
                <section className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
                    <div className="selia-surface mb-8 p-5 md:p-8">
                        <p className="selia-chip">Scan Meja</p>
                        <h1 className="selia-title mt-2 text-3xl md:text-4xl">
                            {table.name} ({table.code})
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                            Pilih menu favoritmu, atur jumlah pesanan, lalu kirim tanpa perlu login.
                            Pesanan akan langsung masuk ke sistem kasir cafe.
                        </p>
                        {flash?.success ? (
                            <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                {flash.success}
                            </div>
                        ) : null}
                        {errors?.cart ? (
                            <div className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                                {errors.cart}
                            </div>
                        ) : null}

                        {openBill ? (
                            <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-300">
                                Bill terbuka: <span className="font-semibold">{openBill.billNumber}</span> • {openBill.ordersCount} order • total sementara{' '}
                                <span className="font-semibold">{currency.format(openBill.totalAmount)}</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                        <div className="space-y-6">
                            {categories.map((category) => {
                                const items = menuItems.filter(
                                    (item) => (item.category ?? 'Lainnya') === category,
                                );

                                return (
                                    <section
                                        key={category}
                                        className="selia-surface p-5 md:p-6"
                                    >
                                        <h2 className="text-xl font-semibold text-foreground">{category}</h2>
                                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                            {items.map((item) => {
                                                const fallbackImage = resolveFallbackImage(item.category);

                                                return (
                                                <article
                                                    key={item.id}
                                                    className="rounded-2xl border border-border/70 bg-card/70 p-4"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {item.image_url ? (
                                                            <img
                                                                src={item.image_url}
                                                                alt={item.name}
                                                                width={72}
                                                                height={72}
                                                                loading="lazy"
                                                                decoding="async"
                                                                onError={(event) => {
                                                                    const target = event.currentTarget;

                                                                    target.onerror = null;
                                                                    target.src = fallbackImage;
                                                                }}
                                                                className="h-[72px] w-[72px] rounded-xl border border-border/70 bg-card object-cover"
                                                            />
                                                        ) : (
                                                            <img
                                                                src={fallbackImage}
                                                                alt={item.name}
                                                                width={72}
                                                                height={72}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="h-[72px] w-[72px] rounded-xl border border-border/70 bg-card object-cover"
                                                            />
                                                        )}

                                                        <div className="min-w-0">
                                                            <p className="text-lg font-semibold text-foreground">{item.name}</p>
                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                {item.description ?? 'Menu best seller dari cafe kami.'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <p className="mt-3 text-base font-semibold text-primary">
                                                        {currency.format(item.price)}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-95"
                                                        onClick={() => {
                                                            router.post(
                                                                `/scan/${table.qrToken}/cart`,
                                                                {
                                                                    menu_item_id: item.id,
                                                                    quantity: 1,
                                                                },
                                                                { preserveScroll: true },
                                                            );
                                                        }}
                                                    >
                                                        Tambah ke keranjang
                                                    </button>
                                                </article>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        <aside className="selia-surface p-5 md:p-6 lg:sticky lg:top-6 lg:h-fit">
                            <h2 className="text-xl font-semibold text-foreground">Keranjang</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {cart.totalQuantity} item dipilih
                            </p>

                            <div className="mt-4 space-y-3">
                                {cart.items.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                                        Keranjang kosong, silakan pilih menu dulu.
                                    </p>
                                ) : (
                                    cart.items.map((item) => (
                                        <div
                                            key={item.menuItemId}
                                            className="rounded-xl border border-border/70 bg-card/60 p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {currency.format(item.price)} / porsi
                                                    </p>
                                                </div>
                                                <p className="text-sm font-semibold text-primary">
                                                    {currency.format(item.lineTotal)}
                                                </p>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="rounded-lg border border-border bg-background px-3 py-1 text-sm transition hover:bg-accent"
                                                    onClick={() => {
                                                        router.patch(
                                                            `/scan/${table.qrToken}/cart/${item.menuItemId}`,
                                                            {
                                                                quantity: item.quantity - 1,
                                                            },
                                                            { preserveScroll: true },
                                                        );
                                                    }}
                                                >
                                                    -
                                                </button>
                                                <span className="text-sm font-medium text-foreground">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="rounded-lg border border-border bg-background px-3 py-1 text-sm transition hover:bg-accent"
                                                    onClick={() => {
                                                        router.patch(
                                                            `/scan/${table.qrToken}/cart/${item.menuItemId}`,
                                                            {
                                                                quantity: item.quantity + 1,
                                                            },
                                                            { preserveScroll: true },
                                                        );
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form className="mt-6 space-y-3" onSubmit={submitCheckout}>
                                <label className="block">
                                    <span className="text-sm font-medium text-foreground">Nama (opsional)</span>
                                    <input
                                        type="text"
                                        value={checkoutForm.data.customer_name}
                                        onChange={(event) =>
                                            checkoutForm.setData('customer_name', event.target.value)
                                        }
                                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                        placeholder="Contoh: Budi"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-medium text-foreground">
                                        Catatan pesanan (opsional)
                                    </span>
                                    <textarea
                                        value={checkoutForm.data.customer_note}
                                        onChange={(event) =>
                                            checkoutForm.setData('customer_note', event.target.value)
                                        }
                                        className="mt-1 h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                        placeholder="Contoh: tanpa gula"
                                    />
                                </label>

                                <div className="rounded-xl border border-border/70 bg-card/80 p-3">
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {currency.format(cart.totalAmount)}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={cart.totalQuantity === 0 || checkoutForm.processing}
                                    className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {checkoutForm.processing
                                        ? 'Mengirim pesanan...'
                                        : 'Kirim pesanan'}
                                </button>
                            </form>
                        </aside>
                    </div>
                </section>
            </main>
        </>
    );
}
