import { Link, usePage } from '@inertiajs/react';
import { BookOpen, ClipboardList, Folder, LayoutGrid, Settings2, Wallet } from 'lucide-react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';

type SidebarProps = {
    auth: {
        user: {
            roles?: string[];
        } | null;
    };
};

const footerNavItems: NavItem[] = [
    {
        title: 'Selia Docs',
        href: 'https://selia.earth/docs/introduction',
        icon: Folder,
    },
    {
        title: 'Selia Laravel',
        href: 'https://selia.earth/docs/installation/laravel',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { auth } = usePage<SidebarProps>().props;
    const roles = auth.user?.roles ?? [];

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
    ];

    if (roles.includes('admin') || roles.includes('cashier')) {
        mainNavItems.push({
            title: 'Tagihan Kasir',
            href: '/cashier/orders',
            icon: ClipboardList,
        });

        mainNavItems.push({
            title: 'Keuangan',
            href: '/finance',
            icon: Wallet,
        });
    }

    if (roles.includes('admin') || roles.includes('kitchen') || roles.includes('waiter')) {
        mainNavItems.push({
            title: 'Papan Dapur',
            href: '/kitchen/orders',
            icon: ClipboardList,
        });
    }

    if (roles.includes('admin')) {
        mainNavItems.push({
            title: 'Manajemen Admin',
            href: '/admin/management/categories',
            icon: Settings2,
            children: [
                { title: 'Kelola Kategori', href: '/admin/management/categories' },
                { title: 'Kelola Menu', href: '/admin/management/menu' },
                { title: 'Kelola Lantai & Area', href: '/admin/management/floors' },
                { title: 'Kelola Meja (Drag)', href: '/admin/management/tables' },
            ],
        });
    }

    return (
        <Sidebar collapsible="icon" variant="inset" className="bg-sidebar/90 backdrop-blur">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
