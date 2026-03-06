import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectInspectorProject, ProjectRoadmapNodeData, ReleaseStatus } from './projects/types';
import {
  PROJECT_STATUS_VALUES,
  sortRoadmapByVersionDesc,
  type ProjectStatusValue,
} from '../lib/projectsNavigator';
import { getProjectsNavigatorCopy, type NavigatorLang } from '../lib/projectsNavigatorI18n';

interface Props {
  projects: ProjectRoadmapNodeData[];
  detailsUrl: string;
  lang?: NavigatorLang;
}

interface SelectedVersion {
  projectTitle: string;
  version: string;
  releaseStatus: ReleaseStatus;
  items?: string[];
}

type RoadmapNodeType = 'category' | 'project' | 'contribution';

interface RoadmapTreeNode {
  title: string;
  projectType: RoadmapNodeType;
  category?: string;
  project: ProjectRoadmapNodeData;
  children: RoadmapTreeNode[];
}

interface ProjectsInspectorResponse {
  projects: ProjectInspectorProject[];
}

const ROADMAP_THEME = {
  fontFamily: "'Cascadia Code', 'JetBrains Mono', monospace",
  colors: {
    category: {
      bg: '#004e75',
      border: '#00c3ff',
      text: '#ffffff',
      shadow: '4px 4px 0 0 #00c3ff',
    },
    project: {
      bg: '#0d1b2a',
      border: '#00c3ff',
      text: '#f3f4f6',
      shadow: '3px 3px 0 0 #007a99',
    },
    contribution: {
      bg: '#3c1e70',
      border: '#a370f7',
      text: '#e0aaff',
      shadow: '4px 4px 0 0 #a370f7',
    },
  },
  connector: {
    color: '#00c3ff',
    shadow: '0 0 8px rgba(0,195,255,0.6)',
    width: 2,
    round: 999,
  },
  groupBox: {
    borderColor: '#1a364a',
    borderWidth: 1.5,
    borderRadius: 12,
    background: 'rgba(8, 16, 22, 0.8)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 0 0 1px rgba(0, 195, 255, 0.04)',
    padding: '12px 14px',
  },
  centerNode: {
    bg: '#0f7a43',
    border: '#22c55e',
    text: '#ecfdf5',
    shadow: '4px 4px 0 0 #22c55e',
  },
} as const;

const ROADMAP_FONT = ROADMAP_THEME.fontFamily;
const ROADMAP_LINE = ROADMAP_THEME.connector.color;
const ROADMAP_LINE_SHADOW = ROADMAP_THEME.connector.shadow;
const DIAGRAM_CANVAS = { width: 1000, height: 1100 } as const;

const statusBadgeClass: Record<string, string> = {
  active: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  maintenance: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
  completed: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
  archived: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
};

const versionColor = (status: ReleaseStatus): string => {
  if (status === 'release') return '#22c55e';
  if (status === 'close') return '#ef4444';
  return '#f59e0b';
};

const versionLabel = (status: ReleaseStatus, lang: NavigatorLang): string => {
  if (lang === 'ja') {
    if (status === 'release') return 'リリース';
    if (status === 'close') return 'クローズ';
    return '開発中';
  }
  if (status === 'release') return 'Release';
  if (status === 'close') return 'Close';
  return 'Dev';
};

const statusToKnown = (status: string): ProjectStatusValue => {
  if ((PROJECT_STATUS_VALUES as readonly string[]).includes(status)) {
    return status as ProjectStatusValue;
  }
  return 'archived';
};

const normalizeProjectType = (value?: string): RoadmapNodeType => {
  if (value === 'category') return 'category';
  if (value === 'contribution') return 'contribution';
  return 'project';
};

const subtreeWeight = (node: RoadmapTreeNode): number => {
  if (node.children.length === 0) return 1;
  return 1 + node.children.reduce((sum, child) => sum + subtreeWeight(child), 0);
};

const rootRank = (title: string): number => {
  const normalized = title.toLowerCase();
  if (normalized === 'contributing') return 0;
  if (normalized === 'projects') return 1;
  if (normalized === 'shikou core') return 2;
  return 3;
};

const typeRank = (type: RoadmapNodeType): number => {
  if (type === 'category') return 0;
  if (type === 'project') return 1;
  return 2;
};

const sortTree = (nodes: RoadmapTreeNode[], rootLevel = false): void => {
  nodes.sort((left, right) => {
    if (rootLevel) {
      const rankDiff = rootRank(left.title) - rootRank(right.title);
      if (rankDiff !== 0) return rankDiff;
      const weightDiff = subtreeWeight(right) - subtreeWeight(left);
      if (weightDiff !== 0) return weightDiff;
    }

    const typeDiff = typeRank(left.projectType) - typeRank(right.projectType);
    if (typeDiff !== 0) return typeDiff;
    return left.title.localeCompare(right.title, 'en', { sensitivity: 'base' });
  });

  for (const node of nodes) {
    if (node.children.length > 0) {
      sortTree(node.children, false);
    }
  }
};

export default function ProjectsRoadmapVisualization({ projects, detailsUrl, lang = 'en' }: Props) {
  const t = getProjectsNavigatorCopy(lang);

  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<SelectedVersion | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [projectDetailsByTitle, setProjectDetailsByTitle] = useState<Map<string, ProjectInspectorProject> | null>(null);
  const [detailsState, setDetailsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const inspectorRef = useRef<HTMLElement | null>(null);
  const detailsRequestRef = useRef<Promise<Map<string, ProjectInspectorProject>> | null>(null);

  const loadProjectDetails = useCallback(async (): Promise<Map<string, ProjectInspectorProject>> => {
    if (projectDetailsByTitle) return projectDetailsByTitle;
    if (detailsRequestRef.current) return detailsRequestRef.current;

    setDetailsState('loading');
    const request = fetch(detailsUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load project details: ${response.status}`);
        }

        const payload = (await response.json()) as ProjectsInspectorResponse;
        const detailsMap = new Map(payload.projects.map((project) => [project.title, project]));
        setProjectDetailsByTitle(detailsMap);
        setDetailsState('ready');
        return detailsMap;
      })
      .catch((error) => {
        detailsRequestRef.current = null;
        setDetailsState('error');
        throw error;
      });

    detailsRequestRef.current = request;
    return request;
  }, [detailsUrl, projectDetailsByTitle]);

  const roots = useMemo<RoadmapTreeNode[]>(() => {
    if (projects.length === 0) return [];

    const nodeByTitle = new Map<string, RoadmapTreeNode>();
    for (const project of projects) {
      nodeByTitle.set(project.title, {
        title: project.title,
        projectType: normalizeProjectType(project.projectType),
        category: project.category,
        project,
        children: [],
      });
    }

    const treeRoots: RoadmapTreeNode[] = [];
    for (const project of projects) {
      const node = nodeByTitle.get(project.title);
      if (!node) continue;
      if (project.parentProject) {
        const parent = nodeByTitle.get(project.parentProject);
        if (parent) {
          parent.children.push(node);
          continue;
        }
      }
      treeRoots.push(node);
    }

    sortTree(treeRoots, true);
    return treeRoots;
  }, [projects]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectTitle || !projectDetailsByTitle) return null;
    return projectDetailsByTitle.get(selectedProjectTitle) ?? null;
  }, [projectDetailsByTitle, selectedProjectTitle]);

  const relatedProjects = selectedProject?.linkedProjects
    ?.map((title) => projectDetailsByTitle?.get(title))
    .filter((entry): entry is ProjectInspectorProject => !!entry);

  const selectProject = (title: string): void => {
    setSelectedProjectTitle(title);
    setSelectedVersion(null);
    setInspectorOpen(true);
    void loadProjectDetails();
  };

  const selectVersion = (version: SelectedVersion): void => {
    setSelectedVersion((previous) =>
      previous?.projectTitle === version.projectTitle && previous.version === version.version ? null : version,
    );
    setSelectedProjectTitle(version.projectTitle);
    setInspectorOpen(true);
    void loadProjectDetails();
  };

  useEffect(() => {
    if (selectedProjectTitle || selectedVersion) {
      setInspectorOpen(true);
    }
  }, [selectedProjectTitle, selectedVersion]);

  useEffect(() => {
    const updateViewportWidth = (): void => {
      setViewportWidth(window.innerWidth);
    };

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);

    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    if (!inspectorOpen) return;
    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 0);
    const onPointerDown = (event: PointerEvent): void => {
      if (!armed) return;
      const target = event.target;
      if (target instanceof Node && inspectorRef.current?.contains(target)) {
        return;
      }
      setInspectorOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.clearTimeout(armTimer);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [inspectorOpen]);

  useEffect(() => {
    if (!inspectorOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setInspectorOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspectorOpen]);

  const selectedTitle = selectedProjectTitle;
  const canvasVerticalPadding = 32 + 60;
  const availableDiagramWidth = viewportWidth > 0 ? Math.max(viewportWidth - 24, 280) : DIAGRAM_CANVAS.width;
  const isMobileViewport = viewportWidth > 0 && viewportWidth < 768;
  const isTabletViewport = viewportWidth >= 768 && viewportWidth < 1024;
  const isDiagramReady = viewportWidth > 0;
  const diagramScale = viewportWidth > 0
    ? Math.min(1, availableDiagramWidth / DIAGRAM_CANVAS.width)
    : 1;
  const scaledCanvasWidth = DIAGRAM_CANVAS.width * diagramScale;
  const scaledCanvasHeight = (DIAGRAM_CANVAS.height + canvasVerticalPadding) * diagramScale;
  const inspectorShellStyle = isMobileViewport
    ? { padding: '12px', paddingTop: '72px' }
    : isTabletViewport
      ? { padding: '14px', paddingTop: '84px' }
    : { padding: '16px', paddingTop: '96px' };
  const inspectorPanelStyle = isMobileViewport
    ? { width: 'min(76vw, 290px)', height: 'calc(100vh - 5.5rem)' }
    : isTabletViewport
      ? { width: 'min(42vw, 340px)', height: 'calc(100vh - 6.25rem)' }
    : { width: 'min(92vw, 380px)', height: 'calc(100vh - 7rem)' };
  const roadmapByTitle = useMemo(() => {
    const map = new Map<string, RoadmapTreeNode>();
    const visit = (node: RoadmapTreeNode): void => {
      map.set(node.title, node);
      node.children.forEach(visit);
    };
    roots.forEach(visit);
    return map;
  }, [roots]);

  const renderDiagramLine = (
    left: number,
    top: number,
    options: { width?: number; height?: number },
  ) => (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: options.width ?? ROADMAP_THEME.connector.width,
        height: options.height ?? ROADMAP_THEME.connector.width,
        background: ROADMAP_LINE,
        boxShadow: ROADMAP_LINE_SHADOW,
        borderRadius: ROADMAP_THEME.connector.round,
        zIndex: 0,
      }}
    />
  );

  const renderDiagramNode = ({
    title,
    label,
    variant,
    left,
    top,
    width,
    height,
    interactive = true,
  }: {
    title: string;
    label?: string;
    variant: 'root' | 'label' | 'project' | 'contribution';
    left: number;
    top: number;
    width: number;
    height?: number;
    interactive?: boolean;
  }) => {
    const node = roadmapByTitle.get(title);
    const isSelected = selectedTitle === title;

    const palette =
      title === 'vremyavnikuda'
        ? ROADMAP_THEME.centerNode
        : variant === 'root'
        ? ROADMAP_THEME.colors.category
        : variant === 'label'
          ? ROADMAP_THEME.colors.category
          : variant === 'contribution'
            ? ROADMAP_THEME.colors.contribution
            : ROADMAP_THEME.colors.project;

    const borderColor = isSelected ? '#22f0ff' : palette.border;
    const boxShadow =
      variant === 'label'
        ? `2px 2px 0 0 ${palette.border}`
        : palette.shadow;

    return (
      <button
        key={`${title}-${variant}-${left}-${top}`}
        type="button"
        onClick={() => {
          if (interactive && node) selectProject(node.title);
        }}
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: palette.bg,
          border: `2px solid ${borderColor}`,
          color: palette.text,
          borderRadius: variant === 'label' ? 4 : 8,
          boxShadow,
          fontFamily: ROADMAP_FONT,
          fontSize: variant === 'label' ? 12 : 13,
          fontWeight: 700,
          letterSpacing: 0.3,
          cursor: interactive && node ? 'pointer' : 'default',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
          transform: 'translateY(0)',
          userSelect: 'none',
          zIndex: variant === 'label' ? 20 : 10,
        }}
        onMouseEnter={(event) => {
          if (!(interactive && node)) return;
          const element = event.currentTarget;
          element.style.transform = 'translateY(-3px)';
          element.style.boxShadow =
            variant === 'label'
              ? `3px 3px 0 0 ${palette.border}`
              : `5px 5px 0 0 ${palette.border}`;
        }}
        onMouseLeave={(event) => {
          if (!(interactive && node)) return;
          const element = event.currentTarget;
          element.style.transform = 'translateY(0)';
          element.style.boxShadow = boxShadow;
        }}
      >
        {label ?? title}
      </button>
    );
  };

  const renderGroupBox = (left: number, top: number, width: number, height: number) => (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        border: `${ROADMAP_THEME.groupBox.borderWidth}px solid ${ROADMAP_THEME.groupBox.borderColor}`,
        background: ROADMAP_THEME.groupBox.background,
        borderRadius: ROADMAP_THEME.groupBox.borderRadius,
        boxShadow: ROADMAP_THEME.groupBox.boxShadow,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );

  const hasNode = (title: string) => roadmapByTitle.has(title);

  return (
    <div className="grid grid-cols-12 gap-4">
      {roots.length === 0 ? (
        <div className="col-span-12 rounded-2xl border border-cyan-300/20 bg-white/[0.03] p-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">{t.noNodesMatch}</p>
        </div>
      ) : (
        <div className="col-span-12 grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <div className="overflow-hidden">
              <div
                className="roadmap-canvas-viewport"
                data-ready={isDiagramReady ? 'true' : 'false'}
                style={{
                  width: '100%',
                  maxWidth: scaledCanvasWidth,
                  height: scaledCanvasHeight,
                  margin: '0 auto',
                  overflow: 'visible',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: DIAGRAM_CANVAS.width,
                    height: DIAGRAM_CANVAS.height + canvasVerticalPadding,
                    transform: `scale(${diagramScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, padding: '32px 0 60px' }}>
                    {hasNode('contributing') && renderDiagramLine(500, 70, { height: 380 })}
                  {hasNode('contributing') &&
                    renderDiagramNode({
                      title: 'contributing',
                      variant: 'contribution',
                      left: 400,
                      top: 20,
                      width: 200,
                      height: 50,
                      interactive: false,
                    })}

                  {hasNode('hyprview') && renderDiagramLine(500, 120, { width: 100 })}
                  {hasNode('hyprview') &&
                    renderDiagramNode({ title: 'hyprview', variant: 'project', left: 600, top: 100, width: 100, height: 46 })}

                  {hasNode('google') && hasNode('google-cloud-rust') && (
                    <>
                      {renderDiagramLine(460, 185, { width: 40 })}
                      {renderGroupBox(280, 140, 200, 90)}
                      {renderDiagramNode({
                        title: 'google',
                        variant: 'label',
                        left: 340,
                        top: 128,
                        width: 80,
                        height: 28,
                        interactive: false,
                      })}
                      {renderDiagramNode({
                        title: 'google-cloud-rust',
                        variant: 'project',
                        left: 300,
                        top: 165,
                        width: 160,
                        height: 46,
                      })}
                    </>
                  )}

                  {hasNode('rust') && hasNode('rust-analyzer') && (
                    <>
                      {renderDiagramLine(445, 325, { width: 55 })}
                      {renderGroupBox(295, 280, 170, 90)}
                      {renderDiagramNode({ title: 'rust', variant: 'label', left: 345, top: 268, width: 60, height: 28 })}
                      {renderDiagramNode({
                        title: 'rust-analyzer',
                        variant: 'project',
                        left: 315,
                        top: 305,
                        width: 130,
                        height: 46,
                      })}
                    </>
                  )}

                  {renderDiagramNode({
                    title: 'vremyavnikuda',
                    label: 'vremyavnikuda',
                    variant: 'root',
                    left: 390,
                    top: 450,
                    width: 220,
                    height: 50,
                    interactive: false,
                  })}

                  {renderDiagramLine(500, 500, { height: 26 })}
                  {renderDiagramLine(250, 526, { width: 500 })}
                  {renderDiagramLine(250, 526, { height: 24 })}
                  {renderDiagramLine(750, 526, { height: 24 })}

                  {hasNode('projects') &&
                    renderDiagramNode({
                      title: 'projects',
                      variant: 'contribution',
                      left: 160,
                      top: 550,
                      width: 180,
                      height: 50,
                      interactive: false,
                    })}
                  {hasNode('Shikou Core') &&
                    renderDiagramNode({
                      title: 'Shikou Core',
                      label: 'shikou core',
                      variant: 'contribution',
                      left: 660,
                      top: 550,
                      width: 180,
                      height: 50,
                    })}

                  {hasNode('projects') && renderDiagramLine(250, 600, { height: 386 })}

                  {hasNode('Personal Blog') && (
                    <>
                      {renderDiagramLine(250, 670, { width: 70 })}
                      {renderDiagramNode({ title: 'Personal Blog', variant: 'project', left: 320, top: 650, width: 140, height: 46 })}
                    </>
                  )}

                  {hasNode('sysinfo_utils') && (
                    <>
                      {renderDiagramLine(250, 740, { width: 70 })}
                      {renderDiagramNode({ title: 'sysinfo_utils', variant: 'project', left: 320, top: 720, width: 140, height: 46 })}
                    </>
                  )}

                  {hasNode('windows') && hasNode('spath') && (
                    <>
                      {renderDiagramLine(185, 740, { width: 65 })}
                      {renderGroupBox(50, 700, 155, 215)}
                      {renderDiagramNode({
                        title: 'windows',
                        variant: 'label',
                        left: 85,
                        top: 688,
                        width: 78,
                        height: 28,
                        interactive: false,
                      })}
                      {renderDiagramNode({ title: 'spath', variant: 'project', left: 65, top: 720, width: 125, height: 46 })}
                    </>
                  )}

                  {hasNode('spath_cli') && hasNode('spath_gui') && (
                    <>
                      {renderGroupBox(60, 780, 135, 120)}
                      {renderDiagramNode({ title: 'spath_cli', variant: 'project', left: 75, top: 795, width: 105, height: 46 })}
                      {renderDiagramNode({ title: 'spath_gui', variant: 'project', left: 75, top: 850, width: 105, height: 46 })}
                    </>
                  )}

                  {hasNode('anchora') && (
                    <>
                      {renderDiagramLine(200, 986, { width: 50 })}
                      {renderDiagramNode({ title: 'anchora', variant: 'project', left: 100, top: 966, width: 100, height: 46 })}
                    </>
                  )}

                  {hasNode('Shikou Core') && renderDiagramLine(750, 600, { height: 270 })}

                  {hasNode('hyprshot-rs') && (
                    <>
                      {renderDiagramLine(675, 720, { width: 75 })}
                      {renderGroupBox(540, 680, 150, 140)}
                      {renderDiagramNode({ title: 'hyprshot-rs', variant: 'label', left: 565, top: 668, width: 108, height: 28 })}
                    </>
                  )}

                  {hasNode('grim-rs') &&
                    renderDiagramNode({ title: 'grim-rs', variant: 'project', left: 555, top: 700, width: 120, height: 46 })}
                  {hasNode('slurp-rs') &&
                    renderDiagramNode({ title: 'slurp-rs', variant: 'project', left: 555, top: 760, width: 120, height: 46 })}

                  {hasNode('ink2tex') && (
                    <>
                      {renderDiagramLine(660, 870, { width: 90 })}
                      {renderDiagramNode({ title: 'ink2tex', variant: 'project', left: 560, top: 850, width: 100, height: 46 })}
                    </>
                  )}

                  {hasNode('rust-fmt') && (
                    <>
                      {renderDiagramLine(750, 670, { width: 50 })}
                      {renderDiagramNode({ title: 'rust-fmt', variant: 'project', left: 800, top: 650, width: 100, height: 46 })}
                    </>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none fixed inset-y-0 right-0 z-50 flex items-start"
        style={inspectorShellStyle}
      >
        <aside
          ref={inspectorRef}
          className={`ui-scrollbar overflow-y-auto rounded-2xl border border-cyan-300/20 bg-slate-950/90 p-4 shadow-[0_16px_44px_rgba(2,6,23,0.64)] backdrop-blur-xl transition-all duration-300 ${
            inspectorOpen ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-[110%] opacity-0'
          }`}
          style={inspectorPanelStyle}
        >
          <div className="space-y-3">
            <section className="rounded-2xl border border-cyan-300/20 bg-white/[0.03] p-4">
              {!selectedProjectTitle && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {lang === 'ja'
                    ? 'ノードを選択すると、ここに詳細が表示されます。'
                    : 'Select a node to inspect details.'}
                </p>
              )}

              {selectedProjectTitle && detailsState === 'loading' && !selectedProject && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {lang === 'ja' ? 'プロジェクト情報を読み込み中...' : 'Loading project details...'}
                </p>
              )}

              {selectedProjectTitle && detailsState === 'error' && !selectedProject && (
                <p className="text-sm text-rose-300">
                  {lang === 'ja'
                    ? 'プロジェクト情報の読み込みに失敗しました。'
                    : 'Failed to load project details.'}
                </p>
              )}

              {selectedProject && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-bold text-primary-300">{selectedProject.title}</h4>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        statusBadgeClass[statusToKnown(selectedProject.status)]
                      }`}
                    >
                      {t.statusOptions[statusToKnown(selectedProject.status)]}
                    </span>
                    {selectedProject.version && (
                      <span className="rounded-full border border-cyan-300/30 px-2 py-0.5 text-xs text-cyan-200">
                        v{selectedProject.version}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[var(--color-text-secondary)]">{selectedProject.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {selectedProject.github && (
                      <a
                        href={selectedProject.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-300 hover:underline"
                      >
                        GitHub
                      </a>
                    )}

                    {selectedProject.link && (
                      <a
                        href={selectedProject.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-300 hover:underline"
                      >
                        {lang === 'ja' ? 'リンク' : 'Visit'}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </section>

            {selectedProject?.roadmap && selectedProject.roadmap.length > 0 && (
              <section className="rounded-2xl border border-cyan-300/20 bg-white/[0.03] p-4">
                <h4 className="mb-3 text-sm font-semibold text-primary-300">
                  {lang === 'ja' ? 'バージョン履歴' : 'Version Timeline'}
                </h4>
                <div className="space-y-2">
                  {sortRoadmapByVersionDesc(selectedProject.roadmap).map((entry) => {
                    const isExpanded =
                      selectedVersion?.projectTitle === selectedProject.title &&
                      selectedVersion.version === entry.version;

                    return (
                      <div
                        key={`${selectedProject.title}-${entry.version}`}
                        className="overflow-hidden rounded-lg border border-cyan-300/20 bg-black/15"
                      >
                        <button
                          onClick={() =>
                            selectVersion({
                              projectTitle: selectedProject.title,
                              version: entry.version,
                              releaseStatus: entry.releaseStatus,
                              items: entry.items,
                            })
                          }
                          className="w-full px-3 py-2 text-left text-sm transition hover:border-primary-400/60"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-cyan-100">v{entry.version}</span>
                            <span className="text-xs" style={{ color: versionColor(entry.releaseStatus) }}>
                              {versionLabel(entry.releaseStatus, lang)}
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-cyan-300/15 px-3 pb-3 pt-2">
                            {entry.items && entry.items.length > 0 ? (
                              <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                                {entry.items.map((item, index) => (
                                  <li key={`${entry.version}-${index}`}>• {item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[var(--color-text-secondary)]">
                                {lang === 'ja'
                                  ? 'このバージョンの詳細項目はありません。'
                                  : 'No detailed items for this version.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {relatedProjects && relatedProjects.length > 0 && (
              <section className="rounded-2xl border border-cyan-300/20 bg-white/[0.03] p-4">
                <h4 className="mb-2 text-sm font-semibold text-primary-300">
                  {lang === 'ja' ? '関連プロジェクト' : 'Related Projects'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {relatedProjects.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => selectProject(entry.title)}
                      className="rounded-full border border-cyan-300/20 px-3 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-primary-400/60 hover:text-primary-300"
                    >
                      {entry.title}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
