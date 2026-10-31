/**
 * EZbill - Foundation REST API Routes
 * Team 1: Foundation, Auth & Database Architecture
 *
 * Implements enterprise API endpoints for Auth, RBAC, Customer Lifecycle,
 * Product Catalog, Subscription Plans, and Audit Trail.
 */

import { Router, Request, Response } from 'express';
import { DatabaseManager } from './db';
import { AuthService } from './auth_service';
import { CustomerService } from './customer_service';
import { ProductPlanService } from './product_plan_service';

export function foundationRoutes(
  db: DatabaseManager,
  authService?: AuthService,
  customerService?: CustomerService,
  productPlanService?: ProductPlanService
): Router {
  const router = Router();

  const auth = authService || new AuthService(db);
  const customers = customerService || new CustomerService(db);
  const catalog = productPlanService || new ProductPlanService(db);

  // Apply auth token parser across all router requests
  router.use(auth.authMiddleware);

  // ─── Health & Stack Verification ─────────────────────────────────────
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'healthy',
      app: 'EZbill Enterprise',
      module: 'Team 1 Foundation',
      timestamp: new Date().toISOString(),
      database: 'SQLite (Persistent Relational)',
    });
  });

  // ─── Authentication & RBAC (`/api/auth`) ─────────────────────────────

  router.post('/auth/register', (req: Request, res: Response) => {
    try {
      const orgId = req.body.organizationId || req.user?.organizationId || 'org-ezbill-primary';
      const actor = req.user?.name || req.body.name || 'Anonymous User';
      const result = auth.register(orgId, req.body, actor);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const status = err.message.startsWith('VALIDATION_ERROR')
        ? 400
        : err.message.startsWith('CONFLICT')
        ? 409
        : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.split(':')[0] || 'REGISTRATION_ERROR', message: err.message },
      });
    }
  });

  router.post('/auth/login', (req: Request, res: Response) => {
    try {
      const result = auth.login(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err.message.startsWith('VALIDATION_ERROR')
        ? 400
        : err.message.startsWith('AUTH_FORBIDDEN')
        ? 403
        : 401;
      res.status(status).json({
        success: false,
        error: { code: err.message.split(':')[0] || 'AUTH_ERROR', message: err.message },
      });
    }
  });

  router.post('/auth/logout', auth.requireAuth, (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Successfully logged out.' });
  });

  router.get('/auth/me', auth.requireAuth, (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: req.user });
  });

  // ─── Customer Lifecycle (`/api/customers`) ────────────────────────────

  router.get('/customers', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || 'org-ezbill-primary';
      const { search, status, country, page, limit } = req.query;

      const result = customers.list(orgId, {
        search: search as string,
        status: status as string,
        country: country as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CUSTOMER_LIST_ERROR', message: err.message },
      });
    }
  });

  router.post('/customers', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || req.body.organizationId || 'org-ezbill-primary';
      const actor = req.user?.name || 'System';
      const customer = customers.create(orgId, req.body, actor);
      res.status(201).json({ success: true, data: customer });
    } catch (err: any) {
      const status = err.message.startsWith('VALIDATION_ERROR')
        ? 400
        : err.message.startsWith('CONFLICT')
        ? 409
        : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.split(':')[0] || 'CUSTOMER_CREATE_ERROR', message: err.message },
      });
    }
  });

  router.get('/customers/:id', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || 'org-ezbill-primary';
      const customer = customers.getById(orgId, req.params.id);
      if (!customer) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Customer '${req.params.id}' not found.` },
        });
        return;
      }
      res.status(200).json({ success: true, data: customer });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CUSTOMER_GET_ERROR', message: err.message },
      });
    }
  });

  router.patch('/customers/:id', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || 'org-ezbill-primary';
      const actor = req.user?.name || 'System';
      const updated = customers.update(orgId, req.params.id, req.body, actor);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      const status = err.message.startsWith('NOT_FOUND')
        ? 404
        : err.message.startsWith('VALIDATION_ERROR')
        ? 400
        : err.message.startsWith('CONFLICT')
        ? 409
        : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.split(':')[0] || 'CUSTOMER_UPDATE_ERROR', message: err.message },
      });
    }
  });

  router.delete('/customers/:id', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || 'org-ezbill-primary';
      const actor = req.user?.name || 'System';
      const archived = customers.archive(orgId, req.params.id, actor);
      res.status(200).json({
        success: true,
        message: 'Customer safely archived to preserve historical records.',
        data: archived,
      });
    } catch (err: any) {
      const status = err.message.startsWith('NOT_FOUND') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.split(':')[0] || 'CUSTOMER_DELETE_ERROR', message: err.message },
      });
    }
  });

  // ─── Products Catalog (`/api/products`) ───────────────────────────────

  router.get('/products', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || 'org-ezbill-primary';
      const activeOnly = req.query.active === 'true';
      const products = catalog.listProducts(orgId, activeOnly);
      res.status(200).json({ success: true, data: products });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PRODUCT_LIST_ERROR', message: err.message },
      });
    }
  });

  router.post('/products', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || req.body.organizationId || 'org-ezbill-primary';
      const actor = req.user?.name || 'System';
      const product = catalog.createProduct(orgId, req.body, actor);
      res.status(201).json({ success: true, data: product });
    } catch (err: any) {
      const status = err.message.startsWith('VALIDATION_ERROR') ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.split(':')[0] || 'PRODUCT_CREATE_ERROR', message: err.message },
      });
    }
  });

  // ─── Subscription Plans (`/api/plans`) ────────────────────────────────

  router.get('/plans', (req: Request, res: Response) => {
    try {
      const { productId, interval, active } = req.query;
      const plans = catalog.listPlans({
        productId: productId as string,
        interval: interval as string,
        activeOnly: active === 'true',
      });
      res.status(200).json({ success: true, data: plans });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PLAN_LIST_ERROR', message: err.message },
      });
    }
  });

  router.post('/plans', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || req.body.organizationId || 'org-ezbill-primary';
      const actor = req.user?.name || 'System';
      const plan = catalog.createPlan(orgId, req.body, actor);
      res.status(201).json({ success: true, data: plan });
    } catch (err: any) {
      const status = err.message.startsWith('NOT_FOUND')
        ? 404
        : err.message.startsWith('VALIDATION_ERROR')
        ? 400
        : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.split(':')[0] || 'PLAN_CREATE_ERROR', message: err.message },
      });
    }
  });

  router.patch('/plans/:id', (req: Request, res: Response) => {
    try {
      const actor = req.user?.name || 'System';
      const updated = catalog.updatePlan(req.params.id, req.body, actor);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      const status = err.message.startsWith('NOT_FOUND')
        ? 404
        : err.message.startsWith('VALIDATION_ERROR')
        ? 400
        : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.split(':')[0] || 'PLAN_UPDATE_ERROR', message: err.message },
      });
    }
  });

  // ─── Audit Trail (`/api/audit-events`) ────────────────────────────────

  router.get('/audit-events', (req: Request, res: Response) => {
    try {
      const orgId = req.user?.organizationId || 'org-ezbill-primary';
      const limit = Math.min(100, req.query.limit ? parseInt(req.query.limit as string, 10) : 50);

      const events = db.query<any>(`
        SELECT id, organization_id, timestamp, type, description, actor, ip_address, metadata
        FROM audit_events
        WHERE organization_id = ? OR organization_id IS NULL
        ORDER BY timestamp DESC
        LIMIT ?
      `, [orgId, limit]);

      res.status(200).json({ success: true, data: events });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'AUDIT_LIST_ERROR', message: err.message },
      });
    }
  });

  return router;
}
