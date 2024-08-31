import { Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';

type Props = {
    label: string;
    selectedValue: any;
    options: { value: any; ariaLabel: string; label: string }[];
    onChange: (event: React.MouseEvent<HTMLElement, MouseEvent>, value: any, property?: string) => void;
    property?: string;
};

const SettingsToggle = ({ label, selectedValue, options, onChange, property }: Props) => {
    return (
        <div>
            <Typography variant="subtitle1">{label}</Typography>
            <ToggleButtonGroup
                value={selectedValue}
                exclusive
                aria-label={label}
                onChange={(event, value) => onChange(event, value, property)}
            >
                {options.map((option) => (
                    <ToggleButton
                        key={option.value}
                        value={option.value}
                        aria-label={option.ariaLabel}
                    >
                        {option.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
        </div>
    );
};

export default SettingsToggle;
