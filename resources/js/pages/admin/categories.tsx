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

type Category = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    menuItemsCount: number;
};

type Props = {
    categories: Category[];
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
    { title: 'Kelola Kategori', href: '/admin/management/categories' },
];

export default function AdminCategoriesPage({ categories, schemaReady = true, schemaMessage = null }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    const categoryForm = useForm({
        name: '',
        description: '',
        sort_order: '',
        is_active: true,
    });

    const editCategoryForm = useForm({
        name: '',
        description: '',
        sort_order: '',
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

    const submitCreateCategory = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        categoryForm.transform((data) => ({
            ...data,
            sort_order: data.sort_order === '' ? null : Number(data.sort_order),
        }));

        categoryForm.post('/admin/management/categories', {
            preserveScroll: true,
            onSuccess: (page) => {
                const nextFlash = (page.props as SharedProps).flash;
                if (nextFlash?.error) {
                    return;
                }

                categoryForm.reset('name', 'description', 'sort_order');
            },
        });
    };

    const startEditCategory = (category: Category) => {
        setEditingCategoryId(category.id);
        editCategoryForm.setData({
            name: category.name,
            description: category.description ?? '',
            sort_order: category.sortOrder > 0 ? String(category.sortOrder) : '',
            is_active: category.isActive,
        });
    };

    const submitEditCategory = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingCategoryId) {
            return;
        }

        editCategoryForm.transform((data) => ({
            ...data,
            sort_order: data.sort_order === '' ? null : Number(data.sort_order),
        }));

        editCategoryForm.patch(`/admin/management/categories/${editingCategoryId}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const nextFlash = (page.props as SharedProps).flash;
                if (nextFlash?.error) {
                    return;
                }

                setEditingCategoryId(null);
                editCategoryForm.reset();
            },
        });
    };

    const destroyCategory = () => {
        if (!deletingCategory) {
            return;
        }

        router.delete(`/admin/management/categories/${deletingCategory.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingCategory(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Kelola Kategori" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="selia-surface p-5 md:p-6">
                    <p className="selia-chip">Admin Console</p>
                    <h1 className="selia-title mt-1 text-2xl">Kelola Kategori Menu</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Buat kategori baru untuk makanan, minuman, dan item lainnya.</p>

                    {!schemaReady && schemaMessage ? <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{schemaMessage}</div> : null}
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Tambah Kategori</h2>
                        <form className="mt-4 space-y-3" onSubmit={submitCreateCategory}>
                            <input type="text" placeholder="Nama kategori" value={categoryForm.data.name} onChange={(event) => categoryForm.setData('name', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" required />
                            <input type="text" placeholder="Deskripsi singkat" value={categoryForm.data.description} onChange={(event) => categoryForm.setData('description', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="Urutan (opsional)" min={0} value={categoryForm.data.sort_order} onChange={(event) => categoryForm.setData('sort_order', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                                <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                                    <input type="checkbox" checked={categoryForm.data.is_active} onChange={(event) => categoryForm.setData('is_active', event.target.checked)} />
                                    Aktif
                                </label>
                            </div>
                            <button type="submit" disabled={categoryForm.processing || !schemaReady} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50">
                                Simpan kategori
                            </button>
                        </form>
                    </article>

                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Daftar Kategori</h2>
                        <div className="mt-4 space-y-3">
                            {categories.map((category) => (
                                <div key={category.id} className="rounded-xl border border-border bg-card/70 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-foreground">{category.name}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={category.isActive ? 'success' : 'outline'}>{category.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                                            <span className="rounded-full border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">{category.menuItemsCount} item</span>
                                        </div>
                                    </div>
                                    {category.description ? <p className="mt-1 text-sm text-muted-foreground">{category.description}</p> : null}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button type="button" onClick={() => startEditCategory(category)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => setDeletingCategory(category)} className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300">
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <Dialog
                    open={editingCategoryId !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingCategoryId(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Kategori</DialogTitle>
                            <DialogDescription>Perbarui data kategori agar daftar menu tetap rapi.</DialogDescription>
                        </DialogHeader>

                        <form className="space-y-3" onSubmit={submitEditCategory}>
                            <input
                                type="text"
                                placeholder="Nama kategori"
                                value={editCategoryForm.data.name}
                                onChange={(event) => editCategoryForm.setData('name', event.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Deskripsi singkat"
                                value={editCategoryForm.data.description}
                                onChange={(event) => editCategoryForm.setData('description', event.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    placeholder="Urutan (opsional)"
                                    min={0}
                                    value={editCategoryForm.data.sort_order}
                                    onChange={(event) => editCategoryForm.setData('sort_order', event.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                                <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                                    <input
                                        type="checkbox"
                                        checked={editCategoryForm.data.is_active}
                                        onChange={(event) => editCategoryForm.setData('is_active', event.target.checked)}
                                    />
                                    Aktif
                                </label>
                            </div>

                            <DialogFooter>
                                <button
                                    type="button"
                                    onClick={() => setEditingCategoryId(null)}
                                    className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editCategoryForm.processing || !schemaReady}
                                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                                >
                                    Simpan perubahan
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog
                    open={Boolean(deletingCategory)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeletingCategory(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus kategori ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {deletingCategory
                                    ? `Kategori ${deletingCategory.name} akan dihapus permanen. Lanjutkan?`
                                    : 'Kategori akan dihapus permanen.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={destroyCategory}
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
