import type { ReactNode } from 'react';
import {
  LuArrowLeftRight, LuBaby, LuBriefcase, LuBus, LuCar, LuChartPie, LuChevronLeft, LuChevronRight,
  LuCoffee, LuEllipsis, LuGift, LuHeartPulse, LuHouse, LuPlus, LuSettings, LuShirt,
  LuShoppingBasket, LuSmartphone, LuTarget, LuTicket, LuWallet,
} from 'react-icons/lu';
import { MEMBERS, type IconName } from './data';

const ICONS: Record<IconName, ReactNode> = {
  wallet: <LuWallet />, basket: <LuShoppingBasket />, car: <LuCar />, coffee: <LuCoffee />,
  house: <LuHouse />, baby: <LuBaby />, bus: <LuBus />, heart: <LuHeartPulse />,
  phone: <LuSmartphone />, ticket: <LuTicket />, shirt: <LuShirt />, gift: <LuGift />,
  briefcase: <LuBriefcase />, more: <LuEllipsis />,
};

export function CatIcon({ icon, income = false }: { icon: IconName; income?: boolean }) {
  return <span className={`cat-ico${income ? ' inc' : ''}`}>{ICONS[icon]}</span>;
}
export const iconOf = (name: IconName) => ICONS[name];

type Section = 'ops' | 'reports' | 'plan' | 'settings';
const NAV: { id: Section; href: string; label: string; icon: ReactNode }[] = [
  { id: 'ops', href: '#ops', label: 'Операции', icon: <LuArrowLeftRight /> },
  { id: 'reports', href: '#reports', label: 'Отчёты', icon: <LuChartPie /> },
  { id: 'plan', href: '#plan', label: 'План', icon: <LuTarget /> },
  { id: 'settings', href: '#settings', label: 'Настройки', icon: <LuSettings /> },
];

export function Avatar({ name, color, size }: { name: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ background: color, ...(size ? { width: size, height: size } : {}) }}>
      {name.slice(0, 1)}
    </span>
  );
}

export function Shell({ section, children }: { section: Section; children: ReactNode }) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="logo"><LuWallet /></span>Семейный бюджет</div>
        <nav className="nav">
          {NAV.map((n) => <a key={n.id} href={n.href} className={n.id === section ? 'active' : ''}>{n.label}</a>)}
        </nav>
        <div className="top-right">
          <div className="avatars">{MEMBERS.map((m) => <Avatar key={m.id} name={m.name} color={m.color} />)}</div>
          <a className="btn" href="#add" style={{ padding: '9px 16px', textDecoration: 'none' }}><LuPlus /> Добавить</a>
        </div>
      </header>
      {children}
      <nav className="tabbar">
        {NAV.slice(0, 2).map((n) => <a key={n.id} href={n.href} className={n.id === section ? 'active' : ''}>{n.icon}{n.label}</a>)}
        <a className="fab" href="#add" aria-label="Добавить операцию"><LuPlus /></a>
        {NAV.slice(2).map((n) => <a key={n.id} href={n.href} className={n.id === section ? 'active' : ''}>{n.icon}{n.label}</a>)}
      </nav>
    </div>
  );
}

export function Seg({ items, on, green }: { items: string[]; on: number; green?: boolean }) {
  return (
    <div className={`seg${green ? ' green' : ''}`}>
      {items.map((t, i) => <button key={t} className={i === on ? 'on' : ''}>{t}</button>)}
    </div>
  );
}

export function PeriodSwitcher({ compact }: { compact?: boolean }) {
  return (
    <div>
      <div className="period">
        <button className="icon-btn" aria-label="Предыдущий период"><LuChevronLeft /></button>
        <span className="label">29 сентября – 28 октября 2026</span>
        <button className="icon-btn" aria-label="Следующий период"><LuChevronRight /></button>
      </div>
      {!compact && <Seg items={['Месяц', 'Свой цикл', 'Диапазон']} on={1} />}
    </div>
  );
}

export function Donut({ parts, total, label }: { parts: { value: number; color: string }[]; total: string; label: string }) {
  const r = 70, c = 2 * Math.PI * r, sum = parts.reduce((s, p) => s + p.value, 0);
  let offset = 0;
  return (
    <div className="donut-wrap" style={{ position: 'relative' }}>
      <svg width="200" height="200" viewBox="0 0 200 200" role="img" aria-label={`${label}: ${total}`}>
        <g transform="rotate(-90 100 100)">
          {parts.map((p, i) => {
            const len = (p.value / sum) * c;
            const el = <circle key={i} cx="100" cy="100" r={r} fill="none" stroke={p.color} strokeWidth="26"
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <div className="donut-center"><div className="muted" style={{ fontSize: 12 }}>{label}</div><div className="t num">{total}</div></div>
    </div>
  );
}
