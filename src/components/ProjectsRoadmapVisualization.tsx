import { useEffect, useMemo, useRef, useState } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { ZoomBehavior, ZoomTransform } from 'd3-zoom';
import { useDeviceType } from '../hooks/useMediaQuery';
import type { Project, ReleaseStatus } from './projects/types';
import {
  PROJECT_STATUS_VALUES,
  filterProjectsForNavigator,
  type ProjectCategoryFilter,
  type ProjectStatusValue,
} from '../lib/projectsNavigator';
import { getProjectsNavigatorCopy, type NavigatorLang } from '../lib/projectsNavigatorI18n';
import FocusProjectSelect from './FocusProjectSelect';

interface Props {
  projects: Project[];
  lang?: NavigatorLang;
}

interface TreeNode {
  name: string;
  type: 'root' | 'project' | 'version';
  data?: Project | { version: string; releaseStatus: ReleaseStatus; items?: string[] };
  children?: TreeNode[];
}

export default function ProjectsRoadmapVisualization({ projects, lang = 'en' }: Props) {
  const deviceType = useDeviceType();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const initialTransformRef = useRef<ZoomTransform | null>(null);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: Project | { version: string; releaseStatus: ReleaseStatus; items?: string[] } | null;
    type: 'project' | 'version';
  }>({ visible: false, x: 0, y: 0, content: null, type: 'project' });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<{
    projectTitle: string;
    version: string;
    releaseStatus: ReleaseStatus;
    items?: string[];
  } | null>(null);

  const [query, setQuery] = useState('');
  const [focusTitle, setFocusTitle] = useState<string | null>(null);
  const [showLinkedProjects, setShowLinkedProjects] = useState(true);
  const [showVersionNodes, setShowVersionNodes] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategoryFilter>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatusValue[]>([
    ...PROJECT_STATUS_VALUES,
  ]);
  const t = getProjectsNavigatorCopy(lang);

  const releaseStatusLabel = (status: ReleaseStatus): string => {
    if (status === 'release') return 'Release';
    if (status === 'close') return 'Close';
    return 'Dev';
  };

  const releaseStatusBadgeClass = (status: ReleaseStatus): string => {
    if (status === 'release') return 'bg-green-900/30 text-green-400';
    if (status === 'close') return 'bg-red-900/30 text-red-400';
    return 'bg-orange-900/30 text-orange-400';
  };

  const releaseStatusColor = (status: ReleaseStatus): string => {
    if (status === 'release') return '#10b981';
    if (status === 'close') return '#ef4444';
    return '#f59e0b';
  };

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

  const hasActiveFilters =
    query.trim().length > 0 ||
    categoryFilter !== 'all' ||
    selectedStatuses.length !== PROJECT_STATUS_VALUES.length ||
    !!focusTitle;
  const searchActive = query.trim().length > 0;
  const showLinkedEdgesOnCanvas = showLinkedProjects && !searchActive;

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
    setShowLinkedProjects(true);
    setShowVersionNodes(false);
  };

  const resetView = (): void => {
    if (!svgRef.current || !zoomBehaviorRef.current || !initialTransformRef.current) return;
    const svg = select(svgRef.current);
    svg.call(zoomBehaviorRef.current.transform as any, initialTransformRef.current);
  };

  useEffect(() => {
    if (!svgRef.current || projects.length === 0) return;

    select(svgRef.current).selectAll('*').remove();
    setTooltip((previous) => ({ ...previous, visible: false }));

    if (visibleProjects.length === 0) {
      return;
    }

    const projectsMap = new Map<string, TreeNode>();
    const rootProjects: TreeNode[] = [];

    visibleProjects.forEach((project) => {
      const versionNodes: TreeNode[] =
        showVersionNodes
          ? project.roadmap?.map((milestone) => ({
              name: `v${milestone.version}`,
              type: 'version' as const,
              data: {
                version: milestone.version,
                releaseStatus: milestone.releaseStatus,
                items: milestone.items,
              },
            })) ?? []
          : [];

      const projectNode: TreeNode = {
        name: project.title,
        type: 'project',
        data: project,
        children: [...versionNodes],
      };

      projectsMap.set(project.title, projectNode);
    });

    visibleProjects.forEach((project) => {
      const projectNode = projectsMap.get(project.title);
      if (!projectNode) return;

      if (project.parentProject) {
        const parentNode = projectsMap.get(project.parentProject);
        if (parentNode) {
          parentNode.children?.push(projectNode);
        } else {
          rootProjects.push(projectNode);
        }
      } else {
        rootProjects.push(projectNode);
      }
    });

    const treeData: TreeNode = {
      name: focusTitle ? `focus: ${focusTitle}` : 'vremyavnikuda',
      type: 'root',
      children: rootProjects,
    };

    const width = containerRef.current?.clientWidth || window.innerWidth - 20;
    const height = deviceType === 'tablet' ? 700 : Math.max(800, window.innerHeight - 100);
    const margin =
      deviceType === 'tablet'
        ? { top: 10, right: 20, bottom: 10, left: 20 }
        : { top: 20, right: 40, bottom: 20, left: 40 };

    const nodeRadius = deviceType === 'tablet' ? 10 : 12;
    const touchTargetSize = 44;
    const rectWidth = deviceType === 'tablet' ? 120 : 160;
    const rectHeight = deviceType === 'tablet' ? 36 : 40;
    const nodeSpacing = {
      vertical: rectHeight + (deviceType === 'tablet' ? 24 : 28),
      horizontal: rectWidth + (deviceType === 'tablet' ? 90 : 110),
    };

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('font-family', '"Cascadia Code", monospace')
      .style('font-size', '13px');

    const g = svg.append('g');

    const treeLayout = tree<TreeNode>()
      .nodeSize([nodeSpacing.vertical, nodeSpacing.horizontal])
      .separation((a, b) => {
        const aIsCategory = a.data.type === 'project' && a.depth === 1;
        const bIsCategory = b.data.type === 'project' && b.depth === 1;
        const bothAreCategories = aIsCategory && bIsCategory;
        if (bothAreCategories && a.parent === b.parent) {
          return deviceType === 'tablet' ? 2 : 2.4;
        }

        const aIsVersion = a.data.type === 'version';
        const bIsVersion = b.data.type === 'version';
        if (aIsVersion || bIsVersion) {
          return deviceType === 'tablet' ? 1.25 : 1.4;
        }

        const baseSeparation = deviceType === 'tablet' ? 1.35 : 1.5;
        const crossSeparation = deviceType === 'tablet' ? 1.7 : 2.0;
        return a.parent === b.parent ? baseSeparation : crossSeparation;
      });

    const root = hierarchy(treeData);
    const treeDataComputed = treeLayout(root);
    const rootNode = treeDataComputed;
    const rootY = rootNode.y;
    const rootX = rootNode.x;

    if (rootNode.children && rootNode.children.length > 0) {
      const children = rootNode.children;
      const leftBranches: typeof children = [];
      const rightBranches: typeof children = [];

      children.forEach((child) => {
        const childName = child.data.name;
        if (childName === 'Shikou Core' || childName === 'projects') {
          leftBranches.push(child);
        } else {
          rightBranches.push(child);
        }
      });

      if (leftBranches.length > 0) {
        let leftMinX = Infinity;
        let leftMaxX = -Infinity;
        leftBranches.forEach((branch) => {
          branch.descendants().forEach((node) => {
            if (node.x < leftMinX) leftMinX = node.x;
            if (node.x > leftMaxX) leftMaxX = node.x;
          });
        });

        const leftCenterX = (leftMinX + leftMaxX) / 2;
        const leftOffsetX = rootX - leftCenterX;
        leftBranches.forEach((branch) => {
          branch.descendants().forEach((node) => {
            node.x += leftOffsetX;
            node.y = rootY - (node.y - rootY);
          });
        });
      }

      if (rightBranches.length > 0) {
        let rightMinX = Infinity;
        let rightMaxX = -Infinity;
        rightBranches.forEach((branch) => {
          branch.descendants().forEach((node) => {
            if (node.x < rightMinX) rightMinX = node.x;
            if (node.x > rightMaxX) rightMaxX = node.x;
          });
        });

        const rightCenterX = (rightMinX + rightMaxX) / 2;
        const rightOffsetX = rootX - rightCenterX;
        rightBranches.forEach((branch) => {
          branch.descendants().forEach((node) => {
            node.x += rightOffsetX;
          });
        });
      }
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    treeDataComputed.descendants().forEach((node) => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    const padding = deviceType === 'tablet' ? 60 : 100;
    const dataWidth = maxY - minY + padding * 2;
    const dataHeight = maxX - minX + padding * 2;
    const scale = Math.min(
      (width - margin.left - margin.right) / dataWidth,
      (height - margin.top - margin.bottom) / dataHeight,
      deviceType === 'tablet' ? 0.8 : 1,
    );

    const centerX = (width - (maxY - minY) * scale) / 2 - minY * scale;
    const centerY = (height - (maxX - minX) * scale) / 2 - minX * scale;

    const statusColors = {
      active: '#10b981',
      maintenance: '#3b82f6',
      completed: '#8b5cf6',
      archived: '#6b7280',
    };

    const versionCircleRadius = nodeRadius - (deviceType === 'tablet' ? 3 : 4);
    const rootCircleRadius = nodeRadius;

    const getNodeEdgeOffset = (nodeType: string): number => {
      if (nodeType === 'project') return rectWidth / 2;
      if (nodeType === 'version') return versionCircleRadius;
      if (nodeType === 'root') return rootCircleRadius;
      return rectWidth / 2;
    };

    const createEdgeToEdgePath = (link: any): string => {
      const sourceY = link.source.y;
      const targetY = link.target.y;
      const sourceX = link.source.x;
      const targetX = link.target.x;
      const sourceType = link.source.data.type;
      const targetType = link.target.data.type;
      const sourceOffset = getNodeEdgeOffset(sourceType);
      const targetOffset = getNodeEdgeOffset(targetType);
      const goingRight = targetY > sourceY;

      let x0: number;
      let x1: number;
      if (goingRight) {
        x0 = sourceY + sourceOffset;
        x1 = targetY - targetOffset;
      } else {
        x0 = sourceY - sourceOffset;
        x1 = targetY + targetOffset;
      }

      const y0 = sourceX;
      const y1 = targetX;
      const mx = (x0 + x1) / 2;
      return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
    };

    g.selectAll('.link')
      .data(treeDataComputed.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', createEdgeToEdgePath)
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    if (showLinkedEdgesOnCanvas) {
      const additionalLinks: Array<{ source: any; target: any }> = [];

      treeDataComputed.descendants().forEach((node) => {
        const project = node.data.data as Project;
        if (!project?.linkedProjects || project.linkedProjects.length === 0) return;

        project.linkedProjects.forEach((linkedTitle) => {
          const targetNode = treeDataComputed
            .descendants()
            .find((entry) => entry.data.name === linkedTitle);
          if (targetNode) {
            additionalLinks.push({ source: node, target: targetNode });
          }
        });
      });

      const createLinkedPath = (source: any, target: any): string => {
        const sourceY = source.y;
        const targetY = target.y;
        const sourceX = source.x;
        const targetX = target.x;
        const sourceType = source.data.type;
        const targetType = target.data.type;
        const sourceOffset = getNodeEdgeOffset(sourceType);
        const targetOffset = getNodeEdgeOffset(targetType);
        const goingRight = targetY > sourceY;

        let x0: number;
        let x1: number;
        if (goingRight) {
          x0 = sourceY + sourceOffset;
          x1 = targetY - targetOffset;
        } else {
          x0 = sourceY - sourceOffset;
          x1 = targetY + targetOffset;
        }

        const y0 = sourceX;
        const y1 = targetX;
        const mx = (x0 + x1) / 2;

        return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
      };

      g.selectAll('.linked-link')
        .data(additionalLinks)
        .enter()
        .append('path')
        .attr('class', 'linked-link')
        .attr('d', (entry) => createLinkedPath(entry.source, entry.target))
        .attr('fill', 'none')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.6);
    }

    const node = g
      .selectAll('.node')
      .data(treeDataComputed.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (entry) => `translate(${entry.y},${entry.x})`);

    node
      .filter((entry) => entry.data.type === 'project')
      .append('rect')
      .attr('x', -rectWidth / 2)
      .attr('y', -rectHeight / 2)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('rx', 8)
      .attr('fill', (entry) => {
        const project = entry.data.data as Project;
        return statusColors[project.status as keyof typeof statusColors] || '#6b7280';
      })
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, entry) {
        if (deviceType !== 'desktop') return;
        select(this).attr('opacity', 1).attr('stroke-width', 3);
        const project = entry.data.data as Project;
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: project,
          type: 'project',
        });
      })
      .on('mouseleave', function () {
        if (deviceType !== 'desktop') return;
        select(this).attr('opacity', 0.8).attr('stroke-width', 2);
        setTooltip((previous) => ({ ...previous, visible: false }));
      })
      .on('click', (event, entry) => {
        const project = entry.data.data as Project;
        setSelectedProject(project);

        if (deviceType === 'tablet') {
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: project,
            type: 'project',
          });
          setTimeout(() => {
            setTooltip((previous) => ({ ...previous, visible: false }));
          }, 3000);
        }
      })
      .on('dblclick', (_event, entry) => {
        const project = entry.data.data as Project;
        setFocusTitle((previous) => (previous === project.title ? null : project.title));
      });

    const versionNodes = node.filter((entry) => entry.data.type === 'version');

    if (deviceType === 'tablet') {
      versionNodes
        .append('circle')
        .attr('r', touchTargetSize / 2)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('click', (event, entry) => {
          const versionData = entry.data.data as {
            version: string;
            releaseStatus: ReleaseStatus;
            items?: string[];
          };
          const parentProject = entry.parent?.data.data as Project | undefined;
          if (!parentProject) return;

          setSelectedVersion({
            projectTitle: parentProject.title,
            version: versionData.version,
            releaseStatus: versionData.releaseStatus,
            items: versionData.items,
          });
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: versionData,
            type: 'version',
          });
          setTimeout(() => {
            setTooltip((previous) => ({ ...previous, visible: false }));
          }, 3000);
        });
    }

    versionNodes
      .append('circle')
      .attr('r', nodeRadius - (deviceType === 'tablet' ? 3 : 4))
      .attr('fill', (entry) => {
        const versionData = entry.data.data as {
          version: string;
          releaseStatus: ReleaseStatus;
          items?: string[];
        };
        return releaseStatusColor(versionData.releaseStatus);
      })
      .attr('stroke', (entry) => {
        const versionData = entry.data.data as {
          version: string;
          releaseStatus: ReleaseStatus;
          items?: string[];
        };
        return releaseStatusColor(versionData.releaseStatus);
      })
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('pointer-events', deviceType === 'tablet' ? 'none' : 'all')
      .on('mouseenter', function (event, entry) {
        if (deviceType !== 'desktop') return;

        select(this).attr('r', nodeRadius);
        const versionData = entry.data.data as {
          version: string;
          releaseStatus: ReleaseStatus;
          items?: string[];
        };
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: versionData,
          type: 'version',
        });
      })
      .on('mouseleave', function () {
        if (deviceType !== 'desktop') return;

        select(this).attr('r', nodeRadius - 4);
        setTooltip((previous) => ({ ...previous, visible: false }));
      })
      .on('click', (_event, entry) => {
        if (deviceType !== 'desktop') return;

        const versionData = entry.data.data as {
          version: string;
          releaseStatus: ReleaseStatus;
          items?: string[];
        };
        const parentProject = entry.parent?.data.data as Project | undefined;
        if (!parentProject) return;

        setSelectedVersion({
          projectTitle: parentProject.title,
          version: versionData.version,
          releaseStatus: versionData.releaseStatus,
          items: versionData.items,
        });
      });

    node
      .filter((entry) => entry.data.type === 'root')
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', '#06b6d4')
      .attr('stroke', '#0a0a0a')
      .attr('stroke-width', 3);

    node
      .append('text')
      .attr('dy', (entry) => {
        if (entry.data.type === 'project') return 4;
        if (entry.data.type === 'root') return deviceType === 'tablet' ? -18 : -20;
        return deviceType === 'tablet' ? 22 : 25;
      })
      .attr('text-anchor', 'middle')
      .text((entry) => entry.data.name)
      .attr('fill', (entry) => {
        if (entry.data.type === 'root') return '#06b6d4';
        if (entry.data.type === 'project') return '#f9fafb';
        if (entry.data.type === 'version') {
          const versionData = entry.data.data as { releaseStatus: ReleaseStatus };
          return releaseStatusColor(versionData.releaseStatus);
        }
        return 'var(--color-text-primary)';
      })
      .attr('font-weight', (entry) => (entry.data.type === 'root' ? 'bold' : 'normal'))
      .attr('font-size', (entry) => {
        const sizeMultiplier = deviceType === 'tablet' ? 0.85 : 1;
        if (entry.data.type === 'root') return `${16 * sizeMultiplier}px`;
        if (entry.data.type === 'project') return `${12 * sizeMultiplier}px`;
        return `${11 * sizeMultiplier}px`;
      })
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent(deviceType === 'tablet' ? [0.5, 2] : [0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior as any);

    const initialTransform = zoomIdentity.translate(centerX, centerY).scale(scale);
    zoomBehaviorRef.current = zoomBehavior;
    initialTransformRef.current = initialTransform;
    svg.call(zoomBehavior.transform as any, initialTransform);
  }, [projects, deviceType, visibleProjects, showLinkedEdgesOnCanvas, focusTitle, showVersionNodes]);

  const relatedProjects = selectedProject?.linkedProjects
    ?.map((title) => projectLookup.get(title))
    .filter((project): project is Project => !!project);

  return (
    <div className="relative">
      <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.56),rgba(8,47,73,0.24))] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              list="projects-focus-list"
              className="w-full rounded-xl border border-cyan-300/20 bg-white/[0.04] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-primary-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdvancedOpen((previous) => !previous)}
              className="rounded-xl border border-cyan-300/20 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:border-primary-400/70 hover:text-primary-300"
            >
              {advancedOpen ? t.hideTools : t.tools}
            </button>
            <button
              onClick={resetView}
              className="rounded-xl border border-cyan-300/20 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:border-primary-400/70 hover:text-primary-300"
            >
              {t.resetView}
            </button>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="rounded-xl border border-cyan-300/20 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:border-primary-400/70 hover:text-primary-300"
              >
                {t.clear}
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
          <span>
            {t.visible}: {navigatorResult.visibleCount}/{navigatorResult.totalCount}
          </span>
          <span>
            {t.matched}: {navigatorResult.matchedCount}
          </span>
          {searchActive && navigatorResult.primaryMatchedCount > 0 && (
            <span>
              {t.focusCompact}: {navigatorResult.primaryMatchedCount}
            </span>
          )}
          {focusTitle && (
            <span>
              {t.focusNodes}: {navigatorResult.focusCount}
            </span>
          )}
          {!showVersionNodes && <span>{t.versionsHidden}</span>}
        </div>

        {advancedOpen && (
          <div className="mt-3 grid gap-3 border-t border-cyan-300/15 pt-3 lg:grid-cols-3">
            <div className="space-y-2">
              <span className="text-xs text-[var(--color-text-secondary)]">{t.category}</span>
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'projects', 'contributing'] as const).map((category) => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      categoryFilter === category
                        ? 'border-primary-400 bg-primary-400/20 text-primary-300'
                        : 'border-cyan-300/20 bg-white/[0.03] text-[var(--color-text-secondary)] hover:border-primary-400/60'
                    }`}
                  >
                    {t.categoryOptions[category]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-[var(--color-text-secondary)]">{t.status}</span>
              <div className="flex flex-wrap items-center gap-2">
                {PROJECT_STATUS_VALUES.map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selectedStatuses.includes(status)
                        ? 'border-primary-400 bg-primary-400/20 text-primary-300'
                        : 'border-cyan-300/20 bg-white/[0.03] text-[var(--color-text-secondary)] hover:border-primary-400/60'
                    }`}
                  >
                    {t.statusOptions[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <FocusProjectSelect
                options={sortedProjectTitles}
                value={focusTitle}
                onChange={setFocusTitle}
                allLabel={t.focusAllBranches}
                ariaLabel={t.focusAllBranches}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={showLinkedProjects}
                  onClick={() => setShowLinkedProjects((previous) => !previous)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                    showLinkedProjects
                      ? 'border-primary-400 bg-primary-400/20 text-primary-300'
                      : 'border-cyan-300/20 bg-white/[0.03] text-[var(--color-text-secondary)] hover:border-primary-400/60'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      showLinkedProjects ? 'bg-primary-300' : 'bg-[var(--color-text-secondary)]/50'
                    }`}
                  />
                  {t.linkedEdges}
                </button>
                <button
                  type="button"
                  aria-pressed={showVersionNodes}
                  onClick={() => setShowVersionNodes((previous) => !previous)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                    showVersionNodes
                      ? 'border-primary-400 bg-primary-400/20 text-primary-300'
                      : 'border-cyan-300/20 bg-white/[0.03] text-[var(--color-text-secondary)] hover:border-primary-400/60'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      showVersionNodes ? 'bg-primary-300' : 'bg-[var(--color-text-secondary)]/50'
                    }`}
                  />
                  {t.versionNodes}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <datalist id="projects-focus-list">
        {sortedProjectTitles.map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>

      {visibleProjects.length === 0 && (
        <div className="mb-4 rounded-xl border border-cyan-300/20 bg-white/[0.03] p-6 text-center backdrop-blur-xl">
          <p className="text-sm text-[var(--color-text-secondary)]">{t.noNodesMatch}</p>
        </div>
      )}

      <div ref={containerRef} className="roadmap-visualization overflow-hidden bg-[var(--color-bg)]">
        <svg ref={svgRef} className="w-full" />
      </div>

      {tooltip.visible && tooltip.content && (
        <div
          className="fixed z-50 max-w-sm rounded-lg border border-primary-400 bg-[var(--color-bg-secondary)] p-4 shadow-xl"
          style={{
            left: `${tooltip.x + 20}px`,
            top: `${tooltip.y - 20}px`,
            pointerEvents: 'none',
          }}
        >
          {tooltip.type === 'project' ? (
            <div>
              <h3 className="mb-2 font-bold text-primary-400">{(tooltip.content as Project).title}</h3>
              <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
                {(tooltip.content as Project).description}
              </p>
              <div className="mb-2 flex flex-wrap gap-1">
                {(tooltip.content as Project).tags.map((tag) => (
                  <span key={tag} className="rounded bg-[var(--color-bg)] px-2 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              {(tooltip.content as Project).version && (
                <p className="text-xs text-primary-400">v{(tooltip.content as Project).version}</p>
              )}
              <p className="mt-2 text-xs italic text-[var(--color-text-secondary)]">
                Click: details • Double click: focus branch
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="font-bold text-primary-400">
                  v{(tooltip.content as { version: string }).version}
                </h4>
                <span
                  className={`rounded px-2 py-1 text-xs ${releaseStatusBadgeClass(
                    (tooltip.content as { releaseStatus: ReleaseStatus }).releaseStatus,
                  )}`}
                >
                  {releaseStatusLabel(
                    (tooltip.content as { releaseStatus: ReleaseStatus }).releaseStatus,
                  )}
                </span>
              </div>
              {(tooltip.content as { items?: string[]; releaseStatus: ReleaseStatus }).items &&
                (tooltip.content as { items?: string[]; releaseStatus: ReleaseStatus }).items!
                  .length > 0 &&
                ((tooltip.content as { releaseStatus: ReleaseStatus }).releaseStatus === 'close' ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {(tooltip.content as { items: string[] }).items.join(' ')}
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {(tooltip.content as { items: string[] }).items.map((item, index) => (
                      <li key={index} className="text-[var(--color-text-secondary)]">
                        • {item}
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          )}
        </div>
      )}

      {selectedVersion && (
        <div
          className="glass-overlay fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedVersion(null)}
        >
          <div
            className="glass-panel ui-scrollbar m-4 max-h-[80vh] max-w-xl overflow-y-auto rounded-2xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary-400">{selectedVersion.projectTitle}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <h3 className="text-xl font-bold">v{selectedVersion.version}</h3>
                  <span
                    className={`rounded px-2 py-1 text-xs ${releaseStatusBadgeClass(
                      selectedVersion.releaseStatus,
                    )}`}
                  >
                    {releaseStatusLabel(selectedVersion.releaseStatus)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-2xl text-[var(--color-text-secondary)] hover:text-primary-400"
              >
                ✕
              </button>
            </div>

            {selectedVersion.items && selectedVersion.items.length > 0 ? (
              <div>
                <h4 className="mb-3 text-lg font-bold text-primary-400">Changes</h4>
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

      {selectedProject && (
        <div
          className="glass-overlay fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="glass-panel ui-scrollbar m-4 max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-3xl font-bold text-primary-400">{selectedProject.title}</h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-2xl text-[var(--color-text-secondary)] hover:text-primary-400"
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

            <div className="mb-6 flex flex-wrap gap-4">
              <button
                onClick={() =>
                  setFocusTitle((previous) =>
                    previous === selectedProject.title ? null : selectedProject.title,
                  )
                }
                className="text-primary-400 hover:underline"
              >
                {focusTitle === selectedProject.title ? 'Unfocus branch' : 'Focus branch'}
              </button>
              {selectedProject.github && (
                <a
                  href={selectedProject.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  GitHub →
                </a>
              )}
              {selectedProject.link && (
                <a
                  href={selectedProject.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  Visit →
                </a>
              )}
            </div>

            {relatedProjects && relatedProjects.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-xl font-bold text-primary-400">Related</h3>
                <div className="flex flex-wrap gap-2">
                  {relatedProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setFocusTitle(project.title);
                      }}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-primary-400/60 hover:text-primary-300"
                    >
                      {project.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedProject.roadmap && selectedProject.roadmap.length > 0 && (
              <div>
                <h3 className="mb-4 text-xl font-bold text-primary-400">Roadmap</h3>
                <div className="space-y-4">
                  {selectedProject.roadmap.map((milestone) => (
                    <div
                      key={milestone.version}
                      className="rounded-lg border border-[var(--color-border)] p-4"
                    >
                      <h4 className="mb-2 flex items-center gap-2 text-lg font-bold">
                        v{milestone.version}
                        <span
                          className={`rounded px-2 py-1 text-xs ${releaseStatusBadgeClass(
                            milestone.releaseStatus,
                          )}`}
                        >
                          {releaseStatusLabel(milestone.releaseStatus)}
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
                              <li key={index} className="text-sm text-[var(--color-text-secondary)]">
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
    </div>
  );
}
