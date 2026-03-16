import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toastManager } from '@/lib/toast-manager';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

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
    { title: 'Kelola Lantai & Area', href: '/admin/management/floors' },
];

export default function AdminFloorsPage({ floors, schemaReady = true, schemaMessage = null }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
    const [deletingFloor, setDeletingFloor] = useState<Floor | null>(null);

    const floorForm = useForm({
        name: '',
        floor_number: floors.length + 1,
        is_active: true,
    });

    const editFloorForm = useForm({
        name: '',
        floor_number: 1,
        is_active: true,
    });

    useEffect(() => {
        if (flash?.error) {
            toastManager.add({ title: flash.error, type: 'error' });
            return;
        }

        if (flash?.success) {
            toastManager.add({ title: flash.success, type: 'success' });
        }
    }, [flash?.error, flash?.success]);

    const submitCreateFloor = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        floorForm.post('/admin/management/floors', {
            preserveScroll: true,
            onSuccess: (page) => {
                const nextFlash = (page.props as SharedProps).flash;
                if (nextFlash?.error) {
                    return;
                }

                floorForm.reset('name');
            },
        });
    };

    const startEditFloor = (floor: Floor) => {
        setEditingFloorId(floor.id);
        editFloorForm.setData({
            name: floor.name,
            floor_number: floor.floorNumber,
            is_active: floor.isActive,
        });
    };

    const submitEditFloor = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingFloorId) {
            return;
        }

        editFloorForm.patch(`/admin/management/floors/${editingFloorId}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const nextFlash = (page.props as SharedProps).flash;
                if (nextFlash?.error) {
                    return;
                }

                setEditingFloorId(null);
                editFloorForm.reset();
            },
        });
    };

    const destroyFloor = () => {
        if (!deletingFloor) {
            return;
        }

        router.delete(`/admin/management/floors/${deletingFloor.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingFloor(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Kelola Lantai" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="selia-surface p-5 md:p-6">
                    <p className="selia-chip">Admin • Lantai</p>
                    <h1 className="selia-title mt-2 text-2xl">Kelola Lantai & Area</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Atur lantai cafe dan pantau jumlah meja indoor maupun outdoor.</p>
                    {!schemaReady && schemaMessage ? <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{schemaMessage}</div> : null}
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Tambah Lantai</h2>
                        <form className="mt-4 space-y-3" onSubmit={submitCreateFloor}>
                            <input type="text" placeholder="Nama lantai" value={floorForm.data.name} onChange={(event) => floorForm.setData('name', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" required />
                            <input type="number" min={1} placeholder="Nomor lantai" value={floorForm.data.floor_number} onChange={(event) => floorForm.setData('floor_number', Number(event.target.value) || 1)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" required />
                            <label className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground">
                                <input type="checkbox" checked={floorForm.data.is_active} onChange={(event) => floorForm.setData('is_active', event.target.checked)} />
                                Lantai aktif
                            </label>
                            <button type="submit" disabled={floorForm.processing || !schemaReady} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50">
                                Simpan lantai
                            </button>
                        </form>
                    </article>

                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Daftar Lantai</h2>
                        <div className="mt-4 space-y-3">
                            {floors.map((floor) => (
                                <div key={floor.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-foreground">{floor.name} - Lantai {floor.floorNumber}</p>
                                            <p className="text-xs text-muted-foreground">Indoor: {floor.indoorTableCount} | Outdoor: {floor.outdoorTableCount}</p>
                                        </div>
                                        <Badge variant={floor.isActive ? 'success' : 'outline'}>{floor.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button type="button" onClick={() => startEditFloor(floor)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => setDeletingFloor(floor)} className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300">
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <Dialog
                    open={editingFloorId !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingFloorId(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Lantai</DialogTitle>
                            <DialogDescription>Perbarui identitas lantai tanpa mengganggu alur operasional.</DialogDescription>
                        </DialogHeader>

                        <form className="space-y-3" onSubmit={submitEditFloor}>
                            <input
                                type="text"
                                placeholder="Nama lantai"
                                value={editFloorForm.data.name}
                                onChange={(event) => editFloorForm.setData('name', event.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                                required
                            />
                            <input
                                type="number"
                                min={1}
                                placeholder="Nomor lantai"
                                value={editFloorForm.data.floor_number}
                                onChange={(event) => editFloorForm.setData('floor_number', Number(event.target.value) || 1)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                                required
                            />
                            <label className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground">
                                <input
                                    type="checkbox"
                                    checked={editFloorForm.data.is_active}
                                    onChange={(event) => editFloorForm.setData('is_active', event.target.checked)}
                                />
                                Lantai aktif
                            </label>

                            <DialogFooter>
                                <button
                                    type="button"
                                    onClick={() => setEditingFloorId(null)}
                                    className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editFloorForm.processing || !schemaReady}
                                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                                >
                                    Simpan perubahan
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog
                    open={Boolean(deletingFloor)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeletingFloor(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus lantai ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {deletingFloor
                                    ? `${deletingFloor.name} akan dihapus permanen. Pastikan tidak ada meja aktif yang masih terkait.`
                                    : 'Lantai akan dihapus permanen.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={destroyFloor}
                            >
                                Ya, Hapus
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
