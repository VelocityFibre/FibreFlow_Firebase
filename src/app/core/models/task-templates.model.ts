import { TaskPriority } from './task.model';

export interface TaskTemplate {
  name: string;
  description?: string;
  estimatedHours: number;
  priority: TaskPriority;
  orderNo: number;
  dependencies?: number[]; // Indices of tasks this depends on
}

export interface PhaseTaskTemplates {
  phaseName: string;
  tasks: TaskTemplate[];
}

// Default task templates for each phase
export const DEFAULT_TASK_TEMPLATES: PhaseTaskTemplates[] = [
  {
    phaseName: 'Planning',
    tasks: [
      {
        name: 'Conduct site survey and feasibility study',
        description:
          'Perform comprehensive site assessment including terrain, existing infrastructure, and accessibility',
        estimatedHours: 24,
        priority: TaskPriority.HIGH,
        orderNo: 1,
      },
      {
        name: 'Create detailed project scope document',
        description: 'Document all project requirements, deliverables, and constraints',
        estimatedHours: 16,
        priority: TaskPriority.HIGH,
        orderNo: 2,
      },
      {
        name: 'Develop network design and architecture',
        description: 'Design fiber routes, network topology, and equipment placement',
        estimatedHours: 40,
        priority: TaskPriority.HIGH,
        orderNo: 3,
        dependencies: [0, 1],
      },
      {
        name: 'Prepare budget and cost estimates',
        description: 'Calculate material, labor, and equipment costs',
        estimatedHours: 16,
        priority: TaskPriority.MEDIUM,
        orderNo: 4,
        dependencies: [2],
      },
      {
        name: 'Create project timeline and milestones',
        description: 'Develop detailed project schedule with key milestones',
        estimatedHours: 8,
        priority: TaskPriority.MEDIUM,
        orderNo: 5,
        dependencies: [2],
      },
      {
        name: 'Identify and assess project risks',
        description: 'Document potential risks and mitigation strategies',
        estimatedHours: 8,
        priority: TaskPriority.MEDIUM,
        orderNo: 6,
      },
    ],
  },
  {
    phaseName: 'Initiate Project (IP)',
    tasks: [
      {
        name: 'Obtain client approval and sign-off',
        description: 'Get formal approval on project scope, budget, and timeline',
        estimatedHours: 4,
        priority: TaskPriority.CRITICAL,
        orderNo: 1,
      },
      {
        name: 'Setup project management systems',
        description: 'Initialize project tracking, documentation, and communication systems',
        estimatedHours: 8,
        priority: TaskPriority.HIGH,
        orderNo: 2,
      },
      {
        name: 'Conduct project kickoff meeting',
        description: 'Meet with all stakeholders to align on project goals and expectations',
        estimatedHours: 4,
        priority: TaskPriority.HIGH,
        orderNo: 3,
        dependencies: [0],
      },
      {
        name: 'Apply for necessary permits and approvals',
        description: 'Submit applications for construction permits, right-of-way access, etc.',
        estimatedHours: 16,
        priority: TaskPriority.HIGH,
        orderNo: 4,
      },
      {
        name: 'Finalize resource allocation',
        description: 'Assign team members, equipment, and materials to project',
        estimatedHours: 8,
        priority: TaskPriority.HIGH,
        orderNo: 5,
      },
      {
        name: 'Establish communication protocols',
        description: 'Set up reporting structure and communication channels',
        estimatedHours: 4,
        priority: TaskPriority.MEDIUM,
        orderNo: 6,
      },
    ],
  },
  {
    phaseName: 'Work in Progress (WIP)',
    tasks: [
      {
        name: 'Mobilize construction crew and equipment',
        description: 'Deploy teams and equipment to project site',
        estimatedHours: 8,
        priority: TaskPriority.HIGH,
        orderNo: 1,
      },
      {
        name: 'Install underground conduits/ducts',
        description: 'Lay conduits for fiber cable protection',
        estimatedHours: 120,
        priority: TaskPriority.HIGH,
        orderNo: 2,
        dependencies: [0],
      },
      {
        name: 'Pull and splice fiber optic cables',
        description: 'Install fiber cables and perform necessary splicing',
        estimatedHours: 160,
        priority: TaskPriority.CRITICAL,
        orderNo: 3,
        dependencies: [1],
      },
      {
        name: 'Install network equipment and cabinets',
        description: 'Set up OLTs, ONTs, splitters, and other network equipment',
        estimatedHours: 80,
        priority: TaskPriority.HIGH,
        orderNo: 4,
        dependencies: [2],
      },
      {
        name: 'Perform quality checks and testing',
        description: 'Test fiber continuity, loss, and network performance',
        estimatedHours: 40,
        priority: TaskPriority.HIGH,
        orderNo: 5,
        dependencies: [3],
      },
      {
        name: 'Document as-built drawings',
        description: 'Update drawings to reflect actual installation',
        estimatedHours: 24,
        priority: TaskPriority.MEDIUM,
        orderNo: 6,
        dependencies: [4],
      },
      {
        name: 'Conduct safety inspections',
        description: 'Regular safety checks and compliance verification',
        estimatedHours: 16,
        priority: TaskPriority.HIGH,
        orderNo: 7,
      },
      {
        name: 'Manage material inventory',
        description: 'Track material usage and reorder as needed',
        estimatedHours: 20,
        priority: TaskPriority.MEDIUM,
        orderNo: 8,
      },
    ],
  },
  {
    phaseName: 'Handover',
    tasks: [
      {
        name: 'Complete final network testing',
        description: 'Comprehensive testing of all network segments',
        estimatedHours: 24,
        priority: TaskPriority.CRITICAL,
        orderNo: 1,
      },
      {
        name: 'Prepare handover documentation',
        description: 'Compile all project documentation, test results, and warranties',
        estimatedHours: 16,
        priority: TaskPriority.HIGH,
        orderNo: 2,
        dependencies: [0],
      },
      {
        name: 'Conduct client training',
        description: 'Train client staff on network operations and maintenance',
        estimatedHours: 16,
        priority: TaskPriority.HIGH,
        orderNo: 3,
      },
      {
        name: 'Perform site cleanup',
        description: 'Clean up construction site and restore to original condition',
        estimatedHours: 8,
        priority: TaskPriority.MEDIUM,
        orderNo: 4,
      },
      {
        name: 'Create maintenance schedule',
        description: 'Develop preventive maintenance plan for network',
        estimatedHours: 8,
        priority: TaskPriority.MEDIUM,
        orderNo: 5,
      },
      {
        name: 'Handover spare materials and tools',
        description: 'Transfer spare parts and specialized tools to client',
        estimatedHours: 4,
        priority: TaskPriority.LOW,
        orderNo: 6,
      },
    ],
  },
  {
    phaseName: 'Handover Complete (HOC)',
    tasks: [
      {
        name: 'Obtain client acceptance certificate',
        description: 'Get formal acceptance and sign-off from client',
        estimatedHours: 4,
        priority: TaskPriority.CRITICAL,
        orderNo: 1,
      },
      {
        name: 'Submit final project report',
        description: 'Comprehensive report on project execution and outcomes',
        estimatedHours: 8,
        priority: TaskPriority.HIGH,
        orderNo: 2,
      },
      {
        name: 'Process final invoices',
        description: 'Submit and process all remaining invoices',
        estimatedHours: 4,
        priority: TaskPriority.HIGH,
        orderNo: 3,
      },
      {
        name: 'Archive project documentation',
        description: 'Organize and archive all project records',
        estimatedHours: 8,
        priority: TaskPriority.MEDIUM,
        orderNo: 4,
      },
      {
        name: 'Conduct project review meeting',
        description: 'Internal review of project performance and lessons learned',
        estimatedHours: 4,
        priority: TaskPriority.MEDIUM,
        orderNo: 5,
      },
    ],
  },
  {
    phaseName: 'Final Acceptance Certificate (FAC)',
    tasks: [
      {
        name: 'Complete warranty period obligations',
        description: 'Ensure all warranty commitments are fulfilled',
        estimatedHours: 8,
        priority: TaskPriority.HIGH,
        orderNo: 1,
      },
      {
        name: 'Perform final system audit',
        description: 'Comprehensive audit of network performance',
        estimatedHours: 16,
        priority: TaskPriority.HIGH,
        orderNo: 2,
      },
      {
        name: 'Resolve any outstanding issues',
        description: 'Address any remaining punch list items',
        estimatedHours: 24,
        priority: TaskPriority.HIGH,
        orderNo: 3,
      },
      {
        name: 'Obtain final acceptance certificate',
        description: 'Get final project closure certificate from client',
        estimatedHours: 4,
        priority: TaskPriority.CRITICAL,
        orderNo: 4,
        dependencies: [0, 1, 2],
      },
      {
        name: 'Release project resources',
        description: 'Formally release team members and equipment',
        estimatedHours: 4,
        priority: TaskPriority.MEDIUM,
        orderNo: 5,
        dependencies: [3],
      },
      {
        name: 'Close project accounts',
        description: 'Finalize all financial aspects of the project',
        estimatedHours: 8,
        priority: TaskPriority.MEDIUM,
        orderNo: 6,
        dependencies: [3],
      },
    ],
  },
];

// Alternative phase names mapping
export const PHASE_NAME_MAPPING: Record<string, string> = {
  'Site Survey and Planning': 'Planning',
  'Permits and Approvals': 'Initiate Project (IP)',
  'Network Installation': 'Work in Progress (WIP)',
  'Testing and Commissioning': 'Handover',
};
