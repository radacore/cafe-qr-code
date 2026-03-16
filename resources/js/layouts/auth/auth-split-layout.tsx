import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid min-h-svh items-center px-6 py-8 lg:grid-cols-2 lg:px-0 lg:py-0">
            <div className="relative hidden h-full flex-col justify-between overflow-hidden border-r border-border/60 bg-card/65 p-10 lg:flex">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_44%),radial-gradient(circle_at_80%_72%,hsl(var(--accent)/0.14),transparent_40%)]" />

                <Link href={home()} className="relative z-10 inline-flex items-center gap-3 text-lg font-semibold text-foreground">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
                        <AppLogoIcon className="size-7 fill-current text-primary" />
                    </span>
                    {name}
                </Link>

                <div className="relative z-10 max-w-md space-y-3">
                    <p className="selia-chip">Selia Authentication</p>
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                        Access your cafe operations instantly
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                        One place for cashier, kitchen, and floor operations with real-time order flow.
                    </p>
                </div>
            </div>

            <div className="w-full lg:p-10">
                <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-6">
                    <Link href={home()} className="relative z-10 flex items-center justify-center lg:hidden">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
                            <AppLogoIcon className="size-7 fill-current text-primary" />
                        </span>
                    </Link>

                    <div className="selia-surface space-y-6 p-7 md:p-8">
                        <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                            <p className="text-sm text-balance text-muted-foreground">{description}</p>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
