# FibreFlow - Enterprise Fiber Project Management Platform

Create a comprehensive full-stack project management application for Velocity Fibre, a fiber optic installation company. This should be a modern, enterprise-grade platform with advanced project management capabilities, intelligent automation, beautiful UI design, and comprehensive business intelligence.

## 🎯 Core Application Purpose

FibreFlow is an enterprise project management platform specifically engineered for fiber optic infrastructure deployment. The system centers around a sophisticated **4-level hierarchical project management system**: Projects → Phases → Steps → Tasks, designed to manage the complete lifecycle of fiber projects from initial planning to final acceptance.

**Primary Value Proposition:** Transform fiber project management through an intelligent hierarchical system with industry-specific workflows, AI-powered optimization, real-time collaboration, and comprehensive business intelligence - reducing project completion time by 20% and achieving 95% on-time delivery rates.


## 🎨 Design System

**Apple-Inspired Minimalism:**

- Clean white backgrounds with generous white space
- Modern typography (Inter font family)
- Subtle, sophisticated interactions
- Professional color palette:



## 🏗️ Complete Supabase Database Schema

```sql
-- Enhanced Profiles with Voice and Notification Preferences
CREATE TABLE profiles (
 id UUID REFERENCES auth.users ON DELETE CASCADE,
 email TEXT UNIQUE,
 full_name TEXT,
 role TEXT CHECK (role IN ('admin', 'project_manager', 'site_supervisor', 'contractor', 'technician', 'viewer', 'supplier_admin', 'supplier_user', 'customer')),
 department TEXT,
 phone TEXT,
 avatar_url TEXT,
 supplier_id UUID REFERENCES suppliers(id),
 customer_id UUID REFERENCES customers(id),

 -- Voice & Mobile Preferences
 voice_enabled BOOLEAN DEFAULT true,
 preferred_language TEXT DEFAULT 'en-US',
 voice_commands_enabled BOOLEAN DEFAULT true,

 -- Notification Preferences
 notification_preferences JSONB DEFAULT '{
   "email_notifications": true,
   "push_notifications": true,
   "sms_notifications": false,
   "daily_digest": true,
   "project_updates": true,
   "cost_alerts": true,
   "delay_warnings": true
 }',

 -- Mobile & Offline Settings
 offline_sync_enabled BOOLEAN DEFAULT true,
 mobile_data_usage_limit TEXT DEFAULT 'unlimited',
 last_offline_sync TIMESTAMP WITH TIME ZONE,

 is_active BOOLEAN DEFAULT true,
 last_login TIMESTAMP WITH TIME ZONE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 PRIMARY KEY (id)
);

-- Enhanced Customers with Portal Access
CREATE TABLE customers (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 name TEXT NOT NULL,
 company_registration TEXT,
 address_line1 TEXT,
 address_line2 TEXT,
 city TEXT,
 postal_code TEXT,
 email TEXT,
 phone TEXT,

 -- Customer Portal Features
 portal_access_enabled BOOLEAN DEFAULT false,
 portal_subdomain TEXT UNIQUE,
 portal_logo_url TEXT,
 portal_theme_config JSONB DEFAULT '{}',

 -- Communication Preferences
 preferred_communication_method TEXT CHECK (preferred_communication_method IN ('email', 'phone', 'portal', 'sms')) DEFAULT 'email',
 notification_preferences JSONB DEFAULT '{
   "project_updates": true,
   "milestone_alerts": true,
   "delay_notifications": true,
   "completion_alerts": true
 }',

 -- Account Management
 account_manager_id UUID REFERENCES profiles(id),
 customer_tier TEXT CHECK (customer_tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',

 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 project_name TEXT NOT NULL,
 customer_id UUID REFERENCES customers(id),
 region TEXT,
 status TEXT CHECK (status IN ('not_started', 'planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
 start_date DATE,
 end_date DATE,
 location_id UUID REFERENCES locations(id),
 total_homes_po INTEGER,
 total_poles_boq INTEGER,
 budget DECIMAL(15,2),
 site_address TEXT,
 site_coordinates POINT,
 created_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations table
CREATE TABLE locations (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 location_name TEXT NOT NULL,
 address TEXT,
 coordinates POINT,
 region TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phases table (6 standard phases)
CREATE TABLE phases (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 name TEXT NOT NULL,
 description TEXT,
 order_no INTEGER,
 is_default BOOLEAN DEFAULT false,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default phases
INSERT INTO phases (name, description, order_no, is_default) VALUES
 ('Planning', 'Initial project scoping and design', 1, true),
 ('Initiate Project (IP)', 'Setup and approval phase', 2, true),
 ('Work in Progress (WIP)', 'Active construction phase', 3, true),
 ('Handover', 'Completion and client transition', 4, true),
 ('Handover Complete (HOC)', 'Delivery confirmation', 5, true),
 ('Final Acceptance Certificate (FAC)', 'Project closure', 6, true);

-- Project Phases (many-to-many)
CREATE TABLE project_phases (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
 phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
 status TEXT CHECK (status IN ('pending', 'active', 'completed', 'blocked')) DEFAULT 'pending',
 start_date DATE,
 end_date DATE,
 assigned_to UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 name TEXT NOT NULL,
 description TEXT,
 phase_id UUID REFERENCES phases(id),
 order_no INTEGER,
 estimated_hours INTEGER,
 is_template BOOLEAN DEFAULT false,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Tasks (tasks assigned to specific project phases)
CREATE TABLE project_tasks (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 project_phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
 task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
 status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')) DEFAULT 'pending',
 assigned_to UUID REFERENCES profiles(id),
 due_date DATE,
 actual_hours INTEGER,
 completion_percentage INTEGER DEFAULT 0,
 notes TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom KPI Definitions
CREATE TABLE custom_kpi_definitions (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 name TEXT NOT NULL,
 display_name TEXT NOT NULL,
 unit TEXT,
 data_type TEXT CHECK (data_type IN ('integer', 'decimal', 'boolean')) DEFAULT 'integer',
 category TEXT,
 is_active BOOLEAN DEFAULT true,
 created_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default custom KPIs
INSERT INTO custom_kpi_definitions (name, display_name, unit, data_type, category) VALUES
 ('splice_boxes_installed', 'Splice Boxes Installed', 'units', 'integer', 'optical'),
 ('manholes_completed', 'Manholes Completed', 'units', 'integer', 'civils'),
 ('chambers_installed', 'Chambers Installed', 'units', 'integer', 'civils'),
 ('testing_hours', 'Testing Hours', 'hours', 'decimal', 'testing'),
 ('defects_found', 'Defects Found', 'units', 'integer', 'quality'),
 ('safety_incidents', 'Safety Incidents', 'units', 'integer', 'safety');

-- Enhanced Daily Progress with Voice Input Support
CREATE TABLE daily_progress (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
 contractor_id UUID REFERENCES contractors(id),
 contractor_team_id UUID REFERENCES contractor_teams(id),
 technician_id UUID REFERENCES profiles(id),
 entry_date DATE NOT NULL,

 -- Standard KPIs
 pole_permissions INTEGER DEFAULT 0,
 home_signups INTEGER DEFAULT 0,
 poles_planted INTEGER DEFAULT 0,
 meters_24f_stringing DECIMAL(10,2) DEFAULT 0,
 meters_144f_stringing DECIMAL(10,2) DEFAULT 0,
 meters_trenched DECIMAL(10,2) DEFAULT 0,
 homes_connected INTEGER DEFAULT 0,
 homes_activated INTEGER DEFAULT 0,

 -- Custom KPIs (flexible JSONB for additional metrics)
 custom_kpis JSONB DEFAULT '{}',

 -- Voice Input Features
 voice_input_used BOOLEAN DEFAULT false,
 voice_transcription TEXT,
 voice_confidence_score DECIMAL(3,2),
 voice_recording_url TEXT,

 -- Data Quality & Validation
 data_quality_score DECIMAL(3,2) DEFAULT 1.0,
 validation_warnings JSONB DEFAULT '[]',
 requires_review BOOLEAN DEFAULT false,
 reviewed_by UUID REFERENCES profiles(id),
 reviewed_at TIMESTAMP WITH TIME ZONE,

 notes TEXT,
 weather_conditions TEXT,
 shift_start_time TIME,
 shift_end_time TIME,
 photos JSONB DEFAULT '[]',
 gps_location POINT,

 -- Offline Support
 created_offline BOOLEAN DEFAULT false,
 synced_at TIMESTAMP WITH TIME ZONE,
 offline_device_id TEXT,

 created_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 UNIQUE(project_id, contractor_team_id, entry_date)
);

-- Contractors table
CREATE TABLE contractors (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 name TEXT NOT NULL,
 company_name TEXT NOT NULL,
 contact_email TEXT,
 phone TEXT,
 address TEXT,
 performance_rating DECIMAL(3,2),
 certifications JSONB,
 is_active BOOLEAN DEFAULT true,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contractor Teams table
CREATE TABLE contractor_teams (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
 team_name TEXT NOT NULL,
 team_lead TEXT,
 specialization TEXT[],
 max_capacity INTEGER,
 is_active BOOLEAN DEFAULT true,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced BOQ Management
CREATE TABLE boq_items (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
 item_code TEXT,
 item_name TEXT NOT NULL,
 description TEXT,
 category TEXT,
 quantity DECIMAL(15,3),
 unit TEXT,
 estimated_unit_price DECIMAL(15,2),
 estimated_total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * estimated_unit_price) STORED,
 specification TEXT,
 notes TEXT,
 priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
 required_date DATE,
 status TEXT CHECK (status IN ('planned', 'rfq_sent', 'quoted', 'approved', 'ordered', 'delivered', 'consumed')) DEFAULT 'planned',
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Suppliers Management
CREATE TABLE suppliers (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 name TEXT NOT NULL,
 company_registration TEXT,
 tax_number TEXT,
 contact_email TEXT,
 phone TEXT,
 address TEXT,
 city TEXT,
 postal_code TEXT,
 country TEXT DEFAULT 'South Africa',
 website TEXT,

 -- Portal Access & Branding
 portal_subdomain TEXT UNIQUE,
 portal_logo_url TEXT,
 portal_theme_config JSONB DEFAULT '{}',
 portal_active BOOLEAN DEFAULT false,

 -- Business Information
 business_type TEXT CHECK (business_type IN ('manufacturer', 'distributor', 'reseller', 'service_provider')),
 years_in_business INTEGER,
 employee_count INTEGER,
 annual_turnover DECIMAL(15,2),

 -- Certifications & Compliance
 certifications JSONB DEFAULT '[]',
 compliance_documents JSONB DEFAULT '[]',
 insurance_info JSONB DEFAULT '{}',

 -- Performance & Rating
 performance_rating DECIMAL(3,2) DEFAULT 0,
 on_time_delivery_rate DECIMAL(5,2) DEFAULT 0,
 quality_rating DECIMAL(3,2) DEFAULT 0,
 total_orders INTEGER DEFAULT 0,
 total_order_value DECIMAL(15,2) DEFAULT 0,

 -- Financial Information
 payment_terms TEXT DEFAULT 'Net 30',
 credit_limit DECIMAL(15,2),
 preferred_payment_method TEXT,
 bank_details JSONB DEFAULT '{}',

 -- Operational Details
 lead_time_days INTEGER DEFAULT 30,
 minimum_order_value DECIMAL(15,2) DEFAULT 0,
 delivery_regions TEXT[] DEFAULT '{}',
 specializations TEXT[] DEFAULT '{}',

 -- Portal Settings
 notification_preferences JSONB DEFAULT '{"rfq_notifications": true, "order_updates": true, "payment_reminders": true}',
 auto_quote_enabled BOOLEAN DEFAULT false,
 quote_validity_days INTEGER DEFAULT 30,

 -- Status & Approval
 approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'suspended', 'rejected')) DEFAULT 'pending',
 approved_by UUID REFERENCES profiles(id),
 approved_at TIMESTAMP WITH TIME ZONE,
 suspension_reason TEXT,

 is_active BOOLEAN DEFAULT true,
 preferred_supplier BOOLEAN DEFAULT false,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Product Catalog
CREATE TABLE supplier_products (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
 product_code TEXT NOT NULL,
 product_name TEXT NOT NULL,
 description TEXT,
 detailed_description TEXT,
 category TEXT,
 subcategory TEXT,
 brand TEXT,
 model TEXT,

 -- Pricing Information
 unit TEXT,
 current_price DECIMAL(15,2),
 currency TEXT DEFAULT 'ZAR',
 price_break_quantities JSONB DEFAULT '[]',
 last_price_update DATE DEFAULT CURRENT_DATE,

 -- Availability & Ordering
 minimum_order_quantity DECIMAL(10,2) DEFAULT 1,
 lead_time_days INTEGER DEFAULT 30,
 availability_status TEXT CHECK (availability_status IN ('available', 'limited', 'discontinued', 'pre_order')) DEFAULT 'available',
 stock_quantity DECIMAL(15,3),

 -- Technical Specifications
 specifications JSONB DEFAULT '{}',
 technical_documents JSONB DEFAULT '[]',
 compliance_certificates JSONB DEFAULT '[]',

 -- Media & Documentation
 product_images JSONB DEFAULT '[]',
 product_videos JSONB DEFAULT '[]',
 installation_guides JSONB DEFAULT '[]',

 -- Portal Visibility
 visible_in_portal BOOLEAN DEFAULT true,
 featured_product BOOLEAN DEFAULT false,
 promotion_text TEXT,

 -- Performance Tracking
 quote_count INTEGER DEFAULT 0,
 order_count INTEGER DEFAULT 0,
 last_quoted DATE,
 last_ordered DATE,

 is_active BOOLEAN DEFAULT true,
 created_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

 UNIQUE(supplier_id, product_code)
);

-- RFQ Management
CREATE TABLE rfqs (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
 rfq_number TEXT UNIQUE NOT NULL,
 title TEXT NOT NULL,
 description TEXT,

 -- Timeline
 issue_date DATE DEFAULT CURRENT_DATE,
 closing_date DATE,
 clarification_deadline DATE,

 -- Status & Workflow
 status TEXT CHECK (status IN ('draft', 'published', 'clarifications', 'closed', 'cancelled', 'awarded')) DEFAULT 'draft',
 published_at TIMESTAMP WITH TIME ZONE,
 closed_at TIMESTAMP WITH TIME ZONE,

 -- RFQ Details
 procurement_type TEXT CHECK (procurement_type IN ('goods', 'services', 'works', 'consultancy')) DEFAULT 'goods',
 evaluation_criteria JSONB DEFAULT '{"price": 60, "quality": 25, "delivery": 15}',
 terms_and_conditions TEXT,
 special_requirements TEXT,
 delivery_requirements TEXT,
 payment_terms TEXT,

 -- Portal Features
 allow_partial_quotes BOOLEAN DEFAULT true,
 allow_alternative_products BOOLEAN DEFAULT false,
 require_samples BOOLEAN DEFAULT false,
 confidentiality_level TEXT CHECK (confidentiality_level IN ('public', 'restricted', 'confidential')) DEFAULT 'restricted',

 -- Supplier Targeting
 invited_suppliers UUID[] DEFAULT '{}',
 open_to_all_suppliers BOOLEAN DEFAULT false,
 supplier_categories TEXT[] DEFAULT '{}',

 -- Notifications
 email_notifications_sent BOOLEAN DEFAULT false,
 portal_notifications_sent BOOLEAN DEFAULT false,
 reminder_notifications INTEGER DEFAULT 0,

 created_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RFQ Items (BOQ items included in specific RFQ)
CREATE TABLE rfq_items (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
 boq_item_id UUID REFERENCES boq_items(id) ON DELETE CASCADE,
 quantity_requested DECIMAL(15,3),
 specifications TEXT,
 delivery_requirements TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Quotes
CREATE TABLE supplier_quotes (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
 supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
 quote_number TEXT NOT NULL,

 -- Quote Details
 quote_date DATE DEFAULT CURRENT_DATE,
 validity_date DATE,
 currency TEXT DEFAULT 'ZAR',

 -- Totals
 subtotal DECIMAL(15,2) DEFAULT 0,
 tax_amount DECIMAL(15,2) DEFAULT 0,
 total_amount DECIMAL(15,2) DEFAULT 0,

 -- Terms
 payment_terms TEXT,
 delivery_terms TEXT,
 lead_time_days INTEGER,
 warranty_terms TEXT,

 -- Additional Information
 notes TEXT,
 assumptions TEXT,
 exclusions TEXT,
 alternative_options TEXT,

 -- Portal Submission
 submitted_via_portal BOOLEAN DEFAULT true,
 draft_saved_at TIMESTAMP WITH TIME ZONE,
 submitted_at TIMESTAMP WITH TIME ZONE,

 -- Review Process
 status TEXT CHECK (status IN ('draft', 'submitted', 'under_review', 'clarification_requested', 'accepted', 'rejected', 'expired')) DEFAULT 'draft',
 reviewed_at TIMESTAMP WITH TIME ZONE,
 reviewed_by UUID REFERENCES profiles(id),
 review_notes TEXT,

 -- Scoring & Evaluation
 technical_score DECIMAL(5,2),
 commercial_score DECIMAL(5,2),
 overall_score DECIMAL(5,2),
 evaluation_notes TEXT,

 -- Attachments
 supporting_documents JSONB DEFAULT '[]',
 technical_specifications JSONB DEFAULT '[]',

 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

 UNIQUE(rfq_id, supplier_id, quote_number)
);

-- Quote Items (detailed line items for each quote)
CREATE TABLE quote_items (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 quote_id UUID REFERENCES supplier_quotes(id) ON DELETE CASCADE,
 rfq_item_id UUID REFERENCES rfq_items(id) ON DELETE CASCADE,
 supplier_product_id UUID REFERENCES supplier_products(id),
 quantity_quoted DECIMAL(15,3),
 unit_price DECIMAL(15,2),
 total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity_quoted * unit_price) STORED,
 lead_time_days INTEGER,
 specifications_met BOOLEAN DEFAULT true,
 alternative_suggested BOOLEAN DEFAULT false,
 notes TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Procurement Recommendations
CREATE TABLE procurement_recommendations (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
 recommendation_type TEXT CHECK (recommendation_type IN ('single_supplier', 'multi_supplier', 'hybrid')),
 ai_analysis JSONB,
 recommended_suppliers JSONB,
 estimated_total_cost DECIMAL(15,2),
 estimated_delivery_date DATE,
 risk_assessment JSONB,
 confidence_score DECIMAL(3,2),
 generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 created_by UUID REFERENCES profiles(id)
);

-- Enhanced Stock Management
CREATE TABLE stock_items (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 name TEXT NOT NULL,
 item_code TEXT UNIQUE,
 category TEXT,
 subcategory TEXT,
 description TEXT,
 unit TEXT,
 minimum_stock INTEGER DEFAULT 0,
 reorder_level INTEGER DEFAULT 0,
 standard_cost DECIMAL(15,2),
 current_stock DECIMAL(15,3) DEFAULT 0,
 allocated_stock DECIMAL(15,3) DEFAULT 0,
 available_stock DECIMAL(15,3) GENERATED ALWAYS AS (current_stock - allocated_stock) STORED,
 warehouse_location TEXT,
 storage_requirements TEXT,
 is_active BOOLEAN DEFAULT true,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Locations (warehouses, sites, etc.)
CREATE TABLE stock_locations (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 location_name TEXT NOT NULL,
 location_type TEXT CHECK (location_type IN ('warehouse', 'site', 'depot', 'mobile')) DEFAULT 'warehouse',
 address TEXT,
 coordinates POINT,
 manager_id UUID REFERENCES profiles(id),
 capacity_info JSONB,
 security_level TEXT,
 climate_controlled BOOLEAN DEFAULT false,
 is_active BOOLEAN DEFAULT true,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE stock_movements (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
 movement_type TEXT CHECK (movement_type IN ('receipt', 'issue', 'transfer', 'adjustment', 'return')) NOT NULL,
 from_location_id UUID REFERENCES stock_locations(id),
 to_location_id UUID REFERENCES stock_locations(id),
 project_id UUID REFERENCES projects(id),
 contractor_id UUID REFERENCES contractors(id),
 supplier_id UUID REFERENCES suppliers(id),
 quantity DECIMAL(15,3) NOT NULL,
 unit_cost DECIMAL(15,2),
 total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
 reference_number TEXT,
 movement_date DATE DEFAULT CURRENT_DATE,
 reason TEXT,
 notes TEXT,
 batch_number TEXT,
 expiry_date DATE,
 quality_check_status TEXT CHECK (quality_check_status IN ('pending', 'passed', 'failed', 'not_required')) DEFAULT 'not_required',
 created_by UUID REFERENCES profiles(id),
 approved_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Allocations (reserved stock for projects)
CREATE TABLE stock_allocations (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
 project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
 boq_item_id UUID REFERENCES boq_items(id),
 allocated_quantity DECIMAL(15,3) NOT NULL,
 consumed_quantity DECIMAL(15,3) DEFAULT 0,
 remaining_quantity DECIMAL(15,3) GENERATED ALWAYS AS (allocated_quantity - consumed_quantity) STORED,
 allocation_date DATE DEFAULT CURRENT_DATE,
 required_date DATE,
 status TEXT CHECK (status IN ('reserved', 'issued', 'consumed', 'returned')) DEFAULT 'reserved',
 notes TEXT,
 created_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time Cost Tracking
CREATE TABLE project_costs (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

 -- Cost Categories
 cost_category TEXT CHECK (cost_category IN (
   'labor', 'materials', 'equipment', 'subcontractor',
   'permits', 'transportation', 'overhead', 'other'
 )) NOT NULL,
 cost_subcategory TEXT,

 -- Cost Details
 description TEXT NOT NULL,
 quantity DECIMAL(15,3) DEFAULT 1,
 unit_cost DECIMAL(15,2) NOT NULL,
 total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
 currency TEXT DEFAULT 'ZAR',

 -- Tracking Information
 cost_date DATE DEFAULT CURRENT_DATE,
 invoice_number TEXT,
 supplier_id UUID REFERENCES suppliers(id),
 contractor_id UUID REFERENCES contractors(id),

 -- Approval & Status
 status TEXT CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'paid')) DEFAULT 'draft',
 approved_by UUID REFERENCES profiles(id),
 approved_at TIMESTAMP WITH TIME ZONE,

 -- Budget Tracking
 budget_line_item TEXT,
 is_budgeted BOOLEAN DEFAULT true,
 variance_amount DECIMAL(15,2),
 variance_percentage DECIMAL(5,2),

 -- Supporting Documentation
 supporting_documents JSONB DEFAULT '[]',
 receipt_url TEXT,

 created_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time Budget Tracking
CREATE TABLE project_budgets (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

 -- Budget Categories
 category TEXT CHECK (category IN (
   'labor', 'materials', 'equipment', 'subcontractor',
   'permits', 'transportation', 'overhead', 'contingency'
 )) NOT NULL,
 subcategory TEXT,

 -- Budget Amounts
 budgeted_amount DECIMAL(15,2) NOT NULL,
 committed_amount DECIMAL(15,2) DEFAULT 0,
 actual_amount DECIMAL(15,2) DEFAULT 0,
 remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,

 -- Variance Analysis
 variance_amount DECIMAL(15,2) GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
 variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
   CASE
     WHEN budgeted_amount > 0 THEN ((actual_amount - budgeted_amount) / budgeted_amount) * 100
     ELSE 0
   END
 ) STORED,

 -- Forecasting
 forecasted_final_amount DECIMAL(15,2),
 forecasted_variance DECIMAL(15,2),

 -- Approval Levels
 requires_approval_over DECIMAL(15,2) DEFAULT 10000,
 approval_required BOOLEAN GENERATED ALWAYS AS (actual_amount > requires_approval_over) STORED,

 created_by UUID REFERENCES profiles(id),
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

 UNIQUE(project_id, category, subcategory)
);

-- Intelligent Alert System
CREATE TABLE intelligent_alerts (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

 -- Alert Classification
 alert_type TEXT CHECK (alert_type IN (
   'cost_overrun', 'schedule_delay', 'quality_issue', 'safety_incident',
   'resource_shortage', 'weather_impact', 'supplier_delay', 'milestone_risk'
 )) NOT NULL,
 severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
 priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) NOT NULL,

 -- Alert Content
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 recommended_actions JSONB DEFAULT '[]',

 -- Context & References
 project_id UUID REFERENCES projects(id),
 supplier_id UUID REFERENCES suppliers(id),
 contractor_id UUID REFERENCES contractors(id),
 related_entity_type TEXT,
 related_entity_id UUID,

 -- AI Analysis
 ai_generated BOOLEAN DEFAULT false,
 ai_confidence_score DECIMAL(3,2),
 ai_reasoning TEXT,
 prediction_data JSONB DEFAULT '{}',

 -- Alert Lifecycle
 status TEXT CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')) DEFAULT 'active',
 triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 acknowledged_by UUID REFERENCES profiles(id),
 acknowledged_at TIMESTAMP WITH TIME ZONE,
 resolved_by UUID REFERENCES profiles(id),
 resolved_at TIMESTAMP WITH TIME ZONE,
 resolution_notes TEXT,

 -- Notification Tracking
 notifications_sent JSONB DEFAULT '{}',
 escalation_level INTEGER DEFAULT 0,
 next_escalation_at TIMESTAMP WITH TIME ZONE,

 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice Commands and Transcriptions
CREATE TABLE voice_commands (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

 -- Voice Data
 command_text TEXT NOT NULL,
 original_audio_url TEXT,
 confidence_score DECIMAL(3,2),
 language_code TEXT DEFAULT 'en-US',

 -- Processing
 intent TEXT,
 entities JSONB DEFAULT '{}',
 action_taken TEXT,
 success BOOLEAN DEFAULT false,
 error_message TEXT,

 -- Context
 page_context TEXT,
 project_context UUID REFERENCES projects(id),

 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offline Data Sync Queue
CREATE TABLE offline_sync_queue (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

 -- Sync Details
 device_id TEXT NOT NULL,
 user_id UUID REFERENCES profiles(id),
 entity_type TEXT NOT NULL,
 entity_id UUID,
 operation TEXT CHECK (operation IN ('create', 'update', 'delete')) NOT NULL,

 -- Data
 entity_data JSONB NOT NULL,
 conflict_resolution TEXT CHECK (conflict_resolution IN ('overwrite', 'merge', 'manual')) DEFAULT 'merge',

 -- Status
 sync_status TEXT CHECK (sync_status IN ('pending', 'synced', 'conflict', 'failed')) DEFAULT 'pending',
 error_message TEXT,
 retry_count INTEGER DEFAULT 0,

 -- Timestamps
 created_offline_at TIMESTAMP WITH TIME ZONE NOT NULL,
 synced_at TIMESTAMP WITH TIME ZONE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Portal Activities
CREATE TABLE customer_portal_activities (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
 user_id UUID REFERENCES profiles(id),

 -- Activity Details
 activity_type TEXT CHECK (activity_type IN (
   'login', 'logout', 'project_viewed', 'document_downloaded',
   'message_sent', 'update_requested', 'feedback_submitted'
 )) NOT NULL,
 resource_type TEXT,
 resource_id UUID,

 -- Context
 description TEXT,
 metadata JSONB DEFAULT '{}',
 ip_address INET,
 user_agent TEXT,

 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Portal Activities
CREATE TABLE supplier_portal_activities (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
 user_id UUID REFERENCES profiles(id),

 -- Activity Details
 activity_type TEXT CHECK (activity_type IN ('login', 'logout', 'rfq_viewed', 'quote_saved', 'quote_submitted', 'document_downloaded', 'profile_updated', 'product_updated')) NOT NULL,
 resource_type TEXT,
 resource_id UUID,

 -- Context
 description TEXT,
 metadata JSONB DEFAULT '{}',
 ip_address INET,
 user_agent TEXT,

 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BI Reports Configuration
CREATE TABLE bi_reports (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 report_name TEXT NOT NULL,
 report_type TEXT CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
 query_config JSONB,
 parameters JSONB,
 schedule_cron TEXT,
 is_active BOOLEAN DEFAULT true,
 created_by UUID REFERENCES profiles(id),
 last_run TIMESTAMP WITH TIME ZONE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comprehensive Audit Logs
CREATE TABLE audit_logs (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 user_id UUID REFERENCES profiles(id),
 action TEXT NOT NULL,
 resource_type TEXT NOT NULL,
 resource_id UUID,
 old_values JSONB,
 new_values JSONB,
 ip_address INET,
 user_agent TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_daily_progress_project_date ON daily_progress(project_id, entry_date);
CREATE INDEX idx_daily_progress_contractor ON daily_progress(contractor_id, entry_date);
CREATE INDEX idx_project_tasks_assigned ON project_tasks(assigned_to, status);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_project_costs_project_date ON project_costs(project_id, cost_date);
CREATE INDEX idx_project_costs_category ON project_costs(cost_category, cost_subcategory);
CREATE INDEX idx_alerts_type_status ON intelligent_alerts(alert_type, status, severity);
CREATE INDEX idx_alerts_project_active ON intelligent_alerts(project_id) WHERE status = 'active';
CREATE INDEX idx_customer_portal_activities ON customer_portal_activities(customer_id, created_at);
CREATE INDEX idx_offline_sync_queue_status ON offline_sync_queue(sync_status, device_id);
CREATE INDEX idx_voice_commands_user_date ON voice_commands(user_id, created_at);
CREATE INDEX idx_suppliers_portal_subdomain ON suppliers(portal_subdomain) WHERE portal_subdomain IS NOT NULL;
CREATE INDEX idx_supplier_products_supplier_category ON supplier_products(supplier_id, category) WHERE is_active = true;
CREATE INDEX idx_supplier_quotes_rfq_status ON supplier_quotes(rfq_id, status);
CREATE INDEX idx_portal_activities_supplier_date ON supplier_portal_activities(supplier_id, created_at);
```

## 🚀 Core Features to Implement

### **High-Impact Quick Implementation Features** ⭐ PRIORITY

1. **Voice-to-Text Daily Logging** 🎤
- Web Speech API integration for hands-free data entry
- Smart entity recognition to extract KPI values from speech
- Real-time transcription with edit capabilities
- Voice commands for form navigation
1. **Advanced Mobile Offline Capabilities** 📱
- Service Workers + IndexedDB for offline support
- Smart sync with conflict resolution
- Mobile-first forms optimized for field workers
- Photo compression and GPS caching
1. **Real-time Cost Tracking** 💰
- Live budget vs actual spending with instant updates
- Cost variance alerts and trend analysis
- Mobile cost entry with receipt scanning
- Multi-level approval workflows
1. **Intelligent Alerting System** 🚨
- AI-powered predictive alerts for project issues
- Smart categorization and prioritization
- Context-aware notifications based on user role
- Automatic escalation management
1. **Customer Portal Basic Features** 👥
- Real-time project status and progress tracking
- Secure document access and communication hub
- Custom branding per customer
- Mobile responsive design

### **Core Project Management Features**

1. **4-Level Hierarchical Project Management**
- Projects → Phases → Steps → Tasks hierarchy
- Drag-and-drop reordering and cross-level movement
- Sequential unlocking and template management
- Real-time collaboration across all levels
1. **Advanced Daily Progress Tracking**
- Standard + custom KPI management
- Dynamic form fields and templates
- Photo documentation and GPS verification
- Data validation and quality scoring
1. **Comprehensive BOQ Management**
- Excel import wizard with smart column detection
- Project-integrated BOQ with specifications
- Category management and templates
- Integration with procurement system
1. **Supplier Portal**
- Multi-tenant supplier portals with custom branding
- RFQ marketplace and quote management
- Product catalog management
- Performance analytics and communication
1. **Advanced Stock Management**
- Multi-location inventory tracking
- Comprehensive movement types and approval workflows
- Project-based stock allocation
- Real-time location updates and quality control

### **Application Structure**

#### **Portal Architecture:**

- **Internal Staff Portal**: Main application for VelocityFibre staff
- **Customer Portal**: Branded customer-facing project visibility
- **Supplier Portal**: Multi-tenant supplier management and quoting

#### **Key Page Categories:**

- **Core Operations**: Dashboard, Projects, Tasks, Daily Tracker
- **Financial**: Real-time Costs, Budget Management, Approvals
- **Procurement**: BOQ, RFQ, Quote Comparison, AI Recommendations
- **Inventory**: Stock Overview, Movements, Allocations, Locations
- **Analytics**: BI Dashboards, Custom Reports, Performance Metrics
- **Administration**: Users, Settings, Audit Logs, System Config

### **Success Metrics**

- **Operational**: 95% on-time delivery, 90% budget adherence
- **User Experience**: 90% daily active users, 70% voice input adoption
- **Technical**: 99.9% uptime, <2s response time, 99.5% offline sync success
- **Business Impact**: 25% cost reduction, 50% faster reporting, 300% ROI

Create a modern, intuitive, and powerful platform that revolutionizes fiber project management through intelligent automation, real-time collaboration, and comprehensive business intelligence.
