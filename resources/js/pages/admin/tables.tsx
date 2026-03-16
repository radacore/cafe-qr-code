import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type FloorTable = {
    id: number;
    code: string;
    name: string;
    areaType: 'indoor' | 'outdoor';
    isActive: boolean;
    qrToken: string;
    scanUrl: string;
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

type Props = {
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Admin Management', href: '/admin/management/categories' },
    { title: 'Kelola Meja', href: '/admin/management/tables' },
];

export default function AdminTablesPage({ floors, schemaReady = true, schemaMessage = null }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const [draggingTableId, setDraggingTableId] = useState<number | null>(null);

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
        if (!schemaReady) return;

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
            <Head title="Admin - Kelola Meja" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="selia-surface p-5 md:p-6">
                    <p className="selia-chip">Admin • Meja</p>
                    <h1 className="selia-title mt-2 text-2xl">Kelola Meja (Drag & Drop)</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Tambah meja baru, update area indoor/outdoor, atau seret meja antar area.</p>
                    {flash?.success ? <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{flash.success}</div> : null}
                    {flash?.error ? <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{flash.error}</div> : null}
                    {!schemaReady && schemaMessage ? <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{schemaMessage}</div> : null}
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Tambah Meja</h2>
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
                            <select value={tableForm.data.cafe_floor_id} onChange={(event) => tableForm.setData('cafe_floor_id', Number(event.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" required disabled={!schemaReady}>
                                {floors.map((floor) => (
                                    <option key={floor.id} value={floor.id}>{floor.name} (Lantai {floor.floorNumber})</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Kode meja" value={tableForm.data.code} onChange={(event) => tableForm.setData('code', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" required />
                                <input type="text" placeholder="Nama meja" value={tableForm.data.name} onChange={(event) => tableForm.setData('name', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" required />
                            </div>
                            <select value={tableForm.data.area_type} onChange={(event) => tableForm.setData('area_type', event.target.value as 'indoor' | 'outdoor')} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" required>
                                <option value="indoor">Indoor</option>
                                <option value="outdoor">Outdoor</option>
                            </select>
                            <input type="text" placeholder="QR token (opsional)" value={tableForm.data.qr_token} onChange={(event) => tableForm.setData('qr_token', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                            <label className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground">
                                <input type="checkbox" checked={tableForm.data.is_active} onChange={(event) => tableForm.setData('is_active', event.target.checked)} />
                                Meja aktif
                            </label>
                            <button type="submit" disabled={tableForm.processing || floors.length === 0 || !schemaReady} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50">
                                Simpan meja
                            </button>
                        </form>
                    </article>

                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Update Cepat Meja</h2>
                        <div className="mt-4 space-y-4">
                            {floors.map((floor) => (
                                <div key={floor.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                                    <p className="font-semibold text-foreground">{floor.name} - Lantai {floor.floorNumber}</p>
                                    <div className="mt-3 grid gap-2">
                                        {floor.tables.map((table) => (
                                            <form
                                                key={table.id}
                                                className="grid gap-2 rounded-lg border border-border/70 bg-background/70 p-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto] md:items-center"
                                                onSubmit={(event) => {
                                                    event.preventDefault();
                                                    const formData = new FormData(event.currentTarget);
                                                    const floorId = Number(formData.get('cafe_floor_id'));
                                                    const areaType = String(formData.get('area_type')) as 'indoor' | 'outdoor';
                                                    const isActive = formData.get('is_active') === 'on';

                                                    router.patch(
                                                        `/admin/management/tables/${table.id}`,
                                                        {
                                                            cafe_floor_id: floorId,
                                                            area_type: areaType,
                                                            is_active: isActive,
                                                        },
                                                        { preserveScroll: true },
                                                    );
                                                }}
                                            >
                                                <p className="text-sm font-medium text-foreground">{table.code} - {table.name}</p>
                                                <select name="cafe_floor_id" defaultValue={floor.id} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
                                                    {floors.map((floorOption) => (
                                                        <option key={floorOption.id} value={floorOption.id}>{floorOption.name}</option>
                                                    ))}
                                                </select>
                                                <select name="area_type" defaultValue={table.areaType} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
                                                    <option value="indoor">Indoor</option>
                                                    <option value="outdoor">Outdoor</option>
                                                </select>
                                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <input type="checkbox" name="is_active" defaultChecked={table.isActive} />
                                                    Aktif
                                                </label>
                                                <button type="submit" className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-accent">Update</button>
                                                <Link href={`/admin/management/tables/${table.id}/print-qr`} className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20">
                                                    Print QR
                                                </Link>
                                            </form>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <section className="selia-surface p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-foreground">Pindah Meja Dengan Drag & Drop</h2>
                        {draggingTableId ? <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Sedang menyeret meja #{draggingTableId}</span> : null}
                    </div>

                    <div className="mt-4 space-y-5">
                        {floors.map((floor) => {
                            const indoorTables = draggableTables.filter((table) => table.floorId === floor.id && table.areaType === 'indoor');
                            const outdoorTables = draggableTables.filter((table) => table.floorId === floor.id && table.areaType === 'outdoor');

                            return (
                                <article key={`drag-floor-${floor.id}`} className="rounded-xl border border-border/70 bg-card/70 p-4">
                                    <p className="font-semibold text-foreground">{floor.name} - Lantai {floor.floorNumber}</p>

                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        {([
                                            ['indoor', 'Indoor', indoorTables],
                                            ['outdoor', 'Outdoor', outdoorTables],
                                        ] as const).map(([areaType, areaLabel, tables]) => (
                                            <form
                                                key={`${floor.id}-${areaType}`}
                                                onSubmit={(event) => event.preventDefault()}
                                                onDragOver={(event) => event.preventDefault()}
                                                onDrop={(event) => {
                                                    event.preventDefault();
                                                    const tableId = Number(event.dataTransfer.getData('text/plain'));
                                                    if (!Number.isFinite(tableId) || tableId <= 0) return;
                                                    moveTable(tableId, floor.id, areaType);
                                                    setDraggingTableId(null);
                                                }}
                                                className="rounded-xl border border-dashed border-border bg-muted/30 p-3"
                                            >
                                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{areaLabel}</p>
                                                <div className="mt-2 space-y-2">
                                                    {tables.length === 0 ? (
                                                        <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">Belum ada meja di area ini.</p>
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
                                                                onDragEnd={() => setDraggingTableId(null)}
                                                                className="w-full cursor-grab rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:bg-accent active:cursor-grabbing"
                                                            >
                                                                <p className="text-sm font-semibold text-foreground">{table.code} - {table.name}</p>
                                                                <p className="text-xs text-muted-foreground">Asal: {table.floorName} ({table.areaType})</p>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </form>
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
