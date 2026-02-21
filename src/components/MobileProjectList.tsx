import { useEffect, useMemo, useState } from 'react';
import type { Project, ReleaseStatus } from './projects/types';
import {
  PROJECT_STATUS_VALUES,
  buildProjectHierarchy,
  filterProjectsForNavigator,
  type ProjectCategoryFilter,
  type ProjectStatusValue,
  type ProjectWithChildren,
} from '../lib/projectsNavigator';
import { getProjectsNavigatorCopy, type NavigatorLang } from '../lib/projectsNavigatorI18n';
import FocusProjectSelect from './FocusProjectSelect';

interface Props {
  projects: Project[];
  lang?: NavigatorLang;
}

export default function MobileProjectList({ projects, lang = 'en' }: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<{
    projectTitle: string;
    version: string;
    releaseStatus: ReleaseStatus;
    items?: string[];
  } | null>(null);

  const [query, setQuery] = useState('');
  const [focusTitle, setFocusTitle] = useState<string | null>(null);
  const [showRelatedProjects, setShowRelatedProjects] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategoryFilter>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatusValue[]>([
    ...PROJECT_STATUS_VALUES,
  ]);
  const t = getProjectsNavigatorCopy(lang);

  const projectLookup = useMemo(() => {
    return new Map(projects.map((project) => [project.title, project]));
  }, [projects]);

  const sortedProjectTitles = useMemo(() => {
    return [...projects]
      .map((project) => project.title)
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  }, [projects]);

  const selectedStatusSet = useMemo(() => {
    return new Set(selectedStatuses);
  }, [selectedStatuses]);

  const navigatorResult = useMemo(() => {
    return filterProjectsForNavigator(projects, {
      query,
      statuses: selectedStatusSet,
      category: categoryFilter,
      focusTitle,
    });
  }, [projects, query, selectedStatusSet, categoryFilter, focusTitle]);

  const visibleProjects = navigatorResult.visibleProjects;

  const hierarchy = useMemo(() => {
    if (visibleProjects.length === 0) {
      return [];
    }
    return buildProjectHierarchy(visibleProjects);
  }, [visibleProjects]);

  useEffect(() => {
    if (query.trim().length === 0 && !focusTitle) return;
    setExpandedProjects(new Set(visibleProjects.map((project) => project.title)));
  }, [query, focusTitle, visibleProjects]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    categoryFilter !== 'all' ||
    selectedStatuses.length !== PROJECT_STATUS_VALUES.length ||
    !!focusTitle;

  const toggleStatus = (status: ProjectStatusValue): void => {
    setSelectedStatuses((previous) => {
      if (previous.includes(status)) {
        if (previous.length === 1) return previous;
        return previous.filter((entry) => entry !== status);
      }
      return [...previous, status];
    });
  };

  const resetFilters = (): void => {
    setQuery('');
    setFocusTitle(null);
    setCategoryFilter('all');
    setSelectedStatuses([...PROJECT_STATUS_VALUES]);
    setShowRelatedProjects(false);
  };

  const toggleProject = (projectTitle: string): void => {
    setExpandedProjects((previous) => {
      const next = new Set(previous);
      if (next.has(projectTitle)) {
        next.delete(projectTitle);
      } else {
        next.add(projectTitle);
      }
      return next;
    });
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/40',
    maintenance: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    completed: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    archived: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  };

  const releaseStatusStyles: Record<ReleaseStatus, { row: string; badge: string; label: string; icon: string }> = {
    release: {
      row: 'bg-green-500/10 text-green-400 border-green-500/30',
      badge: 'bg-green-900/30 text-green-400',
      label: 'Release',
      icon: '🟢',
    },
    dev: {
      row: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      badge: 'bg-orange-900/30 text-orange-400',
      label: 'Dev',
      icon: '🟠',
    },
    close: {
      row: 'bg-red-500/10 text-red-400 border-red-500/30',
      badge: 'bg-red-900/30 text-red-400',
      label: 'Close',
      icon: '🔴',
    },
  };

  const renderProject = (project: ProjectWithChildren, level = 0) => {
    const isExpanded = expandedProjects.has(project.title);
    const hasChildren = project.children.length > 0;
    const hasVersions = !!project.roadmap && project.roadmap.length > 0;
    const relatedProjects = showRelatedProjects
      ? (project.linkedProjects ?? [])
          .map((title) => projectLookup.get(title))
          .filter((entry): entry is Project => !!entry)
      : [];
    const hasExpandable = hasChildren || hasVersions || relatedProjects.length > 0;

    return (
      <div key={project.id} className="mb-2">
        <div
          className={`flex min-h-[44px] items-center rounded-lg border p-3 transition-colors ${
            statusColors[project.status] || statusColors.archived
          }`}
          style={{ marginLeft: `${level * 16}px` }}
        >
          {hasExpandable && (
            <button
              onClick={() => toggleProject(project.title)}
              className="mr-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded text-lg transition-colors hover:bg-white/5"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          <div className="min-w-0 flex-1" onClick={() => setSelectedProject(project)}>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate text-sm font-bold">{project.title}</h3>
              {project.version && (
                <span className="flex-shrink-0 text-xs opacity-70">v{project.version}</span>
              )}
            </div>
            <p className="line-clamp-1 text-xs opacity-80">{project.description}</p>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              setFocusTitle((previous) => (previous === project.title ? null : project.title));
            }}
            className="ml-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded text-primary-400 transition-colors hover:bg-primary-400/10"
            aria-label="Toggle focus"
          >
            {focusTitle === project.title ? '◉' : '◎'}
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              setSelectedProject(project);
            }}
            className="ml-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded text-primary-400 transition-colors hover:bg-primary-400/10"
            aria-label="View details"
          >
            ⓘ
          </button>
        </div>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {hasChildren && project.children.map((child) => renderProject(child, level + 1))}

            {hasVersions && (
              <div className="space-y-1" style={{ marginLeft: `${(level + 1) * 16}px` }}>
                {project.roadmap!.map((milestone) => {
                  const statusStyle = releaseStatusStyles[milestone.releaseStatus];
                  return (
                    <button
                      key={milestone.version}
                      onClick={() =>
                        setSelectedVersion({
                          projectTitle: project.title,
                          version: milestone.version,
                          releaseStatus: milestone.releaseStatus,
                          items: milestone.items,
                        })
                      }
                      className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-opacity-80 ${statusStyle.row}`}
                    >
                      <div className="flex min-h-[44px] items-center">
                        <span className="mr-2 text-lg">{statusStyle.icon}</span>
                        <span className="font-mono text-sm">v{milestone.version}</span>
                        <span className="ml-2 text-xs opacity-70">{statusStyle.label}</span>
                        {milestone.items && milestone.items.length > 0 && (
                          <span className="ml-auto text-xs opacity-50">
                            {milestone.items.length} item{milestone.items.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {relatedProjects.length > 0 && (
              <div
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
                style={{ marginLeft: `${(level + 1) * 16}px` }}
              >
                <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Related
                </p>
                <div className="flex flex-wrap gap-2">
                  {relatedProjects.map((relatedProject) => (
                    <button
                      key={relatedProject.id}
                      onClick={() => {
                        setSelectedProject(relatedProject);
                        setFocusTitle(relatedProject.title);
                      }}
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-primary-400/60 hover:text-primary-300"
                    >
                      {relatedProject.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--color-text-secondary)]">
        <p>No projects found</p>
      </div>
    );
  }

  const relatedForModal = selectedProject?.linkedProjects
    ?.map((title) => projectLookup.get(title))
    .filter((entry): entry is Project => !!entry);

  return (
    <div className="mobile-project-list p-4">
      <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.56),rgba(8,47,73,0.24))] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl">
        <h2 className="mb-1 text-lg font-bold text-primary-400">{t.projectsNavigator}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t.searchHint}
        </p>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="flex-1 rounded-xl border border-cyan-300/20 bg-white/[0.04] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-primary-400"
            />
            <button
              onClick={() => setAdvancedOpen((previous) => !previous)}
              className="rounded-xl border border-cyan-300/20 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-text-secondary)]"
            >
              {advancedOpen ? t.hideTools : t.tools}
            </button>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="rounded-xl border border-cyan-300/20 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-text-secondary)]"
              >
                {t.clear}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
            <span>
              {t.visible}: {navigatorResult.visibleCount}/{navigatorResult.totalCount}
            </span>
            <span>
              {t.matched}: {navigatorResult.matchedCount}
            </span>
            {focusTitle && (
              <span>
                {t.focusCompact}: {navigatorResult.focusCount}
              </span>
            )}
          </div>

          {advancedOpen && (
            <div className="space-y-3 border-t border-cyan-300/15 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'projects', 'contributing'] as const).map((category) => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      categoryFilter === category
                        ? 'border-primary-400 bg-primary-400/20 text-primary-300'
                        : 'border-cyan-300/20 bg-white/[0.03] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {t.categoryOptions[category]}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {PROJECT_STATUS_VALUES.map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selectedStatuses.includes(status)
                        ? 'border-primary-400 bg-primary-400/20 text-primary-300'
                        : 'border-cyan-300/20 bg-white/[0.03] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {t.statusOptions[status]}
                  </button>
                ))}
              </div>

              <FocusProjectSelect
                options={sortedProjectTitles}
                value={focusTitle}
                onChange={setFocusTitle}
                allLabel={t.focusAllBranches}
                ariaLabel={t.focusAllBranches}
              />

              <button
                type="button"
                aria-pressed={showRelatedProjects}
                onClick={() => setShowRelatedProjects((previous) => !previous)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                  showRelatedProjects
                    ? 'border-primary-400 bg-primary-400/20 text-primary-300'
                    : 'border-cyan-300/20 bg-white/[0.03] text-[var(--color-text-secondary)]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    showRelatedProjects ? 'bg-primary-300' : 'bg-[var(--color-text-secondary)]/50'
                  }`}
                />
                {t.showRelatedProjects}
              </button>
            </div>
          )}
        </div>
      </div>

      {hierarchy.length > 0 ? (
        <div className="space-y-2">{hierarchy.map((project) => renderProject(project))}</div>
      ) : (
        <div className="rounded-lg border border-cyan-300/20 bg-white/[0.03] p-4 text-center backdrop-blur-xl">
          <p className="text-sm text-[var(--color-text-secondary)]">{t.noProjectsMatch}</p>
        </div>
      )}

      {selectedProject && (
        <div
          className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="glass-panel ui-scrollbar max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="pr-8 text-xl font-bold text-primary-400">{selectedProject.title}</h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="flex-shrink-0 text-2xl text-[var(--color-text-secondary)] hover:text-primary-400"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-[var(--color-text)]">{selectedProject.description}</p>

            <div className="mb-4 flex flex-wrap gap-2">
              {selectedProject.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-[var(--color-bg-secondary)] px-2 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            {selectedProject.version && (
              <p className="mb-4 text-sm text-primary-400">Current Version: v{selectedProject.version}</p>
            )}

            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() =>
                  setFocusTitle((previous) =>
                    previous === selectedProject.title ? null : selectedProject.title,
                  )
                }
                className="text-sm text-primary-400 hover:underline"
              >
                {focusTitle === selectedProject.title ? 'Unfocus branch' : 'Focus branch'}
              </button>
              {selectedProject.github && (
                <a
                  href={selectedProject.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-400 hover:underline"
                >
                  GitHub →
                </a>
              )}
              {selectedProject.link && (
                <a
                  href={selectedProject.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-400 hover:underline"
                >
                  Visit →
                </a>
              )}
            </div>

            {relatedForModal && relatedForModal.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-bold text-primary-400">Related</h3>
                <div className="flex flex-wrap gap-2">
                  {relatedForModal.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setFocusTitle(project.title);
                      }}
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-primary-400/60 hover:text-primary-300"
                    >
                      {project.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedProject.roadmap && selectedProject.roadmap.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-bold text-primary-400">Roadmap</h3>
                <div className="space-y-3">
                  {selectedProject.roadmap.map((milestone) => (
                    <div
                      key={milestone.version}
                      className="rounded-lg border border-[var(--color-border)] p-3"
                    >
                      <h4 className="mb-2 flex items-center gap-2 font-bold">
                        <span>v{milestone.version}</span>
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            releaseStatusStyles[milestone.releaseStatus].badge
                          }`}
                        >
                          {releaseStatusStyles[milestone.releaseStatus].label}
                        </span>
                      </h4>
                      {milestone.items && milestone.items.length > 0 &&
                        (milestone.releaseStatus === 'close' ? (
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {milestone.items.join(' ')}
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {milestone.items.map((item, index) => (
                              <li
                                key={index}
                                className="text-sm text-[var(--color-text-secondary)]"
                              >
                                • {item}
                              </li>
                            ))}
                          </ul>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedVersion && (
        <div
          className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVersion(null)}
        >
          <div
            className="glass-panel ui-scrollbar max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-primary-400">{selectedVersion.projectTitle}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <h3 className="text-lg font-bold">v{selectedVersion.version}</h3>
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      releaseStatusStyles[selectedVersion.releaseStatus].badge
                    }`}
                  >
                    {releaseStatusStyles[selectedVersion.releaseStatus].label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVersion(null)}
                className="flex-shrink-0 text-2xl text-[var(--color-text-secondary)] hover:text-primary-400"
              >
                ✕
              </button>
            </div>

            {selectedVersion.items && selectedVersion.items.length > 0 ? (
              <div>
                <h4 className="mb-3 text-base font-bold text-primary-400">Changes</h4>
                {selectedVersion.releaseStatus === 'close' ? (
                  <p className="text-sm text-[var(--color-text)]">{selectedVersion.items.join(' ')}</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedVersion.items.map((item, index) => (
                      <li key={index} className="text-sm text-[var(--color-text)]">
                        • {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-[var(--color-text-secondary)]">
                No detailed changelog available for this version.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
