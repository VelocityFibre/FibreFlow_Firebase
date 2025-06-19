export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  stepId: string;
  phaseId: string;
  orderNo: number;
}

export interface StepTemplate {
  id: string;
  name: string;
  description: string;
  phaseId: string;
  orderNo: number;
  tasks: TaskTemplate[];
  taskCount: number;
}

export interface PhaseTemplate {
  id: string;
  name: string;
  description: string;
  orderNo: number;
  steps: StepTemplate[];
  stepCount: number;
  totalTasks: number;
}

export const TASK_TEMPLATES: PhaseTemplate[] = [
  {
    id: 'planning',
    name: 'Planning Phase',
    description: 'Comprehensive project planning including commercial, technical, and resource planning',
    orderNo: 1,
    stepCount: 12,
    totalTasks: 96,
    steps: [
      {
        id: 'planning-commercial',
        name: 'Planning - Commercial',
        description: 'Commercial analysis and business case development',
        phaseId: 'planning',
        orderNo: 1,
        taskCount: 8,
        tasks: [
          { id: 'pc-1', name: 'Client requirements analysis and documentation', stepId: 'planning-commercial', phaseId: 'planning', orderNo: 1 },
          { id: 'pc-2', name: 'Feasibility study and business case development', stepId: 'planning-commercial', phaseId: 'planning', orderNo: 2 },
          { id: 'pc-3', name: 'Commercial proposal preparation', stepId: 'planning-commercial', phaseId: 'planning', orderNo: 3 },
          { id: 'pc-4', name: 'Pricing model development and approval', stepId: 'planning-commercial', phaseId: 'planning', orderNo: 4 },
          { id: 'pc-5', name: 'Contract terms negotiation', stepId: 'planning-commercial', phaseId: 'planning', orderNo: 5 },
          { id: 'pc-6', name: 'Risk assessment and mitigation planning', stepId: 'planning-commercial', phaseId: 'planning', orderNo: 6 },
          { id: 'pc-7', name: 'Revenue recognition planning', stepId: 'planning-commercial', phaseId: 'planning', orderNo: 7 },
          { id: 'pc-8', name: 'Profitability analysis completion', stepId: 'planning-commercial', phaseId: 'planning', orderNo: 8 }
        ]
      },
      {
        id: 'wayleave-secured',
        name: 'Wayleave Secured',
        description: 'Legal access rights and permissions',
        phaseId: 'planning',
        orderNo: 2,
        taskCount: 7,
        tasks: [
          { id: 'ws-1', name: 'Wayleave application submission', stepId: 'wayleave-secured', phaseId: 'planning', orderNo: 1 },
          { id: 'ws-2', name: 'Legal documentation preparation', stepId: 'wayleave-secured', phaseId: 'planning', orderNo: 2 },
          { id: 'ws-3', name: 'Access rights negotiation', stepId: 'wayleave-secured', phaseId: 'planning', orderNo: 3 },
          { id: 'ws-4', name: 'Compensation agreements finalization', stepId: 'wayleave-secured', phaseId: 'planning', orderNo: 4 },
          { id: 'ws-5', name: 'Local authority approvals obtained', stepId: 'wayleave-secured', phaseId: 'planning', orderNo: 5 },
          { id: 'ws-6', name: 'Environmental impact assessments', stepId: 'wayleave-secured', phaseId: 'planning', orderNo: 6 },
          { id: 'ws-7', name: 'Third-party consent collection', stepId: 'wayleave-secured', phaseId: 'planning', orderNo: 7 }
        ]
      },
      {
        id: 'bss-signed',
        name: 'BSS Signed',
        description: 'Build Service Schedule signed and configured',
        phaseId: 'planning',
        orderNo: 3,
        taskCount: 4,
        tasks: [
          { id: 'bss-1', name: 'Build Service Schedule Signed', stepId: 'bss-signed', phaseId: 'planning', orderNo: 1 },
          { id: 'bss-2', name: 'Customer portal setup requirements', stepId: 'bss-signed', phaseId: 'planning', orderNo: 2 },
          { id: 'bss-3', name: 'SLA definitions and metrics', stepId: 'bss-signed', phaseId: 'planning', orderNo: 3 },
          { id: 'bss-4', name: 'Account management protocols', stepId: 'bss-signed', phaseId: 'planning', orderNo: 4 }
        ]
      },
      {
        id: 'mss-signed',
        name: 'MSS Signed',
        description: 'Maintenance & Support Schedule configured',
        phaseId: 'planning',
        orderNo: 4,
        taskCount: 3,
        tasks: [
          { id: 'mss-1', name: 'Maintenance & Support Schedule Signed', stepId: 'mss-signed', phaseId: 'planning', orderNo: 1 },
          { id: 'mss-2', name: 'Network monitoring and alerting setup', stepId: 'mss-signed', phaseId: 'planning', orderNo: 2 },
          { id: 'mss-3', name: 'Performance management configuration', stepId: 'mss-signed', phaseId: 'planning', orderNo: 3 }
        ]
      },
      {
        id: 'po-received',
        name: 'PO Received',
        description: 'Purchase order processing and financial setup',
        phaseId: 'planning',
        orderNo: 5,
        taskCount: 8,
        tasks: [
          { id: 'po-1', name: 'Purchase order validation and approval', stepId: 'po-received', phaseId: 'planning', orderNo: 1 },
          { id: 'po-2', name: 'Budget allocation and cost center assignment', stepId: 'po-received', phaseId: 'planning', orderNo: 2 },
          { id: 'po-3', name: 'Financial authorization confirmation', stepId: 'po-received', phaseId: 'planning', orderNo: 3 },
          { id: 'po-4', name: 'Procurement process initiation', stepId: 'po-received', phaseId: 'planning', orderNo: 4 },
          { id: 'po-5', name: 'Vendor selection criteria establishment', stepId: 'po-received', phaseId: 'planning', orderNo: 5 },
          { id: 'po-6', name: 'Payment terms and schedule agreement', stepId: 'po-received', phaseId: 'planning', orderNo: 6 },
          { id: 'po-7', name: 'Change order procedures definition', stepId: 'po-received', phaseId: 'planning', orderNo: 7 },
          { id: 'po-8', name: 'Financial tracking and reporting setup', stepId: 'po-received', phaseId: 'planning', orderNo: 8 }
        ]
      },
      {
        id: 'planning-hld',
        name: 'Planning - HLD',
        description: 'High-Level Design development',
        phaseId: 'planning',
        orderNo: 6,
        taskCount: 8,
        tasks: [
          { id: 'hld-1', name: 'High-Level Design document creation', stepId: 'planning-hld', phaseId: 'planning', orderNo: 1 },
          { id: 'hld-2', name: 'Network topology design and validation', stepId: 'planning-hld', phaseId: 'planning', orderNo: 2 },
          { id: 'hld-3', name: 'Capacity planning and dimensioning', stepId: 'planning-hld', phaseId: 'planning', orderNo: 3 },
          { id: 'hld-4', name: 'Technology selection and justification', stepId: 'planning-hld', phaseId: 'planning', orderNo: 4 },
          { id: 'hld-5', name: 'Integration points identification', stepId: 'planning-hld', phaseId: 'planning', orderNo: 5 },
          { id: 'hld-6', name: 'Security architecture design', stepId: 'planning-hld', phaseId: 'planning', orderNo: 6 },
          { id: 'hld-7', name: 'Redundancy and failover planning', stepId: 'planning-hld', phaseId: 'planning', orderNo: 7 },
          { id: 'hld-8', name: 'Future expansion considerations', stepId: 'planning-hld', phaseId: 'planning', orderNo: 8 }
        ]
      },
      {
        id: 'planning-splice',
        name: 'Planning - Splice Diagram',
        description: 'Fiber splice planning and documentation',
        phaseId: 'planning',
        orderNo: 7,
        taskCount: 8,
        tasks: [
          { id: 'splice-1', name: 'Fiber splice point identification', stepId: 'planning-splice', phaseId: 'planning', orderNo: 1 },
          { id: 'splice-2', name: 'Splice closure specifications', stepId: 'planning-splice', phaseId: 'planning', orderNo: 2 },
          { id: 'splice-3', name: 'Cable routing optimization', stepId: 'planning-splice', phaseId: 'planning', orderNo: 3 },
          { id: 'splice-4', name: 'Fiber count and type verification', stepId: 'planning-splice', phaseId: 'planning', orderNo: 4 },
          { id: 'splice-5', name: 'Splice loss calculations', stepId: 'planning-splice', phaseId: 'planning', orderNo: 5 },
          { id: 'splice-6', name: 'Testing point identification', stepId: 'planning-splice', phaseId: 'planning', orderNo: 6 },
          { id: 'splice-7', name: 'Documentation standards definition', stepId: 'planning-splice', phaseId: 'planning', orderNo: 7 },
          { id: 'splice-8', name: 'As-built drawing preparation guidelines', stepId: 'planning-splice', phaseId: 'planning', orderNo: 8 }
        ]
      },
      {
        id: 'planning-backhaul',
        name: 'Planning - Backhaul',
        description: 'Backhaul connectivity planning',
        phaseId: 'planning',
        orderNo: 8,
        taskCount: 8,
        tasks: [
          { id: 'backhaul-1', name: 'Backhaul capacity requirements analysis', stepId: 'planning-backhaul', phaseId: 'planning', orderNo: 1 },
          { id: 'backhaul-2', name: 'Provider selection and evaluation', stepId: 'planning-backhaul', phaseId: 'planning', orderNo: 2 },
          { id: 'backhaul-3', name: 'Connectivity options assessment', stepId: 'planning-backhaul', phaseId: 'planning', orderNo: 3 },
          { id: 'backhaul-4', name: 'Bandwidth provisioning planning', stepId: 'planning-backhaul', phaseId: 'planning', orderNo: 4 },
          { id: 'backhaul-5', name: 'Redundancy path identification', stepId: 'planning-backhaul', phaseId: 'planning', orderNo: 5 },
          { id: 'backhaul-6', name: 'Cost optimization analysis', stepId: 'planning-backhaul', phaseId: 'planning', orderNo: 6 },
          { id: 'backhaul-7', name: 'SLA requirements definition', stepId: 'planning-backhaul', phaseId: 'planning', orderNo: 7 },
          { id: 'backhaul-8', name: 'Migration and cutover planning', stepId: 'planning-backhaul', phaseId: 'planning', orderNo: 8 }
        ]
      },
      {
        id: 'boq-finalized',
        name: 'BOQ Finalized',
        description: 'Bill of Quantities completion',
        phaseId: 'planning',
        orderNo: 9,
        taskCount: 8,
        tasks: [
          { id: 'boq-1', name: 'Bill of Quantities detailed breakdown', stepId: 'boq-finalized', phaseId: 'planning', orderNo: 1 },
          { id: 'boq-2', name: 'Material specifications and standards', stepId: 'boq-finalized', phaseId: 'planning', orderNo: 2 },
          { id: 'boq-3', name: 'Quantity verification and validation', stepId: 'boq-finalized', phaseId: 'planning', orderNo: 3 },
          { id: 'boq-4', name: 'Cost estimation and pricing', stepId: 'boq-finalized', phaseId: 'planning', orderNo: 4 },
          { id: 'boq-5', name: 'Supplier catalog alignment', stepId: 'boq-finalized', phaseId: 'planning', orderNo: 5 },
          { id: 'boq-6', name: 'Inventory requirements planning', stepId: 'boq-finalized', phaseId: 'planning', orderNo: 6 },
          { id: 'boq-7', name: 'Delivery schedule coordination', stepId: 'boq-finalized', phaseId: 'planning', orderNo: 7 },
          { id: 'boq-8', name: 'Quality standards confirmation', stepId: 'boq-finalized', phaseId: 'planning', orderNo: 8 }
        ]
      },
      {
        id: 'warehousing',
        name: 'Warehousing',
        description: 'Warehouse and inventory management setup',
        phaseId: 'planning',
        orderNo: 10,
        taskCount: 8,
        tasks: [
          { id: 'wh-1', name: 'Warehouse space allocation', stepId: 'warehousing', phaseId: 'planning', orderNo: 1 },
          { id: 'wh-2', name: 'Inventory management system setup', stepId: 'warehousing', phaseId: 'planning', orderNo: 2 },
          { id: 'wh-3', name: 'Storage requirements planning', stepId: 'warehousing', phaseId: 'planning', orderNo: 3 },
          { id: 'wh-4', name: 'Handling procedures definition', stepId: 'warehousing', phaseId: 'planning', orderNo: 4 },
          { id: 'wh-5', name: 'Security and access control', stepId: 'warehousing', phaseId: 'planning', orderNo: 5 },
          { id: 'wh-6', name: 'Temperature and environmental controls', stepId: 'warehousing', phaseId: 'planning', orderNo: 6 },
          { id: 'wh-7', name: 'Logistics and distribution planning', stepId: 'warehousing', phaseId: 'planning', orderNo: 7 },
          { id: 'wh-8', name: 'Inventory tracking and reporting', stepId: 'warehousing', phaseId: 'planning', orderNo: 8 }
        ]
      },
      {
        id: 'contractor-quotes',
        name: 'Contractor Quotes',
        description: 'Contractor selection and evaluation',
        phaseId: 'planning',
        orderNo: 11,
        taskCount: 8,
        tasks: [
          { id: 'cq-1', name: 'Contractor prequalification process', stepId: 'contractor-quotes', phaseId: 'planning', orderNo: 1 },
          { id: 'cq-2', name: 'Scope of work definition', stepId: 'contractor-quotes', phaseId: 'planning', orderNo: 2 },
          { id: 'cq-3', name: 'Technical specifications communication', stepId: 'contractor-quotes', phaseId: 'planning', orderNo: 3 },
          { id: 'cq-4', name: 'Quote evaluation criteria establishment', stepId: 'contractor-quotes', phaseId: 'planning', orderNo: 4 },
          { id: 'cq-5', name: 'Commercial terms negotiation', stepId: 'contractor-quotes', phaseId: 'planning', orderNo: 5 },
          { id: 'cq-6', name: 'Insurance and bonding requirements', stepId: 'contractor-quotes', phaseId: 'planning', orderNo: 6 },
          { id: 'cq-7', name: 'Safety and compliance verification', stepId: 'contractor-quotes', phaseId: 'planning', orderNo: 7 },
          { id: 'cq-8', name: 'Selection and award process completion', stepId: 'contractor-quotes', phaseId: 'planning', orderNo: 8 }
        ]
      },
      {
        id: 'supplier-quotes',
        name: 'Supplier Quotes',
        description: 'Supplier evaluation and selection',
        phaseId: 'planning',
        orderNo: 12,
        taskCount: 8,
        tasks: [
          { id: 'sq-1', name: 'Supplier qualification and assessment', stepId: 'supplier-quotes', phaseId: 'planning', orderNo: 1 },
          { id: 'sq-2', name: 'Technical specification validation', stepId: 'supplier-quotes', phaseId: 'planning', orderNo: 2 },
          { id: 'sq-3', name: 'Pricing comparison and analysis', stepId: 'supplier-quotes', phaseId: 'planning', orderNo: 3 },
          { id: 'sq-4', name: 'Delivery terms and schedules', stepId: 'supplier-quotes', phaseId: 'planning', orderNo: 4 },
          { id: 'sq-5', name: 'Quality assurance requirements', stepId: 'supplier-quotes', phaseId: 'planning', orderNo: 5 },
          { id: 'sq-6', name: 'Warranty and support terms', stepId: 'supplier-quotes', phaseId: 'planning', orderNo: 6 },
          { id: 'sq-7', name: 'Payment terms negotiation', stepId: 'supplier-quotes', phaseId: 'planning', orderNo: 7 },
          { id: 'sq-8', name: 'Preferred supplier agreements', stepId: 'supplier-quotes', phaseId: 'planning', orderNo: 8 }
        ]
      }
    ]
  },
  {
    id: 'initiate-project',
    name: 'Initiate Project Phase',
    description: 'Project kickoff, resource allocation, and preparation activities',
    orderNo: 2,
    stepCount: 6,
    totalTasks: 24,
    steps: [
      {
        id: 'ip1-kickoff',
        name: 'IP1: Project Kickoff',
        description: 'Project initiation and team setup',
        phaseId: 'initiate-project',
        orderNo: 1,
        taskCount: 4,
        tasks: [
          { id: 'ip1-1', name: 'Project manager assignment', stepId: 'ip1-kickoff', phaseId: 'initiate-project', orderNo: 1 },
          { id: 'ip1-2', name: 'Stakeholder identification and notification', stepId: 'ip1-kickoff', phaseId: 'initiate-project', orderNo: 2 },
          { id: 'ip1-3', name: 'Initial project meeting scheduled', stepId: 'ip1-kickoff', phaseId: 'initiate-project', orderNo: 3 },
          { id: 'ip1-4', name: 'Project charter creation', stepId: 'ip1-kickoff', phaseId: 'initiate-project', orderNo: 4 }
        ]
      },
      {
        id: 'ip2-resources',
        name: 'IP2: Resource Allocation',
        description: 'Resource assignment and planning',
        phaseId: 'initiate-project',
        orderNo: 2,
        taskCount: 4,
        tasks: [
          { id: 'ip2-1', name: 'Team assignment and roles definition', stepId: 'ip2-resources', phaseId: 'initiate-project', orderNo: 1 },
          { id: 'ip2-2', name: 'Equipment and material reservation', stepId: 'ip2-resources', phaseId: 'initiate-project', orderNo: 2 },
          { id: 'ip2-3', name: 'Budget allocation confirmation', stepId: 'ip2-resources', phaseId: 'initiate-project', orderNo: 3 },
          { id: 'ip2-4', name: 'Timeline baseline establishment', stepId: 'ip2-resources', phaseId: 'initiate-project', orderNo: 4 }
        ]
      },
      {
        id: 'ip3-site-prep',
        name: 'IP3: Site Preparation',
        description: 'Site readiness and access preparation',
        phaseId: 'initiate-project',
        orderNo: 3,
        taskCount: 4,
        tasks: [
          { id: 'ip3-1', name: 'Site survey completion', stepId: 'ip3-site-prep', phaseId: 'initiate-project', orderNo: 1 },
          { id: 'ip3-2', name: 'Access permissions finalized', stepId: 'ip3-site-prep', phaseId: 'initiate-project', orderNo: 2 },
          { id: 'ip3-3', name: 'Safety assessments conducted', stepId: 'ip3-site-prep', phaseId: 'initiate-project', orderNo: 3 },
          { id: 'ip3-4', name: 'Environmental compliance check', stepId: 'ip3-site-prep', phaseId: 'initiate-project', orderNo: 4 }
        ]
      },
      {
        id: 'ip4-tech-validation',
        name: 'IP4: Technical Validation',
        description: 'Technical design and specification validation',
        phaseId: 'initiate-project',
        orderNo: 4,
        taskCount: 4,
        tasks: [
          { id: 'ip4-1', name: 'Design review and approval', stepId: 'ip4-tech-validation', phaseId: 'initiate-project', orderNo: 1 },
          { id: 'ip4-2', name: 'Technical specifications validation', stepId: 'ip4-tech-validation', phaseId: 'initiate-project', orderNo: 2 },
          { id: 'ip4-3', name: 'Equipment compatibility verification', stepId: 'ip4-tech-validation', phaseId: 'initiate-project', orderNo: 3 },
          { id: 'ip4-4', name: 'Integration requirements confirmed', stepId: 'ip4-tech-validation', phaseId: 'initiate-project', orderNo: 4 }
        ]
      },
      {
        id: 'ip5-contractor-mobilization',
        name: 'IP5: Contractor Mobilization',
        description: 'Contractor preparation and mobilization',
        phaseId: 'initiate-project',
        orderNo: 5,
        taskCount: 4,
        tasks: [
          { id: 'ip5-1', name: 'Contractor selection finalized', stepId: 'ip5-contractor-mobilization', phaseId: 'initiate-project', orderNo: 1 },
          { id: 'ip5-2', name: 'Work order issued', stepId: 'ip5-contractor-mobilization', phaseId: 'initiate-project', orderNo: 2 },
          { id: 'ip5-3', name: 'Insurance and compliance verification', stepId: 'ip5-contractor-mobilization', phaseId: 'initiate-project', orderNo: 3 },
          { id: 'ip5-4', name: 'Mobilization schedule confirmed', stepId: 'ip5-contractor-mobilization', phaseId: 'initiate-project', orderNo: 4 }
        ]
      },
      {
        id: 'ip6-qa-setup',
        name: 'IP6: Quality Assurance Setup',
        description: 'Quality processes and standards establishment',
        phaseId: 'initiate-project',
        orderNo: 6,
        taskCount: 4,
        tasks: [
          { id: 'ip6-1', name: 'Quality standards defined', stepId: 'ip6-qa-setup', phaseId: 'initiate-project', orderNo: 1 },
          { id: 'ip6-2', name: 'Testing procedures established', stepId: 'ip6-qa-setup', phaseId: 'initiate-project', orderNo: 2 },
          { id: 'ip6-3', name: 'Acceptance criteria documented', stepId: 'ip6-qa-setup', phaseId: 'initiate-project', orderNo: 3 },
          { id: 'ip6-4', name: 'Quality checkpoints scheduled', stepId: 'ip6-qa-setup', phaseId: 'initiate-project', orderNo: 4 }
        ]
      }
    ]
  },
  {
    id: 'work-in-progress',
    name: 'Work in Progress Phase',
    description: 'Active implementation including installation, configuration, and testing',
    orderNo: 3,
    stepCount: 6,
    totalTasks: 24,
    steps: [
      {
        id: 'wip1-mobilization',
        name: 'WIP1: Site Mobilization',
        description: 'Site preparation and equipment deployment',
        phaseId: 'work-in-progress',
        orderNo: 1,
        taskCount: 4,
        tasks: [
          { id: 'wip1-1', name: 'Equipment delivery and setup', stepId: 'wip1-mobilization', phaseId: 'work-in-progress', orderNo: 1 },
          { id: 'wip1-2', name: 'Site access and security established', stepId: 'wip1-mobilization', phaseId: 'work-in-progress', orderNo: 2 },
          { id: 'wip1-3', name: 'Work area preparation', stepId: 'wip1-mobilization', phaseId: 'work-in-progress', orderNo: 3 },
          { id: 'wip1-4', name: 'Safety briefings completed', stepId: 'wip1-mobilization', phaseId: 'work-in-progress', orderNo: 4 }
        ]
      },
      {
        id: 'wip2-infrastructure',
        name: 'WIP2: Infrastructure Installation',
        description: 'Physical infrastructure deployment',
        phaseId: 'work-in-progress',
        orderNo: 2,
        taskCount: 4,
        tasks: [
          { id: 'wip2-1', name: 'Physical infrastructure deployment', stepId: 'wip2-infrastructure', phaseId: 'work-in-progress', orderNo: 1 },
          { id: 'wip2-2', name: 'Cable installation and routing', stepId: 'wip2-infrastructure', phaseId: 'work-in-progress', orderNo: 2 },
          { id: 'wip2-3', name: 'Equipment mounting and securing', stepId: 'wip2-infrastructure', phaseId: 'work-in-progress', orderNo: 3 },
          { id: 'wip2-4', name: 'Power and grounding installation', stepId: 'wip2-infrastructure', phaseId: 'work-in-progress', orderNo: 4 }
        ]
      },
      {
        id: 'wip3-configuration',
        name: 'WIP3: Network Configuration',
        description: 'Equipment configuration and programming',
        phaseId: 'work-in-progress',
        orderNo: 3,
        taskCount: 4,
        tasks: [
          { id: 'wip3-1', name: 'Equipment configuration and programming', stepId: 'wip3-configuration', phaseId: 'work-in-progress', orderNo: 1 },
          { id: 'wip3-2', name: 'Network parameter setup', stepId: 'wip3-configuration', phaseId: 'work-in-progress', orderNo: 2 },
          { id: 'wip3-3', name: 'Security configuration implementation', stepId: 'wip3-configuration', phaseId: 'work-in-progress', orderNo: 3 },
          { id: 'wip3-4', name: 'Service provisioning preparation', stepId: 'wip3-configuration', phaseId: 'work-in-progress', orderNo: 4 }
        ]
      },
      {
        id: 'wip4-testing',
        name: 'WIP4: Testing and Commissioning',
        description: 'System testing and validation',
        phaseId: 'work-in-progress',
        orderNo: 4,
        taskCount: 4,
        tasks: [
          { id: 'wip4-1', name: 'Equipment functionality testing', stepId: 'wip4-testing', phaseId: 'work-in-progress', orderNo: 1 },
          { id: 'wip4-2', name: 'End-to-end connectivity testing', stepId: 'wip4-testing', phaseId: 'work-in-progress', orderNo: 2 },
          { id: 'wip4-3', name: 'Performance benchmarking', stepId: 'wip4-testing', phaseId: 'work-in-progress', orderNo: 3 },
          { id: 'wip4-4', name: 'Integration testing with existing systems', stepId: 'wip4-testing', phaseId: 'work-in-progress', orderNo: 4 }
        ]
      },
      {
        id: 'wip5-documentation',
        name: 'WIP5: Documentation',
        description: 'Project documentation and records',
        phaseId: 'work-in-progress',
        orderNo: 5,
        taskCount: 4,
        tasks: [
          { id: 'wip5-1', name: 'As-built drawings creation', stepId: 'wip5-documentation', phaseId: 'work-in-progress', orderNo: 1 },
          { id: 'wip5-2', name: 'Configuration documentation', stepId: 'wip5-documentation', phaseId: 'work-in-progress', orderNo: 2 },
          { id: 'wip5-3', name: 'Test results compilation', stepId: 'wip5-documentation', phaseId: 'work-in-progress', orderNo: 3 },
          { id: 'wip5-4', name: 'User manuals and procedures', stepId: 'wip5-documentation', phaseId: 'work-in-progress', orderNo: 4 }
        ]
      },
      {
        id: 'wip6-quality-control',
        name: 'WIP6: Quality Control',
        description: 'Quality assurance and validation',
        phaseId: 'work-in-progress',
        orderNo: 6,
        taskCount: 4,
        tasks: [
          { id: 'wip6-1', name: 'Quality inspections at key milestones', stepId: 'wip6-quality-control', phaseId: 'work-in-progress', orderNo: 1 },
          { id: 'wip6-2', name: 'Defect identification and remediation', stepId: 'wip6-quality-control', phaseId: 'work-in-progress', orderNo: 2 },
          { id: 'wip6-3', name: 'Compliance verification', stepId: 'wip6-quality-control', phaseId: 'work-in-progress', orderNo: 3 },
          { id: 'wip6-4', name: 'Performance validation', stepId: 'wip6-quality-control', phaseId: 'work-in-progress', orderNo: 4 }
        ]
      }
    ]
  },
  {
    id: 'handover',
    name: 'Handover Phase',
    description: 'System handover, documentation transfer, and knowledge transfer',
    orderNo: 4,
    stepCount: 6,
    totalTasks: 24,
    steps: [
      {
        id: 'hoc1-pre-handover',
        name: 'HOC1: Pre-Handover Testing',
        description: 'Final system validation before handover',
        phaseId: 'handover',
        orderNo: 1,
        taskCount: 4,
        tasks: [
          { id: 'hoc1-1', name: 'Final system testing', stepId: 'hoc1-pre-handover', phaseId: 'handover', orderNo: 1 },
          { id: 'hoc1-2', name: 'Performance verification against SLA', stepId: 'hoc1-pre-handover', phaseId: 'handover', orderNo: 2 },
          { id: 'hoc1-3', name: 'Security testing completion', stepId: 'hoc1-pre-handover', phaseId: 'handover', orderNo: 3 },
          { id: 'hoc1-4', name: 'Backup and recovery testing', stepId: 'hoc1-pre-handover', phaseId: 'handover', orderNo: 4 }
        ]
      },
      {
        id: 'hoc2-doc-handover',
        name: 'HOC2: Documentation Handover',
        description: 'Technical documentation transfer',
        phaseId: 'handover',
        orderNo: 2,
        taskCount: 4,
        tasks: [
          { id: 'hoc2-1', name: 'Technical documentation package', stepId: 'hoc2-doc-handover', phaseId: 'handover', orderNo: 1 },
          { id: 'hoc2-2', name: 'Operational procedures handover', stepId: 'hoc2-doc-handover', phaseId: 'handover', orderNo: 2 },
          { id: 'hoc2-3', name: 'Maintenance schedules and procedures', stepId: 'hoc2-doc-handover', phaseId: 'handover', orderNo: 3 },
          { id: 'hoc2-4', name: 'Warranty documentation', stepId: 'hoc2-doc-handover', phaseId: 'handover', orderNo: 4 }
        ]
      },
      {
        id: 'hoc3-knowledge-transfer',
        name: 'HOC3: Knowledge Transfer',
        description: 'Training and knowledge sharing',
        phaseId: 'handover',
        orderNo: 3,
        taskCount: 4,
        tasks: [
          { id: 'hoc3-1', name: 'Technical training for operations team', stepId: 'hoc3-knowledge-transfer', phaseId: 'handover', orderNo: 1 },
          { id: 'hoc3-2', name: 'Troubleshooting procedures training', stepId: 'hoc3-knowledge-transfer', phaseId: 'handover', orderNo: 2 },
          { id: 'hoc3-3', name: 'System operation training', stepId: 'hoc3-knowledge-transfer', phaseId: 'handover', orderNo: 3 },
          { id: 'hoc3-4', name: 'Emergency procedures briefing', stepId: 'hoc3-knowledge-transfer', phaseId: 'handover', orderNo: 4 }
        ]
      },
      {
        id: 'hoc4-site-cleanup',
        name: 'HOC4: Site Cleanup',
        description: 'Site restoration and cleanup',
        phaseId: 'handover',
        orderNo: 4,
        taskCount: 4,
        tasks: [
          { id: 'hoc4-1', name: 'Equipment and material cleanup', stepId: 'hoc4-site-cleanup', phaseId: 'handover', orderNo: 1 },
          { id: 'hoc4-2', name: 'Site restoration to original condition', stepId: 'hoc4-site-cleanup', phaseId: 'handover', orderNo: 2 },
          { id: 'hoc4-3', name: 'Waste disposal and recycling', stepId: 'hoc4-site-cleanup', phaseId: 'handover', orderNo: 3 },
          { id: 'hoc4-4', name: 'Safety equipment removal', stepId: 'hoc4-site-cleanup', phaseId: 'handover', orderNo: 4 }
        ]
      },
      {
        id: 'hoc5-formal-handover',
        name: 'HOC5: Formal Handover',
        description: 'Official handover process',
        phaseId: 'handover',
        orderNo: 5,
        taskCount: 4,
        tasks: [
          { id: 'hoc5-1', name: 'Handover certificate preparation', stepId: 'hoc5-formal-handover', phaseId: 'handover', orderNo: 1 },
          { id: 'hoc5-2', name: 'Client sign-off on deliverables', stepId: 'hoc5-formal-handover', phaseId: 'handover', orderNo: 2 },
          { id: 'hoc5-3', name: 'Keys and access codes transfer', stepId: 'hoc5-formal-handover', phaseId: 'handover', orderNo: 3 },
          { id: 'hoc5-4', name: 'Formal handover meeting', stepId: 'hoc5-formal-handover', phaseId: 'handover', orderNo: 4 }
        ]
      },
      {
        id: 'hoc6-post-handover',
        name: 'HOC6: Post-Handover Support',
        description: 'Initial support and monitoring',
        phaseId: 'handover',
        orderNo: 6,
        taskCount: 4,
        tasks: [
          { id: 'hoc6-1', name: 'Immediate support availability', stepId: 'hoc6-post-handover', phaseId: 'handover', orderNo: 1 },
          { id: 'hoc6-2', name: 'Issue escalation procedures', stepId: 'hoc6-post-handover', phaseId: 'handover', orderNo: 2 },
          { id: 'hoc6-3', name: 'Performance monitoring setup', stepId: 'hoc6-post-handover', phaseId: 'handover', orderNo: 3 },
          { id: 'hoc6-4', name: 'Client feedback collection', stepId: 'hoc6-post-handover', phaseId: 'handover', orderNo: 4 }
        ]
      }
    ]
  },
  {
    id: 'full-acceptance',
    name: 'Full Acceptance Phase',
    description: 'Final acceptance testing, issue resolution, and project closure',
    orderNo: 5,
    stepCount: 6,
    totalTasks: 24,
    steps: [
      {
        id: 'fac1-monitoring',
        name: 'FAC1: Acceptance Period Monitoring',
        description: 'System monitoring during acceptance period',
        phaseId: 'full-acceptance',
        orderNo: 1,
        taskCount: 4,
        tasks: [
          { id: 'fac1-1', name: 'System performance monitoring', stepId: 'fac1-monitoring', phaseId: 'full-acceptance', orderNo: 1 },
          { id: 'fac1-2', name: 'Issue tracking and resolution', stepId: 'fac1-monitoring', phaseId: 'full-acceptance', orderNo: 2 },
          { id: 'fac1-3', name: 'Client satisfaction assessment', stepId: 'fac1-monitoring', phaseId: 'full-acceptance', orderNo: 3 },
          { id: 'fac1-4', name: 'Performance metrics collection', stepId: 'fac1-monitoring', phaseId: 'full-acceptance', orderNo: 4 }
        ]
      },
      {
        id: 'fac2-final-testing',
        name: 'FAC2: Final Testing',
        description: 'Comprehensive final testing and validation',
        phaseId: 'full-acceptance',
        orderNo: 2,
        taskCount: 4,
        tasks: [
          { id: 'fac2-1', name: 'Acceptance testing execution', stepId: 'fac2-final-testing', phaseId: 'full-acceptance', orderNo: 1 },
          { id: 'fac2-2', name: 'Performance benchmarking', stepId: 'fac2-final-testing', phaseId: 'full-acceptance', orderNo: 2 },
          { id: 'fac2-3', name: 'Long-term stability testing', stepId: 'fac2-final-testing', phaseId: 'full-acceptance', orderNo: 3 },
          { id: 'fac2-4', name: 'Capacity and scalability validation', stepId: 'fac2-final-testing', phaseId: 'full-acceptance', orderNo: 4 }
        ]
      },
      {
        id: 'fac3-issue-resolution',
        name: 'FAC3: Issue Resolution',
        description: 'Final issue identification and resolution',
        phaseId: 'full-acceptance',
        orderNo: 3,
        taskCount: 4,
        tasks: [
          { id: 'fac3-1', name: 'Defect remediation', stepId: 'fac3-issue-resolution', phaseId: 'full-acceptance', orderNo: 1 },
          { id: 'fac3-2', name: 'Performance optimization', stepId: 'fac3-issue-resolution', phaseId: 'full-acceptance', orderNo: 2 },
          { id: 'fac3-3', name: 'Configuration adjustments', stepId: 'fac3-issue-resolution', phaseId: 'full-acceptance', orderNo: 3 },
          { id: 'fac3-4', name: 'Client concern resolution', stepId: 'fac3-issue-resolution', phaseId: 'full-acceptance', orderNo: 4 }
        ]
      },
      {
        id: 'fac4-doc-finalization',
        name: 'FAC4: Documentation Finalization',
        description: 'Final documentation and knowledge capture',
        phaseId: 'full-acceptance',
        orderNo: 4,
        taskCount: 4,
        tasks: [
          { id: 'fac4-1', name: 'Final documentation updates', stepId: 'fac4-doc-finalization', phaseId: 'full-acceptance', orderNo: 1 },
          { id: 'fac4-2', name: 'Lessons learned documentation', stepId: 'fac4-doc-finalization', phaseId: 'full-acceptance', orderNo: 2 },
          { id: 'fac4-3', name: 'Best practices compilation', stepId: 'fac4-doc-finalization', phaseId: 'full-acceptance', orderNo: 3 },
          { id: 'fac4-4', name: 'Knowledge base updates', stepId: 'fac4-doc-finalization', phaseId: 'full-acceptance', orderNo: 4 }
        ]
      },
      {
        id: 'fac5-financial-closure',
        name: 'FAC5: Financial Closure',
        description: 'Financial reconciliation and closure',
        phaseId: 'full-acceptance',
        orderNo: 5,
        taskCount: 4,
        tasks: [
          { id: 'fac5-1', name: 'Final invoicing', stepId: 'fac5-financial-closure', phaseId: 'full-acceptance', orderNo: 1 },
          { id: 'fac5-2', name: 'Cost reconciliation', stepId: 'fac5-financial-closure', phaseId: 'full-acceptance', orderNo: 2 },
          { id: 'fac5-3', name: 'Budget variance analysis', stepId: 'fac5-financial-closure', phaseId: 'full-acceptance', orderNo: 3 },
          { id: 'fac5-4', name: 'Financial reporting completion', stepId: 'fac5-financial-closure', phaseId: 'full-acceptance', orderNo: 4 }
        ]
      },
      {
        id: 'fac6-project-closure',
        name: 'FAC6: Project Closure',
        description: 'Final project closure and evaluation',
        phaseId: 'full-acceptance',
        orderNo: 6,
        taskCount: 4,
        tasks: [
          { id: 'fac6-1', name: 'Final acceptance certificate', stepId: 'fac6-project-closure', phaseId: 'full-acceptance', orderNo: 1 },
          { id: 'fac6-2', name: 'Project closure meeting', stepId: 'fac6-project-closure', phaseId: 'full-acceptance', orderNo: 2 },
          { id: 'fac6-3', name: 'Team demobilization', stepId: 'fac6-project-closure', phaseId: 'full-acceptance', orderNo: 3 },
          { id: 'fac6-4', name: 'Post-project review and evaluation', stepId: 'fac6-project-closure', phaseId: 'full-acceptance', orderNo: 4 }
        ]
      }
    ]
  }
];