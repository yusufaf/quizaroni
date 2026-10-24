import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUBJECT_IDS } from '@quizaroni/shared-types';
import type { SubjectId } from '@quizaroni/shared-types';
import { SubjectChip, SubjectChipGroup } from './ExploreStyles';
import { revealScrollLeft, scrollEdges } from './subjectFilter';

type Props = {
    value: SubjectId | null;
    onChange: (subject: SubjectId | null) => void;
};

type ChipKey = SubjectId | 'all';

/**
 * Single-select subject filter: native toggle buttons with aria-pressed, all
 * in the tab order (no roving tabindex), "All" first.
 */
const SubjectChips = ({ value, onChange }: Props) => {
    const { t } = useTranslation(['explore', 'common']);
    const groupRef = useRef<HTMLDivElement>(null);
    const chipRefs = useRef(new Map<ChipKey, HTMLButtonElement>());
    const [fade, setFade] = useState({ start: false, end: false });

    useLayoutEffect(() => {
        const el = groupRef.current;
        if (!el) return;
        const update = () => {
            const next = scrollEdges(el);
            setFade((prev) =>
                prev.start === next.start && prev.end === next.end
                    ? prev
                    : next
            );
        };
        update();
        el.addEventListener('scroll', update, { passive: true });
        let observer: ResizeObserver | undefined;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(update);
            observer.observe(el);
        } else {
            window.addEventListener('resize', update);
        }
        return () => {
            el.removeEventListener('scroll', update);
            if (observer) observer.disconnect();
            else window.removeEventListener('resize', update);
        };
    }, []);

    // A subject restored from the URL can sit past the end fade on a phone.
    // Assigned directly: scrollIntoView would scroll the window too. From
    // `sm` up the row isn't a scroll container, so this does nothing there.
    useLayoutEffect(() => {
        const group = groupRef.current;
        const chip = chipRefs.current.get(value ?? 'all');
        if (!group || !chip) return;
        const next = revealScrollLeft(group, chip);
        if (next !== null) group.scrollLeft = next;
    }, [value]);

    const options: { id: SubjectId | null; label: string }[] = [
        { id: null, label: t('community.allSubjects') },
        ...SUBJECT_IDS.map((id) => ({
            id,
            label: t(`common:subjects.${id}`),
        })),
    ];

    return (
        <SubjectChipGroup
            ref={groupRef}
            role="group"
            aria-label={t('community.subjectFilter')}
            data-fade-start={fade.start}
            data-fade-end={fade.end}
        >
            {options.map(({ id, label }) => {
                const key: ChipKey = id ?? 'all';
                const pressed = value === id;
                return (
                    <SubjectChip
                        key={key}
                        ref={(el) => {
                            if (el) chipRefs.current.set(key, el);
                            else chipRefs.current.delete(key);
                        }}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => {
                            if (!pressed) onChange(id);
                        }}
                    >
                        {label}
                    </SubjectChip>
                );
            })}
        </SubjectChipGroup>
    );
};

export default SubjectChips;
