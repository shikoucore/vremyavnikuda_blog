import { useEffect, useRef } from 'react';
import * as d3 from 'd3-hierarchy';
import { select } from 'd3-selection';
import { linkHorizontal } from 'd3-shape';
import { zoom, zoomIdentity } from 'd3-zoom';

interface RoadmapItem {
  version: string;
  status: 'completed' | 'in-progress' | 'planned';
  items: string[];
}

interface Props {
  roadmap: RoadmapItem[];
  currentVersion?: string;
  projectTitle: string;
}

interface TreeNode {
  name: string;
  status?: 'completed' | 'in-progress' | 'planned';
  children?: TreeNode[];
}

export default function ProjectRoadmapTree({ roadmap, currentVersion, projectTitle }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !roadmap || roadmap.length === 0) return;

    // Clear previous content
    select(svgRef.current).selectAll('*').remove();

    // Build tree data structure
    const treeData: TreeNode = {
      name: `${projectTitle} ${currentVersion ? `v${currentVersion}` : ''}`,
      children: roadmap.map(milestone => ({
        name: `v${milestone.version}`,
        status: milestone.status,
        children: milestone.items.map(item => ({
          name: item,
        })),
      })),
    };

    // Dimensions
    const width = containerRef.current?.clientWidth || 800;
    const height = Math.max(400, roadmap.length * 200);
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };

    // Create SVG
    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('font-family', '"Cascadia Code", monospace')
      .style('font-size', '12px');

    // Create container group for zoom
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tree layout
    const treeLayout = d3.tree<TreeNode>()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    // Create hierarchy
    const root = d3.hierarchy(treeData);
    const treeNodes = treeLayout(root);

    // Status colors
    const statusColors = {
      completed: '#10b981',
      'in-progress': '#06b6d4',
      planned: '#6b7280',
    };

    // Draw links
    const link = linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x);

    g.selectAll('.link')
      .data(treeNodes.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', link as any)
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // Draw nodes
    const node = g
      .selectAll('.node')
      .data(treeNodes.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Add circles
    node
      .append('circle')
      .attr('r', d => {
        if (d.depth === 0) return 8; // Root
        if (d.depth === 1) return 6; // Version
        return 4; // Feature
      })
      .attr('fill', d => {
        if (d.depth === 0) return '#06b6d4'; // Root: cyan
        if (d.depth === 1 && d.data.status) {
          return statusColors[d.data.status];
        }
        return 'var(--color-border)';
      })
      .attr('stroke', d => {
        if (d.depth === 1 && d.data.status === 'in-progress') {
          return '#06b6d4';
        }
        return 'none';
      })
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add pulse animation for in-progress nodes
    node
      .filter(d => d.depth === 1 && d.data.status === 'in-progress')
      .append('circle')
      .attr('r', 6)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('from', '6')
      .attr('to', '12')
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinite');

    // Add text labels
    node
      .append('text')
      .attr('dy', d => (d.depth === 0 ? -15 : 3))
      .attr('x', d => {
        if (d.depth === 0) return 0;
        return d.children ? -12 : 12;
      })
      .attr('text-anchor', d => {
        if (d.depth === 0) return 'middle';
        return d.children ? 'end' : 'start';
      })
      .text(d => {
        if (d.data.name.length > 40) {
          return d.data.name.substring(0, 37) + '...';
        }
        return d.data.name;
      })
      .attr('fill', d => {
        if (d.depth === 0) return '#06b6d4';
        if (d.depth === 1 && d.data.status) {
          return statusColors[d.data.status];
        }
        return 'var(--color-text-secondary)';
      })
      .attr('font-weight', d => (d.depth <= 1 ? 'bold' : 'normal'))
      .style('user-select', 'none');

    // Add zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior as any);

    // Set initial zoom
    svg.call(zoomBehavior.transform as any, zoomIdentity.translate(margin.left, margin.top));

  }, [roadmap, currentVersion, projectTitle]);

  return (
    <div ref={containerRef} className="roadmap-tree-container mt-8 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
          🌳 Roadmap Tree
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          Scroll to zoom • Drag to pan
        </p>
      </div>
      <svg ref={svgRef} className="w-full" style={{ minHeight: '400px' }} />
    </div>
  );
}
