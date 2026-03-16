import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-sidebar-primary/90 text-sidebar-primary-foreground shadow-[0_8px_28px_-14px_rgba(8,145,178,0.95)]">
                <AppLogoIcon className="size-5 fill-current" />
            </div>
            <div className="ml-2 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold tracking-tight">
                    Selia Cafe Console
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">Realtime Operations</span>
            </div>
        </>
    );
}
