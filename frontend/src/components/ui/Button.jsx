import { motion } from 'framer-motion';
import { LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'bg-brand text-on-brand shadow-sm hover:brightness-110',
  secondary: 'border border-line bg-card text-ink hover:bg-ink/5',
  ghost: 'text-ink hover:bg-ink/5',
  accent: 'bg-accent text-on-accent shadow-sm hover:brightness-110',
  danger: 'text-accent hover:bg-accent/10',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-[15px]',
};

export default function Button({ variant = 'primary', size = 'md', icon: Icon, loading = false, to, href, type = 'button', className = '', children, disabled, ...props }) {
  const classes = `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium transition disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading ? <LoaderCircle size={16} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 15 : 17} />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={classes}>{content}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>{content}</a>;
  return (
    <motion.button whileTap={{ scale: 0.96 }} type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </motion.button>
  );
}

export function IconButton({ icon: Icon, label, size = 20, className = '', children, ...props }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} type="button" aria-label={label} title={label} className={`relative grid size-10 shrink-0 place-items-center rounded-full text-ink/80 transition hover:bg-ink/5 hover:text-ink ${className}`} {...props}>
      <Icon size={size} />
      {children}
    </motion.button>
  );
}
