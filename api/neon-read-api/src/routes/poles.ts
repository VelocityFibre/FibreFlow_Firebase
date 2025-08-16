import { Router } from 'express';
import { sql } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { paginateQuery } from '../utils/pagination';
import { validateQuery } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const poleQuerySchema = Joi.object({
  projectId: Joi.string().optional(),
  status: Joi.string().valid('active', 'planned', 'installed').optional(),
  contractor: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional()
});

// GET /api/v1/poles
router.get('/', asyncHandler(async (req, res) => {
  // Validate query parameters
  const query = validateQuery(req.query, poleQuerySchema);
  
  // Build WHERE conditions
  const conditions = [];
  const params = [];
  
  if (query.projectId) {
    conditions.push(`project_id = $${params.length + 1}`);
    params.push(query.projectId);
  }
  
  if (query.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(query.status);
  }
  
  if (query.contractor) {
    conditions.push(`contractor_id = $${params.length + 1}`);
    params.push(query.contractor);
  }
  
  if (query.search) {
    conditions.push(`(pole_number ILIKE $${params.length + 1} OR location_address ILIKE $${params.length + 1})`);
    params.push(`%${query.search}%`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countQuery = `SELECT COUNT(*) FROM poles ${whereClause}`;
  const countResult = await sql(countQuery, params);
  const total = parseInt(countResult[0].count);
  
  // Get paginated results
  const { limit, offset } = paginateQuery(query.page, query.limit);
  
  const dataQuery = `
    SELECT 
      id,
      pole_number,
      project_id,
      status,
      gps_latitude,
      gps_longitude,
      location_address,
      contractor_id,
      installation_date,
      created_at,
      updated_at
    FROM poles
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  
  const poles = await sql(dataQuery, params);
  
  res.json({
    success: true,
    data: poles,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/v1/poles/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      p.*,
      pr.name as project_name,
      c.name as contractor_name
    FROM poles p
    LEFT JOIN projects pr ON p.project_id = pr.id
    LEFT JOIN contractors c ON p.contractor_id = c.id
    WHERE p.id = $1
  `;
  
  const result = await sql(query, [id]);
  
  if (result.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Pole not found'
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

// GET /api/v1/poles/stats/summary
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total_poles,
      COUNT(CASE WHEN status = 'installed' THEN 1 END) as installed,
      COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(DISTINCT project_id) as total_projects,
      COUNT(DISTINCT contractor_id) as total_contractors
    FROM poles
  `;
  
  const result = await sql(statsQuery);
  
  res.json({
    success: true,
    data: result[0],
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;