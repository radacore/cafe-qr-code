import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Category = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    menuItemsCount: number;
};

type MenuItem = {
    id: number;
    name: string;
    category: string | null;
    categoryName: string | null;
    price: number;
    isAvailable: boolean;
    imageUrl: string | null;
};

type FloorTable = {
    id: number;
    code: string;
    name: string;
    areaType: 'indoor' | 'outdoor';
    isActive: boolean;
};

type Floor = {
    id: number;
    name: string;
    floorNumber: number;
    isActive: boolean;
    indoorTableCount: number;
    outdoorTableCount: number;
    tables: FloorTable[];
};

type DraggableTable = FloorTable & {
    floorId: number;
    floorName: string;
    floorNumber: number;
};

type AdminManagementProps = {
    categories: Category[];
    menuItems: MenuItem[];
    floors: Floor[];
    schemaReady?: boolean;
    schemaMessage?: string | null;
};

type SharedProps = {
    flash?: {
        success?: string;
        error?: string;
    };
};

const currency = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Admin Management', href: '/admin/management' },
];

export default function AdminManagementPage({
    categories,
    menuItems,
    floors,
    schemaReady = true,
    schemaMessage = null,
}: AdminManagementProps) {
    const { flash } = usePage<SharedProps>().props;
    const [draggingTableId, setDraggingTableId] = useState<number | null>(null);

    const categoryForm = useForm({
        name: '',
        description: '',
        sort_order: 0,
        is_active: true,
    });

    const menuItemForm = useForm({
        menu_category_id: categories[0]?.id ?? 0,
        name: '',
        description: '',
        price: 0,
        image_url: '',
        sort_order: 0,
        is_available: true,
    });

    const floorForm = useForm({
        name: '',
        floor_number: floors.length + 1,
        is_active: true,
    });

    const tableForm = useForm({
        cafe_floor_id: floors[0]?.id ?? 0,
        code: '',
        name: '',
        area_type: 'indoor' as 'indoor' | 'outdoor',
        qr_token: '',
        is_active: true,
    });

    const draggableTables = useMemo<DraggableTable[]>(
        () =>
            floors.flatMap((floor) =>
                floor.tables.map((table) => ({
                    ...table,
                    floorId: floor.id,
                    floorName: floor.name,
                    floorNumber: floor.floorNumber,
                })),
            ),
        [floors],
    );

    const moveTable = (tableId: number, targetFloorId: number, targetAreaType: 'indoor' | 'outdoor') => {
        if (!schemaReady) {
            return;
        }

        router.patch(
            `/admin/management/tables/${tableId}`,
            {
                cafe_floor_id: targetFloorId,
                area_type: targetAreaType,
            },
            { preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Management" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
                    <p className="text-xs font-semibold tracking-[0.2em] text-stone-500 uppercase">Admin Console</p>
                    <h1 className="mt-1 text-2xl font-bold text-stone-900">Kelola Menu, Kategori, dan Lantai Cafe</h1>
                    <p className="mt-2 text-sm text-stone-600">
                        Atur kategori menu, item makanan/minuman, serta konfigurasi lantai indoor/outdoor untuk kebutuhan operasional harian.
                    </p>

                    {flash?.success ? (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    ) : null}

                    {flash?.error ? (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {flash.error}
                        </div>
                    ) : null}

                    {!schemaReady && schemaMessage ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            {schemaMessage}
                        </div>
                    ) : null}
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                        <p className="text-sm text-orange-900">Kategori Menu</p>
                        <p className="mt-1 text-3xl font-bold text-orange-800">{categories.length}</p>
                    </article>
                    <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                        <p className="text-sm text-sky-900">Total Item Menu</p>
                        <p className="mt-1 text-3xl font-bold text-sky-800">{menuItems.length}</p>
                    </article>
                    <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm text-emerald-900">Total Lantai</p>
                        <p className="mt-1 text-3xl font-bold text-emerald-800">{floors.length}</p>
                    </article>
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                    <article id="kelola-kategori" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm scroll-mt-24">
                        <h2 className="text-lg font-semibold text-stone-900">Tambah Kategori</h2>
                        <form
                            className="mt-4 space-y-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                categoryForm.post('/admin/management/categories', {
                                    preserveScroll: true,
                                    onSuccess: () => categoryForm.reset('name', 'description'),
                                });
                            }}
                        >
                            <input
                                type="text"
                                placeholder="Nama kategori"
                                value={categoryForm.data.name}
                                onChange={(event) => categoryForm.setData('name', event.target.value)}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Deskripsi singkat"
                                value={categoryForm.data.description}
                                onChange={(event) => categoryForm.setData('description', event.target.value)}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    placeholder="Urutan"
                                    min={0}
                                    value={categoryForm.data.sort_order}
                                    onChange={(event) =>
                                        categoryForm.setData('sort_order', Number(event.target.value) || 0)
                                    }
                                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                />
                                <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700">
                                    <input
                                        type="checkbox"
                                        checked={categoryForm.data.is_active}
                                        onChange={(event) => categoryForm.setData('is_active', event.target.checked)}
                                    />
                                    Aktif
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={categoryForm.processing || !schemaReady}
                                className="w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
                            >
                                Simpan kategori
                            </button>
                        </form>
                    </article>

                    <article id="kelola-menu" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm scroll-mt-24">
                        <h2 className="text-lg font-semibold text-stone-900">Tambah Item Menu</h2>
                        <form
                            className="mt-4 space-y-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                menuItemForm.post('/admin/management/menu-items', {
                                    preserveScroll: true,
                                    onSuccess: () =>
                                        menuItemForm.reset('name', 'description', 'price', 'image_url'),
                                });
                            }}
                        >
                            <select
                                value={menuItemForm.data.menu_category_id}
                                onChange={(event) =>
                                    menuItemForm.setData('menu_category_id', Number(event.target.value))
                                }
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                required
                                disabled={!schemaReady}
                            >
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Nama menu"
                                value={menuItemForm.data.name}
                                onChange={(event) => menuItemForm.setData('name', event.target.value)}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Deskripsi"
                                value={menuItemForm.data.description}
                                onChange={(event) => menuItemForm.setData('description', event.target.value)}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                            />
                            <input
                                type="number"
                                placeholder="Harga"
                                min={0}
                                value={menuItemForm.data.price}
                                onChange={(event) =>
                                    menuItemForm.setData('price', Number(event.target.value) || 0)
                                }
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                required
                            />
                            <input
                                type="url"
                                placeholder="Image URL (opsional)"
                                value={menuItemForm.data.image_url}
                                onChange={(event) => menuItemForm.setData('image_url', event.target.value)}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    placeholder="Urutan"
                                    min={0}
                                    value={menuItemForm.data.sort_order}
                                    onChange={(event) =>
                                        menuItemForm.setData('sort_order', Number(event.target.value) || 0)
                                    }
                                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                />
                                <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700">
                                    <input
                                        type="checkbox"
                                        checked={menuItemForm.data.is_available}
                                        onChange={(event) =>
                                            menuItemForm.setData('is_available', event.target.checked)
                                        }
                                    />
                                    Tersedia
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={menuItemForm.processing || categories.length === 0 || !schemaReady}
                                className="w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
                            >
                                Simpan item menu
                            </button>
                        </form>
                    </article>
                </section>

                <section id="kelola-lantai-area" className="grid gap-5 xl:grid-cols-2 scroll-mt-24">
                    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-stone-900">Tambah Lantai</h2>
                        <form
                            className="mt-4 space-y-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                floorForm.post('/admin/management/floors', {
                                    preserveScroll: true,
                                    onSuccess: () => floorForm.reset('name'),
                                });
                            }}
                        >
                            <input
                                type="text"
                                placeholder="Nama lantai"
                                value={floorForm.data.name}
                                onChange={(event) => floorForm.setData('name', event.target.value)}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                required
                            />
                            <input
                                type="number"
                                min={1}
                                placeholder="Nomor lantai"
                                value={floorForm.data.floor_number}
                                onChange={(event) =>
                                    floorForm.setData('floor_number', Number(event.target.value) || 1)
                                }
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                required
                            />
                            <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700">
                                <input
                                    type="checkbox"
                                    checked={floorForm.data.is_active}
                                    onChange={(event) => floorForm.setData('is_active', event.target.checked)}
                                />
                                Lantai aktif
                            </label>
                            <button
                                type="submit"
                                disabled={floorForm.processing || !schemaReady}
                                className="w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
                            >
                                Simpan lantai
                            </button>
                        </form>
                    </article>

                    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-stone-900">Tambah Meja</h2>
                        <form
                            className="mt-4 space-y-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                tableForm.post('/admin/management/tables', {
                                    preserveScroll: true,
                                    onSuccess: () => tableForm.reset('code', 'name', 'qr_token'),
                                });
                            }}
                        >
                            <select
                                value={tableForm.data.cafe_floor_id}
                                onChange={(event) =>
                                    tableForm.setData('cafe_floor_id', Number(event.target.value))
                                }
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                required
                                disabled={!schemaReady}
                            >
                                {floors.map((floor) => (
                                    <option key={floor.id} value={floor.id}>
                                        {floor.name} (Lantai {floor.floorNumber})
                                    </option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Kode meja"
                                    value={tableForm.data.code}
                                    onChange={(event) => tableForm.setData('code', event.target.value)}
                                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Nama meja"
                                    value={tableForm.data.name}
                                    onChange={(event) => tableForm.setData('name', event.target.value)}
                                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                    required
                                />
                            </div>
                            <select
                                value={tableForm.data.area_type}
                                onChange={(event) =>
                                    tableForm.setData('area_type', event.target.value as 'indoor' | 'outdoor')
                                }
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                required
                            >
                                <option value="indoor">Indoor</option>
                                <option value="outdoor">Outdoor</option>
                            </select>
                            <input
                                type="text"
                                placeholder="QR token (opsional)"
                                value={tableForm.data.qr_token}
                                onChange={(event) => tableForm.setData('qr_token', event.target.value)}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                            />
                            <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700">
                                <input
                                    type="checkbox"
                                    checked={tableForm.data.is_active}
                                    onChange={(event) => tableForm.setData('is_active', event.target.checked)}
                                />
                                Meja aktif
                            </label>
                            <button
                                type="submit"
                                disabled={tableForm.processing || floors.length === 0 || !schemaReady}
                                className="w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
                            >
                                Simpan meja
                            </button>
                        </form>
                    </article>
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-stone-900">Daftar Kategori & Menu</h2>
                        <div className="mt-4 space-y-3">
                            {categories.map((category) => {
                                const count = menuItems.filter(
                                    (item) => item.categoryName === category.name,
                                ).length;

                                return (
                                    <div key={category.id} className="rounded-xl border border-stone-200 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-semibold text-stone-900">{category.name}</p>
                                            <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
                                                {count} item
                                            </span>
                                        </div>
                                        {category.description ? (
                                            <p className="mt-1 text-sm text-stone-600">{category.description}</p>
                                        ) : null}
                                    </div>
                                );
                            })}

                            <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-stone-200 p-3">
                                {menuItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 border-b border-stone-100 pb-2 last:border-b-0">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-stone-900">{item.name}</p>
                                            <p className="text-xs text-stone-500">{item.categoryName ?? item.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-stone-800">{currency.format(item.price)}</p>
                                            <p className={`text-xs ${item.isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {item.isAvailable ? 'Tersedia' : 'Nonaktif'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-stone-900">Konfigurasi Lantai & Area Meja</h2>
                        <div className="mt-4 space-y-4">
                            {floors.map((floor) => (
                                <div key={floor.id} className="rounded-xl border border-stone-200 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-stone-900">
                                                {floor.name} - Lantai {floor.floorNumber}
                                            </p>
                                            <p className="text-xs text-stone-600">
                                                Indoor: {floor.indoorTableCount} | Outdoor: {floor.outdoorTableCount}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-2 py-1 text-xs ${floor.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                                            {floor.isActive ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid gap-2">
                                        {floor.tables.map((table) => (
                                            <form
                                                key={table.id}
                                                className="grid gap-2 rounded-lg border border-stone-200 p-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
                                                onSubmit={(event) => {
                                                    event.preventDefault();
                                                    const formData = new FormData(event.currentTarget);
                                                    const floorId = Number(formData.get('cafe_floor_id'));
                                                    const areaType = String(formData.get('area_type')) as 'indoor' | 'outdoor';
                                                    const isActive = formData.get('is_active') === 'on';

                                                    router.patch(`/admin/management/tables/${table.id}`, {
                                                        cafe_floor_id: floorId,
                                                        area_type: areaType,
                                                        is_active: isActive,
                                                    }, {
                                                        preserveScroll: true,
                                                    });
                                                }}
                                            >
                                                <p className="text-sm font-medium text-stone-800">{table.code} - {table.name}</p>
                                                <select
                                                    name="cafe_floor_id"
                                                    defaultValue={floor.id}
                                                    className="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                                                >
                                                    {floors.map((floorOption) => (
                                                        <option key={floorOption.id} value={floorOption.id}>
                                                            {floorOption.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    name="area_type"
                                                    defaultValue={table.areaType}
                                                    className="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                                                >
                                                    <option value="indoor">Indoor</option>
                                                    <option value="outdoor">Outdoor</option>
                                                </select>
                                                <label className="flex items-center gap-2 text-xs text-stone-700">
                                                    <input type="checkbox" name="is_active" defaultChecked={table.isActive} />
                                                    Aktif
                                                </label>
                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-stone-900 px-3 py-1 text-xs font-semibold text-white hover:bg-stone-700"
                                                >
                                                    Update
                                                </button>
                                            </form>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <section id="kelola-meja-drag" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm scroll-mt-24">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-stone-900">Kelola Meja (Drag & Drop)</h2>
                            <p className="mt-1 text-sm text-stone-600">
                                Seret kartu meja ke kolom indoor/outdoor pada lantai tujuan untuk memindahkan meja dengan cepat.
                            </p>
                        </div>
                        {draggingTableId ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                Sedang menyeret meja #{draggingTableId}
                            </span>
                        ) : null}
                    </div>

                    <div className="mt-4 space-y-5">
                        {floors.map((floor) => {
                            const indoorTables = draggableTables.filter(
                                (table) => table.floorId === floor.id && table.areaType === 'indoor',
                            );
                            const outdoorTables = draggableTables.filter(
                                (table) => table.floorId === floor.id && table.areaType === 'outdoor',
                            );

                            return (
                                <article key={`drag-floor-${floor.id}`} className="rounded-xl border border-stone-200 p-4">
                                    <p className="font-semibold text-stone-900">
                                        {floor.name} - Lantai {floor.floorNumber}
                                    </p>
                                    <p className="mt-1 text-xs text-stone-600">
                                        Drop target tersedia untuk area indoor dan outdoor.
                                    </p>

                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        {([
                                            ['indoor', 'Indoor', indoorTables],
                                            ['outdoor', 'Outdoor', outdoorTables],
                                        ] as const).map(([areaType, areaLabel, tables]) => (
                                            <section
                                                key={`${floor.id}-${areaType}`}
                                                aria-label={`Drop zone ${areaLabel} ${floor.name}`}
                                                onDragOver={(event) => {
                                                    event.preventDefault();
                                                }}
                                                onDrop={(event) => {
                                                    event.preventDefault();
                                                    const rawId = event.dataTransfer.getData('text/plain');
                                                    const tableId = Number(rawId);

                                                    if (!Number.isFinite(tableId) || tableId <= 0) {
                                                        return;
                                                    }

                                                    moveTable(tableId, floor.id, areaType);
                                                    setDraggingTableId(null);
                                                }}
                                                className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3"
                                            >
                                                <p className="text-xs font-semibold tracking-wide text-stone-700 uppercase">
                                                    {areaLabel}
                                                </p>

                                                <div className="mt-2 space-y-2">
                                                    {tables.length === 0 ? (
                                                        <p className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
                                                            Belum ada meja di area ini.
                                                        </p>
                                                    ) : (
                                                        tables.map((table) => (
                                                            <button
                                                                key={`drag-table-${table.id}`}
                                                                type="button"
                                                                draggable={schemaReady}
                                                                onDragStart={(event) => {
                                                                    event.dataTransfer.setData('text/plain', String(table.id));
                                                                    setDraggingTableId(table.id);
                                                                }}
                                                                onDragEnd={() => {
                                                                    setDraggingTableId(null);
                                                                }}
                                                                className="w-full cursor-grab rounded-lg border border-stone-200 bg-white px-3 py-2 text-left active:cursor-grabbing"
                                                            >
                                                                <p className="text-sm font-semibold text-stone-900">
                                                                    {table.code} - {table.name}
                                                                </p>
                                                                <p className="text-xs text-stone-500">
                                                                    Asal: {table.floorName} ({table.areaType})
                                                                </p>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
