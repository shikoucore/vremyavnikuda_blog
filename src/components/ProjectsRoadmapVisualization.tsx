import { useEffect, useRef, useState } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import { select } from 'd3-selection';

import { zoom, zoomIdentity } from 'd3-zoom';
import { useDeviceType } from '../hooks/useMediaQuery';
import MobileProjectList from './MobileProjectList';

type ReleaseStatus = 'release' | 'dev' | 'close';

interface Project {
  id: string;
  title: string;
  description: string;
  version?: string;
  status: string;
  tags: string[];
  github?: string;
  link?: string;
  projectType?: 'category' | 'project' | 'contribution';
  category?: 'projects' | 'contributing';
  parentProject?: string;
  linkedProjects?: string[];
  roadmap?: Array<{
    version: string;
    releaseStatus: ReleaseStatus;
    items?: string[];
  }>;
}

interface Props {
  projects: Project[];
}

interface TreeNode {
  name: string;
  type: 'root' | 'project' | 'version';
  data?: Project | { version: string; releaseStatus: ReleaseStatus; items?: string[] };
  children?: TreeNode[];
}

export default function ProjectsRoadmapVisualization({ projects }: Props) {
  const deviceType = useDeviceType();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: any;
    type: 'project' | 'version';
  }>({ visible: false, x: 0, y: 0, content: null, type: 'project' });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<{
    projectTitle: string;
    version: string;
    releaseStatus: ReleaseStatus;
    items?: string[];
  } | null>(null);

  const releaseStatusLabel = (status: ReleaseStatus) => {
    if (status === 'release') return 'Release';
    if (status === 'close') return 'Close';
    return 'Dev';
  };

  const releaseStatusBadgeClass = (status: ReleaseStatus) => {
    if (status === 'release') return 'bg-green-900/30 text-green-400';
    if (status === 'close') return 'bg-red-900/30 text-red-400';
    return 'bg-orange-900/30 text-orange-400';
  };

  const releaseStatusColor = (status: ReleaseStatus) => {
    if (status === 'release') return '#10b981';
    if (status === 'close') return '#ef4444';
    return '#f59e0b';
  };

  if (deviceType === 'mobile') {
    return <MobileProjectList projects={projects} />;
  }

  useEffect(() => {
    if (!svgRef.current || !projects || projects.length === 0) return;

    select(svgRef.current).selectAll('*').remove();
    const projectsMap = new Map<string, TreeNode>();
    const rootProjects: TreeNode[] = [];
    projects.forEach(project => {
      const versionNodes: TreeNode[] = project.roadmap?.map(milestone => ({
        name: `v${milestone.version}`,
        type: 'version' as const,
        data: {
          version: milestone.version,
          releaseStatus: milestone.releaseStatus,
          items: milestone.items
        },
      })) || [];

      const projectNode: TreeNode = {
        name: project.title,
        type: 'project',
        data: project,
        children: [...versionNodes],
      };

      projectsMap.set(project.title, projectNode);
    });

    projects.forEach(project => {
      const projectNode = projectsMap.get(project.title)!;

      if (project.parentProject) {
        const parentNode = projectsMap.get(project.parentProject);
        if (parentNode) {
          parentNode.children!.push(projectNode);
        } else {
          rootProjects.push(projectNode);
        }
      } else {
        rootProjects.push(projectNode);
      }
    });

    const treeData: TreeNode = {
      name: 'vremyavnikuda',
      type: 'root',
      children: rootProjects,
    };

    const width = containerRef.current?.clientWidth || window.innerWidth - 20;
    const height = deviceType === 'tablet' ? 700 : Math.max(800, window.innerHeight - 100);
    const margin = deviceType === 'tablet'
      ? { top: 10, right: 20, bottom: 10, left: 20 }
      : { top: 20, right: 40, bottom: 20, left: 40 };

    const nodeRadius = deviceType === 'tablet' ? 10 : 12;
    const touchTargetSize = 44;

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('font-family', '"Cascadia Code", monospace')
      .style('font-size', '13px');

    const g = svg.append('g');
    const maxTreeWidth = deviceType === 'tablet' ? 900 : 1100;
    const maxTreeHeight = deviceType === 'tablet' ? 600 : 800;
    const treeWidth = Math.min(width - margin.left - margin.right, maxTreeWidth);
    const treeHeight = Math.min(height - margin.top - margin.bottom, maxTreeHeight);
    
    const treeLayout = tree<TreeNode>()
      .size([treeHeight, treeWidth])
      .separation((a, b) => {
        const aIsCategory = a.data.type === 'project' && a.depth === 1;
        const bIsCategory = b.data.type === 'project' && b.depth === 1;
        const bothAreCategories = aIsCategory && bIsCategory;
        if (bothAreCategories && a.parent === b.parent) {
          return deviceType === 'tablet' ? 8 : 10;
        }

        const aIsVersion = a.data.type === 'version';
        const bIsVersion = b.data.type === 'version';
        if (aIsVersion || bIsVersion) {
          return deviceType === 'tablet' ? 1.5 : 2;
        }

        const baseSeparation = deviceType === 'tablet' ? 2 : 2.5;
        const crossSeparation = deviceType === 'tablet' ? 3 : 4;
        return a.parent === b.parent ? baseSeparation : crossSeparation;
      });

    const root = hierarchy(treeData);
    const treeData_ = treeLayout(root);
    const rootNode = treeData_;
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
        let leftMinX = Infinity, leftMaxX = -Infinity;
        leftBranches.forEach(branch => {
          branch.descendants().forEach(node => {
            if (node.x < leftMinX) leftMinX = node.x;
            if (node.x > leftMaxX) leftMaxX = node.x;
          });
        });
        const leftCenterX = (leftMinX + leftMaxX) / 2;
        const leftOffsetX = rootX - leftCenterX;
        leftBranches.forEach(branch => {
          branch.descendants().forEach(node => {
            node.x += leftOffsetX;
            node.y = rootY - (node.y - rootY);
          });
        });
      }
      
      if (rightBranches.length > 0) {
        let rightMinX = Infinity, rightMaxX = -Infinity;
        rightBranches.forEach(branch => {
          branch.descendants().forEach(node => {
            if (node.x < rightMinX) rightMinX = node.x;
            if (node.x > rightMaxX) rightMaxX = node.x;
          });
        });
        
        const rightCenterX = (rightMinX + rightMaxX) / 2;
        const rightOffsetX = rootX - rightCenterX;
        rightBranches.forEach(branch => {
          branch.descendants().forEach(node => {
            node.x += rightOffsetX;
          });
        });
      }
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    treeData_.descendants().forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const padding = deviceType === 'tablet' ? 60 : 100;
    const dataWidth = maxY - minY + padding * 2;
    const dataHeight = maxX - minX + padding * 2;
    const scale = Math.min(
      (width - margin.left - margin.right) / dataWidth,
      (height - margin.top - margin.bottom) / dataHeight,
      deviceType === 'tablet' ? 0.8 : 1
    );

    const centerX = (width - (maxY - minY) * scale) / 2 - minY * scale;
    const centerY = (height - (maxX - minX) * scale) / 2 - minX * scale;

    const statusColors = {
      active: '#10b981',
      maintenance: '#3b82f6',
      completed: '#8b5cf6',
      archived: '#6b7280',
    };

    const rectWidth = deviceType === 'tablet' ? 120 : 160;
    const rectHeight = deviceType === 'tablet' ? 36 : 40;
    const versionCircleRadius = nodeRadius - (deviceType === 'tablet' ? 3 : 4);
    const rootCircleRadius = nodeRadius;
    const getNodeEdgeOffset = (nodeType: string) => {
      if (nodeType === 'project') return rectWidth / 2;
      if (nodeType === 'version') return versionCircleRadius;
      if (nodeType === 'root') return rootCircleRadius;
      return rectWidth / 2;
    };
    
    const createEdgeToEdgePath = (d: any) => {
      const sourceY = d.source.y;
      const targetY = d.target.y;
      const sourceX = d.source.x;
      const targetX = d.target.x;
      const sourceType = d.source.data.type;
      const targetType = d.target.data.type;
      const sourceOffset = getNodeEdgeOffset(sourceType);
      const targetOffset = getNodeEdgeOffset(targetType);
      const goingRight = targetY > sourceY;
      
      let x0, x1;
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
      .data(treeData_.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', createEdgeToEdgePath)
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    const additionalLinks: Array<{ source: any; target: any }> = [];
    treeData_.descendants().forEach(node => {
      const project = node.data.data as Project;
      if (project?.linkedProjects && project.linkedProjects.length > 0) {
        project.linkedProjects.forEach(linkedTitle => {
          const targetNode = treeData_.descendants().find(n => n.data.name === linkedTitle);
          if (targetNode) {
            additionalLinks.push({ source: node, target: targetNode });
          }
        });
      }
    });

    const createLinkedPath = (source: any, target: any) => {
      const sourceY = source.y;
      const targetY = target.y;
      const sourceX = source.x;
      const targetX = target.x;
      const sourceType = source.data.type;
      const targetType = target.data.type;
      const sourceOffset = getNodeEdgeOffset(sourceType);
      const targetOffset = getNodeEdgeOffset(targetType);
      const goingRight = targetY > sourceY;
      let x0, x1;
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
      .attr('d', d => createLinkedPath(d.source, d.target))
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.6);

    const node = g
      .selectAll('.node')
      .data(treeData_.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    node
      .filter(d => d.data.type === 'project')
      .append('rect')
      .attr('x', -rectWidth / 2)
      .attr('y', -rectHeight / 2)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('rx', 8)
      .attr('fill', d => {
        const project = d.data.data as Project;
        return statusColors[project.status as keyof typeof statusColors] || '#6b7280';
      })
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', deviceType === 'tablet' ? 2 : 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        if (deviceType === 'desktop') {
          select(this).attr('opacity', 1).attr('stroke-width', 3);
          const project = d.data.data as Project;
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: project,
            type: 'project',
          });
        }
      })
      .on('mouseleave', function () {
        if (deviceType === 'desktop') {
          select(this).attr('opacity', 0.8).attr('stroke-width', 2);
          setTooltip(prev => ({ ...prev, visible: false }));
        }
      })
      .on('click', (event, d) => {
        const project = d.data.data as Project;
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
            setTooltip(prev => ({ ...prev, visible: false }));
          }, 3000);
        }
      });

    const versionNodes = node.filter(d => d.data.type === 'version');
    if (deviceType === 'tablet') {
      versionNodes
        .append('circle')
        .attr('r', touchTargetSize / 2)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          const versionData = d.data.data as { version: string; releaseStatus: ReleaseStatus; items?: string[] };
          const parentProject = d.parent?.data.data as Project;
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
            setTooltip(prev => ({ ...prev, visible: false }));
          }, 3000);
        });
    }

    versionNodes
      .append('circle')
      .attr('r', nodeRadius - (deviceType === 'tablet' ? 3 : 4))
      .attr('fill', d => {
        const versionData = d.data.data as { version: string; releaseStatus: ReleaseStatus; items?: string[] };
        return releaseStatusColor(versionData.releaseStatus);
      })
      .attr('stroke', d => {
        const versionData = d.data.data as { version: string; releaseStatus: ReleaseStatus; items?: string[] };
        return releaseStatusColor(versionData.releaseStatus);
      })
      .attr('stroke-width', deviceType === 'tablet' ? 2 : 2)
      .style('cursor', 'pointer')
      .style('pointer-events', deviceType === 'tablet' ? 'none' : 'all')
      .on('mouseenter', function (event, d) {
        if (deviceType === 'desktop') {
          select(this).attr('r', nodeRadius);
          const versionData = d.data.data as { version: string; releaseStatus: ReleaseStatus; items?: string[] };
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: versionData,
            type: 'version',
          });
        }
      })
      .on('mouseleave', function () {
        if (deviceType === 'desktop') {
          select(this).attr('r', nodeRadius - 4);
          setTooltip(prev => ({ ...prev, visible: false }));
        }
      })
      .on('click', (_event, d) => {
        if (deviceType === 'desktop') {
          const versionData = d.data.data as { version: string; releaseStatus: ReleaseStatus; items?: string[] };
          const parentProject = d.parent?.data.data as Project;
          setSelectedVersion({
            projectTitle: parentProject.title,
            version: versionData.version,
            releaseStatus: versionData.releaseStatus,
            items: versionData.items,
          });
        }
      });

    node
      .filter(d => d.data.type === 'root')
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', '#06b6d4')
      .attr('stroke', '#0a0a0a')
      .attr('stroke-width', 3);

    node
      .append('text')
      .attr('dy', d => {
        if (d.data.type === 'project') return 4;
        if (d.data.type === 'root') return deviceType === 'tablet' ? -18 : -20;
        return deviceType === 'tablet' ? 22 : 25;
      })
      .attr('text-anchor', 'middle')
      .text(d => d.data.name)
      .attr('fill', d => {
        if (d.data.type === 'root') return '#06b6d4';
        if (d.data.type === 'project') return '#f9fafb';
        return 'var(--color-text)';
      })
      .attr('font-weight', d => (d.data.type === 'root' ? 'bold' : 'normal'))
      .attr('font-size', d => {
        const sizeMultiplier = deviceType === 'tablet' ? 0.85 : 1;
        if (d.data.type === 'root') return `${16 * sizeMultiplier}px`;
        if (d.data.type === 'project') return `${12 * sizeMultiplier}px`;
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

    const initialTransform = zoomIdentity
      .translate(centerX, centerY)
      .scale(scale);

    svg.call(zoomBehavior.transform as any, initialTransform);

  }, [projects, deviceType]);

  return (
    <div className="relative">
      <div ref={containerRef} className="roadmap-visualization overflow-hidden bg-[var(--color-bg)]">
        <svg ref={svgRef} className="w-full" />
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 bg-[var(--color-bg-secondary)] border border-cyan-400 rounded-lg p-4 shadow-xl max-w-sm"
          style={{
            left: `${tooltip.x + 20}px`,
            top: `${tooltip.y - 20}px`,
            pointerEvents: 'none',
          }}
        >
          {tooltip.type === 'project' ? (
            <div>
              <h3 className="font-bold text-cyan-400 mb-2">{tooltip.content.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                {tooltip.content.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {tooltip.content.tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-1 bg-[var(--color-bg)] rounded">
                    {tag}
                  </span>
                ))}
              </div>
              {tooltip.content.version && (
                <p className="text-xs text-cyan-400">v{tooltip.content.version}</p>
              )}
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 italic">
                Click to see full details
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-cyan-400">v{tooltip.content.version}</h4>
                <span className={`text-xs px-2 py-1 rounded ${releaseStatusBadgeClass(tooltip.content.releaseStatus)}`}>
                  {releaseStatusLabel(tooltip.content.releaseStatus)}
                </span>
              </div>
              {tooltip.content.items && tooltip.content.items.length > 0 && (
                tooltip.content.releaseStatus === 'close' ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {tooltip.content.items.join(' ')}
                  </p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {tooltip.content.items.map((item: string, idx: number) => (
                      <li key={idx} className="text-[var(--color-text-secondary)]">
                        • {item}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal for version details */}
      {selectedVersion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setSelectedVersion(null)}
        >
          <div
            className="bg-[var(--color-bg)] border border-cyan-400 rounded-lg p-6 max-w-xl max-h-[80vh] overflow-y-auto m-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-cyan-400">{selectedVersion.projectTitle}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <h3 className="text-xl font-bold">v{selectedVersion.version}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${releaseStatusBadgeClass(selectedVersion.releaseStatus)}`}>
                    {releaseStatusLabel(selectedVersion.releaseStatus)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-[var(--color-text-secondary)] hover:text-cyan-400 text-2xl"
              >
                ✕
              </button>
            </div>

            {selectedVersion.items && selectedVersion.items.length > 0 ? (
              <div>
                <h4 className="text-lg font-bold text-cyan-400 mb-3">Changes</h4>
                {selectedVersion.releaseStatus === 'close' ? (
                  <p className="text-sm text-[var(--color-text)]">
                    {selectedVersion.items.join(' ')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedVersion.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-[var(--color-text)]">
                        • {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)] italic">
                No detailed changelog available for this version.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal for full project details */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-[var(--color-bg)] border border-cyan-400 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto m-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-3xl font-bold text-cyan-400">{selectedProject.title}</h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-[var(--color-text-secondary)] hover:text-cyan-400 text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-[var(--color-text)] mb-4">{selectedProject.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {selectedProject.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 bg-[var(--color-bg-secondary)] rounded">
                  {tag}
                </span>
              ))}
            </div>

            {selectedProject.version && (
              <p className="text-sm text-cyan-400 mb-4">Current Version: v{selectedProject.version}</p>
            )}

            <div className="flex gap-4 mb-6">
              {selectedProject.github && (
                <a
                  href={selectedProject.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  GitHub →
                </a>
              )}
              {selectedProject.link && (
                <a
                  href={selectedProject.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  Visit →
                </a>
              )}
            </div>

            {selectedProject.roadmap && selectedProject.roadmap.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-cyan-400 mb-4">Roadmap</h3>
                <div className="space-y-4">
                  {selectedProject.roadmap.map(milestone => (
                    <div key={milestone.version} className="border border-[var(--color-border)] rounded-lg p-4">
                      <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                        v{milestone.version}
                        <span className={`text-xs px-2 py-1 rounded ${releaseStatusBadgeClass(milestone.releaseStatus)}`}>
                          {releaseStatusLabel(milestone.releaseStatus)}
                        </span>
                      </h4>
                      {milestone.items && milestone.items.length > 0 && (
                        milestone.releaseStatus === 'close' ? (
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {milestone.items.join(' ')}
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {milestone.items.map((item, idx) => (
                              <li key={idx} className="text-sm text-[var(--color-text-secondary)]">
                                • {item}
                              </li>
                            ))}
                          </ul>
                        )
                      )}
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
