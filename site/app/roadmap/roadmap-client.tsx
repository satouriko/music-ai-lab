'use client';

import { useEffect, useMemo, useState } from 'react';

import { RoadmapArtifacts } from '@/components/roadmap-artifacts';
import type { Artifact } from '@/lib/artifact-types';
import { groupArtifactsForWeek } from '@/lib/roadmap-artifacts';
import type {
  Category,
  Phase,
  RoadmapData,
  WeekPlan,
} from '@/lib/roadmap-types';

type View = 'content' | 'weeks';
type PhaseFilter = 'all' | Phase['id'];

const padWeek = (week: number) => String(week).padStart(2, '0');
const weekHours = (week: WeekPlan) =>
  week.hours.algorithm + week.hours.music + week.hours.review;

function ListSection({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="week-detail-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function CategoryView({
  categories,
  onWeekSelect,
}: {
  categories: Category[];
  onWeekSelect: (week: number) => void;
}) {
  return (
    <div className="domain-index">
      <header className="view-intro">
        <span>6 DOMAINS</span>
        <p>先看能力之间的关系，再回到具体周次完成练习和证据。</p>
      </header>
      {categories.map((category, index) => (
        <article className="domain-row" id={`category-${category.id}`} key={category.id}>
          <header>
            <span>{padWeek(index + 1)}</span>
            <div>
              <h3>{category.name}</h3>
              <p>{category.summary}</p>
            </div>
            <strong>{category.outcome}</strong>
          </header>
          <div className="domain-details">
            <section>
              <h4>核心主题</h4>
              <ul className="topic-list">
                {category.topics.map((topic) => <li key={topic}>{topic}</li>)}
              </ul>
            </section>
            <section>
              <h4>核心资料</h4>
              <ul className="domain-resource-list">
                {category.resources.map((resource) => (
                  <li key={resource.title}>
                    <a href={resource.url} target="_blank" rel="noreferrer">
                      <strong>{resource.title}</strong>
                      <span>{resource.scope}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h4>完成证据</h4>
              <ol>
                {category.evidence.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </section>
          </div>
          <footer>
            <span>关联周次</span>
            <div>
              {category.weekNumbers.map((week) => (
                <button key={week} type="button" onClick={() => onWeekSelect(week)}>
                  W{padWeek(week)}
                </button>
              ))}
            </div>
          </footer>
        </article>
      ))}
    </div>
  );
}

function WeekRow({
  artifacts,
  expanded,
  onToggle,
  phase,
  week,
}: {
  artifacts: Artifact[];
  expanded: boolean;
  onToggle: () => void;
  phase: Phase;
  week: WeekPlan;
}) {
  const artifactGroups = groupArtifactsForWeek(artifacts, week.week);
  const artifactCount = Object.values(artifactGroups).reduce(
    (total, group) => total + group.length,
    0,
  );

  return (
    <article className={`week-row${expanded ? ' expanded' : ''}`} id={`week-${week.week}`}>
      <button
        className="week-row-trigger"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`week-detail-${week.week}`}
      >
        <span className="week-index">W{padWeek(week.week)}</span>
        <span className="week-row-copy">
          <small>{phase.name} · 第 {week.month} 月</small>
          <strong>{week.title}</strong>
          <span>{week.objective}</span>
        </span>
        <span className="week-row-meta">
          <strong>{weekHours(week)}h</strong>
          {artifactCount > 0 && <small>{artifactCount} 项产物</small>}
        </span>
        <span className="week-toggle" aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="week-detail" id={`week-detail-${week.week}`}>
          <section className="week-destination">
            <span>本周终点</span>
            <p>{week.deliverables.join('；')}</p>
          </section>

          <div className="week-detail-grid">
            <ListSection title="学习内容" items={week.knowledge} />
            <ListSection title="动手练习" items={week.exercises} />
            <ListSection title="项目推进" items={week.project} />
          </div>

          <RoadmapArtifacts artifacts={artifacts} week={week.week} />

          <div className="week-reference-grid">
            <section>
              <h4>阅读资料</h4>
              <ul>
                {week.readings.map((reading) => (
                  <li key={reading.title}>
                    <a href={reading.url} target="_blank" rel="noreferrer">
                      <strong>{reading.title}</strong>
                      <span>{reading.scope}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h4>代码精读</h4>
              <ul>
                {week.codeReadings.map((code) => (
                  <li key={`${code.repository}-${code.path}`}>
                    <a href={code.url} target="_blank" rel="noreferrer">
                      <strong>{code.repository}</strong>
                      <code>{code.path}</code>
                      <span>{code.question}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="week-detail-grid week-detail-grid-secondary">
            <ListSection title="乐理与听辨" items={week.musicTheory} />
            <ListSection title="钢琴练习" items={week.piano} />
            <ListSection title="验收标准" items={week.acceptance} />
          </div>

          <button className="week-collapse" type="button" onClick={onToggle}>
            收起本周 ↑
          </button>
        </div>
      )}
    </article>
  );
}

function WeeklyView({
  artifacts,
  expandedWeeks,
  onCollapseWeeks,
  onExpandWeeks,
  onPhaseChange,
  onToggleWeek,
  phases,
  selectedPhase,
  weeks,
}: {
  artifacts: Artifact[];
  expandedWeeks: Set<number>;
  onCollapseWeeks: () => void;
  onExpandWeeks: (weeks: number[]) => void;
  onPhaseChange: (phase: PhaseFilter) => void;
  onToggleWeek: (week: number) => void;
  phases: Phase[];
  selectedPhase: PhaseFilter;
  weeks: WeekPlan[];
}) {
  const visibleWeeks = useMemo(
    () => selectedPhase === 'all'
      ? weeks
      : weeks.filter((week) => week.phaseId === selectedPhase),
    [selectedPhase, weeks],
  );
  const activePhase = phases.find((phase) => phase.id === selectedPhase);

  return (
    <div className="weekly-outline">
      <div className="phase-filter" role="group" aria-label="按阶段筛选周次">
        <button
          aria-pressed={selectedPhase === 'all'}
          className={selectedPhase === 'all' ? 'active' : ''}
          type="button"
          onClick={() => onPhaseChange('all')}
        >
          <span>全部</span><small>W01—W52</small>
        </button>
        {phases.map((phase) => (
          <button
            aria-pressed={selectedPhase === phase.id}
            className={selectedPhase === phase.id ? 'active' : ''}
            key={phase.id}
            type="button"
            onClick={() => onPhaseChange(phase.id)}
          >
            <span>{phase.name}</span>
            <small>W{padWeek(phase.weeks[0])}—W{padWeek(phase.weeks[1])}</small>
          </button>
        ))}
      </div>

      <div className="weekly-toolbar">
        <p>{activePhase?.outcome ?? '从环境基线到完成个人音乐 AI 项目的完整一年。'}</p>
        <div>
          <button type="button" onClick={() => onExpandWeeks(visibleWeeks.map((week) => week.week))}>
            展开当前
          </button>
          <button type="button" onClick={onCollapseWeeks}>全部收起</button>
        </div>
      </div>

      <div className="week-list">
        {visibleWeeks.map((week) => (
          <WeekRow
            artifacts={artifacts}
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

export function RoadmapClient({
  artifacts,
  roadmap,
}: {
  artifacts: Artifact[];
  roadmap: RoadmapData;
}) {
  const { categories, extensionPaths, phases, weeks } = roadmap;
  const [view, setView] = useState<View>('weeks');
  const [selectedPhase, setSelectedPhase] = useState<PhaseFilter>('all');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(
    () => new Set([1]),
  );
  const [scrollWeek, setScrollWeek] = useState<number | null>(null);

  useEffect(() => {
    const match = window.location.hash.match(/^#week-(\d+)$/);
    if (!match) return;
    const week = Number(match[1]);
    if (week < 1 || week > 52) return;
    const frame = window.requestAnimationFrame(() => {
      setView('weeks');
      setSelectedPhase('all');
      setExpandedWeeks((current) => new Set([...current, week]));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (view !== 'weeks' || scrollWeek === null) return;
    const week = scrollWeek;
    const frame = window.requestAnimationFrame(() => {
      setScrollWeek(null);
      document.getElementById(`week-${week}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollWeek, view]);

  const showWeek = (week: number) => {
    setView('weeks');
    setSelectedPhase('all');
    setExpandedWeeks((current) => new Set([...current, week]));
    setScrollWeek(week);
  };

  const toggleWeek = (week: number) => {
    setExpandedWeeks((current) => {
      const next = new Set(current);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  return (
    <main className="roadmap-page">
      <section className="roadmap-intro" id="top">
        <p className="eyebrow">MUSIC AI LAB · 2026</p>
        <div>
          <h1>音乐 AI<br />52 周学习路线</h1>
          <p>
            把机器学习、音乐技术、个人项目与钢琴练习放进同一条可验收路线。
            每周从目标出发，直接阅读与它相关的笔记、代码和实验结果。
          </p>
        </div>
        <dl>
          <div><dt>周期</dt><dd>52 周</dd></div>
          <div><dt>阶段</dt><dd>7 个</dd></div>
          <div><dt>建议投入</dt><dd>24–28h / 周</dd></div>
        </dl>
      </section>

      <section className="roadmap-shell" id="roadmap">
        <header className="roadmap-heading">
          <div>
            <p className="section-kicker">THE ROADMAP</p>
            <h2>52 周路线</h2>
          </div>
          <div className="view-switch" role="group" aria-label="路线视图">
            <button
              className={view === 'weeks' ? 'active' : ''}
              type="button"
              aria-pressed={view === 'weeks'}
              onClick={() => setView('weeks')}
            >
              按周推进
            </button>
            <button
              className={view === 'content' ? 'active' : ''}
              type="button"
              aria-pressed={view === 'content'}
              onClick={() => setView('content')}
            >
              能力域
            </button>
          </div>
        </header>

        {view === 'weeks' ? (
          <WeeklyView
            artifacts={artifacts}
            expandedWeeks={expandedWeeks}
            onCollapseWeeks={() => setExpandedWeeks(new Set())}
            onExpandWeeks={(weekNumbers) => setExpandedWeeks(new Set(weekNumbers))}
            onPhaseChange={setSelectedPhase}
            onToggleWeek={toggleWeek}
            phases={phases}
            selectedPhase={selectedPhase}
            weeks={weeks}
          />
        ) : (
          <CategoryView categories={categories} onWeekSelect={showWeek} />
        )}
      </section>

      <section className="practice-section">
        <header>
          <p className="section-kicker">WEEKLY RHYTHM</p>
          <h2>26 小时，怎样真正执行</h2>
          <p>钢琴不是算法之外的支线，而是判断旋律、和声、织体和可演奏性的评测器。</p>
        </header>
        <div className="practice-schedule">
          <section><span>MON—FRI</span><h3>工作日 · 10h</h3><p>学习与代码 70 分钟，钢琴慢练 40 分钟，日志与复盘 10 分钟。</p></section>
          <section><span>SATURDAY</span><h3>项目日 · 9h</h3><p>课程与论文 3h，项目实现 4h，钢琴、听辨与复盘 2h。</p></section>
          <section><span>SUNDAY</span><h3>实验日 · 7h</h3><p>训练与错误分析 3h，数据与文档 2h，钢琴和下周计划 2h。</p></section>
        </div>
        <p className="practice-rule">
          连续两周完成率低于 70% 时，把当前一周拆成两周；保留核心项目、钢琴和复盘，先删辅助阅读。
        </p>
      </section>

      <section className="extension-section">
        <header>
          <div><p className="section-kicker">MONTH 13—18</p><h2>一年之后，按兴趣补强</h2></div>
          <p>第 10 个月以后根据个人兴趣和项目结果，只选择一条延伸方向。</p>
        </header>
        <div className="extension-list">
          {extensionPaths.map((path, index) => (
            <article key={path.id}>
              <span>{padWeek(index + 1)}</span>
              <div><h3>{path.title}</h3><p>{path.when}</p></div>
              <ul>{path.focus.map((item) => <li key={item}>{item}</li>)}</ul>
              <strong>{path.result}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
