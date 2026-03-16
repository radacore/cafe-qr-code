import { Toaster as Sonner } from 'sonner';

import { useAppearance } from '@/hooks/use-appearance';

export function Toaster() {
    const { resolvedAppearance } = useAppearance();

    return (
        <Sonner
            richColors
            closeButton
            position="top-center"
            theme={resolvedAppearance}
            toastOptions={{
                className: 'rounded-xl border border-border bg-card text-foreground',
            }}
        />
    );
}
