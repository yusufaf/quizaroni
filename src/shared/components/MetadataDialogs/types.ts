import { ReactNode, ReactElement } from 'react';

export interface TabConfig {
    value: string;
    label: string;
    icon?: ReactElement;
}

export interface MetadataDialogShellProps {
    open: boolean;
    onClose: () => void;
    title: string;
    tabs: TabConfig[];
    selectedTab: string;
    onTabChange: (newTab: string) => void;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface InlineEditableListItemProps<T = any> {
    item: T;
    index: number;
    isEditing: boolean;
    isDeleteSelected: boolean;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
    onSave: (index: number, value: string) => void;
    onCancel: () => void;
    validateFn: (value: string, index: number) => ErrorInfo;
    renderContent?: (item: T, isEditing: boolean) => ReactNode;
    getItemKey?: (item: T) => string;
}

export interface MetadataListProps<T = any> {
    items: T[];
    editIndex: number | null;
    deleteIndices: number[];
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
    onSave: (index: number, value: string) => void;
    onCancel: () => void;
    validateFn: (value: string, index: number) => ErrorInfo;
    renderItem?: (item: T, isEditing: boolean) => ReactNode;
    getItemKey?: (item: T) => string;
    isLoading?: boolean;
    emptyMessage?: string;
    emptySubMessage?: string;
}

export interface CreateTabLayoutProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    errorInfo: ErrorInfo;
    onSubmit: () => void;
    isLoading?: boolean;
    submitLabel?: string;
    previewComponent?: ReactNode;
    additionalContent?: ReactNode;
}

export interface CascadePreviewDialogProps {
    open: boolean;
    onClose: () => void;
    actionType: 'edit' | 'delete' | 'delete-unused';
    itemType: 'label' | 'category' | 'color';
    affectedItems: AffectedItem[];
    onConfirm: () => void;
    isLoading?: boolean;
}

export interface AffectedItem {
    name: string;
    detail?: string;
    type?: string;
}

export interface MultiSelectDeleteFABProps {
    count: number;
    onClick: () => void;
    visible: boolean;
}

export interface ItemListHeaderProps {
    title: string;
    onDownload: () => void;
    itemCount: number;
}

export type ErrorInfo = { helperText: string } | null;
