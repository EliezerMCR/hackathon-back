import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { ensureCanManagePlace, ensureCanManageProduct } from '../utils/authorization';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createProductSchema = z.object({
  name: z.string().min(1).max(191),
  price: z.number().positive(),
  image: z.string().min(1),
  placeId: z.number().int().positive(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  price: z.number().positive().optional(),
  image: z.string().min(1).optional(),
});

// ==================== PRODUCTS CRUD ====================

// GET /api/products - Get all products (with filters)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { placeId, minPrice, maxPrice } = req.query;

    const where: any = {};

    if (placeId) {
      const placeIdNum = parseInt(placeId as string, 10);
      if (!isNaN(placeIdNum)) {
        where.placeId = placeIdNum;
      }
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        where.price.gte = parseFloat(minPrice as string);
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice as string);
      }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            type: true,
          },
        },
        promotions: {
          where: {
            timeBegin: { lte: new Date() },
            OR: [
              { timeEnd: { gte: new Date() } },
              { timeEnd: null },
            ],
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            direction: true,
            city: true,
            country: true,
            type: true,
            mapUrl: true,
          },
        },
        promotions: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create new product
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createProductSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { placeId, ...productData } = validation.data;

    await ensureCanManagePlace(req.user, placeId);

    const product = await prisma.product.create({
      data: {
        ...productData,
        placeId,
      },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Producto creado exitosamente',
      product,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    next(error);
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    await ensureCanManageProduct(req.user, productId);

    const validation = updateProductSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: validation.data,
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    res.json(product);
  } catch (error: any) {
    console.error('Error updating product:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }

    next(error);
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    await ensureCanManageProduct(req.user, productId);

    const deleted = await prisma.product.delete({
      where: { id: productId },
    });

    res.status(200).json({
      message: `Producto '${deleted.name}' eliminado exitosamente`,
      id: deleted.id,
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }

    next(error);
  }
});

export default router;
