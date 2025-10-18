import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

// ==================== CATEGORIES CRUD ====================

// GET /api/categories - Get all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:id - Get category by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST /api/categories - Create new category (ADMIN only)
router.post('/', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const validation = createCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { name } = validation.data;
    const userId = (req as any).user.userId;

    // Check if category name already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        createdBy: userId,
      },
    });

    res.status(201).json({
      message: 'Categoría creada exitosamente',
      category,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Update category (ADMIN only)
router.put('/:id', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const validation = updateCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { name } = validation.data;

    // Check if category name already exists (excluding current category)
    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
        NOT: {
          id: categoryId,
        },
      },
    });

    if (existingCategory) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { name },
    });

    res.json({
      message: 'Categoría actualizada exitosamente',
      category,
    });
  } catch (error: any) {
    console.error('Error updating category:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete category (ADMIN only)
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const deleted = await prisma.category.delete({
      where: { id: categoryId },
    });

    res.status(200).json({
      message: `Categoría '${deleted.name}' eliminada exitosamente`,
      id: deleted.id,
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
