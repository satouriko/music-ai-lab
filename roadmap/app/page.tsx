'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { categories, extensionPaths, phases, weeks } from './data/roadmap';
import type { Phase, WeekPlan } from './data/types';

type View = 'content' | 'weeks';
type PhaseFilter = 'all' | Phase['id'];

const padWeek = (week: number) => String(week).padStart(2, '0');
const weekHours = (week: WeekPlan) => week.hours.algorithm + week.hours.music + week.hours.review;

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function CategoryView({ onWeekSelect }: { onWeekSelect: (week: number) => void }) {
  return (
    <div className="category-view">
      <div className="view-intro">
        <span>CONTENT MAP / 6 DOMAINS</span>
        <p>适合先建立知识全景，再沿着关联周次落到具体任务。每个能力域都有可展示的证据，不以“看完课程”为完成标准。</p>
      </div>

      <div className="category-cards">
        {categories.map((category, index) => (
          <article className={`category-card category-${index + 1}`} id={`category-${category.id}`} key={category.id}>
            <header>
              <span className="category-count">{padWeek(index + 1)} / {padWeek(categories.length)}</span>
              <p>{category.outcome}</p>
              <h3>{category.name}</h3>
              <div className="category-summary">{category.summary}</div>
            </header>

            <div className="topic-cloud" aria-label={`${category.name}主题`}>
              {category.topics.map((topic) => <span key={topic}>{topic}</span>)}
            </div>

            <div className="category-columns">
              <section>
                <h4>核心资料</h4>
                <ul className="resource-list">
                  {category.resources.map((resource) => (
                    <li key={resource.title}>
                      <a href={resource.url} target="_blank" rel="noreferrer">
                        <span>{resource.kind}</span>
                        <strong>{resource.title}</strong>
                        <Arrow />
                      </a>
                      <p>{resource.scope}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h4>完成证据</h4>
                <ol className="evidence-list">
                  {category.evidence.map((item, evidenceIndex) => (
                    <li key={item}><span>{padWeek(evidenceIndex + 1)}</span>{item}</li>
                  ))}
                </ol>
              </section>
            </div>

            <footer>
              <span>关联周次</span>
              <div className="category-weeks">
                {category.weekNumbers.map((week) => (
                  <button key={week} type="button" onClick={() => onWeekSelect(week)} aria-label={`前往第 ${week} 周`}>
                    W{padWeek(week)}
                  </button>
                ))}
              </div>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function ListBlock({ title, items, accent = false }: { title: string; items: string[]; accent?: boolean }) {
  return (
    <section className={`detail-block${accent ? ' accent' : ''}`}>
      <h4>{title}</h4>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

function WeekCard({ week, phase, expanded, onToggle }: {
  week: WeekPlan;
  phase: Phase;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`week-card${expanded ? ' expanded' : ''}`} id={`week-${week.week}`}>
      <button className="week-card-trigger" type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={`week-detail-${week.week}`}>
        <div className="week-badge"><span>WEEK</span><strong>{padWeek(week.week)}</strong></div>
        <div className="week-card-copy">
          <span>{phase.name} · 第 {week.month} 月</span>
          <h3>{week.title}</h3>
          <p>{week.objective}</p>
        </div>
        <div className="week-hours" aria-label={`本周共 ${weekHours(week)} 小时`}>
          <strong>{weekHours(week)}h</strong>
          <span>算法 {week.hours.algorithm}</span>
          <span>音乐 {week.hours.music}</span>
          <span>复盘 {week.hours.review}</span>
        </div>
        <span className="expand-mark" aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="week-detail" id={`week-detail-${week.week}`}>
          <div className="weekly-objective">
            <span>本周终点</span>
            <strong>{week.deliverables.join('；')}</strong>
          </div>

          <div className="detail-grid detail-grid-primary">
            <ListBlock title="学习内容" items={week.knowledge} />
            <ListBlock title="动手练习" items={week.exercises} />
            <ListBlock title="项目推进" items={week.project} accent />
          </div>

          <div className="reading-grid">
            <section className="reading-panel">
              <div className="panel-heading"><span>READ</span><h4>阅读资料</h4></div>
              {week.readings.map((reading) => (
                <a className="reading-item" href={reading.url} key={reading.title} target="_blank" rel="noreferrer">
                  <div><span>{reading.kind}</span><strong>{reading.title}</strong></div>
                  <p>{reading.scope}</p>
                  <small>{reading.purpose}</small>
                  <Arrow />
                </a>
              ))}
            </section>

            <section className="reading-panel code-panel">
              <div className="panel-heading"><span>CODE</span><h4>代码精读</h4></div>
              {week.codeReadings.map((code) => (
                <a className="reading-item" href={code.url} key={`${code.repository}-${code.path}`} target="_blank" rel="noreferrer">
                  <div><span>REPO</span><strong>{code.repository}</strong></div>
                  <code>{code.path}</code>
                  <small>带着问题：{code.question}</small>
                  <Arrow />
                </a>
              ))}
            </section>
          </div>

          <div className="detail-grid music-detail-grid">
            <ListBlock title="乐理与听辨" items={week.musicTheory} />
            <ListBlock title="钢琴练习" items={week.piano} />
            <ListBlock title="验收标准" items={week.acceptance} accent />
          </div>

          <div className="week-close">
            <span>完成后再进入下一周</span>
            <button type="button" onClick={onToggle}>收起本周 <span aria-hidden="true">↑</span></button>
          </div>
        </div>
      )}
    </article>
  );
}

function WeeklyView({ selectedPhase, onPhaseChange, expandedWeeks, onToggleWeek, onExpandWeeks, onCollapseWeeks }: {
  selectedPhase: PhaseFilter;
  onPhaseChange: (phase: PhaseFilter) => void;
  expandedWeeks: Set<number>;
  onToggleWeek: (week: number) => void;
  onExpandWeeks: (weekNumbers: number[]) => void;
  onCollapseWeeks: () => void;
}) {
  const visibleWeeks = useMemo(
    () => selectedPhase === 'all' ? weeks : weeks.filter((week) => week.phaseId === selectedPhase),
    [selectedPhase],
  );

  const activePhase = phases.find((phase) => phase.id === selectedPhase);

  return (
    <div className="weekly-view">
      <div className="view-intro">
        <span>WEEKLY SCORE / 52 WEEKS</span>
        <p>每周以“可验收交付物”为终点。先完成 24～28 小时核心任务，再决定是否拓展；遇到高压周，可把一周拆成两周。</p>
      </div>

      <div className="phase-filter" aria-label="按阶段筛选周次">
        <button className={selectedPhase === 'all' ? 'active' : ''} type="button" onClick={() => onPhaseChange('all')}>
          <span>ALL</span><strong>全部 52 周</strong><small>完整路线</small>
        </button>
        {phases.map((phase, index) => (
          <button className={selectedPhase === phase.id ? 'active' : ''} key={phase.id} type="button" onClick={() => onPhaseChange(phase.id)}>
            <span>{padWeek(index + 1)}</span><strong>{phase.name}</strong><small>W{phase.weeks[0]}—{phase.weeks[1]}</small>
          </button>
        ))}
      </div>

      <div className="weekly-toolbar">
        <div>
          <span>{activePhase ? `PHASE ${padWeek(phases.indexOf(activePhase) + 1)}` : 'FULL YEAR'}</span>
          <strong>{activePhase?.outcome ?? '从 AI 入门到完成个人音乐 AI 项目的完整一年。'}</strong>
        </div>
        <div>
          <button type="button" onClick={() => onExpandWeeks(visibleWeeks.map((week) => week.week))}>展开当前全部</button>
          <button type="button" onClick={onCollapseWeeks}>全部收起</button>
        </div>
      </div>

      <div className="week-list">
        {visibleWeeks.map((week) => (
          <WeekCard
            expanded={expandedWeeks.has(week.week)}
            key={week.week}
            onToggle={() => onToggleWeek(week.week)}
            phase={phases.find((phase) => phase.id === week.phaseId) ?? phases[0]}
            week={week}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>('content');
  const [selectedPhase, setSelectedPhase] = useState<PhaseFilter>('all');
  const [focusedWeek, setFocusedWeek] = useState<number | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(() => new Set([1]));
  const pendingScroll = useRef<number | null>(null);

  useEffect(() => {
    if (view !== 'weeks' || pendingScroll.current === null) return;
    const week = pendingScroll.current;
    pendingScroll.current = null;
    window.requestAnimationFrame(() => {
      document.getElementById(`week-${week}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [view, focusedWeek]);

  const showWeek = (week: number) => {
    pendingScroll.current = week;
    setSelectedPhase('all');
    setFocusedWeek(week);
    setExpandedWeeks((current) => new Set([...current, week]));
    setView('weeks');
  };

  const toggleWeek = (week: number) => {
    setExpandedWeeks((current) => {
      const next = new Set(current);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const showPhase = (phase: Phase['id']) => {
    setSelectedPhase(phase);
    setFocusedWeek(null);
    setView('weeks');
    window.requestAnimationFrame(() => document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' }));
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="音乐 AI 学习路线首页">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>MAI / 52</span>
        </a>
        <nav className="header-note" aria-label="页面导航">
          <a href="#roadmap">学习路线</a><a href="#practice">每周节奏</a><a href="#extension">延伸方向</a>
        </nav>
        <a className="header-link" href="#roadmap">开始阅读 <span aria-hidden="true">↘</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">A YEAR OF MUSIC AI LEARNING · 2026</p>
          <h1>音乐 AI<span>52 周学习路线</span></h1>
          <p className="hero-intro">
            为 5 年前端工程经验、AI 初学者与钢琴初学者设计。
            把机器学习、音乐技术、项目实战和琴房训练，编进同一条可完成的路线。
          </p>
        </div>

        <aside className="brief-card" aria-label="学习计划摘要">
          <div className="brief-heading"><span>WEEKLY BRIEF</span><span className="live-dot">ACTIVE</span></div>
          <dl>
            <div><dt>工作日</dt><dd>2h × 5</dd></div>
            <div><dt>周末</dt><dd>10h × 2</dd></div>
            <div><dt>建议投入</dt><dd>26h / 周</dd></div>
          </dl>
          <div className="piano-meter" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => <span key={index} className={index % 4 === 1 || index % 7 === 3 ? 'black-key' : ''} />)}
          </div>
          <p>目标：完成一套可演示、可评测、可部署的个人音乐 AI 项目。</p>
        </aside>
      </section>

      <section className="phase-strip" aria-label="年度阶段概览">
        {phases.map((phase, index) => (
          <button className="phase-tick" key={phase.id} type="button" onClick={() => showPhase(phase.id)}>
            <span>{padWeek(index + 1)}</span><strong>{phase.name}</strong><small>W{phase.weeks[0]}—{phase.weeks[1]}</small>
          </button>
        ))}
      </section>

      <section className="roadmap-shell" id="roadmap">
        <div className="roadmap-heading">
          <div><p className="section-kicker">THE SCORE</p><h2>选择你的阅读方式</h2></div>
          <div className="view-switch" role="group" aria-label="路线视图">
            <button className={view === 'content' ? 'active' : ''} onClick={() => setView('content')} type="button" aria-pressed={view === 'content'}>按学习内容</button>
            <button className={view === 'weeks' ? 'active' : ''} onClick={() => setView('weeks')} type="button" aria-pressed={view === 'weeks'}>按周推进</button>
          </div>
        </div>

        {view === 'content'
          ? <CategoryView onWeekSelect={showWeek} />
          : (
            <WeeklyView
              expandedWeeks={expandedWeeks}
              onCollapseWeeks={() => setExpandedWeeks(new Set())}
              onExpandWeeks={(weekNumbers) => setExpandedWeeks(new Set(weekNumbers))}
              onPhaseChange={setSelectedPhase}
              onToggleWeek={toggleWeek}
              selectedPhase={selectedPhase}
            />
          )}
      </section>

      <section className="practice-section" id="practice">
        <div className="practice-title">
          <p className="section-kicker">WEEKLY RHYTHM</p>
          <h2>26 小时，怎样真正执行</h2>
          <p>钢琴不需要等算法学完再练。它是你判断旋律、和声、织体和可演奏性的“人类评测器”。</p>
        </div>
        <div className="practice-score">
          <div className="weekday-block">
            <span>MON—FRI</span><strong>工作日 · 10h</strong>
            <ol>
              <li><b>70 min</b> 学习与代码</li>
              <li><b>40 min</b> 钢琴慢练</li>
              <li><b>10 min</b> 日志与复盘</li>
            </ol>
          </div>
          <div className="weekend-block">
            <span>SATURDAY</span><strong>项目日 · 10h</strong>
            <ol><li><b>4h</b> 课程与论文</li><li><b>4h</b> 项目实现</li><li><b>2h</b> 钢琴、听辨、复盘</li></ol>
          </div>
          <div className="weekend-block gold-block">
            <span>SUNDAY</span><strong>实验日 · 10h</strong>
            <ol><li><b>5h</b> 训练、评测、错误分析</li><li><b>3h</b> 数据与文档</li><li><b>2h</b> 钢琴与下周计划</li></ol>
          </div>
        </div>
        <aside className="practice-rule"><span>RULE 01</span><p>如果连续两周完成率低于 70%，把当前“一周”拆成两周；先保留核心项目、钢琴和复盘，再砍辅助阅读。</p></aside>
      </section>

      <section className="extension-section" id="extension">
        <div className="extension-heading">
          <div><p className="section-kicker">MONTH 13—18</p><h2>一年之后，按兴趣补强</h2></div>
          <p>不要一开始同时追四条线。第 10 个月开始根据个人兴趣和项目结果，只选择一条延伸方向。</p>
        </div>
        <div className="extension-grid">
          {extensionPaths.map((path, index) => (
            <article key={path.id}>
              <span>{padWeek(index + 1)}</span>
              <h3>{path.title}</h3>
              <p className="extension-when">适用：{path.when}</p>
              <ul>{path.focus.map((item) => <li key={item}>{item}</li>)}</ul>
              <footer>{path.result}</footer>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><strong>MAI / 52</strong></div>
        <p>把每一周的交付做实，比把所有资料“看完”更重要。</p>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
