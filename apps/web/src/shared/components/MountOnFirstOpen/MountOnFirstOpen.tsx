import { Suspense, useState, type ReactNode } from 'react';

type Props = {
    open: boolean;
    children: ReactNode;
};

/**
 * Renders a lazy, always-available dialog only once it has been opened, so
 * its chunk stays out of the initial load. It stays mounted afterwards so the
 * close transition still plays.
 */
const MountOnFirstOpen = ({ open, children }: Props) => {
    const [opened, setOpened] = useState(open);
    if (open && !opened) {
        setOpened(true);
    }

    return opened ? <Suspense fallback={null}>{children}</Suspense> : null;
};

export default MountOnFirstOpen;
