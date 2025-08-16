import { Router } from 'express';
import { sql } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { paginateQuery } from '../utils/pagination';
import { validateQuery } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const projectQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'completed', 'on-hold', 'planning').optional(),
  clientId: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional()
});

// GET /api/v1/projects
router.get('/', asyncHandler(async (req, res) => {
  const query = validateQuery(req.query, projectQuerySchema);
  
  // Build WHERE conditions
  const conditions = [];
  const params = [];
  
  if (query.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(query.status);
  }
  
  if (query.clientId) {
    conditions.push(`client_id = $${params.length + 1}`);
    params.push(query.clientId);
  }
  
  if (query.search) {
    conditions.push(`(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
    params.push(`%${query.search}%`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countQuery = `SELECT COUNT(*) FROM projects ${whereClause}`;
  const countResult = await sql(countQuery, params);
  const total = parseInt(countResult[0].count);
  
  // Get paginated results
  const { limit, offset } = paginateQuery(query.page, query.limit);
  
  const dataQuery = `
    SELECT 
      p.id,
      p.name,
      p.description,
      p.status,
      p.start_date,
      p.end_date,
      p.client_id,
      p.project_manager_id,
      p.budget,
      p.created_at,
      p.updated_at,
      c.name as client_name,
      COUNT(DISTINCT poles.id) as pole_count
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN poles ON poles.project_id = p.id
    ${whereClause}
    GROUP BY p.id, c.name
    ORDER BY p.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  
  const projects = await sql(dataQuery, params);
  
  res.json({
    success: true,
    data: projects,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/v1/projects/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      p.*,
      c.name as client_name,
      c.contact_email as client_email,
      u.name as project_manager_name,
      COUNT(DISTINCT poles.id) as total_poles,
      COUNT(DISTINCT CASE WHEN poles.status = 'installed' THEN poles.id END) as installed_poles,
      COUNT(DISTINCT contractors.id) as total_contractors
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON p.project_manager_id = u.id
    LEFT JOIN poles ON poles.project_id = p.id
    LEFT JOIN project_contractors pc ON pc.project_id = p.id
    LEFT JOIN contractors ON contractors.id = pc.contractor_id
    WHERE p.id = $1
    GROUP BY p.id, c.name, c.contact_email, u.name
  `;
  
  const result = await sql(query, [id]);
  
  if (result.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Project not found'
      }
    });
  }
  
  res.json({
    success: true,
    data: result[0],
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/v1/projects/:id/poles
router.get('/:id/poles', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = validateQuery(req.query, poleQuerySchema);
  
  // First check if project exists
  const projectCheck = await sql`SELECT id FROM projects WHERE id = ${id} LIMIT 1`;
  if (projectCheck.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found'
      }
    });
  }
  
  // Get poles for this project
  const conditions = [`project_id = $1`];
  const params = [id];
  
  if (query.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(query.status);
  }
  
  const whereClause = conditions.join(' AND ');
  
  const { limit, offset } = paginateQuery(query.page, query.limit);
  
  const polesQuery = `
    SELECT 
      id,
      pole_number,
      status,
      gps_latitude,
      gps_longitude,
      location_address,
      contractor_id,
      installation_date,
      created_at
    FROM poles
    WHERE ${whereClause}
    ORDER BY pole_number ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  
  const poles = await sql(polesQuery, params);
  
  const countQuery = `SELECT COUNT(*) FROM poles WHERE ${whereClause}`;
  const countResult = await sql(countQuery, params);
  const total = parseInt(countResult[0].count);
  
  res.json({
    success: true,
    data: poles,
    meta: {
      projectId: id,
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/v1/projects/:id/timeline
router.get('/:id/timeline', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const timelineQuery = `
    SELECT 
      DATE(installation_date) as date,
      COUNT(*) as poles_installed,
      COUNT(DISTINCT contractor_id) as contractors_active
    FROM poles
    WHERE project_id = $1 
      AND installation_date IS NOT NULL
    GROUP BY DATE(installation_date)
    ORDER BY date ASC
  `;
  
  const timeline = await sql(timelineQuery, [id]);
  
  res.json({
    success: true,
    data: timeline,
    meta: {
      projectId: id,
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;