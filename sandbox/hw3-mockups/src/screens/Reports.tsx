import { LuChevronLeft, LuChevronRight, LuTag } from 'react-icons/lu';
import { AUTO_SUBS, CAT_COLORS, REPORT_CATS, TAGS, rub } from '../data';
import { Donut, PeriodSwitcher, Seg } from '../ui';

type Level = 'cats' | 'auto' | 'tags';

function List({ rows }: { rows: { name: string; sum: number; pct: number; color: string; href?: string }[] }) {
  return (
    <div className="card">
      {rows.map((r) => (
        <a key={r.name} className="row" href={r.href ?? '#reports-auto'} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="legend-dot" style={{ background: r.color }} />
          <span className="main title">{r.name}</span>
          <span className="num" style={{ fontWeight: 600 }}>{rub(r.sum)}</span>
          <span className="pct num">{r.pct}%</span>
          <LuChevronRight className="chev" />
        </a>
      ))}
    </div>
  );
}

export function Reports({ level }: { level: Level }) {
  const isTags = level === 'tags';
  return (
    <main className="page">
      <h1 className="h1">Отчёты</h1>
      <div className="report-head">
        <div style={{ marginBottom: 12 }}><Seg items={['Расходы', 'Доходы']} on={0} green /></div>
        <PeriodSwitcher compact />
        <div style={{ margin: '0 0 6px', minWidth: 240 }}><Seg items={['Категории', 'Теги']} on={isTags ? 1 : 0} /></div>
      </div>

      {level === 'cats' && (
        <div className="report-grid">
          <div className="card"><Donut label="Расходы" total={rub(112340)}
            parts={REPORT_CATS.map((c) => ({ value: c.sum, color: CAT_COLORS[c.name] ?? '#999' }))} /></div>
          <List rows={REPORT_CATS.map((c) => ({ ...c, color: CAT_COLORS[c.name] ?? '#999' }))} />
        </div>
      )}

      {level === 'auto' && (
        <>
          <a className="back" href="#reports"><LuChevronLeft /> Все категории</a>
          <h2 className="h2" style={{ fontSize: 20, margin: '0 0 10px' }}>Автомобиль · <span className="num">{rub(20400)}</span></h2>
          <div className="report-grid">
            <div className="card"><Donut label="Автомобиль" total={rub(20400)} parts={AUTO_SUBS.map((s) => ({ value: s.sum, color: s.color }))} /></div>
            <List rows={AUTO_SUBS.map((s) => ({ ...s, href: '#ops' }))} />
          </div>
        </>
      )}

      {isTags && (
        <div className="report-grid">
          <div>
            <div className="card">
              {TAGS.map((t) => (
                <div className="row" key={t.name}>
                  <span className="cat-ico inc"><LuTag /></span>
                  <div className="main"><div className="title">{t.name}</div><div className="sub">{t.count} операций</div></div>
                  <span className="num" style={{ fontWeight: 600 }}>{rub(t.sum)}</span>
                  <LuChevronRight className="chev" />
                </div>
              ))}
            </div>
            <p className="note">Операция с несколькими тегами учитывается в каждом из них, поэтому сумма по тегам может быть больше общего расхода.</p>
          </div>
        </div>
      )}
    </main>
  );
}
