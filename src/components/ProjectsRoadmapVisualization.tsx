import { useEffect, useRef, useState } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { linkHorizontal } from 'd3-shape';
import { zoom, zoomIdentity } from 'd3-zoom';
import { useDeviceType } from '../hooks/useMediaQuery';
import MobileProjectList from './MobileProjectList';

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
  roadmap?: Array<{
    version: string;
    releaseStatus: 'release' | 'dev';
    items?: string[];
  }>;
}

interface Props {
  projects: Project[];
}

interface TreeNode {
  name: string;
  type: 'root' | 'project' | 'version';
  data?: Project | { version: string; releaseStatus: 'release' | 'dev'; items?: string[] };
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
    releaseStatus: 'release' | 'dev';
    items?: string[];
  } | null>(null);

  // Render mobile view with accordion list
  if (deviceType === 'mobile') {
    return <MobileProjectList projects={projects} />;
  }

  useEffect(() => {
    if (!svgRef.current || !projects || projects.length === 0) return;

    // Clear previous content
    select(svgRef.current).selectAll('*').remove();

    // Build tree data with parent-child relationships
    const projectsMap = new Map<string, TreeNode>();
    const rootProjects: TreeNode[] = [];

    // First pass: create all project nodes with their versions
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
        children: [...versionNodes], // Start with versions
      };

      projectsMap.set(project.title, projectNode);
    });

    // Second pass: build hierarchy based on parentProject
    projects.forEach(project => {
      const projectNode = projectsMap.get(project.title)!;

      if (project.parentProject) {
        // This project is a child of another project
        const parentNode = projectsMap.get(project.parentProject);
        if (parentNode) {
          // Add this project as child to parent (after versions)
          parentNode.children!.push(projectNode);
        } else {
          // Parent not found, add to root
          rootProjects.push(projectNode);
        }
      } else {
        // No parent, add to root
        rootProjects.push(projectNode);
      }
    });

    const treeData: TreeNode = {
      name: 'vremyavnikuda',
      type: 'root',
      children: rootProjects,
    };

    // Dimensions adapted for device type
    const width = containerRef.current?.clientWidth || 1200;
    const height = deviceType === 'tablet' ? 800 : 1200;
    const margin = deviceType === 'tablet'
      ? { top: 20, right: 40, bottom: 20, left: 60 }
      : { top: 20, right: 120, bottom: 20, left: 120 };

    // Node radius based on device type - compact for tablet
    const nodeRadius = deviceType === 'tablet' ? 10 : 12;
    const touchTargetSize = 44; // iOS/Android recommended minimum touch target

    // Create SVG
    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('font-family', '"Cascadia Code", monospace')
      .style('font-size', '13px');

    // Create container group for zoom
    const g = svg.append('g');

    // Create tree layout (horizontal) with adaptive spacing
    const treeLayout = tree<TreeNode>()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right])
      .separation((a, b) => {
        // Smart spacing: more space for categories at root level, less for versions
        const aIsCategory = a.data.type === 'project' && a.depth === 1;
        const bIsCategory = b.data.type === 'project' && b.depth === 1;
        const bothAreCategories = aIsCategory && bIsCategory;

        // If both are categories at root level (like "projects" and "Shikou Core"), add more space
        if (bothAreCategories && a.parent === b.parent) {
          return deviceType === 'tablet' ? 8 : 10;
        }

        // Version nodes need less space
        const aIsVersion = a.data.type === 'version';
        const bIsVersion = b.data.type === 'version';
        if (aIsVersion || bIsVersion) {
          return deviceType === 'tablet' ? 1.5 : 2;
        }

        // Default spacing
        const baseSeparation = deviceType === 'tablet' ? 2 : 2.5;
        const crossSeparation = deviceType === 'tablet' ? 3 : 4;
        return a.parent === b.parent ? baseSeparation : crossSeparation;
      });

    // Create hierarchy
    const root = hierarchy(treeData);
    const treeData_ = treeLayout(root);

    // Calculate bounds for centering
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

    // Calculate scale to fit everything - more aggressive scaling on tablet
    const padding = deviceType === 'tablet' ? 60 : 100;
    const dataWidth = maxY - minY + padding * 2;
    const dataHeight = maxX - minX + padding * 2;
    const scale = Math.min(
      (width - margin.left - margin.right) / dataWidth,
      (height - margin.top - margin.bottom) / dataHeight,
      deviceType === 'tablet' ? 0.8 : 1 // Scale down on tablet to fit more
    );

    // Calculate center offset
    const centerX = (width - (maxY - minY) * scale) / 2 - minY * scale;
    const centerY = (height - (maxX - minX) * scale) / 2 - minX * scale;

    // Status colors
    const statusColors = {
      active: '#10b981',
      maintenance: '#3b82f6',
      completed: '#8b5cf6',
      archived: '#6b7280',
    };

    // Draw links (horizontal) with adaptive styling
    const link = linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x);

    g.selectAll('.link')
      .data(treeData_.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', link as any)
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', deviceType === 'tablet' ? 2 : 2)
      .attr('opacity', deviceType === 'tablet' ? 0.4 : 0.4);

    // Draw nodes
    const node = g
      .selectAll('.node')
      .data(treeData_.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Add rectangles for project nodes (clickable cards)
    // Compact size for tablet with touch overlay
    const rectWidth = deviceType === 'tablet' ? 120 : 160;
    const rectHeight = deviceType === 'tablet' ? 36 : 40;

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
        // On tablet, show tooltip on tap
        if (deviceType === 'tablet') {
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: project,
            type: 'project',
          });
          // Hide tooltip after 3 seconds
          setTimeout(() => {
            setTooltip(prev => ({ ...prev, visible: false }));
          }, 3000);
        }
      });

    // Add circles for version nodes
    // Add transparent larger circle for touch target on tablet
    const versionNodes = node.filter(d => d.data.type === 'version');

    // Add invisible larger circle for better touch targets on tablet
    if (deviceType === 'tablet') {
      versionNodes
        .append('circle')
        .attr('r', touchTargetSize / 2)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          const versionData = d.data.data as { version: string; releaseStatus: 'release' | 'dev'; items?: string[] };
          const parentProject = d.parent?.data.data as Project;
          setSelectedVersion({
            projectTitle: parentProject.title,
            version: versionData.version,
            releaseStatus: versionData.releaseStatus,
            items: versionData.items,
          });
          // Show tooltip on tap for tablet
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
        const versionData = d.data.data as { version: string; releaseStatus: 'release' | 'dev'; items?: string[] };
        return versionData.releaseStatus === 'release' ? '#10b981' : '#f59e0b';
      })
      .attr('stroke', d => {
        const versionData = d.data.data as { version: string; releaseStatus: 'release' | 'dev'; items?: string[] };
        return versionData.releaseStatus === 'dev' ? '#f59e0b' : '#0a0a0a';
      })
      .attr('stroke-width', deviceType === 'tablet' ? 2 : 2)
      .style('cursor', 'pointer')
      .style('pointer-events', deviceType === 'tablet' ? 'none' : 'all')
      .on('mouseenter', function (event, d) {
        if (deviceType === 'desktop') {
          select(this).attr('r', nodeRadius);
          const versionData = d.data.data as { version: string; releaseStatus: 'release' | 'dev'; items?: string[] };
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
          const versionData = d.data.data as { version: string; releaseStatus: 'release' | 'dev'; items?: string[] };
          const parentProject = d.parent?.data.data as Project;
          setSelectedVersion({
            projectTitle: parentProject.title,
            version: versionData.version,
            releaseStatus: versionData.releaseStatus,
            items: versionData.items,
          });
        }
      });

    // Add root circle
    node
      .filter(d => d.data.type === 'root')
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', '#06b6d4')
      .attr('stroke', '#0a0a0a')
      .attr('stroke-width', 3);

    // Add text labels with adaptive sizing - smaller on tablet
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

    // Add zoom behavior with device-specific constraints
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent(deviceType === 'tablet' ? [0.5, 2] : [0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior as any);

    // Set initial transform to center and fit everything
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
                <span className={`text-xs px-2 py-1 rounded ${tooltip.content.releaseStatus === 'release'
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-orange-900/30 text-orange-400'
                  }`}>
                  {tooltip.content.releaseStatus === 'release' ? 'Release' : 'Dev'}
                </span>
              </div>
              {tooltip.content.items && tooltip.content.items.length > 0 && (
                <ul className="text-sm space-y-1">
                  {tooltip.content.items.map((item: string, idx: number) => (
                    <li key={idx} className="text-[var(--color-text-secondary)]">
                      • {item}
                    </li>
                  ))}
                </ul>
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
                  <span className={`text-xs px-2 py-1 rounded ${selectedVersion.releaseStatus === 'release'
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-orange-900/30 text-orange-400'
                    }`}>
                    {selectedVersion.releaseStatus === 'release' ? 'Release' : 'Dev'}
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
                <ul className="space-y-2">
                  {selectedVersion.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-[var(--color-text)]">
                      • {item}
                    </li>
                  ))}
                </ul>
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
                        <span className={`text-xs px-2 py-1 rounded ${milestone.releaseStatus === 'release'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-orange-900/30 text-orange-400'
                          }`}>
                          {milestone.releaseStatus === 'release' ? 'Release' : 'Dev'}
                        </span>
                      </h4>
                      {milestone.items && milestone.items.length > 0 && (
                        <ul className="space-y-1">
                          {milestone.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-[var(--color-text-secondary)]">
                              • {item}
                            </li>
                          ))}
                        </ul>
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
