import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Tabs from './Tabs';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return <Tabs variant="pill" tabs={OPTIONS} value={theme} onChange={setTheme} />;
}
