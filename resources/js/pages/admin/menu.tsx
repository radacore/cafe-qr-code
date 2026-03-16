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
};

type MenuItem = {
    id: number;
    menuCategoryId: number | null;
    name: string;
    category: string | null;
    categoryName: string | null;
    description: string | null;
    price: number;
    isAvailable: boolean;
    imageUrl: string | null;
    sortOrder: number;
};

type Props = {
    categories: Category[];
    menuItems: MenuItem[];
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
    { title: 'Admin Management', href: '/admin/management/categories' },
    { title: 'Kelola Menu', href: '/admin/management/menu' },
];

export default function AdminMenuPage({ categories, menuItems, schemaReady = true, schemaMessage = null }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const [editingMenuItemId, setEditingMenuItemId] = useState<number | null>(null);
    const [deletingMenuItem, setDeletingMenuItem] = useState<MenuItem | null>(null);

    const menuItemForm = useForm({
        menu_category_id: categories[0]?.id ? String(categories[0].id) : '',
        name: '',
        description: '',
        price: '',
        image_url: '',
        sort_order: '',
        is_available: true,
    });

    const editMenuItemForm = useForm({
        menu_category_id: '',
        name: '',
        description: '',
        price: '',
        image_url: '',
        sort_order: '',
        is_available: true,
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

    const submitCreateMenuItem = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        menuItemForm.transform((data) => ({
            ...data,
            menu_category_id: Number(data.menu_category_id),
            price: Number(data.price),
            sort_order: data.sort_order === '' ? null : Number(data.sort_order),
        }));

        menuItemForm.post('/admin/management/menu-items', {
            preserveScroll: true,
            onSuccess: (page) => {
                const nextFlash = (page.props as SharedProps).flash;
                if (nextFlash?.error) {
                    return;
                }

                menuItemForm.reset('name', 'description', 'price', 'image_url', 'sort_order');
            },
        });
    };

    const startEditMenuItem = (item: MenuItem) => {
        setEditingMenuItemId(item.id);
        editMenuItemForm.setData({
            menu_category_id: item.menuCategoryId ? String(item.menuCategoryId) : '',
            name: item.name,
            description: item.description ?? '',
            price: String(item.price),
            image_url: item.imageUrl ?? '',
            sort_order: item.sortOrder > 0 ? String(item.sortOrder) : '',
            is_available: item.isAvailable,
        });
    };

    const submitEditMenuItem = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingMenuItemId) {
            return;
        }

        editMenuItemForm.transform((data) => ({
            ...data,
            menu_category_id: Number(data.menu_category_id),
            price: Number(data.price),
            sort_order: data.sort_order === '' ? null : Number(data.sort_order),
        }));

        editMenuItemForm.patch(`/admin/management/menu-items/${editingMenuItemId}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const nextFlash = (page.props as SharedProps).flash;
                if (nextFlash?.error) {
                    return;
                }

                setEditingMenuItemId(null);
                editMenuItemForm.reset();
            },
        });
    };

    const destroyMenuItem = () => {
        if (!deletingMenuItem) {
            return;
        }

        router.delete(`/admin/management/menu-items/${deletingMenuItem.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingMenuItem(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Kelola Menu" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="selia-surface p-5 md:p-6">
                    <p className="selia-chip">Admin Console</p>
                    <h1 className="selia-title mt-1 text-2xl">Kelola Item Menu</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Tambah menu baru dengan harga, gambar, dan ketersediaan.</p>
                    {!schemaReady && schemaMessage ? <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{schemaMessage}</div> : null}
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Tambah Item Menu</h2>
                        <form className="mt-4 space-y-3" onSubmit={submitCreateMenuItem}>
                            <select value={menuItemForm.data.menu_category_id} onChange={(event) => menuItemForm.setData('menu_category_id', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" required disabled={!schemaReady}>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                            <input type="text" placeholder="Nama menu" value={menuItemForm.data.name} onChange={(event) => menuItemForm.setData('name', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" required />
                            <input type="text" placeholder="Deskripsi" value={menuItemForm.data.description} onChange={(event) => menuItemForm.setData('description', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                            <input type="number" placeholder="Harga" min={0} value={menuItemForm.data.price} onChange={(event) => menuItemForm.setData('price', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" required />
                            <input type="url" placeholder="Image URL (opsional)" value={menuItemForm.data.image_url} onChange={(event) => menuItemForm.setData('image_url', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="Urutan (opsional)" min={0} value={menuItemForm.data.sort_order} onChange={(event) => menuItemForm.setData('sort_order', event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                                <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                                    <input type="checkbox" checked={menuItemForm.data.is_available} onChange={(event) => menuItemForm.setData('is_available', event.target.checked)} />
                                    Tersedia
                                </label>
                            </div>
                            <button type="submit" disabled={menuItemForm.processing || categories.length === 0 || !schemaReady} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50">
                                Simpan item menu
                            </button>
                        </form>
                    </article>

                    <article className="selia-surface p-5">
                        <h2 className="text-lg font-semibold text-foreground">Daftar Menu</h2>
                        <div className="mt-4 max-h-[520px] space-y-2 overflow-auto rounded-xl border border-border bg-card/60 p-3">
                            {menuItems.map((item) => (
                                <div key={item.id} className="border-b border-border/60 pb-2 last:border-b-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.categoryName ?? item.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-foreground">{currency.format(item.price)}</p>
                                            <Badge variant={item.isAvailable ? 'success' : 'outline'}>{item.isAvailable ? 'Tersedia' : 'Nonaktif'}</Badge>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button type="button" onClick={() => startEditMenuItem(item)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => setDeletingMenuItem(item)} className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300">
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <Dialog
                    open={editingMenuItemId !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingMenuItemId(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Item Menu</DialogTitle>
                            <DialogDescription>Perbarui detail menu tanpa meninggalkan halaman.</DialogDescription>
                        </DialogHeader>

                        <form className="space-y-3" onSubmit={submitEditMenuItem}>
                            <select
                                value={editMenuItemForm.data.menu_category_id}
                                onChange={(event) => editMenuItemForm.setData('menu_category_id', event.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                required
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
                                value={editMenuItemForm.data.name}
                                onChange={(event) => editMenuItemForm.setData('name', event.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Deskripsi"
                                value={editMenuItemForm.data.description}
                                onChange={(event) => editMenuItemForm.setData('description', event.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                            />
                            <input
                                type="number"
                                placeholder="Harga"
                                min={0}
                                value={editMenuItemForm.data.price}
                                onChange={(event) => editMenuItemForm.setData('price', event.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                required
                            />
                            <input
                                type="url"
                                placeholder="Image URL (opsional)"
                                value={editMenuItemForm.data.image_url}
                                onChange={(event) => editMenuItemForm.setData('image_url', event.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    placeholder="Urutan (opsional)"
                                    min={0}
                                    value={editMenuItemForm.data.sort_order}
                                    onChange={(event) => editMenuItemForm.setData('sort_order', event.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                                <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                                    <input
                                        type="checkbox"
                                        checked={editMenuItemForm.data.is_available}
                                        onChange={(event) => editMenuItemForm.setData('is_available', event.target.checked)}
                                    />
                                    Tersedia
                                </label>
                            </div>

                            <DialogFooter>
                                <button
                                    type="button"
                                    onClick={() => setEditingMenuItemId(null)}
                                    className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editMenuItemForm.processing || !schemaReady}
                                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                                >
                                    Simpan perubahan
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog
                    open={Boolean(deletingMenuItem)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeletingMenuItem(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus item menu ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {deletingMenuItem
                                    ? `Item ${deletingMenuItem.name} akan dihapus permanen dari daftar menu.`
                                    : 'Item menu akan dihapus permanen.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={destroyMenuItem}
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
